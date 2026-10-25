/*
 * src/timeline.js —— 纯函数时间线内核。
 *
 * 本文件不含任何 DOM 操作、不读真实时钟、不使用随机数：
 * 任意时间点 t 的画面由 t 唯一确定（规划案 §5.2 / §5.5 的硬要求）。
 * 同一份代码同时供浏览器与 Node 测试使用。
 */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(require('./story-data.js'));
  } else {
    root.CriedWolf = root.CriedWolf || {};
    root.CriedWolf.timeline = factory(root.CriedWolf.story);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (story) {
  'use strict';

  var TOTAL = story.meta.totalDuration;
  var FPS = story.meta.fps;
  var FRAMES = story.meta.frameCount;

  /* ------------------------------------------------------------ 数值工具 */
  function finite(v, fallback) {
    return typeof v === 'number' && isFinite(v) ? v : fallback;
  }

  /** 非有限数归零，负数 clamp 到 0，超出片长 clamp 到片尾。 */
  function normalizeTime(t) {
    var v = finite(t, 0);
    if (v < 0) return 0;
    if (v > TOTAL) return TOTAL;
    return v;
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  /** smoothstep：镜头与角色位移的统一缓动（规划案 §5.5）。 */
  function ease01(x) {
    var v = clamp(finite(x, 0), 0, 1);
    return v * v * (3 - 2 * v);
  }

  function frameToTime(i) {
    return clamp(Math.round(finite(i, 0)), 0, FRAMES - 1) / FPS;
  }

  function timeToFrame(t) {
    return clamp(Math.round(normalizeTime(t) * FPS), 0, FRAMES - 1);
  }

  /* -------------------------------------------------------- 关键帧采样 */
  var NUMERIC = ['x', 'y', 'scale', 'rotation', 'opacity'];

  /**
   * 在关键帧序列中采样 t 时刻的数值。
   * @param {Array} keys  关键帧数组，每项 {t, x, y, scale, rotation, opacity, pose}
   * @param {number} t    绝对秒
   * @param {boolean} eased 位置类插值是否走 smoothstep（镜头用 true，角色用 false）
   */
  function sampleKeys(keys, t, eased) {
    if (!keys || keys.length === 0) return null;
    if (keys.length === 1) {
      var only = keys[0];
      var base = {};
      NUMERIC.forEach(function (k) { base[k] = finite(only[k], 0); });
      base.pose = only.pose || 'idle';
      base.poseIndex = 0;
      return base;
    }
    var time = normalizeTime(t);
    var i = 0;
    for (var n = 0; n < keys.length - 1; n++) {
      if (time >= keys[n].t && time < keys[n + 1].t) { i = n; break; }
      if (time >= keys[keys.length - 1].t) { i = keys.length - 2; }
    }
    var a = keys[i];
    var b = keys[i + 1];
    var span = b.t - a.t;
    var raw = span <= 0 ? 0 : (time - a.t) / span;
    var k = eased ? ease01(raw) : clamp(raw, 0, 1);
    var out = {};
    NUMERIC.forEach(function (name) {
      var av = finite(a[name], 0);
      var bv = finite(b[name], av);
      out[name] = av + (bv - av) * k;
    });
    /* 姿态是离散量：取 t 所在区间的起始姿态（切换由 scene 的绝对相位补间） */
    out.pose = a.pose || 'idle';
    out.poseIndex = i;
    out.poseProgress = clamp(raw, 0, 1);
    return out;
  }

  /* --------------------------------------------------------- 镜头定位 */
  var SHOTS = story.shots;

  /** t 落在哪个镜头（半开区间 [start,end)）。 */
  function shotIndexAt(t) {
    var time = normalizeTime(t);
    for (var i = 0; i < SHOTS.length; i++) {
      if (time >= SHOTS[i].start && time < SHOTS[i].end) return i;
    }
    return SHOTS.length - 1;
  }

  function shotAt(t) {
    return SHOTS[shotIndexAt(t)];
  }

  function shots() {
    return SHOTS;
  }

  /* --------------------------------------------------------- 字幕定位 */
  /**
   * 取得 t 时刻应显示的字幕文本与淡入淡出不透明度。
   * 字幕入场 0.20s、出场 0.24s（规划案 §5.4）。
   */
  function captionAt(t) {
    var time = normalizeTime(t);
    for (var i = 0; i < SHOTS.length; i++) {
      var cues = SHOTS[i].captionCues || [];
      for (var c = 0; c < cues.length; c++) {
        var cue = cues[c];
        if (time >= cue.start && time < cue.end) {
          var inA = Math.min(1, (time - cue.start) / 0.20);
          var outA = Math.min(1, (cue.end - time) / 0.24);
          var opacity = Math.max(0, Math.min(inA, outA));
          var vis = cue.hideOverlay ? 0 : opacity;
          return { text: cue.text, opacity: vis, overlay: !cue.hideOverlay, cue: cue, shotIndex: i };
        }
      }
    }
    return { text: '', opacity: 0, overlay: true, cue: null, shotIndex: shotIndexAt(time) };
  }

  /* --------------------------------------------------- 章节（叙事段落） */
  function chapters() {
    var seen = {};
    var out = [];
    SHOTS.forEach(function (s, i) {
      if (!seen[s.section]) {
        seen[s.section] = true;
        out.push({ name: s.section, start: s.start, shotIndex: i, shotId: s.id });
      }
    });
    return out;
  }

  /** 章节名 → 该章节的镜头序号（用于 select 的 value）。 */
  function chapterShots() {
    var out = [];
    var current = null;
    SHOTS.forEach(function (s, i) {
      if (!current || current.section !== s.section) {
        current = { section: s.section, shotIndex: i, shotId: s.id, title: s.title, start: s.start };
        out.push(current);
      } else {
        current.title = s.title;
      }
    });
    return out;
  }

  /* ---------------------------------------------------------- 过渡量 */
  /**
   * 计算 t 时刻当前镜头与前一镜头各自的显示不透明度。
   * 叠化：prev = 1-u, next = u，u = clamp((t-start)/duration, 0, 1)。
   */
  function transitionOpacity(t) {
    var time = normalizeTime(t);
    var idx = shotIndexAt(time);
    var shot = SHOTS[idx];
    var tr = shot.transition || { type: 'cut', start: shot.start, duration: 0 };
    var out = { index: idx, opacity: 1, prevIndex: -1, prevOpacity: 0, transition: tr };
    if (tr.type !== 'crossfade' || !tr.duration) return out;
    var start = finite(tr.start, shot.start);
    var u = clamp((time - start) / tr.duration, 0, 1);
    if (u <= 0 || u >= 1 || idx + 1 >= SHOTS.length) return out;
    /* 转场写在「离开的那一镜」上：当前镜淡出，下一镜淡入 */
    out.prevIndex = idx;
    out.prevOpacity = 1 - u;
    out.index = idx + 1;
    out.opacity = u;
    return out;
  }

  /* -------------------------------------------------------- 时间格式 */
  function formatTime(sec) {
    var s = Math.max(0, Math.floor(finite(sec, 0)));
    var m = Math.floor(s / 60);
    var r = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
  }

  return {
    TOTAL: TOTAL,
    FPS: FPS,
    FRAMES: FRAMES,
    story: story,
    clamp: clamp,
    finite: finite,
    normalizeTime: normalizeTime,
    ease01: ease01,
    frameToTime: frameToTime,
    timeToFrame: timeToFrame,
    sampleKeys: sampleKeys,
    shotIndexAt: shotIndexAt,
    shotAt: shotAt,
    shots: shots,
    captionAt: captionAt,
    chapters: chapters,
    chapterShots: chapterShots,
    transitionOpacity: transitionOpacity,
    formatTime: formatTime
  };
});
