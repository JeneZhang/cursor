# 云端桌面 / computer-use 审计工具

用来测量 Cursor Cloud Agent 云端桌面（VNC + XFCE）以及 computer-use 输入链路的真实表现。
所有数字都在运行它的那台机器上现场测出来，脚本本身不内置任何"预期值"，因此同一份脚本
可以直接用来对比改造前后的镜像。

测量结果与由此产生的升级方案见 [`docs/cloud-desktop/`](../../docs/cloud-desktop/)。

## 运行

必须在有 X server 的机器上运行（Cloud Agent 的云端桌面默认在 `:1`）：

```bash
DISPLAY=:1 python3 tools/cloud-desktop-audit/audit.py                       # 全部 section
DISPLAY=:1 python3 tools/cloud-desktop-audit/audit.py inventory fonts       # 只跑其中几个
DISPLAY=:1 python3 tools/cloud-desktop-audit/audit.py --json /tmp/base.json # 同时导出原始数据
```

只依赖镜像里已经有的东西：`xdotool`、`ffmpeg`/`ffprobe`、`fontconfig`、`xmodmap`、
`xrandr`、`xdpyinfo`，以及 `google-chrome` 或 `xfce4-terminal` 之一。没有 Python 三方依赖。

全部跑完约 4~5 分钟，其中 `input` 一节最慢：它会故意触发一个 15 秒的 `xdotool` 阻塞路径。

## 各 section 在测什么

| section | 内容 |
| --- | --- |
| `inventory` | X server / VNC / 窗口管理器 / 各组件版本、分辨率、DPI、可用 X 扩展、空闲 keycode 数 |
| `fonts` | 各语言文字的字形覆盖情况，以及 fontconfig 实际会选中哪个字体 |
| `screenshot` | 截图链路的延迟与体积，并与其他编码/缩放方式对比 |
| `fidelity` | 缩放到模型可见分辨率之后，界面信息还剩多少（对焦点窗口做 SSIM） |
| `settle` | 交互之后画面真正稳定所需的时间，用来对照固定 2000 ms 的等待 |
| `input` | 每类输入动作的延迟，区分指针需要移动和指针已在目标位置两种情况 |
| `typing` | `type` 动作的吞吐量，以及**保真度**：读回应用真正收到的字符 |
| `capture` | 录屏采集阶段的 CPU 与码率，并与更省的参数对比 |

### 为什么保真度必须读回来

`xdotool type` 即使丢了按键也会返回 0，所以只测吞吐量是看不出问题的。`typing` 一节会
起一个真实的 GUI 输入框（Chrome 里一个铺满视口的 `textarea`，把 `value` 同步到
`document.title`，再用 `xdotool getwindowname` 读回），逐字符比对应用实际收到的内容。
掉字是竞态，单次成功说明不了什么，所以每行会重复多次并给出 `exact` 次数。

如果 Chrome 起不来，会退化成 `xfce4-terminal` 里跑 `cat` 的兜底 sink。

## 人机输入协调探测

`input-coordination-probe.py` 单独回答一个问题：agent 的输入和人的输入怎么共存。

agent 走 `xdotool`（XTEST 扩展），人走 VNC 的 RFB 协议——两条不同的代码路径，所以脚本里
内置了一个最小 RFB 客户端来真实扮演"人"，而不是用 `xdotool` 假装。连接时 `shared=1`，
不会把正在观看的人踢掉。

```bash
DISPLAY=:1 python3 tools/cloud-desktop-audit/input-coordination-probe.py            # pointer + gate
DISPLAY=:1 python3 tools/cloud-desktop-audit/input-coordination-probe.py focus      # 需要两个窗口
```

| 探针 | 内容 |
| --- | --- |
| `pointer` | 人的输入是否生效；双方同时写指针会发生什么；人在 agent 拖拽中途插手的后果 |
| `gate` | `AcceptPointerEvents` / `AcceptKeyEvents` 能否在运行时开关，能否只挡人不挡 agent |
| `focus` | 人点一下别的窗口，会不会把 agent 正在打的字截走 |

`focus` 会往当前焦点窗口打字，且需要屏幕上有一个标题以 `SINK|` 开头的窗口和另一个窗口，
所以不在默认集合里，要显式指定。

`gate` 会临时关闭再恢复 `AcceptPointerEvents`；即使中途失败也会在 `finally` 里恢复。

## 端到端示例

`demo-desktop-session.sh` 把本仓库自己的 Electron 应用拉起在云端桌面上，并预置好
todo 文件与 Electron profile，让会话直接从应用界面开始，而不是卡在文件对话框：

```bash
DISPLAY=:1 tools/cloud-desktop-audit/demo-desktop-session.sh --reset
```

预置数据里刻意混了中文、带重音的拉丁字母和纯 ASCII，正好覆盖字体回退和非 ASCII 输入
这两条最容易出问题的路径。脚本最后会打印窗口 id 与几何信息，可以直接交给 computer-use。

## 注意

`input`、`typing`、`settle` 会真的移动鼠标、真的按键。它们会点击屏幕中央附近，因此不要
在有未保存内容的窗口处于焦点时运行。`typing` 与 `settle` 会自己开一个 Chrome 窗口并在
结束时关掉。
