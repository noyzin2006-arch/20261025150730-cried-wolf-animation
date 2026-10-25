#!/usr/bin/env node
/**
 * 浏览器验收审计（scripts/audit-browser.mjs）
 *
 * 对「多文件版（localhost）」与「单文件版（file://）」分别执行同一套检查，结果合并写入
 * reports/browser-audit.json。
 *
 * 覆盖：网络与错误、响应式（5 断点）、分镜代表帧与像素哈希、帧连续性、性能（CLS / 反馈延迟）、
 *       无障碍（键盘焦点环 / reduced-motion / 200% 文字缩放）、四态截图。
 *
 * 脚本自行启动与关闭本机服务器，不需要人工先跑 dev server。
 * 退出码：全部通过 0；存在 FAIL 为 1。
 *
 * 用法：
 *   node scripts/audit-browser.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { startServer } from './serve.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');
const REPORTS_DIR = path.join(REPO_ROOT, 'reports');
const SHOTS_DIR = path.join(REPORTS_DIR, 'screenshots');
const SINGLE_SHOTS_DIR = path.join(SHOTS_DIR, 'single');

const VIEWPORT = { width: 1280, height: 720 };

/** 五个断点；高度按 1440×900 的比例缩放，1440 直接用 900。 */
const WIDTHS = [375, 480, 768, 1024, 1440];
const heightFor = (w) => (w === 1440 ? 900 : Math.round((w * 900) / 1440));

/** 控制区元素（两两不得相交）。 */
const CONTROL_IDS = [
  'playBtn',
  'restartBtn',
  'captionBtn',
  'muteBtn',
  'fullscreenBtn',
  'progressInput',
  'chapterSelect',
];

/** 需要 ≥44×44 的可点击控件；progressInput 是 spec 允许的例外（单独标注）。 */
const CLICKABLE_IDS = [
  'playBtn',
  'restartBtn',
  'captionBtn',
  'muteBtn',
  'fullscreenBtn',
  'chapterSelect',
];
const PROGRESS_ID = 'progressInput';

/** 15 镜代表帧（秒）。 */
const SHOT_TIMES = [1.5, 12, 24.5, 31, 43, 56, 65, 72, 85, 97, 108, 115, 126, 136, 146];

/** 边界帧：秒数 → 帧号（边界前一帧与边界帧）。 */
const BOUNDARY_FRAMES = [
  ['27.966', 839],
  ['28', 840],
  ['100.966', 3029],
  ['101', 3030],
  ['140.966', 4229],
  ['141', 4230],
];

/** 帧连续性采样段：40–42s（镜05），60 帧。 */
const CONTINUITY_START = 1200;
const CONTINUITY_COUNT = 60;

/**
 * 审计自身故意制造媒体故障的阶段：这些阶段会产生必然的 console error
 * （404 / ERR_FAILED / ERR_FILE_NOT_FOUND），属于审计注入而非应用缺陷，
 * 因此单独统计并在报告中标注，不计入「console error = 0」这条断言。
 */
const AUDIT_INJECTED_PHASES = new Set(['states:loading', 'states:error', 'states:empty']);

const CLS_INIT = () => {
  window.__cls = 0;
  window.__clsEntries = [];
  window.__clsReset = () => {
    window.__cls = 0;
    window.__clsEntries = [];
  };
  try {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.hadRecentInput) continue;
        window.__cls += entry.value;
        window.__clsEntries.push({ value: entry.value, startTime: entry.startTime });
      }
    });
    po.observe({ type: 'layout-shift', buffered: true });
  } catch (err) {
    window.__clsError = String(err);
  }
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const md5 = (buf) => createHash('md5').update(buf).digest('hex');
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const shotName = (t) => `shot-${String(t).replace(/\./g, '-')}.png`;

/** 检查记录器：所有 PASS/FAIL 都进这里，最后统一写进 JSON。 */
class Recorder {
  constructor() {
    this.checks = [];
  }

  add(scope, id, name, passed, expected, actual, note = '') {
    const status = passed === null ? 'NA' : passed ? 'PASS' : 'FAIL';
    const record = { scope, id, name, status, expected, actual, note };
    this.checks.push(record);
    const tag = status === 'PASS' ? 'PASS' : status === 'NA' ? 'NA  ' : 'FAIL';
    process.stdout.write(
      `[audit] ${tag} [${scope}] ${id} ${name}｜期望 ${JSON.stringify(expected)}｜实际 ${JSON.stringify(actual)}${
        note ? `｜${note}` : ''
      }\n`,
    );
    return record;
  }
}

/** 判断两个矩形是否真正相交（留 1px 容差，避免边界相接被误判）。 */
function rectsOverlap(a, b) {
  const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return overlapX > 1 && overlapY > 1 ? { overlapX, overlapY } : null;
}

function classifyUrl(raw) {
  if (raw.startsWith('data:') || raw.startsWith('blob:')) return 'ignored';
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    return 'ignored';
  }
  if (parsed.protocol === 'file:') return 'local';
  if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
    const host = parsed.hostname;
    if (host === '127.0.0.1' || host === 'localhost' || host === '::1') return 'local';
    return 'external';
  }
  return 'ignored';
}

