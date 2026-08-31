# Cursor Cloud Computer 产品文档

一份关于 Cursor Cloud Agent **云端桌面**与 **computer-use** 能力的完整说明：它能做什么、
怎么搭起来的、每个设计选择背后的理由，以及这个环境里为服务 computer-use 预装了哪些软件、
为什么装它们。

内容来自对一台真实 Cloud Agent VM 的探测——读了镜像里的安装脚本与配置模板、拆了
exec-daemon 打包代码、并用 [`tools/cloud-desktop-audit`](../../tools/cloud-desktop-audit/)
现场做了测量。凡是**观察到的事实**都注明了出处；凡是**对设计意图的推断**都会明说是推断。

配套文档：

- [`recording.md`](./recording.md) — 录制能力专文（采集、事件日志、后处理、重建语义）
- [`current-state.md`](./current-state.md) — 八组实测数据与缺陷分析
- [`upgrade-plan.md`](./upgrade-plan.md) — 由数据推出的改造方案

---

## 1. 定位

Cloud Computer 给 agent 的不是一个"无头浏览器"，而是**一台完整的 Linux 图形工作站**：
有窗口管理器、有面板和 Dock、有文件管理器、有终端、有浏览器、有文本编辑器，
agent 通过"看截图 + 发鼠标键盘事件"来操作它，跟人用远程桌面是同一种交互方式。

这个定位决定了它能覆盖的场景比无头浏览器宽得多：

- 测试**桌面应用**（Electron / GTK / Qt），而不只是网页
- 走**原生文件对话框**、系统托盘、右键菜单、拖拽这类只存在于真实桌面的交互
- 同时开多个应用、在它们之间复制粘贴、切换窗口
- 把过程**录成可以直接给人看的演示视频**
- 人可以通过浏览器连进同一个会话，实时观察甚至接管

代价是它比无头浏览器重：一整个 X 会话 + 桌面环境，纯软件渲染，所有同步靠等待。

---

## 2. 能力清单

### 2.1 桌面会话

| 能力 | 规格 | 来源 |
| --- | --- | --- |
| 图形会话 | X11，`DISPLAY=:1`，单显示器 | `Xtigervnc` 启动参数 |
| 分辨率 | 1920x1200，24 位色，60 Hz，96 DPI | 同上 |
| 窗口管理 | xfwm4 4.18.0，开启合成（阴影、透明） | `xfwm4.xml` |
| 桌面环境 | XFCE 4.18（面板 28px + Plank Dock 48px 图标） | `anyos.conf` |
| 外观 | WhiteSur-Light GTK / 图标 / 光标主题，macOS 风格壁纸 | `install_and_configure_themes.sh` |
| 工作区 | 4 个（xfwm4 默认值，面板上没有切换器） | `_NET_NUMBER_OF_DESKTOPS` |
| 语言环境 | `en_US.UTF-8`（系统只生成了这一个 locale） | `install-locales.sh`、`locale -a` |

窗口按钮布局是 `CHM|O`（关闭/最小化/最大化在左侧），标题居中——这是 macOS 布局，
不是 Linux 默认布局。

有一个容易踩的细节：**顶部面板通过 `_NET_WM_STRUT_PARTIAL` 保留了 29px 的工作区，
但 Plank Dock 没有保留任何空间**（strut 全为 0）。所以最大化的窗口不会被面板压住，
但**会延伸到 Dock 底下**——底部约 140px 的区域里，窗口内容和 Dock 图标是重叠的。
需要点击窗口底部控件时要留意这一点。

### 2.2 输入能力

computer-use 暴露 **11 种动作**：

| 动作 | 参数 | 实现 |
| --- | --- | --- |
| `mouse_move` | 坐标 | `xdotool mousemove --sync X Y` |
| `click` | 坐标、按钮、次数、修饰键 | `keydown <mod> mousemove --sync X Y click [--repeat N --delay 50] B keyup <mod>` |
| `mouse_down` / `mouse_up` | 按钮 | `xdotool mousedown/mouseup B` |
| `drag` | 路径（≥2 点）、按钮、修饰键 | 按下 → 逐点移动 → 抬起，**串成一次调用** |
| `scroll` | 坐标、方向、量、修饰键 | 映射到按钮 4/5/6/7，`click --repeat N` |
| `type` | 文本 | 见 §4.7 |
| `key` | 组合键、按住时长 | `xdotool key -- <combo>`，或 keydown/sleep/keyup |
| `wait` | 时长 | 纯 sleep |
| `screenshot` | — | 见 §2.3 |
| `cursor_position` | — | `getmouselocation --shell`，结果换算回 API 坐标 |

细节：

- **鼠标按钮**：左 1、中 2、右 3、后退 8、前进 9。
- **修饰键**：`ctrl` / `shift` / `alt` / `meta`，`meta` 会翻译成 X 的 `super`。
  组合键（`ctrl+shift`）会拆成多次 `keydown`，动作结束后按**相反顺序**释放。
- **一个动作 = 一次进程调用**。所有子命令串在同一条 `xdotool` 命令行里，
  所以移动和点击之间不会被别的动作插进来。
- **拖拽路径可以任意多点**，整条路径在一次调用里发完，这对"必须走出轨迹才生效"的
  手势（画布拖动、滑块、拖放排序）是必要的。

### 2.3 视觉能力

| 项 | 规格 |
| --- | --- |
| 模型看到的尺寸 | **1280x800**（常量 `API_WIDTH = 1280`，高度按帧缓冲宽高比算） |
| 格式 | WebP **无损**，`-preset text` |
| 典型体积 | 36 KiB（base64 后 48 KiB） |
| 典型延迟 | 142 ms |
| 坐标系 | 模型用 1280x800 坐标，`CoordinateScaler` 双向换算到 1920x1200 |
| 落盘 | 每张另存一份到 `/tmp/computer-use/<5位十六进制>.webp` |

**坐标是双向映射的**：模型给的坐标乘 1.5 变成真实像素，`cursor_position` 返回时除 1.5
变回模型坐标。`CoordinateScaler` 会校验两个宽高比偏差不超过 2%，超了直接报错——
这意味着帧缓冲分辨率和模型可见分辨率是一对必须同步修改的参数。

### 2.4 录制能力

完整说明（采集命令、事件包字段、两层后处理配置、一次真实会话的账、重建 vs 忠实录像）
见 [`recording.md`](./recording.md)。下面是摘要。

`record_screen` 有三个模式：`START_RECORDING`、`SAVE_RECORDING`、`DISCARD_RECORDING`。
它产出的不是原始录屏，而是**精修后的演示视频**：

| 特性 | 说明 |
| --- | --- |
| 采集 | `x11grab` 60 fps，H.264 **全 I 帧** crf 17，落 `/opt/cursor/recording-staging/` |
| 合成光标 | 真实光标不采集（`-draw_mouse 0`），成片里的光标由输入事件日志重建，走弹簧曲线 |
| 点击反馈 | 点击处画波纹；区分单击/双击/三击/右键/中键 |
| 按键提示 | 组合键与输入内容以提示条形式叠在画面上 |
| 自动缩放 | 按"重要性"给动作打分自动推近镜头，节流到每分钟最多 8 次、最短间隔 1.5 秒 |
| 空闲加速 | 空闲段分类为加载等待 / 思考停顿 / 查看结果，只加速前两类 |
| 片尾 | 正片之后拼接 2 秒带 Cursor 标志的黑底卡片；没有单独的片头，开头是第一个动作往前 800 ms |
| 交付 | 重编码后放 `/opt/cursor/artifacts/`，文件名可指定 |

