#!/usr/bin/env node
/*
 * scripts/build-storyboard.mjs —— 由 data/story.json 生成 docs/storyboard.md。
 *
 * 分镜表是「人看的施工表」，机器数据是 data/story.json；两者不允许各写一份，
 * 所以分镜表由脚本生成，层叠顺序等人工标注放在 LAYERS 里。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/* 每镜的空间层叠顺序（由远及近），来自规划案 §5.4 */
const LAYERS = {
  s01: 'L0 纸底 / L1 日轮 / L2 山形 / L3 片名 / L4 草尖 / L5 前景叶',
  s02: 'L0 天空 / L1 云与日 / L2 远山 / L3 中景坡 / L4 村庄与树 / L5 坡与路 / L6 羊群与少年 / L7 前景麦穗',
  s03: 'L0 天 / L1 云 / L2 远坡 / L3 枝影 / L4 羊 / L5 男孩半身 / L6 前景枝',
  s04: 'L0 远山 / L1 小屋 / L2 羊群 / L3 男孩 / L4 回声线 / L5 近景叶 / L6 光晕',
  s05: 'L0 天 / L1 山 / L2 村庄 / L3 路 / L4 村民 / L5 男孩与羊 / L6 前景麦穗',
  s06: 'L0 天空 / L1 山 / L2 小村 / L3 村民 / L4 空路 / L5 男孩与羊 / L6 云',
  s07: 'L0 黄昏天空 / L1 云 / L2 山 / L3 村庄窗灯 / L4 羊群 / L5 男孩 / L6 近景树',
  s08: 'L0 天空 / L1 暮山 / L2 村 / L3 羊 / L4 男孩 / L5 回声碎片 / L6 前景坡草',
  s09: 'L0 暮天 / L1 坡 / L2 村门 / L3 小路 / L4 村民 / L5 山顶少年远影 / L6 路边黑枝',
  s10: 'L0 冷天 / L1 山 / L2 村屋 / L3 门扇 / L4 三村民 / L5 远少年 / L6 门框剪影',
  s11: 'L0 暗天 / L1 暗山 / L2 树丛 / L3 羊群 / L4 真狼 / L5 男孩 / L6 草丛与红色薄云',
  s12: 'L0 夜山 / L1 逃羊 / L2 男孩脸 / L3 双手 / L4 牧杖 / L5 回声线 / L6 红云',
  s13: 'L0 暗天 / L1 远坡 / L2 村屋 / L3 门 / L4 窗框 / L5 三人物剪影 / L6 近树',
  s14: 'L0 暗山 / L1 风带 / L2 草坡 / L3 散羊 / L4 狼与白羊 / L5 牧杖 / L6 前景叶',
  s15: 'L0 纸底 / L1 极淡远山 / L2 圆环回声 / L3 羊铃 / L4 大标题 / L5 寓意 / L6 署名'
};

/* 每镜的叙事任务 */
const INTENT = {
  s01: '建立基调：安静的山谷、麦黄圆日，片名与副题落下',
  s02: '一次交代地理关系：村庄在坡下，羊群与少年在坡上',
  s03: '错认的根源：尖角形的其实只是随风摆动的树枝，狼绝不出现在此镜',
  s04: '第一次失信：少年大喊「狼来了」，回声从嘴前散开',
  s05: '第一次被相信：三位村民放下活计奔上山坡',
  s06: '第一次被辜负：坡上空无一物，少年大笑，村民失望',
  s07: '时间推移：冷青暮色降临，少年又想试一次',
  s08: '第二次失信：回声线碎成纸条，比第一次更远也更薄',
  s09: '第二次被相信、第二次被辜负：村民还是来了，只看见空坡',
  s10: '信任被关在门外：门合上、暖光熄灭，少年第一次露出愧色',
  s11: '危险现身：金色狼眼先于人看见真狼，少年还背对着它',
  s12: '第三次呼喊：喊声被山脊截断，断纸线预示这回没人来',
  s13: '最冷的一镜：村民听见了却没有起身，门依旧关着',
  s14: '代价落地：狼叼走一只羊，只剩空草地、倒地的牧杖与一只孤铃',
  s15: '视觉终点：纸白落幅、片名与两行寓意、静止的金铃与断开的三道回声'
};

