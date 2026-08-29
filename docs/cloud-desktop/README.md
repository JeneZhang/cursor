# Cursor Cloud Computer：现状与升级方案

针对 Cursor Cloud Agent 的**云端桌面**（VNC + XFCE 的图形会话）和 **computer-use**
（agent 用来点击、打字、截图、录屏的那套工具）做的一次完整测量与改造设计。

| 文档 | 内容 |
| --- | --- |
| [`current-state.md`](./current-state.md) | 现状：架构怎么搭的、computer-use / 录屏怎么实现的，以及八组实测数据 |
| [`upgrade-plan.md`](./upgrade-plan.md) | 升级方案：按优先级排的改造项，每项含根因、改法、预期收益、验证方式、风险 |
| [`../../tools/cloud-desktop-audit/`](../../tools/cloud-desktop-audit/) | 产生这些数据的脚本，以及一个可复现的端到端桌面示例 |

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
