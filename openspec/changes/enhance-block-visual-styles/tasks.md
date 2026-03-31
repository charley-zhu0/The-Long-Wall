# 任务清单：优化垛口与烽火台的视觉造型

## 阶段一 — BlockGrid 几何体重构

- [x] **1.1** 在 `client/src/components/BlockGrid.tsx` 顶部添加导入：`import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'`。

- [x] **1.2** 在 `BlockGrid.tsx` 中添加 `makeMerlonGeometry()` 函数：使用三个 `BoxGeometry` 拼接成 U 形垛口造型：底部基座 `BoxGeometry(1.0, 0.5, 1.0)` 平移至 `y=-0.25`；左齿 `BoxGeometry(0.35, 0.5, 1.0)` 平移至 `x=-0.325, y=0.25`；右齿 `BoxGeometry(0.35, 0.5, 1.0)` 平移至 `x=0.325, y=0.25`；调用 `mergeGeometries([base, left, right])` 返回合并后的 `BufferGeometry`。

- [x] **1.3** 在 `BlockGrid.tsx` 中添加 `makeTowerGeometry()` 函数：使用两个 `BoxGeometry` 拼接成阶梯塔造型：下层基座 `BoxGeometry(1.0, 0.55, 1.0)` 平移至 `y=-0.225`；上层主体 `BoxGeometry(0.65, 0.45, 0.65)` 平移至 `y=0.275`；调用 `mergeGeometries([base, top])` 返回合并后的 `BufferGeometry`。

- [x] **1.4** 修改 `BlockGrid.tsx` 中的 `useMemo` 几何体部分：将原先单一的 `geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])` 改为 `geometries = useMemo(() => ({ 1: new THREE.BoxGeometry(1, 1, 1), 2: makeMerlonGeometry(), 3: makeTowerGeometry() }), [])`，并在组件卸载时调用各几何体的 `.dispose()`。

- [x] **1.5** 修改 `BlockGrid.tsx` 中的 `instancedMesh` 渲染：将 `args={[geometry, materials[type], MAX_INSTANCES]}` 改为 `args={[geometries[type], materials[type], MAX_INSTANCES]}`，确保每种方块类型使用对应的独立几何体。

## 阶段二 — BlueprintOverlay 虚影形状更新

- [x] **2.1** 修改 `client/src/components/BlueprintOverlay.tsx` 的 `Props` 接口，确认 `targetBlocks` 的值类型为 `number`（即 blockType），现有接口 `Map<string, number>` 已符合此要求，无需更改接口定义。

- [x] **2.2** 修改 `client/src/components/BlueprintOverlay.tsx` 中的 `missingPositions` 计算：在收集缺失位置时同时记录对应的 blockType，将数组类型从 `Array<[number, number, number]>` 改为 `Array<[number, number, number, number]>`（最后一个为 blockType）。

- [x] **2.3** 在 `BlueprintOverlay.tsx` 中从 `three/examples/jsm/utils/BufferGeometryUtils.js` 导入 `mergeGeometries`，并在组件内用 `useMemo` 创建三种几何体（复用与 `BlockGrid` 相同的 `makeMerlonGeometry` / `makeTowerGeometry` 逻辑，或将这两个函数提取到共享工具文件 `client/src/utils/blockGeometries.ts` 中供两个组件引用）。

- [x] **2.4** 修改 `BlueprintOverlay.tsx` 的渲染部分：在每个缺失位置的 `<mesh>` 中，根据 blockType 选择对应几何体，使用 `<primitive object={ghostGeometries[blockType]} />` 代替原先的 `<boxGeometry args={[1.02, 1.02, 1.02]} />`。保持 `meshBasicMaterial` 的 `wireframe`、`transparent`、`opacity` 属性不变。

## 阶段三 — 验证

- [ ] **3.1** 运行 `npm run dev`，在浏览器中打开游戏，分别放置三种类型的方块，确认：灰砖为标准立方体；垛口呈现 U 形城齿造型（顶部中间有缺口）；烽火台呈现阶梯塔造型（上层比下层窄）。

- [ ] **3.2** 进入游戏（教师触发 START_GAME）后，确认 `BlueprintOverlay` 虚影形状与对应方块类型的实际造型一致：垛口虚影显示 U 形轮廓，烽火台虚影显示阶梯塔轮廓。

- [ ] **3.3** 使用浏览器性能面板确认帧率在放置大量方块（>500 个混合类型）时保持 60fps，与改动前无明显下降。