/** 采集控制区几何信息。 */
async function readControls(page) {
  return page.evaluate((ids) => {
    const doc = document.documentElement;
    const rects = {};
    const missing = [];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) {
        missing.push(id);
        continue;
      }
      const r = el.getBoundingClientRect();
      rects[id] = {
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
        visible: r.width > 0 && r.height > 0,
      };
    }
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      rects,
      missing,
    };
  }, CONTROL_IDS);
}

/** 响应式检查：单个宽度。 */
async function checkResponsive(page, recorder, scope, width) {
  const height = heightFor(width);
  await page.setViewportSize({ width, height });
  await sleep(160);
  const info = await readControls(page);

  recorder.add(
    scope,
    `R-${width}-scroll`,
    `${width}px 无横向滚动`,
    info.scrollWidth <= info.clientWidth,
    `scrollWidth <= clientWidth`,
    `scrollWidth=${info.scrollWidth}, clientWidth=${info.clientWidth}`,
  );

  if (info.missing.length > 0) {
    recorder.add(
      scope,
      `R-${width}-missing`,
      `${width}px 控制区元素齐全`,
      false,
      '全部存在',
      `缺少 ${info.missing.join(',')}`,
    );
  } else {
    recorder.add(scope, `R-${width}-missing`, `${width}px 控制区元素齐全`, true, '全部存在', '齐全');
  }

  const present = CONTROL_IDS.filter((id) => info.rects[id]?.visible);
  const overlaps = [];
  for (let i = 0; i < present.length; i += 1) {
    for (let j = i + 1; j < present.length; j += 1) {
      const hit = rectsOverlap(info.rects[present[i]], info.rects[present[j]]);
      if (hit) {
        overlaps.push({
          a: present[i],
          b: present[j],
          overlapX: Number(hit.overlapX.toFixed(2)),
          overlapY: Number(hit.overlapY.toFixed(2)),
        });
      }
    }
  }
  recorder.add(
    scope,
    `R-${width}-overlap`,
    `${width}px 控制区两两不相交`,
    overlaps.length === 0,
    '0 对相交',
    overlaps.length === 0 ? '0 对相交' : JSON.stringify(overlaps),
  );

  const tooSmall = [];
  for (const id of CLICKABLE_IDS) {
    const rect = info.rects[id];
    if (!rect || !rect.visible) {
      tooSmall.push({ id, reason: '不可见或缺失' });
      continue;
    }
    if (rect.width < 44 || rect.height < 44) {
      tooSmall.push({ id, width: Number(rect.width.toFixed(2)), height: Number(rect.height.toFixed(2)) });
    }
  }
  recorder.add(
    scope,
    `R-${width}-tap44`,
    `${width}px 可点击控件 ≥44×44`,
    tooSmall.length === 0,
    '全部 ≥44×44',
    tooSmall.length === 0 ? '全部达标' : JSON.stringify(tooSmall),
    `控件集合 ${CLICKABLE_IDS.join(',')}`,
  );

  const progressRect = info.rects[PROGRESS_ID];
  recorder.add(
    scope,
    `R-${width}-progress`,
    `${width}px 进度条尺寸（spec 例外，不计 FAIL）`,
    null,
    'spec 允许 progressInput 低于 44',
    progressRect
      ? `${progressRect.width.toFixed(2)}×${progressRect.height.toFixed(2)}`
      : '缺失',
    'progressInput 按 spec 作为 44px 尺寸的例外项，仅记录不判定',
  );

  return { width, height, ...info };
}

/** 采一帧并落盘，返回像素哈希。 */
async function captureFrame(page, frame, label, dir) {
  // 必须在同一个 evaluate 里「seek + 读 dataset」：应用自身的 rAF 渲染循环会周期性
  // 把 data-frame-id / data-time-sec 写回当前播放头（未就绪时是 0），
  // 分两次 round-trip 读会与该循环竞争，测到的不是 seek 之后的值。
  const dataset = await page.evaluate((f) => {
    window.CriedWolf.seekFrame(f);
    return {
      frameId: document.documentElement.dataset.frameId ?? null,
      timeSec: document.documentElement.dataset.timeSec ?? null,
    };
  }, frame);
  const buf = await page.locator('#filmFrame').screenshot({ type: 'png', animations: 'disabled' });
  const file = path.join(dir, shotName(label));
  fs.writeFileSync(file, buf);
  return {
    label: String(label),
    frame,
    timeSec: frame / 30,
    datasetFrameId: dataset.frameId,
    datasetTimeSec: dataset.timeSec,
    hash: md5(buf),
    file: path.relative(REPO_ROOT, file),
    bytes: buf.length,
  };
}

