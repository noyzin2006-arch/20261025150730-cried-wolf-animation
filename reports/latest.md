# 执行报告 TASK-001：《狼来了｜回声的代价》150 秒原创动画短片

## 结论

**READY_FOR_DELIVERY** —— 规划案的 12 条硬验收（AC01–AC12）全部达成；本机 `npm ci && npm run build && npm test` 三步退出码均为 0，
`npm test` 实测 **75 / 75 通过、0 失败**；浏览器审计 **105 项检查，91 PASS、14 NA、0 FAIL**；
导出的成片经 ffprobe 逐字段核验 **12 条断言全 PASS**（H.264 / yuv420p / 1280×720 / 30fps / 4500 帧 / AAC / 时长 150.000000 秒，偏差 0.000000 秒）。
「按规划案做完了」「测试通过」「质量达标」在本报告里是**三组独立证据**，分别见下。

---

## 0. 基本信息

| 项 | 值 |
|---|---|
| 任务号 | TASK-001 |
| 规划案 | `handoff/plans/TASK-001.md`（网页产出，commit `fb3da4b`，511 行） |
| 简报 | `handoff/briefs/TASK-001.md`，blob sha `9742aa640d7755bd8a4c25c3e1d6853226de08b5` |
| 交接指纹 | nonce `9bc8b94ea38c1879`，`handoff.sh verify` → **校验通过** |
| 执行 commit | `247d5bb`（实现）+ 本报告所在的后续 commit |
| 平台 | macOS 26.4.1（darwin 25.4.0，arm64） |
| Node / npm | v26.0.0 / 11.12.1 |
| Playwright | 1.64.1（chromium-1248 已缓存，未下载浏览器） |
| FFmpeg / ffprobe | 8.1.1（libx264 + aac 均可用） |
| 仓库 | github.com/noyzin2006-arch/20261025150730-cried-wolf-animation（**public**，交接需要匿名读取） |

---

## 1. 抢跑自检

- `scripts/plan-gate.sh require-plan <仓库>` 放行时间：**规划案到位并通过指纹复核之后**（指纹校验输出 `校验通过` 同批次）。
- 规划案到位之前，本机在受管路径下写下的文件：**0 个**。
- 闸门有效性是**实测**过的，不是假设：
  1. 简报提交后，闸门状态从 `CURATION` 变为 `PLAN_BLOCK`；
  2. 故意在受管路径 `src/` 下创建 `src/__gate_probe.js` 并提交 → pre-commit 钩子拦截，**提交退出码 1**，并打印「网页规划案还没到位」；
  3. 探针文件已删除，工作区恢复干净。
- 规划案到位后另做了一次 probe 提交（退出码 0），确认闸门只在规划案缺失时拦截、存在时不误伤。
- 结论：**规划案回来之前没有写任何实现代码**（内核、测试、构建脚本都没有抢跑）。

---

## 2. 需求与验收对照（AC01–AC12）

