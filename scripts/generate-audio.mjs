#!/usr/bin/env node
/**
 * 《狼来了｜回声的代价》—— 原创程序化音频合成脚本
 *
 * 输入：data/story.json（唯一真源）
 * 输出：
 *   dist/assets/score.wav —— 48,000 Hz / 单声道 / 16-bit PCM (little-endian) / 恰好 7,200,000 采样点 (150.000 s)
 *   dist/assets/score.m4a —— 由上面的 WAV 经 ffmpeg 转成 AAC-LC 128kbps / 48kHz / mono
 *
 * 硬性约束：
 *   1. 全程 float32 混音，最后统一量化写 16-bit；
 *   2. 峰值用「真实峰值」归一到 -1.5 dBFS；
 *   3. 波形首尾各 8ms 淡入淡出，防 click；
 *   4. type="silence" 的区间，PCM 采样点必须「精确等于 0」（不是极小值）；
 *   5. 完全确定性：禁止 Math.random()，噪声一律用定种子的线性同余发生器 (LCG)；
 *   6. gain 是 dBFS，先转线性幅度 10 ** (gain / 20)。
 *
 * 用法：
 *   node scripts/generate-audio.mjs
 *   import { generateAudio } from './scripts/generate-audio.mjs'; await generateAudio({});
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

/* ========================================================================== *
 * 关键常量
 * ========================================================================== */

const SAMPLE_RATE = 48000;                       // 输出采样率 (Hz)
const TOTAL_SECONDS = 150;                       // 成片总时长 (s)
const TOTAL_SAMPLES = SAMPLE_RATE * TOTAL_SECONDS; // 7,200,000 个采样点
const NOISE_SEED = 20261025;                     // 噪声 LCG 种子（固定 → 逐字节可复现）
const TARGET_PEAK_DB = -1.5;                     // 峰值归一化目标 (dBFS)
const FADE_SEC = 0.008;                          // 首尾淡入淡出时长 (8 ms)
const MUSIC_BELOW_SFX_DB = 11;                   // 音乐床比音效低 11 dB（落在规格要求的 8–14 dB 区间内）
const FFMPEG = 'ffmpeg';                         // ffmpeg 可执行文件（PATH 中）

const TAU = Math.PI * 2;
const SR = SAMPLE_RATE;

/* ========================================================================== *
 * 基础工具
 * ========================================================================== */

/** dBFS → 线性幅度 */
const dbToLin = (db) => Math.pow(10, db / 20);

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/** 平滑阶跃 (smoothstep)，用于包络与频率轨迹 */
function smoothstep(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

/**
 * 定种子的线性同余发生器（LCG）。
 * s = (s * 1664525 + 1013904223) mod 2^32，取低 16 位映射到 [-1, 1]。
 * 绝不使用 Math.random()，保证两次运行结果逐字节一致。
 */
function makeRng(seed) {
  let s = seed >>> 0;
  return function next() {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return (s & 0xffff) / 32767.5 - 1; // 低 16 位 → [-1, 1]
  };
}

/** FNV-1a 字符串哈希 → 与固定种子混合，得到每个事件独立的确定性噪声流 */
function hashSeed(str, salt = NOISE_SEED) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < String(str).length; i++) {
    h ^= String(str).charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return (h ^ salt) >>> 0;
}

/** 一阶低通滤波系数 */
const lowpassCoef = (fc, sr = SR) => 1 - Math.exp((-TAU * fc) / sr);

/** 计算缓冲区真实峰值 */
function peakOf(buf) {
  let p = 0;
  for (let i = 0; i < buf.length; i++) {
    const a = buf[i] < 0 ? -buf[i] : buf[i];
    if (a > p) p = a;
  }
  return p;
}

/** 把缓冲区峰值归一到 1（用于「噪声类」事件：让 gain 精确代表该事件的峰值电平） */
function normalizePeak(buf) {
  const p = peakOf(buf);
  if (p > 0) {
    const k = 1 / p;
    for (let i = 0; i < buf.length; i++) buf[i] *= k;
  }
  return buf;
}

/** 把一段信号叠加进总线 */
function addInto(bus, start, chunk) {
  const n = Math.min(chunk.length, bus.length - start);
  for (let i = 0; i < n; i++) bus[start + i] += chunk[i];
}

/** 攻击/释放斜坡（线性，毫秒级） */
const attackRamp = (t, sec) => clamp(t / sec, 0, 1);
const releaseRamp = (t, total, sec) => clamp((total - t) / sec, 0, 1);

/* ========================================================================== *
 * 滤波器工具
 * ========================================================================== */

/** RBJ cookbook 带通双二阶（用于扫频与窄带敲击） */
function makeBandpass(fc, Q) {
  const f = {
    b0: 0, b1: 0, b2: 0, a1: 0, a2: 0,
    x1: 0, x2: 0, y1: 0, y2: 0,
  };
  const set = (nfc, nQ) => {
    const w0 = (TAU * nfc) / SR;
    const alpha = Math.sin(w0) / (2 * nQ);
    const cw = Math.cos(w0);
    const a0 = 1 + alpha;
    f.b0 = alpha / a0;
    f.b1 = 0;
    f.b2 = -alpha / a0;
    f.a1 = (-2 * cw) / a0;
    f.a2 = (1 - alpha) / a0;
  };
  set(fc, Q);
  f.set = set;
  f.step = (x) => {
    const y = f.b0 * x + f.b1 * f.x1 + f.b2 * f.x2 - f.a1 * f.y1 - f.a2 * f.y2;
    f.x2 = f.x1; f.x1 = x;
    f.y2 = f.y1; f.y1 = y;
    return y;
  };
  return f;
}

