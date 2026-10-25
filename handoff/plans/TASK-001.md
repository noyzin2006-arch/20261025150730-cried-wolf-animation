kind: plan
task: TASK-001
round: 1
nonce: 9bc8b94ea38c1879
brief_sha: 9742aa640d7755bd8a4c25c3e1d6853226de08b5

# TASK-001｜《狼来了》150 秒原创动画短片：首轮完整制作与验收规划
版本：2026-10-25；状态：READY_FOR_EXECUTION；执行角色：本机执行 Agent；目标分支：main。
权威输入仅为 handoff/briefs/TASK-001.md（blob 9742aa640d7755bd8a4c25c3e1d6853226de08b5）、handoff/spec/plan-spec.md（blob 01a51bbde14c05b27df30364240d9fc9169540af）、handoff/spec/design-quality-bar.md（blob d11c1410d71c9ac2c8819b43ba82588ba2d7a738）。本规划只调研、定方案；不宣称已制作、已执行测试或已核对成片。

## 1. 需求、范围与非目标

### 1.1 目标与制作判断
用户原话：「制作一个精美的、极其精美、简直可以上线播放的Flash动画。当然也可以不是Flash了，而是现在更好的这种制作工具。然后主题就是狼来了的故事。」
交付的不是 Flash/SWF、小样或互动小游戏，而是可独立播放、可离线分享、可导出 MP4 的 150.000 秒、16:9、简体中文完整寓言动画。片名《狼来了》；副题《回声的代价》。叙事要求三次警报（前两次为假、第三次为真）、两次村民上山、第三次无人援助、羊被叼走，最后有明确寓意。制作风格定为「原创山野版画剪纸＋纸纹层叠景深＋低帧率角色姿势节奏、30fps 电影成片」，而非声称能靠基础 DOM 动画达到手绘长片水准。角色形象原创，拒绝模仿任何现成动画中的具体造型、镜头或素材。

### 1.2 本轮范围
A. 完整 15 镜/150 秒分镜、逐镜字幕和原创声画时间表；docs/storyboard.md 成为制作唯一真源。
B. SVG 分层 1600×900 逻辑画布；每镜 7+ 空间层；可控的摄影机平移与推进；原创角色的可复用 pose 组件；无外部媒体。
C. 纯函数驱动的任意时间点可重现的场景渲染；播放器支持播放、暂停、重播、字幕开关、进度拖动、场景跳转、全屏影院。
D. 本机 Node 脚本合成完整音乐/效果声 WAV，ffmpeg 转 AAC/M4A；浏览器音轨同步；严禁静音视频冒充成片。
E. Playwright 帧导出、ffmpeg H.264/yuv420p/AAC、1280×720、30fps 的 MP4；150.000 秒 ± 1/30 秒；完整采样 4500 帧。
F. 生产多文件 dist/index.html 和真正资源内联的 dist/single.html，后者可 file:// 直接打开。
G. 零外部请求、零 console/pageerror、关键流程、375/1440 响应式、键盘、减弱动效、颜色对比、视觉证据和本机执行报告。

### 1.3 不做
不做 SWF、后端、账户、云存储、评论、支付、后台、游戏化分支、数据库、多语言系统、3D 模型、外部音源或图片下载、真人配音、付费 API、CI/Actions 配置/触发、真机承诺、原生应用。无旁白：用中文字幕、戏剧性的场景声和原创配乐承载意义；不存在等待配音供应商的依赖。

### 1.4 验收编号（全部硬闸门）
AC01 npm ci && npm run build && npm test 三者 exit 0；测试计数由 stdout/TAP 解析。
AC02 dist 的生产页实测非同源/外部网络请求 0，console.error 0，pageerror 0；允许本机 localhost 提供构建产物，不允许 CDN。
AC03 exports/cried-wolf.mp4 可 ffprobe 证明视频 codec_name=h264、pix_fmt=yuv420p、width=1280、height=720、avg_frame_rate=30/1、nb_read_frames=4500、音轨 codec_name=aac；整体时长与 150.000 秒相差不大于 0.033334 秒。
AC04 15 镜连续覆盖时间区间 [0,150)，没有空隙、重叠或无定义态；docs/storyboard.md 有镜号、时间、构图、台词、音效、转场、寓意。
AC05 任意 frameId 对应确定的唯一时间点 i/30；采样连续 60 帧的 frameId 各不相同、时间严格递增，并跨越至少一处镜头边界；相同帧重复截屏像素哈希相同（环境、浏览器版本、字体一致时）。
AC06 动画中只有 transform/opacity 变化，不做 layout 属性动效；检查 CSS 动画规则、JS 样式写入及 SVG 视觉变换；常量背景切换必须是层间 opacity 叠化，不能动画 fill/color/stop-color。
AC07 375、480、768、1024、1440px 宽度无横向滚动与控制区互相遮盖；键盘完整操作；可见 focus；reduced-motion 有静态构图/硬切镜头方案。
AC08 A–E 所有条目逐条标 PASS/NA/FAIL 并附证据；G 零违反；正文/字幕对比度不少于 4.5:1、非文本边界至少 3:1、禁用态能辨识至少 2:1。
AC09 dist/single.html 用 file:// 新建浏览器上下文打开，不经 HTTP、无外部资源、console/pageerror 为 0，声轨能经用户点击播放。
AC10 前两次明确为假的叫喊、两次村民到达、第三次真狼与无人救援、羊被叼走及完整寓意视觉可辨（逐时点截图/人工复核）；不可只检测 DOM 文案而忽视画面。
AC11 满足首屏可交互 ≤2.5s、本机控件反馈 ≤100ms、CLS ≤0.1；播放器 150 秒连续播无累积音画偏移超过 100ms（以声轨 currentTime 作主时钟，抽样）。
AC12 强制不执行 CI、不使用外部素材、不留 mock/灰色占位、无依赖于远程服务。

### 1.5 环境、依赖与浏览器
已知：macOS 26.4.1 arm64、Node 26.0.0、npm 11.12.1、ffmpeg 8.1.1（libx264/aac）、Playwright 1.64.1 与已缓存 Chromium；这些是简报陈述，执行前用第 7 节核对，不把它当本轮已复测。唯一第三方 npm 开发依赖锁定 playwright@1.64.1，入口 https://www.npmjs.com/package/playwright ，与 2026-10-25 查询到的 npm 页面对应；运行时依赖 0；不引入 Rive、GSAP、Three.js、PixiJS、Vite、React、字体库。Node 内建 http/fs/path/crypto/child_process/test；浏览器原生 SVG、DOM、Audio。目标浏览器为本机 Chromium（Playwright），其它浏览器不宣称验收通过。FFmpeg/ffprobe 是外部命令工具、不是 npm 库。

## 2. 调研结论与最高水准参照

### 2.1 已核验的具体标杆：是什么、学什么、不学什么
| 标杆及核验位置 | 业内代表性/可核事实 | 精确学习对象 | 明确不复制 |
|---|---|---|---|
| The Girl Who Cried Pearls：美国电影艺术与科学学院 2026 最佳动画短片获奖名单 https://www.oscars.org/oscars/ceremonies/2026 | 2026 年最佳动画短片获奖作品，属于当期严肃动画短片评价基准 | 片子的情绪与核心物象必须强于技术演示：本片将「羊铃→回声→静默」设计成三次复现的声音叙事符号 | 不复制该片人偶/造型/故事/具体画面；官方获奖名单并不能证明任何特定镜头技法，未观察即不声称 |
| In the Shadow of the Cypress：学院 2025 获奖名单 https://www.oscars.org/oscars/ceremonies/2025 | 2025 年最佳动画短片获奖 | 以极少事件体现心理后果；本片第二次谎言之后用村民慢慢合上的门而非冗长解释表达信任坍塌 | 不照搬其角色、场景及表现手法；其具体剪辑细节未能从奖项页面查证 |
| Wolfwalkers：Cartoon Saloon 官方项目 https://www.cartoonsaloon.ie/irish-animation-studio/feature-films/wolfwalkers/ | 具代表性的非写实二维美术、可见线条和图形化空间 | 学「自然物不是贴图堆叠，而是有方向的线、块与留白」；本片用 5 层山坡、木刻轮廓、风带与羊群重复节奏 | 不复制爱尔兰纹样、角色脸型、色彩方案，不用复杂伪 3D 增加无关成本 |
| The Boy, the Mole, the Fox and the Horse：Apple 获奖官方稿 https://www.apple.com/newsroom/2023/03/Apple-TV-plus-wins-Academy-Award-for-The-Boy-the-Mole-the-Fox-and-the-Horse/ | 2023 奥斯卡最佳动画短片；插画语言转动态影像获官方确认 | 学「每帧可读的插画构图＋情绪停顿」；本片用 4–6 秒凝视空山坡、老村民停住脚步、空掉的一只羊铃建立节奏 | 不抄其插画笔触、叙事语气和对白长度 |
| Pixar SparkShorts / Kitbull：官方系列 https://www.pixar.com/sparkshorts | Pixar 为短片实验与新叙事工作流设立的系列，Kitbull 是其作品之一 | 学小体量也要有完整起因—重复—转折—结果；本片固定三个可被读懂的呼喊节点及情绪反应，角色动作先看轮廓是否清楚 | 不学制作规模、不堆更多角色剧情、不试图仿制任何 Pixar IP |

上述标杆是审美与叙事质量参照，不是证明本项目能自动达到奥斯卡级别的承诺。可核查到的事实与本规划的原创方法已分开标注。

### 2.2 设计系统、交互规范与工程依据
1. W3C WCAG 2.2：https://www.w3.org/TR/WCAG22/ ；文本 4.5:1、大字 3:1、非文本 3:1、键盘、文本放大、减少动态刺激。落在字幕层、按钮与焦点设计，不将颜色作为唯一信号。
2. Material Design 3 Motion：https://m3.material.io/styles/motion/easing-and-duration 和 https://m3.material.io/styles/motion/overview/how-it-works 。学习明确的空间运动时长与缓动层级；影片镜头不照搬 UI 动效，控制条只用 120/220/360ms 的克制状态变化。
3. Rive 动画状态机官方说明：https://rive.app/docs/editor/state-machine/state-machine ；学习把时间线（作品内部）和播放/暂停/重播（交互状态）分开；实际不引入 Rive，因为本项目导出需要完全可寻址的帧而非依赖编辑器 runtime 状态。
4. Playwright 截图官方文档：https://playwright.dev/docs/screenshots ；page.screenshot 能直接返回 Buffer，用于 4500 帧顺序管道而非几千张落盘大图。
5. FFmpeg 官方格式文档：https://ffmpeg.org/ffmpeg-formats.html ；image2pipe 提供 PNG 图像序列输入，结合 libx264 和 AAC 音轨合成。
6. MDN OfflineAudioContext：https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext/startRendering ；浏览器音轨可离线渲染，但本方案改用 Node 原创 PCM 合成，更方便同一音轨用于播放与导出，避免音频实时调度非确定性。
7. MDN media.play()：https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play ；用户首次点击后才开始声音，捕获 Promise 拒绝并显示可恢复提示。
8. Playwright 包 https://www.npmjs.com/package/playwright ；查得 1.64.1；npm ci 锁包，禁止浮动 ^ 版本。
9. 原创素材合法性：伊索寓言故事结构处于公共领域；角色、线条、配乐、对白、镜头均为本项目新创作。不能把参考片角色或品牌素材搬进项目。

### 2.3 2026 品类判断与制作结论
受欢迎的短片审美不是「粒子越多越电影」：图形轮廓可读、配色有叙事功能、声音主题反复、关键动作可辨、屏幕适配与无障碍同样重要。SWF/Flash 技术与默认浏览器控件、过密转场、无意义漂浮粒子、AI 水印/网络拼图式素材均被本项目淘汰。达标定义：静音看三段仍懂真假，闭眼听懂三声警报的相似与第三次的反差，逐帧导出与网页播放器是同一视觉时间线且验收有真实证据。

