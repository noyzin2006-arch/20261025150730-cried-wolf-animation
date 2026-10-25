/*
 * tests/build.test.mjs —— 构建产物与工程纪律断言。
 *
 * 覆盖：产物齐备、单文件无外链、无裸 hex、锁版本、令牌单一真源、禁止 emoji 图标。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const SRC_SCRIPTS = ['tokens.js', 'story-data.js', 'geometry.js', 'timeline.js', 'scene.js',
  'audio-player.js', 'icons.js', 'ui.js', 'main.js'];

function readDist(rel) {
  return fs.readFileSync(path.join(DIST, rel), 'utf8');
}

test('构建产物齐备', () => {
  for (const rel of ['index.html', 'single.html', 'styles/main.css', 'assets/score.m4a']) {
    assert.ok(fs.existsSync(path.join(DIST, rel)), `缺少 dist/${rel}`);
  }
  for (const name of SRC_SCRIPTS) {
    assert.ok(fs.existsSync(path.join(DIST, 'src', name)), `缺少 dist/src/${name}`);
  }
});

test('单文件产物不含任何外部引用', () => {
  const html = readDist('single.html');
  assert.ok(!/src="\.\//.test(html), 'single.html 仍有相对路径引用');
  assert.ok(!/href="http/i.test(html), 'single.html 仍有外部 href');
  assert.ok(!/url\(\s*['"]?https?:/i.test(html), 'single.html 仍有外部 url()');
  assert.ok(!/<script[^>]+type="module"/i.test(html), 'single.html 含 ES module（file:// 会 CORS 失败）');
  assert.ok(!/\bimport\s+.*\bfrom\s+['"]/.test(html), 'single.html 含 import 语句');
  assert.ok(!/https?:\/\/(?!www\.w3\.org)/i.test(html), 'single.html 含 http(s) 外部地址');
});

test('单文件产物把样式、脚本与音轨都内联了', () => {
  const html = readDist('single.html');
  assert.ok(/<style>/.test(html), '样式未内联');
  assert.ok(html.includes('data:audio/mp4;base64,'), '音轨未内联为 data URI');
  assert.ok(html.includes('CriedWolf'), '脚本未内联');
  assert.ok(!/<script[^>]+src=/.test(html), '仍有外链脚本');
});

test('多文件 index.html 也不含外部引用', () => {
  const html = readDist('index.html');
  assert.ok(!/href="http/i.test(html));
  assert.ok(!/src="https?:/i.test(html));
  assert.ok(html.includes('src="src/tokens.js"'), '脚本引用应保持相对路径');
});

test('src/ 与 styles/ 里不出现裸 hex（令牌文件除外）', () => {
  const css = readDist('styles/main.css');
  const cssBody = css.replace(/^\/\* 由 src\/tokens\.js[\s\S]*?\n\}/m, '');
  assert.deepEqual(cssBody.match(/#[0-9a-fA-F]{3,8}\b/g) || [], [], 'styles/main.css 出现裸 hex');
  for (const name of SRC_SCRIPTS) {
    if (name === 'tokens.js') continue;
    const js = readDist(path.join('src', name));
    assert.deepEqual(js.match(/#[0-9a-fA-F]{6}\b/g) || [], [], `src/${name} 出现裸 hex`);
  }
});

test('设计令牌是唯一真源：CSS 变量由 tokens.js 编译而来', async () => {
  const css = readDist('styles/main.css');
  /* 只数 :root 块里的声明（正文里对 var() 的引用不算） */
  const rootBlock = css.slice(css.indexOf(':root {'), css.indexOf('\n}', css.indexOf(':root {')) + 2);
  const count = (rootBlock.match(/--cw-[a-z0-9-]+\s*:/g) || []).length;
  assert.ok(count >= 300, `CSS 里只有 ${count} 个令牌变量，疑似没编译进去`);
  const tokens = (await import(path.join(ROOT, 'src', 'tokens.js'))).default;
  assert.equal(count, tokens.collectFlat().length, 'CSS 变量数量与令牌数不一致');
});

test('锁文件固定 playwright 版本，运行时零依赖', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  assert.equal(pkg.dependencies, undefined, '运行时不应有 dependencies');
  assert.equal(pkg.devDependencies.playwright, '1.64.1', 'playwright 必须锁死版本');
  const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8'));
  const entry = lock.packages['node_modules/playwright'];
  assert.equal(entry.version, '1.64.1');
});

test('package.json 的 scripts 齐备', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  for (const s of ['build', 'test', 'dev', 'export', 'verify', 'audit']) {
    assert.ok(pkg.scripts[s], `缺少 npm script: ${s}`);
  }
});

test('界面禁用 emoji 图标，图标全部来自自绘 SVG', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
  assert.ok(!emoji.test(html), 'index.html 出现 emoji');
  for (const name of SRC_SCRIPTS) {
    const js = fs.readFileSync(path.join(ROOT, 'src', name), 'utf8');
    assert.ok(!emoji.test(js), `src/${name} 出现 emoji`);
  }
  const icons = fs.readFileSync(path.join(ROOT, 'src', 'icons.js'), 'utf8');
  assert.ok(icons.includes('createElementNS'), 'icons.js 必须自绘 SVG');
  assert.ok(!/https?:\/\/(?!www\.w3\.org\/2000\/svg)/.test(icons), 'icons.js 不得引用外部图标库');
});

test('页面结构包含必要的可访问性节点', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  for (const id of ['filmFrame', 'filmSvg', 'caption', 'captionText', 'storySummary',
    'playBtn', 'restartBtn', 'captionBtn', 'muteBtn', 'volumeInput', 'progressInput',
    'chapterSelect', 'fullscreenBtn', 'toast', 'statusText', 'filmAudio']) {
    assert.ok(html.includes(`id="${id}"`), `index.html 缺少 #${id}`);
  }
  assert.ok(html.includes('aria-live="polite"'), '状态区需要 aria-live');
  assert.ok(html.includes('<noscript>'), '需要 no-JS 降级说明');
  assert.ok(html.includes('lang="zh-CN"'));
});

test('index.html 的脚本顺序固定且都是经典脚本（file:// 兼容）', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const order = ['tokens.js', 'story-data.js', 'geometry.js', 'timeline.js', 'scene.js',
    'audio-player.js', 'icons.js', 'ui.js', 'main.js'];
  let cursor = -1;
  for (const name of order) {
    const idx = html.indexOf(`src="src/${name}"`);
    assert.ok(idx > cursor, `脚本 ${name} 顺序不对`);
    cursor = idx;
    assert.ok(html.includes(`<script src="src/${name}" defer></script>`), `${name} 必须用经典脚本 + defer`);
  }
});

test('分镜表与机器可读数据一致（镜头数与时长）', () => {
  const story = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'story.json'), 'utf8'));
  const md = fs.readFileSync(path.join(ROOT, 'docs', 'storyboard.md'), 'utf8');
  for (const shot of story.shots) {
    assert.ok(md.includes(`镜 ${String(shot.index).padStart(2, '0')}`), `分镜表缺少镜 ${shot.index}`);
  }
  assert.ok(md.includes('150'), '分镜表必须写明总时长 150 秒');
});