/** 分镜代表帧 + 边界帧 + 同帧重复哈希一致性。 */
async function auditShotFrames(page, recorder, scope) {
  await page.setViewportSize(VIEWPORT);
  await sleep(120);
  await page.evaluate(() => window.CriedWolf.setExportMode(true));
  await sleep(120);

  const stage = await page.locator('#filmFrame').boundingBox();
  recorder.add(
    scope,
    'S-stage',
    '导出模式下 #filmFrame 恰好 1280×720',
    Boolean(stage) && Math.round(stage.width) === 1280 && Math.round(stage.height) === 720,
    '1280×720',
    stage ? `${Math.round(stage.width)}×${Math.round(stage.height)}` : '未找到元素',
  );

  const shots = [];
  for (const t of SHOT_TIMES) {
    const frame = Math.round(t * 30);
    shots.push(await captureFrame(page, frame, t, SHOTS_DIR));
  }
  for (const [label, frame] of BOUNDARY_FRAMES) {
    shots.push(await captureFrame(page, frame, label, SHOTS_DIR));
  }

  const datasetOk = shots.every(
    (s) => s.datasetFrameId === String(s.frame) && Number(s.datasetTimeSec) === Number(s.frame / 30),
  );
  recorder.add(
    scope,
    'S-dataset',
    'seekFrame 后 documentElement.dataset 帧号/时间正确',
    datasetOk,
    'frameId=i 且 timeSec=i/30',
    datasetOk ? '全部一致' : JSON.stringify(shots.filter((s) => s.datasetFrameId !== String(s.frame)).slice(0, 3)),
  );

  // 同帧重复哈希一致性（取 3 个帧各再截一次比对）
  const repeatChecks = [];
  for (const frame of [839, 840, 3030]) {
    const again = await captureFrame(page, frame, `repeat-${frame}`, SHOTS_DIR);
    const first = shots.find((s) => s.frame === frame);
    repeatChecks.push({ frame, firstHash: first?.hash ?? null, repeatHash: again.hash, same: first?.hash === again.hash });
    fs.rmSync(path.join(SHOTS_DIR, shotName(`repeat-${frame}`)), { force: true });
  }
  const allSame = repeatChecks.every((c) => c.same);
  recorder.add(
    scope,
    'S-same-frame-hash',
    '同一帧重复截屏像素哈希一致',
    allSame,
    '全部一致',
    JSON.stringify(repeatChecks),
  );

  // 连续帧哈希不同（相邻代表帧抽样）
  const adjacent = [];
  for (let i = 1; i < shots.length; i += 1) {
    if (shots[i].frame === shots[i - 1].frame + 1) {
      adjacent.push({ a: shots[i - 1].label, b: shots[i].label, different: shots[i].hash !== shots[i - 1].hash });
    }
  }
  recorder.add(
    scope,
    'S-adjacent-hash',
    '相邻帧像素哈希不同',
    adjacent.length === 0 || adjacent.every((c) => c.different),
    '相邻帧哈希不同',
    adjacent.length === 0 ? '无相邻样本' : JSON.stringify(adjacent),
  );

  return shots;
}

/** 帧连续性：40–42s 连取 60 帧。 */
async function auditContinuity(page, recorder, scope) {
  const samples = [];
  for (let i = 0; i < CONTINUITY_COUNT; i += 1) {
    const frame = CONTINUITY_START + i;
    // 同样在同一个 evaluate 里 seek + 读，避免与应用 rAF 循环竞争
    const d = await page.evaluate((f) => {
      window.CriedWolf.seekFrame(f);
      return {
        frameId: document.documentElement.dataset.frameId ?? null,
        timeSec: document.documentElement.dataset.timeSec ?? null,
      };
    }, frame);
    samples.push({ frame, frameId: d.frameId, timeSec: d.timeSec });
  }
  const ids = samples.map((s) => s.frameId);
  const unique = new Set(ids).size;
  recorder.add(
    scope,
    'C-frames',
    '40–42s 连续 60 帧的 frameId 互不相同',
    unique === CONTINUITY_COUNT,
    CONTINUITY_COUNT,
    unique,
    `样本 ${CONTINUITY_START}–${CONTINUITY_START + CONTINUITY_COUNT - 1}`,
  );
  const notIncreasing = [];
  for (let i = 1; i < samples.length; i += 1) {
    const prev = Number(samples[i - 1].timeSec);
    const cur = Number(samples[i].timeSec);
    if (!(Number.isFinite(prev) && Number.isFinite(cur) && cur > prev)) {
      notIncreasing.push({ index: i, prev: samples[i - 1], cur: samples[i] });
    }
  }
  recorder.add(
    scope,
    'C-time',
    '40–42s 时间戳严格递增',
    notIncreasing.length === 0,
    '严格递增',
    notIncreasing.length === 0 ? '严格递增' : JSON.stringify(notIncreasing.slice(0, 3)),
    notIncreasing.length === 0 ? '' : '列出首个不递增的相邻对',
  );

  // 附加观察：seek 之后稍作等待，dataset 是否仍停在 seek 帧
  // （应用自身的 rAF 渲染循环可能把 data-frame-id 写回当前播放头）。
  await page.evaluate((f) => window.CriedWolf.seekFrame(f), CONTINUITY_START);
  await sleep(120);
  const drifted = await page.evaluate(() => ({
    frameId: document.documentElement.dataset.frameId ?? null,
    timeSec: document.documentElement.dataset.timeSec ?? null,
  }));
  recorder.add(
    scope,
    'C-dataset-stability',
    'seek 后 120ms，dataset 是否仍为 seek 帧（仅记录，不判定）',
    null,
    `稳定为 ${CONTINUITY_START}`,
    `frameId=${drifted.frameId}, timeSec=${drifted.timeSec}`,
    '若与应用 rAF 渲染循环竞争，本项会显示被覆盖后的值；契约只要求「执行后」立即成立',
  );
  return samples;
}