/* ========================================================================== *
 * 音效合成器（每个函数返回长度为 n 的 float32 片段）
 * ========================================================================== */

/**
 * wind —— 连续风床：白噪 → 一阶低通（两层：风声 + 低频「体」）
 * fade = 淡入秒数；多个 wind 事件叠加。
 */
function synthWind(ev, n, rng) {
  const out = new Float32Array(n);
  const aFast = lowpassCoef(620);   // 风声主体截止频率
  const aSlow = lowpassCoef(115);   // 低频「体」
  let fast = 0, slow = 0;
  const gustPhase1 = rng() * TAU;
  const gustPhase2 = rng() * TAU;
  const fadeIn = Math.max(0.05, ev.fade ?? 0.5);
  const fadeOut = Math.min(1.5, ev.dur / 4);
  const durSec = ev.dur;

  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const w = rng();
    fast += aFast * (w - fast);
    slow += aSlow * (w - slow);
    // 阵风起伏：两个极慢的拍频叠加
    const gust =
      0.70 +
      0.18 * Math.sin(TAU * 0.07 * t + gustPhase1) +
      0.12 * Math.sin(TAU * 0.23 * t + gustPhase2);
    let e = gust;
    if (t < fadeIn) e *= attackRamp(t, fadeIn);
    const tail = durSec - t;
    if (tail < fadeOut) e *= clamp(tail / fadeOut, 0, 1);
    out[i] = (fast * 0.8 + slow * 1.5) * e;
  }
  return normalizePeak(out);
}

/**
 * bell —— 羊铃：620 + 1240 + 1860 Hz 正弦叠加，指数衰减尾音。
 * muted:true → 衰减更快、高次谐波更弱、整体更弱。
 */
function synthBell(ev, n, rng) {
  const out = new Float32Array(n);
  const muted = !!ev.muted;
  const parts = muted
    ? [[620, 1.0], [1240, 0.14], [1860, 0.05]]
    : [[620, 1.0], [1240, 0.50], [1860, 0.28]];
  const tau = muted ? ev.dur / 9 : ev.dur / 4.6; // 静音版衰减更快
  const durSec = ev.dur;

  for (let i = 0; i < n; i++) {
    const t = i / SR;
    // 极短攻击（防 click）+ 指数衰减
    const e = attackRamp(t, 0.004) * Math.exp(-t / tau) * releaseRamp(t, durSec, 0.02);
    let s = 0;
    for (const [f, a] of parts) s += Math.sin(TAU * f * t) * a;
    out[i] = s * e;
  }
  return normalizePeak(out);
}

/**
 * theme —— D4-F4-A4 三音（293.66 / 349.23 / 440），时长取 music.themeDurations。
 * semitone：整体降半音数；octave：-1 = 低八度；decay:true → 加长衰减 + 逐音减弱。
 */
function synthTheme(ev, n, rng, music) {
  const out = new Float32Array(n);
  const semis = (ev.semitone || 0) + 12 * (ev.octave || 0);
  const scale = Math.pow(2, semis / 12);
  const freqs = music.theme;
  const durs = music.themeDurations;
  const base = durs.reduce((a, b) => a + b, 0);      // 0.3 + 0.3 + 0.6 = 1.2 s
  const k = ev.dur / base;                            // 缩放到事件时长
  const decayMode = !!ev.decay;
  const tau = Math.max(0.8, ev.dur * 0.55);           // decay 模式的长尾时间常数
  let cursor = 0;

  for (let i = 0; i < freqs.length; i++) {
    const f = freqs[i] * scale;
    const noteLen = Math.round(durs[i] * k * SR);
    // 逐音减弱（decay 模式）
    const amp = decayMode ? Math.pow(0.78, i) : 1;
    const renderLen = decayMode
      ? Math.min(n - cursor, Math.round(noteLen * 3))
      : Math.min(n - cursor, noteLen);
    for (let j = 0; j < renderLen; j++) {
      const t = j / SR;
      let e = 1;
      if (decayMode) {
        e = Math.exp(-t / tau);
      } else {
        e = attackRamp(t, 0.008) * releaseRamp(t, noteLen / SR, 0.05);
      }
      // 纯净的单音 + 极弱的二次谐波（避免过于电子）
      const s = Math.sin(TAU * f * t) + 0.12 * Math.sin(TAU * 2 * f * t);
      out[cursor + j] += s * e * amp;
    }
    cursor += noteLen;
  }
  return normalizePeak(out);
}

