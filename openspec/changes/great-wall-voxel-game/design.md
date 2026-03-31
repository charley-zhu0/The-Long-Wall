# 设计方案：长城像素建模多人协作游戏

## 架构总览

```
┌─────────────────────────────────────────────────────────┐
│                      浏览器客户端                         │
│  ┌───────────────────┐    ┌───────────────────────────┐ │
│  │  幼儿客户端 (×12)  │    │  教师客户端               │ │
│  │  React + R3F      │    │  React + R3F + 飞行相机    │ │
│  │  触屏/鼠标输入     │    │  小组总览面板              │ │
│  └────────┬──────────┘    └───────────┬───────────────┘ │
└───────────┼───────────────────────────┼─────────────────┘
            │ Socket.IO (WebSocket)      │
┌───────────▼───────────────────────────▼─────────────────┐
│                 Node.js + Colyseus 服务端                 │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────┐ │
│  │  大厅房间     │  │  小组房间    │  │  教师房间      │ │
│  │  (匹配与分组) │  │  (×3，状态  │  │  (只读广播)    │ │
│  │              │  │   权威服务器)│  │                │ │
│  └──────────────┘  └──────────────┘  └────────────────┘ │
│                      内存状态存储                          │
└─────────────────────────────────────────────────────────┘
```

## 技术栈

| 层级 | 选型 | 理由 |
|---|---|---|
| 客户端渲染 | React + React Three Fiber (R3F) + Three.js | 纯Web，无需安装；3D生态丰富 |
| 状态管理 | Zustand | 轻量，与R3F配合良好 |
| 实时网络 | Colyseus 0.15（客户端：`colyseus.js`） | 内置房间/Schema/增量同步，专为多人游戏设计 |
| 服务端运行时 | Node.js 20 + Colyseus Server | 与客户端同语言；有状态房间模型 |
| 体素渲染 | 基于 Three.js `InstancedMesh` 的自定义区块系统 | 高效渲染数千方块 |
| 构建工具 | Vite + TypeScript | HMR极速，ESM原生支持 |
| 触控手势 | `@use-gesture/react` | 区分点击与长按触屏操作 |

## 数据结构

```typescript
// 服务端权威状态（Colyseus Schema，每个小组房间一份）
class BlockState extends Schema {
  @type("uint8") blockType: number; // 0=空气, 1=灰砖, 2=垛口, 3=烽火台
}

class PlayerState extends Schema {
  @type("string") id: string;
  @type("uint8")  groupId: number;   // 1 | 2 | 3
  @type("float32") x: number;
  @type("float32") y: number;
  @type("float32") z: number;
  @type("string")  avatarColor: string;
}

class GroupRoomState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: BlockState  }) blocks  = new MapSchema<BlockState>();
  // key编码格式：`${x},${y},${z}`（各轴16位有符号整数范围）
}
```

## 核心组件

### 客户端

| 组件 | 职责 |
|---|---|
| `<VoxelScene>` | R3F画布；渲染 `<BlockGrid>`、`<BlueprintOverlay>`、`<PlayerAvatars>` |
| `<BlockGrid>` | 从Colyseus状态读取方块数据；按方块类型渲染 `InstancedMesh` |
| `<BlueprintOverlay>` | 目标长城形状的半透明虚影网格；高亮标记缺失位置 |
| `<PlayerAvatar>` | 每位玩家当前位置的简单方块头像 + 名称标签 |
| `<InputController>` | 统一输入处理：PC端WASD+鼠标；触屏端拖拽/点击/长按 |
| `<TeacherHUD>` | 飞行相机控制、小组选择下拉菜单、发送高亮提示按钮 |
| `<TutorialModal>` | 游戏开始前展示的视频播放器 + 步骤图示 |

### 服务端

| 房间 | 职责 |
|---|---|
| `LobbyRoom` | 接受最多12名玩家，分配小组ID，开始时创建3个 `GroupRoom` 实例 |
| `GroupRoom` | 单小组4人工作区的权威状态；验证方块操作；广播增量更新 |
| 教师加入 | 教师以观察者身份加入全部3个 `GroupRoom`；服务端向各小组转发高亮消息 |

## 网络消息协议

```typescript
// 客户端 → 服务端
{ type: "PLACE_BLOCK",   x, y, z, blockType }
{ type: "DESTROY_BLOCK", x, y, z }
{ type: "MOVE",          x, y, z }

// 服务端 → 客户端（Colyseus状态变更自动增量同步）
// 仅教师相关消息：
{ type: "TEACHER_HIGHLIGHT", groupId, x, y, z }
{ type: "TEACHER_ENCOURAGE", groupId, message: "star" | "heart" | "thumbsup" }
```

## 地图与蓝图格式

长城模板以JSON体素地图格式存储：

```json
{
  "name": "great-wall-section-1",
  "size": { "x": 20, "y": 8, "z": 6 },
  "blocks": [
    { "x": 0, "y": 0, "z": 0, "type": 1 },
    ...
  ]
}
```

服务端加载时，将每个 `GroupRoom` 预填充为部分破损状态（随机缺口）。蓝图遮罩层展示完整目标形态。悬空检测在服务端运行：任何下方无实体邻居的方块将触发"结构缺失"警告消息发送给该小组。

## 第一阶段范围（基础框架）

第一阶段仅实现本地单机场景（暂无联网）：

1. 使用TypeScript搭建Vite + React + R3F项目骨架。
2. 无限平铺地面；基于射线检测的鼠标放置/销毁方块。
3. 仅灰砖类型的 `InstancedMesh` 渲染。
4. 相机：PC端轨道控制 + 触屏平移/缩放。
5. 最简HUD：方块计数 + 撤销上一步操作按钮。

联机功能（第二阶段）、分组/教师UI（第三阶段）、美术打磨（第四阶段）在后续变更中推进。

## 目标文件结构

```
/
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── VoxelScene.tsx
│   │   │   ├── BlockGrid.tsx
│   │   │   ├── BlueprintOverlay.tsx
│   │   │   ├── PlayerAvatar.tsx
│   │   │   ├── InputController.tsx
│   │   │   ├── TeacherHUD.tsx
│   │   │   └── TutorialModal.tsx
│   │   ├── store/          # Zustand状态管理
│   │   ├── network/        # Colyseus客户端封装
│   │   ├── maps/           # JSON蓝图地图
│   │   └── main.tsx
│   ├── index.html
│   └── vite.config.ts
├── server/
│   ├── src/
│   │   ├── rooms/
│   │   │   ├── LobbyRoom.ts
│   │   │   └── GroupRoom.ts
│   │   └── index.ts
│   └── tsconfig.json
└── package.json            # monorepo根（npm workspaces）
```