/** 性能：CLS 与交互反馈延迟。 */
async function auditPerformance(page, recorder, scope) {
  await page.setViewportSize(VIEWPORT);
  await sleep(200);
  await page.evaluate(() => window.__clsReset?.());
  await sleep(900);
  const cls = await page.evaluate(() => window.__cls ?? null);
  recorder.add(scope, 'P-cls', '累积布局偏移 CLS ≤ 0.1', cls !== null && cls <= 0.1, '≤ 0.1', cls ?? 'N/A');

  // 先等播放按钮可用：媒体未就绪时按钮可能是 disabled，此时点击不会触发任何状态变化，
  // 直接测会得到「超时」而不是可定位的原因。
  const enabled = await page
    .waitForFunction(
      () => {
        const btn = document.getElementById('playBtn');
        return !!btn && !btn.disabled;
      },
      { timeout: 10000 },
    )
    .then(() => true)
    .catch(() => false);

  const btnState = await page.evaluate(() => {
    const btn = document.getElementById('playBtn');
    let appState = null;
    try {
      appState = window.CriedWolf?.getState?.() ?? null;
    } catch {
      appState = null;
    }
    return {
      exists: Boolean(btn),
      disabled: btn ? btn.disabled : null,
      dataState: btn ? btn.getAttribute('data-state') : null,
      ariaLabel: btn ? btn.getAttribute('aria-label') : null,
      mediaReady: appState ? appState.mediaReady : null,
      status: appState ? appState.status : null,
    };
  });
  recorder.add(
    scope,
    'P-playbtn-enabled',
    '播放按钮在媒体就绪后可用（可点击）',
    enabled && btnState.disabled === false,
    'enabled',
    `disabled=${btnState.disabled}, data-state=${btnState.dataState}, mediaReady=${btnState.mediaReady}, status=${btnState.status}`,
    enabled ? '' : '10 秒内播放按钮始终为 disabled，用户无法点击播放',
  );

  const latency = await page.evaluate(async () => {
    const btn = document.getElementById('playBtn');
    if (!btn) return { error: '缺少 #playBtn' };
    if (btn.disabled) return { error: '播放按钮处于 disabled，点击不会触发任何变化' };
    const snapshot = () =>
      `${btn.textContent}|${btn.getAttribute('aria-label') ?? ''}|${btn.getAttribute('aria-pressed') ?? ''}|${
        btn.getAttribute('title') ?? ''
      }|${btn.getAttribute('data-state') ?? ''}|${btn.className}`;
    const before = snapshot();
    const t0 = performance.now();
    btn.click();
    return await new Promise((resolve) => {
      const deadline = t0 + 2000;
      const tick = () => {
        const now = performance.now();
        if (snapshot() !== before) {
          resolve({ ms: now - t0, changed: true });
          return;
        }
        if (now > deadline) {
          resolve({ ms: now - t0, changed: false });
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  });

  if (latency.error) {
    recorder.add(scope, 'P-latency', '点击播放 → 按钮文案变化 < 100ms', false, '< 100ms', 'N/A', latency.error);
  } else {
    recorder.add(
      scope,
      'P-latency',
      '点击播放 → 按钮文案变化 < 100ms',
      latency.changed && latency.ms < 100,
      '< 100ms',
      `${latency.ms.toFixed(1)}ms`,
      latency.changed ? '文案已变化' : '2000ms 内文案未变化',
    );
  }
  return { cls, latency, playButton: btnState };
}

/** 无障碍：Tab 焦点顺序与 focus 可见环。 */
async function auditKeyboard(page, recorder, scope) {
  const order = [];
  for (let i = 0; i < 30; i += 1) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      const outlineWidth = Number.parseFloat(style.outlineWidth);
      return {
        id: el.id || null,
        tag: el.tagName.toLowerCase(),
        text: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 24),
        focusVisible: el.matches(':focus-visible'),
        outlineWidth: Number.isFinite(outlineWidth) ? outlineWidth : 0,
        outlineStyle: style.outlineStyle,
        boxShadow: style.boxShadow,
      };
    });
    if (!info) break;
    order.push(info);
    if (order.length > 1 && order[order.length - 1].id === order[0].id && order[order.length - 1].tag === order[0].tag) {
      break; // 焦点回到起点，结束
    }
  }

  recorder.add(scope, 'K-order', 'Tab 可遍历到控制区控件', order.length > 0, '> 0 个可聚焦元素', order.length);

  // 判定一：spec 口径 —— :focus-visible 的 outline-width ≥ 2px
  const withOutline = order.filter((e) => e.focusVisible && e.outlineWidth >= 2 && e.outlineStyle !== 'none');
  recorder.add(
    scope,
    'K-ring-outline',
    ':focus-visible 的 outline-width ≥ 2px（spec 口径）',
    withOutline.length === order.length && order.length > 0,
    '每个焦点停靠点都 ≥2px 可见外环',
    `${withOutline.length}/${order.length}`,
    order.length > 0
      ? `逐个停靠点：${JSON.stringify(order.map((e) => ({ id: e.id, focusVisible: e.focusVisible, outlineWidth: e.outlineWidth, outlineStyle: e.outlineStyle })))}`
      : '',
  );

  // 判定二：实际是否「看得见」焦点环 —— outline 可见，或 box-shadow 在聚焦时发生变化
  // （有些实现用 box-shadow 画焦点环，此时 outline 宽度为 0，但环是真实可见的）。
  const baselines = await page.evaluate((ids) => {
    const out = {};
    for (const id of ids) {
      const el = id ? document.getElementById(id) : null;
      if (!el) continue;
      el.focus(); // 程序化聚焦不会匹配 :focus-visible，可作为「未聚焦」基线
      const style = getComputedStyle(el);
      out[id] = { outlineWidth: style.outlineWidth, outlineStyle: style.outlineStyle, boxShadow: style.boxShadow };
    }
    return out;
  }, order.map((e) => e.id).filter(Boolean));

  const ringVisible = [];
  for (const e of order) {
    const base = e.id ? baselines[e.id] : null;
    const outlineVisible = e.focusVisible && e.outlineWidth >= 2 && e.outlineStyle !== 'none';
    const shadowChanged = Boolean(base) && base.boxShadow !== e.boxShadow;
    ringVisible.push({ id: e.id, outlineVisible, shadowChanged });
  }
  const visibleCount = ringVisible.filter((r) => r.outlineVisible || r.shadowChanged).length;
  recorder.add(
    scope,
    'K-ring-visible',
    '焦点停靠点存在可见焦点环（outline ≥2px 或 box-shadow 变化）',
    visibleCount === order.length && order.length > 0,
    '每个停靠点都有可见焦点环',
    `${visibleCount}/${order.length}`,
    JSON.stringify(ringVisible),
  );
  return { order, ringVisible };
}

