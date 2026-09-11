# Cursor Cloud Computer 现状（实测）

这份文档描述 Cursor Cloud Agent 云端桌面与 computer-use 工具链的现状。结构上分两部分：
**它是怎么搭的**（从这台 VM 上的实际配置文件与 exec-daemon 打包代码读出来的），以及
**它跑起来是什么表现**（用 [`tools/cloud-desktop-audit`](../../tools/cloud-desktop-audit/)
现场测出来的）。

复现方式：

```bash
DISPLAY=:1 python3 tools/cloud-desktop-audit/audit.py --json /tmp/baseline.json
```

> 所有数字来自一台 4 vCPU / 15 GiB 的 Cloud Agent VM（Ubuntu 24.04.4，kernel 6.12.94，无 GPU）。
> 绝对值会随机型和当时的画面内容浮动，量级和相对关系是稳定的。

---

## 1. 桌面是怎么搭起来的

```
                  ┌─────────────────────────────────────────────┐
   人（浏览器）───▶│ websockify 0.10.0 + noVNC 1.2.0  :26058     │
                  └───────────────────────┬─────────────────────┘
                                          │ RFB, localhost only
                  ┌───────────────────────▼─────────────────────┐
                  │ Xtigervnc (TigerVNC 1.13.1)  DISPLAY=:1     │
                  │ 1920x1200x24 @ 96 DPI, :5901                │
                  │ -localhost -SecurityTypes None              │
                  └───────────────────────┬─────────────────────┘
                                          │
        ┌─────────────────────────────────┼──────────────────────────┐
        │                                 │                          │
   XFCE 4.18 会话                   xdotool（输入）            ffmpeg x11grab
   xfwm4 + xfce4-panel              XTEST 扩展                  截图 / 录屏
   + Plank dock                          ▲                          ▲
   WhiteSur-Light 主题                   └────────┬─────────────────┘
                                                  │
                                          exec-daemon
                                  computer_use / record_screen
                                                  ▲
                                                  │
                                                Agent
```

**层次划分。** 帧缓冲、输入注入、编码三件事共用同一个 X server，但走三条互不知情的路径：
人通过 noVNC 看画面，agent 通过 `xdotool` 打字点击，截图和录屏通过 `ffmpeg -f x11grab`
把同一个帧缓冲读出来。没有共享的"当前状态"概念，所以所有同步都靠等待。

**配置来源。** 桌面外观不是手写的 dotfiles，而是从一份集中配置生成的：
`/usr/local/share/anyos.conf` 定义 `ANYOS_*` 变量（分辨率、DPI、面板高度、dock 图标尺寸、
字体名与字号），`anyos-setup` 把这些值替换进 XFCE / GTK / Plank 的模板，
`configure-os-display` 负责落盘到用户 home，`desktop-init.sh` 是启动入口（起 D-Bus →
起 tigervncserver → 等 X 就绪 → 起 noVNC → 起 Plank 守护循环 → 随机挑一张壁纸）。

镜像里还留着一份 `anyos.hidpi.conf`，明确标了 `UNUSED - for reference only`：那是之前
用过的 3840x2400 + `GDK_SCALE=2` 的 Retina 配置。也就是说 HiDPI 路线走过又退回来了，
这一点对后面讨论分辨率很重要。

**关键取值。**

| 项 | 值 | 来源 |
| --- | --- | --- |
| 帧缓冲 | 1920x1200x24 @ 60 Hz | `Xtigervnc` 启动参数 |
| DPI / 缩放 | 96 DPI，`GDK_SCALE=1`，`QT_SCALE_FACTOR=1` | `anyos.conf` |
| 窗口管理器 | xfwm4 4.18.0，开启合成 | `xfwm4.xml` |
| 主题 | WhiteSur-Light（GTK / 图标 / 光标） | `configure_os_display.sh` |
| UI 字体 | Inter 11；终端 JetBrains Mono 11 | `anyos.conf` |
| 面板 / dock | xfce4-panel 28px；Plank 48px 图标 | `anyos.conf` |
| 渲染 | 纯软件：`LIBGL_ALWAYS_SOFTWARE=1`、llvmpipe；Chrome 走 ANGLE/SwiftShader | `desktop-init.sh` |
| 浏览器 | Chrome 148，`--no-sandbox --remote-debugging-port=9222`，固定 profile | `/usr/local/bin/google-chrome` |
| X 扩展 | 24 个，含 `DAMAGE`、`XTEST`、`XFIXES`、`MIT-SHM`、`RECORD`；**无 DPMS** | `xdpyinfo` |

