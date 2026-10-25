/*
 * src/scene.js —— 场景渲染器。
 *
 * 硬约束（规划案 §5.4 / §5.5 / AC05 / AC06）：
 *   - renderAt(t) 是纯函数：同一 t 必然得到同一画面，不依赖真实时钟与随机数。
 *   - 镜头内只修改 SVG group 的 transform 与 opacity，绝不动画 path d / 宽高 / top / left。
 *   - 场景根节点是固定 DOM；只把「当前镜头 + 叠化中的前一个镜头」挂在 DOM 上，
 *     其余镜头节点缓存为游离节点，因此 seek 次数增加时 DOM 元素数不增长。
 */
(function (root) {
  'use strict';
  root.CriedWolf = root.CriedWolf || {};

  var G = root.CriedWolf.geometry;
  var T = root.CriedWolf.tokens;
  var TL = root.CriedWolf.timeline;

  var PARALLAX = {
    sky: 0, celestial: 0.08, far: 0.18, mid: 0.40,
    ground: 0.70, actors: 1.00, foreground: 1.20, texture: 0
  };

  /* 每镜的演员配置：谁出场、几个人、在群体中的偏移。 */
  var CAST = {
    s01: { sheep: 0, villagers: [], boy: false, wolf: false, spread: 1 },
    s02: { sheep: 11, villagers: [], boy: true, wolf: false, spread: 1.00 },
    s03: { sheep: 6, villagers: [], boy: true, wolf: false, spread: 0.72 },
    s04: { sheep: 8, villagers: [], boy: true, wolf: false, spread: 0.78 },
    s05: { sheep: 6, villagers: ['woman', 'youth', 'elder'], boy: true, wolf: false, spread: 0.66 },
    s06: { sheep: 5, villagers: ['elder', 'woman', 'youth'], boy: true, wolf: false, spread: 0.62 },
    s07: { sheep: 6, villagers: [], boy: true, wolf: false, spread: 0.60 },
    s08: { sheep: 5, villagers: [], boy: true, wolf: false, spread: 0.66 },
    s09: { sheep: 4, villagers: ['elder', 'youth', 'woman'], boy: true, wolf: false, spread: 0.72 },
    s10: { sheep: 0, villagers: ['woman', 'youth', 'elder'], boy: true, wolf: false, spread: 1 },
    s11: { sheep: 8, villagers: [], boy: true, wolf: true, spread: 0.74 },
    s12: { sheep: 8, villagers: [], boy: true, wolf: true, spread: 0.80 },
    s13: { sheep: 0, villagers: ['elder', 'woman', 'youth'], boy: false, wolf: false, spread: 1 },
    s14: { sheep: 6, villagers: [], boy: true, wolf: true, spread: 0.78 },
    s15: { sheep: 0, villagers: [], boy: false, wolf: false, spread: 1 }
  };

  /* 羊群个体布局：近 3 / 中 3 / 远 5，共 11 只 */
  var SHEEP_LAYOUT = [
    { dx: -128, dy: -34, scale: 1.00, variant: 'near', phase: 0.00 },
    { dx: -46, dy: 12, scale: 1.00, variant: 'near', phase: 0.11 },
    { dx: 52, dy: -18, scale: 1.00, variant: 'near', phase: 0.23 },
    { dx: -176, dy: -78, scale: 0.78, variant: 'mid', phase: 0.37 },
    { dx: 104, dy: -66, scale: 0.78, variant: 'mid', phase: 0.11 },
    { dx: 206, dy: -14, scale: 0.78, variant: 'mid', phase: 0.23 },
    { dx: -252, dy: -118, scale: 0.58, variant: 'far', phase: 0.37 },
    { dx: -158, dy: -142, scale: 0.58, variant: 'far', phase: 0.11 },
    { dx: -54, dy: -126, scale: 0.58, variant: 'far', phase: 0.23 },
    { dx: 66, dy: -134, scale: 0.58, variant: 'far', phase: 0.37 },
    { dx: 178, dy: -108, scale: 0.58, variant: 'far', phase: 0.00 }
  ];

  /* 村民在群体中的偏移与体量 */
  var VILLAGER_OFFSET = {
    s05: [{ dx: -70, dy: 34, s: 1.00 }, { dx: 6, dy: 4, s: 0.98 }, { dx: 78, dy: -30, s: 1.04 }],
    s06: [{ dx: -50, dy: 6, s: 1.00 }, { dx: 60, dy: 14, s: 0.94 }, { dx: 170, dy: 26, s: 1.02 }],
    s09: [{ dx: -66, dy: 30, s: 0.96 }, { dx: 8, dy: 2, s: 0.92 }, { dx: 84, dy: -26, s: 0.98 }],
    s10: [{ dx: -60, dy: 18, s: 1.00 }, { dx: 10, dy: 30, s: 0.96 }, { dx: 76, dy: 42, s: 1.02 }],
    s13: [{ dx: -44, dy: 16, s: 1.00 }, { dx: 46, dy: 24, s: 0.96 }, { dx: 140, dy: 32, s: 1.00 }]
  };

  /* ==================================================================
   * 姿态词典（绝对相位驱动，保证逐帧可重现）
   * ================================================================== */
  function setPoseBoy(actor, pose, t, reduced) {
    var p = actor.parts;
    var phase = t * 7;
    var head = p.head, armL = p.armL, armR = p.armR, legL = p.legL, legR = p.legR;
    var torso = p.torso, staff = p.staff, cape = p.cape, eyes = p.eyes;

    /* 默认姿态 */
    head.setAttribute('transform', 'translate(0,-150) rotate(4)');
    armL.setAttribute('transform', 'translate(-18,-126) rotate(9)');
    armR.setAttribute('transform', 'translate(18,-126) rotate(-4)');
    legL.setAttribute('transform', 'translate(0,-70)');
    legR.setAttribute('transform', 'translate(0,-70)');
    torso.setAttribute('transform', 'translate(0,0)');
    staff.setAttribute('transform', 'translate(-30,-100) rotate(0)');
    cape.setAttribute('transform', 'translate(0,0)');
    eyes.setAttribute('transform', 'translate(0,0) scale(1,1)');

    switch (pose) {
      case 'B-alert':
        head.setAttribute('transform', 'translate(0,-150) rotate(-13)');
        armR.setAttribute('transform', 'translate(18,-126) rotate(-22)');
        armL.setAttribute('transform', 'translate(-18,-126) rotate(-10)');
        staff.setAttribute('transform', 'translate(-30,-100) rotate(-6)');
        torso.setAttribute('transform', 'translate(-4,0)');
        break;
      case 'B-shout':
        /* 双手捧口：肩到嘴只有约 22px，必须同时缩短手臂，否则会横扫面部 */
        head.setAttribute('transform', 'translate(6,-143) rotate(-8)');
        armL.setAttribute('transform', 'translate(-18,-126) rotate(-124) scale(0.92,0.56)');
        armR.setAttribute('transform', 'translate(18,-126) rotate(124) scale(0.92,0.56)');
        torso.setAttribute('transform', 'translate(0,-70) rotate(12) translate(0,70)');
        var mouth = actor.root.querySelector('.boy-mouth');
        if (mouth) mouth.setAttribute('transform', 'translate(-5,9) scale(1.5,1.3) translate(5,-9)');
        break;
      case 'B-laugh':
        if (!reduced) {
          torso.setAttribute('transform', 'translate(0,' + (-Math.abs(Math.sin(phase)) * 8).toFixed(1) + ')');
        }
        head.setAttribute('transform', 'translate(0,-150) rotate(-6)');
        eyes.setAttribute('transform', 'translate(0,-2) scale(1,0.45)');
        armL.setAttribute('transform', 'translate(-18,-126) rotate(-16)');
        armR.setAttribute('transform', 'translate(18,-126) rotate(16)');
        break;
      case 'B-guilt':
        head.setAttribute('transform', 'translate(0,-150) rotate(18)');
        armL.setAttribute('transform', 'translate(-18,-126) rotate(8)');
        armR.setAttribute('transform', 'translate(18,-126) rotate(8)');
        staff.setAttribute('transform', 'translate(-30,-96) rotate(14)');
        torso.setAttribute('transform', 'translate(0,6)');
        break;
      case 'B-run':
        var swing = reduced ? 0 : Math.sin(phase) * 22;
        legL.setAttribute('transform', 'translate(0,-70) rotate(' + swing.toFixed(1) + ')');
        legR.setAttribute('transform', 'translate(0,-70) rotate(' + (-swing).toFixed(1) + ')');
        armL.setAttribute('transform', 'translate(-18,-126) rotate(' + (swing * 0.8).toFixed(1) + ')');
        armR.setAttribute('transform', 'translate(18,-126) rotate(' + (-swing * 0.8).toFixed(1) + ')');
        if (!reduced) {
          cape.setAttribute('transform', 'translate(0,' + (Math.sin(phase) * 10).toFixed(1) + ') rotate(' + (Math.sin(phase) * 5).toFixed(1) + ')');
        }
        head.setAttribute('transform', 'translate(0,-150) rotate(-4)');
        break;
      case 'B-freeze':
        var tremor = reduced ? 0 : Math.sin(t * 21) * 1.6;
        armL.setAttribute('transform', 'translate(-18,-126) rotate(-6) translate(' + tremor.toFixed(2) + ',0)');
        armR.setAttribute('transform', 'translate(18,-126) rotate(-6) translate(' + (-tremor).toFixed(2) + ',0)');
        head.setAttribute('transform', 'translate(0,-150) rotate(2)');
        break;
      case 'B-sad':
        head.setAttribute('transform', 'translate(0,-150) rotate(30)');
        torso.setAttribute('transform', 'translate(0,32)');
        legL.setAttribute('transform', 'translate(0,-70) rotate(38)');
        legR.setAttribute('transform', 'translate(0,-70) rotate(-38)');
        armL.setAttribute('transform', 'translate(-18,-126) rotate(10)');
        armR.setAttribute('transform', 'translate(18,-126) rotate(10)');
        staff.setAttribute('transform', 'translate(-30,-66) rotate(78)');
        break;
      default: /* B-idle */
        if (!reduced) {
          torso.setAttribute('transform', 'translate(0,' + (Math.sin(phase * 0.5) * 2).toFixed(2) + ')');
        }
        break;
    }
  }

  function setPoseSheep(actor, pose, t, reduced) {
    var head = actor.parts.head;
    var base = 'translate(-48,-34)';
    var ph = t * 6;
    if (pose === 'S-listen') {
      head.setAttribute('transform', base + ' rotate(' + (reduced ? 0 : Math.sin(ph * 0.8) * 16).toFixed(1) + ')');
    } else if (pose === 'S-scatter') {
      head.setAttribute('transform', base + ' translate(-6,-6) rotate(-10)');
    } else { /* S-graze */
      var off = reduced ? 0 : Math.sin(ph) * 10;
      head.setAttribute('transform', base + ' translate(0,' + off.toFixed(1) + ') rotate(' + (reduced ? 0 : Math.sin(ph) * 4).toFixed(1) + ')');
    }
  }

  function setPoseVillager(actor, pose, t, reduced) {
    var p = actor.parts;
    var ph = t * 4;
    var head = p.head, armL = p.armL, armR = p.armR, legL = p.legL, legR = p.legR, body = p.body;
    var hip = p.legL.getAttribute('transform').match(/translate\(0,(-?[\d.]+)\)/);
    var hipY = hip ? parseFloat(hip[1]) : -68;

    head.setAttribute('transform', head.getAttribute('transform'));
    armL.setAttribute('transform', 'translate(-16,' + (hipY - 60) + ') rotate(0)');
    armR.setAttribute('transform', 'translate(16,' + (hipY - 60) + ') rotate(0)');
    legL.setAttribute('transform', 'translate(0,' + hipY + ')');
    legR.setAttribute('transform', 'translate(0,' + hipY + ')');
    body.setAttribute('transform', 'translate(0,0)');

    switch (pose) {
      case 'V-stride':
      case 'V-stride-slow': {
        var rate = pose === 'V-stride' ? 2.2 : 1.6;
        var sw = reduced ? 0 : Math.sin(t * rate * Math.PI * 2 * 0.5) * 18;
        legL.setAttribute('transform', 'translate(0,' + hipY + ') rotate(' + sw.toFixed(1) + ')');
        legR.setAttribute('transform', 'translate(0,' + hipY + ') rotate(' + (-sw).toFixed(1) + ')');
        armL.setAttribute('transform', 'translate(-16,' + (hipY - 60) + ') rotate(' + (-sw * 0.7).toFixed(1) + ')');
        armR.setAttribute('transform', 'translate(16,' + (hipY - 60) + ') rotate(' + (sw * 0.7).toFixed(1) + ')');
        break;
      }
      case 'V-panting':
        body.setAttribute('transform', 'translate(0,-70) rotate(16) translate(0,70)');
        head.setAttribute('transform', head.getAttribute('transform') + ' translate(0,-2)');
        armL.setAttribute('transform', 'translate(-16,' + (hipY - 60) + ') rotate(-46)');
        armR.setAttribute('transform', 'translate(16,' + (hipY - 60) + ') rotate(-46)');
        break;
      case 'V-look-up':
        head.setAttribute('transform', head.getAttribute('transform') + ' rotate(-12)');
        break;
      case 'V-arms-crossed':
        armL.setAttribute('transform', 'translate(-16,' + (hipY - 60) + ') rotate(-64)');
        armR.setAttribute('transform', 'translate(16,' + (hipY - 60) + ') rotate(64)');
        break;
      case 'V-turn-away':
        actor.root.setAttribute('data-flip', '1');
        break;
      case 'V-shake-head':
        head.setAttribute('transform', head.getAttribute('transform') + ' rotate(' + (reduced ? 0 : Math.sin(t * 3) * 8).toFixed(1) + ')');
        break;
      case 'V-push-door':
        armL.setAttribute('transform', 'translate(-16,' + (hipY - 60) + ') rotate(-84)');
        armR.setAttribute('transform', 'translate(16,' + (hipY - 60) + ') rotate(-84)');
        body.setAttribute('transform', 'translate(6,' + (hipY - 60) + ') rotate(6) translate(-6,' + (-(hipY - 60)) + ')');
        break;
      case 'V-seated':
        body.setAttribute('transform', 'translate(0,26)');
        legL.setAttribute('transform', 'translate(0,' + hipY + ') rotate(66)');
        legR.setAttribute('transform', 'translate(0,' + hipY + ') rotate(-66)');
        break;
      case 'V-hand-half-raised':
        var lift = reduced ? 0 : Math.max(0, Math.sin((t % 4) * 1.6)) * 18;
        armR.setAttribute('transform', 'translate(16,' + (hipY - 60) + ') rotate(' + (-lift).toFixed(1) + ')');
        break;
      case 'V-hesitate':
        legL.setAttribute('transform', 'translate(0,' + hipY + ') rotate(8)');
        legR.setAttribute('transform', 'translate(0,' + hipY + ') rotate(-8)');
        head.setAttribute('transform', head.getAttribute('transform') + ' rotate(' + (reduced ? 0 : Math.sin(t * 1.2) * 6).toFixed(1) + ')');
        break;
      default:
        break;
    }
  }

  function setPoseWolf(actor, pose, t, reduced) {
    var p = actor.parts;
    var head = p.head, body = p.body, tail = p.tail, legL = null, legR = null;
    var legs = body.querySelectorAll('path');
    if (legs.length > 1) { legL = legs[1]; legR = legs[2]; }

    head.setAttribute('transform', 'translate(88,-58) rotate(0)');
    body.setAttribute('transform', 'translate(0,0)');
    tail.setAttribute('transform', 'translate(-84,-44) rotate(0)');
    if (legL) legL.setAttribute('transform', 'translate(0,0)');
    if (legR) legR.setAttribute('transform', 'translate(0,0)');

    switch (pose) {
      case 'W-crouch':
        body.setAttribute('transform', 'translate(0,18)');
        head.setAttribute('transform', 'translate(88,-40) rotate(-6)');
        tail.setAttribute('transform', 'translate(-84,-30) rotate(-24)');
        break;
      case 'W-advance': {
        var bob = reduced ? 0 : Math.sin(t * 6) * 4;
        body.setAttribute('transform', 'translate(0,' + bob.toFixed(1) + ')');
        head.setAttribute('transform', 'translate(88,-58) translate(0,' + (bob * 0.6).toFixed(1) + ')');
        break;
      }
      case 'W-lunge':
        body.setAttribute('transform', 'translate(0,-6) rotate(-8)');
        head.setAttribute('transform', 'translate(88,-58) rotate(-10)');
        tail.setAttribute('transform', 'translate(-84,-44) rotate(30)');
        break;
      case 'W-depart': {
        var b2 = reduced ? 0 : Math.sin(t * 8) * 3;
        body.setAttribute('transform', 'translate(0,' + b2.toFixed(1) + ')');
        head.setAttribute('transform', 'translate(88,-58) rotate(-6)');
        tail.setAttribute('transform', 'translate(-84,-44) rotate(24)');
        break;
      }
      default:
        break;
    }
  }

  /* ==================================================================
   * 每镜的静态构建
   * ================================================================== */
  function ids0(shot) {
    return shot.effectIds || [];
  }

  function buildShot(shot) {
    var P = T.palettes[shot.palette] || T.palettes.day;
    /* 出场表以 data/story.json 为准（唯一真源），本地表只作兜底 */
    var cast = shot.cast || CAST[shot.id] || {};
    var rootG = G.group(null, { 'class': 'shot', 'data-shot': shot.id });

    /* --- 视差分组 --- */
    var pSky = G.group(rootG, { 'class': 'pl pl-sky' });
    var pCelestial = G.group(rootG, { 'class': 'pl pl-celestial' });
    var pFar = G.group(rootG, { 'class': 'pl pl-far' });
    var pMid = G.group(rootG, { 'class': 'pl pl-mid' });
    var pGround = G.group(rootG, { 'class': 'pl pl-ground' });
    var pActors = G.group(rootG, { 'class': 'pl pl-actors' });
    var pFore = G.group(rootG, { 'class': 'pl pl-foreground' });
    var pTexture = G.group(rootG, { 'class': 'pl pl-texture' });

    /* 开场卡与片尾卡是纯纸面落幅，不铺地景 */
    var isCard = ids0(shot).indexOf('end-card') >= 0 || ids0(shot).indexOf('opening-title') >= 0;
    var land = isCard ? null : G.createLandscape(P, T.stage.paperSeed);
    if (land) {
    pSky.appendChild(land.layers.sky);
    pCelestial.appendChild(land.layers.celestial);
    pFar.appendChild(land.layers.far);
    pMid.appendChild(land.layers.mid);
    /* 顺序要紧：先铺地面，再压村庄与树，否则地面会把村庄盖住 */
    pGround.appendChild(land.layers.ground);
    pGround.appendChild(land.layers.village);
    pGround.appendChild(land.layers.trees);
    pFore.appendChild(land.layers.foreground);
    pTexture.appendChild(land.layers.texture);
    }

    /* --- 演员 --- */
    var actors = {};

    if (cast.boy) {
      var boy = G.createBoy(P);
      boy.root.setAttribute('class', 'actor actor-boy');
      pActors.appendChild(boy.root);
      actors.boy = boy;
    }
    if (cast.wolf) {
      var wolf = G.createWolf(P);
      pActors.appendChild(wolf.root);
      actors.wolf = wolf;
    }
    if (cast.sheep) {
      actors.sheep = [];
      for (var s = 0; s < cast.sheep && s < SHEEP_LAYOUT.length; s++) {
        var sh = G.createSheep(P, SHEEP_LAYOUT[s].variant);
        pActors.appendChild(sh.root);
        actors.sheep.push({ actor: sh, layout: SHEEP_LAYOUT[s], index: s });
      }
    }
    if (cast.villagers && cast.villagers.length) {
      actors.villagers = [];
      var offsets = VILLAGER_OFFSET[shot.id] || [];
      for (var v = 0; v < cast.villagers.length; v++) {
        var kind = cast.villagers[v];
        var vl = G.createVillager(P, kind);
        pActors.appendChild(vl.root);
        actors.villagers.push({ actor: vl, kind: kind, offset: offsets[v] || { dx: v * 60, dy: 0, s: 1 } });
      }
    }

    /* --- 镜头专属特效 --- */
    var effects = {};
    var ids = shot.effectIds || [];

    if (ids.indexOf('opening-title') >= 0) {
      var card = G.createOpeningCard(P);
      rootG.insertBefore(card.root, pActors);
      effects.opening = card;
    }
    if (ids.indexOf('bell-stamp') >= 0) {
      var stamp = G.group(pFore, { 'class': 'effect effect-stamp' });
      var sd = '';
      [26, 40, 54].forEach(function (r) {
        sd += 'M ' + (170 - r) + ' 820 A ' + r + ' ' + r + ' 0 0 1 ' + (170 + r * 0.7) + ' ' + (820 - r * 0.7) + ' ';
      });
      G.path(stamp, sd, { fill: 'none', stroke: P.ink, 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.4 });
      effects.stamp = stamp;
    }
    if (ids.indexOf('cloud-shadow-sweep') >= 0) {
      var sweep = G.group(pMid, { 'class': 'effect effect-sweep' });
      G.path(sweep, 'M -320 316 C 60 262 380 330 720 288 L 720 372 C 380 414 60 346 -320 400 Z',
        { fill: P.farHillDark, opacity: 0.85 });
      effects.sweep = sweep;
    }
    if (ids.indexOf('branch-shadow') >= 0) {
      var shadowGroup = G.group(pFar, { 'class': 'effect effect-branch-shadow' });
      var br = G.createBranchShadow(P);
      br.setAttribute('transform', 'translate(1140,452) scale(1.45)');
      shadowGroup.appendChild(br);
      effects.branchShadow = shadowGroup;
    }
    if (ids.indexOf('reveal-branch') >= 0) {
      var realBranch = G.group(pFar, { 'class': 'effect effect-real-branch' });
      var rb = G.createRealBranch(P);
      rb.setAttribute('transform', 'translate(1140,452) scale(1.45)');
      realBranch.appendChild(rb);
      effects.realBranch = realBranch;
    }
    if (ids.indexOf('echo-waves-3') >= 0) {
      var e1 = G.createEchoWaves(P, 3, false);
      e1.setAttribute('transform', 'translate(942,372)');
      pActors.appendChild(e1);
      effects.echo = e1;
    }
    if (ids.indexOf('echo-shards') >= 0) {
      var e2 = G.createEchoWaves(P, 4, true);
      e2.setAttribute('transform', 'translate(1118,346)');
      pActors.appendChild(e2);
      effects.echo = e2;
    }
    if (ids.indexOf('echo-broken') >= 0) {
      var e3 = G.createEchoWaves(P, 3, true);
      e3.setAttribute('transform', 'translate(1176,382)');
      pActors.appendChild(e3);
      effects.echo = e3;
    }
    if (ids.indexOf('single-bell-closeup') >= 0) {
      var bigBell = G.group(pFore, { 'class': 'effect effect-bell-closeup' });
      G.path(bigBell, 'M 1300 560 C 1300 540 1350 540 1350 560 L 1350 600',
        { fill: 'none', stroke: P.trunk, 'stroke-width': 7, 'stroke-linecap': 'round' });
      G.path(bigBell, 'M 1306 598 L 1344 598 L 1352 660 L 1298 660 Z',
        { fill: P.bell, stroke: P.ink, 'stroke-width': 4.5, 'stroke-linejoin': 'round' });
      G.circle(bigBell, 1325, 676, 24, { fill: P.bell, stroke: P.ink, 'stroke-width': 4.5 });
      G.path(bigBell, 'M 1317 694 L 1333 694 L 1333 708 L 1317 708 Z', { fill: P.ink });
      effects.bellCloseup = bigBell;
    }
    if (ids.indexOf('stump-sit') >= 0) {
      var stump = G.group(pGround, { 'class': 'effect effect-stump' });
      G.path(stump, 'M 1020 640 L 1090 640 L 1084 596 L 1026 596 Z', { fill: P.trunk, stroke: P.ink, 'stroke-width': 4, 'stroke-linejoin': 'round' });
      G.ellipse(stump, 1055, 596, 30, 9, { fill: P.trunk, stroke: P.ink, 'stroke-width': 4 });
      effects.stump = stump;
    }
    if (ids.indexOf('paper-birds') >= 0) {
      var birds = G.group(pCelestial, { 'class': 'effect effect-birds' });
      var b1 = G.path(birds, 'M 0 0 L 16 -9 L 30 0 L 16 5 Z', { fill: P.cloud, stroke: P.ink, 'stroke-width': 2.6, 'stroke-linejoin': 'round' });
      var b2 = G.path(birds, 'M 0 0 L 14 -8 L 26 0 L 14 4 Z', { fill: P.cloudShade, stroke: P.ink, 'stroke-width': 2.4, 'stroke-linejoin': 'round' });
      effects.birds = { node: birds, a: b1, b: b2 };
    }
    if (ids.indexOf('village-gate-open') >= 0) {
      var gate = G.group(pGround, { 'class': 'effect effect-gate' });
      G.path(gate, 'M 300 700 L 300 760', { fill: 'none', stroke: P.ink, 'stroke-width': 6, 'stroke-linecap': 'round' });
      G.path(gate, 'M 430 690 L 430 756', { fill: 'none', stroke: P.ink, 'stroke-width': 6, 'stroke-linecap': 'round' });
      G.path(gate, 'M 306 706 L 428 700 L 428 716 L 306 722 Z', { fill: P.houseRoof, stroke: P.ink, 'stroke-width': 3.4, 'stroke-linejoin': 'round' });
      effects.gate = gate;
    }
    if (ids.indexOf('lantern') >= 0) {
      var lantern = G.group(pActors, { 'class': 'effect effect-lantern' });
      G.path(lantern, 'M 0 0 L 0 -14', { fill: 'none', stroke: P.ink, 'stroke-width': 2.4 });
      G.path(lantern, 'M -11 -14 L 11 -14 L 9 -44 L -9 -44 Z', { fill: P.windowLit, stroke: P.ink, 'stroke-width': 3, 'stroke-linejoin': 'round' });
      G.path(lantern, 'M -12 -14 L 12 -14 M -10 -44 L 10 -44', { fill: 'none', stroke: P.ink, 'stroke-width': 2.6 });
      effects.lantern = lantern;
    }
    if (ids.indexOf('village-door') >= 0) {
      var door = G.group(pGround, { 'class': 'effect effect-door' });
      G.path(door, 'M 60 900 L 60 330 L 620 330 L 620 900 Z', { fill: P.house, stroke: P.ink, 'stroke-width': 6, 'stroke-linejoin': 'round' });
      G.path(door, 'M 36 330 L 644 330 L 644 372 L 36 372 Z', { fill: P.houseRoof, stroke: P.ink, 'stroke-width': 5 });
      G.path(door, 'M 132 900 L 132 430 L 452 430 L 452 900 Z', { fill: P.houseDoor, stroke: P.ink, 'stroke-width': 5 });
      G.path(door, 'M 150 900 L 150 452 L 434 452 L 434 900 Z', { fill: P.windowLit, opacity: 0.5 });
      var leaf = G.group(door, { 'class': 'door-leaf' });
      G.path(leaf, 'M 0 0 L 0 -448 L 286 -448 L 286 0 Z', { fill: P.house, stroke: P.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' });
      G.path(leaf, 'M 24 -60 L 262 -60 L 262 -210 L 24 -210 Z', { fill: P.houseDoor, stroke: P.ink, 'stroke-width': 3.6 });
      G.path(leaf, 'M 24 -250 L 262 -250 L 262 -410 L 24 -410 Z', { fill: P.houseDoor, stroke: P.ink, 'stroke-width': 3.6 });
      G.circle(leaf, 258, -230, 10, { fill: P.bell, stroke: P.ink, 'stroke-width': 3.4 });
      leaf.setAttribute('transform', 'translate(146,900)');
      effects.door = { node: door, panel: leaf };
    }
    if (ids.indexOf('wolf-in-thicket') >= 0) {
      var thicket = G.group(pFore, { 'class': 'effect effect-thicket' });
      var td = '';
      for (var k = 0; k < 34; k++) {
        var tx = 40 + k * 22 + G.hash2(k, 17, T.stage.paperSeed) * 16;
        var th = 150 + G.hash2(k, 5, T.stage.paperSeed) * 190;
        var bend = (G.hash2(k, 23, T.stage.paperSeed) - 0.5) * 34;
        td += 'M ' + tx.toFixed(0) + ' 900 C ' + (tx + bend * 0.4).toFixed(0) + ' ' + (900 - th * 0.55).toFixed(0)
          + ' ' + (tx + bend).toFixed(0) + ' ' + (900 - th * 0.85).toFixed(0) + ' '
          + (tx + bend + 7).toFixed(0) + ' ' + (900 - th).toFixed(0) + ' ';
      }
      G.path(thicket, td, { fill: 'none', stroke: P.treeDark, 'stroke-width': 8, 'stroke-linecap': 'round' });
      G.path(thicket, 'M 0 900 C 120 840 260 872 380 838 C 500 806 600 846 720 818 L 780 900 Z',
        { fill: P.treeDark, opacity: 0.9 });
      effects.thicket = thicket;
    }
    if (ids.indexOf('red-thin-cloud') >= 0) {
      var red = G.group(pCelestial, { 'class': 'effect effect-redcloud' });
      G.path(red, 'M 90 430 C 250 404 420 424 540 452 C 610 468 630 488 610 502 '
        + 'C 470 470 250 462 90 430 Z', { fill: P.dangerRed, opacity: 0.30 });
      effects.redCloud = red;
    }
    if (ids.indexOf('closed-door') >= 0) {
      var closed = G.group(pGround, { 'class': 'effect effect-closed-door' });
      G.path(closed, 'M 80 900 L 80 430 L 470 430 L 470 900 Z', { fill: P.house, stroke: P.ink, 'stroke-width': 6, 'stroke-linejoin': 'round' });
      G.path(closed, 'M 56 430 L 494 430 L 494 468 L 56 468 Z', { fill: P.houseRoof, stroke: P.ink, 'stroke-width': 5 });
      G.path(closed, 'M 130 900 L 130 520 L 320 520 L 320 900 Z', { fill: P.houseDoor, stroke: P.ink, 'stroke-width': 5, 'stroke-linejoin': 'round' });
      G.circle(closed, 296, 720, 10, { fill: P.bell, stroke: P.ink, 'stroke-width': 3.4 });
      G.path(closed, 'M 356 560 L 432 560 L 432 636 L 356 636 Z', { fill: P.windowLit, stroke: P.ink, 'stroke-width': 4, opacity: 0.9 });
      G.path(closed, 'M 394 560 L 394 636 M 356 598 L 432 598', { fill: 'none', stroke: P.ink, 'stroke-width': 3 });
      effects.closedDoor = closed;
    }
    if (ids.indexOf('faint-echo-symbol') >= 0) {
      var faint = G.group(pCelestial, { 'class': 'effect effect-faint-echo' });
      var fd = '';
      [40, 66, 92].forEach(function (r) {
        fd += 'M ' + (1300 - r) + ' 300 A ' + r + ' ' + r + ' 0 0 1 ' + (1300 + r * 0.7) + ' ' + (300 - r * 0.7) + ' ';
      });
      G.path(faint, fd, { fill: 'none', stroke: P.echo, 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.4 });
      effects.faintEcho = faint;
    }
    if (ids.indexOf('lost-lamb') >= 0) {
      var lamb = G.group(pActors, { 'class': 'effect effect-lamb' });
      G.path(lamb, 'M -26 -10 C -30 -22 -18 -30 -6 -27 C 2 -32 14 -30 18 -22 C 30 -24 38 -16 36 -6 '
        + 'C 34 6 20 10 4 9 C -10 8 -22 2 -26 -10 Z', { fill: P.sheep, stroke: P.ink, 'stroke-width': 3, 'stroke-linejoin': 'round' });
      G.ellipse(lamb, -24, -16, 8, 9, { fill: P.ink });
      G.path(lamb, 'M -32 -8 L -38 -8 L -38 2 L -32 2 Z', { fill: P.bell, stroke: P.ink, 'stroke-width': 2 });
      effects.lamb = lamb;
    }
    if (ids.indexOf('fallen-staff') >= 0) {
      var fallen = G.group(pGround, { 'class': 'effect effect-fallen-staff' });
      G.path(fallen, 'M 1080 790 L 1270 742', { fill: 'none', stroke: P.trunk, 'stroke-width': 10, 'stroke-linecap': 'round' });
      effects.fallenStaff = fallen;
    }
    if (ids.indexOf('single-bell') >= 0) {
      var lone = G.group(pGround, { 'class': 'effect effect-single-bell' });
      G.path(lone, 'M -9 -14 L 9 -14 L 11 4 L -11 4 Z', { fill: P.bell, stroke: P.ink, 'stroke-width': 3, 'stroke-linejoin': 'round' });
      G.circle(lone, 0, 10, 9, { fill: P.bell, stroke: P.ink, 'stroke-width': 3 });
      G.ellipse(lone, 0, 24, 16, 5, { fill: P.ink, opacity: 0.16 });
      effects.singleBell = lone;
    }
    if (ids.indexOf('end-card') >= 0) {
      var endCard = G.createEndCard(P);
      rootG.insertBefore(endCard, pActors);
      var mainTitle = G.el('text', {
        x: 800, y: 330, 'text-anchor': 'middle', 'class': 'film-title',
        fill: P.ink, 'font-family': T.font.sans, 'font-size': 112, 'font-weight': 700, 'letter-spacing': '0.1em'
      }, endCard);
      mainTitle.textContent = '狼来了';
      var moral1 = G.el('text', {
        x: 430, y: 470, 'text-anchor': 'start', 'class': 'film-moral',
        fill: P.ink, 'font-family': T.font.sans, 'font-size': 44, 'font-weight': 600
      }, endCard);
      moral1.textContent = '谎言会耗尽信任。';
      var moral2 = G.el('text', {
        x: 430, y: 540, 'text-anchor': 'start', 'class': 'film-moral',
        fill: P.ink, 'font-family': T.font.sans, 'font-size': 44, 'font-weight': 600
      }, endCard);
      moral2.textContent = '当真话终于响起，也可能无人回应。';
      var sign = G.el('text', {
        x: 800, y: 840, 'text-anchor': 'middle', 'class': 'film-sign',
        fill: P.ink, 'font-family': T.font.sans, 'font-size': 26, 'font-weight': 500, 'letter-spacing': '0.12em'
      }, endCard);
      sign.textContent = '根据伊索寓言原创改编';
      effects.endCard = { node: endCard, title: mainTitle, moral1: moral1, moral2: moral2, sign: sign };
    }

    return {
      shot: shot,
      root: rootG,
      parallax: {
        sky: pSky, celestial: pCelestial, far: pFar, mid: pMid,
        ground: pGround, actors: pActors, foreground: pFore, texture: pTexture
      },
      actors: actors,
      effects: effects
    };
  }

  /* ==================================================================
   * 场景对象
   * ================================================================== */
  function createScene(svgRoot, tokens) {
    var scene = {
      svg: svgRoot,
      tokens: tokens,
      cache: {},
      attached: [],
      lastKey: ''
    };

    var defs = G.el('defs', {}, svgRoot);
    var grad = G.el('radialGradient', { id: 'cw-vignette', cx: '50%', cy: '46%', r: '72%' }, defs);
    G.el('stop', { offset: '0%', 'stop-color': tokens.film.paper, 'stop-opacity': '0' }, grad);
    G.el('stop', { offset: '100%', 'stop-color': tokens.film.ink, 'stop-opacity': '0.28' }, grad);

    var world = G.group(svgRoot, { 'class': 'scene-world' });
    var overlay = G.group(svgRoot, { 'class': 'scene-overlay' });
    var vignette = G.rect(overlay, 0, 0, 1600, 900, { fill: 'url(#cw-vignette)', 'pointer-events': 'none' });

    scene.world = world;
    scene.overlay = overlay;

    function ensureShot(shot) {
      if (!scene.cache[shot.id]) scene.cache[shot.id] = buildShot(shot);
      return scene.cache[shot.id];
    }

    function attach(entry, opacity) {
      if (entry.root.parentNode !== world) world.appendChild(entry.root);
      entry.root.setAttribute('opacity', String(opacity));
      entry.root.setAttribute('display', opacity <= 0.001 ? 'none' : 'inline');
    }

    function detach(entry) {
      if (entry.root.parentNode === world) world.removeChild(entry.root);
    }

    function applyCamera(entry, cam) {
      var s = cam.scale;
      var tx = cam.x;
      var ty = cam.y;
      Object.keys(entry.parallax).forEach(function (name) {
        var node = entry.parallax[name];
        var k = PARALLAX[name];
        node.setAttribute(
          'transform',
          'translate(' + (tx * k).toFixed(2) + ',' + (ty * k).toFixed(2) + ') '
          + 'translate(800,450) scale(' + s.toFixed(4) + ') translate(-800,-450)'
        );
      });
    }

    /* ---------------- 演员定位 ---------------- */
    function placeActors(entry, shot, t, reduced) {
      var ak = shot.actorKeys || {};
      var actors = entry.actors;

      if (actors.boy) {
        var bk = TL.sampleKeys(ak.boy, t, false);
        if (bk) {
          actors.boy.root.setAttribute('transform',
            'translate(' + bk.x.toFixed(2) + ',' + bk.y.toFixed(2) + ') scale(' + bk.scale.toFixed(3) + ') rotate(' + bk.rotation.toFixed(2) + ')');
          actors.boy.root.setAttribute('opacity', String(bk.opacity));
          setPoseBoy(actors.boy, bk.pose, t, reduced);
        } else {
          actors.boy.root.setAttribute('display', 'none');
        }
      }

      if (actors.wolf) {
        var wk = TL.sampleKeys(ak.wolf, t, false);
        if (wk) {
          actors.wolf.root.setAttribute('transform',
            'translate(' + wk.x.toFixed(2) + ',' + wk.y.toFixed(2) + ') scale(' + wk.scale.toFixed(3) + ') rotate(' + wk.rotation.toFixed(2) + ')');
          actors.wolf.root.setAttribute('opacity', String(wk.opacity));
          setPoseWolf(actors.wolf, wk.pose, t, reduced);
        } else {
          actors.wolf.root.setAttribute('display', 'none');
        }
      }

      if (actors.sheep && actors.sheep.length) {
        var sk = TL.sampleKeys(ak.sheep, t, false);
        if (sk) {
          var spread = (shot.cast && shot.cast.spread) || 1;
          actors.sheep.forEach(function (item) {
            var lay = item.layout;
            var ph = t + lay.phase;
            var sway = reduced ? 0 : Math.sin(ph * 3.1) * 3;
            var scatter = 0;
            if (sk.pose === 'S-scatter') {
              scatter = (lay.dx > 0 ? 1 : -1) * (26 + Math.abs(lay.dx) * 0.22);
            }
            item.actor.root.setAttribute('transform',
              'translate(' + (sk.x + lay.dx * spread + scatter).toFixed(2) + ',' + (sk.y + lay.dy * spread + sway).toFixed(2)
              + ') scale(' + (lay.scale * sk.scale).toFixed(3) + ')');
            item.actor.root.setAttribute('opacity', String(sk.opacity));
            setPoseSheep(item.actor, sk.pose, ph, reduced);
          });
        } else {
          actors.sheep.forEach(function (item) { item.actor.root.setAttribute('display', 'none'); });
        }
      }

      if (actors.villagers && actors.villagers.length) {
        var vk = TL.sampleKeys(ak.villagers, t, false);
        if (vk) {
          actors.villagers.forEach(function (item, vi) {
            var off = item.offset;
            var ph = t + vi * 0.37;
            var flip = item.actor.root.getAttribute('data-flip') === '1';
            item.actor.root.setAttribute('transform',
              'translate(' + (vk.x + off.dx).toFixed(2) + ',' + (vk.y + off.dy).toFixed(2) + ') scale(' + (off.s * vk.scale).toFixed(3) + ')'
              + (flip ? ' scale(-1,1)' : ''));
            item.actor.root.setAttribute('opacity', String(vk.opacity));
            setPoseVillager(item.actor, vk.pose, ph, reduced);
          });
        } else {
          actors.villagers.forEach(function (item) { item.actor.root.setAttribute('display', 'none'); });
        }
      }
    }

    /* ---------------- 镜头专属动态 ---------------- */
    function applyEffects(entry, shot, t, reduced) {
      var fx = entry.effects;
      var ids = shot.effectIds || [];
      var local = t - shot.start;

      if (fx.opening) {
        /* 纸底必须始终在场：它同时是「默认海报」和 7.4s 叠化到山坡大全景的那一版 */
        var mainOut = 1 - TL.clamp((t - 7.4) / 0.6, 0, 1);
        fx.opening.root.setAttribute('opacity', '1');
        fx.opening.sun.setAttribute('opacity', TL.clamp((t - 0.4) / 0.9, 0, 1).toFixed(3));
        fx.opening.title.setAttribute('opacity',
          ((0.5 + 0.5 * TL.clamp((t - 0.2) / 1.5, 0, 1)) * mainOut).toFixed(3));
        fx.opening.sub.setAttribute('opacity', (TL.clamp((t - 4.8) / 0.6, 0, 1) * mainOut).toFixed(3));
      }
      if (fx.stamp) {
        fx.stamp.setAttribute('opacity', TL.clamp((t - 2.6) / 0.8, 0, 1).toFixed(3));
      }
      if (fx.sweep) {
        /* 只在镜头交界处掠过，不许在别的时间挡住画面 */
        var sweepU = TL.clamp((t - 17.4) / 0.6, 0, 1);
        var sweepOn = sweepU > 0 && sweepU < 1 ? Math.sin(sweepU * Math.PI) : 0;
        var sweepX = reduced ? 0 : -320 + TL.ease01(sweepU) * 1960;
        fx.sweep.setAttribute('transform', 'translate(' + sweepX.toFixed(1) + ',0)');
        fx.sweep.setAttribute('opacity', (sweepOn * 0.42).toFixed(3));
      }
      if (fx.branchShadow) {
        var bs = TL.clamp((t - 21.5) / 0.5, 0, 1) * (1 - TL.clamp((t - 24.6) / 0.6, 0, 1));
        fx.branchShadow.setAttribute('opacity', bs.toFixed(3));
        if (!reduced) {
          fx.branchShadow.setAttribute('transform', 'translate(1180,430) rotate(' + (Math.sin(t * 1.4) * 3).toFixed(2) + ')');
        }
      }
      if (fx.realBranch) {
        fx.realBranch.setAttribute('opacity', TL.clamp((t - 24.4) / 0.6, 0, 1).toFixed(3));
      }
      if (fx.branchShadow) {
        fx.branchShadow.setAttribute('transform', 'translate(1140,452) scale(1.45)');
      }
      if (fx.echo) {
        var echoOn = 0;
        if (ids.indexOf('echo-waves-3') >= 0) {
          echoOn = Math.max(echoOn, inWindow(t, 29.2, 32.0, 0.25), inWindow(t, 33.0, 35.4, 0.25));
        } else if (ids.indexOf('echo-shards') >= 0) {
          echoOn = Math.max(echoOn, inWindow(t, 69.4, 72.4, 0.3), inWindow(t, 73.2, 75.0, 0.3));
        } else if (ids.indexOf('echo-broken') >= 0) {
          echoOn = Math.max(echoOn, inWindow(t, 113.1, 116.0, 0.3), inWindow(t, 116.8, 119.0, 0.3));
        }
        fx.echo.setAttribute('opacity', echoOn.toFixed(3));
        var grow = 1 + echoOn * (reduced ? 0 : 0.34);
        fx.echo.setAttribute('transform', fx.echo.getAttribute('transform').replace(/scale\([^)]*\)\s*$/, '') + ' scale(' + grow.toFixed(3) + ')');
      }
      if (fx.bellCloseup) {
        fx.bellCloseup.setAttribute('opacity', TL.clamp((t - 53.2) / 0.6, 0, 1).toFixed(3));
      }
      if (fx.birds) {
        var fly = reduced ? 0 : local * 34;
        fx.birds.a.setAttribute('transform', 'translate(' + (620 + fly).toFixed(1) + ',' + (150 - fly * 0.24).toFixed(1) + ')');
        fx.birds.b.setAttribute('transform', 'translate(' + (700 + fly * 1.2).toFixed(1) + ',' + (120 - fly * 0.3).toFixed(1) + ')');
      }
      if (fx.gate) {
        fx.gate.setAttribute('opacity', TL.clamp((t - 78.0) / 0.4, 0, 1).toFixed(3));
      }
      if (fx.lantern) {
        fx.lantern.setAttribute('transform', 'translate(660,600)');
        fx.lantern.setAttribute('opacity', TL.clamp((t - 80) / 0.6, 0, 1).toFixed(3));
      }
      if (fx.door) {
        var shut = TL.clamp((t - 95.0) / 2.2, 0, 1);
        fx.door.panel.setAttribute('transform', 'translate(146,900) rotate(' + (shut * -74).toFixed(2) + ')');
        fx.door.node.setAttribute('opacity', '1');
      }
      if (fx.thicket) {
        fx.thicket.setAttribute('opacity', '1');
      }
      if (fx.closedDoor) {
        fx.closedDoor.setAttribute('opacity', '1');
      }
      if (fx.faintEcho) {
        fx.faintEcho.setAttribute('opacity', (0.4 * TL.clamp((t - 123.5) / 1.2, 0, 1)).toFixed(3));
      }
      if (fx.lamb) {
        var lambOn = TL.clamp((t - 134.2) / 0.3, 0, 1) * (1 - TL.clamp((t - 135.5) / 0.2, 0, 1));
        fx.lamb.setAttribute('opacity', lambOn.toFixed(3));
        if (lambOn > 0.01) {
          fx.lamb.setAttribute('transform', 'translate(' + (1440 + (t - 134.2) * 240).toFixed(1) + ',520)');
        }
      }
      if (fx.fallenStaff) {
        fx.fallenStaff.setAttribute('opacity', TL.clamp((t - 139.2) / 0.4, 0, 1).toFixed(3));
      }
      if (fx.singleBell) {
        var roll = reduced ? 0 : (t - 136.0) * 90;
        fx.singleBell.setAttribute('transform', 'translate(980,792) rotate(' + (roll % 360).toFixed(1) + ')');
        fx.singleBell.setAttribute('opacity', TL.clamp((t - 136.0) / 0.3, 0, 1).toFixed(3));
      }
      if (fx.endCard) {
        /* 纸底不设淡入：140.4–141.0 的镜头叠化已经承担了「淡至纸白」的效果，
           若这里再淡一次，交叠处会出现黑场 */
        fx.endCard.node.setAttribute('opacity', '1');
        fx.endCard.title.setAttribute('opacity', TL.clamp((t - 142.0) / 0.6, 0, 1).toFixed(3));
        fx.endCard.moral1.setAttribute('opacity', TL.clamp((t - 143.0) / 0.6, 0, 1).toFixed(3));
        fx.endCard.moral2.setAttribute('opacity', TL.clamp((t - 143.4) / 0.6, 0, 1).toFixed(3));
        fx.endCard.sign.setAttribute('opacity', TL.clamp((t - 144.0) / 0.6, 0, 1).toFixed(3));
      }
    }

    function inWindow(t, a, b, fade) {
      return Math.min(TL.clamp((t - a) / fade, 0, 1), 1 - TL.clamp((t - b) / fade, 0, 1));
    }

    /* ---------------- 主渲染 ---------------- */
    scene.render = function (t, opts) {
      opts = opts || {};
      var reduced = !!opts.reducedMotion;
      var time = TL.normalizeTime(t);
      var tr = TL.transitionOpacity(time);
      var shots = TL.shots();

      var wanted = [];
      if (tr.prevIndex >= 0 && tr.prevOpacity > 0.001) {
        wanted.push({ shot: shots[tr.prevIndex], opacity: tr.prevOpacity });
      }
      wanted.push({ shot: shots[tr.index], opacity: tr.opacity });

      /* 挂载需要的镜头，摘掉其余的 */
      var keep = {};
      wanted.forEach(function (w) { keep[w.shot.id] = true; });
      Object.keys(scene.cache).forEach(function (id) {
        if (!keep[id]) detach(scene.cache[id]);
      });
      wanted.forEach(function (w) {
        var entry = ensureShot(w.shot);
        attach(entry, w.opacity);
        var cam = TL.sampleKeys(w.shot.camera, time, true);
        if (cam) applyCamera(entry, cam);
        placeActors(entry, w.shot, time, reduced);
        applyEffects(entry, w.shot, time, reduced);
      });

      /* 纸面落幅（开场卡 / 片尾卡）不要重暗角，否则暖白纸会发灰 */
      var activeShot = shots[tr.index];
      var isPaper = activeShot && (activeShot.palette === 'paper' || activeShot.id === 's01');
      vignette.setAttribute('opacity', isPaper ? '0.3' : '1');

      scene.lastKey = time.toFixed(4);
      return { shot: tr.index, transition: tr.transition.type };
    };

    scene.dispose = function () {
      Object.keys(scene.cache).forEach(function (id) { detach(scene.cache[id]); });
    };

    return scene;
  }

  root.CriedWolf.createScene = createScene;
  root.CriedWolf.sceneHelpers = { CAST: CAST, SHEEP_LAYOUT: SHEEP_LAYOUT, PARALLAX: PARALLAX };
})(typeof globalThis !== 'undefined' ? globalThis : this);