| # | 规划案的验收标准 | 怎么验的 | 结果 | 证据位置 |
|---|---|---|---|---|
| AC01 | `npm ci && npm run build && npm test` 退出码全 0，测试数从 stdout 解析 | 逐条执行，解析 TAP 汇总行 | **PASS** | `reports/npm-test.txt`：`ℹ tests 75 / ℹ pass 75 / ℹ fail 0` |
| AC02 | dist 生产页外部请求 0、console error 0、pageerror 0 | Playwright 拦截全部非本机请求并计数 | **PASS** | `reports/browser-audit.json`（multi/single 两个变体均为 0） |
| AC03 | MP4：h264 / yuv420p / 1280×720 / 30fps / 4500 帧 / AAC / 150±1 帧 | `scripts/verify-video.mjs` 逐字段断言 | **PASS**（12/12） | `reports/ffprobe.json` |
| AC04 | 15 镜连续覆盖 [0,150)，字幕不越镜，分镜表齐备 | `tests/story.test.mjs` 硬断言 | **PASS** | `docs/storyboard.md`（18736 字节，由真源生成） |
| AC05 | frameId 唯一、时间严格递增、同帧像素一致 | 连取 60 帧 + 同帧两次截图哈希比对 | **PASS** | `tests/browser.test.mjs`「连续 60 帧」「逐帧确定性」 |
| AC06 | 动画只改 transform / opacity | 抽查 60 帧所有内联 style，白名单外属性计数 | **PASS** | `tests/browser.test.mjs`「动画只改 transform / opacity」 |
| AC07 | 五断点无横滚、控件不重叠、键盘可达、焦点可见、reduced-motion 降级 | 375/480/768/1024/1440 逐个量 | **PASS** | `reports/browser-audit.json` + `reports/screenshots/width-*.png` |
| AC08 | A–E 逐条有结论，G 禁项 = 0，正文对比度 ≥ 4.5:1 | 对比度用 WCAG 公式实算并归档 | **PASS** | `reports/contrast.json`（12 组实算，全部达标） |
| AC09 | `dist/single.html` 用 `file://` 打开可播放、零错误、零外部请求 | Playwright `file://` 新 context | **PASS** | `tests/browser.test.mjs`「单文件版（file://）」 |
| AC10 | 三次呼喊 / 两次上山 / 第三次无人 / 羊被叼走 / 寓意落幅可辨 | **人工逐镜看图**（不是只查 DOM 文案） | **PASS** | `reports/screenshots/shot-*.png`（15 镜 + 6 边界帧） |
| AC11 | 反馈 ≤ 100ms、CLS ≤ 0.1、连续播放不音画漂移 | 点击播放后比对 `audio.currentTime` 与画面时刻 | **PASS**（漂移 < 0.25s 量级内；CLS 实测 = 0） | `tests/browser.test.mjs`「点击播放后音轨真的在走」 |
| AC12 | 不跑 CI、不用外部素材、无 mock 占位、无远程服务依赖 | 仓库无工作流；源码零外链；构建自检裸 hex | **PASS** | `gh api .../actions/workflows` → 0；构建产物自检第 6 步 |

---

## 3. 设计落地对照（对照 `handoff/spec/design-quality-bar.md`）

| 质量线 | 结论 | 证据 |
|---|---|---|
| A1 排版 | **PASS** | 8 级字阶（12.8→61.04px，倍率 1.25）、中英双字体栈、等宽数字 `tabular-nums`、正文行长限制；令牌见 `src/tokens.js` `type` / `font` |
| A2 色彩 | **PASS** | 4 套独立调色板 × 53 键，全部来自单一令牌文件；正文 15.32:1、次要 10.32:1、弱文字 6.28:1、强调 9.09:1、边框 ≥3:1、禁用态 ≥2:1（实算见 `reports/contrast.json`） |
| A3 间距与栅格 | **PASS** | 4px 基准栅格（4/8/12/16/24/32/48/64/96）、容器限宽 1200px 居中 |
| A4 形状与层级 | **PASS** | 圆角 4/8/12/16/999 五档、阴影 5 档、z-index 七级集中管理 |
| A5 图标与媒体 | **PASS** | 10 枚自绘 SVG 图标（24×24 网格、2px 描边、圆头），**零 emoji、零外部图标库**；插画全部原创矢量，宽度/高度由 `aspect-ratio` 固定 |
| B1 状态完整性 | **PASS** | C1–C10 每态都有具体表现；禁用态用 `aria-disabled` + 文案说明原因（仍可聚焦，符合 B1 要求） |
| B2 反馈与时序 | **PASS** | 按钮点击立即改文案/aria，音轨起播失败有中文可恢复提示，无 >10s 不可取消任务 |
| B3 导航与 IA | **PASS** | 单页两层：header → 舞台 → 控制 → 说明 → 页脚；首屏即见 CTA |
| B4 文案 | **PASS** | 无「暂无数据」「操作失败」「确定吗？」；错误文案给具体原因与下一步 |
| B5 响应式 | **PASS** | 五断点实测：无横向滚动、控件零重叠、按钮命中区 ≥44×44（进度条按 spec 例外，记 NA） |
| C 无障碍 | **PASS** | 键盘走查可达播放控件且焦点环 ≥2px；语义标签 + `aria-live` + `aria-pressed` + `aria-valuetext`；`prefers-reduced-motion` 降级；200% 文字缩放不裁切 |
| D 性能 | **PASS** | CLS 实测 = 0；动画只走 transform/opacity；导出为离线逐帧（实测 7.8 帧/秒，4500 帧约 10 分钟） |
| E 工程与一致性 | **PASS** | 令牌单点（331 个 CSS 变量由 `src/tokens.js` 编译）；`src/` 与 `styles/` 零裸 hex（构建期强制自检）；无遗留 TODO |
| **G 禁项** | **0 违反** | 无默认按钮/字体、无占位文案、同类规格一致、八态齐备、焦点可见、移动不重叠、零 emoji、单一图标集、零裸 hex、颜色不单独表意、零 layout 动画、尊重 reduced-motion |

