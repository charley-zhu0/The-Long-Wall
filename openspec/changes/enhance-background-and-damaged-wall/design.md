# 设计方案：优化游戏背景与预置损坏长城

## 架构总览

本次变更完全在客户端渲染层实现背景元素，服务端现有蓝图加载逻辑（`loadBlueprint` 中 70% 预填充）无需改动。新增三个纯装饰性 R3F 组件，挂载于 `VoxelScene` 的 `<Canvas>` 内。

```
VoxelScene (canvas)
├── <Sky>              ← 已有，调整 sunPosition 参数
├── <SunGlow>          ← 新增：太阳光晕 sprite（三层叠加）
├── <MountainRange>    ← 新增：远景高山（多个梯形/锥形 mesh）
├── <ForestDecoration> ← 新增：中景树木（圆柱树干 + 圆锥树冠）
├── Ground             ← 已有，调整颜色
├── GridHelper         ← 已有
├── BlockGrid          ← 已有（含预置长城方块）
├── BlueprintOverlay   ← 已有（标记缺口）
└── InputController    ← 已有
```

服务端 `GroupRoom` 已实现 70% 预填充（`loadBlueprint` 随机移除 30% 方块），现有逻辑完全满足"损坏长城"需求，**无需修改服务端代码**。

## 技术方案

### 1. 天空与太阳（客户端）

**现有** `<Sky>` 组件已提供天空渐变，只需调整 `sunPosition` 使太阳位置更显眼（偏低、偏黄）。

添加 `<SunGlow>` 组件：使用三个嵌套 `<Sprite>` 或 `<mesh>` 的 `SpriteMaterial`（`depthWrite: false`，`transparent: true`）模拟太阳光晕，颜色从白色渐变到淡黄色。位置与 Sky 的 `sunPosition` 方向一致。

```tsx
// client/src/components/SunGlow.tsx
// 三个同心圆 Sprite，scale 比例 1:2:3，opacity 1:0.4:0.15
```

### 2. 高山背景（客户端）

`<MountainRange>` 组件：使用若干 `ConeGeometry` 或自定义 `BufferGeometry` 模拟山峰，放置在场景远处（Z 轴 -60 至 -120 范围）。

- 3–5 座山峰，高度 20–40 单位，宽度 30–60 单位
- 颜色：深蓝绿（`#4a7c59`）/深灰蓝（`#5a6e8a`），越远越蓝（模拟大气透视）
- 使用 `MeshLambertMaterial`，无贴图，性能佳
- 禁用射线检测：组件根节点设置 `raycast={() => {}}` 或 `layers={[1]}`

```tsx
// client/src/components/MountainRange.tsx
const peaks = [
  { x: -50, z: -90, height: 35, radius: 28 },
  { x: -20, z: -100, height: 42, radius: 22 },
  { x:  10, z: -85,  height: 30, radius: 25 },
  { x:  40, z: -95,  height: 38, radius: 30 },
  { x:  65, z: -80,  height: 28, radius: 20 },
]
```

### 3. 树木装饰（客户端）

`<ForestDecoration>` 组件：在场景两侧（X < -10 或 X > 25）散布若干程序化树木，每棵树由一个 `CylinderGeometry`（树干，棕色）和一个 `ConeGeometry`（树冠，绿色）组合而成。

- 树木数量：约 20 棵，随机分布（固定 seed 确保每次相同）
- 高度：3–6 单位，不遮挡长城主体
- 颜色：树干 `#8B6914`，树冠 `#2d8a2d`（鲜艳绿色）
- 同样禁用射线检测

```tsx
// client/src/components/ForestDecoration.tsx
// 使用固定的随机序列（seeded PRNG）生成树木位置
```

### 4. 地面颜色调整

将 `Ground` 组件的 `color` 从 `#5a8a3a` 改为 `#6daa4a`（更鲜绿，符合幼儿卡通风格）。

### 5. 相机初始位置优化

将 `VoxelScene` 中 `camera={{ position: [15, 12, 20] }}` 调整为 `[10, 14, 28]`，使玩家进入时能同时看到长城全貌和背景山脉。

### 6. 服务端蓝图加载确认

现有 `LobbyRoom` 在教师触发 `START_GAME` 时传入 `section-1.json` 蓝图，`GroupRoom.loadBlueprint` 自动预填充 70% 并随机移除 30%。此逻辑**已完整实现**，无需更改。

客户端侧 `BlueprintOverlay` 会将缺失方块（目标中有但当前 blocks 中无）渲染为半透明虚影，引导修复。

## 射线检测隔离

所有装饰性背景组件（`SunGlow`、`MountainRange`、`ForestDecoration`）的 mesh 须通过以下方式之一避免干扰 `InputController` 的射线检测：

- 方法 A：在 R3F mesh 上设置 `raycast={() => null}`
- 方法 B：将 mesh 的 `layers` 设为非默认层（layer 1），相机保持默认 layer 0

推荐方法 A，实现更简单直接。

## 文件变更清单

| 文件 | 操作 | 说明 |
|---|---|---|
| `client/src/components/VoxelScene.tsx` | 修改 | 引入并挂载三个新背景组件；调整相机位置；调整地面颜色 |
| `client/src/components/SunGlow.tsx` | 新增 | 太阳光晕 Sprite 组件 |
| `client/src/components/MountainRange.tsx` | 新增 | 远景高山装饰组件 |
| `client/src/components/ForestDecoration.tsx` | 新增 | 中景树木装饰组件 |

服务端文件无变更。
