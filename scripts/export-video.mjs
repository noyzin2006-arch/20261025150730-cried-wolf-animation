#!/usr/bin/env node
/**
 * 逐帧导出 MP4（scripts/export-video.mjs）
 *
 * 流程：build → 本机服务器 → Chromium 逐帧 seek → PNG 经 stdin 管道喂给 ffmpeg → ffprobe 校验 → 原子重命名。
 *
 * 规格要点：
 *   - 严格串行 4500 帧（默认），i = 0..4499，t = i/30。
 *   - ffmpeg 参数顺序为既定规格，不可随意调整。
 *   - 先写 exports/cried-wolf.partial.mp4，ffprobe 通过后才 rename 成 exports/cried-wolf.mp4。
 *   - 失败必须删除 partial 并以非 0 退出；绝不保留上一轮的旧 MP4 冒充本轮结果。
 *
 * 用法：
 *   node scripts/export-video.mjs                # 完整 4500 帧
 *   node scripts/export-video.mjs --frames 60    # 小样，输出到 .cache/，不覆盖正式产物
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startServer } from './serve.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');

const TOTAL_FRAMES = 4500;
const FPS = 30;
const DURATION_SEC = 150;
const VIEWPORT = { width: 1280, height: 720 };
const PROGRESS_EVERY = 250;

const SCORE_WAV_REL = path.join('.cache', 'score.wav');

/**
 * 终止当前导出。
 * 用抛异常而不是 process.exit()，这样外层 try/finally 仍能关闭 Chromium 与本机服务器，
 * 不会留下孤儿浏览器进程或占用中的端口。
 */
function fail(message, code = 1) {
  const err = new Error(message);
  err.exitCode = code;
  err.expectedFailure = true;
  throw err;
}

function parseArgs(argv) {
  const out = { frames: TOTAL_FRAMES, port: 0 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--frames') {
      out.frames = Number(argv[++i]);
    } else if (arg.startsWith('--frames=')) {
      out.frames = Number(arg.slice('--frames='.length));
    } else if (arg === '--port') {
      out.port = Number(argv[++i]);
    } else if (arg.startsWith('--port=')) {
      out.port = Number(arg.slice('--port='.length));
    } else {
      fail(`未知参数：${arg}`);
    }
  }
  if (!Number.isInteger(out.frames) || out.frames <= 0) fail(`--frames 非法：${out.frames}`);
  if (out.frames > TOTAL_FRAMES) fail(`--frames 不得超过 ${TOTAL_FRAMES}`);
  return out;
}

function rmIfExists(target) {
  try {
    if (fs.existsSync(target)) {
      fs.rmSync(target);
      process.stdout.write(`[export] 已删除旧文件：${target}\n`);
    }
  } catch (err) {
    fail(`无法删除旧文件 ${target}：${err?.message ?? err}`);
  }
}

/** 构造 ffmpeg 参数（顺序为既定规格）。sample 模式只改帧数与时长两个值。 */
function buildFfmpegArgs({ frames, durationSec, outPath }) {
  return [
    '-hide_banner',
    '-loglevel',
    'error',
    '-y',
    '-f',
    'image2pipe',
    '-vcodec',
    'png',
    '-framerate',
    String(FPS),
    '-i',
    'pipe:0',
    '-i',
    SCORE_WAV_REL,
    '-map',
    '0:v:0',
    '-map',
    '1:a:0',
    '-frames:v',
    String(frames),
    '-vf',
    'format=yuv420p',
    '-c:v',
    'libx264',
    '-preset',
    'medium',
    '-crf',
    '18',
    '-pix_fmt',
    'yuv420p',
    '-r',
    String(FPS),
    '-c:a',
    'aac',
    '-b:a',
    '128k',
    '-ar',
    '48000',
    '-ac',
    '1',
    '-t',
    String(durationSec),
    '-movflags',
    '+faststart',
    outPath,
  ];
}

/** 对候选文件做一次最小 ffprobe 体检，确认容器可读、编码符合规格后才允许改名。 */
function probeCandidate(file) {
  const res = spawnSync(
    'ffprobe',
    [
      '-v',
      'error',
      '-count_frames',
      '-show_entries',
      'stream=codec_type,codec_name,width,height,pix_fmt,avg_frame_rate,nb_read_frames',
      '-show_entries',
      'format=duration',
      '-of',
      'json',
      file,
    ],
    { cwd: REPO_ROOT, encoding: 'utf8' },
  );
  if (res.status !== 0) {
    return { ok: false, reason: `ffprobe 退出码 ${res.status}：${(res.stderr || '').trim()}` };
  }
  let json;
  try {
    json = JSON.parse(res.stdout);
  } catch (err) {
    return { ok: false, reason: `ffprobe 输出不是合法 JSON：${err?.message ?? err}` };
  }
  const video = (json.streams || []).find((s) => s.codec_type === 'video');
  const audio = (json.streams || []).find((s) => s.codec_type === 'audio');
  const problems = [];
  if (!video) problems.push('缺少视频流');
  if (video && video.codec_name !== 'h264') problems.push(`视频编码为 ${video.codec_name}，非 h264`);
  if (video && video.pix_fmt !== 'yuv420p') problems.push(`pix_fmt 为 ${video.pix_fmt}，非 yuv420p`);
  if (video && (video.width !== VIEWPORT.width || video.height !== VIEWPORT.height)) {
    problems.push(`分辨率为 ${video.width}x${video.height}，非 1280x720`);
  }
  if (!audio) problems.push('缺少音频流');
  if (audio && audio.codec_name !== 'aac') problems.push(`音频编码为 ${audio.codec_name}，非 aac`);
  return { ok: problems.length === 0, reason: problems.join('；'), json };
}

