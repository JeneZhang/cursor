# Cursor Cloud Computer：录制能力

`record_screen` 产出的不是原始录屏，而是**给人看的演示片**。采集阶段只负责把像素
和输入事件原样存下来；怎么运镜、怎么加速、光标怎么走，全部是保存时才做的渲染期决策。

这份文档只写录制这一条链路。桌面本身、computer-use 输入、人机共享见
[`product-overview.md`](./product-overview.md)；采集成本的对照数字见
[`current-state.md` §4.6](./current-state.md)；降低采集成本的改法见
[`upgrade-plan.md` P2-1](./upgrade-plan.md)。

内容来自 exec-daemon 里的 `LocalRecordScreenExecutor` / `InputEventLogger` /
`recording-renderer`，以及这台 VM 上一次真实会话留下的 staging 目录。
凡是**从代码或产物读出来的**不特别标注；凡是**对设计意图的推断**会标明。

---

## 1. 定位

录制要解决的问题不是"把屏幕存档"，而是：

> agent 在桌面上点了、打了、等了——把这段过程剪成一段人能在 Dashboard 里看懂的视频。

人看演示需要的东西（镜头跟着操作推近、点击有反馈、空闲被跳过、光标移动平滑）
都不在原始帧里，而在**语义层**：哪次点击重要、哪段空闲是在等加载、指针从哪儿到哪儿。

所以整条链路拆成三份互不耦合的数据：

| 层 | 存什么 | 何时写 | 谁读 |
| --- | --- | --- | --- |
| 代理片 | 帧缓冲像素，全 I 帧 H.264 | `START_RECORDING` 起、一直写到停 | 后处理按任意时间点取帧 |
| 事件日志 | 每个 computer-use 动作的时间戳、坐标、光标形状 | 每个 `xdotool` 命令结束时 | 后处理重建光标 / 波纹 / 按键条 / 运镜 |
| 渲染计划 | 播放大纲：切哪些段、加速多少、推哪几次镜头 | `SAVE_RECORDING` 时算出来 | Remotion 按计划合成成片 |

"怎么剪"完全是渲染期的决策。改进运镜算法不用重录；反过来，
**成片也不是现场的忠实回放**——§7 专门说这件事。

推断：拆开的另一个好处是采集进程可以很笨（一个 ffmpeg、一组固定参数），
所有"看起来像演示"的智能都集中在一个可以单独发版的渲染器里。

---

## 2. 工具接口

`record_screen` 只有三个模式，外加一个可选文件名。**没有暴露任何剪辑参数**——
缩放阈值、加速策略、光标弹簧全是代码常量。

| 模式 | 作用 | 失败条件 |
| --- | --- | --- |
| `START_RECORDING` | 起 ffmpeg + `InputEventLogger`，开始写 staging | ffmpeg 5 秒内没吐出 `frame=` |
| `SAVE_RECORDING` | 停采集 → 写 `recording-data.json` → 后处理 → 把成片移到 artifacts | 当时没有进行中的录制；代理片缺失 |
| `DISCARD_RECORDING` | 停采集并删掉这次的 session 目录 | 当时没有进行中的录制 |

### 2.1 一次只能录一段

`LocalRecordScreenExecutor` 内部只有一个 `activeRecording`。
`START_RECORDING` 时如果已经在录，会先停掉并**丢掉**上一段（返回值里
`wasPriorRecordingCancelled = true`），不会自动保存。

`save_as_filename` 只在 `SAVE_RECORDING` 生效。开始时如果带了文件名，
会被忽略（`wasSaveAsFilenameIgnored = true`），避免模型以为"现在指定的名字"
已经决定了产物路径。

### 2.2 文件名规则

`validateAndNormalizeSaveAsFilename` 的完整约束：

