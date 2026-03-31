# 任务清单：修复三个关键游戏 Bug

## Bug 1：玩家进入游戏看不到预设的长城

- [x] **B1.1** 修改 `client/src/store/blockStore.ts`：新增 `setBlocks(entries: Map<string, { type: BlockType }>) => void` 方法，批量覆盖 `blocks` map（不写入 `history`）。

- [x] **B1.2** 修改 `client/src/components/GroupSelector.tsx`：将 `onDone` prop 的签名从 `(groupId: number) => void` 改为 `(groupId: number, roomId: string | null) => void`，在 `confirmedHandler` 中把 `data.roomId` 透传给 `onDone`。

- [x] **B1.3** 修改 `client/src/App.tsx`：
  - 在 `GroupSelector.onDone` 中接收 `roomId`，保存到 state（`groupRoomId: string | null`）
  - `phase === 'tutorial'` 阶段开始时调用 `joinGroupById(roomId)` 连接到对应 `GroupRoom`（使用 `useEffect` 或提前连接），获得 `groupRoom` 实例
  - 为 `groupRoom` 注册 `onStateChange`：遍历 `state.blocks`，调用 `blockStore.setBlocks(...)` 同步所有方块
  - 把 `groupRoom` 通过 React Context 或 prop 向下传递到 `VoxelScene` → `InputController`

- [x] **B1.4** 修改 `client/src/components/VoxelScene.tsx`：接受可选的 `groupRoom` prop，透传给 `<InputController>`。

- [x] **B1.5** 修改 `client/src/components/InputController.tsx`：若有 `groupRoom`，将 `PLACE_BLOCK`/`DESTROY_BLOCK` 消息通过 `groupRoom.send(...)` 发送到服务端，不再只调用本地 `blockStore`。

## Bug 2：教师看到的地图与玩家不一致

- [x] **B2.1** 新增 `client/src/components/TeacherBlockGrid.tsx`：接受 `blocks: Map<string, { type: number }>` prop，复制 `BlockGrid.tsx` 的 `InstancedMesh` 渲染逻辑，但直接使用传入的 `blocks` prop，不读取全局 `blockStore`。

- [x] **B2.2** 修改 `client/src/components/TeacherHUD.tsx`：
  - 在 `useEffect` 中调用 `joinGroupAsTeacher()`（从 `network/client.ts` 导入），获得 3 个 Room 实例，存入 `useRef`
  - 为每个 Room 注册 `onStateChange(state => ...)`，将各组方块解析后存入 React state `groupBlocks: Record<number, Map<string, { type: number }>>`
  - 将主 3D 视图中的 `<BlockGrid />` 替换为 `<TeacherBlockGrid blocks={groupBlocks[selectedGroup] ?? new Map()} />`
  - minimap 卡片显示每组的方块数量（`groupBlocks[g]?.size ?? 0`）

## Bug 3：教师发送鼓励，玩家无法接收

- [x] **B3.1** 修改 `client/src/components/TeacherHUD.tsx` 中的 `sendEncourage` 函数：找到 `selectedGroup` 对应的 Room 实例，调用 `rooms.current[selectedGroup - 1].send('TEACHER_ENCOURAGE', { groupId: selectedGroup, message: msg })`。

- [x] **B3.2** 新增 `client/src/components/EncourageOverlay.tsx`：接受 `message: 'star' | 'heart' | 'thumbsup' | null` prop，当 `message` 非 null 时渲染全屏居中的大号 emoji（⭐/❤️/👍），通过 CSS `@keyframes` 动画在 2 秒内淡出，动画结束后调用 `onDone` 回调清空消息。

- [x] **B3.3** 修改 `client/src/App.tsx`：
  - 新增 state `encourageMessage: 'star' | 'heart' | 'thumbsup' | null`
  - `GroupRoom` 连接后注册 `room.onMessage('TEACHER_ENCOURAGE', (data) => setEncourageMessage(data.message))`
  - 将 `encourageMessage` 和清空回调传给 `VoxelScene`

- [x] **B3.4** 修改 `client/src/components/VoxelScene.tsx`：接受 `encourageMessage` 和 `onEncourageDone` props，在 VoxelScene 容器 div 内渲染 `<EncourageOverlay message={encourageMessage} onDone={onEncourageDone} />`。