## 2. computer-use 是怎么实现的

动作集共 11 种：`mouse_move`、`click`、`mouse_down`、`mouse_up`、`drag`、`scroll`、
`type`、`key`、`wait`、`screenshot`、`cursor_position`。

**坐标。** 模型看到的是 `API_WIDTH = 1280` 宽的图，高度按帧缓冲宽高比算出来，
所以这台机器上是 **1280x800**。`CoordinateScaler` 双向换算，宽高比偏差超过 2% 直接报错。
也就是说帧缓冲分辨率和模型可见分辨率是强耦合的，改一边必须动另一边。

**输入。** 每个动作编译成**一次** `xdotool` 调用，多个子命令串在一条命令行里。
例如带修饰键的点击是 `keydown ctrl mousemove --sync X Y click 1 keyup ctrl`。
鼠标按钮映射到 1/2/3（左中右）和 8/9（后退/前进），滚动用按钮 4/5/6/7。
多次点击用 `--repeat N --delay 50`。`key` 走 `xdotool key -- <combo>`，`meta` 会翻译成
`super`；带按住时长的走 keydown / sleep / keyup。

**打字。** 换行拆成 `key Return`，其余按 50 个单元一批发给 `xdotool type --delay 12`，
环境变量固定 `LC_ALL=C.UTF-8`。非 ASCII 字符有两条路：

- **默认路径**：直接 `xdotool type`。xdotool 对键盘映射上没有的字符，会临时借一个空闲
  keycode、按下、马上还回去，一个字符一轮。
- **可选路径**（`bindUnmappedCharacters`，**默认关闭**）：先把这一段里所有不同的非 ASCII
  字符一次性绑到空闲 keycode 上，前后各等 `KEYMAP_SETTLE_MS = 300`，整段打完再解绑。
  代码注释里直接写明了默认路径的问题：应用按自己缓存的键盘映射解释按键事件，抢在服务器的
  `MappingNotify` 之前到达的按键会按旧映射解析然后消失，而 `xdotool` 依然返回 0
  （注释里给的例子是 `Aprenderás` 变成 `Aprenders`）。

**截图。** `ffmpeg -f x11grab -frames:v 1 -vf scale=1280:800 -c:v libwebp -preset text
-lossless 1` 走管道输出，然后在内存里补 RIFF / VP8 的长度字段（ffmpeg 写管道时没法回退，
这两个字段留成 0，浏览器会拒绝渲染）。

**等待。** `COMPUTER_USE_SCREENSHOT_SETTLE_DELAY_MS = 2000`。一批动作里只要有
"需要沉降"的动作（鼠标类、`key`、`scroll`，或含换行的 `type`），截图前就固定睡 2 秒。
这是整条链路里唯一的同步机制。

## 3. 录屏是怎么实现的

完整说明见 [`recording.md`](./recording.md)。这里只留和实测相关的骨架。

采集：`-framerate <刷新率，默认 60> -draw_mouse 0 -f x11grab` →
`scale=1920:-2:flags=lanczos,fps=60` → `libx264 -preset veryfast -crf 17`，
并且 `keyint=1:min-keyint=1:scenecut=0:bframes=0`，即**全 I 帧**
（profile 版本号就叫 `render-proxy-h264-all-i-v1`）。落在
`/opt/cursor/recording-staging/`。全 I 帧是为了让后面的渲染器可以任意跳帧。

同时 `InputEventLogger` 记录每个动作的时间戳、动作前后指针位置和光标形状，
写成 `recording-data.json`。