实测一次 139 秒采集压成 32 秒正片 + 2 秒片尾，成片 1920x1200 @ 60 fps、**4.08 MB**。

之所以采集阶段用全 I 帧（`keyint=1:min-keyint=1:scenecut=0:bframes=0`），是因为后处理要
按任意时间点取帧做缩放和变速；帧间预测会让随机取帧变得很贵。这条代理片的
profile 版本号就叫 `render-proxy-h264-all-i-v1`。

默认参数写在 `DEFAULT_PREPROCESSING_CONFIG` 里，**`record_screen` 工具没有暴露任何调节
入口**——只有模式和文件名两个参数，剪辑风格是固定的：

| 参数 | 默认值 | 含义 |
| --- | --- | --- |
| `zoomImportanceThreshold` | 60 | 动作重要性打分低于这个值不推镜头 |
| `minZoomIntervalMs` | 1500 | 两次推镜头之间的最短间隔 |
| `maxZoomsPerMinute` | 8 | 每分钟推镜头次数上限 |
| `targetZoomDensity` | 0.3 | 目标上有多少比例的时间处于推近状态 |
| `minSpeedupDurationMs` | 1000 | 短于 1 秒的空闲不加速 |
| `cursorStyle` | `MELLOW` | 光标弹簧参数（tension 170 / friction 26 / mass 1） |
| `speedUpLoadingWaits` / `speedUpThinkingPauses` | true | 加速加载等待与思考停顿 |
| `preserveViewingResults` | true | **不**加速"在看结果"的那段 |

**要注意这是重建，不是忠实录像。** 光标位置、点击时刻、按键内容全部来自输入事件日志，
所以：不经过 computer-use 的指针移动（应用自己挪的、人在 noVNC 上操作的）在成片里
没有光标；镜头推拉和变速会改变你对"这一步花了多久"的直观判断。
**排查"应用为什么会那样"的时候，成片可能会误导你**——那种场景要看
`/opt/cursor/recording-staging/` 里未经处理的代理片。

### 2.5 人机共享：能介入，但没有协调

同一个 X 会话有两条出口：agent 走 `xdotool`（XTEST 扩展）+ `x11grab`，人走 noVNC
（RFB 协议）。两者**并行生效**——人可以在 agent 操作的同时看画面，也可以直接动鼠标接管。
这是"图形会话"相比无头浏览器最实际的好处：出问题时人能看到现场。

但**两条路径之间没有任何仲裁**。这不是推测，用
[`tools/cloud-desktop-audit/input-coordination-probe.py`](../../tools/cloud-desktop-audit/input-coordination-probe.py)
实测过：该脚本用 `xdotool` 扮演 agent、用一个最小 RFB 客户端扮演人（`shared=1`，
不会把正在看的人踢掉），因为只有真的走两条不同路径才测得准。

**一个会话只有一个指针，后写的直接覆盖。**

```
agent 移到 (300,300)      -> (300, 300)
人   移到 (1400,800)      -> (1400, 800)
交替写入：
  第1轮  agent 写完 (400, 300)   人写完 (1200, 800)
  第2轮  agent 写完 (460, 300)   人写完 (1140, 800)
  第3轮  agent 写完 (520, 300)   人写完 (1080, 800)
两边都没有被阻塞、没有排队、没有报错
```

**人的移动会静默改变 agent 拖拽的落点。** 拖拽是"按下 → 多次移动 → 抬起"，
中途人一挪，按键就在别的地方松开了：

```
agent 在 (600,500) 按下左键 -> 人移到 (1700,200) -> agent 在 (1700,200) 抬起
```

**agent 分不清指针是谁移的。** `cursor_position` 读回的就是人移动后的坐标，
事件不带来源标记。而且截图链路**没有传 `-draw_mouse`**，x11grab 默认会把光标画进去
（实测 `draw_mouse=1` 与 `=0` 两帧 SSIM 0.99987，即确有差异），所以 agent 在截图里
看得见指针，但同样无法判断那是不是自己刚移的。

**键盘只有一个焦点，人点一下别的窗口就会把打字截走。** 实测让 agent 用 60 ms 间隔打
62 个字符，人在三分之一处点了另一个窗口的标题栏：

```
预期收到 62 个字符，目标窗口实际只收到 18 个
  期望: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz'
  收到: 'ijklmnopqrstuvwxyz'
剩下 44 个字符投递到了另一个应用，没有报错、没有告警
```

这一次那 44 个字符落在无害的地方（那个应用的数据文件没变、进程也活着），
但这纯属运气——取决于当时焦点落在哪个控件上。**没有任何机制阻止或提示这件事。**

#### 但有一个现成的闸门没人用

TigerVNC 本身支持按输入类别关掉 RFB 通道，而且**可以在运行时改**。实测：

```
vncconfig -set AcceptPointerEvents=0
  -> 人的输入被挡住: 是      agent 的输入仍然可用: 是
vncconfig -set AcceptPointerEvents=1
  -> 人的输入恢复: 是
```

相关参数有 `AcceptPointerEvents`、`AcceptKeyEvents`、`AcceptCutText`、`SendCutText`，
当前**全部是默认值 1（全部接受）**，Xtigervnc 的启动参数里一个都没设，
镜像里也没有任何东西去动它们。也就是说"协调人和 agent 的输入"所需的原语已经装在机器上，
只是没接线——用法见 [`upgrade-plan.md` P1-3](./upgrade-plan.md)。

### 2.6 敏感场景与人工介入

**结论先说：这条链路上没有任何自动检测或自动移交机制。** 遇到支付页、验证码、
需要输入密钥的界面，agent 不会被拦下，也不会自动通知用户来接管——它会继续按自己的
判断操作下去。

这是在 exec-daemon 打包代码（14.1 MB）里搜出来的：

| 关键词 | 命中数 |
| --- | --- |
| `captcha` / `recaptcha` | **0** |
| `payment` / `credit card` / `creditCard` | **0** |
| `requestUserAction` / `askUser` / `requestHumanInput` / `notifyUser` | **0** |
| `human-in-the-loop` / `humanInTheLoop` | **0** |

有几个词看起来相关，逐个查过都不是：`takeover` 全部来自 WebSocket 的 zlib
context takeover；`handoff` 是文件锁交接；`needsUserAuth` 是 MCP 的 OAuth 状态机；
`needsApproval` 属于 IDE 交互式的命令/编辑审批流，云端自主运行时没有人在旁边点同意。

**注意范围**：以上只覆盖这台 VM 上能看到的东西。模型侧或 Cursor 服务端可能另有策略，
那部分从 VM 内部无法观测。

#### 实际存在的三件事

**1. Secret 遮蔽——只管文本，不管像素。** 平台注入的 secret（Dashboard 里配的那些，
以环境变量形式进来）有一个 `SecretRedactor`：它拿到 secret 的**名字清单**
（`CLOUD_AGENT_INJECTED_SECRET_NAMES`），解析出对应的值，然后在工具输出里做字面量替换成
`[REDACTED]`，流式输出还会处理跨 chunk 截断的边界情况。同时覆盖 git 的合成 auth token。