---

## 4. 视觉自检（亲自看图，不是「应该没问题」）

| 检查项 | 看的是什么 | 看到什么 | 结论 |
|---|---|---|---|
| 默认态（海报） | 首屏静止画面 | 暖纸开场卡 + 麦黄圆日 + 五重山形 + 淡入片名「狼来了」，下方是故事梗概与播放控件 | PASS |
| 15 镜代表帧 | 1.5/12/24.5/31/43/56/65/72/85/97/108/115/126/136/146 秒 | 昼夜三段调色递进清晰；镜 03 树影揭示；镜 04/08/12 三次回声形态各异（完整 → 碎裂 → 断裂）；镜 11 狼的金瞳先于人看见；镜 13 门关着、灯亮着；镜 14 少了羊 | PASS |
| 边界帧 | 27.966/28、100.966/101、140.966/141 | 无跳镜黑屏、无撕裂，叠化处两镜同框 | PASS |
| 空态 | 未开始播放 | 舞台显示静态开场卡，状态条提示「动画已准备好，时长 2 分 30 秒」 | PASS |
| 加载态 | 资源未就绪 | 播放按钮 `aria-disabled=true` + 「音轨还在准备，请稍候再试」 | PASS |
| 错误态 | 故意打断音轨 | 中文说明 + 可重试按钮，不静默 | PASS |
| 成功态 | 播放中 | 按钮切「暂停」，状态条「正在播放」，toast 确认 | PASS |
| 悬停 / 聚焦 | 控件态 | 悬停变底色、按下缩放 0.96、焦点环 3px 暖金且不被裁掉 | PASS |
| 375px 窄屏 | 移动端整页 | 单列、两行工具栏、字幕 20/30px、命中区 44px、无横向滚动 | PASS |
| 1440px 宽屏 | 桌面整页 | 舞台限宽 1200 居中，控制一行排布 | PASS |
| 200% 文字缩放 | `zoom-200.png` | 控件换行、无重叠、无裁字 | PASS |
| reduced-motion | `reduced-motion.png` | 仍有完整画面（固定关键姿态），未黑屏 | PASS |
| 键盘走查 | Tab / Enter / Esc | 顺序：跳转链接 → 播放 → 重播 → 字幕 → 静音 → 音量 → 进度 → 章节 → 影院；焦点环可见；Esc 退影院 | PASS |

**人工审美最终判断**（规划案 §10 规则 8）：每镜主体动作与空间轴可读；视线焦点不超过两处；真狼只在 101s 之后出现（镜 11/12/14）；
三次呼喊在**时间轴 / 声音 / 字幕**三处均可区分；第二次村民态度明显恶化（镜 10 背身推门）；121–132s 固定机位且用「门关着、屋里灯亮着」表达无人上山；
146s 片尾主文与两行寓意完整可读。**六条全部成立。**

---

## 5. 本轮实际改动

- commit `247d5bb`「feat: 《狼来了｜回声的代价》150 秒原创动画短片」
- 新增文件：
  - `data/story.json`（唯一真源：15 镜 + 53 个声音事件 + 出场表）
  - `src/`：`tokens.js` `story-data.js` `geometry.js` `timeline.js` `scene.js` `audio-player.js` `icons.js` `ui.js` `main.js`
  - `styles/main.css`、`index.html`
  - `scripts/`：`generate-audio.mjs` `build.mjs` `build-storyboard.mjs` `serve.mjs` `export-video.mjs` `verify-video.mjs` `audit-browser.mjs`
  - `tests/`：`story` `timeline` `audio` `contrast` `build` `browser` 六组
  - `docs/storyboard.md`、`README.md`
- 产物：`dist/index.html`、`dist/single.html`、`dist/styles/main.css`、`dist/src/*.js`、`dist/assets/score.m4a`、`exports/cried-wolf.mp4`
- 设计令牌文件：`src/tokens.js`（唯一令牌真源；构建期编译成 331 个 CSS 变量写进 `dist/styles/main.css`）
- 证据：`reports/latest.md`、`reports/npm-test.txt`、`reports/browser-audit.json`、`reports/contrast.json`、`reports/ffprobe.json`、`reports/screenshots/`（37 张）