## 3. 设计语言：可执行令牌和组件

### 3.1 视觉原则与唯一真源
作品视觉为「纸雕木刻田野」：路径用几何闭合曲线、轮廓描边、分面色块；纸纤维用固定种子生成 2px～6px 细短划线（每镜最多 180 条，不做大量动态纹理）；人物无渐变塑料 3D 高光。UI 在故事之外采用深色影院外壳。唯一令牌文件 src/tokens.js，导出 window.CriedWolf.tokens；CSS 变量、SVG 颜色、几何色值、声画颜色角色全部由此模块注入。除了令牌定义，任何脚本、样式、SVG 字面量不得出现裸 hex。

#### 完整令牌表
| 类别/令牌名 | 值 | 用途与约束 |
|---|---|---|
| ui.bg0 / bg1 / bg2 / overlay | #111B24 / #202E36 / #24333D / #30414A | 整页/播放器盒/悬浮菜单/提示浮层；无浅色 UI 主题 |
| ui.text0 / text1 / text2 / textInverse | #F4F0E8 / #B6CBD0 / #889FA8 / #111B24 | 主文字/次文字/弱辅助文字/暖金按钮上的文字 |
| ui.border0 / border1 | #7A9098 / #B6CBD0 | 低层边框/焦点外辅助；边框须与邻接背景至少 3:1，未达到时用 border1 |
| ui.accent / accentHover | #E4B36B / #F3C888 | 播放 CTA、焦点、进度指示；深色背景对比度高 |
| ui.success / warning / danger / info | #92D8AF / #E4B36B / #ED8F7D / #8DD4E4 | 加文字/图标标识；绝不只靠色彩 |
| ui.disabledText | #7A9098 | 在 bg0 对比度约 5.20:1；不要用更淡的透明度降至 <2:1 |
| film.daySky / sun / farHill / midHill / grass | #F3D9A6 / #EDB86C / #C1B88F / #8DA787 / #5B856F | 0–60s 暖白纸地景，避免饱和荧光绿 |
| film.duskSky / duskHill / duskEarth | #697D87 / #4A5C69 / #344950 | 60–101s 情绪变冷；由完整图层交叉淡入淡出，不逐帧改 fill |
| film.nightSky / nightHill / dangerRed | #283A56 / #263342 / #923E46 | 101–141s 真狼、危险；危险只出现在背光/天边，不用血腥表现 |
| film.paper / ink / sheep / woolShade | #F5EAD1 / #26333A / #FAF6E8 / #D7D2C2 | 插画亮面纸色/描边/羊身/阴影 |
| film.boyCape / boySkin / boyHair / villager | #C16C44 / #E7B58A / #293640 / #66564D | 主角标识暖橘披风；村民质朴灰褐 |
| film.wolf / wolfEye / path | #212B33 / #E9B15C / #D8B583 | 真狼黑靛剪影/唯一瞳光/道路 |
| film.subtitleScrim / subtitleInk | #111B24 / #F4F0E8 | 字幕放在 96% 不透明深色独立底片上以保证对比 |
| shadow.0/1/2/3/4 | none / 0 4px 16px #00000033 / 0 8px 28px #00000055 / 0 14px 40px #00000066 / 0 20px 56px #00000088 | 阴影值只在 tokens.js 内；4 档用于 toast，2 档用于浮层；SVG 风格靠叠纸而非阴影 |
| z.base/frame/captions/controls/menu/dialog/toast | 0/10/20/30/40/50/60 | 文件集中映射；禁止组件魔法 z-index |
| radius.sm/md/lg/xl/pill | 4/8/12/16/999 px | 进度轨/按钮/卡片/影院容器/时间徽标 |
| border.thin/strong/focus | 1/2/3 px | 分隔/突出轮廓/聚焦环，focus outline-offset=3px |
| space.1/2/3/4/6/8/12/16/24 | 4/8/12/16/24/32/48/64/96 px | 4px 栅格，工具间隔 8，控件组间距 16，容器 padding 24/32 |
| motion.fast/medium/slow | 120/220/360 ms | hover/状态/浮层；电影镜头按分镜绝对时间 |
| easing.standard/enter/exit | cubic-bezier(0.2,0,0,1) / cubic-bezier(0,0,0.2,1) / cubic-bezier(0.4,0,1,1) | CSS 控件；场景位移采用指定 smoothstep |
| icon.sizeSm/md/lg / stroke | 16/20/24 px；2px | SVG 网格 24×24、round caps/joins、原创线框图标 |
| grid.contentMax / gutterDesktop / gutterMobile | 1200px / 32px / 16px | 页面外壳居中；电影银幕可扩至 min(100%, 1600px) |

色彩抽样：text0/bg0≈15.32:1，text1/bg0≈10.32:1，text2/bg0≈6.28:1，accent/bg0≈9.09:1，danger 原始 #D76E59/bg0≈5.19:1（此最后值只作设计验证基准，实际 danger 采用上表更亮的 #ED8F7D）。字幕 text0/subtitleScrim≈15.32:1。以上是基于标准 sRGB 公式的方案计算，不是浏览器实测；执行时必须用 tests/contrast.test.mjs 重新计算并将完整输出归档。对任意透明蒙层均需按最终合成背景再核算；控件边框最低 3:1，禁用最低 2:1。叙事图形本身可以有低对比阴影，但承载剧情意义的狼/羊/男孩剪影须与当地背景不小于 3:1，否则在身后加不透明浅色纸轮廓。

#### 字体体系
中文：'PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans CJK SC',sans-serif；西文：'Avenir Next','Helvetica Neue',Arial,sans-serif；数字：ui-monospace,'SFMono-Regular',Menlo,monospace，font-variant-numeric:tabular-nums。明确指定栈、无网络字体；不自托管未知版权字体。正文首行不缩进，font-feature-settings:'kern' 1,'palt' 1；text-wrap:pretty（支持时），备用常规断行。字阶倍率 1.25，以 12.8、16、20、25、31.25、39.06、48.83、61.04px 为令牌（渲染 CSS 可保留两位小数）；8 级 >= 6。用途如下：
| token | px/行高/字重/字距 | 用途/行宽 |
|---|---|---|
| type.xs | 12.8/18/500/0.02em | 状态角标，≤40中文字符 |
| type.sm | 16/24/500/0.015em | 时间/辅助，≤40中文字符 |
| type.base | 20/32/400/0 | 播放器说明，≤36中文字符 |
| type.md | 25/35/600/0 | 控件分组标题/提示，≤30中文字符 |
| type.lg | 31.25/40/600/-0.01em | 字幕（桌面），单行≤22汉字 |
| type.xl | 39.06/48/700/-0.015em | 场景标题，≤18汉字 |
| type.2xl | 48.83/60/700/-0.02em | 片尾副标题，≤24汉字 |
| type.3xl | 61.04/72/700/-0.03em | 片名/片尾主落幅，≤10汉字 |
播放器字幕在移动端降为 20px/30px，不缩小到无法辨认。正文行高 1.5–1.6，标题行高 1.15–1.3，按钮 1.25。页面 200% 文字缩放时控件允许换行/垂直堆叠，不裁字。SVG 中的片名和寓意同时在可访问 DOM 文本中提供对应句。

#### 栅格与设备断点
| 视口宽度 | 页边距/容器 | 影院/工具栏 | 控件 | 字幕 |
|---|---|---|---|---|
| ≤479px（含375） | 16px；单列；宽100% | 电影16:9盒；两行工具栏，操作在第一行、时间/进度第二行 | 44×44px；按钮可横向压缩文字但不可缩点击区域 | 20px/30px，≤2行，字幕底片随宽度适配 |
| 480–767px | 16px；单列 | 工具两行 | 44px | 22px/32px |
| 768–1023px | 24px；单列 | 工具一行，进度第二行 | 44px | 26px/36px |
| 1024–1279px | 32px；max 1200 | 工具一行，时间右侧 | 44px | 31.25px/40px |
| ≥1280px（含1440） | 32px；max 1200 | 影院 max 1200、控制一行，场景章节另起窄行 | 44px | 31.25px/40px |
电影区域只按 16:9 等比缩放，绝不拉伸；不使用 CSS 宽高渐变动画；移动竖屏留上下影院外壳是正确体验。1440px 放映页可选 theater class 让电影接近视口宽；CSS fullscreen 在 requestFullscreen 失败时兜底。

### 3.2 UI 组件规格（全部状态含四态）
所有控制元素都是原生 button/input，统一复用 src/ui.js 中 setComponentState()；同类按下缩放 transform:scale(.96) 120ms；hover 仅 @media(hover:hover)；focus-visible outline 3px accent、offset 3px。加载态显示文字和有动画的 SVG 三点标记（reduced motion 时显示静态「载入中」）；错误态 role=alert 文本；空态有下一步动作；成功态使用 aria-live=polite 状态条。禁用用 aria-disabled=true + class，仍可聚焦但激活时无副作用，提示原因。
| 编号/组件 | 结构与尺寸；颜色/层次 | 默认/hover/按下/focus/disabled；空/加载/错误/成功 | 键盘与 ARIA |
|---|---|---|---|
| C1 电影舞台 | figure#filmFrame aspect-ratio:16/9，最大宽 1200，radius.xl，内部 SVG viewBox 0 0 1600 900；下层纸纹/上层字幕 | 默认封面；hover 不变；按下不抢控件；focus 不可聚焦；disabled 显示静态封面；空「动画画面尚未生成，请重新载入」；加载首帧占位为原创静态山谷插画及「正在布置山谷…」；错误保留插画+「画面未能载入，请刷新」；成功呈现片名卡并允许播放 | role=img aria-label="《狼来了》动画画面"；有邻接可访问故事梗概；字幕为独立 DOM |
| C2 主播放按钮 | 56×44px，内图标 20px，左右 padding12，文字 sm，bg accent、字 textInverse、radius.md、shadow.0 | hover accentHover；按下 scale .96；focus 独立 outline；disabled text2/border1 且写明原因；空显示「准备播放」禁用；加载「正在准备音轨…」；错误「重试播放」；成功在「播放动画」/「暂停动画」切换 | button；aria-label 随操作变化；Space/Enter；快捷 Space 仅当焦点不在 range/button 上且没有修饰键 |
| C3 重播 | 44×44 图标＋桌面文案 sm，透明深底 border1 radius.md | hover bg2，按下 scale .96；focus outline；disabled 静止；空「尚未开始」；加载禁用；错误可用于重试；成功从 t=0 重播并显示 toast「已从头播放」 | button aria-label="从头重播"；Enter/Space；快捷 R 无修饰键且无输入焦点 |
| C4 字幕开关 | 44×44 图标＋“字幕 开/关” sm，border1 radius.md | hover bg2；按下 scale；focus outline；禁用/空可用但显示「没有字幕」仅发生数据加载失败；加载禁用；错误提示「字幕暂时不可用」；成功状态的 aria-pressed 同步 | button aria-pressed，aria-label="开启字幕"/"关闭字幕"；快捷 C |
| C5 时间进度条 | input type=range min0 max4500 step1，轨高 6px，thumb 16px，交互高44px；accent 进度、bg2 底轨；读数 tabular | hover thumb 18px（仅伪元素视觉）、pressed 20px；focus 外边框；disabled 轨低饱和；空 00:00/02:30；加载禁用并显示准备进度；错误停在最后有效位置；成功跳到对应精确帧 | label="播放进度"，aria-valuetext="第X秒，共150秒"；方向键按 1s、PageUp/Down 10s、Home/End 边界（自定义事件）；指针拖动结束同步音频 seek |
| C6 章节导航 | 15 个镜头的 select 或小屏原生 select，桌面 5 组标签（序章/一骗/二骗/真狼/尾声）；行高44，圆角8，宽≥160 | hover/focus 同按钮；pressed 更新；disabled 保留禁用文案；空第一镜；加载锁定；错误提示「无法定位章节，请使用进度条」；成功 aria-live 说明新镜号 | label "跳转镜头"；select 原生键盘；切换绝对 t |
| C7 影院模式 | 44×44 图标，border1、圆角8 | hover bg2；按下变更；focus outline；禁用时「当前浏览器不支持全屏」并使用 CSS theater；空/加载不启用；错误降级为 theater；成功显示「退出影院」 | button aria-pressed，F 快捷键（输入外）；Esc 退出 fullscreen 或 CSS theater |
| C8 轻提示 Toast | 最小 240×48，padding16，radius12，z60，shadow.4，文字 text0/bg2 | 默认隐藏；hover 暂停消失倒计时（若实现）；pressed 无动作；focus 不夺焦点；disabled/空不出现；加载「正在导出…」仅导出 CLI 不给网页承诺；错误显示原因+下一步；成功显示结果 2.5s，reduced motion 无位移 | role=status/aria-live=polite；错误 role=alert；重复事件合并，避免读屏轰炸 |
| C9 片尾字幕卡 | 电影画面内纸白主题叠层，主标题 61px、正文 31px，四周安全边距 80 逻辑 px | 默认最后 9s 展示；hover/按下/focus 不适用（非交互）；disabled 静态可读；空绝不可空；加载展示前序；错误可用静态文本落幅；成功驻留最后一帧 | SVG 与对应隐藏可读文本同步；非图标按钮，NA 的状态要在报告标理由 |
| C10 音量/静音 | 44×44 按钮+ input range 可折叠；统一 icon24，border1，radius8；默认0.85 | hover/focus/按下同 C7；禁用指示音轨缺失；空显示音轨未备好；加载禁用；错误提示「音轨未加载，正在以无声模式预览」；成功状态显示静音图标+aria-pressed | M 切静音，音量 range 原生方向键，label="音量"，只改变音频 element.volume，不改变导出音量 |