/** 200% 文字缩放下的布局检查。 */
async function auditZoom(page, recorder, scope, dir) {
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%';
  });
  await sleep(240);
  const info = await readControls(page);
  const present = CONTROL_IDS.filter((id) => info.rects[id]?.visible);
  const overlaps = [];
  for (let i = 0; i < present.length; i += 1) {
    for (let j = i + 1; j < present.length; j += 1) {
      const hit = rectsOverlap(info.rects[present[i]], info.rects[present[j]]);
      if (hit) overlaps.push({ a: present[i], b: present[j] });
    }
  }
  recorder.add(
    scope,
    'Z-scroll',
    '200% 文字缩放无横向滚动',
    info.scrollWidth <= info.clientWidth,
    'scrollWidth <= clientWidth',
    `scrollWidth=${info.scrollWidth}, clientWidth=${info.clientWidth}`,
  );
  recorder.add(
    scope,
    'Z-overlap',
    '200% 文字缩放控制区不重叠',
    overlaps.length === 0,
    '0 对相交',
    overlaps.length === 0 ? '0 对相交' : JSON.stringify(overlaps),
  );
  const file = path.join(dir, 'zoom-200.png');
  await page.screenshot({ path: file });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '';
  });
  return { scrollWidth: info.scrollWidth, clientWidth: info.clientWidth, overlaps, file: path.relative(REPO_ROOT, file) };
}

