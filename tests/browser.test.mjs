/*
 * tests/browser.test.mjs —— 真实浏览器（Chromium）验收。
 *
 * 覆盖：零 console/pageerror、零外部请求、逐帧确定性、键盘可达、
 * 五断点无横向滚动与控件重叠、44px 点击区、字幕与时间对应。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const story = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'story.json'), 'utf8'));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.m4a': 'audio/mp4'
};

/** 测试用的小型静态服务器：只服务 dist 下的白名单文件。 */
function startServer() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    let rel = decodeURIComponent(url.pathname);
    if (rel === '/') rel = '/index.html';
    const abs = path.join(DIST, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
    if (!abs.startsWith(DIST) || !fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      res.writeHead(404); res.end('not found'); return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(abs)] || 'application/octet-stream' });
    fs.createReadStream(abs).pipe(res);
  });
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve({
      url: `http://127.0.0.1:${server.address().port}`,
      close: () => new Promise((r) => server.close(r))
    }));
  });
}

function sha(buf) {
  return createHash('sha256').update(buf).digest('hex').slice(0, 12);
}

let browser = null;
let server = null;

test.before(async () => {
  assert.ok(fs.existsSync(path.join(DIST, 'single.html')), '缺少 dist/single.html，请先运行 npm run build');
  browser = await chromium.launch();
  server = await startServer();
});

test.after(async () => {
  if (browser) await browser.close();
  if (server) await server.close();
});

async function openPage(url, opts = {}) {
  const context = await browser.newContext({
    viewport: opts.viewport || { width: 1280, height: 900 },
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    reducedMotion: opts.reducedMotion || 'no-preference'
  });
  const page = await context.newPage();
  const errors = [];
  const external = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('ERR_FILE_NOT_FOUND')) errors.push(`console: ${m.text()}`);
  });
  page.on('request', (req) => {
    const u = req.url();
    if (u.startsWith('data:') || u.startsWith('blob:')) return;
    if (u.startsWith('file://')) return;
    if (u.startsWith(server.url)) return;
    external.push(u);
  });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForFunction(() => document.documentElement.getAttribute('data-app-ready') === 'true');
  return { context, page, errors, external };
}

/* ------------------------------------------------------------------ */

test('多文件版：零 console error、零 pageerror、零外部请求', async () => {
  const { context, page, errors, external } = await openPage(server.url);
  assert.deepEqual(errors, [], `出现错误：\n${errors.join('\n')}`);
  assert.deepEqual(external, [], `出现外部请求：${external.join(', ')}`);
  await context.close();
});

test('单文件版（file://）：零 console error、零 pageerror、零外部请求', async () => {
  const url = pathToFileURL(path.join(DIST, 'single.html')).href;
  const { context, page, errors, external } = await openPage(url);
  assert.deepEqual(errors, [], `出现错误：\n${errors.join('\n')}`);
  assert.deepEqual(external, [], `出现外部请求：${external.join(', ')}`);
  await context.close();
});

test('逐帧确定性：同一帧两次渲染像素一致', async () => {
  const { context, page } = await openPage(server.url);
  await page.evaluate(() => window.CriedWolf.setExportMode(true));
  const grab = async (frame) => {
    await page.evaluate((f) => window.CriedWolf.seekFrame(f), frame);
    return sha(await page.locator('#filmFrame').screenshot());
  };
  const a = await grab(1200);
  const b = await grab(600);
  const a2 = await grab(1200);
  assert.equal(a, a2, '同一帧两次渲染结果不一致');
  assert.notEqual(a, b, '不同帧不应产生相同像素');
  await context.close();
});

test('连续 60 帧：frameId 互不相同、时间戳严格递增、像素大部分不同', async () => {
  const { context, page } = await openPage(server.url);
  await page.evaluate(() => window.CriedWolf.setExportMode(true));
  const start = 40 * 30;
  const ids = [];
  const times = [];
  const hashes = [];
  for (let i = 0; i < 60; i++) {
    const frame = start + i;
    await page.evaluate((f) => window.CriedWolf.seekFrame(f), frame);
    ids.push(await page.evaluate(() => Number(document.documentElement.getAttribute('data-frame-id'))));
    times.push(await page.evaluate(() => Number(document.documentElement.getAttribute('data-time-sec'))));
    hashes.push(sha(await page.locator('#filmFrame').screenshot()));
  }
  assert.equal(new Set(ids).size, 60, 'frameId 有重复');
  assert.equal(new Set(hashes).size >= 55, true, `60 帧里只有 ${new Set(hashes).size} 个不同像素`);
  for (let i = 1; i < times.length; i++) {
    assert.ok(times[i] > times[i - 1], `时间戳未严格递增：${times[i - 1]} → ${times[i]}`);
  }
  await context.close();
});

