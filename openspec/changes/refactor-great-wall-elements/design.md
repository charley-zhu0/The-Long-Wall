# 设计方案：重构长城元素为单一正方体

## 1. 整体架构变更

本次重构不涉及网络、房间逻辑、UI 路由等，仅改动以下层面：

| 层面 | 变更内容 |
|---|---|
| 客户端 - 几何体 | 删除 `blockGeometries.ts` 中的自定义几何体函数 |
| 客户端 - 渲染 | `BlockGrid.tsx` 只保留 1 种 `InstancedMesh`（BoxGeometry 1×1×1） |
| 客户端 - 状态 | `blockStore` 的 `BlockType` 简化为 `1`（单值） |
| 客户端 - 贴图 | 删除 `merlon.png`、`tower.png`；保留或替换 `brick_gray.png` |
| 服务端 - 蓝图 | 新建 `server/src/maps/section-1.json`，内容严格按 `game.md` 三视图 |
| 服务端 - 蓝图加载 | `LobbyRoom.ts` 中加载逻辑保持不变，蓝图块类型统一为 `1` |

---

## 2. 客户端变更详情

### 2.1 blockStore (`client/src/store/blockStore.ts`)

```ts
// 变更前
export type BlockType = 1 | 2 | 3

// 变更后
export type BlockType = 1
```

- 移除 `selectedType` 状态（或固定为 `1`，不再暴露选择接口）
- 移除 `setSelectedType` action

### 2.2 BlockGrid (`client/src/components/BlockGrid.tsx`)

```tsx
// 变更前：3种 InstancedMesh + 3个贴图 + 自定义几何体
const geometries = { 1: BoxGeometry, 2: makeMerlonGeometry(), 3: makeTowerGeometry() }
const textures = { 1: loadPixelTexture('/textures/brick_gray.png'), 2: ..., 3: ... }

// 变更后：1种 InstancedMesh + 1个贴图 + 标准 BoxGeometry
const geometry = new THREE.BoxGeometry(1, 1, 1)
const material = new THREE.MeshLambertMaterial({ map: loadPixelTexture('/textures/brick_gray.png') })
```

- 渲染循环从 `[1,2,3].map(type => ...)` 改为单一 `<instancedMesh>`
- 删除对 `makeMerlonGeometry`、`makeTowerGeometry` 的引用

### 2.3 blockGeometries.ts (`client/src/utils/blockGeometries.ts`)

整个文件删除（或清空，不再被引用）。

### 2.4 HUD 方块选择器 (`client/src/components/VoxelScene.tsx` / HUD)

移除 "灰砖 / 垛口 / 烽火台" 3 种选择按钮，HUD 中不再展示方块类型选择。

---

## 3. 蓝图 JSON 设计

### 3.1 坐标约定

- **X 轴**：城墙长度方向（X=0 为城墙中心，烽火台位于中央）
- **Y 轴**：高度（Y=0 为地面，最高 Y=8 为烽火台顶垛口）
- **Z 轴**：城墙厚度方向（Z=0 为外侧，Z=7 为内侧，共 8 格）

### 3.2 城墙截面结构（按 game.md 侧视图，8格厚）

```
Z=0,1   → 外墙（2格）
Z=2~5   → 人行道（4格，层1~4空心，层5封顶）
Z=6,7   → 内墙（2格）
```

各层填充规则：
| Y层 | Z=0 | Z=1 | Z=2 | Z=3 | Z=4 | Z=5 | Z=6 | Z=7 |
|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| Y=0（地基）| ■ | ■ | ■ | ■ | ■ | ■ | ■ | ■ |
| Y=1~3（墙身）| ■ | ■ | · | · | · | · | ■ | ■ |
| Y=4（走道封顶）| ■ | ■ | ■ | ■ | ■ | ■ | ■ | ■ |
| Y=5（外垛口行）| ■ | · | · | · | · | · | · | ■ |（间隔）

> 注：Y=5 垛口为间隔放置，每隔1格1个，外沿（Z=0）和内沿（Z=7）各一行

### 3.3 城门（像素拱形，X方向，宽7格）

城墙两端各有一扇城门，以 X 轴方向中心对齐城门口（5格宽拱底）：

```
Y=4: ■■■■■■■  (封顶，Z=0~7全填)
Y=3: ■■■ ■■■  (拱顶，中间1格宽空)
Y=2: ■■   ■■  (拱腰，中间3格宽空)
Y=1: ■     ■  (拱底，中间5格宽空)
Y=0: (城门处无地基，城门中间5格完全无方块)
```

城门 Z 方向：所有 8 格厚度均按此孔洞模式；城门两侧城墙段照常填充。

### 3.4 烽火台（中央，X=0附近，宽5格）

烽火台区域 Z 方向全部填满（8格），高度 Y=0~7：

```
Y=0~4:  正常城墙结构（地基+墙身+封顶）
Y=5~7:  Z=0~7 全填（烽火台主体延伸）
Y=8（顶垛口）: Z=0,2,4,6 各放1个（或 Z=0,7 各间隔放）
```

### 3.5 完整长城 X 轴布局（总宽约 30 格）

```
X: -15  -12  -8    -3    0    3    8   12   15
      [城门区][城墙段][城墙段][烽火台][城墙段][城墙段][城门区]
       7格    5格   5格    5格   5格   5格   7格
```

### 3.6 JSON 格式

```json
{
  "blocks": [
    { "x": 0, "y": 0, "z": 0, "type": 1, "fixed": false },
    ...
  ]
}
```

- `type` 固定为 `1`（单一正方体）
- `fixed: true` 用于标记两侧城墙段（已建好部分），`fixed: false` 用于修复区（烽火台+中间墙段）
- 修复区占全部方块约 30%

---

## 4. 服务端变更

`server/src/rooms/LobbyRoom.ts` 中 `createGroupRooms()` 无需改动，仍从 `section-1.json` 读取蓝图。`GroupRoom.ts` 的 `PLACE_BLOCK` 处理器无需改动（`blockType` 仍存储但始终为 `1`）。

---

## 5. 文件变更清单

| 操作 | 文件 |
|---|---|
| 删除 | `client/src/utils/blockGeometries.ts` |
| 修改 | `client/src/store/blockStore.ts` |
| 修改 | `client/src/components/BlockGrid.tsx` |
| 修改 | `client/src/components/VoxelScene.tsx`（移除多类型选择UI） |
| 删除 | `client/public/textures/merlon.png` |
| 删除 | `client/public/textures/tower.png` |
| 新建 | `server/src/maps/section-1.json` |
