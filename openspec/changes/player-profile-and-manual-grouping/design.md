# 设计方案：玩家角色创建与手动分组选择

## 架构总览

本次变更涉及客户端新增两个界面组件（角色创建屏和分组选择屏），服务端 `LobbyRoom` 协议调整（删除自动分组，增加手动选组消息），以及 Schema / Store 扩展（存储用户名和头像ID）。

```
流程：
  进入 App
    ↓
  CharacterCreator（角色创建屏）
    → 输入用户名 + 选择头像
    → joinLobby() 并发送 SET_PROFILE
    ↓
  GroupSelector（分组选择屏）
    → 订阅 LOBBY_STATE（三组实时人数）
    → 点击未满的组 → 发送 SELECT_GROUP
    → 等待服务端回复 GROUP_CONFIRMED
    ↓
  TutorialModal → VoxelScene（原有流程）
```

## 客户端变更

### 1. 数据结构扩展

**`client/src/store/playerStore.ts`**

扩展 `RemotePlayer` 接口：
```ts
export interface RemotePlayer {
  id: string
  groupId: number
  x: number; y: number; z: number
  avatarColor: string
  username: string    // 新增
  avatarId: number    // 新增：0–7 对应预设头像
}
```

新增本地玩家档案状态：
```ts
interface PlayerStoreState {
  // ...现有字段...
  localUsername: string | null
  localAvatarId: number | null
  setLocalProfile: (username: string, avatarId: number) => void
}
```

### 2. 新增组件：`CharacterCreator.tsx`

**路径**：`client/src/components/CharacterCreator.tsx`

界面包含：
- 标题："创建你的角色"（中文）
- 文本输入框：用户名（必填，最多8个字符，支持中文/英文）
- 头像网格：8个预设卡通头像（用不同颜色+形状的SVG或CSS渲染，无需图片资源）
  - 头像 0–7：8种颜色组合（红、橙、黄、绿、青、蓝、紫、粉），圆形卡通脸
- "确认"按钮：用户名非空且已选头像时才可点击

卡通头像实现方案（纯CSS/SVG，无外部资源依赖）：
```tsx
// 每个头像是一个带颜色的圆形 + 简单五官
const AVATAR_COLORS = ['#FF6B6B','#FF9F43','#FFD93D','#6BCB77','#4ECDC4','#4D96FF','#9B59B6','#FF6FB7']
```

交互逻辑：
1. 用户完成输入并点击"确认"
2. 调用 `playerStore.setLocalProfile(username, avatarId)`
3. 调用 `joinLobby()` 建立 WebSocket 连接（返回 `lobbyRoom`）
4. 发送 `lobbyRoom.send('SET_PROFILE', { username, avatarId })`
5. 通知父组件进入下一阶段

### 3. 新增组件：`GroupSelector.tsx`

**路径**：`client/src/components/GroupSelector.tsx`

界面包含：
- 标题："选择你的小组"
- 三个组卡片，固定顺序：太阳组 ☀️、大树组 🌳、小花组 🌸
  - 显示：组名、当前人数 / 最大人数（如 "2 / 4"）
  - 状态：可选（可点击，hover 高亮）/ 已满（灰显，`cursor: not-allowed`，禁止点击）
- 点击未满的组 → 显示确认对话框 → 点击"加入"
- 等待服务端回复期间显示加载状态

实时人数数据来源：
- 监听 `lobbyRoom.onMessage('LOBBY_STATE', handler)`
- 服务端在玩家加入/离开时广播 `{ groupCounts: { 1: n, 2: n, 3: n } }`

交互逻辑：
1. 用户点击未满的组
2. 发送 `lobbyRoom.send('SELECT_GROUP', { groupId })`
3. 监听 `lobbyRoom.onMessage('GROUP_CONFIRMED', handler)`
4. 收到确认后存储 `localGroupId`，通知父组件进入游戏