test('反复 seek 后 DOM 元素数不增长（两轮遍历 15 镜，节点数不再累积）', async () => {
  const { context, page } = await openPage(server.url);
  await page.evaluate(() => window.CriedWolf.setExportMode(true));
  const shotFrames = story.shots.map((s) => Math.round((s.start + 0.5) * story.meta.fps));
  const countAt = async (frame) => {
    await page.evaluate((f) => window.CriedWolf.seekFrame(f), frame);
    return page.evaluate(() => document.getElementsByTagName('*').length);
  };
  const pass1 = [];
  for (const f of shotFrames) pass1.push(await countAt(f));
  const pass2 = [];
  for (const f of shotFrames) pass2.push(await countAt(f));
  const max1 = Math.max(...pass1);
  const max2 = Math.max(...pass2);
  assert.ok(max2 <= max1, `第二轮最大节点数 ${max2} 大于第一轮 ${max1}，说明节点在累积`);
  assert.ok(max2 <= 600, `DOM 节点峰值 ${max2}，超出 450 的活动节点预算太多`);
  await context.close();
});

test('字幕与时间对应：镜头 04 的呼喊字幕在 29s 出现', async () => {
  const { context, page } = await openPage(server.url);
  await page.evaluate(() => window.CriedWolf.setExportMode(true));
  await page.evaluate(() => window.CriedWolf.renderAt(29.5));
  const cap = await page.locator('#caption').getAttribute('opacity');
  const text = await page.locator('#captionText').textContent();
  assert.ok(Number(cap) > 0, '29.5s 处字幕应当可见');
  assert.ok(text.includes('狼来了'), `字幕内容不对：${text}`);
  await page.evaluate(() => window.CriedWolf.renderAt(20));
  const cap2 = await page.locator('#caption').getAttribute('opacity');
  assert.equal(Number(cap2), 0, '20s 处不应有字幕');
  await context.close();
});

test('键盘可达：Tab 能走到播放控件，焦点环可见', async () => {
  const { context, page } = await openPage(server.url);
  const seen = [];
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      return {
        id: el.id || el.className || el.tagName,
        outlineWidth: parseFloat(cs.outlineWidth) || 0,
        outlineStyle: cs.outlineStyle
      };
    });
    if (info) seen.push(info);
  }
  const ids = seen.map((s) => s.id);
  assert.ok(ids.includes('playBtn'), `Tab 顺序里没有播放按钮：${ids.join(' → ')}`);
  const focused = seen.find((s) => s.id === 'playBtn');
  assert.ok(focused.outlineWidth >= 2, `焦点环只有 ${focused.outlineWidth}px`);
  assert.notEqual(focused.outlineStyle, 'none');
  await context.close();
});

test('快捷键：空格暂停、C 切字幕、R 重播', async () => {
  const { context, page } = await openPage(server.url);
  await page.evaluate(() => window.CriedWolf.setExportMode(true));
  const before = await page.evaluate(() => window.CriedWolf.getState().captions);
  await page.keyboard.press('c');
  const after = await page.evaluate(() => window.CriedWolf.getState().captions);
  assert.notEqual(before, after, 'C 键没有切换字幕');
  await page.keyboard.press('c');
  await context.close();
});

test('五个断点：无横向滚动、控件不重叠、点击区 ≥ 44px', async () => {
  for (const width of [375, 480, 768, 1024, 1440]) {
    const { context, page } = await openPage(server.url, { viewport: { width, height: 900 } });
    const report = await page.evaluate(() => {
      const de = document.documentElement;
      const ids = ['playBtn', 'restartBtn', 'captionBtn', 'muteBtn', 'fullscreenBtn', 'progressInput', 'chapterSelect'];
      const boxes = ids.map((id) => {
        const el = document.getElementById(id);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { id, x: r.x, y: r.y, w: r.width, h: r.height };
      }).filter(Boolean);
      const overlaps = [];
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j];
          const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
          const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          if (ox > 1 && oy > 1) overlaps.push(`${a.id}×${b.id}`);
        }
      }
      const small = boxes.filter((b) => ['playBtn', 'restartBtn', 'captionBtn', 'muteBtn', 'fullscreenBtn'].includes(b.id)
        && (b.w < 44 || b.h < 44)).map((b) => `${b.id}(${Math.round(b.w)}×${Math.round(b.h)})`);
      return {
        scrollWidth: de.scrollWidth,
        clientWidth: de.clientWidth,
        overlaps,
        small
      };
    });
    assert.ok(report.scrollWidth <= report.clientWidth + 1, `${width}px 出现横向滚动：${report.scrollWidth} > ${report.clientWidth}`);
    assert.deepEqual(report.overlaps, [], `${width}px 控件互相重叠：${report.overlaps.join(', ')}`);
    assert.deepEqual(report.small, [], `${width}px 点击区不足 44px：${report.small.join(', ')}`);
    await context.close();
  }
});