### 产物指纹

| 文件 | 字节数 | sha256 |
|---|---|---|
| `exports/cried-wolf.mp4` | 14,279,547 | `192acd385d20ff9b1b915c45bddac3bf4e02d2d2c38ba060ed79a022d42c9461` |
| `dist/single.html` | 3,340,124 | `146f7360fbb65e8fc29577246dd2985e704a9445290e65a98e4a2532a6bbbf1d` |
| `dist/assets/score.m4a` | 2,353,195 | `f9d3d9b181f72b2f5864247732378ed003e4bc3d8580d7bb5b0e393bb91fdcb0` |

---

## 6. 测试证据

```
命令：npm ci            → 退出码 0（added 2 packages；playwright 锁定 1.64.1）
命令：npm run build     → 退出码 0（6/6 步：真源校验 → 音轨 → 分镜表 → 令牌 → 多文件 → 单文件 → 产物自检）
命令：npm test          → 退出码 0
      ℹ tests 75
      ℹ pass 75
      ℹ fail 0
      ℹ skipped 0
命令：npm run audit     → 退出码 0（共 105 条检查，PASS 91，FAIL 0，NA 14）
命令：npm run export    → 退出码 0（4500 帧，7.8 帧/秒，约 10 分钟）
命令：npm run verify    → 退出码 0（12 条断言，PASS 12，FAIL 0）
```

- 测试数量 **75** 是从 `reports/npm-test.txt` 的 TAP 汇总行解析出来的，不是手抄。
- 音轨的硬指标（`tests/audio.test.mjs` 读真实 WAV 字节）：采样点 **7,200,000**（= 150.000s @48kHz）；
  119.5–123.5s 区间**逐点严格为 0**；两段「停一拍」同样逐点为 0；峰值 **-1.500 dBFS**；首尾采样点为 0。
- 浏览器硬指标：同帧两次截图 sha256 相同；连续 60 帧 frameId 互不相同、时间严格递增、像素哈希 ≥55 个不同；
  两轮遍历 15 镜后 DOM 节点数**不再累积**（峰值 < 600，活动节点远低于 450 预算）。

---

## 7. 偏离规划案之处

| # | 规划案写的 | 实际做的 | 原因 | 依据 | 影响 |
|---|---|---|---|---|---|
| 1 | §5.6 首选 `src/story-data.js` 为真源，冲突时再改成 `data/story.json` | **采用 `data/story.json` 为唯一真源**，构建期生成 `src/story-data.js` | 页面脚本必须是经典脚本（file:// 兼容），经典脚本无法被 Node 直接 `import`；反过来 Node 直接读 JSON 最稳 | 规划案 §5.6 明写允许这一分支 | 无。构建每次重新生成 `src/story-data.js`，并有测试断言两者完全一致 |
| 2 | §3.1 给了色值但未穷举四套调色板 | 补了 `boyCapeDark` `boyTrouser` `trunk` `bell` `dangerRed` `ink` `paper` `wolfRim` `hillDark` | 造型需要这些颜色；缺一项就会渲染成黑块（实际踩过：`boyCapeDark`/`trunk`/`bell` 缺失导致披风领口、牧杖、羊铃全变黑） | 质量线 A2「颜色全部来自设计令牌」 | 视觉明显变好；四套调色板键集现已强制一致（有测试） |
| 3 | §5.4 镜 01「深墨蓝开场静纸」+「墨色大字」 | **暖纸底 + 墨色大字**，深墨蓝交给暗角 | 两条自相矛盾：深墨底上写墨色大字不可读（对比度不足） | 质量线 A2「正文 ≥ 4.5:1」优先于字面描述 | 开场更接近「纸雕版画」的整体语言，片尾卡与它呼应 |
| 4 | §5.3 少年 8 个姿态 | **没有新增姿态**；「嘴角一扬」用既有 `B-idle`/`B-laugh` 表达 | 规划案的姿态词典是定死的施工表 | §5.3 | 无 |
| 5 | §5.4 镜 12「回声线在画面中部被暗色山脊截断」 | 以**断裂的纸线 + 断口**表达截断，未做山脊几何遮挡 | 山脊在 `mid` 层，遮挡需额外遮罩层，收益低于复杂度 | §6 规则 2（按优先级取舍并记录） | 叙事仍然成立（回声断掉 = 没人应） |
| 6 | §3.2 C5 进度条写 `max=4500`，同节又说明有效帧为 4499 | 实现用 **max=4499** | 规划案自己指出了这个矛盾并要求以有效帧为准 | §3.2 C5 括注 | 无（避免导出多一帧导致帧数 4501） |
| 7 | §5.7 构建步骤 | 多了一步「由真源生成分镜表」 | 分镜表要同时是人读的施工表和机器数据，单一真源要求它必须生成 | §5.6 单一真源 | 多一份 `docs/storyboard.md`，不会漂移 |
| 8 | §5.7 导出固定 4500 帧 | 增加 `--frames N` 小样参数（**默认仍是 4500**，小样写到 `.cache/` 不同文件名） | 排障时不必等 10 分钟 | §5.7「前 30 帧小样导出单独测试 ffmpeg 管道」 | 正式产物不受影响；本报告的成片是**跑满 4500 帧**的结果 |

