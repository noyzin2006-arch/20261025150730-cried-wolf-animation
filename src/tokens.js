/*
 * src/tokens.js —— 全片唯一的设计令牌真源。
 *
 * 规则（对应设计质量线 A2/A4/E 与规划案 §3.1）：
 *   1. 本文件是唯一允许出现裸 hex 字面量的地方。
 *   2. 任何脚本、样式、SVG 都不得再写颜色字面量，只能引用这里的令牌名。
 *   3. 运行时由本文件把令牌注入 CSS 自定义属性（:root），构建期由
 *      scripts/build.mjs 把同一份令牌编译进 dist/styles/main.css，
 *      保证「令牌单点、样式不含裸 hex」。
 *
 * 同时兼容浏览器经典脚本与 Node require（供构建脚本复用同一份令牌）。
 */
(function (root, factory) {
  var tokens = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = tokens;
  } else {
    root.CriedWolf = root.CriedWolf || {};
    root.CriedWolf.tokens = tokens;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ---------------------------------------------------------- 颜色 */
  var ui = {
    bg0: '#111B24',        // 整页背景（深色影院外壳）
    bg1: '#202E36',        // 播放器盒
    bg2: '#24333D',        // 悬浮菜单 / 控件底
    overlay: '#30414A',    // 提示浮层
    text0: '#F4F0E8',      // 主文字
    text1: '#B6CBD0',      // 次文字
    text2: '#889FA8',      // 弱辅助文字
    textInverse: '#111B24',// 暖金按钮上的文字
    border0: '#7A9098',    // 低层边框
    border1: '#B6CBD0',    // 焦点外辅助边框
    accent: '#E4B36B',     // 播放 CTA / 焦点 / 进度
    accentHover: '#F3C888',
    success: '#92D8AF',
    warning: '#E4B36B',
    danger: '#ED8F7D',
    info: '#8DD4E4',
    disabledText: '#7A9098'
  };

  /* 影片画面的固有色（不随镜头变化的那一部分） */
  var film = {
    paper: '#F5EAD1',       // 插画亮面纸色
    ink: '#26333A',         // 描边 / 主文字
    inkSoft: '#4A5A62',
    sheep: '#FAF6E8',       // 羊身
    woolShade: '#D7D2C2',
    boyCape: '#C16C44',     // 主角标识：暖橘披风
    boyCapeDark: '#9C5233',
    boySkin: '#E7B58A',
    boyHair: '#293640',
    boyTrouser: '#5A4638',
    villager: '#66564D',
    wolf: '#212B33',        // 真狼黑靛剪影
    wolfEye: '#E9B15C',    // 唯一瞳光
    path: '#D8B583',        // 山路
    bell: '#E9B15C',        // 金铃
    subtitleScrim: '#111B24',
    subtitleInk: '#F4F0E8',
    scarfElder: '#E0C070',  // 麦黄围巾老人
    apronStone: '#7C93A6',  // 石蓝围裙妇人
    basketBrown: '#7A6350', // 灰褐背篓青年
    house: '#D9C7A3',
    houseRoof: '#8C5E45',
    houseDoor: '#6B4A38',
    windowLit: '#F0C878',
    tree: '#6E8A63',
    treeDark: '#4C6350',
    trunk: '#7A5C42'
  };

  /* ------------------------------------------------- 三套影片调色板 */
  /* 每套都是独立定义的完整色板，不做机械反转（质量线 A2）。 */
  var palettes = {
    day: {
      name: 'day',
      sky: '#F3D9A6',
      skyBand: '#EDCB90',
      ink: '#26333A',
      paper: '#F5EAD1',
      sun: '#EDB86C',
      sunCore: '#F6DEB2',
      farHill: '#C1B88F',
      farHillDark: '#AFA87E',
      midHill: '#8DA787',
      midHillDark: '#75906F',
      hillDark: '#75906F',
      nearHill: '#5B856F',
      nearHillDark: '#4A6F5C',
      ground: '#87A07C',
      groundDark: '#6E8A6B',
      valley: '#9AAE86',
      cloud: '#F7E7C6',
      cloudShade: '#E4CFA6',
      tree: '#6E8A63',
      treeDark: '#4C6350',
      grass: '#4C7A5E',
      grassTip: '#5F8F6D',
      ridge: '#3E6250',
      rock: '#B7AE86',
      house: '#D9C7A3',
      houseRoof: '#8C5E45',
      houseDoor: '#6B4A38',
      window: '#C9B48D',
      windowLit: '#EBC177',
      path: '#D8B583',
      pathDark: '#C4A36E',
      villager: '#66564D',
      villagerDark: '#4E413A',
      scarfElder: '#E0C070',
      apronStone: '#7C93A6',
      basketBrown: '#7A6350',
      boyCape: '#C16C44',
      boyCapeDark: '#9C5233',
      boyTrouser: '#5A4638',
      trunk: '#7A5C42',
      bell: '#E9B15C',
      dangerRed: '#923E46',
      boyCapeDark: '#9C5233',
      boyTrouser: '#5A4638',
      trunk: '#7A5C42',
      bell: '#E9B15C',
      dangerRed: '#923E46',
      boySkin: '#E7B58A',
      boyHair: '#293640',
      sheep: '#FAF6E8',
      woolShade: '#D7D2C2',
      wolf: '#212B33',
      wolfRim: '#E0C070',
      wolfEye: '#E9B15C',
      echo: '#F2D9A0',
      echoSoft: '#E7C785',
      star: '#F6E6C0',
      silhouette: '#6F5F4E',
      silhouetteDark: '#584C40'
    },
    dusk: {
      name: 'dusk',
      sky: '#697D87',
      skyBand: '#5A6E79',
      ink: '#1E262C',
      paper: '#E7DCC6',
      sun: '#C98F5E',
      sunCore: '#E0A874',
      farHill: '#4A5C69',
      farHillDark: '#3E4E59',
      midHill: '#3D4E58',
      midHillDark: '#33424B',
      hillDark: '#33424B',
      nearHill: '#344950',
      nearHillDark: '#293A40',
      ground: '#2E4048',
      groundDark: '#25343B',
      valley: '#31444C',
      cloud: '#7C8F99',
      cloudShade: '#64767F',
      tree: '#2B3B41',
      treeDark: '#1F2C31',
      grass: '#26363C',
      grassTip: '#32454B',
      ridge: '#1E2B31',
      rock: '#4C5B63',
      house: '#3E4E58',
      houseRoof: '#2C3840',
      houseDoor: '#3A3229',
      window: '#5F6E72',
      windowLit: '#F0C878',
      path: '#8C7A5C',
      pathDark: '#7A6A4E',
      villager: '#4A4239',
      villagerDark: '#38322B',
      scarfElder: '#C9AE68',
      apronStone: '#68808F',
      basketBrown: '#5E4C3D',
      boyCape: '#A85B39',
      boyCapeDark: '#8A472C',
      boyTrouser: '#45362C',
      trunk: '#4A3A2C',
      bell: '#C9A55E',
      dangerRed: '#7E3038',
      boySkin: '#D7A880',
      boyHair: '#1F2A31',
      sheep: '#D9D4C4',
      woolShade: '#B4AF9E',
      wolf: '#18212A',
      wolfRim: '#C9A55E',
      wolfEye: '#E9B15C',
      echo: '#C7B08A',
      echoSoft: '#A99272',
      star: '#C9D6DC',
      silhouette: '#2A3840',
      silhouetteDark: '#1D282E'
    },
    night: {
      name: 'night',
      sky: '#283A56',
      skyBand: '#1F2E45',
      ink: '#101820',
      paper: '#C9C6BA',
      sun: '#43577A',
      sunCore: '#5A7096',
      farHill: '#263342',
      farHillDark: '#1E2936',
      midHill: '#22303F',
      midHillDark: '#1A2531',
      hillDark: '#263342',
      nearHill: '#1C2833',
      nearHillDark: '#151E27',
      ground: '#1D2A34',
      groundDark: '#16212A',
      valley: '#1A262F',
      cloud: '#3A4C69',
      cloudShade: '#2C3B52',
      tree: '#14201F',
      treeDark: '#0E1817',
      grass: '#182430',
      grassTip: '#22303C',
      ridge: '#101821',
      rock: '#2B3742',
      house: '#222E38',
      houseRoof: '#18222A',
      houseDoor: '#2A231B',
      window: '#3B4854',
      windowLit: '#F0C878',
      path: '#5E5545',
      pathDark: '#4E4639',
      villager: '#2C3239',
      villagerDark: '#1F2429',
      scarfElder: '#9E8A52',
      apronStone: '#4A5D6B',
      basketBrown: '#4A3E32',
      boyCape: '#8E4A2E',
      boyCapeDark: '#6E3620',
      boyTrouser: '#2A2620',
      trunk: '#26201A',
      bell: '#C9A55E',
      dangerRed: '#923E46',
      boySkin: '#A98263',
      boyHair: '#121A20',
      sheep: '#C6C3B6',
      woolShade: '#9C998D',
      wolf: '#0E141B',
      wolfRim: '#6E8296',
      wolfEye: '#E9B15C',
      echo: '#9AA6B4',
      echoSoft: '#7A8797',
      star: '#DDE6F0',
      silhouette: '#131C24',
      silhouetteDark: '#0B1218'
    },
    paper: {
      name: 'paper',
      sky: '#F5EAD1',
      skyBand: '#F5EAD1',
      ink: '#26333A',
      paper: '#F5EAD1',
      sun: '#F5EAD1',
      sunCore: '#F5EAD1',
      farHill: '#EFE2C4',
      farHillDark: '#E6D6B4',
      midHill: '#E8DABC',
      midHillDark: '#DCCBA9',
      hillDark: '#D5C29C',
      nearHill: '#E3D3B2',
      nearHillDark: '#D5C29C',
      ground: '#F5EAD1',
      groundDark: '#E9DCC0',
      valley: '#F2E5CB',
      cloud: '#F5EAD1',
      cloudShade: '#EADCBF',
      tree: '#E2D3B3',
      treeDark: '#D3C29E',
      grass: '#E2D3B3',
      grassTip: '#D5C29E',
      ridge: '#CBB894',
      rock: '#E0D0AE',
      house: '#F5EAD1',
      houseRoof: '#F5EAD1',
      houseDoor: '#F5EAD1',
      window: '#F5EAD1',
      windowLit: '#F5EAD1',
      path: '#F5EAD1',
      pathDark: '#F5EAD1',
      villager: '#66564D',
      villagerDark: '#4E413A',
      scarfElder: '#C8A85E',
      apronStone: '#6E8595',
      basketBrown: '#6B5744',
            boyCape: '#C16C44',
      boyCapeDark: '#9C5233',
      boyTrouser: '#5A4638',
      trunk: '#7A5C42',
      bell: '#E9B15C',
      dangerRed: '#923E46', boySkin: '#E7B58A',
      boyHair: '#293640',
      sheep: '#FAF6E8',
      woolShade: '#D7D2C2',
      wolf: '#212B33',
      wolfRim: '#D9C79C',
      wolfEye: '#E9B15C',
      echo: '#D9C79C',
      echoSoft: '#C6B389',
      star: '#F5EAD1',
      silhouette: '#8A7B63',
      silhouetteDark: '#6E6049'
    }
  };

  /* ---------------------------------------------------------- 阴影 */
  var shadow = {
    0: 'none',
    1: '0 4px 16px #00000033',
    2: '0 8px 28px #00000055',
    3: '0 14px 40px #00000066',
    4: '0 20px 56px #00000088'
  };

  /* -------------------------------------------------------- z-index */
  var z = { base: 0, frame: 10, captions: 20, controls: 30, menu: 40, dialog: 50, toast: 60 };

  /* ---------------------------------------------------------- 圆角 */
  var radius = { sm: 4, md: 8, lg: 12, xl: 16, pill: 999 };

  /* ---------------------------------------------------------- 描边 */
  var border = { thin: 1, strong: 2, focus: 3 };

  /* -------------------------------------------------- 间距（4px 栅格） */
  var space = { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32, 12: 48, 16: 64, 24: 96 };

  /* ---------------------------------------------------------- 动效 */
  var motion = { fast: 120, medium: 220, slow: 360 };
  var easing = {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    enter: 'cubic-bezier(0, 0, 0.2, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)'
  };

  /* ---------------------------------------------------------- 图标 */
  var icon = { sizeSm: 16, sizeMd: 20, sizeLg: 24, stroke: 2, grid: 24 };

  /* ---------------------------------------------------------- 栅格 */
  var grid = {
    contentMax: 1200,
    gutterDesktop: 32,
    gutterMobile: 16,
    stageMax: 1600
  };

  /* ---------------------------------------------------------- 字体 */
  var font = {
    sans: "'PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans CJK SC','Avenir Next','Helvetica Neue',Arial,sans-serif",
    latin: "'Avenir Next','Helvetica Neue',Arial,'PingFang SC',sans-serif",
    mono: "ui-monospace,'SFMono-Regular',Menlo,monospace"
  };

  /* 字阶：倍率 1.25，8 级 */
  var type = {
    xs: { size: 12.8, lineHeight: 18, weight: 500, tracking: '0.02em', use: '状态角标' },
    sm: { size: 16, lineHeight: 24, weight: 500, tracking: '0.015em', use: '时间与辅助文字' },
    base: { size: 20, lineHeight: 32, weight: 400, tracking: '0', use: '播放器说明' },
    md: { size: 25, lineHeight: 35, weight: 600, tracking: '0', use: '控件分组标题' },
    lg: { size: 31.25, lineHeight: 40, weight: 600, tracking: '-0.01em', use: '字幕（桌面）' },
    xl: { size: 39.06, lineHeight: 48, weight: 700, tracking: '-0.015em', use: '场景标题' },
    '2xl': { size: 48.83, lineHeight: 60, weight: 700, tracking: '-0.02em', use: '片尾副标题' },
    '3xl': { size: 61.04, lineHeight: 72, weight: 700, tracking: '-0.03em', use: '片名与片尾主落幅' }
  };

  /* ------------------------------------------------ 影片舞台几何常量 */
  var stage = {
    width: 1600,
    height: 900,
    horizon: 515,
    village: { x: 130, y: 560, w: 315, h: 210 },
    pathFrom: { x: 335, y: 710 },
    pathTo: { x: 980, y: 515 },
    pathWidth: 70,
    pasture: { x: 1020, y: 480, w: 410, h: 280 },
    sheepCount: 11,
    nearSheep: 3,
    midSheep: 3,
    farSheep: 5,
    paperSeed: 20261025
  };

  var tokens = {
    ui: ui,
    film: film,
    palettes: palettes,
    shadow: shadow,
    z: z,
    radius: radius,
    border: border,
    space: space,
    motion: motion,
    easing: easing,
    icon: icon,
    grid: grid,
    font: font,
    type: type,
    stage: stage
  };

  /* ------------------------------------------------------------------
   * 把令牌编译成 CSS 自定义属性（供运行时与构建期共用同一份定义）。
   * 命名规则：--cw-<类别>-<名称>
   * ------------------------------------------------------------------ */
  function cssVarName(category, key) {
    return '--cw-' + category + '-' + String(key).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  }

  /**
   * CSS 侧的取值需要带单位。
   * 令牌对象本身保留裸数值（JS 里按像素用），只有写进 CSS 变量时才补单位 ——
   * 否则 `padding: var(--cw-space-4)` 会变成 `padding: 16`（非法）而被浏览器整条丢弃。
   */
  var CSS_UNIT = {
    space: 'px',
    radius: 'px',
    border: 'px',
    motion: 'ms',
    grid: 'px',
    icon: 'px'
  };

  function collectFlat() {
    var out = [];
    var push = function (cat, obj) {
      var unit = CSS_UNIT[cat] || '';
      Object.keys(obj).forEach(function (k) {
        var v = obj[k];
        if (v && typeof v === 'object') return;
        var out_v = (unit && typeof v === 'number') ? v + unit : v;
        out.push([cssVarName(cat, k), out_v]);
      });
    };
    push('ui', ui);
    push('film', film);
    push('shadow', shadow);
    push('z', z);
    push('radius', radius);
    push('border', border);
    push('space', space);
    push('motion', motion);
    push('icon', icon);
    push('grid', grid);
    push('font', font);
    Object.keys(type).forEach(function (k) {
      var t = type[k];
      out.push([cssVarName('type', k + '-size'), t.size + 'px']);
      out.push([cssVarName('type', k + '-line-height'), t.lineHeight + 'px']);
      out.push([cssVarName('type', k + '-weight'), String(t.weight)]);
      out.push([cssVarName('type', k + '-tracking'), t.tracking]);
    });
    Object.keys(palettes).forEach(function (p) {
      Object.keys(palettes[p]).forEach(function (k) {
        if (k === 'name') return;
        out.push([cssVarName('palette-' + p, k), palettes[p][k]]);
      });
    });
    Object.keys(easing).forEach(function (k) {
      out.push([cssVarName('easing', k), easing[k]]);
    });
    return out;
  }

  function cssText() {
    var flat = collectFlat();
    var lines = flat.map(function (pair) {
      return '  ' + pair[0] + ': ' + pair[1] + ';';
    });
    return ':root {\n' + lines.join('\n') + '\n}\n';
  }

  tokens.cssText = cssText;
  tokens.collectFlat = collectFlat;

  /* 运行时注入：把同一份令牌写进 :root，样式表只允许引用变量 */
  if (typeof document !== 'undefined' && document.documentElement) {
    var style = document.createElement('style');
    style.setAttribute('data-cw-tokens', '');
    style.textContent = cssText();
    document.head.appendChild(style);
  }

  return tokens;
});