- 不允许 `/` 或 `\`。模型如果把绝对路径 `/opt/cursor/artifacts/foo.mp4` 传进来，
  前缀会被剥掉，只留 `foo.mp4`。
- 只保留 `A-Za-z0-9 ._-`，其余替换成 `_`。
- 超过 128 个字符就截断。
- 没有 `.mp4` 后缀就补上。
- 目标文件已存在则改成 `foo-2.mp4`、`foo-3.mp4`，不会覆盖。
- 校验失败时不报错中止，而是退回用 session 目录名当文件名，
  并在结果里带上 `requestedFilePathRejectedReason`。

### 2.3 和 computer-use 怎么接上

开始录制时，exec-daemon 把这次的 `InputEventLogger` 挂到
`X11ComputerUseExecutor` 上；停止时摘掉。computer-use 自己不知道"正在录像"——
它只是每个 `xdotool` 命令结束时，如果挂了 logger 就记一条。

没在录像时 logger 是空的，输入路径零开销。

---

## 3. 管线

```
record_screen START
        │
        ├─ ffmpeg -f x11grab -draw_mouse 0
        │     → /opt/cursor/recording-staging/session-<时间>-<id>/
        │          recording/recording_render_proxy_1080p.mp4
        │
        └─ InputEventLogger
              每个 xdotool 命令结束 → 一条事件（坐标、时长、光标形状）

record_screen SAVE
        │
        ├─ SIGTERM ffmpeg（等它写完 moov，最多 20 秒）
        ├─ 写 recording-data.json（version 3，含时间偏移）
        ├─ polished-renderer.node（Remotion）
        │     分析事件 → render-plan.json → 合成光标/波纹/按键/运镜/变速
        │     → recording_full.mp4
        ├─ 拼 2 秒品牌片尾（不重编码）
        └─ rename/copy 到 /opt/cursor/artifacts/<name>.mp4     ← 这里的文件会上传
```

目录是刻意分开的：staging 权限 777，但**不会被上传**；artifacts 同样 777，
放进去的文件会进用户 Dashboard。半成品和成片隔离，避免一段没剪完的 800 MB
代理片被当成交付物。

一次真实会话留下的文件（2026-08-29，驱动 Electron Todo 应用的那段）：

```
/opt/cursor/recording-staging/session-2026-08-29T02-29-41-…/recording/
  recording_render_proxy_1080p.mp4                 870 MiB   代理片
  recording-data.json                              6 KiB     12 条输入事件
  render-plan.json                                 17 KiB    播放大纲
  recording_full.mp4.polished-renderer-metrics.json  1 KiB   渲染耗时

/opt/cursor/artifacts/
  computer_use_drives_electron_todo_app_chinese_input_drop.mp4   4.08 MB
```

`recording_full.mp4` 在搬到 artifacts 之后会从 staging 里消失，metrics 和
render-plan 留在原地——这是事后核对"到底剪了什么"的入口。

---

## 4. 采集阶段

### 4.1 实际发出去的 ffmpeg 命令

分辨率和刷新率来自 `detectDisplay`（读失败就用 60 Hz）。
常量写在 `LocalRecordScreenExecutor` 上，**不是**工具参数：

| 常量 | 值 |
| --- | --- |
| `PROXY_TARGET_WIDTH` | 1920 |
| `PROXY_TARGET_FPS` | 60 |
| `PROXY_CRF` | 17 |
| `PROXY_PRESET` | `veryfast` |
| `PROXY_PROFILE_VERSION` | `render-proxy-h264-all-i-v1` |
| `DEFAULT_REFRESH_RATE` | 60 |

拼出来的参数是：

```
ffmpeg
  -video_size 1920x1200
  -framerate <显示器刷新率，默认 60>
  -draw_mouse 0
  -f x11grab -i :1
  -vf scale=1920:-2:flags=lanczos,fps=60
  -c:v libx264 -preset veryfast -crf 17
  -pix_fmt yuv420p -profile:v high
  -x264-params keyint=1:min-keyint=1:scenecut=0:bframes=0
  -movflags +faststart
  -tune fastdecode
  -y recording_render_proxy_1080p.mp4
