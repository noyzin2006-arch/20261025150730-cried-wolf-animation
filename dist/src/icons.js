/*
 * src/icons.js —— 自绘图标集。
 *
 * 全部图标手绘于 24×24 网格，描边 2px、圆头圆角，风格统一；
 * 不使用 emoji、不使用外部图标库（质量线 A5 / G 禁项）。
 */
(function (root) {
  'use strict';
  root.CriedWolf = root.CriedWolf || {};

  var NS = 'http://www.w3.org/2000/svg';

  /* 每条命令是 [tag, attrs...] 的序列，统一描边、无填充。 */
  var SHAPES = {
    play: [['path', { d: 'M 8 5 L 19 12 L 8 19 Z' }]],
    pause: [['path', { d: 'M 9 5 L 9 19' }], ['path', { d: 'M 15 5 L 15 19' }]],
    restart: [['path', { d: 'M 19 12 A 7 7 0 1 1 12 5' }], ['path', { d: 'M 12 2 L 12 6 L 8 6' }]],
    captions: [['rect', { x: 3, y: 5, width: 18, height: 14, rx: 2 }], ['path', { d: 'M 10 10.5 A 2.6 2.6 0 1 0 10 13.5' }], ['path', { d: 'M 17 10.5 A 2.6 2.6 0 1 0 17 13.5' }]],
    fullscreen: [['path', { d: 'M 4 9 L 4 4 L 9 4' }], ['path', { d: 'M 20 9 L 20 4 L 15 4' }], ['path', { d: 'M 4 15 L 4 20 L 9 20' }], ['path', { d: 'M 20 15 L 20 20 L 15 20' }]],
    exitFullscreen: [['path', { d: 'M 9 4 L 9 9 L 4 9' }], ['path', { d: 'M 15 4 L 15 9 L 20 9' }], ['path', { d: 'M 9 20 L 9 15 L 4 15' }], ['path', { d: 'M 15 20 L 15 15 L 20 15' }]],
    volume: [['path', { d: 'M 4 9 L 8 9 L 13 5 L 13 19 L 8 15 L 4 15 Z' }], ['path', { d: 'M 16 9 A 4 4 0 0 1 16 15' }], ['path', { d: 'M 18.5 6.5 A 8 8 0 0 1 18.5 17.5' }]],
    muted: [['path', { d: 'M 4 9 L 8 9 L 13 5 L 13 19 L 8 15 L 4 15 Z' }], ['path', { d: 'M 17 9.5 L 21 14' }], ['path', { d: 'M 21 9.5 L 17 14' }]],
    error: [['circle', { cx: 12, cy: 12, r: 8.5 }], ['path', { d: 'M 12 7.5 L 12 12.5' }], ['path', { d: 'M 12 15.4 L 12 15.6' }]],
    success: [['circle', { cx: 12, cy: 12, r: 8.5 }], ['path', { d: 'M 8 12.2 L 11 15 L 16 9.5' }]],
    arrow: [['path', { d: 'M 5 12 L 19 12' }], ['path', { d: 'M 13 6 L 19 12 L 13 18' }]],
    check: [['path', { d: 'M 5 12.5 L 10 17.5 L 19 7' }]]
  };

  /**
   * 生成一个 <svg> 图标节点。
   * @param {string} name  SHAPES 中的名字
   * @param {number} size  边长（16 / 20 / 24）
   */
  function icon(name, size, tokens) {
    var stroke = (tokens && tokens.icon && tokens.icon.stroke) || 2;
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', String(size));
    svg.setAttribute('height', String(size));
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', String(stroke));
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', 'cw-icon cw-icon-' + name);
    var shapes = SHAPES[name] || SHAPES.error;
    shapes.forEach(function (def) {
      var tag = def[0];
      var attrs = {};
      Object.keys(def[1]).forEach(function (k) { attrs[k] = def[1][k]; });
      var node = document.createElementNS(NS, tag);
      Object.keys(attrs).forEach(function (k) { node.setAttribute(k, attrs[k]); });
      svg.appendChild(node);
    });
    return svg;
  }

  /** 用图标替换某个按钮里的文本内容，同时保留可读名称。 */
  function setIcon(target, name, size, tokens) {
    if (!target) return;
    var old = target.querySelector('svg');
    if (old) target.removeChild(old);
    var svg = icon(name, size, tokens);
    target.insertBefore(svg, target.firstChild);
  }

  root.CriedWolf.icons = { icon: icon, setIcon: setIcon, SHAPES: SHAPES };
})(typeof globalThis !== 'undefined' ? globalThis : this);
