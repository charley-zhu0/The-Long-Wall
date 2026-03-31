# 设计方案：修复三个关键游戏 Bug

## 整体策略

三个 Bug 的共同模式是：服务端逻辑已正确实现，客户端未建立实际的 WebSocket 连接或未监听正确消息。修复策略是在客户端正确时序处建立连接、同步状态、转发消息。

---

## Bug 1：玩家进入游戏看不到预设的长城

### 问题定位

**文件**：`client/src/components/GroupSelector.tsx`、`client/src/App.tsx`

流程缺口：
- `LobbyRoom` 的 `GROUP_CONFIRMED` 消息（第 30-33 行）把 `roomId` 传给客户端
- `GroupSelector` 的 `confirmedHandler`（第 30-33 行）收到 `roomId` 后，只调用 `onDone(data.groupId)` ，`roomId` 被丢弃
- `App.tsx` 的 `GroupSelector.onDone` 只调用 `setPhase('tutorial')`，没有保存 `roomId` 也没有连接 `GroupRoom`
- `VoxelScene` 渲染时 `blockStore` 仍为空

### 修复方案

**GroupSelector.tsx**：
- `Props` 中的 `onDone` 签名由 `(groupId: number) => void` 改为 `(groupId: number, roomId: string | null) => void`
- `confirmedHandler` 里把 `roomId` 透传给 `onDone`

**App.tsx**：
- 新增状态 `groupRoomId: string | null`
- `GroupSelector.onDone` 中保存 `roomId` 并调用 `joinGroupById(roomId)` 连接到 `GroupRoom`
- 在 `onStateChange` 回调里把 `state.blocks`（`MapSchema<BlockState>`）同步到 `blockStore`：对每个条目调用 `placeBlock(x, y, z, block.blockType)`
- 把 `groupRoom` 实例通过 React Context 或 props 向下传递，供 `InputController` 发送 `PLACE_BLOCK`/`DESTROY_BLOCK` 消息

**blockStore.ts**：
- 新增 `setBlocks(blocks: Map<string, {type: BlockType}>): void` 方法，用于批量初始化状态（替代逐条 `placeBlock` 调用），不写入 `history`

### 数据流

```
GroupRoom(server) ──onStateChange──> App.tsx ──setBlocks──> blockStore ──> BlockGrid renders
```

---

## Bug 2：教师看到的地图与玩家不一致

### 问题定位

**文件**：`client/src/components/TeacherHUD.tsx`

- 教师视图使用了 `<BlockGrid />`，而 `BlockGrid` 读取 `blockStore`
- `TeacherHUD` 未调用 `joinGroupAsTeacher()`，`blockStore` 为空
- 教师端需要同时监听三个 `GroupRoom` 的状态，但 `blockStore` 是单一全局 store，无法同时存储三组数据

### 修复方案

**TeacherHUD.tsx**：
- 在 `useEffect` 中调用 `joinGroupAsTeacher()`，获得 3 个 `Room` 实例
- 为每个 `Room` 注册 `onStateChange`，将各组方块数据存入本地 React state（`groupBlocks: Record<number, Map<string, {type: number}>>`）
- 渲染时，根据 `selectedGroup` 选取对应的 map，构建 Three.js 场景或使用一个轻量的每组预览组件
- 由于教师需要同时查看三组，minimap 区域显示各组方块数量和简略状态（不必渲染三个完整 3D 场景）
- 主 3D 视图中展示 `selectedGroup` 对应的方块（将选中组的 map 写入一个临时的局部 state，传给一个自包含的 `TeacherBlockGrid` 组件，避免污染全局 `blockStore`）

**新增组件**：`TeacherBlockGrid.tsx`（或在 `TeacherHUD.tsx` 内内联）
- 接收 `blocks: Map<string, {type: number}>` prop，独立于 `blockStore`，直接用 `useMemo` + `useEffect` 渲染 `InstancedMesh`

### 数据流

```
joinGroupAsTeacher() ──> [Room1, Room2, Room3]
  each Room.onStateChange ──> groupBlocks[groupId] = Map<key, BlockEntry>
  selectedGroup ──> TeacherBlockGrid(blocks=groupBlocks[selectedGroup])
```

---

## Bug 3：教师发送鼓励，玩家无法接收

### 问题定位

**TeacherHUD.tsx**：
- `sendEncourage` 仅有 `console.log`，未发送 WebSocket 消息

**客户端（VoxelScene / HUD）**：
- 没有监听 `TEACHER_ENCOURAGE` 消息
- 没有鼓励动画组件（或未接入）

### 修复方案

**TeacherHUD.tsx**：
- 在 Bug 2 修复中已获得 3 个 `Room` 实例，存入 `rooms` ref
- `sendEncourage(msg)` 中，找到 `selectedGroup` 对应的 room，调用 `room.send('TEACHER_ENCOURAGE', { groupId: selectedGroup, message: msg })`

**App.tsx**（玩家端）：
- 在连接 `GroupRoom` 后，注册 `room.onMessage('TEACHER_ENCOURAGE', handler)`
- handler 更新 React state `encourageAnimation: { message: string; key: number } | null`
- 把 `encourageAnimation` 传入 `VoxelScene`，或通过简单的全局信号（Zustand action）触发

**新增组件 / 修改 VoxelScene.tsx**：
- 在 `VoxelScene`（或其外层 div）覆盖一个 `EncourageOverlay` 组件
- 收到鼓励信号时显示全屏 emoji（⭐/❤️/👍），CSS `animation` 2 秒后消失

### 数据流

```
Teacher clicks ⭐ ──room.send('TEACHER_ENCOURAGE')──> server GroupRoom
  ──broadcast──> all clients in group
  ──onMessage('TEACHER_ENCOURAGE')──> App.tsx state ──> EncourageOverlay renders
```

---

## 受影响文件

| 文件 | 变更类型 | 说明 |
|---|---|---|
| `client/src/App.tsx` | 修改 | 连接 GroupRoom，同步 blockStore，传递 groupRoom 实例，监听 TEACHER_ENCOURAGE |
| `client/src/components/GroupSelector.tsx` | 修改 | onDone 签名加 roomId，transparently 传递 roomId |
| `client/src/store/blockStore.ts` | 修改 | 新增 setBlocks 批量初始化方法 |
| `client/src/components/TeacherHUD.tsx` | 修改 | 接入 joinGroupAsTeacher，监听各组 onStateChange，sendEncourage 发送 WebSocket |
| `client/src/components/TeacherBlockGrid.tsx` | 新增 | 接受 blocks prop 独立渲染，不依赖全局 blockStore |
| `client/src/components/EncourageOverlay.tsx` | 新增 | 全屏 emoji 动画组件，2 秒后自动消失 |
| `client/src/components/VoxelScene.tsx` | 修改 | 接受 encourageMessage prop，渲染 EncourageOverlay |