图标清单：play/pause/restart/captions/fullscreen/volume/muted/error/success/arrow（全部 src/icons.js 自绘同套 24×24 SVG、描边2、round cap、无 emoji）。页面加载前后无替换尺寸引起 CLS。禁用组件仍需文字解释，禁止只减 alpha 导致对比度失败。

## 4. 体验、布局、状态与交互

### 4.1 信息架构
单页：header（片名/短说明）→ main（电影舞台→辅助故事概述→播放控制→章节选择→简短制作说明）→ footer（「原创矢量插画与合成配乐·离线播放」）。层级最多 2；电影页面不出现账户、下载弹窗、营销栏。章节只改变同一时间线上的起点，不生成额外页面。默认不开声音自动播，点击「播放动画」才开始。

### 4.2 主旅程与次旅程
主旅程：加载后见暖黄色山坡、片名和明确 CTA → Tab 聚焦播放 → Enter 启动，按钮立即变成暂停，音轨开始且 t 以音轨 currentTime 推进 → 0-150s 自动走 15 镜，字幕每镜出现、屏幕无布局抖动 → 音轨结束暂停于 149.966s 的最后落幅，按钮变「从头重播」 → 点击后归零并播放。全程无网页滚动要求。
次旅程：按 C 关闭字幕，再按 C 打开；进度条定位至第三次呼喊，屏幕立即渲染 t、新音频同步；按 Space 暂停，按 R 归零，按 F 影院模式、Esc 退出。失焦/标签页隐藏立即暂停且保留 t；回来不自动恢复，防止声画意外推进。全屏 API 被拒绝 → CSS theater 不弹系统错；音轨播放拒绝 → 保持 paused，不进入计时器无声自走模式，展示「浏览器阻止播放声音，请再次点击播放」。

### 4.3 布局逻辑
桌面主容器 max-width1200，header 上边 32/下边24；片框宽100%；控件条 margin-top16，主按钮在最左、时间数码最右，进度横贯中部；章节另起行 margin-top12；说明文字最多40汉字/行。移动端 375px：header 上边24；片框375-32=343px 宽、高192.94px；主按钮/字幕/重播/全屏/静音一行可视觉收缩图标但每个目标 ≥44×44（5×44=220，余量足够），进度独占整行；章节下拉宽100%；说明文字自然换行。字幕始终在电影框内下方的安全带，不叠盖 UI。单文件 HTML 的界面与多文件完全相同。

### 4.4 四态与具体微文案
| 场景 | 空 | 加载 | 错误 | 成功 |
|---|---|---|---|---|
| 初始场景 | 「还没有开始播放。按播放进入山谷。」附静态原创山坡 | 「正在准备动画与音轨…」静态山谷＋进度 0–100%（根据资源生成/媒体 canplay 可观察事件更新） | 「动画资源没有准备好。请刷新此页面重试。」附重试按钮 | 「动画已准备好，时长 2 分 30 秒。」 |
| 播放操作 | 「动画位于开头，请按播放。」 | 「正在启用音轨…」点击立刻改 button aria-busy | 「声音没有开始。请再次点击播放，或检查浏览器音频权限。」 | 「正在播放」/「已暂停在 01:12」 |
| 章节跳转 | 「请选择要观看的片段」 | 「正在定位画面…」持续不超过1帧（否则 toast） | 「没有定位到这个镜头。请使用进度条重试。」 | 「已跳转到镜头 11：真狼出现」 |
| 影片结束 | 「影片尚未播放」 | 不适用，原因：结束是同步状态 | 「最后一帧未成功显示，请按重播。」 | 「播放完成。重看故事」＋寓意落幅 |
操作反馈在 100ms 内发生：先变按钮/进度 UI 后请求播放 Promise；>1s 等待媒体可播放显示解释，>10s 出现「取消等待」并恢复到暂停/封面；没有耗时超过10s且不可取消的 UI 任务。没有删除/提交类操作，二次确认属于 NA 并注明。

### 4.5 键盘、无障碍与减弱动效
Tab 顺序：主播放→重播→字幕→静音→音量→进度→章节→全屏；范围控件的 Space 保留原生功能，避免全局抢事件；按钮标准 Enter/Space；全局 Space/C/R/M/F 仅非文本输入、非按钮聚焦时触发，Escape 退出影院。每个按钮 aria-label、状态 aria-pressed；进度 value/valuetext/label，字幕是 p#caption aria-live=off（避免短时间反复读屏），另设有序故事文字总结供读屏访问。跳转有 role=status 反馈，错误 role=alert。
prefers-reduced-motion:reduce：用户主动「播放」仍依时间轴完整播 150s 且同步音乐/字幕，但取消 parallax、角色循环摆动/跑步/粒子流、镜头推进；每镜固定在最有说明力的 key pose，镜头间硬切，淡入淡出时长0，保留因剧情必要的狼/羊位置瞬时变化；不自动播放或突然放大。200% 页面字体：容器高度自然增长，控制区换行，无遮盖，字幕最多两行否则按 22 字边界重排（禁止 CSS 单行省略寓意）。人物不是形式性的 aria 乱标，舞台一个整体 image label，逐镜字幕/故事描述在 DOM 有文本替代。允许 no-JS 降级静态片名＋提示「需要启用 JavaScript 播放动画」，不报错。

## 5. 技术方案、逐镜施工、边界处理

### 5.1 技术架构和文件职责
零运行时 npm 依赖。使用浏览器原生内联 SVG（矢量绘制）+ DOM 字幕/UI + 唯一绝对时间线；禁止真实时间作为渲染内部随机数来源。使用固定关键帧变换数据和二维剪纸 pose 切换。音频使用 Node 纯算法直接生成 PCM/WAV，随后用本机 ffmpeg 编码成 m4a；播放器经用户交互启动 HTMLAudioElement，其 currentTime 是播放主时钟，导出模式完全绕过 audio/play() 只调 setFrame(t)；两者调用同一 renderAt(t) 函数。

