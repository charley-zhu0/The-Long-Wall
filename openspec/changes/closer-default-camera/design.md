# 设计方案：缩短进入游戏的默认视距

## 架构总览

本次变更仅修改客户端 `VoxelScene.tsx` 中的 `<Canvas camera>` 初始 position 参数，无需新增组件或修改服务端代码。

```
VoxelScene
└── <Canvas camera={{ position: [x, y, z], fov: 60 }}>
         ↑ 仅修改这里的 position
```

## 技术方案

### 相机位置调整

**当前值**：`camera={{ position: [10, 14, 28], fov: 60 }}`

**目标值**：`camera={{ position: [0, 10, 18], fov: 60 }}`

调整依据：
- `x: 10 → 0`：居中对齐长城主轴，使玩家进入时视野正对建造区域。
- `y: 14 → 10`：降低高度，减少俯视角，让方块更直观。
- `z: 28 → 18`：拉近距离约 35%，方块在屏幕上的占比显著增大。
- `fov` 保持 60 不变，避免透视畸变。

`OrbitControls` 已启用，玩家可在此基础上自由缩放和旋转，此 position 仅为进入游戏时的初始位置。

## 文件变更清单

| 文件 | 操作 | 说明 |
|---|---|---|
| `client/src/components/VoxelScene.tsx` | 修改 | 将 `camera.position` 从 `[10, 14, 28]` 改为 `[0, 10, 18]` |

服务端文件无变更。