/** 四态截图：默认 / hover / focus / 加载 / 错误 / 结束 / 空 / 成功。 */
async function auditStates(page, recorder, scope, dir, setPhase = () => {}) {
  const states = [];

  const shoot = async (name, note, extra = {}) => {
    const file = path.join(dir, `state-${name}.png`);
    await page.screenshot({ path: file });
    const record = { name, file: path.relative(REPO_ROOT, file), note, ...extra };
    states.push(record);
    recorder.add(scope, `ST-${name}`, `状态截图 state-${name}.png`, true, '截图存在', path.relative(REPO_ROOT, file), note);
    return record;
  };

  await page.setViewportSize(VIEWPORT);
  await sleep(150);
  setPhase('states:default');
  await shoot('default', '默认态');

  const hoverTarget = await page.$('#playBtn');
  if (hoverTarget) {
    await hoverTarget.hover();
    await sleep(160);
    await shoot('hover', 'hover 态（#playBtn）');
  } else {
    states.push({ name: 'hover', note: '缺少 #playBtn，无法制造 hover' });
    recorder.add(scope, 'ST-hover', '状态截图 state-hover.png', false, '截图存在', 'N/A', '缺少 #playBtn');
  }

  await page.keyboard.press('Tab');
  await sleep(120);
  await shoot('focus', 'focus 态（键盘 Tab 后的焦点）');

  // 加载态：把音轨请求延迟 4s，重载后在加载中截图。
  // 单文件版的音轨是 data: URI（不走网络栈），此时退化为「文档刚提交时」��截。
  setPhase('states:loading');
  try {
    let delayed = false;
    try {
      await page.route('**/assets/score.m4a', async (route) => {
        await sleep(4000);
        try {
          await route.continue();
        } catch {
          /* 页面已离开 */
        }
      });
      delayed = true;
    } catch {
      delayed = false;
    }
    await page.reload({ waitUntil: 'commit' });
    await sleep(1200);
    await shoot(
      'loading',
      delayed
        ? '加载态（音轨请求被延迟 4s，加载中截图）'
        : '加载态（音轨为内联 data: URI，无法用网络延迟制造；改在文档刚提交时截图）',
      { mechanism: delayed ? 'route-delay' : 'commit-time' },
    );
    if (delayed) await page.unroute('**/assets/score.m4a');
    await page.reload({ waitUntil: 'load' });
    await sleep(600);
  } catch (err) {
    states.push({ name: 'loading', note: `无法制造加载态：${err?.message ?? err}` });
    recorder.add(scope, 'ST-loading', '状态截图 state-loading.png', false, '截图存在', 'N/A', String(err?.message ?? err));
  }

  // 成功态：媒体就绪后的界面。
  setPhase('states:success');
  const ready = await page.evaluate(() => {
    try {
      return window.CriedWolf?.getState?.().mediaReady ?? null;
    } catch {
      return null;
    }
  });
  await shoot('success', '成功态（mediaReady）', { mediaReady: ready });

  // 错误态：把 audio 的 src 指向不存在的文件触发错误。
  setPhase('states:error');
  const errorAttempt = await page.evaluate(() => {
    const candidates = ['audio', '#audio', '#audioEl', '#scoreAudio', '#bgm', '#audioPlayer', '[data-role="audio"]'];
    let el = null;
    let used = null;
    for (const sel of candidates) {
      const found = document.querySelector(sel);
      if (found) {
        el = found;
        used = sel;
        break;
      }
    }
    if (!el) return { ok: false, reason: '页面里没有 audio 元素' };
    el.setAttribute('src', './assets/__audit-missing-audio__.m4a');
    try {
      el.load?.();
    } catch {
      /* 某些实现没有 load() */
    }
    return { ok: true, used };
  });
  await sleep(1000);
  await shoot(
    'error',
    `错误态（把 audio src 指向不存在的文件${errorAttempt.used ? `，命中 ${errorAttempt.used}` : ''}）`,
    { attempt: errorAttempt },
  );
  recorder.add(
    scope,
    'ST-error-trigger',
    '错误态可被触发（audio src 指向缺失文件）',
    errorAttempt.ok === true,
    '找到 audio 元素并改写 src',
    errorAttempt.ok ? errorAttempt.used : errorAttempt.reason ?? 'N/A',
  );

  // 结束态：把时间推到 150s。
  setPhase('states:ended');
  await page.evaluate(() => {
    try {
      window.CriedWolf?.renderAt?.(150);
    } catch {
      /* 忽略 */
    }
  });
  await sleep(300);
  const endState = await page.evaluate(() => {
    try {
      return window.CriedWolf?.getState?.() ?? null;
    } catch {
      return null;
    }
  });
  await shoot('ended', '结束态（renderAt(150)）', { state: endState });

  // 空态：阻断音轨，媒体无法加载时的界面。
  setPhase('states:empty');
  try {
    let aborted = false;
    try {
      await page.route('**/assets/score.m4a', (route) => route.abort());
      aborted = true;
    } catch {
      aborted = false;
    }
    await page.reload({ waitUntil: 'load' });
    await sleep(900);
    await shoot(
      'empty',
      aborted
        ? '空/阻断态（音轨请求被 abort）'
        : '空/阻断态（音轨为内联 data: URI，无法用网络阻断制造；截当前界面）',
      { mechanism: aborted ? 'route-abort' : 'inline-data-uri' },
    );
    if (aborted) await page.unroute('**/assets/score.m4a');
    await page.reload({ waitUntil: 'load' });
    await sleep(600);
  } catch (err) {
    states.push({ name: 'empty', note: `无法制造空态：${err?.message ?? err}` });
    recorder.add(scope, 'ST-empty', '状态截图 state-empty.png', false, '截图存在', 'N/A', String(err?.message ?? err));
  }

  return states;
}