它的边界很清楚：**这是对已知字符串做匹配**。所以
- 命令输出里出现 secret 值 → 会被遮蔽
- **截图里出现 secret** → 不会。截图是压缩后的 WebP 字节，字面量匹配不到
- 网页上读到的、用户在界面里手动输入的、验证码短信里的 → 都不在名单里，无从遮蔽

**2. Agent 自己决定停下来。** 这是目前唯一的"求助"方式，但它**不是一个原语**——
agent 只能结束回合、在回复里说明情况。而在 UI 上这与"我做完了"没有区别，
没有 `needs_human` 这种状态。而且云端 agent 的行为准则本身是"尽量自主、避免追问"，
所以停不停下完全取决于模型当时的判断。

**3. noVNC 是接管的手段，但没有触发信号。** 人可以随时连进同一个 X 会话看画面、动鼠标
（§2.5），但这要靠人**主动去看**。系统不会因为屏幕上出现了支付表单而提醒任何人。

#### 通知用户的渠道到底有哪些

| 渠道 | agent 能主动触发吗 | 说明 |
| --- | --- | --- |
| 回合结束的回复 | **能** | 主要渠道。但语义上等同于"任务结束" |
| Dashboard 事件流 | **不能** | 由平台发出。实测到的 kind 只有 `pr_created`、`artifact_created`，另有 `mcp_auth_error` |
| PR 评论 | 能，但受限 | 只在用户明确要求时才应该发 |
| `request-environment-setup-actions` | 能，但不适用 | 明确只服务于环境搭建流程，不是通用的"请你来接管" |
| 用户追问队列 | 不能 | 单向的：用户 → agent |
| noVNC | 不能 | 是观察/接管的入口，不是通知 |

#### 由此产生的具体风险

**截图会留存，而且产物会上传。** 每次 computer-use 调用都会把截图另存一份到
`/tmp/computer-use/`——本次会话里实测积累了 **55 个 `.webp` 文件**。录屏的代理片落在
`/opt/cursor/recording-staging/`，成片落在 `/opt/cursor/artifacts/`，
而**这个目录里的文件会自动上传到用户的 Dashboard**。

所以：屏幕上出现过的任何东西——被"显示密码"按钮揭开的密码框、短信验证码、
页面里的 API key——都会进入留存的截图，并且如果当时在录屏，就会进入被上传的产物。

**再加上桌面本身没有鉴权。** websockify 监听 `0.0.0.0:26058` 且 VNC 侧
`-SecurityTypes None`（§6），谁能连上那个端口就能看到屏幕、操作鼠标。

#### 现状下的正确用法

- **凭据走 Dashboard Secrets（环境变量），不要让它出现在界面上。** 这样 redactor 才管得着，
  而且不会进截图。
- **需要真人做的事（支付、验证码、2FA），在任务描述里就划出边界**，让 agent 停在前面一步，
  而不是指望它自己识别。
- **录屏前确认屏幕上没有敏感内容**，因为成片会被上传。
- 需要人接管时，用 noVNC 连进去——但要靠人自己判断时机。

这个缺口应该被补上，方案见 [`upgrade-plan.md` P1-3](./upgrade-plan.md)。

### 2.7 能力边界

这些是探测确认的限制，不是猜测：

| 边界 | 实测依据 |
| --- | --- |
| **没有音频** | 无 `pulseaudio` / `pipewire` / `aplay`，无 `/dev/snd`。录屏是无声的 |
| **没有 GPU** | 纯软件渲染。WebGL 可用但走 SwiftShader（见 §5.7） |
| **单显示器，分辨率只能在预置档位里选** | Xtigervnc 只提供 13 个模式，最大就是 1920x1200；`xrandr --output VNC-0 --mode 2560x1600` 报 `cannot find mode`。`xrandr --fb 2560x1600` 能改屏幕尺寸，但输出的 CRTC 仍是 1920x1200，多出来的区域不可见。要更大分辨率必须改 X server 启动参数并重启会话 |
| **没有输入法** | 只生成了 `en_US.UTF-8`，没有 fcitx/ibus。中日韩文字只能靠 §4.7 的 keysym 注入，不能靠拼音输入 |
| **中日韩字体质量受限** | 未装 Noto CJK，中日韩只有 2 个可选字族（韩文 1 个），且都不含在 UI 字体里 |
| **单会话** | 一个 `:1`，没有多用户/多会话隔离 |
| **非 ASCII 打字默认会丢字** | 见 [`current-state.md` §4.5](./current-state.md) |

---

## 3. 架构

### 3.1 分层

```
┌───────────────────────────────────────────────────────────────────────┐
│                              Agent                                    │
└───────────────┬───────────────────────────────────┬───────────────────┘
                │ computer_use                      │ record_screen
┌───────────────▼───────────────────────────────────▼───────────────────┐
│                            exec-daemon                                │
│  X11ComputerUseExecutor          LocalRecordScreenExecutor            │
│  ├─ CoordinateScaler 1280x800 ⇄ 1920x1200                             │
│  ├─ 动作 → xdotool 命令行                        ├─ ffmpeg x11grab    │
│  ├─ ffmpeg 单帧 → 无损 WebP                      ├─ InputEventLogger  │
│  └─ 固定 2000 ms 沉降等待                        └─ polished-renderer │
└───────────────┬───────────────────────────────────┬───────────────────┘
                │ XTEST + x11grab                   │ x11grab
┌───────────────▼───────────────────────────────────▼───────────────────┐
│              Xtigervnc :1   1920x1200x24 @ 96 DPI                     │
│              127.0.0.1:5901，SecurityTypes None                       │
│              24 个扩展：XTEST DAMAGE XFIXES MIT-SHM RECORD …           │
└───────┬───────────────────────────────────────────────────┬───────────┘
        │                                                   │ RFB
┌───────▼─────────────────────────────┐   ┌─────────────────▼───────────┐
│  XFCE 4.18 会话                      │   │ websockify 0.10.0           │
│  xfwm4 · xfce4-panel · Plank         │   │ + noVNC 1.2.0               │
│  Chrome · Thunar · Terminal ·        │   │ 0.0.0.0:26058               │
│  Mousepad · 被测应用                  │   └─────────────────┬───────────┘
└──────────────────────────────────────┘                     │
                                                       人（浏览器）
```

### 3.2 三条互不知情的通道

帧缓冲、输入注入、编码共用同一个 X server，但走三条彼此不知道对方存在的路径：

- **看**：`ffmpeg -f x11grab` 从帧缓冲抓像素
- **动**：`xdotool` 通过 XTEST 扩展注入事件
- **人**：noVNC 通过 RFB 协议拿增量更新

这个设计很简单，代价是**没有任何一处知道"界面现在稳定了没有"**。X server 只是像素的
容器，它不知道 GTK 的动画播完了没有、Chrome 的布局重排完了没有。所以整条链路唯一的
同步手段是**等**——这就是那个固定 2000 ms 沉降延迟的由来（§4.5）。

这也解释了为什么 `DAMAGE` 扩展在这里格外重要：它是唯一能把"画面变了"这件事从 X server
主动推给客户端的机制，[改造方案](./upgrade-plan.md) 里的自适应沉降就是要用上它。

### 3.3 启动序列

`desktop-init.sh` 是入口，顺序是有讲究的：