function fmt(sec) {
  const s = Math.floor(sec);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function buildStoryboard() {
  const story = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'story.json'), 'utf8'));
  const out = [];

  out.push('# 《狼来了｜回声的代价》分镜表');
  out.push('');
  out.push('> 本文件由 `scripts/build-storyboard.mjs` 从 `data/story.json` 生成，请勿手改。');
  out.push('> 时间轴总长 150.000 秒，4500 帧 @ 30fps；每个镜头为半开区间 `[start, end)`。');
  out.push('');
  out.push('## 总览');
  out.push('');
  out.push('| 镜号 | 时间 | 时长 | 段落 | 标题 | 调色 | 转场 | 叙事任务 |');
  out.push('|---|---|---|---|---|---|---|---|');
  for (const shot of story.shots) {
    const tr = shot.transition;
    const trText = tr.type === 'crossfade' ? `叠化 ${tr.start.toFixed(1)}s（${tr.duration}s）` : `硬切 ${tr.start.toFixed(1)}s`;
    out.push(`| 镜 ${String(shot.index).padStart(2, '0')} | ${fmt(shot.start)}–${fmt(shot.end)} | ${(shot.end - shot.start).toFixed(0)}s | ${shot.section} | ${shot.title} | ${shot.palette} | ${trText} | ${INTENT[shot.id] || ''} |`);
  }
  out.push('');

  out.push('## 逐镜施工表');
  out.push('');
  for (const shot of story.shots) {
    out.push(`### 镜 ${String(shot.index).padStart(2, '0')}｜${fmt(shot.start)}–${fmt(shot.end)}（${shot.start}–${shot.end}s）《${shot.title}》`);
    out.push('');
    out.push(`- **段落**：${shot.section}`);
    out.push(`- **叙事任务**：${INTENT[shot.id] || '—'}`);
    out.push(`- **调色**：${shot.palette}`);
    out.push(`- **层叠顺序**：${LAYERS[shot.id] || '—'}`);
    out.push(`- **转场**：${shot.transition.type === 'crossfade' ? `交叉淡变 ${shot.transition.duration}s（起于 ${shot.transition.start}s）` : `硬切（起于 ${shot.transition.start}s）`}`);

    const cam = shot.camera.map((k) => `(${k.t}s x${k.x} y${k.y} s${k.scale})`).join(' → ');
    out.push(`- **摄影机**：${cam}`);

    out.push('- **角色关键帧**：');
    for (const [who, keys] of Object.entries(shot.actorKeys)) {
      if (!keys.length) continue;
      const label = { boy: '少年', wolf: '真狼', villagers: '村民', sheep: '羊群' }[who] || who;
      out.push(`  - ${label}：` + keys.map((k) => `${k.t}s ${k.pose}(${k.x},${k.y}×${k.scale})`).join(' → '));
    }

    out.push('- **字幕**：');
    if (shot.captionCues.length) {
      for (const cue of shot.captionCues) {
        out.push(`  - [${cue.start}, ${cue.end}]「${cue.text}」${cue.hideOverlay ? '（落幅内已有同义文字，隐藏底部字幕带）' : ''}`);
      }
    } else {
      out.push('  - 无（让画面说话）');
    }

    const evs = story.soundEvents.filter((e) => e.at >= shot.start && e.at < shot.end);
    out.push('- **声音事件**：');
    if (evs.length) {
      for (const e of evs) {
        out.push(`  - ${e.at.toFixed(2)}s \`${e.type}\`${e.variant ? `（${e.variant}）` : ''} gain ${e.gain}dB${e.muted ? '，消音' : ''}${e.chord ? `，和弦 ${e.chord}` : ''}${e.rate ? `，${e.rate}Hz` : ''}`);
      }
    } else {
      out.push('  - 无（承接上一镜的延续音）');
    }
    out.push('- **画面元素**：' + (shot.effectIds.length ? shot.effectIds.join('、') : '—'));
    out.push('');
  }

  out.push('## 声音设计总表');
  out.push('');
  out.push(`- 采样率 ${story.meta.sampleRate}Hz、单声道 16bit PCM；全片 ${story.meta.totalDuration}.000 秒。`);
  out.push(`- 音乐：4/4 拍、${story.music.bpm} BPM，每拍 ${story.music.beatSec} 秒，每小节 ${story.music.barSec} 秒，${story.meta.totalDuration / story.music.barSec} 小节。`);
  out.push(`- 调式：${story.music.key}；主题动机 D4–F4–A4（${story.music.theme.join(' / ')} Hz）。`);
  out.push('- 和声进行：' + story.music.progression.map((p) => `${p.from}–${p.to}s：${p.cycle.join(' / ')}`).join('；') + '。');
  out.push('- 119.5–123.5 秒为强制静默窗口（PCM 逐点为 0），第三次呼喊消失在空谷里。');
  out.push(`- 全部 ${story.soundEvents.length} 个声音事件由 \`scripts/generate-audio.mjs\` 一次性离线合成，浏览器播放与 MP4 导出使用同一段 WAV，不重复实时混音。`);
  out.push('');

  out.push('## 寓意落幅');
  out.push('');
  const last = story.shots[14];
  out.push('- 主标题：「狼来了」');
  for (const cue of last.captionCues) {
    for (const line of cue.text.split('。').filter(Boolean)) {
      out.push(`- 寓意：${line}。`);
    }
  }
  out.push('- 署名：根据伊索寓言原创改编');
  out.push('');

  const dir = path.join(ROOT, 'docs');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, 'storyboard.md');
  fs.writeFileSync(file, out.join('\n'), 'utf8');
  return file;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = buildStoryboard();
  process.stdout.write(`已生成 ${file}\n`);
}
