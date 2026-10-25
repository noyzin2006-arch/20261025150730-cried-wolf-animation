/*
 * tests/timeline.test.mjs —— 时间线内核的纯函数断言。
 *
 * 这些函数不碰 DOM、不读时钟、不用随机数：同一 t 必然给出同一结果，
 * 这是「逐帧确定性导出」的地基。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const TL = require(path.join(ROOT, 'src', 'timeline.js'));

test('常量与片长一致', () => {
  assert.equal(TL.TOTAL, 150);
  assert.equal(TL.FPS, 30);
  assert.equal(TL.FRAMES, 4500);
});

test('ease01 是单调 smoothstep，且端点精确', () => {
  assert.equal(TL.ease01(0), 0);
  assert.equal(TL.ease01(1), 1);
  assert.equal(TL.ease01(0.5), 0.5);
  assert.ok(TL.ease01(0.2) < 0.2, 'smoothstep 在前半段应慢于线性');
  assert.ok(TL.ease01(0.8) > 0.8, 'smoothstep 在后半段应快于线性');
  assert.equal(TL.ease01(-5), 0, '越界应收敛');
  assert.equal(TL.ease01(9), 1);
});

test('normalizeTime：非有限数归零、负数夹到 0、超长夹到片尾', () => {
  assert.equal(TL.normalizeTime(NaN), 0, '非有限数一律归零');
  assert.equal(TL.normalizeTime(Infinity), 0, '非有限数一律归零');
  assert.equal(TL.normalizeTime(-Infinity), 0);
  assert.equal(TL.normalizeTime(-3), 0);
  assert.equal(TL.normalizeTime(42.5), 42.5);
  assert.equal(TL.normalizeTime(1000), 150);
});

test('帧与秒互转精确', () => {
  assert.equal(TL.frameToTime(0), 0);
  assert.equal(TL.frameToTime(1499), 1499 / 30);
  assert.equal(TL.timeToFrame(0), 0);
  assert.equal(TL.timeToFrame(1), 30);
  assert.equal(TL.timeToFrame(149.9666), 4499);
  assert.equal(TL.timeToFrame(1000), 4499, '越界帧号夹到最后有效帧');
});

test('sampleKeys：区间内线性插值，区间外取端点', () => {
  const keys = [
    { t: 0, x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, pose: 'a' },
    { t: 10, x: 100, y: 50, scale: 2, rotation: 90, opacity: 0, pose: 'b' }
  ];
  const mid = TL.sampleKeys(keys, 5, false);
  assert.equal(mid.x, 50);
  assert.equal(mid.y, 25);
  assert.equal(mid.scale, 1.5);
  assert.equal(mid.opacity, 0.5);
  assert.equal(mid.pose, 'a', '姿态是离散量，取区间起始姿态');

  const eased = TL.sampleKeys(keys, 5, true);
  assert.equal(eased.x, 50, 'smoothstep 在中点仍等于线性中点');

  const before = TL.sampleKeys(keys, -5, false);
  assert.equal(before.x, 0);
  const after = TL.sampleKeys(keys, 99, false);
  assert.equal(after.x, 100);
});

test('sampleKeys：空序列返回 null，单键序列返回该键', () => {
  assert.equal(TL.sampleKeys([], 1, false), null);
  const one = TL.sampleKeys([{ t: 0, x: 7, y: 8, scale: 1, rotation: 0, opacity: 1, pose: 'p' }], 5, false);
  assert.equal(one.x, 7);
  assert.equal(one.pose, 'p');
});

test('shotIndexAt：半开区间，边界归下一镜', () => {
  assert.equal(TL.shotIndexAt(0), 0);
  assert.equal(TL.shotIndexAt(7.999), 0);
  assert.equal(TL.shotIndexAt(8), 1);
  assert.equal(TL.shotIndexAt(27.999), 2);
  assert.equal(TL.shotIndexAt(28), 3);
  assert.equal(TL.shotIndexAt(149.999), 14);
  assert.equal(TL.shotIndexAt(150), 14);
});

test('captionAt：只在 cue 区间内返回文字，并给出淡入淡出不透明度', () => {
  const before = TL.captionAt(1);
  assert.equal(before.text, '');
  const inside = TL.captionAt(4);
  assert.ok(inside.text.length > 0);
  assert.ok(inside.opacity > 0 && inside.opacity <= 1);
  const edge = TL.captionAt(3);
  assert.ok(edge.opacity < 1, '刚入场的字幕不透明度应小于 1');
  const after = TL.captionAt(7.6);
  assert.equal(after.text, '', '字幕结束后不残留');
});

test('片尾字幕标记 hideOverlay 时不占用底部字幕带', () => {
  const cap = TL.captionAt(145);
  assert.equal(cap.overlay, false);
  assert.ok(cap.opacity === 0);
});

test('transitionOpacity：叠化区间内前镜淡出、后镜淡入，其余为单镜', () => {
  const plain = TL.transitionOpacity(12);
  assert.equal(plain.prevIndex, -1);
  assert.equal(plain.opacity, 1);

  const fade = TL.transitionOpacity(7.7);
  assert.equal(fade.prevIndex, 0, '叠化时旧镜应当是镜 01');
  assert.equal(fade.index, 1, '叠化时新镜应当是镜 02');
  assert.ok(Math.abs(fade.prevOpacity + fade.opacity - 1) < 1e-9);
  assert.ok(fade.opacity > 0 && fade.opacity < 1);
});

test('章节：五个叙事段落，每段可定位到镜头', () => {
  const chapters = TL.chapterShots();
  assert.equal(chapters.length, 5);
  assert.deepEqual(chapters.map((c) => c.section), ['序章', '第一次谎言', '第二次谎言', '真狼', '尾声']);
  for (const c of chapters) {
    const shot = TL.shots()[c.shotIndex];
    assert.equal(shot.section, c.section);
  }
});

test('formatTime 输出 mm:ss', () => {
  assert.equal(TL.formatTime(0), '00:00');
  assert.equal(TL.formatTime(61), '01:01');
  assert.equal(TL.formatTime(150), '02:30');
});

test('确定性：同一 t 重复采样结果完全一致', () => {
  const shots = TL.shots();
  for (const t of [1.5, 12.25, 29.1, 43.75, 97.3, 113.05, 145.9]) {
    const a = TL.sampleKeys(shots[TL.shotIndexAt(t)].camera, t, true);
    const b = TL.sampleKeys(shots[TL.shotIndexAt(t)].camera, t, true);
    assert.deepEqual(a, b);
    assert.equal(TL.captionAt(t).text, TL.captionAt(t).text);
  }
});
