#!/usr/bin/env node
/*
 * scripts/build.mjs —— 构建生产产物。
 *
 * 步骤（规划案 §5.7）：
 *   1. 由 data/story.json 重新生成 src/story-data.js（保证只有一份镜头与声音数据）
 *   2. 生成原创音轨：scripts/generate-audio.mjs → .cache/score.wav + dist/assets/score.m4a
 *   3. 把 tokens.js 的令牌编译成 :root 变量，前置进 dist/styles/main.css
 *   4. 复制 index.html / styles / src 到 dist/
 *   5. 生成 dist/single.html：样式、脚本、音轨全部内联，file:// 可直接打开
 *   6. 自检：single.html 不得含任何外部引用或 ES module 语法
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { buildStoryboard } from './build-storyboard.mjs';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const CACHE = path.join(ROOT, '.cache');

const SRC_SCRIPTS = [
  'tokens.js', 'story-data.js', 'geometry.js', 'timeline.js',
  'scene.js', 'audio-player.js', 'icons.js', 'ui.js', 'main.js'
];

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function fail(msg) {
  process.stderr.write(`\n构建失败：${msg}\n`);
  process.exit(1);
}

/* ---------------------------------------------------------------- 1. 数据 */
function regenStoryData() {
  const src = path.join(ROOT, 'data', 'story.json');
  const story = JSON.parse(fs.readFileSync(src, 'utf8'));

  /* 基础校验：镜头必须连续覆盖 [0,total] */
  let cursor = 0;
  for (const shot of story.shots) {
    if (shot.start !== cursor) fail(`镜头 ${shot.id} 的起点 ${shot.start} 与上一镜终点 ${cursor} 不连续`);
    if (!(shot.end > shot.start)) fail(`镜头 ${shot.id} 的时长非法`);
    cursor = shot.end;
  }
  if (cursor !== story.meta.totalDuration) fail(`镜头总时长 ${cursor} ≠ ${story.meta.totalDuration}`);

  const header = [
    '/*',
    ' * src/story-data.js —— 由 data/story.json 生成的浏览器侧数据绑定（勿手改）。',
    ' *',
    ' * 唯一真源是 data/story.json；scripts/build.mjs 每次构建都会重新生成本文件，',
    ' * 保证「只有一份声音事件清单、只有一份镜头数据」。',
    ' */',
    ''
  ].join('\n');

  const body = `(function (root, factory) {
  var story = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = story;
  } else {
    root.CriedWolf = root.CriedWolf || {};
    root.CriedWolf.story = story;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  return ${JSON.stringify(story, null, 2)};
});
`;
  const out = path.join(ROOT, 'src', 'story-data.js');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, header + body, 'utf8');
  log(`[1/6] 已由 data/story.json 生成 src/story-data.js（${story.shots.length} 镜，${story.soundEvents.length} 个声音事件）`);
}

/* ---------------------------------------------------------------- 2. 音轨 */
function buildAudio() {
  const script = path.join(ROOT, 'scripts', 'generate-audio.mjs');
  if (!fs.existsSync(script)) fail('找不到 scripts/generate-audio.mjs');
  fs.mkdirSync(CACHE, { recursive: true });
  fs.mkdirSync(path.join(DIST, 'assets'), { recursive: true });

  const r = spawnSync(process.execPath, [script], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) fail(`音轨生成脚本退出码 ${r.status}`);

  const wav = path.join(DIST, 'assets', 'score.wav');
  const m4a = path.join(DIST, 'assets', 'score.m4a');
  if (!fs.existsSync(wav)) fail('音轨生成后缺少 dist/assets/score.wav');
  if (!fs.existsSync(m4a)) fail('音轨生成后缺少 dist/assets/score.m4a');

  /* WAV 只作为导出混流的中转，体积大，移到缓存目录不入库 */
  const wavSize = fs.statSync(wav).size;
  fs.renameSync(wav, path.join(CACHE, 'score.wav'));
  const m4aSize = fs.statSync(m4a).size;
  log(`[2/6] 音轨就绪：score.m4a ${(m4aSize / 1048576).toFixed(2)}MB，score.wav ${(wavSize / 1048576).toFixed(2)}MB（缓存目录）`);
}

/* ---------------------------------------------------------- 2.5 分镜表 */
function buildStoryboardDoc() {
  const file = buildStoryboard();
  const size = fs.statSync(file).size;
  log(`[2.5/6] 已生成分镜表 docs/storyboard.md（${size} 字节）`);
}

/* ---------------------------------------------------------------- 3. 令牌 */
function compileTokens() {
  const tokens = require(path.join(ROOT, 'src', 'tokens.js'));
  const css = tokens.cssText();
  const cssPath = path.join(DIST, 'styles', 'main.css');
  fs.mkdirSync(path.dirname(cssPath), { recursive: true });
  const source = fs.readFileSync(path.join(ROOT, 'styles', 'main.css'), 'utf8');
  fs.writeFileSync(cssPath, `/* 由 src/tokens.js 编译生成，请勿手改；改令牌请改 tokens.js。 */\n${css}\n${source}`, 'utf8');
  const count = tokens.collectFlat().length;
  log(`[3/6] 已编译 ${count} 个设计令牌到 dist/styles/main.css`);
}

