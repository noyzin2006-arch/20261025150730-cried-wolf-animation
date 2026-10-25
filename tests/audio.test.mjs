/*
 * tests/audio.test.mjs —— 原创音轨的硬断言（读真实 WAV 字节）。
 *
 * 关键项：采样点数、强制静默区间必须逐点为 0、峰值上限、关键音效时刻非零。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const story = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'story.json'), 'utf8'));
const SR = story.meta.sampleRate;
const TOTAL = story.meta.totalDuration;

const wavPath = [path.join(ROOT, '.cache', 'score.wav'), path.join(ROOT, 'dist', 'assets', 'score.wav')]
  .find((p) => fs.existsSync(p));
const m4aPath = path.join(ROOT, 'dist', 'assets', 'score.m4a');

let buf = null;
let samples = null;
if (wavPath) {
  buf = fs.readFileSync(wavPath);
  samples = new Int16Array(buf.buffer, buf.byteOffset + 44, Math.floor((buf.length - 44) / 2));
}

function peakDbfs(slice) {
  let peak = 0;
  for (let i = 0; i < slice.length; i++) {
    const v = Math.abs(slice[i]);
    if (v > peak) peak = v;
  }
  return peak === 0 ? -Infinity : 20 * Math.log10(peak / 32768);
}

test('音轨文件已生成', () => {
  assert.ok(wavPath, '找不到 score.wav（先运行 npm run build）');
  assert.ok(fs.existsSync(m4aPath), '找不到 dist/assets/score.m4a（先运行 npm run build）');
});

test('WAV 头合法：RIFF/WAVE、单声道、48kHz、16bit', () => {
  assert.equal(buf.toString('ascii', 0, 4), 'RIFF');
  assert.equal(buf.toString('ascii', 8, 12), 'WAVE');
  assert.equal(buf.toString('ascii', 12, 16), 'fmt ');
  const channels = buf.readUInt16LE(22);
  const sampleRate = buf.readUInt32LE(24);
  const bits = buf.readUInt16LE(34);
  assert.equal(channels, 1);
  assert.equal(sampleRate, SR);
  assert.equal(bits, 16);
});

test('采样点数精确等于 150 秒', () => {
  assert.equal(samples.length, TOTAL * SR);
});

test('119.5–123.5 秒的强制静默区间逐点严格为 0', () => {
  const from = Math.round(119.5 * SR);
  const to = Math.round(123.5 * SR);
  let nonZero = 0;
  for (let i = from; i < to; i++) if (samples[i] !== 0) nonZero++;
  assert.equal(nonZero, 0, `静默区间内有 ${nonZero} 个非零采样`);
});

test('「停一拍」区间同样严格为 0', () => {
  for (const ev of story.soundEvents.filter((e) => e.type === 'rest')) {
    const from = Math.round(ev.at * SR);
    const to = Math.round((ev.at + ev.dur) * SR);
    let nonZero = 0;
    for (let i = from; i < to; i++) if (samples[i] !== 0) nonZero++;
    assert.equal(nonZero, 0, `${ev.id} 区间内有 ${nonZero} 个非零采样`);
  }
});

test('整体峰值不超过 -1.4 dBFS（不削顶）', () => {
  const db = peakDbfs(samples);
  assert.ok(db <= -1.4, `峰值 ${db.toFixed(2)} dBFS，超过 -1.4`);
  assert.ok(db > -6, `峰值 ${db.toFixed(2)} dBFS，异常偏低`);
});

test('首尾采样点为 0（8ms 淡入淡出，无 click）', () => {
  assert.equal(samples[0], 0);
  assert.equal(samples[samples.length - 1], 0);
});

test('三声呼喊与狼嚎所在区间必须非零', () => {
  const probes = [
    ['第一声呼喊', 29.1],
    ['第二声呼喊', 73.2],
    ['第三声呼喊', 113.1],
    ['狼嚎', 133.6],
    ['孤立羊铃', 137.1],
    ['开场主题', 1.5]
  ];
  for (const [label, t] of probes) {
    const from = Math.round((t - 0.25) * SR);
    const to = Math.round((t + 0.25) * SR);
    let energy = 0;
    for (let i = from; i < to && i < samples.length; i++) energy += Math.abs(samples[i]);
    assert.ok(energy > 0, `${label}（${t}s）附近没有声音`);
  }
});

test('声音事件的时间点都落在真实音轨范围内', () => {
  for (const e of story.soundEvents) {
    assert.ok(e.at >= 0 && e.at < TOTAL, `${e.id} 起点越界`);
    /* 风床是持续层，允许声明得比片长长（渲染时按片长裁切）；一次性音效不得越界 */
    if (e.type !== 'wind') {
      assert.ok(e.at + e.dur <= TOTAL + 0.001, `${e.id} 事件尾部超出片长`);
    }
  }
});

test('M4A 存在且非空', () => {
  const size = fs.statSync(m4aPath).size;
  assert.ok(size > 100000, `M4A 只有 ${size} 字节，可能没生成成功`);
});