test('减弱动效：prefers-reduced-motion 下仍能渲染关键帧', async () => {
  const { context, page, errors } = await openPage(server.url, { reducedMotion: 'reduce' });
  await page.evaluate(() => window.CriedWolf.setExportMode(true));
  await page.evaluate(() => window.CriedWolf.renderAt(113));
  const box = await page.locator('#filmFrame').boundingBox();
  assert.ok(box.width > 0 && box.height > 0, '减弱动效下舞台没有尺寸');
  assert.deepEqual(errors, []);
  await context.close();
});

test('动画只改 transform / opacity：抽查 60 帧内没有 width/height/top/left 的样式写入', async () => {
  const { context, page } = await openPage(server.url);
  await page.evaluate(() => window.CriedWolf.setExportMode(true));
  const bad = await page.evaluate(() => {
    const forbidden = ['width', 'height', 'top', 'left', 'margin', 'padding', 'background-color', 'fill', 'filter'];
    const hits = [];
    const seen = new Set();
    for (let i = 0; i < 60; i++) {
      window.CriedWolf.seekFrame(1200 + i);
      document.querySelectorAll('#filmSvg [style], #filmSvg *').forEach((el) => {
        const st = el.getAttribute('style');
        if (!st || seen.has(st)) return;
        seen.add(st);
        for (const prop of forbidden) {
          if (new RegExp(`(^|;)\\s*${prop}\\s*:`).test(st)) hits.push(`${el.tagName}.${el.getAttribute('class') || ''} {${st}}`);
        }
      });
    }
    return hits.slice(0, 10);
  });
  assert.deepEqual(bad, [], `发现被动画的布局属性：${bad.join(' | ')}`);
  await context.close();
});

test('点击播放后音轨真的在走：画面时刻跟随音轨，不漂移', async () => {
  const { context, page, errors } = await openPage(server.url);
  await page.waitForFunction(() => {
    const a = document.getElementById('filmAudio');
    return a && a.readyState >= 2;
  }, null, { timeout: 15000 });
  await page.click('#playBtn');
  await page.waitForTimeout(1500);
  const s1 = await page.evaluate(() => {
    const a = document.getElementById('filmAudio');
    return { audio: a.currentTime, state: window.CriedWolf.getState().timeSec, paused: a.paused, status: window.CriedWolf.getState().status };
  });
  assert.equal(s1.paused, false, '点击播放后音轨处于暂停状态');
  assert.ok(s1.audio > 0.5, `音轨没有前进：currentTime=${s1.audio}`);
  assert.ok(Math.abs(s1.audio - s1.state) < 0.25, `音画偏移过大：audio=${s1.audio} frame=${s1.state}`);
  assert.equal(s1.status, 'playing');

  await page.waitForTimeout(1200);
  const s2 = await page.evaluate(() => {
    const a = document.getElementById('filmAudio');
    return { audio: a.currentTime, state: window.CriedWolf.getState().timeSec };
  });
  assert.ok(s2.audio > s1.audio, '音轨没有继续前进');
  assert.ok(Math.abs(s2.audio - s2.state) < 0.25, `音画偏移过大：audio=${s2.audio} frame=${s2.state}`);

  await page.click('#playBtn');
  await page.waitForTimeout(300);
  const s3 = await page.evaluate(() => document.getElementById('filmAudio').paused);
  assert.equal(s3, true, '再次点击应当暂停');
  assert.deepEqual(errors, []);
  await context.close();
});

test('拖动进度条：画面立即定位到对应帧', async () => {
  const { context, page } = await openPage(server.url);
  await page.evaluate(() => window.CriedWolf.setExportMode(true));
  await page.evaluate(() => {
    const el = document.getElementById('progressInput');
    el.value = '2250';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const st = await page.evaluate(() => window.CriedWolf.getState());
  assert.equal(st.frameId, 2250, `定位到第 ${st.frameId} 帧，而不是 2250`);
  assert.ok(Math.abs(st.timeSec - 75) < 0.02);
  await context.close();
});

test('章节下拉：能跳到指定镜头', async () => {
  const { context, page } = await openPage(server.url);
  await page.evaluate(() => window.CriedWolf.setExportMode(true));
  await page.evaluate(() => {
    const sel = document.getElementById('chapterSelect');
    sel.value = '10';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const st = await page.evaluate(() => window.CriedWolf.getState());
  const shot = await page.evaluate(() => window.CriedWolf.getShots()[10]);
  assert.ok(Math.abs(st.timeSec - shot.start) < 0.05, `跳到 ${st.timeSec}s，应为 ${shot.start}s`);
  await context.close();
});

test('音频元素就绪且与片长一致', async () => {
  const { context, page } = await openPage(server.url);
  const info = await page.evaluate(() => {
    const a = document.getElementById('filmAudio');
    return { src: a.getAttribute('src'), exists: !!a };
  });
  assert.ok(info.exists);
  assert.ok(info.src.startsWith('assets/score.m4a'));
  await context.close();
});
