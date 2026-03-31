# 任务清单：优化游戏背景与预置损坏长城

## 阶段一 — 背景场景组件

- [x] **1.1** 创建 `client/src/components/SunGlow.tsx`：使用三个嵌套的 `<mesh>` 平面几何体（`PlaneGeometry`）和 `MeshBasicMaterial`（`transparent: true`，`depthWrite: false`），渲染太阳光晕效果。位置设为 `[100, 40, -80]`，三层 scale 比例为 `3 / 6 / 10`，opacity 为 `1 / 0.4 / 0.15`，颜色 `#fff7a0` → `#ffee44`。mesh 上设置 `raycast={() => null}` 禁用射线。

- [x] **1.2** 创建 `client/src/components/MountainRange.tsx`：定义 5 座山峰的固定配置数组（位置、高度、底面半径、颜色），使用 `ConeGeometry` 渲染，`MeshLambertMaterial`。颜色越远越蓝灰（近山 `#4a7c59`，远山 `#5a6e8a`）。全部 mesh 设置 `raycast={() => null}`。

- [x] **1.3** 创建 `client/src/components/ForestDecoration.tsx`：使用固定随机序列（简单线性同余生成器，seed=42）生成约 20 棵树的位置（限制在 x < -8 或 x > 22，z 在 -5 至 20 之间）。每棵树：`CylinderGeometry` 树干（棕色 `#8B6914`，radius 0.3，height 1.5）+ `ConeGeometry` 树冠（绿色 `#2d8a2d`，radius 1.5，height 3.5），整体 y 轴偏移使底部落在地面（y=-0.5）。全部 mesh 设置 `raycast={() => null}`。

- [x] **1.4** 修改 `client/src/components/VoxelScene.tsx`：
  - 导入 `SunGlow`、`MountainRange`、`ForestDecoration`
  - 在 `<Canvas>` 内 `<Sky>` 之后、`<Ground>` 之前挂载三个新组件
  - 调整 `<Sky sunPosition={[100, 30, -100]} />` 使太阳偏低且更黄（配合 `<Sky turbidity={8} rayleigh={0.5} mieCoefficient={0.005} mieDirectionalG={0.8} />`）
  - 将相机初始位置从 `[15, 12, 20]` 改为 `[10, 14, 28]`
  - 将 `<Ground>` 的 `color` 从 `#5a8a3a` 改为 `#6daa4a`

## 阶段二 — 验证损坏长城预置逻辑

- [x] **2.1** 验证 `server/src/rooms/GroupRoom.ts` 的 `loadBlueprint` 方法：确认其在 `onCreate` 时正确从 `options.blueprint` 读取数据，预填充 70% 方块并随机移除 30%。如有缺陷则修复（当前实现应已完整）。

- [x] **2.2** 验证 `server/src/rooms/LobbyRoom.ts` 中 `START_GAME` 处理：确认教师触发后，`section-1.json` 蓝图数据被正确传入 `GroupRoom` 的 `options.blueprint`。如有缺陷则修复。

- [x] **2.3** 在开发环境中运行 `npm run dev`，打开浏览器加入游戏，确认：
  - 场景背景可见高山、树木、明亮天空和太阳光晕
  - 教师触发开始后，长城区域内已有 70% 方块预填充，30% 为空缺
  - 空缺位置有 `BlueprintOverlay` 半透明虚影提示
  - 点击放置方块时不误触背景元素