```

几点不是多余的：

- **`-draw_mouse 0`**：真实光标不进画面。成片里的光标是后处理画的，
  采集到的真实光标只会和它错位。见 §7。
- **全 I 帧**（`keyint=1:min-keyint=1:scenecut=0:bframes=0`）：后处理要按任意
  时间点取帧做缩放和变速。有 B/P 帧的话，每次 seek 都得往前解码一个 GOP，
  渲染 1922 帧就会变成一次完整解码。profile 版本号就叫
  `render-proxy-h264-all-i-v1`，改 GOP 结构等于换 profile。
- **`+faststart`**：moov atom 写在文件末尾。所以停的时候必须 `SIGTERM`
  让 ffmpeg 自己收尾；20 秒还不退就 `SIGKILL`，那份文件大概率缺索引、后处理读不了。
- **`tune fastdecode`**：代理片是给渲染器反复随机取帧用的，解码成本优先于体积。
- **没有音频**：这台机器没有 `pulseaudio` / `pipewire` / `/dev/snd`，
  命令行也没 `-f pulse`。成片是无声的。
- **进程 `detached: true`**：ffmpeg 自己一组，executor 挂了不会直接带走它；
  停的时候按进程组发信号。

进程拉起之后，executor 盯 stderr 里出现 `frame=` 才认为"开始写帧"，最多等 5 秒。
这个时刻记成 `ffmpegStartedEpochMs`，后面算事件和视频的时间偏移靠它。

### 4.2 为什么这么贵

全 I 帧 + 60 fps + crf 17 是给渲染器的礼物，不是给用户的。
对照数字来自 [`audit.py` 的 `capture` section](../../tools/cloud-desktop-audit/audit.py)
（6 秒采集，全程有鼠标移动）：

| 参数 | 占用核数（共 4 核） | 实际帧率 | 折算每分钟 |
| --- | --- | --- | --- |
| **当前：60 fps / crf 17** | **1.18** | 60.0 | **385 MiB** |
| 30 fps / crf 17 | 0.61 | 30.0 | 251 MiB |
| 30 fps / crf 20 | 0.59 | 30.0 | 178 MiB |

画面越满越贵：另一次更满的测量里当前参数跑到 1.63 核 / 555 MiB 每分钟。
上面那次真实会话的代理片是 870 MiB / 139 秒，合 **376 MiB/min**，落在这个区间里。

成片只有 4.08 MB。所以贵的是 staging，不是交付物。

成本不只是磁盘。4 vCPU 上编码器要和被测应用抢 CPU，于是**录着屏跑的 GUI 测试
和不录屏跑的时序不一样**——录屏这个动作本身影响了它记录的对象。
这是 [`upgrade-plan.md` P2-1](./upgrade-plan.md) 要把采集降到 30 fps / crf 20 的原因：
预期 CPU 和 staging 都砍一半，全 I 帧保留（后处理仍要任意 seek）。

---

## 5. 事件日志

### 5.1 为什么不轮询指针

`InputEventLogger` 的注释把设计说死了：

> 既然 computer-use 的输入全部走 xdotool，我们确切知道做了什么。
> 不要去轮询光标位置，而是在每条 xdotool 命令**结束**时记一条。

这样拿到的是：

- 命令真正做完的时刻，不是模型发出请求的时刻
- 干净的光标路径航点（`positionBefore` / `positionAfter`）
- 动作之后的光标形状（`xdotool getmouselocation` + 查 X 的 cursor 字体名，
  映射到 `ARROW` / `POINTER` / `TEXT` / `WAIT` / `GRAB` 等 13 种）

实现上先按动作语义**乐观更新**`lastKnownPosition`（避免事件排队快于采集时
`positionBefore` 用到过期值），再异步读一次真实坐标纠偏。读失败就退回乐观值，
光标形状退回 `ARROW`。

开始时会先抓一次当前指针；失败则落到 API 坐标系的正中（1280×800 下是 640, 400）。

### 5.2 `recording-data.json`（version 3）

`SAVE_RECORDING` 停 logger、停 ffmpeg 之后写出。关键字段：

```json
{
  "version": 3,
  "durationMs": 138966,
  "recordingStartEpochMs": 1787970581651,
  "ffmpegStartedEpochMs": 1787970581426,
  "eventToVideoOffsetMs": -225,
  "displayWidth": 1920,
  "displayHeight": 1200,
  "apiWidth": 1280,
  "apiHeight": 800,
  "inputEvents": [ /* 见下 */ ],
  "renderProxies": {
    "profileVersion": "render-proxy-h264-all-i-v1",
    "source": { "width": 1920, "height": 1200, "durationMs": 138966, "fps": 60 },
    "artifacts": [{ "name": "render_proxy_1080p", "keyint": 1, "codec": "h264", ... }]
  }
}
```

`eventToVideoOffsetMs = ffmpegStartedEpochMs - recordingStartEpochMs`。
上面这次是 **-225 ms**：ffmpeg 先开始写帧，logger 的零点更晚。
后处理用这个偏移把事件时间对齐到视频时间；对不齐的事件（超出视频时长的）会被丢掉。

每条事件：

| 字段 | 含义 |
| --- | --- |
| `executionTimestampMs` | 命令结束时刻，相对 `recordingStartEpochMs` |
| `commandDurationMs` | 这条 xdotool 花了多久 |
| `positionBefore` / `positionAfter` | **API 坐标**（1280×800），不是帧缓冲坐标 |
| `cursorTypeAfter` | 动作之后的光标形状枚举 |
| `action.action.case` | `click` / `mouseMove` / `type` / `key` / `scroll` / `drag` / `wait` / `screenshot` / `cursorPosition` / `mouseDown` / `mouseUp` |

坐标是 API 坐标，因为 logger 挂在 computer-use 这一侧，模型给的就是这套。
渲染器按 `displayWidth / apiWidth`（1.5）乘回去再画到 1920×1200 的成片上。

`serializeAction` 会把动作压成 JSON 安全的子集：点击带坐标/按钮/次数/修饰键，
输入带文本，拖拽带整条路径。`screenshot` / `cursorPosition` / `mouseDown` /
`mouseUp` 几乎只留 case 名——后处理本来也不拿它们做运镜。

### 5.3 日志里没有的东西

- **人在 noVNC 上的输入**。RFB 事件不经过 xdotool，logger 看不见。
- **应用自己挪的指针**（比如程序把光标藏起来、或拖到屏幕边缘自动滚）。
- **没走 computer-use 的按键**（人敲的、或别的进程注入的）。
- **屏幕上出现的文字**——`type` 只记模型发出去的字符串，不记输入框最终收到了什么。
  中文丢字（[`current-state.md` §4.5](./current-state.md)）在成片的按键条上
  仍会显示模型以为打进去的那几个字。

---

## 6. 后处理

后处理是 `polished-renderer.node`，内核是 Remotion。
`SAVE_RECORDING` 调 `renderRecordingSession({ fps: 60, includeBrandTag: true })`。
工具层没有开关，测试/开发可以设 `disablePolishedRendering`，那时直接把代理片
拷到 artifacts，跳过这一整节。

决策分两层配置，都是代码常量。

### 6.1 预处理：决定"剪什么"

`DEFAULT_PREPROCESSING_CONFIG`：

| 参数 | 默认 | 作用 |
| --- | --- | --- |
| `zoomImportanceThreshold` | 60 | 重要性低于此值的动作不进镜头候选 |
| `minZoomIntervalMs` | 1500 | 两次推镜头最短间隔 |
| `maxZoomsPerMinute` | 8 | 每分钟推镜头次数上限 |
| `targetZoomDensity` | 0.3 | 目标上有多少比例的时间处于推近状态 |
| `minSpeedupDurationMs` | 1000 | 短于 1 秒的空闲不加速 |
| `cursorStyle` | `MELLOW` | 光标弹簧（见 §6.3） |
| `speedUpLoadingWaits` | true | 加速"等界面"的空闲 |
| `speedUpThinkingPauses` | true | 加速"模型在想"的空闲 |
| `preserveViewingResults` | true | **不**加速"在看结果"的空闲 |
| `showClickEffects` | true | 画点击波纹 |
| `showKeystrokes` | true | 画按键提示条 |

选镜头的算法：先按阈值过滤，再算
`round(时长分钟 × maxZoomsPerMinute × targetZoomDensity)` 作为目标次数，
按重要性从高到低贪心挑，间隔不够就跳过。连续滚动会先合并成一个候选
（重要性压到 ≤50，通常过不了阈值 60——滚动默认不推近）。

### 6.2 播放时间线：决定"播多快"

`DEFAULT_RENDERER_CONFIG.timing`：

| 参数 | 默认 | 作用 |
| --- | --- | --- |
| `preActionPaddingMs` | 800 | 每个动作往前留的接近时间（注释写"曾经是 400"） |
| `postActionPaddingMs` | 600 | 动作之后停留 |
| `minGapMs` | 800 | 短于这个的空隙不加速 |
| `maxGapOutputMs` | 2000 | 再长的空隙，成片里最多留 2 秒 |
| `speedMultiplier` | 8 | 空隙加速倍率上限 |
| `zoomInLeadMs` | 300 | 推近比动作稍早开始 |
| `zoomOutDelayMs` | 2000 | 最后一次点击后保持推近 2 秒 |
| `zoomMaxGapMs` | 4000 | 两次点击间隔不超过 4 秒就保持推近 |

动作段因此几乎都是 **1400 ms**（800 + 600）。开头的死时间会被裁掉：
成片从"第一个有意义的动作往前 800 ms"开始，不会先放一段空桌面。

空隙段的输出时长被夹在大约 1.2 秒到 2.0 秒之间，倍率不超过 8；
超长空隙（比如停录前那几十秒）会被直接压到 2 秒，倍率可以高于 8。
上面那次会话末尾 34.4 秒空闲 → 成片 2.0 秒，倍率 **17.2×**。

### 6.3 合成光标

真实光标没进代理片。成片里的光标是按事件航点、用弹簧积分画出来的。
四种预设：

| 风格 | tension | friction | mass | 手感 |
| --- | --- | --- | --- | --- |
| `SLOW` | 120 | 30 | 1.2 | 沉、带过冲少 |
| **`MELLOW`（默认）** | **170** | **26** | **1** | 不急不缓 |
| `QUICK` | 280 | 24 | 0.8 | 跟手 |
| `RAPID` | 400 | 30 | 0.5 | 几乎贴着航点 |

缓动曲线 `MELLOW` 是 cubic-bezier(0.42, 0, 0.58, 1)，标准 ease-in-out。
光标形状跟 `cursorTypeAfter`：箭头、手型、I 梁、等待、移动、四种缩放、禁止、抓取。

### 6.4 点击波纹

`generateClickEffects` 从事件里抽点击位置，按按钮和次数分成
`SINGLE` / `DOUBLE` / `TRIPLE` / `RIGHT` / `MIDDLE`。
拖拽会在路径的起点和终点各落一个关键帧。
坐标随后按 1.5 倍从 API 空间映射到视频空间。

### 6.5 按键提示条

三类，显示约 1.5 秒，叠在画面底部居中：

| `eventType` | 什么时候 | 成片上长什么样（真实会话） |
| --- | --- | --- |
| `KEY_COMBO` | `key` 动作且是组合键 | `^A` |
| `KEY_SINGLE` | 单个功能键 | `⌦ Del` |
| `TEXT_TYPED` | `type` 动作 | `"云端桌面升级验证"`、`"延迟"` |

文本是模型发出去的字符串，不是输入框读回的内容。

### 6.6 自动缩放

每种动作有建议倍率（`DEFAULT_ZOOM_CONFIG`）：

| 动作 | 建议倍率 |
| --- | --- |
| 单击 | 1.5 |
| 双击 / 三击 | 1.8 |
| 输入 / 按键 | 1.6 |
| 滚动（及滚动序列） | 1.2 |
| 拖拽 | 1.1 |
| 其他 | 1.3 |

`wait` / `screenshot` / `cursor_position` / `mouse_move` 不产生候选。
重要性：输入 70、组合键 80、回车 75、普通按键 60、拖拽 65、滚动 40，
点击另有一套看位置和周围动作的打分。阈值 60，所以纯滚动通常推不近。

上面那次 12 个动作的会话，成片里实际推了 **3 次**，倍率都是 1.4
（渲染期还会再收一层，和候选建议不完全相等），其中一次把连续三个点击
收进同一扇窗口。

### 6.7 空闲分类

空隙先按前后动作分类，再决定加不加速：

| 分类 | 判定（默认阈值） | 建议倍率 | 默认加不加速 |
| --- | --- | --- | --- |
| `LONG_OPERATION` | 空隙 ≥ 10 s | 4× | 加速 |
| `LOADING_WAIT` | 点击之后等到截图/结束；或交互后 ≥ 1 s 的中等空隙 | 4× | 加速 |
| `THINKING_PAUSE` | 两次输入/按键之间 ≥ 5 s；或其他 ≥ 5 s 且不是在看结果 | 3× | 加速 |
| `VIEWING_RESULT` | 截图之后 0.5–3 s；或对不上上面的短空隙 | 1× | **不加速**（`preserveViewingResults`） |

短于 500 ms 的间隙不叫空闲。短于 1000 ms 的空闲即使分了类也不加速
（`minSpeedupDurationMs`）。

这套分类用的是 computer-use 的动作语义，不是画面内容——它不知道
Chrome 是不是还在转圈。所以"点击之后那 7 秒"一律当成思考停顿或加载，
哪怕其实是模型在读截图。

播放时间线（§6.2）是最终裁量：分类给出建议倍率，渲染器再按
`speedMultiplier` / `maxGapOutputMs` 夹一层。分类是"这是什么"，
时间线才是"成片里留几秒"。

### 6.8 品牌片尾

`includeBrandTag: true` 时，渲染器另外渲一段 **正好 2.00 秒** 的片尾：
把内置的 Cursor 标志动画缩放到成片高度、垫在 `#12100a` 底上，
再和正片 concat（`-c copy`，不重编码）。
metadata 写成 `comment=Made with Cursor`、`encoder=Cursor Polished Renderer`。

