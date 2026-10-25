/*
 * src/main.js —— 启动编排与对外 API。
 *
 * 对外 API（window.CriedWolf）是本机验收脚本与导出流程的唯一契约：
 *   renderAt(t) / seekFrame(i) / getState() / play() / pause() / replay()
 *   setCaptions(b) / setVolume(v) / getShots() / setExportMode(b)
 *
 * 画面时间一律来自音轨 currentTime；导出模式完全绕过音轨，直接按帧号渲染。
 */
(function (root) {
  'use strict';
  root.CriedWolf = root.CriedWolf || {};

  var CW = root.CriedWolf;
  var TL = CW.timeline;

  function bootstrap() {
    var svg = document.getElementById('filmSvg');
    var filmFrame = document.getElementById('filmFrame');
    var audioEl = document.getElementById('filmAudio');

    var scene = CW.createScene(svg, CW.tokens);
    var reducedQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var state = {
      timeSec: 0,
      frameId: 0,
      status: 'loading',
      captions: true,
      muted: false,
      volume: 0.85,
      fullscreen: false,
      mediaReady: false,
      errorCode: null
    };
    var exportMode = false;
    var rafId = null;

    var clock = CW.createAudioClock({
      element: audioEl || undefined,
      src: audioEl ? '' : 'assets/score.m4a',
      volume: state.volume,
      onState: function (s) {
        state.mediaReady = s.mediaReady;
        state.errorCode = s.errorCode;
        state.muted = s.muted;
        /* 音轨的可用状态必须同时写进 ui.state：播放按钮的 aria-disabled 由它决定 */
        ui.state.mediaReady = s.mediaReady;
        ui.state.errorCode = s.errorCode;
        ui.state.muted = s.muted;
        if (s.status !== 'loading' || exportMode) {
          state.status = s.status;
        }
        /* 播放状态同样要同步给 UI：按钮文案与「再点一次即暂停」的分支都读 ui.state.status */
        ui.state.status = state.status;
        ui.updateState({});
      },
      onError: function (code, message) {
        state.errorCode = code;
        state.status = 'error';
        ui.updateState({});
        ui.toast(message, 'error');
      }
    });

    var ui = CW.createUI({});
    ui.updateState({ status: 'loading' });
    ui.fillChapters(TL.chapterShots());

    /* -------------------------------------------------- 渲染循环 */
    function renderAt(t, opts) {
      var options = opts || {};
      var reduced = options.reducedMotion !== undefined
        ? options.reducedMotion
        : !!(reducedQuery && reducedQuery.matches);
      var time = TL.normalizeTime(t);
      scene.render(time, { reducedMotion: reduced });
      var frame = TL.timeToFrame(time);
      state.timeSec = time;
      state.frameId = frame;
      document.documentElement.setAttribute('data-frame-id', String(frame));
      document.documentElement.setAttribute('data-time-sec', String(time));
      var cap = TL.captionAt(time);
      ui.updateCaption(cap.text, cap.opacity);
      ui.updateProgress(frame, TL.FRAMES, time, TL.TOTAL);
      return frame;
    }

    function loop() {
      /* 导出模式必须先判断再排下一帧，否则 RAF 会一直复活并把画面拽回音轨时间 */
      if (exportMode) { rafId = null; return; }
      rafId = requestAnimationFrame(loop);
      var t = clock.currentTime();
      if (t >= TL.TOTAL) t = TL.TOTAL - 0.001;
      renderAt(t);
    }

    /* ------------------------------------------------------ 控制动作 */
    function play() {
      if (exportMode) return Promise.resolve();
      return clock.play().catch(function () { /* 错误已在 onError 里提示 */ });
    }
    function pause() {
      clock.pause();
    }
    function replay() {
      if (exportMode) { renderAt(0); return Promise.resolve(); }
      clock.seek(0);
      renderAt(0);
      return clock.play().catch(function () {});
    }
    function seekFrame(i) {
      var frame = TL.clamp(Math.round(i), 0, TL.FRAMES - 1);
      var t = frame / TL.FPS;
      if (!exportMode) clock.seek(t);
      renderAt(t);
      return frame;
    }
    function seekShot(index) {
      var shot = TL.shots()[TL.clamp(index, 0, TL.shots().length - 1)];
      if (!shot) return 0;
      return seekFrame(Math.round(shot.start * TL.FPS));
    }

    /* ------------------------------------------------------ 导出模式 */
    function setExportMode(on) {
      exportMode = !!on;
      document.documentElement.setAttribute('data-export-mode', exportMode ? 'true' : 'false');
      if (exportMode) {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        renderAt(state.timeSec);
      } else {
        if (!rafId) loop();
      }
      return exportMode;
    }

    /* ------------------------------------------------------ 对外 API */
    CW.renderAt = function (t) { return renderAt(t); };
    CW.seekFrame = function (i) { return seekFrame(i); };
    CW.seekShot = seekShot;
    CW.getState = function () {
      /* 字幕 / 静音 / 音量的真源在 ui.state，这里必须读同一份，否则两处状态会各说各话 */
      return {
        timeSec: state.timeSec,
        frameId: state.frameId,
        status: state.status,
        captions: ui.state.captions,
        muted: ui.state.muted,
        volume: ui.state.volume,
        fullscreen: ui.state.fullscreen,
        theater: ui.state.theater,
        mediaReady: state.mediaReady,
        errorCode: state.errorCode,
        exportMode: exportMode
      };
    };
    CW.play = play;
    CW.pause = pause;
    CW.replay = replay;
    CW.setCaptions = function (on) {
      ui.updateState({ captions: !!on });
      renderAt(state.timeSec);
    };
    CW.setVolume = function (v) {
      ui.updateState({ volume: v });
      clock.setVolume(v);
    };
    CW.setMuted = function (m) {
      ui.updateState({ muted: !!m });
      clock.setMuted(m);
    };
    CW.getShots = function () {
      return TL.shots().map(function (s) {
        return {
          id: s.id, index: s.index, title: s.title, section: s.section,
          start: s.start, end: s.end, palette: s.palette,
          captionCues: s.captionCues
        };
      });
    };
    CW.setExportMode = setExportMode;
    CW.getScene = function () { return scene; };
    CW.getUI = function () { return ui; };

    ui.bind({
      api: {
        play: play, pause: pause, replay: replay,
        seekFrame: seekFrame, seekShot: seekShot,
        setVolume: function (v) { CW.setVolume(v); },
        setMuted: function (m) { CW.setMuted(m); }
      },
      getShotTitle: function (i) {
        var shots = TL.shots();
        return shots[i] ? shots[i].title : '';
      }
    });

    /* 首帧 */
    renderAt(0);
    loop();

    if (reducedQuery && typeof reducedQuery.addEventListener === 'function') {
      reducedQuery.addEventListener('change', function () { renderAt(state.timeSec); });
    }

    document.documentElement.setAttribute('data-app-ready', 'true');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
