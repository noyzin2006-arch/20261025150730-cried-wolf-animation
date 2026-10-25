/*
 * src/geometry.js —— 本项目全部原创矢量造型。
 *
 * 原则（对应规划案 §5.3 与质量线 A5）：
 *   - 全部图形由代码生成，无外部素材、无 emoji、无描边图片。
 *   - 所有颜色都来自 tokens.js 的调色板，本文件不出现任何颜色字面量。
 *   - 静态元素尽量合并为单个 path 的多个子路径（控制活动节点数 ≤ 450）。
 *   - 需要独立变换的部件（头 / 手臂 / 腿 / 躯干）才拆成独立 group。
 *
 * 坐标系：舞台 1600×900，角色局部坐标以「双脚站立点」为原点，向上为负 y。
 */
(function (root) {
  'use strict';
  root.CriedWolf = root.CriedWolf || {};

  var NS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs, parent) {
    var node = document.createElementNS(NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (attrs[k] === null || attrs[k] === undefined) return;
        node.setAttribute(k, String(attrs[k]));
      });
    }
    if (parent) parent.appendChild(node);
    return node;
  }

  function group(parent, attrs) {
    return el('g', attrs || {}, parent);
  }

  function path(parent, d, attrs) {
    var a = attrs || {};
    a.d = d;
    return el('path', a, parent);
  }

  function circle(parent, cx, cy, r, attrs) {
    var a = attrs || {};
    a.cx = cx; a.cy = cy; a.r = r;
    return el('circle', a, parent);
  }

  function ellipse(parent, cx, cy, rx, ry, attrs) {
    var a = attrs || {};
    a.cx = cx; a.cy = cy; a.rx = rx; a.ry = ry;
    return el('ellipse', a, parent);
  }

  function rect(parent, x, y, w, h, attrs) {
    var a = attrs || {};
    a.x = x; a.y = y; a.width = w; a.height = h;
    return el('rect', a, parent);
  }

  /* 固定种子哈希 → [0,1)，保证纸纹与散布完全可重现 */
  function hash2(x, y, seed) {
    var h = (x * 374761393 + y * 668265263 + seed * 1442695040888963407) >>> 0;
    h = (h ^ (h >>> 13)) >>> 0;
    h = Math.imul(h, 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }

  /* ==================================================================
   * 少年
   * 身高 175，头半径 25，橘色披风（宽 66 / 高 100），牧杖长 155。
   * ================================================================== */
  function createBoy(P) {
    var g = group(null, { 'class': 'actor actor-boy' });

    var legL = group(g, { 'class': 'boy-leg boy-leg-l', transform: 'translate(0,-70)' });
    path(legL, 'M -11 0 L 3 0 L 5 70 L -9 70 Z', { fill: P.boyTrouser, stroke: P.ink, 'stroke-width': 4, 'stroke-linejoin': 'round' });
    ellipse(legL, -2, 70, 13, 5, { fill: P.ink });

    var legR = group(g, { 'class': 'boy-leg boy-leg-r', transform: 'translate(0,-70)' });
    path(legR, 'M -3 0 L 11 0 L 9 70 L -5 70 Z', { fill: P.boyTrouser, stroke: P.ink, 'stroke-width': 4, 'stroke-linejoin': 'round' });
    ellipse(legR, 2, 70, 13, 5, { fill: P.ink });

    var torso = group(g, { 'class': 'boy-torso' });
    path(torso, 'M -19 -134 L 19 -134 L 16 -68 L -16 -68 Z', { fill: P.boySkin, stroke: P.ink, 'stroke-width': 4, 'stroke-linejoin': 'round' });
    path(torso, 'M -24 -136 L 24 -136 L 29 -52 L -29 -52 Z', {
      'class': 'boy-cape', fill: P.boyCape, stroke: P.ink, 'stroke-width': 4, 'stroke-linejoin': 'round'
    });
    path(torso, 'M -24 -136 L 24 -136 L 22 -120 L -22 -120 Z', { fill: P.boyCapeDark, stroke: P.ink, 'stroke-width': 3, 'stroke-linejoin': 'round' });

    var staff = group(g, { 'class': 'boy-staff', transform: 'translate(-27,-94) rotate(-5)' });
    rect(staff, -3.5, -60, 7, 155, { fill: P.trunk, stroke: P.ink, 'stroke-width': 3.2, rx: 3.5 });

    var neck = path(g, 'M -7 -142 L 7 -142 L 7 -128 L -7 -128 Z',
      { fill: P.boySkin, stroke: P.ink, 'stroke-width': 3.4, 'stroke-linejoin': 'round' });

    var head = group(g, { 'class': 'boy-head', transform: 'translate(0,-150)' });
    circle(head, 0, 0, 27, { fill: P.boySkin, stroke: P.ink, 'stroke-width': 4.2 });
    /* 碗状短发：沿颅顶一圈，额前留一道齐眉 */
    path(head, 'M -27 2 C -28 -24 -14 -33 0 -33 C 14 -33 28 -24 27 2 '
      + 'C 22 -10 12 -17 0 -17 C -12 -17 -22 -10 -27 2 Z',
      { fill: P.boyHair, stroke: P.ink, 'stroke-width': 3.2, 'stroke-linejoin': 'round' });
    path(head, 'M -25 -6 C -20 -18 -12 -24 0 -24 C 12 -24 20 -18 25 -6',
      { fill: 'none', stroke: P.ink, 'stroke-width': 2.2, 'stroke-linecap': 'round', opacity: 0.45 });
    var eyes = group(head, { 'class': 'boy-eyes' });
    circle(eyes, -9, -3, 3.2, { fill: P.ink });
    circle(eyes, 9, -3, 3.2, { fill: P.ink });
    path(head, 'M -5 10 Q 0 14 5 10', { 'class': 'boy-mouth', fill: 'none', stroke: P.ink, 'stroke-width': 2.8, 'stroke-linecap': 'round' });

    var armL = group(g, { 'class': 'boy-arm boy-arm-l', transform: 'translate(-18,-126)' });
    path(armL, 'M -6 0 L 7 0 L 8 42 L -7 42 Z', { fill: P.boySkin, stroke: P.ink, 'stroke-width': 3, 'stroke-linejoin': 'round' });
    circle(armL, 0, 45, 7, { fill: P.boySkin, stroke: P.ink, 'stroke-width': 2.6 });

    var armR = group(g, { 'class': 'boy-arm boy-arm-r', transform: 'translate(18,-126)' });
    path(armR, 'M -7 0 L 6 0 L 7 42 L -8 42 Z', { fill: P.boySkin, stroke: P.ink, 'stroke-width': 3, 'stroke-linejoin': 'round' });
    circle(armR, 0, 45, 7, { fill: P.boySkin, stroke: P.ink, 'stroke-width': 2.6 });

    return {
      root: g,
      parts: { head: head, eyes: eyes, torso: torso, armL: armL, armR: armR, legL: legL, legR: legR, staff: staff, cape: torso.querySelector('.boy-cape') }
    };
  }

  /* ==================================================================
   * 羊：体长 110、高 70；5 个相交羊毛块 + 4 条短腿 + 墨色小脸 + 单枚金铃
   * variant: 'near' | 'mid' | 'far'
   * ================================================================== */
  function createSheep(P, variant) {
    var g = group(null, { 'class': 'actor actor-sheep' });
    var near = variant === 'near';
    var mid = variant === 'mid';
    var lineW = near ? 4 : mid ? 3.4 : 0;

    var body = group(g, { 'class': 'sheep-body' });
    var bodyD = 'M -52 -22 C -56 -40 -38 -52 -18 -48 C -6 -58 12 -56 20 -46 C 38 -48 52 -36 50 -20 '
      + 'C 48 -2 30 6 8 6 C -14 6 -34 4 -44 -6 C -50 -10 -52 -16 -52 -22 Z';
    path(body, bodyD, {
      fill: mid ? P.woolShade : P.sheep, stroke: P.ink, 'stroke-width': lineW,
      'stroke-linejoin': 'round', 'stroke-linecap': 'round'
    });
    if (near) {
      path(body, 'M -30 2 C -22 8 -6 10 6 8 C -2 2 -14 -2 -30 2 Z', { fill: P.woolShade, opacity: 0.75 });
    }
    /* 四条短直腿合并为一条路径 */
    path(body, 'M -38 0 L -30 0 L -31 22 L -39 22 Z M -20 2 L -12 2 L -13 24 L -21 24 Z '
      + 'M 16 2 L 24 2 L 25 24 L 17 24 Z M 34 0 L 42 0 L 43 22 L 35 22 Z',
      { fill: P.ink, stroke: 'none', opacity: near ? 0.92 : 0.75 });

    var head = group(g, { 'class': 'sheep-head', transform: 'translate(-48,-34)' });
    ellipse(head, 0, 0, 13, 15, { fill: mid ? P.woolShade : P.sheep, stroke: P.ink, 'stroke-width': lineW, 'stroke-linejoin': 'round' });
    ellipse(head, -6, 4, 8, 10, { fill: P.ink, stroke: 'none', opacity: near ? 1 : 0.85 });
    if (near) {
      circle(head, -8, 1, 2.2, { fill: P.sheep });
      path(head, 'M 2 -4 A 5 5 0 0 1 8 0', { fill: 'none', stroke: P.ink, 'stroke-width': 2.2, 'stroke-linecap': 'round' });
    }
    /* 金铃（挂在颈下） */
    path(head, 'M 6 12 L 10 12 L 11 20 L 5 20 Z', { fill: P.bell, stroke: P.ink, 'stroke-width': 2, 'stroke-linejoin': 'round' });
    circle(head, 8, 23, 4.6, { 'class': 'sheep-bell', fill: P.bell, stroke: P.ink, 'stroke-width': 2 });

    return { root: g, parts: { body: body, head: head, bell: head.querySelector('.sheep-bell') } };
  }

  /* ==================================================================
   * 村民：三个剪纸人（麦黄围巾老人 / 石蓝围裙妇人 / 灰褐背篓青年）
   * kind: 'elder' | 'woman' | 'youth'
   * ================================================================== */
  function createVillager(P, kind) {
    var g = group(null, { 'class': 'actor actor-villager actor-v-' + kind });
    var h = kind === 'elder' ? 170 : (kind === 'woman' ? 158 : 180);
    var s = h / 175;
    var cloth = kind === 'elder' ? P.villager : (kind === 'woman' ? P.apronStone : P.villagerDark);
    var accent = kind === 'elder' ? P.scarfElder : (kind === 'woman' ? P.apronStone : P.basketBrown);
    var hipY = -68 * s;
    var shoulderY = -128 * s;

    var body = group(g, { 'class': 'v-body' });
    /* 长袍：肩宽 → 摆宽 */
    path(body, 'M -17 ' + shoulderY + ' L 17 ' + shoulderY + ' L 22 ' + hipY + ' L -22 ' + hipY + ' Z',
      { fill: cloth, stroke: P.ink, 'stroke-width': 4, 'stroke-linejoin': 'round' });
    if (kind === 'woman') {
      path(body, 'M -13 ' + (shoulderY + 22) + ' L 13 ' + (shoulderY + 22) + ' L 16 ' + hipY + ' L -16 ' + hipY + ' Z',
        { fill: accent, stroke: P.ink, 'stroke-width': 3, 'stroke-linejoin': 'round' });
    }
    if (kind === 'youth') {
      /* 背篓 */
      path(body, 'M -34 ' + (shoulderY + 6) + ' L -18 ' + (shoulderY + 2) + ' L -20 ' + (hipY - 4) + ' L -36 ' + (hipY) + ' Z',
        { fill: accent, stroke: P.ink, 'stroke-width': 3.4, 'stroke-linejoin': 'round' });
      path(body, 'M -33 ' + (shoulderY + 18) + ' L -20 ' + (shoulderY + 15), { fill: 'none', stroke: P.ink, 'stroke-width': 2.4, 'stroke-linecap': 'round' });
    }

    var legL = group(g, { 'class': 'v-leg v-leg-l', transform: 'translate(0,' + hipY + ')' });
    path(legL, 'M -12 0 L 2 0 L 3 ' + (68 * s) + ' L -10 ' + (68 * s) + ' Z', { fill: P.ink, stroke: 'none', opacity: 0.9 });
    var legR = group(g, { 'class': 'v-leg v-leg-r', transform: 'translate(0,' + hipY + ')' });
    path(legR, 'M -2 0 L 12 0 L 10 ' + (68 * s) + ' L -3 ' + (68 * s) + ' Z', { fill: P.ink, stroke: 'none', opacity: 0.9 });

    var armL = group(g, { 'class': 'v-arm v-arm-l', transform: 'translate(-16,' + shoulderY + ')' });
    path(armL, 'M -4 0 L 4 0 L 5 ' + (44 * s) + ' L -5 ' + (44 * s) + ' Z', { fill: cloth, stroke: P.ink, 'stroke-width': 3.4, 'stroke-linejoin': 'round' });
    var armR = group(g, { 'class': 'v-arm v-arm-r', transform: 'translate(16,' + shoulderY + ')' });
    path(armR, 'M -4 0 L 4 0 L 5 ' + (44 * s) + ' L -5 ' + (44 * s) + ' Z', { fill: cloth, stroke: P.ink, 'stroke-width': 3.4, 'stroke-linejoin': 'round' });

    var head = group(g, { 'class': 'v-head', transform: 'translate(0,' + (shoulderY - 26 * s) + ')' });
    path(head, 'M -16 -18 L 16 -18 L 14 16 L -14 16 Z',
      { fill: P.boySkin, stroke: P.ink, 'stroke-width': 4, 'stroke-linejoin': 'round' });
    /* 方头巾 */
    path(head, 'M -17 -19 L 17 -19 L 15 -4 L -15 -4 Z', { fill: accent, stroke: P.ink, 'stroke-width': 3.4, 'stroke-linejoin': 'round' });
    if (kind === 'elder') {
      path(head, 'M -15 -4 L 15 -4 L 12 12 L -12 12 Z', { fill: accent, stroke: 'none', opacity: 0.95 });
    }
    circle(head, -6, 2, 2.4, { fill: P.ink });
    circle(head, 6, 2, 2.4, { fill: P.ink });
    path(head, 'M -5 10 L 5 10', { fill: 'none', stroke: P.ink, 'stroke-width': 2.4, 'stroke-linecap': 'round' });

    return { root: g, parts: { head: head, body: body, armL: armL, armR: armR, legL: legL, legR: legR }, height: h };
  }

  /* ==================================================================
   * 真狼：体长 210、肩高 94、三角耳、尖鼻、细长尾、四腿
   * ================================================================== */
  function createWolf(P) {
    var g = group(null, { 'class': 'actor actor-wolf' });

    var body = group(g, { 'class': 'wolf-body' });
    path(body, 'M -88 -40 C -92 -66 -62 -82 -26 -78 C 6 -74 40 -66 66 -58 '
      + 'C 86 -52 96 -40 94 -30 C 92 -18 70 -14 44 -16 C 6 -18 -34 -14 -60 -20 C -78 -24 -86 -30 -88 -40 Z',
      { fill: P.wolf, stroke: P.wolfRim, 'stroke-width': 4.4, 'stroke-linejoin': 'round' });
    /* 四条腿 */
    path(body, 'M -62 -28 L -48 -28 L -46 0 L -60 0 Z M -34 -22 L -22 -22 L -20 0 L -32 0 Z '
      + 'M 40 -26 L 54 -26 L 56 0 L 42 0 Z M 66 -34 L 78 -34 L 80 0 L 68 0 Z',
      { fill: P.wolf, stroke: P.ink, 'stroke-width': 3.6, 'stroke-linejoin': 'round' });

    var tail = group(g, { 'class': 'wolf-tail', transform: 'translate(-84,-44)' });
    path(tail, 'M 0 0 C -22 -6 -38 -18 -44 -40 C -34 -26 -18 -16 2 -10 Z',
      { fill: P.wolf, stroke: P.ink, 'stroke-width': 3.6, 'stroke-linejoin': 'round' });

    var head = group(g, { 'class': 'wolf-head', transform: 'translate(88,-58)' });
    path(head, 'M -14 -18 L 2 -34 L 4 -14 Z', { fill: P.wolf, stroke: P.ink, 'stroke-width': 3.4, 'stroke-linejoin': 'round' });
    path(head, 'M 16 -18 L 32 -34 L 30 -12 Z', { fill: P.wolf, stroke: P.ink, 'stroke-width': 3.4, 'stroke-linejoin': 'round' });
    path(head, 'M -18 -12 C -14 -30 6 -36 24 -30 C 40 -25 50 -12 48 -2 C 46 8 34 14 20 12 C 4 10 -12 4 -18 -12 Z',
      { fill: P.wolf, stroke: P.wolfRim, 'stroke-width': 4.2, 'stroke-linejoin': 'round' });
    path(head, 'M 44 -4 L 62 4 L 44 10 Z', { fill: P.wolf, stroke: P.ink, 'stroke-width': 3.4, 'stroke-linejoin': 'round' });
    var eyes = group(head, { 'class': 'wolf-eyes' });
    circle(eyes, 22, -8, 4.4, { fill: P.wolfEye });
    circle(eyes, 36, -6, 4.4, { fill: P.wolfEye });
    path(head, 'M 46 8 L 56 10 L 46 12 Z', { fill: P.dangerRed, stroke: 'none', opacity: 0.85 });

    return { root: g, parts: { head: head, body: body, tail: tail, eyes: eyes } };
  }

  /* ==================================================================
   * 地景：分层（天 / 天体 / 远山 / 中景村 / 地面路 / 前景草）
   * ================================================================== */
  function createLandscape(P, seed) {
    var root = group(null, { 'class': 'scene-landscape' });

    /* --- L0 天空 --- */
    var sky = group(root, { 'class': 'layer-sky' });
    var skyDefs = el('defs', {}, sky);
    var skyGrad = el('linearGradient', { id: 'cw-sky-' + P.name, x1: '0', y1: '0', x2: '0', y2: '1' }, skyDefs);
    el('stop', { offset: '0%', 'stop-color': P.skyBand }, skyGrad);
    el('stop', { offset: '68%', 'stop-color': P.sky }, skyGrad);
    el('stop', { offset: '100%', 'stop-color': P.sky }, skyGrad);
    rect(sky, 0, 0, 1600, 900, { fill: 'url(#cw-sky-' + P.name + ')' });

    /* --- L1 天体与云 --- */
    var celestial = group(root, { 'class': 'layer-celestial' });
    circle(celestial, 1180, 250, 86, { fill: P.sun, opacity: 0.28 });
    circle(celestial, 1180, 250, 54, { fill: P.sunCore });
    path(celestial, 'M 980 150 C 1040 118 1140 122 1180 156 C 1230 132 1320 148 1344 186 '
      + 'C 1300 206 1010 206 980 150 Z', { fill: P.cloud, opacity: 0.9 });
    path(celestial, 'M 120 232 C 176 204 258 210 292 238 C 340 216 420 232 438 264 '
      + 'C 380 280 160 280 120 232 Z', { fill: P.cloud, opacity: 0.75 });
    path(celestial, 'M 470 96 C 520 76 584 84 606 108 C 648 92 708 108 720 132 '
      + 'C 660 144 508 142 470 96 Z', { fill: P.cloudShade, opacity: 0.6 });

    /* --- L2 远山（三重山脊） --- */
    var far = group(root, { 'class': 'layer-far-hills' });
    path(far, 'M 0 470 C 190 404 330 452 470 424 C 610 396 700 452 840 434 C 980 416 1080 366 1210 396 '
      + 'C 1350 428 1460 388 1600 404 L 1600 560 L 0 560 Z', { fill: P.farHill });
    path(far, 'M 0 520 C 220 470 380 508 540 486 C 700 464 820 508 980 494 C 1140 480 1300 442 1440 468 '
      + 'C 1510 480 1560 470 1600 478 L 1600 580 L 0 580 Z', { fill: P.farHillDark });
    /* 剪纸的切口：每道山脊留一条墨线 */
    path(far, 'M 0 470 C 190 404 330 452 470 424 C 610 396 700 452 840 434 C 980 416 1080 366 1210 396 '
      + 'C 1350 428 1460 388 1600 404', { fill: 'none', stroke: P.ridge, 'stroke-width': 3.5, opacity: 0.45, 'stroke-linecap': 'round' });
    path(far, 'M 0 520 C 220 470 380 508 540 486 C 700 464 820 508 980 494 C 1140 480 1300 442 1440 468 '
      + 'C 1510 480 1560 470 1600 478', { fill: 'none', stroke: P.ridge, 'stroke-width': 3, opacity: 0.34, 'stroke-linecap': 'round' });

    /* --- L3 中景山脊 + 村庄 + 树 --- */
    var mid = group(root, { 'class': 'layer-mid' });
    path(mid, 'M 0 592 C 230 556 420 520 620 470 C 820 420 1000 386 1200 372 '
      + 'C 1360 361 1480 376 1600 392 L 1600 900 L 0 900 Z', { fill: P.midHill });
    path(mid, 'M 0 660 C 250 626 430 588 640 536 C 850 484 1030 444 1230 430 '
      + 'C 1380 419 1490 432 1600 448 L 1600 900 L 0 900 Z', { fill: P.midHillDark });
    path(mid, 'M 0 592 C 230 556 420 520 620 470 C 820 420 1000 386 1200 372 '
      + 'C 1360 361 1480 376 1600 392', { fill: 'none', stroke: P.ridge, 'stroke-width': 3.5, opacity: 0.4, 'stroke-linecap': 'round' });
    path(mid, 'M 0 660 C 250 626 430 588 640 536 C 850 484 1030 444 1230 430 '
      + 'C 1380 419 1490 432 1600 448', { fill: 'none', stroke: P.ridge, 'stroke-width': 3, opacity: 0.3, 'stroke-linecap': 'round' });

    /* --- L4 村庄、树、路 --- */
    var village = group(root, { 'class': 'layer-village' });
    var houses = 'M 148 768 L 148 712 L 186 690 L 224 712 L 224 768 Z '
      + 'M 238 772 L 238 700 L 284 672 L 330 700 L 330 772 Z '
      + 'M 348 766 L 348 722 L 386 702 L 424 722 L 424 766 Z';
    path(village, houses, { fill: P.house, stroke: P.ink, 'stroke-width': 3.6, 'stroke-linejoin': 'round' });
    path(village, 'M 142 714 L 186 686 L 230 714 Z M 232 702 L 284 670 L 336 702 Z M 342 724 L 386 700 L 430 724 Z',
      { fill: P.houseRoof, stroke: P.ink, 'stroke-width': 3.4, 'stroke-linejoin': 'round' });
    path(village, 'M 178 768 L 178 740 L 194 740 L 194 768 Z M 272 772 L 272 736 L 292 736 L 292 772 Z M 378 766 L 378 742 L 392 742 L 392 766 Z',
      { fill: P.houseDoor, stroke: P.ink, 'stroke-width': 2.6 });
    path(village, 'M 158 726 L 172 726 L 172 740 L 158 740 Z M 300 712 L 316 712 L 316 726 L 300 726 Z M 404 730 L 416 730 L 416 742 L 404 742 Z',
      { fill: P.window, stroke: P.ink, 'stroke-width': 2.4 });
    /* 烟囱与远屋 */
    path(village, 'M 204 712 L 212 712 L 212 694 L 204 694 Z', { fill: P.houseRoof, stroke: P.ink, 'stroke-width': 2.4 });

    var trees = group(root, { 'class': 'layer-trees' });
    path(trees, 'M 470 700 L 470 640 L 482 640 L 482 700 Z M 700 660 L 700 596 L 713 596 L 713 660 Z',
      { fill: P.trunk, stroke: P.ink, 'stroke-width': 3.4 });
    path(trees, 'M 436 648 C 430 600 470 574 512 590 C 542 602 546 634 530 652 '
      + 'C 500 668 448 664 436 648 Z', { fill: P.tree, stroke: P.ink, 'stroke-width': 3.4, 'stroke-linejoin': 'round' });
    path(trees, 'M 664 604 C 658 556 700 530 742 548 C 774 560 778 594 760 610 '
      + 'C 730 626 678 622 664 604 Z', { fill: P.treeDark, stroke: P.ink, 'stroke-width': 3.4, 'stroke-linejoin': 'round' });

    /* --- L5 地面与山路 --- */
    var ground = group(root, { 'class': 'layer-ground' });
    path(ground, 'M 0 700 C 250 668 460 626 680 572 C 900 518 1120 470 1340 446 '
      + 'C 1440 435 1530 432 1600 434 L 1600 900 L 0 900 Z', { fill: P.ground });
    path(ground, 'M 0 742 C 260 712 470 670 690 616 C 910 562 1130 512 1350 486 '
      + 'C 1450 475 1535 472 1600 474 L 1600 900 L 0 900 Z', { fill: P.groundDark, opacity: 0.55 });
    /* 山路：从村口 (335,710) 弯向 (980,515) */
    path(ground, 'M 268 788 C 396 744 512 698 646 652 C 786 604 898 566 1018 524 '
      + 'C 1006 552 930 588 838 620 C 728 658 616 704 514 746 C 424 782 346 806 268 810 Z',
      { fill: P.path, stroke: P.ink, 'stroke-width': 3, 'stroke-linejoin': 'round', opacity: 0.96 });
    path(ground, 'M 268 788 C 396 744 512 698 646 652 C 786 604 898 566 1018 524',
      { fill: 'none', stroke: P.pathDark, 'stroke-width': 2.4, 'stroke-linecap': 'round', opacity: 0.55 });
    path(ground, 'M 268 810 C 346 806 424 782 514 746 C 616 704 728 658 838 620 C 930 588 1006 552 1018 524',
      { fill: 'none', stroke: P.pathDark, 'stroke-width': 2.4, 'stroke-linecap': 'round', opacity: 0.45 });
    /* 石头 */
    path(ground, 'M 1180 640 C 1192 626 1214 628 1220 642 C 1214 656 1188 656 1180 640 Z '
      + 'M 1380 700 C 1394 684 1420 688 1424 702 C 1416 718 1388 716 1380 700 Z '
      + 'M 760 760 C 772 746 794 750 798 762 C 790 776 766 774 760 760 Z',
      { fill: P.rock, stroke: P.ink, 'stroke-width': 2.6, 'stroke-linejoin': 'round' });

    /* --- L6 前景草与叶 --- */
    var foreground = group(root, { 'class': 'layer-foreground' });
    var blades = '';
    for (var i = 0; i < 22; i++) {
      var bx = 40 + i * 72 + hash2(i, 3, seed) * 30;
      var by = 900 - hash2(i, 7, seed) * 26;
      var hgt = 34 + hash2(i, 11, seed) * 40;
      var lean = (hash2(i, 13, seed) - 0.5) * 26;
      blades += 'M ' + bx.toFixed(1) + ' ' + by.toFixed(1)
        + ' Q ' + (bx + lean * 0.5).toFixed(1) + ' ' + (by - hgt * 0.6).toFixed(1)
        + ' ' + (bx + lean).toFixed(1) + ' ' + (by - hgt).toFixed(1)
        + ' L ' + (bx + lean + 4).toFixed(1) + ' ' + (by - hgt + 4).toFixed(1)
        + ' Q ' + (bx + lean * 0.5 + 5).toFixed(1) + ' ' + (by - hgt * 0.55).toFixed(1)
        + ' ' + (bx + 5).toFixed(1) + ' ' + by.toFixed(1) + ' Z ';
    }
    path(foreground, blades, { fill: P.grass, opacity: 0.9 });
    path(foreground, 'M 0 846 C 200 828 340 856 520 842 C 720 826 900 852 1100 838 '
      + 'C 1290 824 1450 848 1600 834 L 1600 900 L 0 900 Z', { fill: P.grassTip, opacity: 0.55 });

    /* --- L7 纸纹（单 path 多子路径，确定性种子） --- */
    var texture = group(root, { 'class': 'layer-texture' });
    var strokes = '';
    for (var k = 0; k < 170; k++) {
      var sx = hash2(k, 101, seed) * 1600;
      var sy = hash2(k, 103, seed) * 900;
      var len = 2 + hash2(k, 107, seed) * 4;
      var ang = hash2(k, 109, seed) * Math.PI;
      strokes += 'M ' + sx.toFixed(1) + ' ' + sy.toFixed(1)
        + ' l ' + (Math.cos(ang) * len).toFixed(1) + ' ' + (Math.sin(ang) * len).toFixed(1) + ' ';
    }
    path(texture, strokes, { fill: 'none', stroke: P.ink, 'stroke-width': 1.6, opacity: 0.07, 'stroke-linecap': 'round' });

    return {
      root: root,
      layers: {
        sky: sky, celestial: celestial, far: far, mid: mid,
        village: village, trees: trees, ground: ground, foreground: foreground, texture: texture
      }
    };
  }

  /* ==================================================================
   * 场景特效（每镜按 effectIds 挂载）
   * ================================================================== */
  function createEchoWaves(P, count, broken) {
    var g = group(null, { 'class': 'effect effect-echo' });
    var d = '';
    for (var i = 0; i < count; i++) {
      var r = 46 + i * 52;
      var gap = broken ? (i % 2 === 0 ? 0.25 : 0.7) : 0;
      var a0 = -0.9 + gap;
      var a1 = 0.9 - gap;
      d += 'M ' + (Math.cos(a0) * r).toFixed(1) + ' ' + (Math.sin(a0) * r).toFixed(1)
        + ' A ' + r + ' ' + r + ' 0 0 1 ' + (Math.cos(a1) * r).toFixed(1) + ' ' + (Math.sin(a1) * r).toFixed(1) + ' ';
    }
    path(g, d, { fill: 'none', stroke: P.echo, 'stroke-width': 7, 'stroke-linecap': 'round', opacity: 0.9 });
    return g;
  }

  function createBranchShadow(P) {
    var g = group(null, { 'class': 'effect effect-branch' });
    path(g, 'M -10 0 C 40 -46 96 -78 168 -96 M 60 -54 C 84 -78 118 -92 150 -96',
      { fill: 'none', stroke: P.ridge, 'stroke-width': 11, 'stroke-linecap': 'round', opacity: 0.72 });
    path(g, 'M 120 -82 L 176 -122 L 150 -96 Z', { fill: P.ridge, opacity: 0.6 });
    return g;
  }

  /* 实枝：与影子同一形状，但有树皮与叶子 */
  function createRealBranch(P) {
    var g = group(null, { 'class': 'effect effect-real-branch' });
    path(g, 'M -10 0 C 40 -46 96 -78 168 -96 M 60 -54 C 84 -78 118 -92 150 -96',
      { fill: 'none', stroke: P.trunk, 'stroke-width': 13, 'stroke-linecap': 'round' });
    path(g, 'M 104 -72 C 74 -92 48 -100 20 -96 C 46 -78 76 -66 104 -72 Z '
      + 'M 152 -94 C 172 -114 196 -122 222 -116 C 196 -98 174 -86 152 -94 Z',
      { fill: P.tree, stroke: P.ink, 'stroke-width': 3.4, 'stroke-linejoin': 'round' });
    return g;
  }

  function createEndCard(P) {
    var g = group(null, { 'class': 'effect effect-endcard' });
    rect(g, 0, 0, 1600, 900, { fill: P.sky });
    /* 极淡远山 */
    path(g, 'M 0 690 C 240 646 420 616 640 594 C 860 572 1080 560 1300 556 '
      + 'C 1420 554 1520 560 1600 566 L 1600 900 L 0 900 Z', { fill: P.farHill, opacity: 0.45 });
    /* 三道断开的同心回声弧：以金铃为圆心，向右上散开 */
    var cx = 800, cy = 648;
    var arcs = '';
    [62, 98, 134].forEach(function (r) {
      arcs += 'M ' + (cx - r).toFixed(0) + ' ' + cy + ' A ' + r + ' ' + r + ' 0 0 1 '
        + (cx + r * 0.72).toFixed(0) + ' ' + (cy - r * 0.69).toFixed(0) + ' ';
      arcs += 'M ' + (cx - r * 0.52).toFixed(0) + ' ' + cy + ' A ' + (r * 0.8).toFixed(0) + ' ' + (r * 0.8).toFixed(0)
        + ' 0 0 1 ' + (cx + r * 0.3).toFixed(0) + ' ' + (cy - r * 0.28).toFixed(0) + ' ';
    });
    path(g, arcs, { fill: 'none', stroke: P.echo, 'stroke-width': 4.5, 'stroke-linecap': 'round', opacity: 0.8 });
    /* 静止金铃（盖在弧线之上） */
    path(g, 'M ' + (cx - 17) + ' ' + (cy - 26) + ' L ' + (cx + 17) + ' ' + (cy - 26) + ' L ' + (cx + 22) + ' '
      + (cy + 8) + ' L ' + (cx - 22) + ' ' + (cy + 8) + ' Z',
      { fill: P.bell, stroke: P.ink, 'stroke-width': 4, 'stroke-linejoin': 'round' });
    circle(g, cx, cy + 20, 17, { fill: P.bell, stroke: P.ink, 'stroke-width': 4 });
    path(g, 'M ' + (cx - 6) + ' ' + (cy + 36) + ' L ' + (cx + 6) + ' ' + (cy + 36) + ' L ' + (cx + 6) + ' '
      + (cy + 52) + ' L ' + (cx - 6) + ' ' + (cy + 52) + ' Z', { fill: P.ink });
    return g;
  }

  /* ==================================================================
   * 开场卡：暖纸底 + 麦黄圆日 + 五重山形 + 片名与副题
   * ================================================================== */
  function createOpeningCard(P) {
    var g = group(null, { 'class': 'effect effect-opening' });
    rect(g, 0, 0, 1600, 900, { fill: P.paper });

    /* 麦黄圆日（单独分组，开场 1s 内淡显） */
    var sunG = group(g, { 'class': 'opening-sun' });
    circle(sunG, 1180, 250, 96, { fill: P.sun, opacity: 0.24 });
    circle(sunG, 1180, 250, 58, { fill: P.sun });
    circle(sunG, 1180, 250, 40, { fill: P.sunCore });

    /* 五重山形：y 480 / 525 / 620 / 700 / 770 */
    path(g, 'M 0 480 C 220 440 420 462 640 478 C 900 496 1160 452 1400 468 C 1490 474 1560 482 1600 488 '
      + 'L 1600 900 L 0 900 Z', { fill: P.farHill, opacity: 0.9 });
    path(g, 'M 0 525 C 240 496 460 512 700 524 C 940 536 1180 506 1400 514 C 1490 517 1560 522 1600 528 '
      + 'L 1600 900 L 0 900 Z', { fill: P.farHillDark, opacity: 0.92 });
    path(g, 'M 0 620 C 260 588 480 594 720 616 C 980 640 1220 606 1440 622 C 1500 626 1560 632 1600 638 '
      + 'L 1600 900 L 0 900 Z', { fill: P.midHill });
    path(g, 'M 0 700 C 280 664 500 664 740 694 C 1000 726 1240 686 1450 702 C 1508 706 1560 712 1600 718 '
      + 'L 1600 900 L 0 900 Z', { fill: P.midHillDark });
    path(g, 'M 0 770 C 300 736 520 734 760 762 C 1020 792 1250 754 1460 768 C 1512 772 1560 778 1600 784 '
      + 'L 1600 900 L 0 900 Z', { fill: P.nearHill });

    /* 片名与副题 */
    var t1 = el('text', {
      x: 800, y: 352, 'text-anchor': 'middle', 'class': 'film-title',
      fill: P.ink, 'font-family': "'PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans CJK SC',sans-serif",
      'font-size': 104, 'font-weight': 700, 'letter-spacing': '0.14em'
    }, g);
    t1.textContent = '狼来了';
    var t2 = el('text', {
      x: 800, y: 424, 'text-anchor': 'middle', 'class': 'film-subtitle',
      fill: P.ink, 'font-family': "'PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans CJK SC',sans-serif",
      'font-size': 42, 'font-weight': 500, 'letter-spacing': '0.3em'
    }, g);
    t2.textContent = '回声的代价';

    /* 左下角三道羊铃纹 */
    var sd = '';
    [22, 34, 46].forEach(function (r) {
      sd += 'M ' + (150 - r) + ' 826 A ' + r + ' ' + r + ' 0 0 1 ' + (150 + r * 0.7) + ' ' + (826 - r * 0.7) + ' ';
    });
    path(g, sd, { fill: 'none', stroke: P.ink, 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.35 });
    path(g, 'M 142 812 L 150 812 L 152 826 L 140 826 Z', { fill: P.bell, stroke: P.ink, 'stroke-width': 2.4, 'stroke-linejoin': 'round' });
    circle(g, 146, 832, 6, { fill: P.bell, stroke: P.ink, 'stroke-width': 2.4 });

    return { root: g, sun: sunG, title: t1, sub: t2 };
  }

  root.CriedWolf.geometry = {
    NS: NS,
    el: el, group: group, path: path, circle: circle, ellipse: ellipse, rect: rect,
    hash2: hash2,
    createBoy: createBoy,
    createSheep: createSheep,
    createVillager: createVillager,
    createWolf: createWolf,
    createLandscape: createLandscape,
    createEchoWaves: createEchoWaves,
    createBranchShadow: createBranchShadow,
    createRealBranch: createRealBranch,
    createEndCard: createEndCard,
    createOpeningCard: createOpeningCard
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