/** 对一个变体（多文件 / 单文件）跑完整套检查。 */
async function auditVariant({ scope, url, browser, server, shotsDir, withShotFrames, recorder }) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    reducedMotion: 'no-preference',
  });
  await context.addInitScript(CLS_INIT);

  const stats = {
    totalRequests: 0,
    externalRequests: 0,
    externalList: [],
    ignoredDataOrBlob: 0,
    localRequests: 0,
    consoleErrors: [],
    pageErrors: [],
    abortedByRoute: 0,
    faviconHandled: false,
  };
  let currentPhase = 'load';
  const setPhase = (phase) => {
    currentPhase = phase;
  };

  await context.route('**/*', async (route) => {
    const requestUrl = route.request().url();
    if (requestUrl.startsWith('data:') || requestUrl.startsWith('blob:') || requestUrl.startsWith('file:')) {
      await route.continue().catch(() => {});
      return;
    }
    if (requestUrl.endsWith('/favicon.ico')) {
      // 白名单不含 favicon，本地应答 204，避免 404 在 console 里制造噪声
      stats.faviconHandled = true;
      await route.fulfill({ status: 204, body: '' }).catch(() => {});
      return;
    }
    const kind = classifyUrl(requestUrl);
    if (kind === 'external') {
      stats.abortedByRoute += 1;
      await route.abort().catch(() => {});
      return;
    }
    await route.continue().catch(() => {});
  });

  const page = await context.newPage();
  page.on('request', (req) => {
    const kind = classifyUrl(req.url());
    if (kind === 'ignored') {
      stats.ignoredDataOrBlob += 1;
      return;
    }
    stats.totalRequests += 1;
    if (kind === 'external') {
      stats.externalRequests += 1;
      stats.externalList.push(req.url());
    } else {
      stats.localRequests += 1;
    }
  });
  page.on('console', (msg) => {
    if (msg.type() === 'error') stats.consoleErrors.push({ text: msg.text(), phase: currentPhase });
  });
  page.on('pageerror', (err) => stats.pageErrors.push({ message: err?.message ?? String(err), phase: currentPhase }));

  const result = { scope, url, shotsDir: path.relative(REPO_ROOT, shotsDir) };

  await page.goto(url, { waitUntil: 'load' });
  await sleep(500);

  const apiReady = await page.evaluate(
    () => typeof window.CriedWolf?.seekFrame === 'function' && typeof window.CriedWolf?.getState === 'function',
  );
  recorder.add(scope, 'API-1', '页面暴露 window.CriedWolf 契约 API', apiReady, 'seekFrame/getState 可用', apiReady ? '可用' : '缺失');

  // --- 响应式 ---
  setPhase('responsive');
  const responsive = [];
  for (const width of WIDTHS) {
    responsive.push(await checkResponsive(page, recorder, scope, width));
    const file = path.join(shotsDir, `width-${width}.png`);
    await page.screenshot({ path: file });
  }
  result.responsive = responsive.map((r) => ({
    width: r.width,
    height: r.height,
    scrollWidth: r.scrollWidth,
    clientWidth: r.clientWidth,
    missing: r.missing,
    rects: r.rects,
    screenshot: path.relative(REPO_ROOT, path.join(shotsDir, `width-${r.width}.png`)),
  }));

  await page.setViewportSize(VIEWPORT);
  await sleep(200);

  // --- 分镜代表帧（仅多文件版） ---
  if (withShotFrames) {
    setPhase('shots');
    result.shotFrames = await auditShotFrames(page, recorder, scope);
    await page.evaluate(() => {
      try {
        window.CriedWolf?.setExportMode?.(false);
      } catch {
        /* 忽略 */
      }
    });
    await sleep(150);
  }

  // --- 帧连续性 ---
  setPhase('continuity');
  result.continuity = await auditContinuity(page, recorder, scope);

  // --- 性能 ---
  setPhase('performance');
  result.performance = await auditPerformance(page, recorder, scope);

  // --- 键盘 / 无障碍 ---
  setPhase('a11y');
  result.keyboard = await auditKeyboard(page, recorder, scope);
  result.zoom200 = await auditZoom(page, recorder, scope, shotsDir);

  // --- 四态 ---
  result.states = await auditStates(page, recorder, scope, shotsDir, setPhase);

  // --- 网络与错误汇总 ---
  const injectedErrors = stats.consoleErrors.filter((e) => AUDIT_INJECTED_PHASES.has(e.phase));
  const appErrors = stats.consoleErrors.filter((e) => !AUDIT_INJECTED_PHASES.has(e.phase));
  recorder.add(
    scope,
    'N-external',
    '外部网络请求数 = 0',
    stats.externalRequests === 0,
    0,
    stats.externalRequests,
    stats.externalList.length ? JSON.stringify(stats.externalList.slice(0, 5)) : '',
  );
  recorder.add(
    scope,
    'N-console',
    "console 中 type==='error' 的条数 = 0（不含审计自身注入的媒体故障阶段）",
    appErrors.length === 0,
    0,
    appErrors.length,
    appErrors.length ? JSON.stringify(appErrors.slice(0, 5)) : '',
  );
  recorder.add(
    scope,
    'N-console-injected',
    '审计注入阶段的 console error 单独计数（不计入判定）',
    null,
    '仅记录',
    injectedErrors.length,
    `注入阶段：${[...AUDIT_INJECTED_PHASES].join(', ')}；样本 ${JSON.stringify(injectedErrors.slice(0, 5))}`,
  );
  recorder.add(scope, 'N-pageerror', 'pageerror 条数 = 0', stats.pageErrors.length === 0, 0, stats.pageErrors.length, stats.pageErrors.length ? JSON.stringify(stats.pageErrors.slice(0, 5)) : '');

  result.network = {
    totalRequests: stats.totalRequests,
    localRequests: stats.localRequests,
    externalRequests: stats.externalRequests,
    externalList: stats.externalList,
    dataOrBlobIgnored: stats.ignoredDataOrBlob,
    abortedByRoute: stats.abortedByRoute,
    faviconHandledLocally: stats.faviconHandled,
    consoleErrors: stats.consoleErrors,
    consoleErrorsExcludingAuditInjected: appErrors.length,
    consoleErrorsFromAuditInjectedPhases: injectedErrors,
    pageErrors: stats.pageErrors,
  };

  await context.close();
  return result;
}