后处理由 `polished-renderer.node`（Remotion）完成，从事件日志重建出来的东西包括：
弹簧曲线的合成光标（默认 `MELLOW`）、点击波纹、按键提示条、自动缩放
（`maxZoomsPerMinute: 8`、`minZoomIntervalMs: 1500`）、以及把空闲段加速播放
（区分 `LOADING_WAIT` / `THINKING_PAUSE` / `VIEWING_RESULT`，只加速前两类）。

注意 `-draw_mouse 0`：**真实光标不进视频**，成片里的光标完全是画出来的。好处是可以做
平滑运镜，代价是任何不经过 computer-use 的指针移动（应用自己挪的，或人在 noVNC 里操作的）
在成片里没有光标。

## 4. 实测结果

### 4.1 输入延迟：一个 15 秒的坑

| 探针 | p50 | 说明 |
| --- | --- | --- |
| `xdotool` 进程启动地板 | 1.5 ms | 进程 + X 连接 |
| `getmouselocation --shell` | 2.0 ms | |
| `mousemove --sync`，指针需要移动 | 1.6 ms | 正常路径 |
| **`mousemove --sync`，指针已在目标位置** | **15 192 ms** | 见下 |
| `mousemove` 不带 `--sync` | 1.6 ms | |
| 点击串（移动 + 点击），指针需要移动 | 102.8 ms | 正常路径 |
| **点击串，指针已在目标位置** | **15 289 ms** | |
| 10 点拖拽串（一次调用） | 2.3 ms | |
| `key -- a` | 15.3 ms | 含 xdotool 自带的按键间隔 |

`xdotool` 的 `mousemove --sync` 语义是"等指针**离开**原来的位置"。当目标坐标就是指针当前
坐标时，永远等不到这个事件，于是它一直重试到自己放弃，实测 **15.19 秒**，比正常路径慢
约 9500 倍。

executor 对每个带坐标的动作都会发 `mousemove --sync`，且**没有做去重**。所以只要模型
对同一个坐标连续操作，就会踩中：重复点同一个按钮、截图确认后再点一次同一个位置、
双击被拆成两个 `click` 动作、拖拽的第一个路径点正好在指针下面。

### 4.2 画面沉降：2000 ms 里大部分是干等

| 交互 | 画面稳定所需（p50） | 固定等待中的空转 |
| --- | --- | --- |
| 窗口内点击一次 | 398 ms | 1602 ms |
| 打 6 个字符 | 239 ms | 1761 ms |
| 单次按键 | 306 ms | 1694 ms |

这些是**上界**：探测本身靠反复抓小图，一次抓图 p50 约 96 ms，所以"发现画面安静了"
比真正安静晚了大约一个抓图周期。真实沉降时间在 100~250 ms 量级。

对照 4.3：一次截图本身只花 142 ms。也就是说 **一次"动作 + 截图"往返里约 93% 的时间
是那个固定的 2 秒**，而不是干活。

### 4.3 截图：延迟与体积

| 变体 | p50 | 原始体积 | base64 后 |
| --- | --- | --- | --- |
| **当前：webp 无损，`-preset text`** | **142 ms** | **36 KiB** | **48 KiB** |
| 同上，`scale` 换 `flags=lanczos` | 148 ms | 38 KiB | 51 KiB |
| 同上，`scale` 换 `flags=area` | 136 ms | 34 KiB | 46 KiB |
| webp 有损 q=92 | 152 ms | 96 KiB | 128 KiB |
| webp 无损，不缩放（1920x1200） | 200 ms | 76 KiB | 101 KiB |
| png（作参照） | 130 ms | 828 KiB | 1.08 MiB |

其中 `ffmpeg` 进程启动本身占 **27.2 ms**，即每张截图约 19% 的时间花在拉起进程和建立 X 连接。

两个反直觉但重要的结论：

- **有损 webp 比无损更大**（96 KiB vs 36 KiB）。界面是大片纯色加锐利边缘，无损 webp 压得
  极好，而有损会引入噪声反而变大。现在选无损是对的，"换成有损省流量"是个陷阱。
- 缩放算法换 lanczos 只多 4 ms / 3 KiB，换 area 还更省，但肉眼差异很小，单独换不值得。

### 4.4 缩放保真度：1.5 倍是个不划算的比例