**没有片头卡片。** 成片开头就是第一个动作往前 800 ms 的画面。
产品文档里从前把"开场推拉"写成片头，那其实是第一次动作上的自动缩放，
不是单独一段。

### 6.9 一次真实会话的账

驱动 Electron Todo、验证中文输入的那段（12 个动作：5 次点击、4 次按键、3 次输入）：

| | 源（代理片） | 成片（含片尾前） |
| --- | --- | --- |
| 时长 | 138.97 s | 32.02 s |
| 体积 | 870 MiB | 4.08 MB（加上 2 s 片尾后的交付文件） |
| 帧率 / 尺寸 | 60 fps，1920×1200 | 同样 |
| 时间线 | — | 12 段动作（各 1.4 s）+ 12 段空隙（1.2–2.0 s） |
| 叠加 | — | 5 个点击波纹、7 条按键提示、3 扇推近窗口 |

压缩比大约 **4.3×**（139 s → 32 s），再加 2 秒片尾，交付长度约 34 秒。
这就是其它文档里"34 秒成片、4.08 MB"的来源——那是**输出**时长，不是采集时长。

渲染本身不便宜。`polished-renderer-metrics.json`：

| | |
| --- | --- |
| 输出帧数 | 1922 |
| 墙钟 | 115.3 s |
| 渲染速率 | 16.7 fps |
| 其中合成 | 110.2 s |
| 其中编码 | 6.1 s |