/* ------------------------------------------------------------ 4. 多文件产物 */
function copyMultiFile() {
  fs.mkdirSync(path.join(DIST, 'src'), { recursive: true });
  fs.copyFileSync(path.join(ROOT, 'index.html'), path.join(DIST, 'index.html'));
  for (const name of SRC_SCRIPTS) {
    fs.copyFileSync(path.join(ROOT, 'src', name), path.join(DIST, 'src', name));
  }
  log(`[4/6] 多文件产物：dist/index.html + dist/src/${SRC_SCRIPTS.length} 个脚本 + dist/styles/main.css`);
}

/* ------------------------------------------------------------ 5. 单文件产物 */
function buildSingle() {
  let html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  /* 5.1 内联样式 */
  const css = fs.readFileSync(path.join(DIST, 'styles', 'main.css'), 'utf8');
  html = html.replace(
    /<link rel="stylesheet" href="styles\/main\.css">/,
    `<style>\n${css}\n</style>`
  );
  if (!/\<style\>/.test(html)) fail('单文件构建失败：样式未内联');

  /* 5.2 内联脚本（保持文档顺序；内联脚本不能带 defer） */
  for (const name of SRC_SCRIPTS) {
    const js = fs.readFileSync(path.join(ROOT, 'src', name), 'utf8');
    if (/<\/script/i.test(js)) fail(`脚本 src/${name} 含 </script 字面量，内联会提前终止`);
    const escaped = js.replace(/<\/script/gi, '<\\/script');
    const tag = `<script src="src/${name}" defer></script>`;
    if (!html.includes(tag)) fail(`单文件构建失败：找不到脚本标签 ${tag}`);
    html = html.replace(tag, `<script>\n${escaped}\n</script>`);
  }

  /* 5.3 内联音轨 */
  const m4a = fs.readFileSync(path.join(DIST, 'assets', 'score.m4a'));
  const dataUri = `data:audio/mp4;base64,${m4a.toString('base64')}`;
  const audioTag = 'src="assets/score.m4a"';
  if (!html.includes(audioTag)) fail('单文件构建失败：找不到音轨引用');
  html = html.replace(audioTag, `src="${dataUri}"`);

  /* 5.4 相对路径引用（脚本与样式已内联，剩下的 src= 只能是 data: 或页内锚点） */
  html = html.replace(/<script src="[^"]*"[^>]*><\/script>\s*/g, '');

  fs.writeFileSync(path.join(DIST, 'single.html'), html, 'utf8');
  log(`[5/6] 单文件产物：dist/single.html ${(fs.statSync(path.join(DIST, 'single.html')).size / 1048576).toFixed(2)}MB`);
}

/* ---------------------------------------------------------------- 6. 自检 */
function selfCheck() {
  const single = fs.readFileSync(path.join(DIST, 'single.html'), 'utf8');
  const problems = [];

  if (/src="\.\//.test(single)) problems.push('存在相对路径 src 引用');
  if (/href="http/i.test(single)) problems.push('存在外部 href');
  if (/url\(\s*['"]?https?:/i.test(single)) problems.push('存在外部 url() 资源');
  if (/<script[^>]+type="module"/i.test(single)) problems.push('存在 ES module 脚本（file:// 会 CORS 失败）');
  if (/\bimport\s+.*\bfrom\s+['"]/.test(single)) problems.push('存在 import 语句');
  if (/https?:\/\/(?!www\.w3\.org)/i.test(single)) problems.push('存在 http(s) 外部地址');

  /* 多文件产物里也不得有外部引用 */
  const multi = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');
  if (/href="http/i.test(multi)) problems.push('多文件 index.html 存在外部 href');
  if (/src="https?:/i.test(multi)) problems.push('多文件 index.html 存在外部 src');

  /* src/ 与 styles/ 里不许出现裸 hex（令牌文件除外） */
  const cssText = fs.readFileSync(path.join(DIST, 'styles', 'main.css'), 'utf8');
  const cssBody = cssText.replace(/^\/\* 由 src\/tokens\.js[\s\S]*?\n\}/m, '');
  const hexInCss = cssBody.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
  if (hexInCss.length) problems.push(`styles/main.css 出现裸 hex：${hexInCss.slice(0, 5).join(', ')}`);

  for (const name of SRC_SCRIPTS) {
    if (name === 'tokens.js') continue;
    const js = fs.readFileSync(path.join(DIST, 'src', name), 'utf8');
    const hexInJs = js.match(/#[0-9a-fA-F]{6}\b/g) || [];
    if (hexInJs.length) problems.push(`src/${name} 出现裸 hex：${hexInJs.slice(0, 5).join(', ')}`);
  }

  if (problems.length) {
    fail(`产物自检未通过：\n  - ${problems.join('\n  - ')}`);
  }
  log('[6/6] 产物自检通过：无外部引用、无 ES module、无裸 hex');
}

/* -------------------------------------------------------------------- run */
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
regenStoryData();
buildAudio();
buildStoryboardDoc();
compileTokens();
copyMultiFile();
buildSingle();
selfCheck();
log('构建完成：dist/index.html、dist/single.html、dist/assets/score.m4a');
