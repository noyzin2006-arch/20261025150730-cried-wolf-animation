/*
 * tests/story.test.mjs —— 故事数据与调色板的硬断言。
 *
 * 目标：证明「只有一份镜头与声音数据」，且剧情结构（三次呼喊 / 两次上山 / 寓意）
 * 与分镜表一致，任何人改了 data/story.json 都会在这里被拦住。
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const story = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'story.json'), 'utf8'));
const tokens = (await import(path.join(ROOT, 'src', 'tokens.js'))).default;

test('镜头是 15 个连续半开区间，完整覆盖 [0,150)', () => {
  assert.equal(story.shots.length, 15);
  let cursor = 0;
  for (const shot of story.shots) {
    assert.equal(shot.start, cursor, `镜头 ${shot.id} 起点不连续`);
    assert.ok(shot.end > shot.start, `镜头 ${shot.id} 时长非法`);
    assert.equal(shot.index, story.shots.indexOf(shot) + 1);
    cursor = shot.end;
  }
  assert.equal(cursor, story.meta.totalDuration);
  assert.equal(cursor, 150);
});

test('元数据自洽：帧率、总帧数、舞台尺寸', () => {
  assert.equal(story.meta.fps, 30);
  assert.equal(story.meta.frameCount, 4500);
  assert.equal(story.meta.frameCount, story.meta.totalDuration * story.meta.fps);
  assert.equal(story.meta.stageWidth, 1600);
  assert.equal(story.meta.stageHeight, 900);
  assert.equal(story.meta.title, '狼来了');
});

test('字幕不越镜：每条 cue 都落在本镜区间内', () => {
  for (const shot of story.shots) {
    for (const cue of shot.captionCues) {
      assert.ok(cue.start >= shot.start, `${shot.id} 字幕 ${cue.start} 早于镜头起点`);
      assert.ok(cue.end <= shot.end, `${shot.id} 字幕 ${cue.end} 晚于镜头终点`);
      assert.ok(cue.text.length > 0, `${shot.id} 存在空字幕`);
      assert.ok(cue.end > cue.start);
    }
  }
});

test('每镜都有字幕，且片尾带寓意落幅', () => {
  for (const shot of story.shots) {
    assert.ok(shot.captionCues.length >= 1, `镜头 ${shot.id} 没有字幕`);
  }
  const last = story.shots[14];
  const text = last.captionCues.map((c) => c.text).join('');
  assert.ok(text.includes('信任'), '片尾寓意必须点出信任');
  assert.equal(last.captionCues[0].hideOverlay, true, '片尾落幅内已有寓意文字，底部字幕带必须隐藏');
});

test('剧情结构：三次呼喊、两次村民上山、第三次无人', () => {
  const calls = story.soundEvents.filter((e) => e.type === 'horn');
  assert.equal(calls.length, 6, '三次呼喊共 6 个 horn 事件（每声喊两次）');
  const firsts = calls.filter((e) => e.variant === 'first');
  const seconds = calls.filter((e) => e.variant === 'second');
  const thirds = calls.filter((e) => e.variant === 'third');
  assert.equal(firsts.length, 2, '第一声喊两次');
  assert.equal(seconds.length, 2, '第二声喊两次');
  assert.equal(thirds.length, 2, '第三声喊两次');
  assert.ok(firsts[0].at < seconds[0].at && seconds[0].at < thirds[0].at, '三次呼喊必须按时间递进');

  const howls = story.soundEvents.filter((e) => e.type === 'wolf');
  assert.ok(howls.length >= 2);
  assert.ok(howls[0].at >= 100, '真狼的声音不得早于 100s');

  const climbShots = ['s05', 's09'];
  for (const id of climbShots) {
    const shot = story.shots.find((s) => s.id === id);
    assert.equal(shot.cast.villagers.length, 3, `${id} 必须是三位村民上山`);
    assert.ok(shot.actorKeys.villagers.length > 0, `${id} 村民缺少关键帧`);
  }
  const s13 = story.shots.find((s) => s.id === 's13');
  assert.equal(s13.cast.villagers.length, 3, '第三次村民仍在村里但不上山');
  assert.equal(s13.cast.wolf, false, '第 13 镜不应出现狼');
  assert.equal(s13.cast.wolf === true, false);
});

test('狼只在 101s 之后出现', () => {
  for (const shot of story.shots) {
    if (!shot.cast.wolf) continue;
    assert.ok(shot.start >= 101, `镜头 ${shot.id} 在 101s 前就出现了狼`);
    assert.ok(shot.actorKeys.wolf.length > 0, `镜头 ${shot.id} 标记有狼但没有关键帧`);
  }
});

test('出场表完整：每镜都声明了演员配置', () => {
  for (const shot of story.shots) {
    assert.ok(shot.cast, `镜头 ${shot.id} 缺少 cast`);
    assert.equal(typeof shot.cast.sheep, 'number');
    assert.ok(Array.isArray(shot.cast.villagers));
    assert.equal(typeof shot.cast.boy, 'boolean');
    assert.equal(typeof shot.cast.wolf, 'boolean');
    assert.ok(shot.cast.spread > 0 && shot.cast.spread <= 1.2);
  }
  const totalSheep = story.shots.reduce((n, s) => n + s.cast.sheep, 0);
  assert.ok(totalSheep > 60, '全片羊群出场次数过少');
});

test('羊群数量：宽景镜头为 11 只（近 3 / 中 3 / 远 5）', () => {
  const s02 = story.shots.find((s) => s.id === 's02');
  assert.ok(s02.actorKeys.sheep.length > 0);
  assert.equal(tokens.stage.sheepCount, 11);
  assert.equal(tokens.stage.nearSheep + tokens.stage.midSheep + tokens.stage.farSheep, 11);
});

test('转场类型合法，且叠化时长为正', () => {
  for (const shot of story.shots) {
    const tr = shot.transition;
    assert.ok(['cut', 'crossfade'].includes(tr.type));
    assert.ok(tr.start >= shot.start && tr.start <= shot.end);
    if (tr.type === 'crossfade') assert.ok(tr.duration > 0 && tr.duration <= 1, '叠化时长应在 0~1s');
  }
});

test('声音事件都在片长内，且存在强制静默窗口', () => {
  for (const e of story.soundEvents) {
    assert.ok(e.at >= 0 && e.at <= story.meta.totalDuration, `声音事件 ${e.id} 越界`);
    assert.ok(e.dur > 0);
  }
  const silence = story.soundEvents.find((e) => e.type === 'silence');
  assert.ok(silence, '必须存在静默窗口');
  assert.equal(silence.at, 119.5);
  assert.equal(silence.dur, 4.0);
  assert.equal(silence.at + silence.dur, 123.5);
});

test('三声呼喊的音色递进写在数据里', () => {
  const first = story.soundEvents.find((e) => e.variant === 'first');
  const second = story.soundEvents.find((e) => e.variant === 'second');
  const third = story.soundEvents.find((e) => e.variant === 'third');
  assert.ok(first.gain > second.gain, '第二声应比第一声更弱');
  assert.ok(third.gain > second.gain, '第三声应比第二声更强');
});

test('四套调色板键集完全一致，且都定义了 ink 与 paper', () => {
  const names = Object.keys(tokens.palettes);
  assert.deepEqual(names.sort(), ['day', 'dusk', 'night', 'paper']);
  const base = Object.keys(tokens.palettes.day).sort();
  for (const name of names) {
    assert.deepEqual(Object.keys(tokens.palettes[name]).sort(), base, `调色板 ${name} 键集不一致`);
    assert.ok(tokens.palettes[name].ink, `${name} 缺少 ink`);
    assert.ok(tokens.palettes[name].paper, `${name} 缺少 paper`);
  }
});

test('设计令牌：色板 / 字阶 / 间距 / 圆角 / 阴影 / z-index 齐备', () => {
  assert.ok(Object.keys(tokens.ui).length >= 14);
  assert.ok(Object.keys(tokens.type).length >= 6, '字阶至少 6 级');
  assert.equal(Object.keys(tokens.type).length, 8);
  assert.ok(Object.keys(tokens.shadow).length >= 5, '阴影必须分档');
  assert.ok(tokens.z.toast > tokens.z.dialog && tokens.z.dialog > tokens.z.controls);
  assert.deepEqual(Object.keys(tokens.space), ['1', '2', '3', '4', '6', '8', '12', '16', '24']);
  assert.equal(tokens.space[1], 4, '间距必须是 4px 基准栅格');
  assert.equal(tokens.collectFlat().find((p) => p[0] === '--cw-space-1')[1], '4px', 'CSS 侧间距必须带单位');
  assert.equal(tokens.grid.contentMax, 1200);
  assert.equal(tokens.collectFlat().find((p) => p[0] === '--cw-grid-content-max')[1], '1200px');
});

test('唯一真源：src/story-data.js 与 data/story.json 完全一致', async () => {
  const generated = (await import(path.join(ROOT, 'src', 'story-data.js'))).default;
  assert.deepEqual(generated, story, 'src/story-data.js 已过期，请重新运行 npm run build');
});
