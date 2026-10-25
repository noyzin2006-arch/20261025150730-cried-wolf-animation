#!/usr/bin/env node
/**
 * 成片校验（scripts/verify-video.mjs）
 *
 * 用 ffprobe 读取 exports/cried-wolf.mp4 的真实字段，逐条断言并打印 PASS/FAIL 与实际值。
 * 任何一条断言失败 → 退出码非 0，并列出全部失败项。
 *
 * 用法：
 *   node scripts/verify-video.mjs                 # 校验 exports/cried-wolf.mp4
 *   node scripts/verify-video.mjs --file <path>   # 校验其它文件（小样自测用）
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');

const EXPECTED = {
  videoCodec: 'h264',
  pixFmt: 'yuv420p',
  width: 1280,
  height: 720,
  avgFrameRate: '30/1',
  frames: 4500,
  audioCodec: 'aac',
  duration: 150,
  durationTolerance: 0.033334,
};

function parseArgs(argv) {
  let file = path.join(REPO_ROOT, 'exports', 'cried-wolf.mp4');
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--file') {
      file = path.resolve(argv[++i] ?? '');
    } else if (arg.startsWith('--file=')) {
      file = path.resolve(arg.slice('--file='.length));
    } else {
      process.stderr.write(`[verify] 未知参数：${arg}\n`);
      process.exit(1);
    }
  }
  return { file };
}

/** 执行 ffprobe，返回 {status, json, stderr, raw}。 */
function runFfprobe(args) {
  const res = spawnSync('ffprobe', args, { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (res.error) return { ok: false, reason: `无法启动 ffprobe：${res.error.message}` };
  if (res.status !== 0) {
    return { ok: false, reason: `ffprobe 退出码 ${res.status}：${(res.stderr || '').trim()}` };
  }
  try {
    return { ok: true, json: JSON.parse(res.stdout), raw: res.stdout, stderr: res.stderr || '' };
  } catch (err) {
    return { ok: false, reason: `ffprobe 输出不是合法 JSON：${err?.message ?? err}` };
  }
}

function main() {
  const { file } = parseArgs(process.argv.slice(2));

  process.stdout.write(`[verify] 目标文件：${file}\n`);
  if (!fs.existsSync(file)) {
    process.stderr.write(`[verify] 失败：文件不存在 ${file}\n`);
    process.stderr.write('[verify] 请先运行 node scripts/export-video.mjs 生成成片。\n');
    process.exit(1);
  }

  const primary = runFfprobe([
    '-v',
    'error',
    '-count_frames',
    '-show_entries',
    'stream=codec_type,codec_name,width,height,pix_fmt,avg_frame_rate,nb_read_frames,duration',
    '-show_entries',
    'format=duration',
    '-of',
    'json',
    file,
  ]);
  if (!primary.ok) {
    process.stderr.write(`[verify] 失败：${primary.reason}\n`);
    process.exit(1);
  }

  // 原始 JSON 落盘到 reports/ffprobe.json
  const reportsDir = path.join(REPO_ROOT, 'reports');
  fs.mkdirSync(reportsDir, { recursive: true });
  const reportPath = path.join(reportsDir, 'ffprobe.json');
  fs.writeFileSync(reportPath, primary.raw, 'utf8');
  process.stdout.write(`[verify] ffprobe 原始 JSON 已写入 ${reportPath}\n`);

  const streams = primary.json.streams ?? [];
  const video = streams.find((s) => s.codec_type === 'video');
  const audio = streams.find((s) => s.codec_type === 'audio');

  const checks = [];
  const add = (id, name, passed, expected, actual, note = '') => {
    checks.push({ id, name, status: passed ? 'PASS' : 'FAIL', expected, actual, note });
    const tag = passed ? 'PASS' : 'FAIL';
    process.stdout.write(
      `[verify] ${tag} ${id} ${name}｜期望 ${JSON.stringify(expected)}｜实际 ${JSON.stringify(actual)}${
        note ? `｜${note}` : ''
      }\n`,
    );
  };

  // --- 视频流存在性 ---
  add('V0', '存在 video 流', Boolean(video), '存在', video ? '存在' : '缺失');
  if (!video) {
    add('V1', '视频编码', false, EXPECTED.videoCodec, 'N/A');
    add('V2', '像素格式', false, EXPECTED.pixFmt, 'N/A');
    add('V3', '宽度', false, EXPECTED.width, 'N/A');
    add('V4', '高度', false, EXPECTED.height, 'N/A');
    add('V5', '平均帧率', false, EXPECTED.avgFrameRate, 'N/A');
  } else {
    add('V1', '视频编码', video.codec_name === EXPECTED.videoCodec, EXPECTED.videoCodec, video.codec_name ?? 'N/A');
    add('V2', '像素格式', video.pix_fmt === EXPECTED.pixFmt, EXPECTED.pixFmt, video.pix_fmt ?? 'N/A');
    add('V3', '宽度', video.width === EXPECTED.width, EXPECTED.width, video.width ?? 'N/A');
    add('V4', '高度', video.height === EXPECTED.height, EXPECTED.height, video.height ?? 'N/A');
    add('V5', '平均帧率', video.avg_frame_rate === EXPECTED.avgFrameRate, EXPECTED.avgFrameRate, video.avg_frame_rate ?? 'N/A');
  }

  // --- 帧数：优先 nb_read_frames，缺失则用 -count_packets 交叉取证 ---
  let frameCount = null;
  let frameCountMethod = 'nb_read_frames';
  let frameCountNote = '';
  if (video && video.nb_read_frames !== undefined && video.nb_read_frames !== 'N/A') {
    frameCount = Number(video.nb_read_frames);
  } else {
    frameCountMethod = 'nb_read_packets（-count_packets 交叉取证）';
    frameCountNote = '本机 ffprobe 未给出 nb_read_frames，改用包计数交叉取证';
    const cross = runFfprobe([
      '-v',
      'error',
      '-count_packets',
      '-show_entries',
      'stream=codec_type,codec_name,nb_read_packets',
      '-of',
      'json',
      file,
    ]);
    if (cross.ok) {
      const crossVideo = (cross.json.streams ?? []).find((s) => s.codec_type === 'video');
      const packets = crossVideo?.nb_read_packets;
      if (packets !== undefined && packets !== 'N/A') {
        frameCount = Number(packets);
        const crossPath = path.join(reportsDir, 'ffprobe-count-packets.json');
        fs.writeFileSync(crossPath, cross.raw, 'utf8');
        frameCountNote += `；交叉证据写入 ${crossPath}`;
      }
    }
    if (frameCount === null) {
      frameCountNote += '；交叉取证也未取得帧数，不能把 NA 当 PASS';
    }
  }
  add(
    'V6',
    `帧数（口径：${frameCountMethod}）`,
    frameCount === EXPECTED.frames,
    EXPECTED.frames,
    frameCount === null ? 'N/A' : frameCount,
    frameCountNote,
  );

  // --- 音频流 ---
  add('A0', '存在 audio 流', Boolean(audio), '存在', audio ? '存在' : '缺失');
  add('A1', '音频编码', Boolean(audio) && audio.codec_name === EXPECTED.audioCodec, EXPECTED.audioCodec, audio?.codec_name ?? 'N/A');

  // --- 总时长 ---
  const duration = Number(primary.json.format?.duration);
  const durationOk = Number.isFinite(duration) && Math.abs(duration - EXPECTED.duration) <= EXPECTED.durationTolerance;
  add(
    'D1',
    `容器总时长（容差 ±${EXPECTED.durationTolerance}s）`,
    durationOk,
    `${EXPECTED.duration} ± ${EXPECTED.durationTolerance}`,
    Number.isFinite(duration) ? duration : 'N/A',
    Number.isFinite(duration) ? `偏差 ${(duration - EXPECTED.duration).toFixed(6)}s` : '',
  );

  // --- 文件体积与 sha256 ---
  const bytes = fs.statSync(file).size;
  add('F1', '文件字节数 > 0', bytes > 0, '> 0', bytes);
  const sha256 = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  process.stdout.write(`[verify] PASS F2 文件 sha256：${sha256}\n`);
  checks.push({ id: 'F2', name: '文件 sha256', status: 'PASS', expected: '64 位十六进制', actual: sha256 });

  const failures = checks.filter((c) => c.status === 'FAIL');
  process.stdout.write(`[verify] 汇总：共 ${checks.length} 条断言，PASS ${checks.length - failures.length}，FAIL ${failures.length}\n`);
  if (failures.length > 0) {
    process.stdout.write('[verify] 失败项清单：\n');
    for (const f of failures) {
      process.stdout.write(`[verify]   - ${f.id} ${f.name}｜期望 ${JSON.stringify(f.expected)}｜实际 ${JSON.stringify(f.actual)}\n`);
    }
    process.exit(1);
  }
  process.stdout.write('[verify] 全部通过\n');
  process.exit(0);
}

main();
