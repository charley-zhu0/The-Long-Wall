# 任务清单：玩家角色创建与手动分组选择

## 第一阶段 — 服务端协议调整

- [x] **1.1** 修改 `server/src/schema.ts`：在 `PlayerState` 中新增 `@type('string') username: string = ''` 和 `@type('uint8') avatarId: number = 0` 两个字段；在 `LobbyState` 中新增 `group1Count`、`group2Count`、`group3Count` 三个 `@type('uint8')` 字段用于实时人数广播。

- [x] **1.2** 修改 `server/src/rooms/LobbyRoom.ts`：删除 `assignGroup()` 方法及 `onJoin` 中的自动分配逻辑（移除 `GROUP_ASSIGNED` 消息发送）；新增 `profiles: Map<string, { username: string; avatarId: number }>` 私有字段；新增 `broadcastGroupCounts()` 辅助方法，将三组人数广播为 `LOBBY_STATE` 消息。

- [x] **1.3** 在 `LobbyRoom` 中注册 `SET_PROFILE` 消息处理器：接收 `{ username: string, avatarId: number }`，做输入截断（username ≤ 8字符，avatarId clamp 0–7），存入 `profiles` Map，然后调用 `broadcastGroupCounts()`。

- [x] **1.4** 在 `LobbyRoom` 中注册 `SELECT_GROUP` 消息处理器：验证 groupId 合法（1/2/3）且对应组人数 < 4；若已满则向该客户端回复 `GROUP_FULL`；否则更新 `playerGroups` 和 `groupPlayerCounts`，向该客户端回复 `GROUP_CONFIRMED`（含 groupId、roomId、username、avatarId），调用 `broadcastGroupCounts()`。

- [x] **1.5** 修改 `LobbyRoom.onJoin`：移除自动分组代码，改为仅调用 `broadcastGroupCounts()` 广播初始人数。修改 `LobbyRoom.onLeave`：在原有计数递减逻辑末尾删除 `profiles` 中该客户端的记录，并调用 `broadcastGroupCounts()`。

- [x] **1.6** 修改 `server/src/rooms/GroupRoom.ts` 的 `onJoin` 方法：从 `options` 读取 `username`（默认 `'玩家'`）和 `avatarId`（默认 0），赋值给新建的 `PlayerState`；根据 `avatarId` 用常量数组 `AVATAR_COLORS` 映射 `avatarColor`（与客户端保持一致）。

## 第二阶段 — 客户端数据层

- [x] **2.1** 修改 `client/src/store/playerStore.ts`：在 `RemotePlayer` 接口中新增 `username: string` 和 `avatarId: number` 字段；在 Store state 中新增 `localUsername: string | null`、`localAvatarId: number | null`；新增 `setLocalProfile(username: string, avatarId: number)` action 同时更新两个字段。

- [x] **2.2** 修改 `client/src/network/client.ts`：`joinLobby` 函数签名改为接受可选参数 `options?: Record<string, unknown>`，透传给 `joinOrCreate`；新增 `joinGroupById(roomId: string): Promise<Room>` 函数，调用 `getClient().joinById(roomId)`。

## 第三阶段 — 角色创建界面

- [x] **3.1** 新增 `client/src/components/CharacterCreator.tsx`：组件接受 `onDone: (lobbyRoom: Room) => void` prop。渲染卡通标题、用户名输入框（`maxLength={8}`，placeholder="输入你的名字"）、8个头像按钮（彩色圆形卡通脸，纯CSS/内联SVG实现，无外部图片依赖）、"确认"按钮（用户名非空且已选头像才可点击）。

- [x] **3.2** 实现 `CharacterCreator` 的确认逻辑：点击确认时调用 `playerStore.setLocalProfile(username, avatarId)`，然后调用 `joinLobby()` 建立 WebSocket 连接，成功后向 lobbyRoom 发送 `SET_PROFILE` 消息，最后调用 `onDone(lobbyRoom)`。

- [x] **3.3** 为 `CharacterCreator` 添加幼儿友好样式：大字号（≥20px）、鲜艳色彩、触控友好按钮（min 48×48px）、选中头像高亮边框（3px solid 对应头像颜色），使用现有项目 CSS 变量或 Tailwind/内联样式保持风格一致。

## 第四阶段 — 分组选择界面

- [x] **4.1** 新增 `client/src/components/GroupSelector.tsx`：组件接受 `lobbyRoom: Room`、`onDone: (groupId: number) => void` prop。定义三组常量：`GROUP_NAMES = {1:'太阳组', 2:'大树组', 3:'小花组'}`，`GROUP_ICONS = {1:'☀️', 2:'🌳', 3:'🌸'}`，`GROUP_COLORS = {1:'#FFD93D', 2:'#6BCB77', 3:'#FF6FB7'}`。

- [x] **4.2** 实现 `GroupSelector` 实时人数订阅：在 `useEffect` 中注册 `lobbyRoom.onMessage('LOBBY_STATE', handler)` 监听器，将 `groupCounts` 存入本地 state；组件卸载时移除监听器。

- [x] **4.3** 实现 `GroupSelector` 组卡片渲染：三组横排（或竖排，取决于屏幕宽度）展示，每张卡片显示图标、组名、"n / 4 人"；已满（count >= 4）的卡片灰显、`pointer-events: none`，未满的卡片可点击并有 hover 高亮效果。

- [x] **4.4** 实现 `GroupSelector` 选组确认逻辑：点击未满的组后展示确认对话框（显示"确定加入[组名]吗？"）；确认后向 `lobbyRoom` 发送 `SELECT_GROUP`；注册 `GROUP_CONFIRMED` 和 `GROUP_FULL` 消息监听器；收到 `GROUP_CONFIRMED` 时存储 `localGroupId` 到 playerStore 并调用 `onDone(groupId)`；收到 `GROUP_FULL` 时关闭对话框并提示组已满。

## 第五阶段 — 接入主流程

- [x] **5.1** 修改 `client/src/App.tsx`：引入 `CharacterCreator` 和 `GroupSelector`；将 `tutorialDone` 状态改为 `phase: 'character' | 'group' | 'tutorial' | 'game'`；新增 `lobbyRoom: Room | null` 状态；根据阶段渲染对应组件：`character` → `CharacterCreator`，`group` → `GroupSelector`，`tutorial` → `TutorialModal`，`game` → `VoxelScene`。

- [x] **5.2** 修改 `client/src/components/VoxelScene.tsx` 或 `PlayerAvatar` 相关代码：在渲染远程玩家悬浮名称标签时，将 `player.username` 显示为标签文字（替换或补充原来仅用颜色区分的方式）。

## 第六阶段 — 验证

- [x] **6.1** 手动测试：打开3个浏览器标签，依次完成角色创建和分组选择，验证三组人数实时更新正确，已满的组正确锁定，第4个玩家加入同一组后该组进入灰显状态。

- [x] **6.2** 验证教师路由（`/teacher`）未受影响：教师直接进入 `TeacherHUD`，不经过角色创建和分组流程。
