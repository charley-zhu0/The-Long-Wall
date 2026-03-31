# 设计方案：优化垛口与烽火台的视觉造型

## 架构总览

本次变更完全在客户端 `BlockGrid.tsx` 内实现，通过将不同方块类型使用不同的 `THREE.BufferGeometry` 替代统一的 `BoxGeometry`，并更新 `BlueprintOverlay.tsx` 中的虚影形状以保持一致。服务端逻辑、Schema、消息格式、网格坐标系均不受影响。

```
BlockGrid.tsx
├── type=1 灰砖   → BoxGeometry(1,1,1)            [不变]
├── type=2 垛口   → 自定义 BufferGeometry（U形）   [改为 merlon 几何体]
└── type=3 烽火台 → 自定义 BufferGeometry（阶梯塔）[改为 tower 几何体]

BlueprintOverlay.tsx
├── 默认虚影      → BoxGeometry(1.02,1.02,1.02)  [不变，提示位置即可]
```

## 技术方案

### 约束条件

- 所有方块的网格占位保持 1×1×1 单位（坐标系不变）。
- 继续使用 `InstancedMesh` 以保持渲染性能。
- 不引入新的依赖库。

### 几何体构建策略

Three.js 的 `InstancedMesh` 要求所有实例共享同一个 `BufferGeometry`。因此，每种方块类型各自有一个 `BufferGeometry`，用程序化方式构建（拼接多个基本几何体的顶点数据为一个合并的 `BufferGeometry`）。

使用 `THREE.BufferGeometryUtils.mergeGeometries()` 将多个基本几何体合并为单个 `BufferGeometry`，再交给 `InstancedMesh`。

---

### type=2 垛口（Merlon）几何体

垛口是长城城墙顶部的齿状凸起（城齿），形状为 **左右两块矩形方柱，中间有 U 形缺口**。

```
 ■   ■
 ■   ■
 ■■■■■   ← 底部连通
```

具体构成（所有坐标以方块中心为原点，范围 -0.5 ~ 0.5）：

| 部件     | 几何体                        | 位置偏移         |
|----------|-------------------------------|-----------------|
| 底部基座 | `BoxGeometry(1.0, 0.5, 1.0)` | y=-0.25         |
| 左齿     | `BoxGeometry(0.35, 0.5, 1.0)`| x=-0.325, y=0.25|
| 右齿     | `BoxGeometry(0.35, 0.5, 1.0)`| x=+0.325, y=0.25|

U 形缺口宽约 0.3 个单位（x 方向），缺口深 0.5 个单位（y 方向），缺口贯穿整个 z 轴方向（1.0 单位）。

贴图：米色砖块纹理，与现有 `makeBrickTexture('#c0b090', '#7a6840')` 保持一致。

---

### type=3 烽火台（Beacon Tower）几何体

烽火台是长城上的瞭望/信号高塔，形状为 **两阶阶梯塔，下宽上窄，整体高于一个标准方块**。

```
   ■■      ← 顶部（窄）
  ████     ← 底部（宽）
```

为了保持 1×1×1 的网格占位，整体高度压缩在 1.0 单位内，通过调整比例体现层次感：

| 部件     | 几何体                          | 位置偏移         |
|----------|---------------------------------|-----------------|
| 下层基座 | `BoxGeometry(1.0, 0.55, 1.0)`  | y=-0.225        |
| 上层主体 | `BoxGeometry(0.65, 0.45, 0.65)`| y=+0.275        |

上层略小（0.65 单位），四周留出约 0.175 单位的台阶，形成明显的塔楼阶梯轮廓。

贴图：深红色砖块纹理，与现有 `makeBrickTexture('#8b6060', '#5a3030')` 保持一致。

---

### 实现细节：mergeGeometries

```ts
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

function makeMerlonGeometry(): THREE.BufferGeometry {
  const base = new THREE.BoxGeometry(1.0, 0.5, 1.0)
  base.translate(0, -0.25, 0)
  const left = new THREE.BoxGeometry(0.35, 0.5, 1.0)
  left.translate(-0.325, 0.25, 0)
  const right = new THREE.BoxGeometry(0.35, 0.5, 1.0)
  right.translate(0.325, 0.25, 0)
  return mergeGeometries([base, left, right])
}

function makeTowerGeometry(): THREE.BufferGeometry {
  const base = new THREE.BoxGeometry(1.0, 0.55, 1.0)
  base.translate(0, -0.225, 0)
  const top = new THREE.BoxGeometry(0.65, 0.45, 0.65)
  top.translate(0, 0.275, 0)
  return mergeGeometries([base, top])
}
```

每个合并后的几何体在组件 `useMemo` 中创建，组件卸载时调用 `.dispose()` 清理。

---

### BlockGrid 修改策略

`BlockGrid.tsx` 当前使用一个共用的 `geometry = useMemo(() => new THREE.BoxGeometry(1,1,1), [])` 和每种类型一个 `InstancedMesh`。

修改后：

```ts
const geometries = useMemo(() => ({
  1: new THREE.BoxGeometry(1, 1, 1),
  2: makeMerlonGeometry(),
  3: makeTowerGeometry(),
}), [])
```

每种类型的 `InstancedMesh` 使用各自的 `geometries[type]`。其余逻辑（`byType` 分组、`useEffect` 中矩阵设置）完全不变。

---

### BlueprintOverlay 更新

`BlueprintOverlay.tsx` 的虚影使用 `boxGeometry args={[1.02, 1.02, 1.02]}` 显示缺失位置。为了视觉上更贴合实际方块形状，将虚影也改为按方块类型使用对应几何体的轮廓（wireframe 模式）。

需要从 `targetBlocks` Map 中读取每个缺失位置的 blockType，然后选择对应几何体渲染 wireframe。

```tsx
// BlueprintOverlay.tsx 修改：
// 现有: <boxGeometry args={[1.02, 1.02, 1.02]} />
// 修改为: 根据 targetBlocks.get(key) 的 blockType 选择对应几何体 props
```

由于 `BlueprintOverlay` 每个位置单独渲染一个 `<mesh>`（非 instanced），可以直接使用 JSX `<primitive object={geometries[type]} />` 引用共享的几何体对象（不影响性能，虚影数量有限）。

## 文件变更清单

| 文件 | 操作 | 说明 |
|---|---|---|
| `client/src/components/BlockGrid.tsx` | 修改 | 添加 `makeMerlonGeometry` 和 `makeTowerGeometry`，为 type=2/3 使用独立几何体；`useMemo` 返回 geometries map |
| `client/src/components/BlueprintOverlay.tsx` | 修改 | 读取 `targetBlocks` 的 blockType，按类型渲染对应形状的 wireframe 虚影 |

服务端文件无变更。