也就是说，**剪 32 秒成片要再花将近两分钟**，而且几乎全花在 Remotion 合成上，
不是 x264。保存录制会在 `SAVE_RECORDING` 里同步堵住，直到这段跑完。

---

## 7. 这是重建，不是忠实录像

成片里三件关键的事都不来自像素：

1. **光标位置和形状**——来自事件日志的航点 + 弹簧，不是屏幕上当时的指针。
2. **点击发生在哪、按了什么键**——来自模型发出的动作，不是应用实际收到的。
3. **这段等了多久**——来自时间线压缩，不是墙钟。

因此：

- 人在 noVNC 上动鼠标、应用自己挪指针，成片里**没有光标**。
  代理片里也没有（`-draw_mouse 0`）。两条通路都看不见这些运动。
- 模型 `type("延迟")` 但输入框只收到 `延`（[`current-state.md` §4.5](./current-state.md)
  里真实发生过），按键条仍写 `"延迟"`。
- 模型连续思考 34 秒，成片里是 2 秒。用来判断"这一步是不是太慢了"会误判。
- 自动缩放改变了你对控件相对位置的直觉：推近之后，Dock 和面板可能完全出画。

**排查"应用为什么会那样"时，成片会误导你。** 那种场景去看 staging 里的
`recording_render_proxy_1080p.mp4`——它仍是全 I 帧、未变速、未叠加，
只是没有光标。事件时间以 `recording-data.json` 为准。