**没有偏离的地方**：15 镜结构与时长、三次呼喊与两次上山的剧情骨架、119.5–123.5s 强制静默、四套调色板与 8 级字阶、
镜头语言与视差系数、零外部请求、零裸 hex、逐帧确定性导出、H.264/AAC 成片参数、影院式播放器与四态。

---

## 8. 未知项调查结果（规划案 §7 的 U1–U9）

| 条目 | 类型 | 实际怎么查的 | 查到了什么 | 据此做了什么决定 | 用了默认值？ |
|---|---|---|---|---|---|
| U1 ffmpeg/ffprobe 与编码器 | 有入口 | `ffmpeg -version`、`ffmpeg -encoders`、`ffprobe -version` | 8.1.1，libx264 与 aac 均在 | 直接按规划案参数导出 | 否 |
| U2 playwright 版本与 Chromium 缓存 | 有入口 | `npm view`、本地 `node_modules` 版本、`chromium.launch()` 实测 | 1.64.1，chromium-1248 已缓存，可无头启动 | 锁死 1.64.1，**未下载浏览器** | 否 |
| U3 `file://` 单文件行为 | 有入口 | `pathToFileURL(dist/single.html)` + Playwright + 审计 single 变体 | 可打开、可播放音轨、零外部请求、零 console error | 单文件内联 data URI 音轨的做法成立 | 否 |
| U4 真实性能 | 无入口 | 本机自证：导出实测 7.8 帧/秒（4500 帧 ≈ 10 分钟）；CLS 实测 = 0；交互反馈为即时状态切换 | 离线导出速率足够，布局零偏移 | 纸纹每镜 170 条静态笔画，不做动态纹理；截图严格串行 | 采用保守默认（动态纹理已按规划案默认关闭） |
| U5 MP4 是否可入库 | 有入口 | `stat` 文件大小 + GitHub 100MB 限制 | 14.28 MB，远低于上限 | MP4 与 single.html 一并入库 | 否 |
| U6 中文字体实际命中 | 无入口 | 本机自证：`reports/screenshots/shot-*.png` 逐镜目视核对 | 中文字形正常（PingFang SC 命中），无豆腐块、无溢出 | 维持规划案的字体栈与 fallback | 否 |
| U7 375px / 200% 下字幕与工具栏 | 无入口 | 本机自证：`zoom-200.png` + 五断点矩形碰撞检查 | 无重叠、无裁切、无横向滚动 | 移动端字幕 20/30px、最多 2 行 | 否 |
| U8 参考短片的逐镜技法 | 无入口 | 保守默认：只使用能核实的获奖事实，**不引述未核实的镜头特征** | 不使用外片资产，全部原创 | 美术完全按规划案原创，不做「致敬镜头」 | **是（保守默认）** |
| U9 未手势能否自动播 | 有入口 | 浏览器策略 + 页面实现 | 会被拦截，故必须用户点击 | 默认不自动播，按钮在未就绪时 `aria-disabled` 并给出原因 | 是（产品既定决策） |

---

## 9. 本机环境与限制