对焦点窗口区域做"降到模型可见分辨率再放回原尺寸"的往返，与原图算 SSIM：

| 模型可见尺寸 | 缩放比 | SSIM | 像素量 |
| --- | --- | --- | --- |
| 960x600 | 2.00x | 0.8593 | 0.58 MP |
| **1280x800** | **1.50x** | **0.8758** | **1.02 MP** ← 当前 |
| 1536x960 | 1.25x | 0.9307 | 1.47 MP |
| 1920x1200 | 1.00x | 1.0000 | 2.30 MP |

关键在于 **1.5x（0.876）几乎没比 2.0x（0.859）好**，尽管它多保留了 76% 的像素；
而 1.25x 一下跳到 0.931。非整数缩放比会额外损失细节，1.5x 恰好是最不划算的位置之一。

视觉对照（同一区域按相同倍率放大，无插值）：

- 1920 原生：中文笔画清晰可分
- 1536（1.25x）：略软，仍然清楚
- 1280（1.5x）：中文笔画开始糊在一起，`云端桌面字体回退检查` 明显发虚

### 4.5 打字保真度：默认路径会丢字

sink 是一个真实的 GUI 输入框（Chrome 里铺满视口的 `textarea`，逐字符读回），每行 6 次：

| 用例 | 策略 | 字符数 | 不同非 ASCII 数 | 吞吐 | 完全一致 |
| --- | --- | --- | --- | --- | --- |
| 纯 ASCII | 默认 | 54 | 0 | 147 ch/s | 6/6 |
| 纯 ASCII | 借用 keycode | 54 | 0 | 146 ch/s | 6/6 |
| 带重音拉丁 | 默认 | 47 | 4 | 146 ch/s | **5/6** |
| 带重音拉丁 | 借用 keycode | 47 | 4 | 51 ch/s | 6/6 |
| 中文 | 默认 | 24 | 23 | 136 ch/s | **2/6** |
| 中文 | 借用 keycode | 24 | 23 | 17 ch/s | 6/6 |
| 中英混排 | 默认 | 35 | 8 | 143 ch/s | 6/6 |
| 中英混排 | 借用 keycode | 35 | 8 | 41 ch/s | 6/6 |

丢字是竞态，单轮说明不了什么。三次完整审计里默认路径在中文用例上分别是 2/6、5/6、2/6，
合计 **18 次只有 9 次完全正确**。实际丢字样本（同一次审计的三条）：

```
期望：云端桌面升级计划：先测量，再优化，最后验证效果。
收到：云端桌面计划：先测量，再优化，最后验证效果。       （丢了 升、级）
收到：云端桌面升级划：先测量，再优化，最后验效果。       （丢了 计、证）
收到：云端桌面升级计划先测再优，最后验证效果。           （丢了 ：、量、化）
```

借用 keycode 的路径在同样的用例上**全部正确**，但代价是中文吞吐从 136 ch/s 掉到 17 ch/s
（约 1/8），因为每一轮前后各要等 300 ms 让键盘映射生效。而且这台机器上只有
**19 个空闲 keycode**，一段中文里不同字超过 19 个就必须拆成多轮，每多一轮多 600 ms。

这不是实验室现象。同一次会话里，真实的 `computer_use` 工具往应用搜索框里打两个字
`延迟`，只有 `延` 落进了输入框，界面随即显示 "No todos match the current view."
——录屏里能直接看到。

### 4.6 录屏采集成本

6 秒采集，全程有鼠标移动：

| 参数 | 占用核数（共 4 核） | 实际帧率 | 折算每分钟 |
| --- | --- | --- | --- |
| **当前：60 fps 采集 / 60 fps 输出 / crf 17** | **1.18** | 60.0 | **385 MiB** |
| 30 fps 采集 / 30 fps 输出 / crf 17 | 0.61 | 30.0 | 251 MiB |
| 30 fps 采集 / 30 fps 输出 / crf 20 | 0.59 | 30.0 | 178 MiB |

画面越复杂越贵：另一次画面更满的测量里当前参数跑到 1.63 核 / 555 MiB 每分钟。