/** bird —— 两声短促鸟鸣：高频正弦 + 快速频率滑音 */
function synthBird(ev, n, rng) {
  const out = new Float32Array(n);
  const totalSec = ev.dur;
  const chirpSec = Math.min(0.16, totalSec / 5);
  const gapSec = Math.max(0.02, (totalSec - 2 * chirpSec) / 3);
  const base = 3100 + rng() * 500;

  for (let c = 0; c < 2; c++) {
    const start = Math.round((c * (chirpSec + gapSec)) * SR);
    const len = Math.round(chirpSec * SR);
    let phase = 0; // 累加相位：滑音必须靠相位累加实现，否则 f(t)·t 会额外引入 t·f'(t)
    for (let j = 0; j < len && start + j < n; j++) {
      const u = j / len;
      const t = j / SR;
      // 频率先上滑再下滑
      const f = base * (1 + 0.30 * Math.sin(Math.PI * u));
      phase += f / SR;
      const e = attackRamp(t, 0.006) * Math.exp(-u * 2.6);
      out[start + j] += Math.sin(TAU * phase) * e;
    }
  }
  return normalizePeak(out);
}

/** chord —— 温暖和声垫：根音 + 音程（半音，相对根音），根音/音程取自 music */
function synthChord(ev, n, rng, music) {
  const out = new Float32Array(n);
  const root = music.chordRoots[ev.chord];
  const intervals = music.chordIntervals[ev.chord];
  const durSec = ev.dur;
  if (root === undefined || !intervals) return out;

  for (const iv of intervals) {
    const f = root * Math.pow(2, iv / 12);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      // 慢起慢落，音色柔和
      const e = attackRamp(t, 0.25) * releaseRamp(t, durSec, 0.45);
      const s = Math.sin(TAU * f * t) + 0.28 * Math.sin(TAU * 2 * f * t) + 0.08 * Math.sin(TAU * 3 * f * t);
      out[i] += s * e;
    }
  }
  return normalizePeak(out);
}

/** string —— 低音弦脉冲：低频三角/锯齿 + 慢包络 */
function synthString(ev, n, rng) {
  const out = new Float32Array(n);
  const f = 110; // 低音弦 A2
  const durSec = ev.dur;
  let phase = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    phase += f / SR;
    if (phase >= 1) phase -= 1;
    // 三角波（略带锯齿味）
    const tri = 4 * Math.abs(phase - 0.5) - 1;
    const saw = 2 * phase - 1;
    const e = attackRamp(t, 0.22) * Math.exp(-t / (durSec * 0.7)) * releaseRamp(t, durSec, 0.12);
    out[i] = (tri * 0.75 + saw * 0.25) * e;
  }
  return normalizePeak(out);
}

/** grass —— 高通噪声短促擦过；总时长夹紧在 0.06–0.14 s */
function synthGrass(ev, n, rng) {
  const durSec = clamp(ev.dur, 0.06, 0.14);
  const len = Math.round(durSec * SR);
  const out = new Float32Array(Math.max(len, 1));
  const a = lowpassCoef(2600);
  let lp = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const w = rng();
    lp += a * (w - lp);
    const hp = w - lp;                    // 一阶高通
    const e = attackRamp(t, 0.003) * Math.exp(-t / (durSec * 0.35));
    out[i] = hp * e;
  }
  return normalizePeak(out);
}

/** inhale —— 吸气：带通噪声快速上扫 */
function synthInhale(ev, n, rng) {
  const out = new Float32Array(n);
  const durSec = ev.dur;
  const bp = makeBandpass(320, 2.4);
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const t = i / SR;
    const fc = 320 + 2300 * smoothstep(u);   // 中心频率快速上扫
    bp.set(fc, 2.4);
    const y = bp.step(rng());
    const e = smoothstep(u / 0.7) * releaseRamp(t, durSec, 0.08);
    out[i] = y * e;
  }
  return normalizePeak(out);
}

/**
 * horn —— 合成双音角号（不是人声）。
 * 基础音型 D4-F4-A4（0.3 / 0.3 / 0.6 s，按事件时长缩放），方波 + 低通 + 轻微颤音；
 * 低八度支撑声形成「双音」质感。
 *   variant "first"  —— 明亮，尾部高次谐波多
 *   variant "second" —— 整体压低 3 个半音 + 一个短促不协和音
 *   variant "third"  —— 叠加减五度（增四/减五）冲突声，更紧张
 */