- macOS 26.4.1 / arm64；Node v26.0.0；npm 11.12.1；ffmpeg 8.1.1；Playwright 1.64.1（Chromium headless）。
- 无 TTY、无付费 API、无真机。
- **本轮因此没做的事**：没有做真人配音（规划案明确「无旁白」）；没有做多语言；没有做真机与其它浏览器适配。

---

## 10. CI 与远程检查

- **本机没有配置 CI，也没有主动触发或等待 CI。**
- 仓库不存在 `.github/workflows`（`gh api .../actions/workflows` → `total_count = 0`），历史运行数 `total_count = 0`。
- `scripts/check-workflows.sh` 判定：**安全 —— 本轮推送不产生远程 CI 运行**。
- 因此本报告的全部结论**只以本机实测证据为准**。

---

## 11. 已知限制 / NOT_TESTED

- **NOT_TESTED**：Safari、Firefox、Edge 与手机真机未测试；本轮所有浏览器结论都基于 macOS / Chromium（Playwright 1.64.1）。
- 导出耗时取决于 CPU：实测 7.8 帧/秒、4500 帧约 10 分钟，**没有实时导出保证**。
- 无旁白：意义由中文字幕、场景声与原创配乐承载（规划案既定）。
- `dist/single.html` 为 3.34MB（含内联 AAC 音轨），单文件分发体积较大，但可完全离线打开。
- 原始 WAV（14.4MB）放在 `.cache/`，按规划案不入库；成片可由 `npm run build && npm run export` 完整复现。

---

## 12. 交接是否真实发生

- **投递通道：A —— 网页版 ChatGPT 聊天模式**（顶栏「聊天」为选中态，非「工作」模式；模型选择器显示 `6 High`，即思考强度 High）。
- 对话 URL：<https://chatgpt.com/c/6addab4c-fe48-83e8-af1d-0ac4f228974a>（已记入 `handoff/session.md`）。
- 网页**读到的简报版本**：blob sha `9742aa640d7755bd8a4c25c3e1d6853226de08b5`，nonce `9bc8b94ea38c1879`（该 sha 已由本机用 `handoff.sh info` 读取并写进提示词）。
- 网页**交回的规划案**：commit `fb3da4b`，`handoff/plans/TASK-001.md`，511 行；文件头**原样**带回五行指纹。
- **指纹复核**：`handoff.sh verify ... --kind plan --local handoff/briefs/TASK-001.md` → **校验通过**；`plan-gate.sh require-plan` → **放行（exit 0）**。
- 网页在写作前**自行上网调研**：其步骤记录显示「已搜索 21 个网站」，并读取了三份规格文件。
- **交接仓可见性：public**。原因：网页普通聊天模式靠匿名读取 GitHub blob 链接拿简报与规格，private 会让它空转一轮才失败。
  代价是源码与规划案公开——这是交接机制的必要条件，不是疏忽。
- 交接是**真实**的：规划案由网页写入远端 commit，本机只负责 merge、复核指纹与执行；本机没有冒充网页产出。

### 本轮实际使用的网页提示词（全文）

```
仓库：noyzin2006-arch/20261025150730-cried-wolf-animation（公开仓，链接可直接读）

请读这份简报并提交完整规划案：
https://github.com/noyzin2006-arch/20261025150730-cried-wolf-animation/blob/main/handoff/briefs/TASK-001.md

规划案规格：https://github.com/noyzin2006-arch/20261025150730-cried-wolf-animation/blob/main/handoff/spec/plan-spec.md
质量线：https://github.com/noyzin2006-arch/20261025150730-cried-wolf-animation/blob/main/handoff/spec/design-quality-bar.md
只读这三个文件，不要翻仓库其他部分。先上网调研该品类当下最高水准的产品与设计系统，列出学习结论，再写规划案。

文件开头必须原样带上以下五行交接指纹（不要改写、不要重排）：
kind: plan
task: TASK-001
round: 1
nonce: 9bc8b94ea38c1879
brief_sha: 9742aa640d7755bd8a4c25c3e1d6853226de08b5

写入并推送：https://github.com/noyzin2006-arch/20261025150730-cried-wolf-animation/blob/main/handoff/plans/TASK-001.md
若 GitHub 写入或推送失败，就直接把规划案全文用 markdown 代码块输出给我。
```

---

## 13. 后续

- 无未决阻塞。
- 可选后续（需用户决定）：把 `dist/` 发布为公开网址，便于直接在线播放（需用户明确授权后再执行公开部署）。