```
1. 重定向 core dump 到 /tmp
2. 起 D-Bus 系统总线（XFCE 和 dconf 都依赖它）
   └─ 等 dbus-daemon 出现，超时 30 秒
3. 重建 /tmp/.X11-unix，权限 1777，属主 root:<agent 组>
4. 生成 /tmp/anyos-xstartup（把 anyos.conf 的值展开成 export 语句）
5. 并行：
   ├─ 后台用 dconf 配 Plank（Dock 项、主题、图标尺寸）
   └─ 起 tigervncserver :1（自己 daemonize，内部拉起 startxfce4）
6. 等 X server 接受连接（xdpyinfo 轮询，超时 60 秒）
7. 起 noVNC（launch.sh → websockify）
8. 起 Plank 守护循环：等 X → 等窗口管理器 → 起 plank → 退出则 2 秒后重启
9. 随机挑一张壁纸，通过 xfconf-query 写三个可能的 monitor 路径
10. tail -f /dev/null 保持容器存活
```

两个值得注意的地方：

- **等窗口管理器用的是 EWMH 而不是"X 能连上"**。脚本里注释写明了原因：`xdpyinfo` 成功
  只说明 X server 接受连接，不说明窗口管理器初始化完了。所以它轮询根窗口的
  `_NET_SUPPORTING_WM_CHECK` 属性。这是个正确的判据。
- **Plank 有重启循环**。说明 Plank 在这个环境里会退出（崩溃或 X 重启），而 Dock 消失会
  直接影响截图里的界面完整性，所以宁可无条件重启。
- **壁纸路径写三份**（`monitorscreen` / `monitor0` / `monitorVNC-0`），因为 XFCE 的
  backdrop 属性路径取决于显示器名字，而这个名字在 VNC 下不确定。

### 3.4 配置生成链路

桌面外观不是手写 dotfiles，而是一条模板管线：

```
/usr/local/share/anyos.conf          ← 唯一的真源（ANYOS_* 变量）
        │
        │  anyos-setup <目标目录>     ← 把 ANYOS_XXX 占位符替换成实际值
        ▼
/tmp/xfce-config-processed/          ← 处理后的配置树
   .Xresources
   .config/xfce4/xfconf/xfce-perchannel-xml/{xsettings,xfwm4,xfce4-panel,xfce4-desktop}.xml
   .config/xfce4/terminal/terminalrc
   .config/gtk-3.0/{settings.ini,gtk.css}
   .config/plank/dock1/{settings,launchers/*.dockitem}
        │
        │  configure-os-display       ← 拷到 /root 和 agent 用户的 home，修属主
        ▼
   ~/.config/...
```

`anyos.conf` 里定义的是分辨率、DPI、GTK/Qt 缩放因子、面板高度、Dock 图标尺寸、
光标尺寸（逻辑与物理两套）、三种字体的名字与字号。

**为什么要这么绕。** 分辨率、DPI、缩放这三件事会同时影响 X server 启动参数、GTK 设置、
Qt 环境变量、Electron 命令行、面板/Dock 的像素尺寸、字体 DPI ——散落在七八个文件里。
集中成一份变量表，改一次全套一致；否则改分辨率必然漏掉某个地方。镜像里那份被标记
`UNUSED` 的 `anyos.hidpi.conf` 正好证明了这个抽象在起作用：整套 4K@2x 配置就是同一张
变量表的另一组取值。

同一套配置还支持 `light` / `dark` 两种外观：`configure_os_display.sh` 接一个
`ANYOS_DESKTOP_APPEARANCE` 参数，dark 模式下用 `xfce4-panel.dark.xml` 和
`gtk.dark.css` 覆盖对应文件（差异只在面板文字颜色和菜单按钮图标）。

### 3.5 安装机制：内容寻址 + 幂等

所有安装脚本都是同一个形状：

```bash
SCRIPT_VERSION="$1"; VERSION_PATH="$2"
if [ -f "$VERSION_PATH" ] && [ "$(cat $VERSION_PATH)" = "$SCRIPT_VERSION" ]; then
    echo "already installed, skipping"; exit 0
fi
... 真正干活 ...
printf '%s\n' "$SCRIPT_VERSION" > "$VERSION_PATH"
```

而传进来的 `SCRIPT_VERSION` 就是**脚本自身内容的 SHA-256**
（`/usr/local/bin/*.version` 里存的正是这些哈希）。Aptfile 也一样，它的"版本"是
文件内容的 SHA-256。

效果是：**脚本内容没变就绝不重跑**，内容变了自动重跑。这对"从快照冷启动"的场景很关键——
镜像里已经装好的东西不会在每次启动时重新折腾一遍。

大块二进制资产（noVNC、websockify、WhiteSur 三套主题、Cascadia Code 字体）不是启动时下载，
而是**预先打包进镜像**放在 `/usr/local/share/cloud-agent-media/`，每个都配一个 `.hash`
旁文件：

```
CascadiaCode-2008.25.zip            + .hash
noVNC-1.2.0.zip                     + .hash
websockify-0.10.0.zip               + .hash
WhiteSur-Light.tar.xz               + .hash
WhiteSur-icon-theme-master.tar.gz   + .hash
WhiteSur-cursors-master.tar.gz      + .hash
```

**为什么区别对待。** Ubuntu 仓库里有的（TigerVNC、XFCE、xdotool、ffmpeg、字体包）走 apt，
在**镜像构建期**联网装；仓库里没有的、或者需要锁死版本的（noVNC、websockify、
GitHub 上的主题、微软的 Cascadia）打包进镜像并做内容校验。这样构建结果可复现，
也不受第三方站点可用性影响，而且**运行期不需要出网**就能完成安装步骤。

顺带一个小细节：所有 apt 安装都带 `--no-install-recommends`，说明镜像体积是被刻意控制的。

---

## 4. 实现思路：为什么这么设计

这一节区分两类内容：**配置和代码注释里直接写明的理由**（标注出处），
以及**我根据证据做的推断**（明确标为推断）。

### 4.1 为什么是 VNC + XFCE

推断，但证据充分。

不用 Wayland：XTEST 注入、`x11grab` 抓屏、`xdotool` 这一整套成熟工具链都建立在 X11 上；
Wayland 下每个合成器的截屏和注入接口都不一样，没有通用方案。

不用无头浏览器：那样就只能测网页。§1 列的那些场景（Electron 应用、原生文件对话框、
多窗口切换）都需要真桌面。

选 XFCE 而不是 GNOME/KDE：XFCE 启动快、内存占用小、不依赖 GPU 合成、而且**配置完全是
文件驱动的**（xfconf 的 XML 可以直接写进 home，见 §3.4）。GNOME 的配置多在 dconf 里，
且强依赖 systemd 用户会话，在容器里更麻烦。

选 TigerVNC 而不是 Xvfb + x11vnc：`Xtigervnc` 一个进程同时是 X server 和 VNC server
（扩展列表里能看到 `VNC-EXTENSION`），省掉一层帧缓冲拷贝。镜像里其实**也装了 Xvfb**，
但没有启用。

### 4.2 为什么是 1920x1200 / 96 DPI / API 1280

`anyos.conf` 的注释写明了取值本身（"1920x1200（16:10）"、"标准 96 DPI，不缩放"），
但没写为什么选这一组。以下是推断：

