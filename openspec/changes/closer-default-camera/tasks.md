# 任务清单：缩短进入游戏的默认视距

## 阶段一 — 调整默认相机位置

- [x] **1.1** 修改 `client/src/components/VoxelScene.tsx`：
  - 将 `<Canvas camera={{ position: [10, 14, 28], fov: 60 }}>` 中的 `position` 改为 `[0, 10, 18]`
  - 保持 `fov: 60` 不变
  - 保持其他所有属性不变

## 阶段二 — 验证

- [x] **2.1** 在开发环境中运行 `npm run dev`，打开浏览器加入游戏，确认：
  - 进入游戏后默认视角下，长城建造区域方块清晰可辨
  - OrbitControls 缩放/旋转功能正常，玩家可以自由调整视角
  - 教师视角（`/teacher` 路由）不受影响