function synthHorn(ev, n, rng, music) {
  const out = new Float32Array(n);
  const variant = ev.variant || 'first';
  const semis = variant === 'second' ? -3 : 0; // second 变体整体压低 3 个半音
  const scale = Math.pow(2, semis / 12);
  const notes = music.theme.map((f) => f * scale);
  const durs = music.themeDurations;
  const base = durs.reduce((a, b) => a + b, 0);
  const k = ev.dur / base;
  // 亮度：first 最亮，second 最闷，third 居中
  const cutoff = variant === 'first' ? 3200 : variant === 'second' ? 1700 : 2400;
  const a = lowpassCoef(cutoff);
  const vibDepth = 0.006; // 轻微颤音深度
  const vibRate = 5.2;
  let phase = 0;
  let lp = 0;
  let cursor = 0;
  const vibPhase = rng() * TAU;

  const renderNote = (f, start, len, amp) => {
    for (let j = 0; j < len && start + j < n; j++) {
      const t = j / SR;
      // 颤音：调制瞬时频率
      const fv = f * (1 + vibDepth * Math.sin(TAU * vibRate * t + vibPhase));
      phase += fv / SR;
      if (phase >= 1) phase -= 1;
      const sq = phase < 0.5 ? 1 : -1;   // 方波
      lp += a * (sq - lp);              // 低通
      const e = attackRamp(t, 0.035) * releaseRamp(t, len / SR, 0.08);
      out[start + j] += lp * e * amp;
    }
  };

  for (let i = 0; i < notes.length; i++) {
    const len = Math.round(durs[i] * k * SR);
    const start = cursor;
    renderNote(notes[i], start, len, 1.0);            // 主声部
    renderNote(notes[i] * 0.5, start, len, 0.30);      // 低八度支撑 → 双音角号
    cursor += len;
  }

  if (variant === 'second') {
    // 短促不协和音：小二度冲突，出现在开头
    const dissonant = notes[0] * Math.pow(2, 1 / 12);
    const len = Math.round(0.18 * SR);
    for (let j = 0; j < len && j < n; j++) {
      const t = j / SR;
      const e = attackRamp(t, 0.01) * Math.exp(-t / 0.055);
      out[j] += Math.sin(TAU * dissonant * t) * e * 0.42;
    }
  } else if (variant === 'third') {
    // 减五度（增四/减五）冲突叠音，贯穿整句
    const tritone = notes[0] * Math.pow(2, 6 / 12);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      const e = attackRamp(t, 0.06) * releaseRamp(t, ev.dur, 0.2);
      out[i] += Math.sin(TAU * tritone * t) * e * 0.30;
    }
  }
  return normalizePeak(out);
}

/** woodblock —— 短促木鱼击：窄带噪声 + 极快衰减 */
function synthWoodblock(ev, n, rng) {
  const out = new Float32Array(n);
  const bp = makeBandpass(1150, 2.6);
  const bp2 = makeBandpass(2300, 3.0);
  const tau = 0.014;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const w = rng();
    const y = bp.step(w) * 1.0 + bp2.step(w) * 0.45;
    const e = attackRamp(t, 0.0015) * Math.exp(-t / tau);
    out[i] = y * e;
  }
  return normalizePeak(out);
}

/** footsteps —— 噪声脉冲列；rate = 每秒步数；每次脉冲约 80ms 的低频冲击 */
function synthFootsteps(ev, n, rng) {
  const out = new Float32Array(n);
  const rate = ev.rate || 2;
  const stepLen = Math.round(0.08 * SR);
  const count = Math.floor(ev.dur * rate);
  const a = lowpassCoef(300);

  for (let k = 0; k < count; k++) {
    const start = Math.round((k / rate) * SR);
    // 低频冲击（正弦）
    for (let j = 0; j < stepLen && start + j < n; j++) {
      const t = j / SR;
      const e = Math.exp(-t / 0.022);
      out[start + j] += Math.sin(TAU * 85 * t) * e;
    }
    // 噪声层（低通）
    let lp = 0;
    for (let j = 0; j < stepLen && start + j < n; j++) {
      const t = j / SR;
      const e = Math.exp(-t / 0.03);
      lp += a * (rng() - lp);
      out[start + j] += lp * e * 2.6;
    }
  }
  return normalizePeak(out);
}

/** breath —— 低频粉噪气声（Paul Kellett 粉噪近似 + 低通） */
function synthBreath(ev, n, rng) {
  const out = new Float32Array(n);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  const a = lowpassCoef(1400);
  let lp = 0;
  const durSec = ev.dur;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const w = rng();
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856;
    b4 = 0.55 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.016898;
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
    b6 = w * 0.115926;
    lp += a * (pink - lp);
    const e = attackRamp(t, Math.min(0.18, durSec * 0.25)) * releaseRamp(t, durSec, Math.min(0.3, durSec * 0.35));
    out[i] = lp * e;
  }
  return normalizePeak(out);
}

/** laugh —— 木管模仿的两声短促「笑」音（两个快速下滑音，非人声） */
function synthLaugh(ev, n, rng) {
  const out = new Float32Array(n);
  const glideSec = 0.17;
  const a = lowpassCoef(2200);
  let lp = 0;
  const offsets = [0, 0.22];
  const f0s = [780, 720];
  const f1s = [430, 400];

  for (let c = 0; c < 2; c++) {
    const start = Math.round(offsets[c] * SR);
    const len = Math.round(glideSec * SR);
    let phase = 0; // 每次滑音单独累加相位
    for (let j = 0; j < len && start + j < n; j++) {
      const u = j / len;
      const t = j / SR;
      const f = f0s[c] + (f1s[c] - f0s[c]) * smoothstep(u); // 快速下滑
      phase += f / SR;
      if (phase >= 1) phase -= 1;
      const sq = phase < 0.5 ? 1 : -1;                       // 木管式方波
      lp += a * (sq - lp);
      const e = attackRamp(t, 0.012) * (1 - smoothstep(u)) * (0.8 + 0.2 * Math.sin(TAU * 26 * t));
      out[start + j] += lp * e * 0.8;
    }
  }
  return normalizePeak(out);
}

