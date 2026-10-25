/*
 * src/audio-player.js —— 以 HTMLAudioElement 为唯一主时钟的播放控制。
 *
 * 规则（规划案 §5.6 / §5.8）：
 *   - 画面时间一律读 audio.currentTime，绝不用 RAF 累加 dt（避免音画漂移）。
 *   - play() 被浏览器拦截时，必须保持 paused 并给出可恢复的中文提示，
 *     绝不静默进入「无声自走」模式。
 *   - 用 attemptId 防止旧的 play() Promise 反向覆盖新状态（多次快速点击）。
 *   - 只有一个 audio 实例；重复调用 play 不会产生第二条音轨。
 */
(function (root) {
  'use strict';
  root.CriedWolf = root.CriedWolf || {};

  function createAudioClock(options) {
    var opts = options || {};
    /* 单文件版复用页面里的 <audio>（src 为 data URI），多文件版新建一个。 */
    var audio = opts.element || new Audio();
    audio.preload = 'auto';
    if (!opts.element) audio.src = opts.src || '';
    audio.volume = typeof opts.volume === 'number' ? opts.volume : 0.85;

    var state = {
      status: 'loading',
      mediaReady: false,
      errorCode: null,
      muted: false
    };
    var attempt = 0;
    var handlers = { state: opts.onState || function () {}, error: opts.onError || function () {} };

    function emit() {
      handlers.state(state);
    }

    function setError(code, message) {
      state.status = 'error';
      state.errorCode = code;
      state.mediaReady = false;
      emit();
      handlers.error(code, message);
    }

    audio.addEventListener('loadedmetadata', function () {
      state.mediaReady = true;
      if (state.status === 'loading') state.status = 'idle';
      emit();
    });
    audio.addEventListener('canplay', function () {
      state.mediaReady = true;
      if (state.status === 'loading') state.status = 'idle';
      emit();
    });
    audio.addEventListener('ended', function () {
      state.status = 'ended';
      emit();
    });
    audio.addEventListener('error', function () {
      var code = 'AUDIO_LOAD_FAILED';
      var mediaError = audio.error;
      var message = '音轨没能加载成功。请检查浏览器是否允许播放声音，然后重试。';
      if (mediaError && mediaError.code === 4) {
        code = 'AUDIO_FORMAT_UNSUPPORTED';
        message = '这个浏览器无法解码本片音轨。请用最新版 Chrome、Edge 或 Safari 打开。';
      }
      setError(code, message);
    });

    var clock = {
      element: audio,
      state: state,

      isReady: function () {
        return state.mediaReady && !state.errorCode;
      },

      currentTime: function () {
        return audio.currentTime || 0;
      },

      duration: function () {
        return isFinite(audio.duration) ? audio.duration : 0;
      },

      play: function () {
        var myAttempt = ++attempt;
        if (!clock.isReady()) {
          setError(state.errorCode || 'AUDIO_NOT_READY', '音轨还没准备好。请稍候再试。');
          return Promise.reject(new Error('audio not ready'));
        }
        state.status = 'loading';
        emit();
        var p;
        try {
          p = audio.play();
        } catch (err) {
          state.status = 'paused';
          emit();
          return Promise.reject(err);
        }
        return Promise.resolve(p).then(function () {
          if (myAttempt !== attempt) return;
          state.status = 'playing';
          state.errorCode = null;
          emit();
        }, function (err) {
          if (myAttempt !== attempt) return;
          state.status = 'paused';
          emit();
          handlers.error('PLAY_REJECTED',
            '浏览器阻止了声音播放。请再次点击播放按钮，或检查浏览器的音频权限设置。');
          throw err;
        });
      },

      pause: function () {
        attempt++;
        audio.pause();
        if (state.status === 'playing' || state.status === 'loading') state.status = 'paused';
        emit();
      },

      seek: function (t) {
        var dur = clock.duration();
        var target = Math.max(0, Math.min(t, isFinite(dur) && dur > 0 ? dur : t));
        try {
          audio.currentTime = target;
        } catch (err) {
          /* 元数据未就绪时忽略 */
        }
        return target;
      },

      replay: function () {
        clock.seek(0);
        return clock.play();
      },

      setVolume: function (v) {
        audio.volume = Math.max(0, Math.min(1, v));
        if (audio.volume > 0) state.muted = false;
        emit();
      },

      setMuted: function (m) {
        state.muted = !!m;
        audio.muted = state.muted;
        emit();
      },

      setStatus: function (s) {
        state.status = s;
        emit();
      }
    };

    return clock;
  }

  root.CriedWolf.createAudioClock = createAudioClock;
})(typeof globalThis !== 'undefined' ? globalThis : this);
