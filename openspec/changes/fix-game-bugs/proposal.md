# 提案：修复三个关键游戏 Bug

## 摘要

修复游戏中三个已知的功能性 Bug，确保玩家进入游戏后能正确看到预设长城、教师端能实时查看各组的建造状态、教师发送鼓励消息能被对应小组的玩家正常接收。

## 问题

### Bug 1：玩家进入游戏看不到预设的长城

**根因**：`GroupRoom` 在 `onCreate` 时加载蓝图并预填充方块状态，但玩家是通过 `LobbyRoom` 的 `SELECT_GROUP` 流程加入游戏的。流程中存在时序错位：`GROUP_CONFIRMED` 消息中携带了 `roomId`，但客户端的 `GroupSelector` 在 `onDone` 回调中只调用了 `setPhase('tutorial')`，并未保存 `roomId` 也没有实际加入任何 `GroupRoom`。玩家直接进入了游戏画面，但 `blockStore` 依然是空的，因为从未连接到 `GroupRoom` 并同步服务端状态。

### Bug 2：教师看到的地图与玩家不一致，无法看到各小组的建造情况

**根因**：`TeacherHUD` 中的 `sendHighlight` 和 `sendEncourage` 函数仅打印 `console.log`，未接入任何 WebSocket 房间连接。教师端虽然调用了 `joinGroupAsTeacher()`（在 `network/client.ts` 中定义），但 `TeacherHUD` 并未实际调用它。因此教师看到的是未连接任何服务端的 `BlockGrid`（空的 `blockStore`），无法获取各组的实时方块状态。

### Bug 3：教师发送鼓励，小组玩家无法接收到

**根因**：同上，`TeacherHUD` 的鼓励按钮只调用本地 `console.log`，未通过 WebSocket 向服务端发送 `TEACHER_ENCOURAGE` 消息。同时，客户端在 `GroupRoom` 的 `onStateChange` 或消息监听中，也缺少对 `TEACHER_ENCOURAGE` 消息的处理逻辑（未在 VoxelScene/HUD 层渲染鼓励动画）。

## 目标

- 玩家进入游戏后，能立即看到服务端预设的长城（预填充方块），蓝图虚影正确显示缺失部分。
- 教师端连接到所有三个 `GroupRoom`，能实时看到各组的方块建造状态。
- 教师发送鼓励消息后，对应小组的所有玩家能收到并显示动画。

## 非目标

- 改变现有的游戏流程（选角 → 选组 → 教程 → 游戏）。
- 修改服务端蓝图加载逻辑（服务端已正确实现）。
- 添加新功能（高亮动画、粒子效果改进等已完成任务不在此次范围）。

## 动机

这三个 Bug 均属于网络连接层的"断线"问题：服务端逻辑已正确实现，但客户端未建立实际连接或未监听正确的消息，导致功能完全失效。修复这些 Bug 是游戏可正常运行的前提条件。

## 成功标准

1. 玩家完成选组并通过教程后，`blockStore` 中能显示来自 `GroupRoom` 的预填充方块（约 70% 蓝图方块）。
2. 教师端打开 `/teacher` 页面后，3D 场景中能实时渲染各组的方块。
3. 教师点击鼓励按钮后，对应小组的玩家屏幕上出现全屏 emoji 爆发动画，持续约 2 秒。
