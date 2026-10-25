/*
 * src/ui.js —— 播放器界面层：控件状态、四态文案、字幕、快捷键、提示条。
 *
 * 规则（质量线 B1–B4 / C）：
 *   - 每个控件的默认 / 悬停 / 按下 / 聚焦 / 禁用 / 加载 / 错误 / 成功态都有明确表现。
 *   - 任何用户发起的操作 100ms 内有可见反馈。
 *   - 错误文案说清「发生了什么 + 怎么办」，不出现技术黑话。
 *   - 图标按钮一律带 aria-label；字幕区 aria-live=off，另设可读故事文本。
 */
(function (root) {
  'use strict';
  root.CriedWolf = root.CriedWolf || {};

  var ICONS = root.CriedWolf.icons;
  var T = root.CriedWolf.tokens;

  var TEXT = {
    ready: '动画已准备好，时长 2 分 30 秒。',
    loading: '正在准备动画与音轨…',
    empty: '还没有开始播放。按播放进入山谷。',
    error: '动画资源没有准备好。请刷新此页面重试。',
    audioBlocked: '浏览器阻止播放声音。请再次点击播放，或检查浏览器音频权限。',
    ended: '播放完成。重看故事',
    chapterMoved: '已跳转到镜头 {n}：{title}',
    chapterFailed: '没有定位到这个镜头。请使用进度条重试。',
    replayed: '已从头播放',
    noCaptions: '字幕暂时不可用',
    muted: '已静音',
    unmuted: '已恢复声音',
    captionsOn: '字幕已开启',
    captionsOff: '字幕已关闭'
  };

  function $(id) {
    return document.getElementById(id);
  }

  /** 统一的控件状态标记（CSS 用 [data-state] 选择器表现）。 */
  function setComponentState(el, state) {
    if (!el) return;
    if (state) el.setAttribute('data-state', state);
    else el.removeAttribute('data-state');
  }

  function createUI(deps) {
    var ui = {
      els: {},
      state: {
        status: 'loading',
        captions: true,
        muted: false,
        volume: 0.85,
        fullscreen: false,
        theater: false,
        errorCode: null
      },
      toastTimer: null
    };

    ['filmFrame', 'caption', 'storyText', 'playBtn', 'restartBtn', 'captionBtn', 'muteBtn',
      'volumeInput', 'progressInput', 'chapterSelect', 'fullscreenBtn', 'toast', 'statusText',
      'storySummary'].forEach(function (id) {
        ui.els[id] = $(id);
      });

    var els = ui.els;

    /* ------------------------------------------------------ 图标装载 */
    function paintIcons() {
      if (els.playBtn) ICONS.setIcon(els.playBtn, ui.state.status === 'playing' ? 'pause' : 'play', T.icon.sizeLg, T);
      if (els.restartBtn) ICONS.setIcon(els.restartBtn, 'restart', T.icon.sizeLg, T);
      if (els.captionBtn) ICONS.setIcon(els.captionBtn, 'captions', T.icon.sizeLg, T);
      if (els.muteBtn) ICONS.setIcon(els.muteBtn, ui.state.muted ? 'muted' : 'volume', T.icon.sizeLg, T);
      if (els.fullscreenBtn) ICONS.setIcon(els.fullscreenBtn, ui.state.fullscreen ? 'exitFullscreen' : 'fullscreen', T.icon.sizeLg, T);
    }

    /* ------------------------------------------------------ 状态文案 */
    function statusText() {
      var s = ui.state.status;
      if (s === 'error') return els.statusText ? els.statusText.dataset.errorText || TEXT.error : TEXT.error;
      if (s === 'ended') return TEXT.ended;
      if (s === 'playing') return '正在播放';
      if (s === 'paused') return '已暂停';
      if (s === 'loading') return TEXT.loading;
      return TEXT.ready;
    }

    function updateState(next) {
      Object.keys(next).forEach(function (k) { ui.state[k] = next[k]; });
      paintIcons();

      var s = ui.state.status;
      if (els.playBtn) {
        var playing = s === 'playing';
        els.playBtn.setAttribute('aria-label', playing ? '暂停动画' : '播放动画');
        var label = els.playBtn.querySelector('.btn-label');
        if (label) label.textContent = playing ? '暂停' : (s === 'ended' ? '重新播放' : '播放');
        setComponentState(els.playBtn, s === 'playing' ? 'active' : (s === 'loading' ? 'loading' : 'default'));
        /* 不用 disabled：按钮必须始终可聚焦（质量线 B1），未就绪时用 aria-disabled 提示原因 */
        var ready = ui.state.mediaReady && !ui.state.errorCode;
        els.playBtn.setAttribute('aria-disabled', ready ? 'false' : 'true');
        els.playBtn.setAttribute('title', ready ? '播放动画' : '音轨还没准备好，请稍候再试');
      }
      if (els.captionBtn) {
        els.captionBtn.setAttribute('aria-pressed', ui.state.captions ? 'true' : 'false');
        els.captionBtn.setAttribute('aria-label', ui.state.captions ? '关闭字幕' : '开启字幕');
        var cl = els.captionBtn.querySelector('.btn-label');
        if (cl) cl.textContent = ui.state.captions ? '字幕 开' : '字幕 关';
      }
      if (els.muteBtn) {
        els.muteBtn.setAttribute('aria-pressed', ui.state.muted ? 'true' : 'false');
        els.muteBtn.setAttribute('aria-label', ui.state.muted ? '恢复声音' : '静音');
      }
      if (els.fullscreenBtn) {
        els.fullscreenBtn.setAttribute('aria-pressed', ui.state.fullscreen || ui.state.theater ? 'true' : 'false');
        els.fullscreenBtn.setAttribute('aria-label', ui.state.fullscreen || ui.state.theater ? '退出影院模式' : '进入影院模式');
      }
      if (els.statusText) {
        els.statusText.textContent = statusText();
        els.statusText.setAttribute('data-status', s);
      }
      if (els.filmFrame) {
        els.filmFrame.setAttribute('data-status', s);
        setComponentState(els.filmFrame, s === 'error' ? 'error' : (s === 'loading' ? 'loading' : 'default'));
      }
      if (els.progressInput) {
        var pReady = ui.state.mediaReady && !ui.state.errorCode;
        els.progressInput.setAttribute('aria-disabled', pReady ? 'false' : 'true');
        els.progressInput.disabled = !pReady && s === 'loading' && false;
      }
    }

    /* ------------------------------------------------------ 字幕渲染 */
    function updateCaption(text, opacity) {
      if (!els.caption) return;
      var holder = els.caption.querySelector('#captionText') || els.caption.querySelector('span');
      if (!holder) {
        holder = document.createElement('span');
        holder.id = 'captionText';
        els.caption.appendChild(holder);
      }
      var show = ui.state.captions && text && opacity > 0.01;
      holder.textContent = show ? text : '';
      els.caption.setAttribute('opacity', show ? opacity.toFixed(3) : '0');
      els.caption.setAttribute('aria-hidden', show ? 'false' : 'true');
    }

    /* -------------------------------------------------------- 提示条 */
    function toast(message, kind) {
      if (!els.toast) return;
      els.toast.textContent = message;
      els.toast.setAttribute('data-kind', kind || 'info');
      els.toast.setAttribute('role', kind === 'error' ? 'alert' : 'status');
      els.toast.setAttribute('aria-live', kind === 'error' ? 'assertive' : 'polite');
      els.toast.setAttribute('data-visible', 'true');
      if (ui.toastTimer) clearTimeout(ui.toastTimer);
      ui.toastTimer = setTimeout(function () {
        els.toast.setAttribute('data-visible', 'false');
      }, 2500);
    }

    /* ------------------------------------------------------ 章节选择 */
    function fillChapters(chapterList) {
      if (!els.chapterSelect) return;
      els.chapterSelect.innerHTML = '';
      chapterList.forEach(function (ch, i) {
        var opt = document.createElement('option');
        opt.value = String(ch.shotIndex);
        opt.textContent = '镜头 ' + (ch.shotIndex + 1) + '：' + ch.title;
        opt.setAttribute('data-section', ch.section);
        els.chapterSelect.appendChild(opt);
      });
    }

    /* ------------------------------------------------------ 进度条 */
    function updateProgress(frameId, totalFrames, timeSec, totalSec) {
      if (!els.progressInput) return;
      els.progressInput.value = String(frameId);
      els.progressInput.setAttribute('aria-valuetext',
        '第' + Math.floor(timeSec) + '秒，共' + Math.round(totalSec) + '秒');
      var timeEl = $('timeText');
      if (timeEl) timeEl.textContent = format(timeSec) + ' / ' + format(totalSec);
    }

    function format(sec) {
      var s = Math.max(0, Math.floor(sec || 0));
      var m = Math.floor(s / 60);
      var r = s % 60;
      return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
    }

    /* ------------------------------------------------- 影院模式切换 */
    function toggleTheater() {
      ui.state.theater = !ui.state.theater;
      if (els.filmFrame) {
        els.filmFrame.classList.toggle('is-theater', ui.state.theater);
      }
      updateState({});
      return ui.state.theater;
    }

    function exitTheater() {
      if (!ui.state.theater) return false;
      ui.state.theater = false;
      if (els.filmFrame) els.filmFrame.classList.remove('is-theater');
      updateState({});
      return true;
    }

    /* ------------------------------------------------------ 事件绑定 */
    function isTextEntry(el) {
      if (!el) return false;
      var tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON' || el.isContentEditable;
    }

    function bind(dep) {
      var api = dep.api;

      if (els.playBtn) {
        els.playBtn.addEventListener('click', function () {
          if (ui.state.status === 'playing') { api.pause(); return; }
          if (ui.state.status === 'ended') { api.replay(); return; }
          if (!ui.state.mediaReady) {
            toast('音轨还在准备，请稍候再试。', 'info');
            return;
          }
          api.play();
        });
      }
      if (els.restartBtn) {
        els.restartBtn.addEventListener('click', function () {
          api.replay();
          toast(TEXT.replayed, 'success');
        });
      }
      if (els.captionBtn) {
        els.captionBtn.addEventListener('click', function () {
          var next = !ui.state.captions;
          updateState({ captions: next });
          toast(next ? TEXT.captionsOn : TEXT.captionsOff, 'info');
        });
      }
      if (els.muteBtn) {
        els.muteBtn.addEventListener('click', function () {
          var next = !ui.state.muted;
          updateState({ muted: next });
          api.setMuted(next);
          toast(next ? TEXT.muted : TEXT.unmuted, 'info');
        });
      }
      if (els.volumeInput) {
        els.volumeInput.addEventListener('input', function () {
          var v = Number(els.volumeInput.value) / 100;
          updateState({ volume: v });
          api.setVolume(v);
        });
      }
      if (els.progressInput) {
        els.progressInput.addEventListener('input', function () {
          api.seekFrame(Number(els.progressInput.value));
        });
      }
      if (els.chapterSelect) {
        els.chapterSelect.addEventListener('change', function () {
          var idx = Number(els.chapterSelect.value);
          api.seekShot(idx);
          toast(TEXT.chapterMoved.replace('{n}', idx + 1).replace('{title}', dep.getShotTitle(idx)), 'info');
        });
      }
      if (els.fullscreenBtn) {
        els.fullscreenBtn.addEventListener('click', function () {
          if (ui.state.fullscreen) {
            if (document.exitFullscreen) document.exitFullscreen();
            return;
          }
          var req = els.filmFrame.requestFullscreen ? els.filmFrame.requestFullscreen() : null;
          if (req && typeof req.catch === 'function') {
            req.catch(function () {
              toast('这个浏览器拒绝了全屏请求，已切换为影院模式。', 'info');
              toggleTheater();
            });
          } else if (!req) {
            toast('这个浏览器不支持全屏，已切换为影院模式。', 'info');
            toggleTheater();
          }
        });
      }
      document.addEventListener('fullscreenchange', function () {
        ui.state.fullscreen = !!document.fullscreenElement;
        updateState({});
      });

      document.addEventListener('keydown', function (ev) {
        if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
        var focused = document.activeElement;
        var key = ev.key;

        if (key === 'Escape') {
          if (ui.state.fullscreen && document.exitFullscreen) { document.exitFullscreen(); return; }
          if (exitTheater()) { ev.preventDefault(); return; }
          return;
        }
        /* 范围控件与按钮保留原生键盘行为，全局快捷键不抢事件 */
        if (isTextEntry(focused)) return;

        if (key === ' ' || key === 'Spacebar') {
          ev.preventDefault();
          if (ui.state.status === 'playing') api.pause(); else api.play();
        } else if (key === 'c' || key === 'C') {
          ev.preventDefault();
          updateState({ captions: !ui.state.captions });
          toast(ui.state.captions ? TEXT.captionsOn : TEXT.captionsOff, 'info');
        } else if (key === 'r' || key === 'R') {
          ev.preventDefault();
          api.replay();
          toast(TEXT.replayed, 'success');
        } else if (key === 'm' || key === 'M') {
          ev.preventDefault();
          var nextMute = !ui.state.muted;
          updateState({ muted: nextMute });
          api.setMuted(nextMute);
          toast(nextMute ? TEXT.muted : TEXT.unmuted, 'info');
        } else if (key === 'f' || key === 'F') {
          ev.preventDefault();
          if (ui.state.fullscreen) { if (document.exitFullscreen) document.exitFullscreen(); }
          else if (els.filmFrame && els.filmFrame.requestFullscreen) {
            var r = els.filmFrame.requestFullscreen();
            if (r && typeof r.catch === 'function') { r.catch(function () { toggleTheater(); }); }
          } else { toggleTheater(); }
        }
      });

      /* 失焦即暂停，回来不自动恢复（防止声画意外推进） */
      document.addEventListener('visibilitychange', function () {
        if (document.hidden && ui.state.status === 'playing') api.pause();
      });
      window.addEventListener('blur', function () {
        if (ui.state.status === 'playing') api.pause();
      });
    }

    ui.updateState = updateState;
    ui.updateCaption = updateCaption;
    ui.updateProgress = updateProgress;
    ui.toast = toast;
    ui.fillChapters = fillChapters;
    ui.setComponentState = setComponentState;
    ui.bind = bind;
    ui.paintIcons = paintIcons;
    ui.exitTheater = exitTheater;
    ui.toggleTheater = toggleTheater;
    ui.TEXT = TEXT;

    return ui;
  }

  root.CriedWolf.createUI = createUI;
  root.CriedWolf.uiText = TEXT;
})(typeof globalThis !== 'undefined' ? globalThis : this);