如果以后要录**人**的操作，现有设计不够用：既不采真实光标，也不记 RFB 事件。
这是 [`upgrade-plan.md` 的遗留观察](./upgrade-plan.md)，还不是改造项。

---

## 8. 产物、上传、敏感内容

| 路径 | 会不会上传 | 里面是什么 |
| --- | --- | --- |
| `/opt/cursor/recording-staging/session-…/` | 否 | 代理片、事件、渲染计划、metrics |
| `/opt/cursor/artifacts/*.mp4` | **会** | 精修成片 |
| `/tmp/computer-use/*.webp` | 否（本机留存） | computer-use 每张截图的副本 |

`SecretRedactor` 只对工具的**文本输出**做字面量替换。视频是像素，
屏幕上出现过的密码框、验证码、API key 会原样进代理片，也会进被上传的成片。
没有像素级打码，也没有"敏感期间停录"的钩子
（见 [`product-overview.md` §2.6](./product-overview.md) 和
[`upgrade-plan.md` P1-3](./upgrade-plan.md)）。

现状下的正确用法：录之前确认屏幕上没有敏感内容；凭据走 Dashboard Secrets，
不要让它出现在界面上。

---

## 9. 能力边界

这些是探测确认的，不是猜测：

| 边界 | 依据 |
| --- | --- |
| **无声** | 无音频子系统，ffmpeg 命令也没采声卡 |
| **真实光标不在任何一层** | `-draw_mouse 0` + 成片光标来自事件日志 |
| **不录人的操作** | logger 只挂在 computer-use 上 |
| **不能调风格** | 工具只有 mode + filename，配置全是常量 |
| **一次一段** | 再 `START` 会丢掉当前这段 |
| **采集会扰动被测对象** | 1.2–1.6 核和被测应用抢 4 核 |
| **保存是同步、且慢的** | 32 秒成片要再渲染 115 秒 |
| **无 GPU** | 软解软编，渲染速率 16.7 fps 是 CPU 上限的真实反映 |