/** bass —— 低音三拍（3 个强拍），正弦低频 */
function synthBass(ev, n, rng) {
  const out = new Float32Array(n);
  const hits = 3;
  const spacing = ev.dur / hits;
  for (let k = 0; k < hits; k++) {
    const start = Math.round(k * spacing * SR);
    const len = Math.min(n - start, Math.round(0.6 * SR));
    let phase = 0; // 累加相位，保证音高下滑轨迹准确
    for (let j = 0; j < len; j++) {
      const t = j / SR;
      const f = 92 - 37 * Math.exp(-t / 0.05); // 快速下坠的低音
      phase += f / SR;
      const e = attackRamp(t, 0.008) * Math.exp(-t / 0.32);
      out[start + j] += Math.sin(TAU * phase) * e;
    }
  }
  return normalizePeak(out);
}

/** knock —— 短促带通敲击（门枢轴 / 门闩） */
function synthKnock(ev, n, rng) {
  const out = new Float32Array(n);
  const hits = ev.dur > 0.5 ? 2 : 1;   // 长事件 = 门枢轴两记
  const offsets = hits === 2 ? [0, 0.22] : [0];
  for (let k = 0; k < hits; k++) {
    const start = Math.round(offsets[k] * SR);
    const bp = makeBandpass(820, 2.2);
    const bpLow = makeBandpass(330, 1.8);
    const len = Math.min(n - start, Math.round(0.18 * SR));
    for (let j = 0; j < len; j++) {
      const t = j / SR;
      const w = rng();
      const y = bp.step(w) * 1.0 + bpLow.step(w) * 0.8;
      const e = attackRamp(t, 0.001) * Math.exp(-t / 0.045);
      out[start + j] += y * e;
    }
  }
  return normalizePeak(out);
}

/**
 * wolf —— 狼嚎：频率滑音 95 → 165 → 112 Hz，加三次谐波。
 * low:true → 更哑更轻（衰减快、低次谐波为主）。
 */
function synthWolf(ev, n, rng) {
  const out = new Float32Array(n);
  const low = !!ev.low;
  const total = ev.dur;
  const tau = low ? total * 0.35 : total * 0.75;
  const harm = low
    ? [[1, 1.0], [2, 0.12], [3, 0.02]]
    : [[1, 1.0], [2, 0.34], [3, 0.17]];

  let phase = 0; // 累加相位：滑音轨迹必须靠相位累加，否则 sin(2π·f(t)·t) 会引入 t·f'(t) 偏差
  for (let i = 0; i < n; i++) {
    const u = i / n;
    const t = i / SR;
    // 95 → 165 → 112 Hz 的两段式滑音
    let f;
    if (u < 0.45) f = 95 + 70 * smoothstep(u / 0.45);
    else f = 165 + (112 - 165) * smoothstep((u - 0.45) / 0.55);
    phase += f / SR;
    const e =
      attackRamp(t, 0.28 * total) *
      Math.exp(-Math.max(0, t - total * 0.45) / tau) *
      releaseRamp(t, total, 0.3 * total);
    let s = 0;
    for (const [mult, amp] of harm) s += Math.sin(TAU * phase * mult) * amp;
    out[i] = s * e;
  }
  return normalizePeak(out);
}

/* ========================================================================== *
 * 事件调度
 * ========================================================================== */

/** 事件类型 → 合成函数（需要 music 的通过第 4 个参数传入） */
function synthEvent(ev, n, rng, music) {
  switch (ev.type) {
    case 'wind': return synthWind(ev, n, rng);
    case 'bell': return synthBell(ev, n, rng);
    case 'theme': return synthTheme(ev, n, rng, music);
    case 'bird': return synthBird(ev, n, rng);
    case 'chord': return synthChord(ev, n, rng, music);
    case 'string': return synthString(ev, n, rng);
    case 'grass': return synthGrass(ev, n, rng);
    case 'inhale': return synthInhale(ev, n, rng);
    case 'horn': return synthHorn(ev, n, rng, music);
    case 'woodblock': return synthWoodblock(ev, n, rng);
    case 'footsteps': return synthFootsteps(ev, n, rng);
    case 'breath': return synthBreath(ev, n, rng);
    case 'laugh': return synthLaugh(ev, n, rng);
    case 'bass': return synthBass(ev, n, rng);
    case 'knock': return synthKnock(ev, n, rng);
    case 'wolf': return synthWolf(ev, n, rng);
    default:
      throw new Error(`未知的音效类型：${ev.type}（事件 id=${ev.id}）`);
  }
}

/**
 * 渲染全部音效事件到 sfx 总线。
 * 同时收集需要「硬静音」的区间（silence / rest）。
 */
function renderSoundEvents(story, sfxBus) {
  const music = story.music;
  const events = story.soundEvents || [];
  const muteRegions = [];

  for (const ev of events) {
    if (ev.type === 'silence' || ev.type === 'rest') {
      // silence / rest → 区间内采样点必须精确为 0（最后统一施加）
      muteRegions.push({ at: ev.at, dur: ev.dur, type: ev.type, id: ev.id });
      continue;
    }
    if (ev.type === 'thin' || ev.type === 'music-out') continue; // 由音乐层处理
    const start = Math.round(ev.at * SR);
    const n = Math.round(ev.dur * SR);
    if (n <= 0 || start >= TOTAL_SAMPLES) continue;
    const rng = makeRng(hashSeed(ev.id));
    const chunk = synthEvent(ev, n, rng, music);
    // gain 是 dBFS → 线性幅度
    const amp = dbToLin(ev.gain ?? 0);
    for (let i = 0; i < chunk.length; i++) chunk[i] *= amp;
    addInto(sfxBus, start, chunk);
  }
  return muteRegions;
}