规划创建的目录（本轮输入仓库没有业务代码，路径均为拟新增路径而非声称已存在）：
- package.json、package-lock.json、README.md；index.html；styles/main.css。
- src/tokens.js（唯一色彩/间距/动效令牌）、src/story-data.js（时间镜头与字幕常量）、src/geometry.js（path/pose 原始作者资产）、src/scene.js（SVG 图层及摄像机）、src/timeline.js（纯函数、位置插值）、src/audio-player.js（媒体时钟与失败态）、src/icons.js、src/ui.js、src/main.js（启动编排）。
- scripts/generate-audio.mjs（原创 PCM+WAV＋ffmpeg AAC）、scripts/build.mjs（多文件和单文件产物）、scripts/serve.mjs（只服务 dist 白名单）、scripts/export-video.mjs（Playwright→ffmpeg）、scripts/verify-video.mjs（ffprobe 合规验证）、scripts/audit-browser.mjs（离线/响应式/键盘/采样）。
- tests/timeline.test.mjs、tests/story.test.mjs、tests/audio.test.mjs、tests/contrast.test.mjs、tests/build.test.mjs、tests/browser.test.mjs。
- docs/storyboard.md（详表），docs/visual-language.md（独立 SVG 结构与配色引用，若需避免重复可直接引用本规划），reports/latest.md、reports/npm-test.txt、reports/browser-audit.json、reports/contrast.json、reports/ffprobe.json、reports/screenshots/*.png。
- dist/index.html、dist/single.html、dist/assets/score.m4a，exports/cried-wolf.mp4（体积合理则 Git 跟踪；超过 GitHub 100MB 单文件上限时不提交 MP4，只在本机保留并将 sha256/大小/本机路径写报告，交付状态因仓库缺 MP4 标 LIMITED，除非能在仓库存储规则内上传）。

### 5.2 时间、帧、场景模型（可直接落代码）
逻辑舞台 1600×900，输出 1280×720，帧率 30fps，N=4500，有效帧 i∈[0,4499]，t=i/30；「结束」是逻辑状态 t=150 而非第 4501 帧。所有镜头为半开区间 [start,end)，覆盖 [0,150)；在边界 t=end 切至下镜，绝不重复执行实时事件。输入非有限数归零，负数 clamp0，t≥150 clamp 到最后成片画面、状态 ended。seekFrame(frameId) 对 4500 做排他检查，浏览器拖动选 0～4499（UI 的 range max=4499；本计划 3.2 的 C5 提到 max4500 仅表示终点刻度，实际 input max 必须以有效帧 4499 为准，尾声通过 ended 单独表示，避免导出帧数错一）。
数据模型：
- Shot = {id:string,start:number,end:number,section:string,captionCues:Array<{start,end,text}>,palette:string,camera:[Key],actorKeys:{boy:[Key],wolf:[Key],villagers:[Key],sheep:[Key]},effectIds:string[],transition:{type:'cut'|'crossfade',start:number,duration:number}}；
- Key={t:number,x:number,y:number,scale:number,rotation:number,opacity:number,pose:string}；所有 Key 使用绝对秒，不依赖上一个渲染状态。
- RuntimeState={timeSec:number,frameId:number,status:'idle'|'loading'|'playing'|'paused'|'ended'|'error',captions:boolean,muted:boolean,volume:number,fullscreen:boolean,mediaReady:boolean,errorCode:string|null}；
- 公共接口 window.CriedWolf = {renderAt(t),seekFrame(i),getState(),play(),pause(),replay(),setCaptions(boolean),setVolume(number),getShots(),setExportMode(boolean)}；setFrame 专供 CLI 时执行 renderAt(i/30) 并更新 dataset.frameId 和 dataset.timeSec，必须同步完成。
- Scene 函数 createScene(svgRoot,tokens), renderScene(t,opts), renderCaptions(t,opts)，timeToShot(t)，sampleKeys(keys,t)，ease01(x)=x*x*(3-2*x)；使用有限值 clamp、对象数据冻结 Object.freeze。
- 使用固定 1px/2px 纸纹同构图种子 20261025，经坐标哈希 deterministicNoise(x,y,seed)；禁止 Math.random() 在渲染路径。
- 几何实现：每镜定义静态 SVG group，含 0 天空纸层、1 雾带/日月、2 远山、3 中景树与村庄、4 路与羊圈、5 羊群/村民/少年/狼、6 近景叶片、7 前景光影纸晕。层 1/2/3/4/5 的镜头位移系数 0.08/0.18/0.40/0.70/1.00，camera 以 translate/scale 作用在 group；角色四肢采用带锚点的 transform rotate、位置 translate；帧序时可见性 opacity。静态路径颜色恒定，场次暖/冷切换用两组完整不同颜色图层在 0.6s 内 opacity 交接。故事字幕是 HTML 文字覆盖在电影框内，用 opacity 进出，避免让可访问文本烧进 SVG path。

### 5.3 原创造型、固定几何尺寸、表演词典（1600×900 坐标）
- 少年 B：身高约 175 逻辑 px、头半径 25、圆角纸片梯形橙披风（宽 66、高100）、棕裤两条可独立旋转的四边形、深灰发块、脚长26；永远保留橙色披风，左手牧杖（长155），眼为两点。pose: B-idle（杖着地/头前倾 4°）、B-alert（抬头 13°/肩后拉）、B-shout（两掌嘴旁呈喇叭、躯干前倾12°）、B-laugh（肩膀上下8px、眼弧）、B-guilt（头低18°/杖垂）、B-run（腿±22°/披风10px摆）、B-freeze（双手颤、足不动）、B-sad（低头30°、双膝落地）。
- 羊 S：每只体长110、高70，主体是 5 个相交圆角不规则羊毛块，4 条短直腿，小椭圆墨色脸，单根金色铃；3 个近景有可识别眼睛、3 个中景轮廓、5 个远景抽象剪影，总计11；动画 pose: graze（头上下10px）、listen（头转向±16°）、scatter（羊体顺序向两侧 transform 位移）、missing（一只羊向屏幕右侧随狼一起离画；残留空铃阴影）。同镜不可复制完全同步动画，偏移 0.11/0.23/0.37s 但每帧纯函数确定。
- 村民 V：3 个剪纸人（麦黄围巾老人、石蓝围裙妇人、灰褐背篓青年），身高170/158/180，走路 pose strideL/strideR、气喘弯腰 16°、第二次双臂抱胸／指责、第三次坐在门口手未抬起；外形采用方头巾、长衣和背篓区分，脸均由两眼/单线嘴表现。
- 狼 W：真实狼必须独一无二：体长210、肩高94、三角耳、尖鼻、细长尾、四腿；前两次的影子绝不可沿用狼轮廓，改为风摇树枝/云影，在观众面前明确揭示是树影；真狼仅在 101s 之后出现，黑靛色无夸张龇牙、金瞳 6px，小面积危险红。pose: crouch（肩低20px）、advance（躯干+脚步）、lunge（x快速位移120px）、depart（叼一只白色小羊剪影由右出）；不画血腥接触。
- 山丘 H：地平线 y=515；下坡村庄轮廓居 x100-420/y560-770，5 间房高55–110；通山小路从 (335,710) 弯向 (980,515)，宽70；靠右上角放少年、羊群主场景 x1020..1430/y480..760。左下村庄/右上羊群保证一次大全景同时说明「山坡下有村庄」的地理关系。
- 固定角色造型绘制需提供各自正/侧两种姿态和缩小 25% 仍可区分的轮廓截图。轮廓粗线 4–6px（逻辑舞台）、重要物象（羊铃/狼眼/牧杖）要有至少 6px 有效视觉尺寸。所有人物身边留 30px 负空间防止重叠。

### 5.4 15 镜完整施工分镜：所有 t 单位为绝对秒
公共规则：每个镜的首尾取 [start,end)，过渡若写「0.6s叠」则前后景仅通过两个镜头容器 opacity 做交叉淡变，字幕采用 0.20s 入/0.24s 出（全由 t 计算），角色视向、空间关系遵循 180° 轴。所有镜头最底层是固定纸纤维纹，角色及前景只做 transform/opacity；渲染时每层由绝对 t 直接算出。字幕所有文本原样出现，不得擅自改写；没有写台词的位置，屏幕保持无字幕让画面说话。音效事件按 startAtSec 明确由同一离线合成器写进整段音轨，浏览器不重复临时播放。

**镜 01｜00:00–00:08（0–8s）《风吹过的山谷》，8s**
画面：16:9 深墨蓝开场静纸，最初 1s 淡显麦黄色圆日于 (1180,250)，下方远中近五重山形分别在 y480/525/620/700/770；画面中央 (800,350) 墨色大字「狼来了」，副题 (800,425)「回声的代价」，左下微小敲印三道羊铃纹。图层 L0纸/L1日/L2山/L3标题/L4草尖/L5前景叶。摄影机 0→8s scale1.00→1.035，x0→-12，标准 smoothstep；关键帧 0黑纸，0.8山淡入，1.7片名淡入，4.8字幕副题出现，7.4标题 opacity→0；转场 7.4–8.0 叠到山坡大全景。字幕：「从前，山坡上住着一个放羊的少年。」[3,7.2]。声音：0.0 环境风（低通粉噪 -28dBFS）、0.75 第一声羊铃（金属 sin 泛音）、1.50 D4-F4-A4 三音主题，6.8 风稍增。字幕底片加深保证 15.32:1。

**镜 02｜00:08–00:18（8–18s）《村与坡》，10s**
大全景建立空间：左下村屋 x130–445，蜿蜒小路中贯，上方偏右 boy x1100/y480、11只羊散落 x1020–1460；阳光从右上斜照，朝向不变。7+图层从 L0天空到 L6坡前麦穗；摄影机 8→13s 从 scale1.0 推至1.06，平移 x0→-36/y0→+10，13→18 静止；少年 B-idle→B-alert 于16s，羊 S-graze 各相位错开。关键帧8.0大全景、10.8一只羊抬头、13.0到位、16.0少年回头。转场 17.6–18.0 上方云影横切。字幕：「村庄在坡下，羊群在坡上。」[9,15]。声音：8.2 三只错相羊铃，10.5 远处鸟两音，15.0 温暖和声，17.5 突然减一个配器。

**镜 03｜00:18–00:28（18–28s）《错认》，10s**
中近景 x760–1500；树枝云影在远坡形成尖角形，但 24.5s 拉开画幅揭示只是随风摆动的两根树枝与云。狼绝不出现在此镜。L0天/L1云/L2远坡/L3枝影/L4羊/L5男孩半身/L6前景枝。摄像机 18→22 scale1.02→1.11 朝云影移 x-65；22→25 男孩由 B-idle→B-alert、羊群同时安静；25→28 scale1.11→1.0 回拉让树枝原形入画。关键帧18鸟停，21.5「尖耳」形影，24.5枝形明晰，27.2男孩嘴角一扬暗示故意喊。转场 27.6–28 硬切少年特写（为冲击不叠）。字幕：「那不过是树影。少年却起了玩笑的念头。」[24.7,27.8]。音效：18.0 羊铃瞬间切静、21.2 低音弦脉冲，24.5 风吹树枝擦响，27.7 吸气。

**镜 04｜00:28–00:38（28–38s）《第一声》，10s**
少年正侧面近景置 x930，嘴部造型 B-shout，左右散射三道浅金同心纸条回声从 x940 发散，远处村庄在画面左下压缩到 300px。L0远山/L1小屋/L2羊群/L3男孩/L4回声线/L5近景叶/L6光晕。摄影机 28→31s scale1.14→1.21，小角度平移-28；31–38固定。关键帧28.0吸气，29.0手拢嘴，29.2第一呼喊波出现并扩散到 32.0，33.0第二次「狼来了」波，36.0少年捂嘴偷笑。过渡 37.6–38 0.4s切近坡路。字幕：「狼来了！狼来了！」[29.0,35.2]（原文不拆成不同剧情）。声音：29.1/33.0 合成哨号（不是假装真人声）、短促木鱼击加空谷回响，背景主题让位；不使用未授权人声。

**镜 05｜00:38–00:50（38–50s）《援救》，12s**
坡道中景 S 形从 x190,y760 到 x990,y460，三村民由左下向上跑，石蓝围裙先、背篓随后、老人最后；远处男孩立在右上，观众读出「有人真信了」。L0天/L1山/L2村庄/L3路/L4村民/L5男孩+羊/L6前景麦穗。摄影机沿道路轻摇 x0→+95/scale1.00→1.08（38–46），46–50固定；关键帧38V-strideL，40.5 strideR，43.5第三人赶上，47.0老人停下喘气，49.5众人仰望空坡。转场 49.6–50 硬切坡顶空镜。字幕：「村民放下手里的活，急忙奔上山。」[39.5,47.8]。声音：38.4 脚步三层错拍 2.2Hz、41.0 背篓木块响、46.5 急促喘息风音、49.7 一拍停音。

**镜 06｜00:50–01:00（50–60s）《空坡上的笑》，10s**
坡顶中景，三个村民站 x420/560/700，男孩 x1120，羊仍安全；用空荡宽背景说明无狼。少年 B-laugh 肩膀 3 次独立起落，村民从疑惑到愤怒（抱胸、皱眉）；近景一只羊铃摇响后停。L0天空/L1山/L2小村/L3村民/L4空路/L5男孩羊/L6云。镜头先固定 50–56，56–60 缓慢推向老人脸、scale1→1.07；关键帧50.0众人环顾，53.0少年首次笑，55.1第二次笑，56.8老人收杖板脸，59.0背篓青年摇头。过渡 59.4–60 0.6s云层叠入黄昏。字幕：「‘骗你们的！’少年哈哈大笑。村民第一次失望了。」[52.0,59.0]。声音：53.1/55.0 木管模仿两短笑音（不做伪配音），58.5 主题第三音降半音。

**镜 07｜01:00–01:08（60–68s）《第二个黄昏》，8s**
同一空间构图却换冷青暮色；男孩坐树桩上抛牧杖，天空两只纸鸟飞离。L0黄昏天空/L1云/L2山/L3村庄窗灯/L4羊群/L5男孩/L6近景树。摄影机平移 x0→-24、scale1.0→1.03；关键帧60.0暖冷图层交接完，62.0少年 B-idle，65.0男孩 B-alert 望村庄，67.4张口。转场 67.7–68 硬切高坡。字幕：「过了一阵，他又想试试大家。」[61.4,66.4]。声音：60.0 羊铃主题低八度，63.0 低音三拍，67.7 第二次吸气。

**镜 08｜01:08–01:18（68–78s）《第二声》，10s**
少年置 x1100，背后树枝没有危险影子，特写视线径直指向村庄；回声线比第一次更大却明显破碎成不连续纸条（象征信任裂痕）。L0天空/L1暮山/L2村/L3羊/L4男孩/L5回声碎片/L6前景坡草。摄像机 68–71 scale1.10→1.22，之后固定；关键帧68.0 B-shout，69.4第一喊，73.2第二喊，75.0男孩嘴角上扬，77.0山坡无人回应的半秒空白。转场 77.6–78 硬切村口。字幕：「狼来了！狼来了！」[69.2,75.0]。声音：69.4/73.2 与第一声同型合成哨音，但第二次把音色压低 3 半音并加入短促不协和音，75.0 尾响截断。

**镜 09｜01:18–01:30（78–90s）《再次白跑》，12s**
村民由村门再次上坡，这次走得慢，老人先犹豫，青年跟随，妇人拎灯；与镜05同轴相近构图构成刻意的「重复」，但画面缩窄、前景挡住更大面积。L0暮天/L1坡/L2村门/L3小路/L4村民/L5山顶少年远影/L6路边黑枝。镜头 78–84 跟老人 x0→+45，84–90 固定；关键帧78.0村门开，80.5回头、82.8村民上路、86.0到顶、88.5发现又是空坡。转场 89.5–90 0.5s 淡至村民半身。字幕：「他们还是来了，却只看见空空的山坡。」[79.4,88.6]。声音：慢脚步 1.6Hz，灯笼木框碰撞 82.0，88.5 低音顿挫，89.6 风吹空谷。

**镜 10｜01:30–01:41（90–101s）《门关上了》，11s**
低位近景村门占左三分之二，三村民背对男孩下山，老人伸手推门；在村门内暖光消失后，天边山影变更冷。L0冷天/L1山/L2村屋/L3门扇/L4三村民/L5远少年/L6门框剪影；门只能以 transform rotateY 或 SVG group rotate 做几何合页运动，不能动 width。关键帧90.0村民转身，93.0妇人失望摇头，95.0老人推门，97.2门合上，99.2少年笑容凝固 B-guilt，100.5狼的首次极远哑低啸（只闻声，尚未见狼）。摄影机90–96 scale1→1.06，96–101固定；100.4–101 硬切山谷。字幕：「‘下回别再骗人了！’第二次，信任几乎耗尽。」[92.0,99.2]。声音：95.0 木门枢轴、97.2 门闩、100.5 狼远吼与短低频，随后收空配乐。

**镜 11｜01:41–01:52（101–112s）《真狼》，11s**
夜蓝偏冷，大左侧暗树丛后真狼第一次露出金眼，右侧羊群仍在啃草，少年背向狼；三点空间成「观众先看见危险」。L0暗天/L1暗山/L2树丛/L3羊群/L4真狼/L5男孩/L6草丛与红色薄云。镜头先静 101–106，106–109 缓推狼 scale1→1.10，109–112快速（仍平滑）向羊群平移60px。关键帧101.0两金瞳，103.0狼耳出草，105.5 W-crouch，107.0一只羊 S-listen，109.0 W-advance，110.3少年转身 B-alert，111.5羊群惊散起步。转场 111.7–112 硬切惊恐特写。字幕：「这一次，真正的狼从树林里走了出来。」[103.0,110.6]。声音：101–105 仅风和低频脉冲，106.0枝裂，108.4羊铃猛响，111.3第一次真狼低嚎；禁止跳脸闪白。

**镜 12｜01:52–02:01（112–121s）《第三声》，9s**
少年面孔特写，橘披风边缘占画面右侧，身后羊向左右逃；前两次漂亮的回声线在此次变成从嘴边射出的断纸线，在画面中部被暗色山脊截断。L0夜山/L1逃羊/L2男孩脸/L3双手/L4牧杖/L5回声线/L6红云。摄影机112–114 scale1.15→1.28，114–121几乎静；关键帧112.0 B-freeze，113.1真惊呼，116.8第二次求救、118.7几乎无声的张嘴，119.5画面一动不动。转场 120.7–121硬切村庄。字幕：「狼来了！这次是真的！救命！」[113.0,119.0]。声音：113.1 第三次警报旋律与前两次相同前三音，但混入纯五度不谐的紧张叠音；116.8再响一次；119.5–123.5 完全静默区间（音轨 PCM 精确置零，环境声也删），使第三次喊声消失在空谷；不要给静默段补背景音乐。

**镜 13｜02:01–02:12（121–132s）《没有人上山》，11s**
回到村门，三个村民都听见但没有起身；屋里暖灯可见、门依旧关着，右上远山有微弱求救回声符号但没有援兵。L0暗天/L1远坡/L2村屋/L3门/L4窗框/L5三人物剪影/L6近树。摄影机完全静止，拒绝惯常的快切；关键帧121.0村门近景，123.5音轨恢复稀薄风，124.0老人抬眼，126.0妇人抬起手又放下，128.0背篓青年仍坐下，131.0黑暗下只剩风。转场 131.6–132硬切空坡侧影。字幕：「村民听见了，却没有上山。他们以为又是玩笑。」[123.7,130.6]。声音：119.5–123.5全静默延续，123.5 只有-38dBFS风，126.3 衣袖细响，129.5单次消音羊铃回声；无鼓点。

**镜 14｜02:12–02:21（132–141s）《少了一只羊》，9s**
非血腥处理：狼黑影从山坡右侧扑向羊群，一只明确可识别的白色小羊与金铃被叼离屏幕；不展示伤口。最后定在空着的一小块草地、落地的牧杖和一只孤单羊铃（同一个出现 3 次的动机）。L0暗山/L1风带/L2草坡/L3散羊/L4狼+单羊/L5牧杖/L6前景叶。摄像机132–134 scale1.08/固定，134–136横摇追随狼 x0→-80，136–141固定空场，刻意留下 4 秒空位。关键帧132.0 W-lunge，133.4羊跳避，134.2狼叼一只，135.5两者完全离画，136.0羊铃滚动一圈（transform rotate，不动 top/left），138.0男孩 B-sad跪地，139.2牧杖倒地。转场 140.4–141 0.6s淡至纸白片尾卡。字幕：「狼叼走了一只羊。少年终于不再笑了。」[136.5,140.3]。声音：132.2草叶猛响，133.6单次狼吼，135.0急促蹄声，137.1孤铃一响，138–141所有音乐退出。

**镜 15｜02:21–02:30（141–150s）《回声的代价》，9s**
屏幕为奶油纸白 #F5EAD1，中央以深墨字写「狼来了」，其下左对齐 2 行文字，文本底下是一只静止的金色羊铃和三道断开的同心回声弧；此为视觉终点。画面四周至少80逻辑 px安全边距，落幅在 144.0–150 完整停留≥6s。L0纸底/L1极淡远山/L2圆环回声/L3羊铃/L4大标题/L5寓意/L6署名「伊索寓言·原创改编」。摄像机固定，不添加动态粒子；关键帧141.0底片淡显，142.0主标题出现，143.0寓意两行出现，144.0完全静止直至150。最后一屏原文：主标题「狼来了」；寓意第一行「谎言会耗尽信任。」第二行「当真话终于响起，也可能无人回应。」；署名「根据伊索寓言原创改编」。字幕轨同时展示同一句寓意 [143,150]，不可与画面重叠（当落幅内部本身有寓意文字时隐藏额外底部字幕带，避免重复遮盖）。声音：141–144 三音羊铃主题以减弱的 D 小调音色收束，144–150 静音尾韵，音轨保留到150秒且文件确有AAC数据。

全镜检视要求：截图时间点 1.5/12/24.5/31/43/56/65/72/85/97/108/115/126/136/146 秒；边界额外截图 27.966/28、100.966/101、140.966/141；禁止跳镜造成黑屏或剪裁。分镜里 subtitleCues 不可伸到下一镜；每镜布景层叠顺序在 docs/storyboard.md 重复列出，以此作为交付资产验收比对表。

### 5.5 动画规律与可复现性
电影场内只允许修改 SVG group transform、opacity（以及 DOM 字幕/装饰的 transform、opacity）。静态场景 SVG path 一次创建，多镜显示通过 opacity；不得在 RAF 中修改 path d、宽高、top/left、filter、box-shadow、background-color、文字内容（字幕切换时唯一合法例外是离散替换 textContent，不得做逐帧字母动画）。角色动作每秒关键姿态 4–8 次、姿态位移插值 30fps：核心极简动作强调「停顿+跟随」，不是所有角色以相同频率浮动。摄像机平移 0–120 逻辑 px/镜，scale ≤1.28，场景不发生反复推进/退回眩晕。transform 统一使用 SVG transform 属性并在结构化动态白名单审计；减少动画时跳至本镜指定可读关键帧，镜间硬切。
sceneRoot 是一个固定 DOM，seek 不增删大量节点；每帧可根据 t 派发镜头 show/hide，但只能更新 transform/opacity 和 captionText 的离散内容。缓动函数镜头使用 smoothstep，角色脚步使用 piecewise-smooth 块状帧位移与周期 sin，全部带绝对相位。把 sceneTransition 的两个镜头 opacities 算为 prev=1-u、next=u；u=clamp((t-start)/duration,0,1)。故事 shots 不重叠；两个显示层叠化并不构成两个正在推进的叙事时间线。超过1000次 seek 后 DOM 元素数不增长、同一 t 字幕/角色相同。

### 5.6 音乐和声效「同一主时间线」
音频算法唯一真源 scripts/generate-audio.mjs 中的 SCORE_EVENTS 数据和 src/story-data.js 中的提示事件表要由脚本自动校验一致，避免双重手写冲突：首选 src/story-data.js 将 shots/cues 定义为 window 侧 JS 对象并通过 scripts 的文本生成 shared/story.json；若共享读取方式造成 Node CJS/ESM 冲突，则反过来以 data/story.json 为唯一真源、Node 读 JSON、浏览器构建内联相同 JSON；最终只允许一个声音事件清单。
- 采样率 48000Hz、单声道 16-bit PCM、样本数 7,200,000（150秒），合成先 float32 0..1 混音，峰值归一到 -1.5dBFS、边界 8ms ramp 无 click，再量化写约14.4MB PCM 的 WAV；FFmpeg 输出 AAC-LC、128kbps、48000Hz mono 的 score.m4a。正式 MP4 使用同一个原始 WAV 作为音频输入再编码 AAC（避免播放器与导出重混音）。
- 音乐 4/4，80 BPM，每拍0.75秒，每小节3秒，50小节整；全片 D 自然小调 D-E-F-G-A-Bb-C。前 0–100s 和弦循环 Dm/Bb/Gm/A（每4小节12秒）；101–141s 改 Dm/Eb/Dm/A，张力从半音冲突而来；141s 后独奏主题收束。主题音序 D4(293.66Hz,0.3s)→F4(349.23,0.3)→A4(440,0.6)；采用正弦+三角泛音混合做铃，柔和方波加短 decay 做木琴；合成低频鼓只在前两次救援出现，真实狼登场后舍弃节拍器式鼓。
- 原创效果声：羊铃（620/1240/1860Hz 带短音尾0.9s）、风（线性同余随机发生器 seed20261025 + lowpass approximation 连续噪声）、草/树枝（高通噪声60–140ms）、脚步（噪声脉冲80ms）、门闩（敲击短带通）、呼喊（合成双音角号按镜04/08/12写的绝对事件时间）、狼嚎（95→165→112Hz 滑音 1.9s+三次谐波）、喘息（低频粉噪 0.4s）、静默（119.5–123.5 区间每个 PCM 样本严格0）。
- 每一声报警相同 D4-F4-A4 间隔设计，第一次尾音明亮，第二次低3半音且消弱高频，第三次增减五度和冲突并迅速被静默吞没；不存在未经创作的人声或采样音效。所有声事件在 docs/storyboard.md 中列出时间（误差 ≤0.05s）。
- 同一 150s wave 在影片播放通过 audio.currentTime 主同步，muted 与 volume 只影响播放不影响原始文件；seek 更新 audio.currentTime 并立即 renderAt，拖动时暂停→seek→恢复先前播放状态，防 race。可在播放时每次 RAF 读取 audio.currentTime 来做唯一渲染时间；若 ended，强制显示末帧。声音未加载时暂停并提示；不能悄悄播放无声版本冒充成功。

### 5.7 构建、单文件、自托管和导出算法
**包管理与构建**：package.json scripts: build='node scripts/build.mjs'、test='node --test tests/*.test.mjs'（shell 展开，macOS 生效）、dev='node scripts/serve.mjs'、export='node scripts/export-video.mjs'、verify='node scripts/verify-video.mjs'、audit='node scripts/audit-browser.mjs'；锁定 devDependencies playwright:"1.64.1" 并生成提交 package-lock.json。npm ci 后不能依赖 npx 下载额外包。npm run build 的第一步生成 data/story.json 和音轨，再将 HTML、CSS、脚本等复制到 dist，生成同目录 single.html：
1. 模板 index.html 使用不带 type=module 的 defer 顺序脚本：tokens→story-data→geometry→timeline→scene→audio-player→icons→ui→main；避免 file:// ES module CORS 限制。
2. dist/index.html 复制本地 styles/main.css、src/*.js 及 dist/assets/score.m4a，使用相对路径 ./assets/score.m4a；禁止 CDN、外部 font-face。
3. dist/single.html 通过构建脚本读取同源模板，将样式插入唯一 style 标签、按确定脚本顺序合并成单个内联 script，将 score.m4a 读成 data:audio/mp4;base64 字符串植入 audio source；图标/人物是内联 SVG；禁止 fetch/XHR/importScripts/dynamic import。必须防止源码中有不安全 </script> 提前终止：构建时拒绝裸闭合序列并逃逸；不要字符串替换混淆内联 data URI。
4. 构建后对 single.html 做字符串引用扫描：没有 src="./" / href="http" / url(http) / ES module imports / 外部请求，HTML 单文件打开点击播放无错；若源码里引入了非预期资源类型立即 build fail。
**本机服务**：scripts/serve.mjs 默认 127.0.0.1:4173，服务 dist 的固定白名单 index.html/main.css/src JS/assets/score.m4a/single.html；拒绝 .. 路径、内部源码、git、handoff、reports 的访问；MIME 显式定义；用户手动 Ctrl+C 停止，脚本可由自动化起/停；不绑定 0.0.0.0。
**视频**：scripts/export-video.mjs 调用 npm run build 后使用 Chromium launch({headless:true})，固定 viewport 1280×720, deviceScaleFactor=1, colorScheme='dark', reducedMotion='no-preference'；可直接导航 localhost 本地服务器（脚本自启自关），执行 window.CriedWolf.setExportMode(true)。对 i=0..4499 严格串行 await page.evaluate(i=>window.CriedWolf.seekFrame(i),i)，再 page.locator('#filmFrame').screenshot({type:'png',animations:'disabled'}) 得 PNG Buffer（要保证 #filmFrame 页面导出专用样式在 viewport 恰为1280×720，去掉 radius、border、外边距和控制条，绝不截整页）。将每个 PNG Buffer 按 backpressure 写入 ffmpeg stdin，ffmpeg 示例参数顺序：
    ffmpeg -hide_banner -loglevel error -y -f image2pipe -vcodec png -framerate 30 -i pipe:0 -i <generated-score.wav> -map 0:v:0 -map 1:a:0 -frames:v 4500 -vf format=yuv420p -c:v libx264 -preset medium -crf 18 -pix_fmt yuv420p -r 30 -c:a aac -b:a 128k -ar 48000 -ac 1 -t 150 -movflags +faststart exports/cried-wolf.mp4
并将 stderr 保留供故障定位。帧写入时如果 child.stdin.write() 返回 false，await once(drain)，结束时 child.stdin.end()，等 close；不可只调用 ffmpeg 就声称成功。文件导出首先写 exports/cried-wolf.partial.mp4，ffprobe 合格后原子重命名成正式文件；失败时删除 partial、在报告标 FAIL，禁止保留旧的成功 MP4 作为本轮证据。
**检查**：ffprobe -v error -count_frames -show_entries stream=codec_type,codec_name,width,height,pix_fmt,avg_frame_rate,nb_read_frames,duration -show_entries format=duration -of json exports/cried-wolf.mp4；解析 JSON，比较 video 4500、duration 150±0.033334、audio AAC 存在、fps 精确30。若平台 ffprobe 无 nb_read_frames 字段，改用 -count_packets 提供交叉证据并标清，不能将 NA 当 PASS。

### 5.8 关键边界与性能预算
- 首次加载：150s AAC M4A 编码目标 2–4MB；single.html 总体目标 ≤6MB（若超额不能删声轨，优化 AAC 比特率至 96kbps 并确保可听品质，仍要求正式 MP4 AAC 128kbps）。移动设备初始 load media metadata 后可互动；canplay 超10秒出现取消。
- svg path 总数 ≤1500，活动节点 ≤450，动态 group ≤120，RAF 单帧渲染 CPU 时间 p95 <16ms（Mac Headless 量）；不以“看似流畅”代替检测。
- 导出 4500 帧是离线过程，不设30fps 实时速度要求。资源占用：通过 PNG 管道不生成数千张截图，FFmpeg 消费端回压，不同时发起多个 screenshot，峰值浏览器+ffmpeg RSS 尽量 <1.5GB（本机实测后记录，不硬把未知当完成）。
- 严格 no network：只读取本地 HTML、内联 SVG、本地音频；无外部请求、无 service worker、无 localStorage 需求、无统计 SDK；不访问外链字体。
- Tab失焦或 blur：进入 paused、音频 pause，回焦后不自启；音频错误或 play() reject 恢复先前可重试状态，UI 提示中文原因。多次快速 play 点击需 attemptId 防旧 Promise 反向覆盖新状态；replay 必须先 seek0 后 play，禁止竞态。
- 只播放一个 audio 对象，重复调用 play 不重复音轨；没有闪烁全白/红的强光攻击性画面，opacity 不频繁 3Hz 以上反转。
- 若 file:// 某浏览器禁 data:audio/mp4 播放，明确目标是简报所核验的 Chromium；见 U4 分支，不将其他浏览器无条件标通过。
- 禁止动画 top/left/width/height、DOM 旋转布局变更、随机色轮、自带浏览器默认按钮、默认 h 标题、emoji、未声明字体、第三方网络素材。播放画面中背景填色本身可因镜头离散切换但不能插值修改 fill；镜间必须 layer opacity crossfade。

## 6. 执行任务分解（按依赖；每项均有七要素）

**T01 基础骨架与令牌（依赖：无；规范 A1–A4/E/C1）**
- 前置：确认 Node/npm 版本，工作区为目标仓库、在 main。
- 操作：写 package.json、锁定 playwright 1.64.1 的 package-lock、index.html、styles/main.css、src/tokens.js，重置 CSS 默认、设置视口及 4px 栅格，定义表3.1全部 token，静态测试脚本入口。
- 位置：package.json/scripts；src/tokens.js/window.CriedWolf.tokens；styles/main.css/:root。
- 产物：可离线打开的静态影院骨架与令牌、npm lock。
- 自查：npm ci、检查 CSS 中除令牌注入以外无裸 hex，375px 下可见空的16:9舞台和 CTA。
- 测试：tests/build.test.mjs 检查入口资源、色板/字阶/断点/图标token、包 lock 对应固定版本。
- 完成：npm ci 无需互动，viewport 正确，所有视觉值受单一令牌控制。

**T02 故事与绝对时间数据（依赖：T01；规范 AC04/A1/C9）**
- 前置：T01 骨架稳定。
- 操作：按 5.4 写 docs/storyboard.md 完整 15 镜、字幕事件，建立 src/story-data.js 或单一 data/story.json 真源；验算 shot 边界及每次喊叫时点，章节枚举。
- 位置：docs/storyboard.md/镜01–15；src/story-data.js/shots；src/timeline.js/timeToShot。
- 产物：一份可机器验证的数据表＋一份便于人看镜头的施工表。
- 自查：断言 shots[0].start=0、shots[14].end=150，合计时长150，第一二次虚警/第三次真警剧情关键字齐。
- 测试：tests/story.test.mjs 对连续半开区间、字幕不越镜、无重叠、两次村民上山、尾幅寓意做硬断言。
- 完成：所有镜头和字幕定位都有唯一数值来源，不存在手写互相矛盾版本。

**T03 原创插画几何与角色造型（依赖：T01,T02；规范 A2/A5/E/C1）**
- 前置：调色板与空间轴一致。
- 操作：在 geometry.js 画 boy/sheep/wolf/3 villagers、村庄、树/路/山的静态 SVG path/createElementNS；定义每个人的上述 poses（独立 limb groups）；纸纹固定种子，确保第一二次影子不是狼。
- 位置：src/geometry.js/createBoy/createSheep/createWolf/createVillagers/createLandscape。
- 产物：纯原创矢量资产，无下载或外链。
- 自查：导出角色 silhouette 联系表，一眼认出主角和狼；每角色在 25% 尺寸仍清楚；确有11只羊。
- 测试：tests/story.test.mjs 数量/pose名称/geometry 节点检查；浏览器角色截图保留。
- 完成：山坡/村庄/羊群/三村民/男孩/狼均存在且可被单独变换。

**T04 场景层与摄像机（依赖：T02,T03；规范 A3/A5/D/AC05）**
- 前置：场景几何与镜头数据存在。
- 操作：实现 scene.js 中 7+ group、双调色背景图层和 15 镜的 show/hide；所有空间运动由 transform 控制，所有显隐 opacity 控制；摄影机深度系数写固定常量并产出 renderScene(t)。
- 位置：src/scene.js/createScene/renderScene；src/timeline.js/sampleKeys/ease01。
- 产物：seek 到任意时间会得到对应镜头像素，不需要 RAF 前序状态。
- 自查：反复寻址 24.5/31/108/136/146s 画面正确；每镜前中后近层可见；两次假狼现场是树枝。
- 测试：tests/timeline.test.mjs 边界/NaN/clamp/重复 seek、60 帧严格递增；tests/browser.test.mjs 截屏哈希重复性。
- 完成：同 t 输出同一 SVG 动态属性集；禁掉随机与所有布局动画。

**T05 角色动作与剪辑节奏（依赖：T04；规范 A5/D/AC10）**
- 前置：摄像机与 scene 已可 seek。
- 操作：按照每镜 keyframes 写少年 8 pose、村民 stride/喘气/抱胸、羊群错相、真狼 crouch/lunge/depart；场景 crossfade；完整镜头静/动节奏。
- 位置：src/timeline.js/sampleKeys，src/scene.js/applyPose/applyTransition。
- 产物：15镜不再只是静态片，真假警报、逃跑和最后空位可直接理解。
- 自查：关闭字幕和声音人工观看 0–150 秒，确认故事仍可辨；镜14看得到明确「减少了一只羊」的结果。
- 测试：关键 t 的 pose、位置、opacity 数据快照；60帧相邻差异帧 hash 必须至少有55个不同（若静止段被抽中则将采样段固定在人物奔跑段），同帧 hash 一致。
- 完成：角色无穿帮遮挡、无姿态反向、狼不在101秒前显示、重要动作关键帧完整。

**T06 原创离线音轨（依赖：T02；规范 AC03/AC10/E）**
- 前置：唯一声效事件表完备，ffmpeg 可执行。
- 操作：实现采样级合成器、80BPM主题、十余种声效、PCM WAV → ffmpeg AAC m4a，写 119.5–123.5 全静默并确保尾部150s保留。
- 位置：scripts/generate-audio.mjs/renderSample/generateWav；dist/assets/score.m4a。
- 产物：本地 score.wav（build 临时目录）和 score.m4a（分发）。
- 自查：ffprobe 看 m4a 音频 AAC 48k mono；试听三声报警、四秒静默、尾音和狼嚎不是爆裂噪音。
- 测试：tests/audio.test.mjs 文件头长度、PCM 7200000 samples、静默样本全0、真狼声在101s之后、峰值<1。
- 完成：完整有声且本地原创；无网络素材、无导出时重新现场声效。

**T07 播放状态机与字幕（依赖：T02,T04,T06；规范 B1–B4/C2–C5/C10）**
- 前置：setFrame 可调用，音轨可解码。
- 操作：audio-player.js 实现 play/pause/seek/replay、错误恢复、防竞态、失焦暂停；ui.js 显示字幕、状态和按键快捷操作；以 audio.currentTime RAF render，不反向累加 dt。
- 位置：src/audio-player.js/createAudioClock；src/ui.js/bindControls/updateState；src/main.js/bootstrap。
- 产物：操作不卡顿且可以有声从头到尾播放的浏览器。
- 自查：手工 Space→暂停→seek→恢复、C 开/关、R 重播、M 静音；拒绝音频播放时显示明确错误并停止时钟。
- 测试：tests/browser.test.mjs 操作反应、按钮 aria、字幕原文与时间、重复点击。
- 完成：无声画漂移超过100ms、状态切换<100ms视觉反馈、没有重复 audio 实例。

**T08 界面四态与影院体验（依赖：T01,T07；规范 A1–A5/B1–B4/C1–C10）**
- 前置：播放器功能可用。
- 操作：封面插画、加载进度、各错误信息、完成落幅、toast、章节选择、fullscreen与CSS theater兜底，所有图标由 icons.js 统一自绘，禁止原生无样式控件。
- 位置：src/icons.js/icon；src/ui.js/showState/toast；styles/main.css/component classes。
- 产物：整页有一致视觉令牌和细致四态。
- 自查：人为模拟媒体加载失败并检查可读中文原因；每种按钮触发 hover/pressed/focus/disabled。
- 测试：tests/browser.test.mjs 状态截图/ARIA 状态/全屏失败兜底；无 toast 堆积。
- 完成：C1–C10 所有适用状态有可见证据；NA 状态逐一解释。

**T09 响应式/无障碍/减弱动效（依赖：T08；规范 B5/C/A/D）**
- 前置：所有控件已落地。
- 操作：五断点 CSS，移动 toolbar 堆叠，字幕保持2行清晰，focus-visible 外环、缩放200%、prefers-reduced-motion 静态 pose＋硬切；失焦处理。
- 位置：styles/main.css/@media；src/scene.js/renderScene(opts.reducedMotion)；src/ui.js/keyHandler。
- 产物：375px、1440px 稳定，键盘完全可用。
- 自查：仅键盘走完整播放/暂停/重播/字幕开关；移动检查 44px target；读屏标签人工核对。
- 测试：Playwright 375/480/768/1024/1440 截图，scrollWidth≤clientWidth，控件 boundingRect 两两不相交，reduced motion 关键画面变化路径。
- 完成：AC06/AC07 和质量线 C 通过；200% 文字不裁切。

**T10 多文件/单文件构建与安全服务（依赖：T01,T03,T06,T09；规范 AC02/AC09/E）**
- 前置：所有静态资源本地化。
- 操作：build.mjs 依顺序组装 dist 两种产物、内联 m4a base64；serve.mjs 白名单 127.0.0.1；修复 file:// 兼容性；检查引用无外部资源。
- 位置：scripts/build.mjs/buildSingle；scripts/serve.mjs/requestHandler。
- 产物：dist/index.html、dist/single.html、dist/assets/score.m4a。
- 自查：find dist -type f 核资源清单；file:// 点击播放；本机请求内部文件返回404。
- 测试：tests/build.test.mjs 单文件无外链/白名单拒绝路径穿越；tests/browser.test.mjs 对 file:// 和 localhost 的 console/pageerror/外部 request 记数。
- 完成：零外部请求、零 console/pageerror、多文件与单文件叙事一致。

**T11 离线逐帧 MP4 导出与校验（依赖：T04,T06,T10；规范 AC03/AC05/D）**
- 前置：浏览器导出专用布局1280×720无控件，WAV 150s。
- 操作：写 export-video.mjs 严格 4500 次 seek→PNG buffer→ffmpeg stdin（回压）；verify-video.mjs ffprobe 验证；只在校验成功后正式命名。
- 位置：scripts/export-video.mjs/exportFrames；scripts/verify-video.mjs/verifyStreams。
- 产物：exports/cried-wolf.mp4、reports/ffprobe.json、帧信息 CSV/JSON。
- 自查：ffprobe 核 codecs/pix_fmt/fps/时长；在 VLC/QuickTime 浏览 0、31、73、113、146s，听得到声音且无黑帧。
- 测试：运行 npm run export && npm run verify，前30帧小样导出单独测试 ffmpeg 管道；检测导出帧hash和同步事件时间。
- 完成：4500帧、AAC声轨、H.264/yuv420p/1280×720/30fps，150±一帧；失败不得沿用旧成片。

**T12 浏览器证据与对比度性能审核（依赖：T09,T10,T11；规范 A–G/AC01–12）**
- 前置：构建、播放器、导出就绪。
- 操作：audit-browser.mjs 在 production/file:// 各开新 context，截固定15+3帧＋5宽度图；收集 request、errors、CLS、交互延迟、字幕对比度工具输出；全片跳点查看音画相符。
- 位置：scripts/audit-browser.mjs/runAudit；tests/contrast.test.mjs；reports/screenshots/。
- 产物：browser-audit.json、contrast.json、人工勾选质量表和截图。
- 自查：A1–E 每条在报告有证据路径、G 每项结论为0违反；不存在「应该没问题」。
- 测试：npm test、npm run audit、npm run verify，stdout 原文存文件；失败时修复并重新执行。
- 完成：所有 AC PASS；仅个别明确 NA 且对本片不适用，不得拿 NA 代替未测。

**T13 文档、打包与本地交付（依赖：T01–T12；规范 E/F/AC01–12）**
- 前置：完整通过本机硬闸。
- 操作：补 README.md 快速使用、原创素材声明与快捷键，docs/storyboard.md 完成记录、reports/latest.md 包含唯一版本/命令/逐项检查/未测限制/视频sha256；用 git diff --check 验证，提交所有源文件、文档与合理大小产物。
- 位置：README.md、docs/storyboard.md、reports/latest.md、reports/npm-test.txt、handoff/plans/TASK-001.md 作为依据。
- 产物：可播放页面、single.html、MP4（大小允许则入库）、完整证据。
- 自查：全新工作区 npm ci && npm run build && npm test；看 git status、确认没有未跟踪关键文件和带密码素材。
- 测试：重跑 npm run audit、npm run verify；统计测试数直接解析最新 TAP stdout，不手抄。
- 完成：首次交付结构与第9节一致，全部承诺可证，提交 sha 记入报告，且不配置或运行 CI。

## 7. 未知信息调查入口与封闭分支

### 7.0 分类清单
U1 本机实际 ffmpeg 编码器与 ffprobe 格式（有入口）；U2 npm playwright 版本和 Chromium 缓存（有入口）；U3 file:// 资源/音频播放行为（有入口）；U4 浏览器本机硬件/时序的真实性能（无公开入口，只能本机实测）；U5 导出成片是否能在 GitHub 单文件100MB限制下提交（有入口）；U6 中文字体实际字形、平台渲染一致性（无公开入口，只能本机实测）；U7 横屏/200%字幕可读性是否与台词最长行兼容（无公开入口，只能本机自证）；U8 参考短片具体镜头与 2026 技法解析证据（无充分公开入口，禁止臆断，审美不依赖这一点）；U9 播放器是否允许未手势播放音乐（有入口）。任何调研失败都记录进 reports/latest.md「未知项调查结果」。

### 7.1 有入口：每项问题、入口、判据、分支、上限
**U1 ffmpeg 可用性**：入口终端 ffmpeg -version；ffmpeg -hide_banner -encoders | grep -E 'libx264|aac'；ffprobe -version；官方 https://ffmpeg.org/ffmpeg-formats.html 。判据两个 encoder 均存在、ffprobe 正常返回。A 有则按第5节导出；B 缺 libx264 或 aac 则先用本机 brew 已有权限安装 ffmpeg，再复测；仍缺则停止标 BLOCKED_EXPORT，不用视频无音轨冒充。耗时上限15分钟。
**U2 依赖版本与浏览器**：入口 https://www.npmjs.com/package/playwright 及 npm view playwright@1.64.1 version；node --version；node -p "require('playwright/package.json').version"；npx playwright --version；npx playwright install --dry-run chromium。判据脚本安装后打印 1.64.1，chromium.launch 成功。A 满足继续；B npm 包不可解析先 npm cache 检查并重试一次；仍不可用标 BLOCKED_BROWSER，不要浮动到未知版本；Chromium缓存失效则执行 npx playwright install chromium，下载浏览器不等于下载素材，允许。耗时上限15分钟。
**U3 file://**：入口用 pathToFileURL(path.resolve('dist/single.html')).href 配合 playwright chromium.newPage().goto(url)，抓 pageerror/console/request 和点击播放后的 audio.paused/currentTime；MDN https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play 。判据可打开、按钮可操作、音轨 currentTime 前进、无外部请求。A 成功；B 若 file URL 外链/CORS 则替换所有 import/fetch/localfile 引用为内联并重试；若音频 codec data URI 失败则单文件改内联 base64 WAV（会更大，但仍完整离线）并明确体积；仍失败则 BLOCKED_SINGLEFILE。耗时上限20分钟。
**U5 MP4 GitHub 存储**：入口 stat -f%z exports/cried-wolf.mp4（macOS）；GitHub 官方文件大小说明 https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github ；判据 <100000000 bytes 且普通 push 接受。A 小于90MB则连同 MP4 入库；B ≥90MB 则 ffmpeg -crf 23、-preset slow重编码视频（保留 AAC，其他硬指标不变）一次，若仍>90MB就不放入 Git，保留本机成品与 sha256/文件体积/复刻命令，并在报告明确限制、不可将仓库交付宣称包含视频。耗时上限15分钟。
**U9 autoplay**：入口 https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/play 与无手势浏览器测试 page.evaluate(()=>audio.play())，观察 Promise reject。A 浏览器拦截时维持等待用户点击播放；B 不拦截也坚持默认不自动播，这是产品决定。上限5分钟。

### 7.2 无入口/只能本机自证：待查、方法、受影响决策与默认值
**U4 真实性能**：待查：本机 headless Chromium 在1280×720逐帧截 PNG 的平均耗时、p95 UI 帧渲染耗时、4500帧导出峰值 RSS。怎么查：写导出预检前30帧 Stopwatch、PerformanceObserver 测 rAF render 耗时、macOS ps/top 采样；浏览器起页压测。受影响决策：若 p95 render≤16ms 使用完整 7 层/180纸纹；若 >16ms 优先删去动态纸纹（保留静态50条）、禁掉村庄远景飘动，直到≤16ms；若导出内存>1.5GB 则减小 PNG pipe 输入队列到1帧/减少 screenshot 并发（默认已经1）。默认：单镜180条静态纸纹、串行截图、不断电影时长和帧数；记录实际值或未测。
**U6 字体渲染**：待查：系统栈在目标 Mac 中实际命中哪种中文字体；150s 字幕最长行是否发生溢出。怎么查：Playwright document.fonts.check、Canvas measureText/DOM scrollWidth、截图人工观察；无外网字体查取。影响：若 PingFang SC 可用沿用原栈；若不可用落到 Hiragino Sans GB/雅黑/Noto Sans CJK SC 且截图核对；若仍无则系统 sans-serif 作为最后 fallback 并标 LIMIT_FONT。默认明确栈见第3节，文本相对安全区最多22中文字符。
**U7 设备文字缩放**：待查：375px 和 200% 文本下工具栏是否重叠、字幕是否切掉。怎么查：Playwright 设置 width=375 并通过 CSS root font-size 放大至200%，截图、元素矩形碰撞检查。影响：若冲突则优先将工具一行改两行并将非核心按钮移下一行，不缩小44px触控；若字幕超过2行则在原分镜台词语义停顿处拆成前后两个 1.5s cue（不改总剧情），不可裁掉内容。默认：移动双行工具、字幕20/30px、最多2行。
**U8 参照片细节**：待查：2026 获奖片逐镜表现法是否能在一手官方分镜文档核实。怎么查：限于学院官方 https://www.oscars.org/oscars/ceremonies/2026 的获奖事实和 Cartoon Saloon/Apple/Pixar 官方页面；若未开放逐镜原始数据，不继续猜。受影响决策：如果找到正式公开创作访谈，也仅学习「留白/焦点」的原则；否则完全按本规划原创 15 镜制作，不增加任何所谓致敬镜头。默认：不引述未核实镜头特征、不使用外片资产。
本轮所有无入口条目必须在报告标「本机自证PASS/采用保守默认/仍未测」，严禁无证据说已解决。

### 7.3 调查收尾
对每个 U1–U9 记录调查开始/结束、命令或网页、观察结果、命中分支、是否采用默认值、对 AC 的影响。所有时间上限到期就走上文保守分支；硬 AC 被挡住时明确 BLOCKED，不换成假 PASS。

## 8. 本机验收、回归、视觉自检与明确失败线

### 8.1 必须运行并留真实 stdout 的命令
在仓库根目录：
    node --version
    npm --version
    ffmpeg -version
    npm ci
    npm run build
    npm test
    npm run audit
    npm run export
    npm run verify
    ffprobe -v error -count_frames -show_entries stream=codec_name,codec_type,width,height,pix_fmt,avg_frame_rate,nb_read_frames -show_entries format=duration -of json exports/cried-wolf.mp4
    shasum -a 256 exports/cried-wolf.mp4 dist/single.html
这些命令的 exitCode 和全量 stdout/stderr 必须写 reports 证据文件。需要显示真实 npm 测试数量时从 Node --test TAP 输出末尾的 # tests / # pass / # fail 行解析，不允许报告手填一个虚构数量。npm run audit 只负责浏览器检查，npm test 单元/小型浏览器回归，完整 4500 帧导出放 export 阶段独立执行，减少每次改 CSS 都重导出成本，但交付前必须完整重跑。

### 8.2 自动化必查
- 帧连续性：0→149.966，15 shot 时间拼接无洞，边界前后不重复 frameId；连续60帧取镜05的 40–42s，frameId 唯一严格升序、截图不同帧至少55个，且同一帧重复输出像素一致；全局总帧数4500。
- 声音：score.wav PCM样本数精确、119.5–123.5静音段 RMS=0、其它如29.1/69.4/113.1声效非零；成片有 AAC。
- 断网：启动服务器后浏览器 Route 把所有非127.0.0.1、本地 file/data/blob 请求全部拦截并记为 external（data: 不是请求）；同时 requestfinished 统计 external =0；捕获 console.type==='error' 与 pageerror。file:// 单文件需断服务器后重新运行相同检查。
- 对比度：针对 token 背景及其所有文字组合，执行 WCAG 相对亮度公式，对状态层/禁用层用最终颜色，记录 ratio JSON；每个可见控件的 focus ring 图像差异审查；不靠肉眼判断。
- CSS 静态审计：搜索 animation/transition 对 width,height,top,left,margin,padding,filter,fill,background-color 等禁止属性；导出帧循环监测 DOM 元素数量不增长和 style 属性白名单；剧情切字幕 textContent 的离散变化属非动效。
- 网络安全：HTTP 内部文件、路径穿越、编码后的 .. 必须404；无服务端目录列表。
- 适配：375、480、768、1024、1440 截图；scrollWidth≤clientWidth；play/restart/captions/mute/fullscreen 全为可点击44×44，控制区不互相叠；无控制条盖住字幕。
- 浏览器操作：Play/Pause/Replay/C；seek到 shot11 看真狼、seek回 shot03 无狼；标签页隐藏暂停，失败的 play Promise 显示中文可恢复文案；按 Escape 从 CSS theater/Fullscreen 退出。
- 200%字体缩放与 reduced-motion 各截对照；减少动态时色彩/章节/台词仍能理解。
- 视频：ffprobe 读真实字段，不用命令「执行了」代替「输出值符合」；人工在真实播放器看 1/31/73/108/116/136/146 秒，听三声警报且 120s 附近出现戏剧静默。

### 8.3 逐项视觉审阅 A–E、G 禁项
A1 指定8级字体/行长/行高/数字等宽；A2 色板令牌/量化对比/焦点区别；A3 4px间距/限制最大宽度；A4 圆角分级/shadow/z-index；A5 自绘图标/插画比例/装饰 SVG 可读替代。
B1 C1–C10 每个适用状态：默认、hover、active、focus、disabled、empty、loading、error、success；B2 <100ms反馈/可取消等待/防重复；B3 首屏主 CTA、层级≤3；B4 文案具体中文；B5 五断点/无横滚/最小点击44px。
C 键盘全流程/焦点/ARIA/可读标题/200%/reduced-motion；D 首屏≤2.5s、反馈≤100ms、CLS≤0.1、动态只变 transform和opacity、p95帧≤16ms（p95 不达标要如实报告与优化）；E 令牌单点/统一图标和按钮/无遗留 TODO/文件职责明确。
G 硬禁止逐条记录 0 或违规截图：默认按钮/字体、占位文案、同类规格不一、状态缺失、焦点丢失、移动重叠、emoji、多套图标、裸hex、颜色传达唯一信息、layout动画、不尊重reduced-motion。真正发现1项必须改好再交；不能把 G 项标 NA。

### 8.4 失败与可交付判定
任意 AC01–AC12 FAIL、G>0、15镜有任何关键剧情缺失、音轨不存在、单文件 file:// 不能播放、外部请求>0、时间误差>1帧、contrast<4.5，判定 NOT_READY。若 U1/2/3 导致无法验证核心功能判 BLOCKED，不得宣布 PASS。全部硬项 PASS、报告和截图完备、视频按发布包要求可访问、运行说明可复现，判 READY_FOR_DELIVERY。非目标项目（真人配音、多语言、真机）可在限制说明中列出且不影响本轮硬闸；Mac 本机未做 Safari/手机真机必须明写 NOT_TESTED。

## 9. 首次交付提交物、报告与证据格式

### 9.1 仓库目标清单
必交：package.json、package-lock.json、index.html、styles/main.css、src/{tokens,story-data,geometry,scene,timeline,audio-player,icons,ui,main}.js、scripts/{build,generate-audio,serve,export-video,verify-video,audit-browser}.mjs、tests/{timeline,story,audio,contrast,build,browser}.test.mjs、docs/storyboard.md、README.md、dist/index.html、dist/single.html、dist/assets/score.m4a、reports/latest.md、reports/npm-test.txt、reports/browser-audit.json、reports/contrast.json、reports/ffprobe.json、reports/screenshots/ 至少15镜的代表帧＋5断点＋四态关键截图、exports/cried-wolf.mp4（大小满足 Git 限制时）。
如果 build 采用辅助模板/data 文件，必须同步提交模板、音频事件源；列表视为最低集合而非拒绝必要辅助文件。生成的 WAV 如体积大放 build 缓存而不入库，但视频仍可从 npm run build 完整复现。各产物不可混入外部版权素材。

### 9.2 reports/latest.md 必须包含
1. 标题任务TASK-001、规划文件位置、执行 commit SHA、源简报 blob SHA、平台/node/npm/playwright/ffmpeg版本。
2. Scope 完成对照：15镜与实际时长、原创资产说明、音效事件、无旁白说明。
3. Build/Test 命令、真实 exitCode、stdout 文件路径、自动解析的 tests/pass/fail 数量；失败重试必须区分轮次。
4. Browser 审计（多文件/单文件分别：请求数、外部请求、console error、pageerror、各种宽度截图、键盘过程）。
5. 视频实际 ffprobe 原始 JSON 与逐字段断言：container duration、codec、分辨率、帧率、帧数、AAC；文件字节数/sha256。
6. A1–A5/B1–B5/C/D/E 和全部 G 禁项的 PASS/FAIL/NA、如何检验、截图/JSON 路径。
7. U1–U9 未知项调查结果（入口、实际值、分支、默认是否用、耗时）；规划偏离清单逐条说明。
8. NOT_TESTED 与已知限制（真机、其它浏览器、真人旁白、非目标服务、MP4未入仓库的影响如有）。
9. 最终单行结论：READY_FOR_DELIVERY / NOT_READY / BLOCKED 其一，并在证据不全时不得使用 READY。
报告中的「测试 23/23」这种数字只能程序从报告 stdout 抽取后写入；如果无法解析，显示 COUNT_UNAVAILABLE 并不通过 AC01 证据闸门。

### 9.3 证据保存与差分质量
每镜保存一张实际浏览器 screenshot，至少镜头04/08/12呼喊特写与镜14失羊前后并排图；t0/31/56/72/97/108/115/126/136/146关键节点覆盖；尺寸至少 1280×720。真实 Web 页面五个宽度截图，加 hover/focus/loading/error/empty/ended 各至少一张。测试日志与 ffprobe JSON 保留原始输出并在 latest.md 引用。执行方须亲自做静音观看15镜一次、正常听完音轨一次，并写明有无理解失败的场次。禁止提交空白报告、示意截图替代实测、临时灰块图替代场景。

### 9.4 交付使用入口
README 标明：
- 运行 npm ci && npm run build && npm test；
- 打开 dist/single.html 即离线本地播放（首次须点播放）；
- 多文件版本 npm run dev 后进入 http://127.0.0.1:4173/；
- npm run export && npm run verify 生成并校验 MP4；
- 操作键 Space/C/R/M/F/Esc 及 Tab/Enter；
- 视频本机导出耗时取决于 CPU，没有实时导出保证；
- 版权：「故事源自公有领域伊索寓言；本片图形、改编与合成声音均为本项目原创」；
- 生成资源全部本地化、运行时无网络依赖。

## 10. 执行 Agent 遇困的明确处置规则

1. 只有规划 Agent 与本机执行 Agent 两个角色。执行 Agent 接此文后独立制作、修正、测试、留下证据，不再询问网页版 GPT，不新增评审代理流程，不将调研义务倒推给用户。
2. 若碰到本规划未列出的实际问题：先按优先级「剧情事实完整性 > 150秒有声音的确定性导出 > 零外链/可离线 > 可访问性硬线 > 界面统一 > 装饰美术」决定；不得为了视觉饰物牺牲验收。决策记录到报告「新增问题与处置」，给复现步骤/原因/修正前后证据。
3. 某 API 不存在、Node26与文档行为不一致、ffmpeg 命令不兼容时，以实测能跑通为准；优先使用 Node 内建与 DOM 原生等价替代，设计令牌、UI状态、数据形状和成片结构不变；必须记录「偏离规划 5.x / 原因 / 替代方案 / 测试证明」，不许悄悄删硬指标。
4. 保留最近一份合格的源代码快照，但禁止拿旧视频/旧测试日志谎称对最新提交通过。每次代码、CSS、声音或镜头有改动，需要在最后一次最终源码上重做 npm ci/build/test/audit/export/verify 并更新实际报告指纹。
5. 外部素材硬禁永远优先于进度；查不到漂亮素材就画简单但完整的原创剪纸造型，不调用外部素材 API。无旁白是既定方案，不需要临时寻找朗读服务。
6. 遇到构建/单文件/视频/对比度任一硬 AC 无法补救：保留详细失败证据并标 NOT_READY 或 BLOCKED，不用「基本完成」替代；仍交出能运行的最大完成部分与复现步骤。
7. 不配置、不触发、不等待任何 CI；本机 macOS 真实验收是唯一技术证据来源。不要合并其它分支或改变用户未授权文件。最终一次性 commit/push 计划允许执行的完整交付，确保版本对齐。
8. 人工审美最终判断硬规则：每镜截图里要能读清主体动作和空间轴；视线焦点最多两处；第一次真狼只出现在101s之后；三次警报在时间轴/声音/字幕清楚区分；第二次村民态度明显恶化；121–132s的「无人上山」必须固定镜头并用门关着表达；146s片尾主文和寓意必须可完整读到。任一不成立返回 T03/T05 调整而非宣称过关。

---
**交接完成条件（规划层）**：本文件可直接交给从未了解该项目的执行 Agent，按 T01→T13 顺序制作。规划本身不代表成片已构建或已通过验收；真实 READY_FOR_DELIVERY 只可由本机执行报告的全部硬证据确认。