和截图链路的一个对照：截图**没有**传 `-draw_mouse`，x11grab 默认会把光标画进
那张 WebP（实测 `draw_mouse=1` 与 `=0` 的 SSIM 0.99987，确有差异）。
所以模型在截图里看得见指针，成片里看见的却是另一只画出来的。

---

## 10. 已知问题

录制本身能工作，设计也站得住。要改的是成本和语义缺口，不是换架构。

1. **采集过重**（P2-1）。60 fps 全 I 帧 crf 17 占 1.18–1.63 核、
   385–555 MiB/min。改成 30 fps / crf 20、保留全 I 帧，CPU 和磁盘都约减半。
   成片受 `PROXY_TARGET_FPS` 限制且会重编码，30 fps 对演示 GUI 足够。
   若个别演示必须 60 fps，做成按请求可选，不要全局降级。
2. **成片不能当调试证据**（§7）。需要在文档和工具返回值里区分
   "给人看的成片"和"给排查用的代理片"。现在 `SAVE_RECORDING` 只交出成片路径。
3. **敏感画面会进上传产物**（P1-3）。策略标记的敏感状态下应暂停采集和上传。
4. **按键条显示的是意图不是结果**。和中文丢字叠在一起，演示可能在展示
   一段实际没打进去的文字。