/* ========================================================================== *
 * 音乐床
 * ========================================================================== */

/** 低频鼓（kick）—— 只用于两次救援段落 */
function synthKick(out, start, amp) {
  const len = Math.round(0.35 * SR);
  let phase = 0; // 累加相位，保证下坠音高准确
  for (let j = 0; j < len && start + j < out.length; j++) {
    const t = j / SR;
    const f = 105 - 58 * Math.exp(-t / 0.035);
    phase += f / SR;
    const e = attackRamp(t, 0.004) * Math.exp(-t / 0.115);
    out[start + j] += Math.sin(TAU * phase) * e * amp;
  }
}

/**
 * 音乐床：按 music.progression 分段，每段 cycle 依次循环，每个和弦占 4 小节（12 s）。
 * 每一拍（0.75 s）一个低频衬底音 + 和弦垫音。
 * 三个配器层：
 *   sub   —— 低频衬底音
 *   pad   —— 和弦垫音（会被 thin 事件「减薄」）
 *   drum  —— 低频鼓（仅前两次救援：约 29–50 s 与 69–90 s）
 */
function buildMusicLayers(story) {
  const music = story.music;
  const events = story.soundEvents || [];
  const sub = new Float32Array(TOTAL_SAMPLES);
  const pad = new Float32Array(TOTAL_SAMPLES);
  const drum = new Float32Array(TOTAL_SAMPLES);

  const beatSec = music.beatSec;
  const chordSec = 4 * music.barSec; // 一个和弦 4 小节 = 12 s
  // 救援窗口（合成低频鼓只在这两段出现）
  const rescueWindows = [[29, 50], [69, 90]];

  for (const seg of music.progression) {
    const from = seg.from;
    const to = seg.to;
    const cycle = seg.cycle;
    const beats = Math.ceil((to - from) / beatSec);
    for (let b = 0; b < beats; b++) {
      const t = from + b * beatSec;
      if (t >= to) break;
      const start = Math.round(t * SR);
      if (start >= TOTAL_SAMPLES) break;

      // 当前和弦
      const chordIdx = Math.floor((t - from) / chordSec) % cycle.length;
      const chordName = cycle[chordIdx];
      const root = music.chordRoots[chordName];
      const intervals = music.chordIntervals[chordName] || [0];

      // --- 低频衬底音 ---
      {
        const f = root / 2;
        const len = Math.min(TOTAL_SAMPLES - start, Math.round(beatSec * 1.4 * SR));
        for (let j = 0; j < len; j++) {
          const tt = j / SR;
          const e = attackRamp(tt, 0.03) * Math.exp(-tt / 0.42);
          sub[start + j] += Math.sin(TAU * f * tt) * e;
        }
      }

      // --- 和弦垫音 ---
      {
        const len = Math.min(TOTAL_SAMPLES - start, Math.round(beatSec * 1.6 * SR));
        for (const iv of intervals) {
          const f = root * Math.pow(2, iv / 12);
          for (let j = 0; j < len; j++) {
            const tt = j / SR;
            const e = attackRamp(tt, 0.3) * releaseRamp(tt, len / SR, 0.45);
            pad[start + j] += Math.sin(TAU * f * tt) * e;
          }
        }
      }

      // --- 低频鼓（仅救援窗口）---
      const inRescue = rescueWindows.some(([a, b2]) => t >= a && t < b2);
      if (inRescue) synthKick(drum, start, 0.9);
    }
  }

  // --- thin 事件：给 pad 层一个增益包络，事件后该层电平下降 ---
  const thinEvents = events.filter((e) => e.type === 'thin');
  for (const ev of thinEvents) {
    const drop = Math.pow(10, Math.abs(ev.gain ?? -6) / 20); // 下降后的电平系数
    const start = Math.round(ev.at * SR);
    const ramp = Math.min(Math.round(1.2 * SR), Math.round((ev.dur / 4) * SR));
    for (let i = 0; i < TOTAL_SAMPLES; i++) {
      let g = 1;
      if (i >= start) {
        g = i < start + ramp ? 1 + (drop - 1) * ((i - start) / ramp) : drop;
      }
      pad[i] *= g;
    }
  }

  return { sub, pad, drum };
}

/**
 * 合成音乐总线：三层混合 → 按「比音效低 11 dB」缩放 → 应用 music-out 淡出。
 */
