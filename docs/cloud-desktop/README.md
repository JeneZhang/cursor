# Cursor Cloud Computer：现状与升级方案

针对 Cursor Cloud Agent 的**云端桌面**（VNC + XFCE 的图形会话）和 **computer-use**
（agent 用来点击、打字、截图、录屏的那套工具）做的一次完整测量与改造设计。

| 文档 | 内容 |
| --- | --- |
| [`product-overview.md`](./product-overview.md) | 产品文档：能力清单、架构、每个设计选择的理由，以及预装软件全清单与"为什么装它" |
| [`recording.md`](./recording.md) | 录制能力专文：采集、事件日志、后处理、重建语义、成本与边界 |
| [`current-state.md`](./current-state.md) | 实测数据：八组测量与缺陷分析 |
| [`upgrade-plan.md`](./upgrade-plan.md) | 升级方案：按优先级排的改造项，每项含根因、改法、预期收益、验证方式、风险 |
| [`../../tools/cloud-desktop-audit/`](../../tools/cloud-desktop-audit/) | 产生这些数据的脚本，以及一个可复现的端到端桌面示例 |

先看 `product-overview.md` 了解这套东西是什么、怎么搭的、为什么这么搭；
录制这一条单独看 `recording.md`；再看 `current-state.md` 看它跑起来的真实表现；
最后看 `upgrade-plan.md` 看要改什么。

## 复现

```bash
# 全量审计（约 4~5 分钟），同时导出原始 JSON
DISPLAY=:1 python3 tools/cloud-desktop-audit/audit.py --json /tmp/baseline.json

# 端到端示例：把本仓库的 Electron 应用拉起在云端桌面上
DISPLAY=:1 tools/cloud-desktop-audit/demo-desktop-session.sh --reset
```

## 结论摘要

架构本身没问题：TigerVNC + XFCE 起得快、够稳；录屏那套"全 I 帧代理片 + 输入事件日志 +
Remotion 后处理"的设计相当漂亮；截图选无损 WebP 也是正确的（实测有损反而更大更糊）。

真正拖后腿的是三个很具体的缺陷，都能量化：

1. **`mousemove --sync` 在指针已到目标位置时阻塞 15.2 秒**，比正常路径慢约 9500 倍，
   而 executor 对每个带坐标的动作都发它且不做去重。
2. **非 ASCII 打字默认会静默丢字**：中文用例 18 次只有 9 次完全正确；能修好的那条路径
   默认关着，而且慢 8 倍。
3. **每次截图前固定干等 2 秒**，而画面实测 100~250 ms 就稳定了——一次往返约 93% 是空转。

另有两个参数选得不够好（模型可见分辨率用了最不划算的 1.5 倍缩放比；录屏采集用了远超
需要的 60 fps 全 I 帧），以及缺 Noto CJK 导致的中日韩字体回退质量问题。

改完 P0/P1，一次"点击 + 截图"的往返从约 2245 ms 降到约 529 ms。

## 术语表

这几个词在三份文档里反复出现，含义都不是自解释的。

**X 会话（X session）** — 一个 X server 实例（这台机器上是 `Xtigervnc :1`）加上连在它
上面的所有图形程序，以及它们共享的那一套状态：窗口管理器、根窗口、唯一的鼠标指针、
一张全局键盘映射表、剪贴板选区。命名是反直觉的：**X server 跑在有屏幕的那一侧**，
应用程序是 **client**。所以这里 `Xtigervnc` 是 server，Chrome / Thunar / 被测应用、
以及 agent 用的 `xdotool` 和 `ffmpeg` 全都是 client。会话是共享的、不隔离的——
详见 [`product-overview.md` §3.2](./product-overview.md)。

**帧缓冲（framebuffer）** — X server 里那块存着"屏幕当前长什么样"的内存，
这台机器上是 1920×1200×24 位，约 9.2 MB。截图和录屏都是从这里读像素。

**沉降（settle）** — 等界面画完。动作发出去之后应用还要处理事件、重排布局、播动画，
这段时间里截图会拿到半更新的画面。代码里是 `COMPUTER_USE_SCREENSHOT_SETTLE_DELAY_MS`
和 `actionRequiresSettle`，完整规则见 [`product-overview.md` §4.5](./product-overview.md)。

**API 分辨率** — 模型在截图里看到的尺寸（1280×800），区别于帧缓冲的真实尺寸
（1920×1200）。两者之间有固定的 1.5 倍缩放，坐标双向换算。

**全 I 帧（all-intra）** — 视频里每一帧都是独立完整的关键帧，没有帧间预测。
体积大得多，但可以跳到任意一帧而不用解码前面的内容——录屏后处理要任意取帧，所以选它。

**代理片（render proxy）** — 采集阶段写下的那条未剪辑 H.264，profile 叫
`render-proxy-h264-all-i-v1`，落在 `/opt/cursor/recording-staging/`。
后处理从它任意取帧；它本身不上传。详见 [`recording.md`](./recording.md)。

**重建（reconstruction）** — 成片里的光标、点击波纹、按键条不是屏幕上当时的样子，
而是按 `InputEventLogger` 的事件日志画出来的。人在 noVNC 上的操作、应用自己挪的
指针，成片里都没有。排查行为要用代理片，不要用成片。

**keycode / keysym** — keycode 是物理按键编号（1~255 的整数），keysym 是它产生的字符
或功能（`a`、`Return`、`U4F60`）。两者的对应关系就是那张全局键盘映射表。
非 ASCII 打字要临时把 Unicode keysym 绑到空闲 keycode 上，这是丢字问题的源头。

**strut** — 窗口向窗口管理器申报"请不要让别的窗口盖住我这一条"的机制
（`_NET_WM_STRUT_PARTIAL`）。这台机器上顶部面板申报了 29px，**Plank Dock 没有申报**，
所以最大化的窗口会延伸到 Dock 底下。

**EWMH** — 窗口管理器之间的一套约定属性（`_NET_*`）。启动脚本靠检查根窗口上的
`_NET_SUPPORTING_WM_CHECK` 来判断窗口管理器是否真的起来了，而不是只判断 X server 能连上。
