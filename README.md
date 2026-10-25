# 《狼来了｜回声的代价》

一部 **150 秒、16:9、纯本机原创**的 HTML5 动画短片：牧羊少年两次谎喊「狼来了」，第三次狼真的来了，却再也没有人上山。

- 画面：全部为本项目原创的矢量剪纸美术（代码绘制），无外部图片、无 emoji 图标、无第三方图形库
- 声音：全部为本项目原创的程序化合成（Node 直接写 PCM），无外部音源、无真人配音、无付费 API
- 运行时：**零外部网络请求**，可离线打开；同一份时间线既能网页播放，也能逐帧导出 MP4

---

## 快速开始

```bash
npm ci
npm run build
npm test
```

- **离线单文件版**：构建后直接双击 `dist/single.html` 即可播放（首次需点「播放」，这是浏览器对有声自动播放的限制）
- **多文件版**：`npm run dev` 后打开 <http://127.0.0.1:4173/>
- **导出成片**：`npm run export && npm run verify`，产物在 `exports/cried-wolf.mp4`

## 操作

| 操作 | 键 |
|---|---|
| 播放 / 暂停 | `空格` 或点击播放按钮 |
| 字幕开关 | `C` |
| 从头重播 | `R` |
| 静音 | `M` |
| 影院模式 / 退出 | `F` / `Esc` |
| 定位 | 拖动进度条，或用 `章节` 下拉直接跳镜 |

`Tab` 可以在全部控件之间移动，焦点环清晰可见；`Enter` / `Space` 激活按钮。

## 目录结构

```
data/story.json            唯一真源：15 镜数据、字幕、53 个声音事件
src/tokens.js              唯一设计令牌（颜色 / 字阶 / 间距 / 阴影 / z-index）
src/story-data.js          由 data/story.json 生成的浏览器侧绑定（勿手改）
src/timeline.js            纯函数时间线内核（采样 / 定位 / 字幕 / 叠化）
src/geometry.js            原创矢量造型：少年 / 羊 / 村民 / 狼 / 村庄 / 山野
src/scene.js               场景渲染：视差分层、摄影机、姿态词典、镜头特效
src/audio-player.js        以音轨为主时钟的播放控制
src/icons.js               自绘图标集（24×24 网格，2px 描边）
src/ui.js                  控件状态、四态文案、字幕、快捷键、提示条
src/main.js                启动编排与对外 API
styles/main.css            影院外壳样式（只用 CSS 变量，不含裸 hex）
scripts/generate-audio.mjs 原创 PCM 合成 + ffmpeg 转 AAC
scripts/build.mjs          多文件产物 + 单文件产物 + 产物自检
scripts/build-storyboard.mjs 由真源生成分镜表
scripts/serve.mjs          本机静态服务（白名单，127.0.0.1）
scripts/export-video.mjs    Playwright 逐帧 → ffmpeg → MP4
scripts/verify-video.mjs    ffprobe 逐字段校验成片
scripts/audit-browser.mjs   浏览器端证据采集（截图 / 网络 / 无障碍 / 性能）
tests/                     故事 / 时间线 / 音轨 / 对比度 / 构建 / 浏览器 六组测试
docs/storyboard.md         分镜施工表（由真源生成）
```

## 对外 API

验收脚本与导出流程使用同一套接口：

```js
window.CriedWolf.renderAt(t)      // 渲染到第 t 秒
window.CriedWolf.seekFrame(i)     // 渲染第 i 帧（0…4499）
window.CriedWolf.getState()       // { timeSec, frameId, status, captions, ... }
window.CriedWolf.play() / pause() / replay()
window.CriedWolf.setCaptions(b) / setVolume(v) / setMuted(b)
window.CriedWolf.getShots()       // 15 镜元数据
window.CriedWolf.setExportMode(b)// 导出模式：隐藏 UI，舞台固定 1280×720
```

画面时间一律读音轨 `currentTime`，不用 RAF 累加 dt，因此不会产生音画漂移。

## 版权与素材来源

故事源自**公有领域**的伊索寓言。本片的**图形、分镜改编、配乐、音效与全部代码均为本项目原创**；不含任何第三方美术素材、音频采样、网络字体或图标库。角色造型为本项目自绘，不复刻任何现有作品。

## 已知边界

- 导出耗时取决于 CPU，4500 帧逐帧渲染没有实时保证。
- 本项目只在 macOS / Chromium（Playwright 1.64.1）上做过验收；其它浏览器与手机真机未测试。
- 无旁白：意义由中文字幕、场景声与原创配乐承载。