async function main() {
  const { frames, port } = parseArgs(process.argv.slice(2));
  const isSample = frames !== TOTAL_FRAMES;
  const durationSec = isSample ? frames / FPS : DURATION_SEC;

  const buildScript = path.join(REPO_ROOT, 'scripts', 'build.mjs');

  // 输出路径：完整导出走 exports/，小样走 .cache/ 且文件名不同，绝不覆盖正式产物。
  const outDir = isSample ? path.join(REPO_ROOT, '.cache') : path.join(REPO_ROOT, 'exports');
  fs.mkdirSync(outDir, { recursive: true });
  const finalPath = isSample
    ? path.join(outDir, `cried-wolf.sample-${frames}.mp4`)
    : path.join(outDir, 'cried-wolf.mp4');
  const partialPath = isSample
    ? path.join(outDir, `cried-wolf.sample-${frames}.partial.mp4`)
    : path.join(outDir, 'cried-wolf.partial.mp4');

  // 清掉上一轮的 partial 与正式产物，且必须早于任何可能失败的步骤（含构建）：
  // 这样本轮无论成功还是失败，磁盘上都不会留下「上一轮的旧 MP4」冒充本轮结果。
  rmIfExists(partialPath);
  if (!isSample) rmIfExists(finalPath);

  if (!fs.existsSync(buildScript)) {
    fail(`找不到构建脚本 ${buildScript}；请先实现 scripts/build.mjs（导出依赖它生成 dist/ 与 .cache/score.wav）`);
  }

  const distDir = path.join(REPO_ROOT, 'dist');
  const scoreWav = path.join(REPO_ROOT, SCORE_WAV_REL);

  process.stdout.write('[export] 步骤 1/4：运行构建 scripts/build.mjs\n');
  const build = spawnSync('node', ['scripts/build.mjs'], {
    cwd: REPO_ROOT,
    stdio: 'inherit',
  });
  if (build.error) fail(`构建无法启动：${build.error.message}`);
  if (build.status !== 0) fail(`构建失败（退出码 ${build.status}）`);

  if (!fs.existsSync(path.join(distDir, 'index.html'))) {
    fail(`构建后仍缺少 dist/index.html（${distDir}）`);
  }
  if (!fs.existsSync(scoreWav)) {
    fail(`缺少原始音轨 ${scoreWav}；ffmpeg 需要它混流，正式产物必须是 AAC 48k mono，不能用无声视频冒充`);
  }

  process.stdout.write('[export] 步骤 2/4：启动本机服务器与 Chromium\n');
  const server = await startServer({ port, root: distDir, quiet: true });
  process.stdout.write(`[export] 服务器：${server.url}（root=${server.root}）\n`);

  const browser = await chromium.launch({ headless: true });
  let ffmpegChild = null;
  try {
    const context = await browser.newContext({
      viewport: { width: VIEWPORT.width, height: VIEWPORT.height },
      deviceScaleFactor: 1,
      colorScheme: 'dark',
      reducedMotion: 'no-preference',
    });
    const page = await context.newPage();
    page.on('pageerror', (err) => process.stderr.write(`[export] pageerror: ${err?.message ?? err}\n`));

    await page.goto(server.url, { waitUntil: 'load' });
    await page.waitForFunction(
      () => typeof window.CriedWolf?.seekFrame === 'function' && typeof window.CriedWolf?.setExportMode === 'function',
      { timeout: 30000 },
    );
    await page.evaluate(() => window.CriedWolf.setExportMode(true));

    const stage = await page.locator('#filmFrame').boundingBox();
    if (!stage) fail('页面上找不到 #filmFrame');
    if (Math.round(stage.width) !== VIEWPORT.width || Math.round(stage.height) !== VIEWPORT.height) {
      fail(
        `导出模式下 #filmFrame 为 ${Math.round(stage.width)}x${Math.round(stage.height)}，不等于 ${VIEWPORT.width}x${VIEWPORT.height}`,
      );
    }

    process.stdout.write('[export] 步骤 3/4：逐帧截图并喂给 ffmpeg\n');
    const ffmpegArgs = buildFfmpegArgs({ frames, durationSec, outPath: partialPath });
    const child = spawn('ffmpeg', ffmpegArgs, { cwd: REPO_ROOT, stdio: ['pipe', 'inherit', 'pipe'] });
    let ffmpegStderr = '';
    child.stderr.on('data', (chunk) => {
      const text = chunk.toString();
      ffmpegStderr += text;
      process.stderr.write(`[ffmpeg] ${text}`);
    });
    let childError = null;
    child.on('error', (err) => {
      childError = err;
    });
    ffmpegChild = child;
    const childClosed = once(child, 'close');
    let stdinFailure = null;
    const stdinError = new Promise((resolve) => {
      child.stdin.on('error', (err) => {
        stdinFailure = err;
        resolve(err);
      });
    });

    const startedAt = Date.now();
    for (let i = 0; i < frames; i += 1) {
      if (child.exitCode !== null) {
        fail(`ffmpeg 提前退出（退出码 ${child.exitCode}）：${ffmpegStderr.trim()}`, 1);
      }
      await page.evaluate((frameId) => window.CriedWolf.seekFrame(frameId), i);
      const buf = await page.locator('#filmFrame').screenshot({ type: 'png', animations: 'disabled' });
      if (!buf || buf.length === 0) fail(`第 ${i} 帧截图为空`);

      const ok = child.stdin.write(buf);
      if (!ok) {
        // 回压：等 drain 再继续，避免把整段视频堆进内存。
        // 同时监听 stdin 的 error（ffmpeg 提前退出时管道会断），否则 drain 永远不会来，导出会挂死。
        await Promise.race([once(child.stdin, 'drain'), stdinError]);
        if (stdinFailure) {
          fail(`写入第 ${i} 帧时 ffmpeg 管道断开：${stdinFailure.message}；ffmpeg stderr：${ffmpegStderr.trim()}`);
        }
        if (child.exitCode !== null) {
          fail(`ffmpeg 在写入第 ${i} 帧时已退出（退出码 ${child.exitCode}）：${ffmpegStderr.trim()}`);
        }
      }

      if ((i + 1) % PROGRESS_EVERY === 0 || i === frames - 1) {
        const done = i + 1;
        const elapsedSec = (Date.now() - startedAt) / 1000;
        const rate = done / elapsedSec;
        const remainSec = (frames - done) / rate;
        const remainText =
          remainSec >= 60
            ? `${Math.floor(remainSec / 60)}分${Math.round(remainSec % 60)}秒`
            : `${remainSec.toFixed(1)}秒`;
        process.stdout.write(
          `[export] ${done}/${frames} 帧  已用 ${elapsedSec.toFixed(1)}s  约 ${rate.toFixed(1)} 帧/秒  预计剩余 ${remainText}\n`,
        );
      }
    }

    child.stdin.end();
    const [code, signal] = await childClosed;
    if (childError) fail(`ffmpeg 启动失败：${childError.message}`);
    if (code !== 0) {
      fail(`ffmpeg 退出码 ${code}${signal ? `（信号 ${signal}）` : ''}：${ffmpegStderr.trim()}`);
    }

    process.stdout.write('[export] 步骤 4/4：校验产物并原子改名\n');
    if (!fs.existsSync(partialPath)) fail('ffmpeg 结束后找不到 partial 文件');
    const probe = probeCandidate(partialPath);
    if (!probe.ok) {
      rmIfExists(partialPath);
      fail(`partial 校验未通过：${probe.reason}`);
    }
    fs.renameSync(partialPath, finalPath);

    const bytes = fs.statSync(finalPath).size;
    process.stdout.write(`[export] 完成：${finalPath}\n`);
    process.stdout.write(`[export] 绝对路径：${finalPath}\n`);
    process.stdout.write(`[export] 字节数：${bytes}\n`);
    if (isSample) {
      process.stdout.write(`[export] 注意：这是 ${frames} 帧小样，正式产物仍需完整 4500 帧导出。\n`);
    }
  } catch (err) {
    rmIfExists(partialPath);
    if (err?.expectedFailure) throw err;
    throw new Error(err?.stack ?? String(err));
  } finally {
    // 异常路径下不让 ffmpeg 变成孤儿进程继续往 partial 里写
    if (ffmpegChild && ffmpegChild.exitCode === null) {
      try {
        ffmpegChild.stdin.destroy();
        ffmpegChild.kill('SIGKILL');
      } catch {
        /* 已退出 */
      }
    }
    await browser.close().catch(() => {});
    await server.close().catch(() => {});
  }
  process.exit(0);
}

main().catch((err) => {
  if (err?.expectedFailure) {
    process.stderr.write(`[export] 失败：${err.message}\n`);
    process.exit(err.exitCode ?? 1);
  }
  process.stderr.write(`[export] 未捕获异常：${err?.stack ?? err}\n`);
  process.exit(1);
});