组号与组名映射：
```ts
const GROUP_NAMES: Record<number, string> = { 1: '太阳组', 2: '大树组', 3: '小花组' }
const GROUP_ICONS: Record<number, string> = { 1: '☀️', 2: '🌳', 3: '🌸' }
```

### 4. 修改 `App.tsx`

增加三阶段状态机：
```ts
type AppPhase = 'character' | 'group' | 'tutorial' | 'game'
```

渲染逻辑：
```tsx
if (isTeacher) return <TeacherHUD />
if (phase === 'character') return <CharacterCreator onDone={() => setPhase('group')} />
if (phase === 'group') return <GroupSelector lobbyRoom={lobbyRoom} onDone={() => setPhase('tutorial')} />
// tutorial + game 保持原有逻辑
```

### 5. 修改 `network/client.ts`

新增携带 profile 的 joinLobby：
```ts
export async function joinLobby(options?: { username?: string; avatarId?: number }): Promise<Room> {
  return getClient().joinOrCreate('lobby', options ?? {})
}
```

新增从 roomId 直接加入（用于手动选组后加入 GroupRoom）：
```ts
export async function joinGroupById(roomId: string): Promise<Room> {
  return getClient().joinById(roomId)
}
```

## 服务端变更

### 1. 修改 `server/src/schema.ts`

扩展 `PlayerState`：
```ts
export class PlayerState extends Schema {
  @type('string') id: string = ''
  @type('uint8')  groupId: number = 0
  @type('float32') x: number = 0
  @type('float32') y: number = 0
  @type('float32') z: number = 0
  @type('string')  avatarColor: string = '#ffffff'
  @type('string')  username: string = ''    // 新增
  @type('uint8')   avatarId: number = 0     // 新增
}
```

新增 `LobbyPlayerState`（用于大厅广播人数）：
```ts
export class LobbyState extends Schema {
  @type('uint8') playerCount: number = 0
  @type('uint8') group1Count: number = 0
  @type('uint8') group2Count: number = 0
  @type('uint8') group3Count: number = 0
}
```

### 2. 修改 `server/src/rooms/LobbyRoom.ts`

**删除**：`assignGroup()` 自动分组方法，`onJoin` 中的自动分配逻辑，`GROUP_ASSIGNED` 消息发送。

**新增消息处理**：

```ts
// 玩家设置个人资料（加入后第一步）
this.onMessage('SET_PROFILE', (client, data: { username: string; avatarId: number }) => {
  this.profiles.set(client.sessionId, {
    username: data.username.slice(0, 8),
    avatarId: Math.min(7, Math.max(0, data.avatarId))
  })
  // 广播当前人数状态（不含 profile 数据，保护隐私）
  this.broadcastGroupCounts()
})

// 玩家请求加入某组
this.onMessage('SELECT_GROUP', async (client, data: { groupId: number }) => {
  const groupId = data.groupId
  if (![1, 2, 3].includes(groupId)) return
  if ((this.groupPlayerCounts.get(groupId) ?? 0) >= 4) {
    client.send('GROUP_FULL', { groupId })
    return
  }
  
  // 分配组别
  this.playerGroups.set(client.sessionId, groupId)
  this.groupPlayerCounts.set(groupId, (this.groupPlayerCounts.get(groupId) ?? 0) + 1)
  this.state.playerCount++
  
  // 获取对应 GroupRoom 的 roomId（若游戏已开始）
  const roomId = this.groupRoomIds.get(groupId)
  const profile = this.profiles.get(client.sessionId) ?? { username: '玩家', avatarId: 0 }
  
  client.send('GROUP_CONFIRMED', { groupId, roomId: roomId ?? null, ...profile })
  this.broadcastGroupCounts()
})
```

**`broadcastGroupCounts`** 辅助方法：
```ts
private broadcastGroupCounts() {
  this.broadcast('LOBBY_STATE', {
    groupCounts: Object.fromEntries(this.groupPlayerCounts)
  })
}
```