- **16:10 而不是 16:9**：同样宽度多 11% 的垂直空间，对文档、列表、IDE 这类纵向内容更友好。
- **1920x1200 而不是 4K**：`anyos.hidpi.conf` 的存在说明 4K@2x 用过又退回来了。
  3840x2400 是 1920x1200 的 4 倍像素，在无 GPU 的机器上抓屏和编码都要贵 4 倍。
- **API 宽度 1280**：代码注释写的是 "Standard API width - what models see in screenshots"。
  1280x800 是视觉模型常见的输入尺寸档位，token 成本可控。
- **1920 → 1280 恰好 1.5 倍**：这是"帧缓冲要够大"和"给模型的图要够小"两个目标折中的结果。
  实测这个折中点选得不好——1.5 倍是非整数缩放比，SSIM 0.876，几乎没比 2.0 倍（0.859）
  更好，而 1.25 倍是 0.931。详见 [`current-state.md` §4.4](./current-state.md)。

### 4.3 为什么输入用 xdotool 子进程

推断。

好处很实际：`xdotool` 把 XTEST、XKB keysym 查表、修饰键状态管理、Unicode keycode 借还
这些琐碎逻辑都封装好了，daemon 只需要拼命令行字符串。同一个动作串成一条命令行，
天然保证了子命令的顺序，也避免了在 Node 里维护一个长连接 X 客户端的状态。

代价也测出来了：每次调用 1.5 ms 的进程启动开销，以及**继承了 xdotool 的语义缺陷**——
`mousemove --sync` 在指针已到目标位置时会阻塞 15.2 秒
（[`current-state.md` §4.1](./current-state.md)）。这是"复用成熟 CLI"这个选择的必然风险：
你也继承了它的行为细节。

### 4.4 为什么截图是无损 WebP，还要打补丁

两处代码注释直接给了答案：

- `-preset text` 后面注释是 "Optimized for UI screenshots with sharp edges and text"。
- 补 WebP 头部的地方注释是："ffmpeg 写管道时无法回退，RIFF 和 VP8 的长度字段被留成 0，
  导致浏览器/预览器拒绝这个文件，尽管图像数据是有效的"——所以在内存里把偏移 4 和 16
  两处长度字段补上。

选无损是对的，而且实测反直觉：**有损 WebP q=92 反而更大**（96 KiB vs 无损 36 KiB）。
界面是大片纯色加锐利边缘，无损压得极好，有损引入的噪声反而让熵变高。
PNG 大 20 倍。这条在 [`upgrade-plan.md`](./upgrade-plan.md) 里被列进"明确不做"。

### 4.5 为什么是固定 2000 ms 沉降等待

"沉降"是代码里 settle 的直译：`COMPUTER_USE_SCREENSHOT_SETTLE_DELAY_MS = 2000`
和判定函数 `actionRequiresSettle`。它要解决的是"**动作发出去了，但界面还没画完**"——
点一下按钮，应用要处理事件、重排布局、可能还有过渡动画；这时候立刻截图，
拿到的是一张半更新的画面。

为什么只能靠等，§3.2 已经说了：X server 只是像素的容器，它不知道 GTK 的动画播完了没有、
Chrome 的布局重排完了没有。整条链路里没有任何一处掌握"界面稳定了"这个状态。

**哪些动作算"需要沉降"**（`actionRequiresSettle` 的完整规则）：

| 动作 | 是否需要沉降 |
| --- | --- |
| `mouse_move` `click` `mouse_down` `mouse_up` `drag` `scroll` `key` | **是**，无条件 |
| `type` | **只在文本里含 `\r` 或 `\n` 时**才算 |
| `wait` `screenshot` `cursor_position` | 否 |

**它是一个标志位，不是每个动作后面各睡一次。** `execute()` 里维护一个 `settleNeeded`：
任何"需要沉降"的动作把它置为 true，而真正的 `sleep(2000)` 只发生在**紧接着要截图之前**
（显式的 `screenshot` 动作，或者一批动作结束时那次隐式截图）。截完之后标志位清零。

几个具体例子：

| 动作序列 | 付几次 2000 ms |
| --- | --- |
| `[click, click, click]` | 1 次（结束时的隐式截图前） |
| `[click, screenshot, click, screenshot]` | 2 次 |
| `[type("hello")]` | **0 次**（无换行，不触发） |
| `[type("hello\n")]` | 1 次 |
| `[click, wait(5000), screenshot]` | 1 次，**而且是在 5 秒之外另付的** |

最后一行是个值得注意的细节：`wait` 不算"需要沉降"，但它也**不会清掉**已经置上的标志位。
所以模型明明已经显式等了 5 秒，截图前还要再等 2 秒。

`type` 只在含换行时才沉降，推断的理由是：纯输入只是往输入框里填字，变化局部且快；
换行会被转成 `key Return`，而回车通常意味着提交表单、跳转页面、执行命令，
可能引起大范围重绘。不过实测**纯输入也需要约 239 ms 才稳定**，所以这个分类不是零风险的——
紧跟在 `type` 后面的截图有可能抓到一个还没填完的输入框。

取值 2000 ms 是保守估计，不是测量结果。实测画面 100~250 ms 就稳定，2 秒里约 93% 是空转
（[`current-state.md` §4.2](./current-state.md)）。

### 4.6 为什么录屏要拆成"代理片 + 事件日志 + 后处理"

字段、命令行、两层配置和一次真实会话的账见 [`recording.md`](./recording.md)。这里只写设计理由。

这是整个系统里最漂亮的设计，理由可以从产物反推：

录屏的**目标不是留档，而是给人看的演示**。人看演示需要的东西（镜头跟着操作推近、
点击有反馈、空闲被跳过、光标移动平滑）都不在原始帧里，而在**语义层**：
哪次点击重要、哪段空闲是在等加载、指针从哪儿到哪儿。

所以做法是：采集阶段只管把像素**无损语义地**存下来（全 I 帧，随机取帧便宜），
语义信息由 `InputEventLogger` 单独记录（每个动作的时间戳、前后位置、光标形状），
两者在后处理阶段（Remotion）合成。这样"怎么剪"完全是渲染期的决策，可以随时改进算法而
不用重录。

`-draw_mouse 0` 也是这个思路的必然结果：**既然光标要按弹簧曲线重画，采集到的真实光标
就是干扰项**。代价是任何不经过 computer-use 的指针移动（应用自己挪的、人在 noVNC 上
操作的）在成片里没有光标。

### 4.7 为什么打字有两条路

代码注释把问题说得很清楚：

> `xdotool type` 处理键盘映射上没有的字符时，会借一个空闲 keycode、按下、然后马上还回去，
> 每个字符一轮。应用按自己**惰性刷新**的键盘映射副本来解释按键事件，于是抢在服务器的
> `MappingNotify` 之前到达的按键会按旧映射解析然后消失，而 `xdotool` 依然返回 0。
> 这就是 `Aprenderás` 变成 `Aprenders` 的原因（SAND-1271）。

另一处注释解释了为什么这个竞态无法用"等一下"彻底解决：

> 应用按自己缓存的键盘映射副本解释按键，而 X 没有任何办法查询它是否已经跟上：
> `MappingNotify` 不带版本号，服务器也不保留历史。