5. **渲染墙钟接近源时长**。长会话的 `SAVE_RECORDING` 会卡住一两分钟以上，
   期间 agent 什么都做不了。这是 Remotion 软渲染的现状，不是采集参数能救的。

明确不改的：

- 全 I 帧。后处理的随机取帧依赖它，换成普通 GOP 等于重做渲染器。
- 采集和后处理拆开。这是整条链路里最值得留的结构。

---

## 11. 怎么用、怎么查

对 agent：在要拍的操作**之前** `START_RECORDING`，做完立刻 `SAVE_RECORDING`
并给一个描述内容的文件名（技能里要求文件名描述整段视频，不要只描述其中一步）。
失败或中途放弃用 `DISCARD_RECORDING`，不要留一段没剪的 staging 占磁盘。

对排查：

```bash
# 最近一次会话
ls -lt /opt/cursor/recording-staging/session-*/recording/

# 事件和时间偏移
python3 -c "import json; d=json.load(open('recording-data.json')); \
print(d['durationMs'], d['eventToVideoOffsetMs'], len(d['inputEvents']))"

# 成片相对源压缩了多少
python3 -c "import json; p=json.load(open('render-plan.json')); \
print(p['video']['sourceDurationMs'], '->', p['video']['outputDurationMs'])"

# 代理片（未变速、无叠加、无光标）
ffplay recording_render_proxy_1080p.mp4
```

复现采集成本：

```bash
DISPLAY=:1 python3 tools/cloud-desktop-audit/audit.py capture
```

---

## 12. 规格速查

| 项 | 值 |
| --- | --- |
| 工具 | `record_screen`：`START` / `SAVE` / `DISCARD` |
| 采集 | ffmpeg 6.1.1，`x11grab`，1920×1200 @ 60，H.264 全 I 帧 crf 17 veryfast |
| 代理片 profile | `render-proxy-h264-all-i-v1` |
| 事件包 | `recording-data.json` version 3 |
| 后处理 | `polished-renderer.node`（Remotion），默认 `MELLOW` 光标 |
| 成片 | 1920×1200 @ 60 fps H.264，无声，末尾 2 s 品牌卡片 |
| 默认运镜 | 重要性 ≥ 60，最短间隔 1.5 s，每分钟最多 8 次，目标密度 0.3 |
| 默认变速 | 加载 4× / 思考 3× / 看结果不加速；输出空隙 1.2–2.0 s，倍率上限 8 |
| staging | `/opt/cursor/recording-staging/`（不上传） |
| 交付 | `/opt/cursor/artifacts/`（上传） |
| 实测交付物 | 139 s 源 → 32 s 正片 + 2 s 片尾 = 34 s，4.08 MB |
| 实测渲染 | 1922 帧、115 s 墙钟、16.7 fps |