**`onJoin` 修改**：玩家加入时只广播初始人数，不做分配：
```ts
onJoin(client: Client, options: { isTeacher?: boolean }) {
  if (!options.isTeacher) {
    // 仅广播当前状态，等待 SET_PROFILE 和 SELECT_GROUP
    this.broadcastGroupCounts()
  }
}
```

**`onLeave` 修改**：离开时需广播最新人数：
```ts
onLeave(client: Client) {
  const groupId = this.playerGroups.get(client.sessionId)
  if (groupId != null) {
    this.groupPlayerCounts.set(groupId, Math.max(0, (this.groupPlayerCounts.get(groupId) ?? 1) - 1))
    this.playerGroups.delete(client.sessionId)
    this.state.playerCount = Math.max(0, this.state.playerCount - 1)
  }
  this.profiles.delete(client.sessionId)
  this.broadcastGroupCounts()
}
```

**新增 `profiles` Map**：
```ts
private profiles: Map<string, { username: string; avatarId: number }> = new Map()
```

### 3. 修改 `server/src/rooms/GroupRoom.ts`

`onJoin` 中读取玩家资料并存入 `PlayerState`：
```ts
onJoin(client: Client, options: { groupId: number; isTeacher?: boolean; username?: string; avatarId?: number }) {
  // ...现有逻辑...
  const player = new PlayerState()
  player.id = client.sessionId
  player.groupId = options.groupId
  player.username = options.username ?? '玩家'
  player.avatarId = options.avatarId ?? 0
  // avatarColor 由 avatarId 映射（与客户端一致）
  const AVATAR_COLORS = ['#FF6B6B','#FF9F43','#FFD93D','#6BCB77','#4ECDC4','#4D96FF','#9B59B6','#FF6FB7']
  player.avatarColor = AVATAR_COLORS[player.avatarId] ?? '#ffffff'
  this.state.players.set(client.sessionId, player)
}
```

## 客户端 PlayerAvatar 显示

**`client/src/components/BlockGrid.tsx` 或 `PlayerAvatar.tsx`** 中，RemotePlayer 的渲染需使用 `avatarColor` 作为颜色，悬浮名称标签显示 `username`。

现有 `avatarColor` 字段已在 `PlayerState` schema 中定义并在客户端使用，只需确保 `username` 也同步渲染。

## 新 WebSocket 消息汇总

| 消息 | 方向 | 描述 |
|---|---|---|
| `SET_PROFILE` | client→server | `{username: string, avatarId: number}` |
| `SELECT_GROUP` | client→server | `{groupId: 1\|2\|3}` |
| `LOBBY_STATE` | server→broadcast | `{groupCounts: {1:n, 2:n, 3:n}}` |
| `GROUP_CONFIRMED` | server→client | `{groupId, roomId, username, avatarId}` |
| `GROUP_FULL` | server→client | `{groupId}` — 组已满，选组失败 |

**删除**：`GROUP_ASSIGNED`（原自动分组消息）

## 文件变更清单

| 文件 | 操作 | 说明 |
|---|---|---|
| `client/src/App.tsx` | 修改 | 增加 `character` / `group` 阶段状态机 |
| `client/src/components/CharacterCreator.tsx` | 新增 | 角色创建界面 |
| `client/src/components/GroupSelector.tsx` | 新增 | 分组选择界面 |
| `client/src/store/playerStore.ts` | 修改 | 新增 `username`、`avatarId`、`setLocalProfile` |
| `client/src/network/client.ts` | 修改 | `joinLobby` 接受 options，新增 `joinGroupById` |
| `server/src/schema.ts` | 修改 | `PlayerState` 新增 `username`/`avatarId`；`LobbyState` 新增三组人数字段 |
| `server/src/rooms/LobbyRoom.ts` | 修改 | 删除自动分组，新增 `SET_PROFILE`/`SELECT_GROUP` 消息处理 |
| `server/src/rooms/GroupRoom.ts` | 修改 | `onJoin` 读取 `username`/`avatarId` 并写入 `PlayerState` |