所以第二条路（`bindUnmappedCharacters`）的做法是**把重映射挪到打字之外**：
先把这一段里所有不同的非 ASCII 字符一次性绑到空闲 keycode 上，等 300 ms，
整段打完再等 300 ms 才解绑——打字过程中键盘映射不变，竞态消失。
每个 keysym 要写两遍（`keycode N = U4F60 U4F60`），因为 X 会把只有一个字母 keysym 的
keycode 展开成 [小写, 大写]，`Á` 单独绑会变成 `á`。

分批也有讲究：每轮开始都**重新读一遍**空闲 keycode 列表，注释说明是为了避免把别的动作
已经占用的 keycode 再发一次。

代价实测：中文吞吐从 136 ch/s 掉到 17 ch/s，而且这台机器只有 19 个空闲 keycode。
**这条正确的路默认是关的**，见 [`upgrade-plan.md` P0-2](./upgrade-plan.md)。

### 4.8 为什么整个桌面要装成 macOS 的样子

这个意图从多处证据可以确认：WhiteSur 系列主题（GTK + 图标 + 光标）、
`macos-wallpaper.png`、窗口按钮布局 `CHM|O`（左侧）+ 标题居中、Plank Dock、
字体安装脚本里把字体装进 `/usr/share/fonts/truetype/**macos**/`。

推断的理由有两条，而且都指向"模型"而不是"人"：

1. **视觉模型见过的桌面截图，绝大多数是 macOS 和 Windows。** 一个长得像 macOS 的桌面，
   模型识别控件、判断按钮位置、理解窗口层次的先验更准。默认的 XFCE 外观在训练数据里
   罕见得多。
2. **字体替换表让网页和应用按设计意图渲染。** `/etc/fonts/local.conf` 把
   `-apple-system`、`BlinkMacSystemFont`、`system-ui`、`Segoe UI`、`Helvetica Neue`、
   `Menlo`、`Monaco`、`.SF NS`、`Arial`、`Times New Roman`、`Courier New`、`Roboto`
   等一大批 macOS / Windows / Web 常见字体名，全部映射到镜像里实际装了的等宽/等距替代品
   （Inter、Public Sans、Liberation、Arimo、Tinos、Cousine、JetBrains Mono、Noto Sans）。
   没有这张表，任何用 `font-family: -apple-system, system-ui, ...` 的网页都会掉到
   系统默认字体，排版和实际产品不一样，模型看到的就不是用户会看到的东西。

值得注意的是**这张替换表完全是拉丁文字视角的**：没有任何一条针对中日韩字体名
（`PingFang SC`、`Microsoft YaHei`、`Hiragino Sans`、`Noto Sans CJK`）的映射。
这和"未装 Noto CJK"是同一个盲区的两面。

#### 但它只是皮肤，不是 macOS

这一点必须说清楚，因为它是个实际的坑：**系统本身完完全全是 Ubuntu 24.04 + XFCE，
macOS 只存在于外观层。**

| 是 macOS 的（纯视觉） | 不是 macOS 的（真实行为） |
| --- | --- |
| WhiteSur-Light 的 GTK / 图标 / 光标主题 | 内核是 Linux 6.12；无 `/System`、`/Library`、`/Applications` |
| `macos-wallpaper.png` 壁纸 | 无 `sw_vers`、`osascript`、`defaults`、`pbcopy` |
| 窗口按钮在左侧（`CHM\|O`）、标题居中 | 应用都是 ELF 二进制，不是 `.app` bundle |
| Plank Dock | 文件管理器是 Thunar，不是 Finder；无 Spotlight、无 Mission Control |
| 字体装在 `/usr/share/fonts/truetype/macos/` | 无全局菜单栏（`appmenu` 相关包 0 个），面板上只有应用菜单和时钟 |
| 字体名替换表（`.SF NS`、`-apple-system` 等） | **快捷键是 Linux 习惯：Ctrl 而不是 Cmd** |

最后一条最容易踩。实测在 Chrome 的输入框里：

```
Ctrl+A / Ctrl+C  →  剪贴板 = [copy-modifier-probe]   ✓ 生效
Super+A / Super+C →  剪贴板 = [CLIPBOARD-WAS-CLEARED]  ✗ 无任何效果
```

`Super`（物理上 Cmd 键的位置）在这个桌面上被 XFCE 绑成了 Linux 风格的窗口/启动器快捷键——
`Super+E` 开 Thunar、`Super+R` 开 appfinder、`Super+方向键` 平铺窗口——**不是修饰键**。
computer-use 会把 `meta` 翻译成 `super`，所以对模型来说：
**任何"复制/粘贴/全选/保存"都必须用 `ctrl`，用 `meta` 会静默无效。**
终端里的复制粘贴还要再多一个 `shift`（`ctrl+shift+c` / `ctrl+shift+v`）。

顺带一个印证设计意图的细节：VNC 会话名叫 **`AnyOS`**，配置文件叫 `anyos.conf`，
而且已经支持 `light` / `dark` 两套外观参数。也就是说这一层从设计上就是
"**可以换成任意 OS 外观的皮肤**"，macOS 只是当前选的那一套，而不是在模拟 macOS 系统。

---

## 5. 预装软件清单

下面是**为服务 computer-use 而预装**的软件，按职责分组。"为什么"一列里，
配置或注释中明确写了的标 *[明示]*，其余是基于证据的推断。

### 5.1 VNC 与 X 服务

| 软件 | 版本 | 作用 | 为什么装它 |
| --- | --- | --- | --- |
| `tigervnc-standalone-server` | 1.13.1 | `Xtigervnc`：X server 与 VNC server 合体 | 一个进程同时提供帧缓冲和 RFB，省掉 Xvfb + x11vnc 的一层拷贝；扩展列表里的 `VNC-EXTENSION` 就是它 |
| `tigervnc-common` / `tigervnc-tools` | 1.13.1 | `tigervncserver` 包装脚本、xstartup 机制 | 负责 daemonize、生成 `.Xauthority`、按 `-xstartup` 拉起桌面会话 |
| `noVNC` | 1.2.0（打包） | 浏览器里的 VNC 客户端 | 人不用装任何客户端就能看/接管会话。锁版本 + 打包进镜像，见 §3.5 |
| `websockify` | 0.10.0（打包） | RFB ⇄ WebSocket 桥 | 浏览器不能直接说 RFB，必须有这一层 |
| `x11-utils` | — | `xdpyinfo` `xprop` `xkill` | `xdpyinfo` 是启动序列判断 X 就绪的探针；`xprop` 用来查 `_NET_SUPPORTING_WM_CHECK` 判断窗口管理器就绪 *[明示]* |
| `x11-xserver-utils` | — | `xrandr` `xset` `xmodmap` `xrdb` | `xrandr` 供 daemon 检测分辨率与刷新率；`xmodmap` 是非 ASCII 打字借还 keycode 的唯一手段；`xrdb` 加载 `Xft.dpi` |
| `xdg-utils` | — | `xdg-open` 等 | 应用里点链接能正确交给浏览器 |
| `Xvfb` | — | 纯虚拟帧缓冲 | **装了但未启用**。推断是备用/兼容路径 |

### 5.2 桌面会话与窗口管理

