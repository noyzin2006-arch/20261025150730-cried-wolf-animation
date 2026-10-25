/*
 * tests/contrast.test.mjs —— 对比度量化（不靠肉眼）。
 *
 * 用 WCAG 2.x 相对亮度公式，对设计令牌里所有实际用到的前景/背景组合逐组计算。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tokens = (await import(path.join(ROOT, 'src', 'tokens.js'))).default;

function parseHex(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
}

function luminance(hex) {
  const [r, g, b] = parseHex(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

const U = tokens.ui;

test('WCAG 对比度函数本身正确（黑对白应为 21:1）', () => {
  assert.ok(Math.abs(contrast('#000000', '#FFFFFF') - 21) < 0.01);
  assert.ok(Math.abs(contrast('#FFFFFF', '#FFFFFF') - 1) < 0.001);
});

test('正文文字 vs 页面背景 ≥ 4.5:1', () => {
  for (const fg of ['text0', 'text1', 'text2']) {
    const ratio = contrast(U[fg], U.bg0);
    assert.ok(ratio >= 4.5, `${fg} on bg0 = ${ratio.toFixed(2)}:1，低于 4.5:1`);
  }
});

test('控件文字 vs 控件底色 ≥ 4.5:1', () => {
  const ratio = contrast(U.text0, U.bg2);
  assert.ok(ratio >= 4.5, `text0 on bg2 = ${ratio.toFixed(2)}:1`);
  const onOverlay = contrast(U.text0, U.overlay);
  assert.ok(onOverlay >= 4.5, `text0 on overlay = ${onOverlay.toFixed(2)}:1`);
});

test('主按钮：暖金底 + 深墨字 ≥ 4.5:1', () => {
  const ratio = contrast(U.textInverse, U.accent);
  assert.ok(ratio >= 4.5, `textInverse on accent = ${ratio.toFixed(2)}:1`);
  const hover = contrast(U.textInverse, U.accentHover);
  assert.ok(hover >= 4.5, `textInverse on accentHover = ${hover.toFixed(2)}:1`);
});

test('边框 / 图标 vs 相邻背景 ≥ 3:1（非文本对比）', () => {
  const border0 = contrast(U.border0, U.bg0);
  assert.ok(border0 >= 3, `border0 on bg0 = ${border0.toFixed(2)}:1，低于 3:1`);
  const border1 = contrast(U.border1, U.bg1);
  assert.ok(border1 >= 3, `border1 on bg1 = ${border1.toFixed(2)}:1`);
  const accentOnBg1 = contrast(U.accent, U.bg1);
  assert.ok(accentOnBg1 >= 3, `accent on bg1 = ${accentOnBg1.toFixed(2)}:1`);
});

test('禁用态仍可辨认 ≥ 2:1', () => {
  const ratio = contrast(U.disabledText, U.bg0);
  assert.ok(ratio >= 2, `disabledText on bg0 = ${ratio.toFixed(2)}:1`);
});

test('语义色与背景 ≥ 3:1，且互不相同（不靠颜色单独表意）', () => {
  for (const key of ['success', 'warning', 'danger', 'info']) {
    const ratio = contrast(U[key], U.bg0);
    assert.ok(ratio >= 3, `${key} on bg0 = ${ratio.toFixed(2)}:1`);
  }
  const values = new Set(['success', 'warning', 'danger', 'info'].map((k) => U[k]));
  assert.equal(values.size, 4, '四个语义色必须各不相同');
});

test('焦点色与选中 / 悬停态可区分（焦点环是 accent，控件底是 bg2）', () => {
  const focusVsBg2 = contrast(U.accent, U.bg2);
  const focusVsAccent = contrast(U.accent, U.accent);
  assert.ok(focusVsBg2 >= 3, `焦点环对控件底 ${focusVsBg2.toFixed(2)}:1`);
  assert.ok(focusVsAccent < 3, '焦点色不得与强调色本身难以区分');
});

test('字幕：纸白字 vs 深墨底 ≥ 4.5:1', () => {
  const ratio = contrast(tokens.film.subtitleInk, tokens.film.subtitleScrim);
  assert.ok(ratio >= 4.5, `字幕 ${ratio.toFixed(2)}:1`);
});

test('每一套调色板里，正文色与纸底/天底的对比度足够', () => {
  for (const [name, P] of Object.entries(tokens.palettes)) {
    const inkOnPaper = contrast(P.ink, P.paper);
    assert.ok(inkOnPaper >= 4.5, `${name}: ink on paper = ${inkOnPaper.toFixed(2)}:1`);
    if (name !== 'paper') {
      /* 纸面落幅里没有羊，剪纸风格允许低对比，但不能糊成一团 */
      const sheepOnHill = contrast(P.sheep, P.midHill);
      assert.ok(sheepOnHill >= 1.6, `${name}: 羊身对山坡 ${sheepOnHill.toFixed(2)}:1`);
    }
    /* 狼是黑靛剪影，靠一圈浅色纸描边与夜色拉开（规划案 §3.1 的备用方案） */
    if (name === 'night') {
      const wolfRimOnHill = contrast(P.wolfRim, P.hillDark);
      assert.ok(wolfRimOnHill >= 3, `${name}: 狼的浅色描边对夜色 ${wolfRimOnHill.toFixed(2)}:1，低于 3:1`);
    }
    const wolfEyeOnWolf = contrast(P.wolfEye, P.wolf);
    assert.ok(wolfEyeOnWolf >= 3, `${name}: 金瞳对狼身 ${wolfEyeOnWolf.toFixed(2)}:1`);
  }
});

test('把对比度结果归档到 reports/contrast.json', () => {
  const rows = [];
  const add = (name, fg, bg, min) => rows.push({
    name, fg, bg, ratio: Number(contrast(fg, bg).toFixed(2)), min, pass: contrast(fg, bg) >= min
  });
  add('正文 text0 / bg0', U.text0, U.bg0, 4.5);
  add('次要 text1 / bg0', U.text1, U.bg0, 4.5);
  add('弱文字 text2 / bg0', U.text2, U.bg0, 4.5);
  add('正文 text0 / bg2', U.text0, U.bg2, 4.5);
  add('正文 text0 / overlay', U.text0, U.overlay, 4.5);
  add('按钮 textInverse / accent', U.textInverse, U.accent, 4.5);
  add('边框 border0 / bg0', U.border0, U.bg0, 3);
  add('边框 border1 / bg1', U.border1, U.bg1, 3);
  add('焦点 accent / bg2', U.accent, U.bg2, 3);
  add('禁用 disabledText / bg0', U.disabledText, U.bg0, 2);
  add('字幕 subtitleInk / subtitleScrim', tokens.film.subtitleInk, tokens.film.subtitleScrim, 4.5);
  for (const [name, P] of Object.entries(tokens.palettes)) {
    add(`${name}: ink / paper`, P.ink, P.paper, 4.5);
  }
  const dir = path.join(ROOT, 'reports');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'contrast.json'), JSON.stringify({ generatedBy: 'tests/contrast.test.mjs', rows }, null, 2), 'utf8');
  assert.ok(rows.every((r) => r.pass), '存在未达标的对比度组合');
});