function buildMusicBus(story, sfxPeak) {
  const { sub, pad, drum } = buildMusicLayers(story);
  const music = new Float32Array(TOTAL_SAMPLES);

  // 各层相对配比（克制，不盖音效）
  const gSub = 0.55;
  const gPad = 0.30;
  const gDrum = 0.55;
  for (let i = 0; i < TOTAL_SAMPLES; i++) {
    music[i] = sub[i] * gSub + pad[i] * gPad + drum[i] * gDrum;
  }

  // 音乐总电平：比音效峰值低 MUSIC_BELOW_SFX_DB dB
  const rawPeak = peakOf(music);
  let scale = 1;
  if (rawPeak > 0 && sfxPeak > 0) {
    const target = sfxPeak * Math.pow(10, -MUSIC_BELOW_SFX_DB / 20);
    scale = target / rawPeak;
  }
  for (let i = 0; i < TOTAL_SAMPLES; i++) music[i] *= scale;

  // --- music-out 事件：从 at 起淡出音乐层，到 at+dur 归零 ---
  const outEvents = (story.soundEvents || []).filter((e) => e.type === 'music-out');
  for (const ev of outEvents) {
    const start = Math.round(ev.at * SR);
    const end = Math.round((ev.at + ev.dur) * SR);
    for (let i = start; i < TOTAL_SAMPLES; i++) {
      if (i >= end) {
        music[i] = 0;
      } else {
        const u = (i - start) / Math.max(1, end - start);
        music[i] *= 1 - smoothstep(u);
      }
    }
  }

  return { bus: music, scale };
}

/* ========================================================================== *
 * 混音 / 归一化 / 编码
 * ========================================================================== */

/** 把 [at, at+dur) 区间的采样点精确置 0 */
function applyMuteRegions(mix, regions) {
  let total = 0;
  const spans = [];
  for (const r of regions) {
    const s = Math.max(0, Math.round(r.at * SR));
    const e = Math.min(mix.length, Math.round((r.at + r.dur) * SR));
    if (e <= s) continue;
    for (let i = s; i < e; i++) mix[i] = 0; // 精确 0，不是极小值
    total += e - s;
    spans.push({ id: r.id, type: r.type, at: r.at, dur: r.dur, samples: e - s });
  }
  return { total, spans };
}

/** 首尾 8ms 淡入淡出（0 乘任何有限标量仍是 0，因此不影响静音段的精确 0） */
function applyFades(mix, fadeSec = FADE_SEC) {
  const n = Math.round(fadeSec * SR);
  for (let i = 0; i < n && i < mix.length; i++) {
    mix[i] *= 0.5 * (1 - Math.cos((Math.PI * i) / n));   // 升余弦淡入
    mix[mix.length - 1 - i] *= 0.5 * (1 - Math.cos((Math.PI * i) / n)); // 升余弦淡出
  }
}

/** float32 → 16-bit PCM（统一量化，little-endian 写出） */
function quantize16(mix, gain) {
  const pcm = new Int16Array(mix.length);
  for (let i = 0; i < mix.length; i++) {
    let v = mix[i] * gain;
    if (v > 1) v = 1;
    else if (v < -1) v = -1;
    pcm[i] = Math.round(v * 32767);
  }
  return pcm;
}

/** 生成标准 RIFF/WAVE 头 + 16-bit 单声道 PCM 数据 */
function encodeWav(pcm, sampleRate) {
  const dataSize = pcm.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0, 'ascii');
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8, 'ascii');
  buf.write('fmt ', 12, 'ascii');
  buf.writeUInt32LE(16, 16);              // fmt chunk size
  buf.writeUInt16LE(1, 20);               // audioFormat = 1 (PCM)
  buf.writeUInt16LE(1, 22);               // numChannels = 1 (mono)
  buf.writeUInt32LE(sampleRate, 24);      // sampleRate
  buf.writeUInt32LE(sampleRate * 2, 28);  // byteRate = sr * blockAlign
  buf.writeUInt16LE(2, 32);               // blockAlign = 2 (16bit mono)
  buf.writeUInt16LE(16, 34);              // bitsPerSample
  buf.write('data', 36, 'ascii');
  buf.writeUInt32LE(dataSize, 40);
  if (os.endianness() === 'BE') {
    for (let i = 0; i < pcm.length; i++) buf.writeInt16LE(pcm[i], 44 + i * 2);
  } else {
    buf.set(Buffer.from(pcm.buffer, pcm.byteOffset, dataSize), 44);
  }
  return buf;
}

/** 调用 ffmpeg 把 WAV 转成 AAC-LC m4a；退出码非 0 立即抛错 */
function encodeM4a(wavPath, m4aPath) {
  const args = [
    '-hide_banner', '-loglevel', 'error', '-y',
    '-i', wavPath,
    '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-ac', '1', '-profile:a', 'aac_low',
    m4aPath,
  ];
  const res = spawnSync(FFMPEG, args, { encoding: 'utf8' });
  if (res.error) throw new Error(`调用 ffmpeg 失败：${res.error.message}`);
  if (res.status !== 0) {
    throw new Error(`ffmpeg 转码失败（退出码 ${res.status}）：\n${res.stderr || ''}`);
  }
  return res.status;
}

/* ========================================================================== *
 * 路径解析
 * ========================================================================== */

/** 从脚本所在目录向上找到含 package.json 的仓库根目录（不依赖 cwd） */
function findRepoRoot(startDir) {
  let dir = startDir;
  for (let i = 0; i < 16; i++) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('未找到仓库根目录（向上查找含 package.json 的目录失败）');
}

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