| 软件 | 版本 | 作用 | 为什么装它 |
| --- | --- | --- | --- |
| `xfce4` | 4.18 | 会话、面板、桌面、设置 | 轻、快、不依赖 GPU 合成，且配置纯文件驱动（§4.1） |
| `xfwm4` | 4.18.0 | 窗口管理器 | 提供 EWMH（启动探针要用）与合成（阴影/透明，让截图更接近真实桌面观感） |
| `xfce4-settings` | 4.18 | `xfconf` 配置后端 | §3.4 的模板管线最终写的就是 xfconf 的 XML |
| `plank` | 0.11.89 | macOS 风格 Dock | 视觉上贴近 macOS（§4.8）；同时给模型一个稳定的"启动器"锚点 |
| `dbus-x11` | — | `dbus-launch`、会话总线 | XFCE、dconf、at-spi 都强依赖 D-Bus；启动序列第 2 步就在等它 |
| `at-spi2-core` | — | 无障碍总线 | GTK 应用默认会连它，缺了会在启动时报错/变慢 |
| `dconf-cli` | — | `dconf` 命令行 | Plank 的配置只吃 dconf，不吃 XML，所以启动脚本用 `dconf write` 配 Dock |
| `gnome-themes-extra` / `adwaita-icon-theme` | — | 基础主题与图标 | WhiteSur 主题继承了它们的部分资源，缺了会出现图标空洞 |
| `sassc` / `libglib2.0-dev-bin` / `libxml2-utils` / `xz-utils` | — | 主题构建期依赖 | WhiteSur 的 `install.sh` 需要它们编译/安装主题资源 |
| `gnome-keyring` / `seahorse` | — | 凭据存储 | Chrome 的 `--password-store=basic` 已绕过它，但部分 GTK 应用启动时会找 secret service |

### 5.3 输入注入

| 软件 | 版本 | 作用 | 为什么装它 |
| --- | --- | --- | --- |
| `xdotool` | 3.20160805.1 | **所有** computer-use 输入动作 | 封装了 XTEST、keysym 查表、修饰键状态、Unicode keycode 借还，daemon 只需拼命令行（§4.3） |
| `xclip` | — | 读写 X 选区/剪贴板 | 目前 computer-use 的 `type` 没用它。实测中文剪贴板往返正常，是 [P0-2 快路径](./upgrade-plan.md) 的现成依赖 |
| `xmodmap`（属 x11-xserver-utils） | — | 改键盘映射 | 非 ASCII 打字的两条路都靠它把 Unicode keysym 绑到空闲 keycode |

### 5.4 采集与编码

| 软件 | 版本 | 作用 | 为什么装它 |
| --- | --- | --- | --- |
| `ffmpeg` | 6.1.1 | 截图（单帧 → 无损 WebP）与录屏（x11grab → H.264） | 一个二进制覆盖抓屏 + 缩放 + 两种编码，不用引入多个抓屏/编码库。截图和录屏走的是同一个工具的两种参数 |
| `ffprobe` | 6.1.1 | 读视频元信息 | 校验产物 |
| `libwebp`（随 ffmpeg） | — | WebP 编码 | `-preset text` 针对界面截图优化 *[明示]* |
| `libx264`（随 ffmpeg） | — | H.264 编码 | 全 I 帧代理片（§4.6） |

### 5.5 浏览器

| 软件 | 版本 | 作用 | 为什么这么配 |
| --- | --- | --- | --- |
| `google-chrome-stable` | 148 | 浏览器 | 用 Chrome 而不是 Firefox：`--remote-debugging-port` 生态（Playwright/CDP）成熟，且视觉上与用户实际环境一致 |

包装脚本 `/usr/local/bin/google-chrome`（和 `chrome`）里每个关键 flag 都带注释 *[明示]*：

| flag | 注释里的理由 |
| --- | --- |
| `--user-data-dir=<固定路径>` | "固定 user-data-dir 才能保证 `--remote-debugging-port` 始终生效（Chrome 在加入已有实例时会忽略这个 flag）" |
| `--class=google-chrome` | "强制 WMClass，让 Plank 把它识别成同一个应用" |
| `--use-gl=angle --use-angle=swiftshader-webgl` | "在没有硬件 GPU 的情况下通过 SwiftShader 提供软件 WebGL" |
| `--no-sandbox` | 容器里没有 setuid sandbox helper |
| `--disable-dev-shm-usage` | 容器 `/dev/shm` 通常很小，不改会崩 |
| `--password-store=basic` | 不去碰 keyring，避免弹密钥环解锁框 |
| `--no-first-run --no-default-browser-check` | 首次启动不弹引导页/默认浏览器询问 |
| `--window-size=1820,1100 --window-position=50,50` | 在 1920x1200 上留边距开窗，而不是顶满屏幕（实际落到 1792x1084 @ 49,49；底部仍与 Dock 重叠，见 §2.1） |

除了 flag，`configure-google-chrome.sh` 还**预写了 profile 文件**：空的 `First Run` 标记、
`Local State`（关掉默认浏览器提示）、`Default/Preferences`（跳过首次运行 UI、
不导入书签/历史、禁用登录与同步推广）。**为什么要做到这一步**：任何首次运行的弹窗、
气泡、引导页都会遮住页面内容，让模型看到的第一屏不是它要操作的界面。

还额外准备了一个 `~/.config/google-chrome-playwright` profile 目录——推断是让仓库里
用 Playwright 的测试可以复用系统 Chrome，同时不和交互式会话抢同一个 profile（Chrome 的
profile 目录是排他的）。

### 5.6 字体与文本渲染

| 软件 | 作用 | 为什么装它 |
| --- | --- | --- |
| `fonts-noto` / `fonts-noto-core` | 覆盖绝大多数文字系统 | 让非拉丁文字至少不显示成豆腐块 |
| `fonts-noto-color-emoji` | 彩色 emoji | 现代界面里 emoji 很常见 |
| `fonts-wqy-microhei` + `fonts-droid-fallback` | 中日韩兜底 | **唯一**的 CJK 覆盖来源。只有一个字重，粗体靠合成 |
| `fonts-jetbrains-mono` | 终端与代码等宽字体 | `anyos.conf` 指定的终端字体 |
| `Cascadia Code`（打包） | 另一套等宽字体 | 微软的字体不在 Ubuntu 仓库里，所以打包进镜像 |
| `fonts-liberation` / `fonts-croscore` | Arial / Times / Courier 的度量兼容替代 | §4.8 的字体替换表要用：Arial→Arimo、Times→Tinos、Courier→Cousine |
| `fonts-cantarell` | Gill Sans 的替代 | 同上 |
| `Inter` / `Public Sans` / `Source Sans 3`（打包） | UI 字体与 `.SF NS`/Lucida Grande 的替代 | 同上；`Inter` 也是 `anyos.conf` 指定的 UI 字体 |
| `xfonts-base` / `xfonts-terminus` | 传统位图字体 | 老式 X 应用不走 fontconfig，缺了会起不来 |
| `locales` | 生成 `en_US.UTF-8` | `LANG`/`LANGUAGE` 都设成它；只生成一个 locale 是刻意的最小化 |
| `/etc/fonts/local.conf` | 字体名替换表 | §4.8 |

### 5.7 图形栈

| 软件 | 版本 | 作用 | 为什么这么配 |
| --- | --- | --- | --- |
| `libgl1-mesa-dri` / `libglx-mesa0` / `mesa-libgallium` | 25.2.8 | 软件 OpenGL | 没有 GPU，`LIBGL_ALWAYS_SOFTWARE=1` + `GALLIUM_DRIVER=llvmpipe`，让 GTK/Qt 的 GL 路径可用而不是直接崩 |
| ANGLE + SwiftShader（随 Chrome） | — | 软件 WebGL | 实测 Chrome 里 WebGL 2.0 可用，renderer 报 `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)` |