async function main() {
  fs.mkdirSync(SHOTS_DIR, { recursive: true });
  fs.mkdirSync(SINGLE_SHOTS_DIR, { recursive: true });

  const recorder = new Recorder();
  const distDir = path.join(REPO_ROOT, 'dist');
  const singlePath = path.join(distDir, 'single.html');
  const indexPath = path.join(distDir, 'index.html');

  const missing = [];
  if (!fs.existsSync(indexPath)) missing.push(indexPath);
  if (!fs.existsSync(singlePath)) missing.push(singlePath);
  if (missing.length > 0) {
    process.stderr.write(`[audit] 失败：缺少构建产物：\n${missing.map((m) => `  - ${m}`).join('\n')}\n`);
    process.stderr.write('[audit] 请先运行 node scripts/build.mjs 生成 dist/。\n');
    process.exit(1);
  }

  const server = await startServer({ port: 0, root: distDir, quiet: true });
  process.stdout.write(`[audit] 本机服务器：${server.url}\n`);

  const browser = await chromium.launch({ headless: true });
  const variants = {};
  try {
    const multiFrom = recorder.checks.length;
    variants.multi = await auditVariant({
      scope: 'multi',
      url: server.url,
      browser,
      server,
      shotsDir: SHOTS_DIR,
      withShotFrames: true,
      recorder,
    });
    variants.multi.checks = recorder.checks.slice(multiFrom);

    const singleFrom = recorder.checks.length;
    variants.single = await auditVariant({
      scope: 'single',
      url: pathToFileURL(singlePath).href,
      browser,
      server,
      shotsDir: SINGLE_SHOTS_DIR,
      withShotFrames: false,
      recorder,
    });
    variants.single.checks = recorder.checks.slice(singleFrom);

    // reduced-motion 变体：单独开一个 reduce 上下文。
    const rmContext = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: 1,
      colorScheme: 'dark',
      reducedMotion: 'reduce',
    });
    const rmPage = await rmContext.newPage();
    const rmErrors = [];
    rmPage.on('pageerror', (err) => rmErrors.push(err?.message ?? String(err)));
    await rmPage.goto(server.url, { waitUntil: 'load' });
    await sleep(700);
    const rmFile = path.join(SHOTS_DIR, 'reduced-motion.png');
    await rmPage.screenshot({ path: rmFile });
    const rmBuf = fs.readFileSync(rmFile);
    variants.reducedMotion = {
      file: path.relative(REPO_ROOT, rmFile),
      hash: md5(rmBuf),
      pageErrors: rmErrors,
    };
    recorder.add(
      'multi',
      'RM-1',
      'prefers-reduced-motion: reduce 上下文可渲染且无 pageerror',
      rmErrors.length === 0,
      '0 个 pageerror',
      rmErrors.length,
      path.relative(REPO_ROOT, rmFile),
    );
    await rmContext.close();
  } catch (err) {
    process.stderr.write(`[audit] 运行异常：${err?.stack ?? err}\n`);
    await browser.close().catch(() => {});
    await server.close().catch(() => {});
    process.exit(1);
  }
  await browser.close();
  await server.close();

  // 汇总所有检查：recorder 是各变体共用的，variants[*].checks 只是同一批记录的切片。
  const allChecks = recorder.checks;
  const passed = allChecks.filter((c) => c.status === 'PASS').length;
  const failed = allChecks.filter((c) => c.status === 'FAIL');
  const na = allChecks.filter((c) => c.status === 'NA').length;

  const report = {
    generatedAt: new Date().toISOString(),
    environment: {
      node: process.version,
      platform: `${process.platform} ${process.arch}`,
      playwright: '1.64.1',
      browser: 'chromium (headless)',
    },
    variants,
    checks: allChecks,
    summary: {
      total: allChecks.length,
      passed,
      failed: failed.length,
      na,
      exitCode: failed.length > 0 ? 1 : 0,
    },
  };
  const reportPath = path.join(REPORTS_DIR, 'browser-audit.json');
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  process.stdout.write(`[audit] 报告已写入 ${reportPath}\n`);

  process.stdout.write(`[audit] 汇总：共 ${allChecks.length} 条检查，PASS ${passed}，FAIL ${failed.length}，NA ${na}\n`);
  if (failed.length > 0) {
    process.stdout.write('[audit] FAIL 明细：\n');
    for (const f of failed) {
      process.stdout.write(`[audit]   - [${f.scope}] ${f.id} ${f.name}｜期望 ${JSON.stringify(f.expected)}｜实际 ${JSON.stringify(f.actual)}\n`);
    }
    process.exit(1);
  }
  process.stdout.write('[audit] 全部通过\n');
  process.exit(0);
}

main().catch((err) => {
  process.stderr.write(`[audit] 未捕获异常：${err?.stack ?? err}\n`);
  process.exit(1);
});