/* ========================================================================== *
 * 主流程
 * ========================================================================== */

/**
 * 生成配乐 + 音效，写出 score.wav 与 score.m4a。
 * @param {{outWav?:string, outM4a?:string, repoRoot?:string, quiet?:boolean}} opts
 */
export function generateAudio(opts = {}) {
  const repoRoot = opts.repoRoot || findRepoRoot(SCRIPT_DIR);
  const storyPath = path.join(repoRoot, 'data', 'story.json');
  const outWav = opts.outWav || path.join(repoRoot, 'dist', 'assets', 'score.wav');
  const outM4a = opts.outM4a || path.join(repoRoot, 'dist', 'assets', 'score.m4a');
  const quiet = !!opts.quiet;

  const story = JSON.parse(fs.readFileSync(storyPath, 'utf8'));
  const sr = story.meta?.sampleRate || SAMPLE_RATE;
  if (sr !== SAMPLE_RATE) {
    throw new Error(`story.json 的 sampleRate=${sr} 与本脚本预期的 ${SAMPLE_RATE} 不一致`);
  }
  if (story.meta.totalDuration !== TOTAL_SECONDS) {
    throw new Error(`story.json 的 totalDuration=${story.meta.totalDuration} 与预期 ${TOTAL_SECONDS} 不一致`);
  }

  // 1) 音效总线（float32）
  const sfx = new Float32Array(TOTAL_SAMPLES);
  const muteRegions = renderSoundEvents(story, sfx);
  const sfxPeak = peakOf(sfx);

  // 2) 音乐总线（float32）
  const { bus: music } = buildMusicBus(story, sfxPeak);

  // 3) 混音
  const mix = new Float32Array(TOTAL_SAMPLES);
  for (let i = 0; i < TOTAL_SAMPLES; i++) mix[i] = sfx[i] + music[i];

  // 4) 硬静音区间（silence / rest）→ 采样点精确为 0
  const mute = applyMuteRegions(mix, muteRegions);

  // 5) 首尾 8ms 淡入淡出
  applyFades(mix);

  // 6) 峰值归一到 -1.5 dBFS（用真实峰值）
  const peak = peakOf(mix);
  const gain = peak > 0 ? Math.pow(10, TARGET_PEAK_DB / 20) / peak : 1;

  // 7) 统一量化 16-bit
  const pcm = quantize16(mix, gain);

  // 8) 写 WAV
  fs.mkdirSync(path.dirname(outWav), { recursive: true });
  const wav = encodeWav(pcm, SAMPLE_RATE);
  fs.writeFileSync(outWav, wav);

  // 9) ffmpeg → m4a
  fs.mkdirSync(path.dirname(outM4a), { recursive: true });
  encodeM4a(outWav, outM4a);

  const wavBytes = fs.statSync(outWav).size;
  const m4aBytes = fs.statSync(outM4a).size;

  if (!quiet) {
    console.log('── 音频生成完成 ──────────────────────────────────────');
    console.log(`采样点数        : ${pcm.length.toLocaleString('en-US')} (${(pcm.length / SAMPLE_RATE).toFixed(3)} s @ ${SAMPLE_RATE} Hz)`);
    console.log(`峰值            : ${(TARGET_PEAK_DB).toFixed(3)} dBFS (归一化前真实峰值 ${(20 * Math.log10(peak)).toFixed(2)} dBFS, 增益 ${gain.toFixed(4)})`);
    console.log(`静默区间长度    : ${(mute.total / SAMPLE_RATE).toFixed(3)} s (${mute.total.toLocaleString('en-US')} 采样点)`);
    for (const s of mute.spans) {
      console.log(`   · ${s.type.padEnd(8)} ${s.id.padEnd(14)} ${s.at.toFixed(2)}s + ${s.dur.toFixed(2)}s → ${s.samples.toLocaleString('en-US')} 点精确为 0`);
    }
    console.log(`音效峰值        : ${(20 * Math.log10(sfxPeak)).toFixed(2)} dBFS`);
    console.log(`音乐峰值        : ${(20 * Math.log10(peakOf(music))).toFixed(2)} dBFS (低于音效 ${MUSIC_BELOW_SFX_DB} dB)`);
    console.log(`WAV 字节数      : ${wavBytes.toLocaleString('en-US')} (${outWav})`);
    console.log(`M4A 字节数      : ${m4aBytes.toLocaleString('en-US')} (${outM4a})`);
    console.log('──────────────────────────────────────────────────────');
  }

  return {
    sampleCount: pcm.length,
    peakDbfs: TARGET_PEAK_DB,
    preNormPeakDbfs: 20 * Math.log10(peak),
    silenceSamples: mute.total,
    silenceSpans: mute.spans,
    sfxPeakDbfs: 20 * Math.log10(sfxPeak),
    musicPeakDbfs: 20 * Math.log10(peakOf(music)),
    wavBytes,
    m4aBytes,
    outWav,
    outM4a,
  };
}

/* ========================================================================== *
 * 直接运行入口
 * ========================================================================== */

const isMain =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  try {
    generateAudio({});
  } catch (err) {
    console.error('音频生成失败：', err.message);
    process.exit(1);
  }
}