也就是说 **WebGL 的网页是能测的**，只是走 CPU 软渲染，性能与真实 GPU 不可比。

### 5.8 桌面应用

| 软件 | 作用 | 为什么装它 |
| --- | --- | --- |
| `thunar` | 文件管理器 | 提供真实的图形化文件操作与拖放；也是 Dock 三项之一 |
| `xfce4-terminal` | 终端 | 让 agent 能在**桌面里**用终端（区别于工具层的 shell），演示视频里也需要 |
| `mousepad` | 文本编辑器 | 最轻的图形文本编辑器，用来打开/查看文件 |
| `procps` | `ps` `pgrep` | 启动脚本里到处在用 `pgrep` 判断服务是否起来 |
| `sudo` | 提权 | 安装脚本以 root 跑但要以 agent 用户身份操作（`sudoUserIf`），反之亦然 |

Dock 上固定三项：**Chrome、Thunar、xfce4-terminal**。这三个正好对应 agent 最常需要的
三类操作：上网、管文件、跑命令。

### 5.9 应用运行时依赖

| 软件 | 为什么装它 |
| --- | --- |
| `libnss3` `libxss1` `libgbm-dev` `libnotify4` | Electron / Chromium 的运行时依赖。装了这些，仓库里 `npm install electron` 就能直接在桌面上跑起来 |
| `libx11-dev` `libxkbfile-dev` `libsecret-1-dev` | 需要从源码构建原生模块的桌面应用会用到 |
| `python3-minimal` `python3-numpy` | websockify 的运行时（numpy 让它的掩码运算走快路径） |

`xstartup` 里还导出了两个 Electron 专用变量：`ELECTRON_FORCE_IS_PACKAGED=0` 和
`ELECTRON_FORCE_DEVICE_SCALE_FACTOR=<GDK_SCALE>`。后者是必要的：Electron 不读 `GDK_SCALE`，
不显式告诉它缩放因子，在 HiDPI 配置下界面尺寸会和其他应用不一致。

### 5.10 agent 侧工具（不在桌面上，在 `/exec-daemon`）

这些不服务 GUI，但和 computer-use 同属一套 agent 运行时：

| 工具 | 说明 |
| --- | --- |
| `node` | exec-daemon 自带的运行时，与仓库的 Node 版本无关 |
| `polished-renderer.node` | 录屏后处理的原生模块（Remotion 渲染） |
| `pty.node` | 终端会话的伪终端支持 |
| `rg` | ripgrep，代码搜索 |
| `gh` | GitHub CLI（只读） |
| `tmux` + `tmux.portal.conf` | 长时运行命令的会话托管（配置里关掉了状态栏和鼠标拖拽绑定） |
| `origin` | Origin CLI |
| `cursorsandbox` | 命令沙箱 |
| `canvas-runtime` / `agent-sdk` | Canvas 相关运行时与类型 |

### 5.11 目录约定

| 路径 | 用途 | 权限 | 为什么 |
| --- | --- | --- | --- |
| `/opt/cursor/artifacts/` | 交付产物（截图、视频、日志） | 777 | 放这里的文件会自动上传给用户；777 是因为可能有不同 uid 的进程写入 |
| `/opt/cursor/recording-staging/` | 录屏中间文件 | 777 | 与交付目录分开，避免半成品被上传 |
| `/opt/cursor/logs/` | 调试日志 | 777 | |
| `/tmp/computer-use/` | 每张截图的副本 | — | 便于事后追查模型当时看到了什么 |
| `/tmp/anyos-xstartup` | 运行时生成的 xstartup | 755 | 内容由 `anyos.conf` 展开而来，所以不能是静态文件 |
| `/tmp/vnc-desktop-user-env` | 捕获的目标用户名与 home | 600 | 安装脚本以 root 运行，但必须配置 agent 用户的 home；这个文件是两者之间传递身份的桥（`capture-vnc-user-env.sh`） |

---

## 6. 规格速查

| 项 | 值 |
| --- | --- |
| 操作系统 | Ubuntu 24.04.4 LTS，kernel 6.12.94 |
| CPU / 内存 | 4 vCPU / 15 GiB，无 GPU |
| 帧缓冲 | 1920x1200x24 @ 60 Hz，96 DPI（约 9.2 MB/帧） |
| 模型可见 | 1280x800 无损 WebP，约 36 KiB，142 ms |
| X server | Xtigervnc（TigerVNC 1.13.1），`:1`，127.0.0.1:5901 |
| Web 访问 | websockify 0.10.0 + noVNC 1.2.0，**0.0.0.0:26058** |
| 桌面 | XFCE 4.18.3，xfwm4 4.18.0，Plank 0.11.89 |
| 浏览器 | Chrome 148，CDP 端口 9222，WebGL 2.0 via SwiftShader |
| 输入 | xdotool 3.20160805.1（2016 年构建） |
| 编解码 | ffmpeg 6.1.1 |
| 字体 | 373 个文件 / 214 个字族，**无 Noto CJK** |
| 空闲 keycode | 19 |
| Locale | 仅 `en_US.UTF-8` |
| 音频 | 无 |
| X 扩展 | 24 个，含 `XTEST` `DAMAGE` `XFIXES` `MIT-SHM` `RECORD` `RANDR` `VNC-EXTENSION`；**无 DPMS** |

### 安全边界（精确表述）

- `Xtigervnc` 用 `-localhost` 绑在 `127.0.0.1:5901`（IPv4 + IPv6 回环），进程外不可直连。
- 但 **websockify 监听 `0.0.0.0:26058`**，且 VNC 侧 `-SecurityTypes None`（无密码）。
- 因此**唯一的访问控制在网络层**：谁能连上 26058 端口，就能完全控制这个桌面。
  端口暴露范围就是安全边界本身。

---

## 7. 已知问题

按严重程度排列，详细数据见 [`current-state.md`](./current-state.md)，
改造方案见 [`upgrade-plan.md`](./upgrade-plan.md)：

1. **`mousemove --sync` 在指针已到目标位置时阻塞 15.2 秒**，比正常路径慢约 9500 倍，
   而 executor 对每个带坐标的动作都发它且不去重。
2. **非 ASCII 打字默认会静默丢字**：中文用例 18 次只有 9 次完全正确；能修好它的路径
   默认关闭且慢 8 倍。
3. **每次截图前固定干等 2 秒**，实测画面 100~250 ms 就稳定，一次往返约 93% 是空转。
4. **模型可见分辨率用了 1.5 倍这个最不划算的缩放比**（SSIM 0.876，1.25 倍是 0.931）。
5. **录屏采集用 60 fps 全 I 帧**，占 1.18~1.63 核、每分钟写 385~555 MiB，
   而成片只有 4 MB 量级。
6. **未装 Noto CJK**，中日韩只有 2 个可选字族（韩文 1 个），UI 字体完全不含 CJK；
   emoji 会先落到 DejaVu Sans 而不是已装的 Noto Color Emoji。
7. **组件版本偏旧**：noVNC 1.2.0（2020）、websockify 0.10.0（2021）、
   xdotool 3.20160805.1（2016）。