值得对照的是**最终交付物很小**：本次采集 139 秒，压成 32 秒正片 + 2 秒片尾，
成片是 1920x1200 @ 60 fps、**4.08 MB**。所以昂贵的是 staging 阶段，不是交付物。
完整链路见 [`recording.md`](./recording.md)。

而且成本不只是磁盘：在 4 vCPU 的机器上，编码器要和被测应用抢 CPU，于是"录着屏跑的
GUI 测试"和"不录屏跑的"时序不一样——录屏这个动作本身影响了它记录的对象。

### 4.7 字体覆盖

373 个字体文件、214 个字族，但覆盖很不均衡：

| 文字 | 覆盖字族数 | UI 字体（Inter）是否覆盖 | fontconfig 实际选中 |
| --- | --- | --- | --- |
| 带重音拉丁 / 西里尔 / 希腊 | 14~15 | 是 | Noto Sans |
| 简体中文 | 2 | 否 | WenQuanYi Micro Hei |
| 繁体中文 | 2 | 否 | WenQuanYi Micro Hei |
| 日文假名 | 2 | 否 | WenQuanYi Micro Hei |
| 韩文 | **1** | 否 | WenQuanYi Micro Hei |
| 阿拉伯文 | 4 | 否 | **DejaVu Sans** |
| 希伯来文 | 5 | 否 | **DejaVu Sans** |
| 天城文 | **1** | 否 | Noto Sans Devanagari |
| 泰文 | 2 | 否 | Noto Sans Thai |
| Emoji | 2 | 否 | **DejaVu Sans** |

具体问题：

- **没有装 Noto Sans CJK / Noto Serif CJK**。中日韩全靠 `fonts-wqy-microhei` 和
  `fonts-droid-fallback`——后者是遗留兜底字体，前者只有一个字重，所以界面里的粗体中文
  是合成的假粗体。
- **UI 字体 Inter 完全不含 CJK**，所以桌面上每一个中日韩字符都走回退，和 Inter 混排时
  字形风格、字重、基线都对不齐。
- **Emoji 会先落到 DejaVu Sans**，尽管 Noto Color Emoji 就在机器上；DejaVu 里那些码位
  是单色轮廓甚至缺字形。
- **阿拉伯文 / 希伯来文落到 DejaVu Sans**，尽管 Noto Sans Arabic / Hebrew 已安装。

这件事的杠杆比看起来大：模型是通过一张**再缩小 1.5 倍**的截图去读这些字的（见 4.4），
单字重、老式 hinting 的兜底字体正是最不该喂给它的输入。

### 4.8 查过但不是问题

- **屏幕保护 / 息屏**：`xset q` 显示 `timeout: 600`、`prefer blanking: yes`，看着像
  "十分钟没输入就黑屏，截图变全黑"的隐患。实测把超时压到 5 秒并空转 12 秒，帧缓冲
  平均亮度一动不动（131.32），Xtigervnc 不做 blanking，而且这台服务器没有 DPMS 扩展。
  **不需要处理。**
- **VNC 鉴权**：`-SecurityTypes None` 配 `-localhost`，只监听回环，对外只暴露
  websockify 端口。只要那个端口不外泄就没问题。

---

## 5. 一句话汇总

架构本身是合理的：TigerVNC + XFCE 起得快、够稳，全 I 帧代理片 + 事件日志 + Remotion
后处理这套录屏设计相当漂亮，无损 WebP 截图也是正确选择。真正拖后腿的是三件很具体的事：

1. **`mousemove --sync` 在指针已到位时卡 15 秒**，executor 没做去重（§4.1）。
2. **非 ASCII 打字默认会丢字**，正确的那条路径默认关着，而且慢 8 倍（§4.5）。
3. **每次截图前固定干等 2 秒**，实测只需要 100~250 ms（§4.2）。

其次是两个"选得不够好"的参数：模型可见分辨率用了最不划算的 1.5 倍缩放比（§4.4），
录屏采集用了远超需要的 60 fps 全 I 帧（§4.6）。加上缺 Noto CJK 造成的字体回退质量问题
（§4.7）。

按这些结论排出的改造方案见 [`upgrade-plan.md`](./upgrade-plan.md)。
