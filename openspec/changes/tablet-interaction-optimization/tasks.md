# 任务清单：优化平板设备玩家交互体验

## T1. 设备检测基础设施

- [x] **T1.1** 新增 `client/src/utils/deviceDetect.ts`：导出 `isTouchDevice()` 函数，返回 `navigator.maxTouchPoints > 0 || 'ontouchstart' in window`。

- [x] **T1.2** 修改 `client/src/App.tsx`：在组件顶层添加 `const [isTouch] = useState(() => isTouchDevice())`，将 `isTouch` 传递给 `VoxelScene` 和 `TutorialModal`。

## T2. 触屏模式状态

- [x] **T2.1** 修改 `client/src/store/blockStore.ts`：新增 `touchMode: 'place' | 'erase'` 字段（初始值 `'place'`）和 `setTouchMode(mode: 'place' | 'erase') => void` action。

## T3. InputController 触屏手势重构

- [x] **T3.1** 修改 `client/src/components/InputController.tsx`：移除 `useGesture` 的 `onClick`/`onPointerDown` 触屏处理。改为手动监听 canvas 的 `pointerdown` / `pointerup` 事件：
  - `pointerdown`：记录 `startX`、`startY`、`pointerId`、`startTime`（`useRef`）
  - `pointerup`：若 `pointerId` 匹配、移动距离 < 8px 且时长 < 300ms，视为单指 tap
  - tap 触发时读取 `blockStore.touchMode`：`'place'` → `handlePlace`，`'erase'` → `handleDestroy`
  - 注意仅在 `isTouch === true` 时注册上述监听，否则保留现有 `mousedown` 逻辑。

- [x] **T3.2** 修改 `client/src/components/InputController.tsx`：保留 PC 鼠标的 `mousedown` 监听（左键 = 放置，右键 = 拆除），并添加 `contextmenu` 的 `preventDefault`，避免右键菜单弹出。确保 PC 模式不受触屏改动影响。

- [x] **T3.3** `InputController` 接收 `isTouch: boolean` prop（由 `VoxelScene` 传入），根据此值选择注册触屏或 PC 事件监听。

## T4. OrbitControls 触屏配置

- [x] **T4.1** 修改 `client/src/components/VoxelScene.tsx`：接收 `isTouch: boolean` prop（由 `App.tsx` 传入）。
  - 触屏模式（`isTouch === true`）：为 `<OrbitControls>` 设置：
    ```
    mouseButtons={{ LEFT: undefined, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
    touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
    ```
    禁用单指 OrbitControls 旋转，双指负责旋转+缩放+平移。
  - PC 模式（`isTouch === false`）：保持现有 OrbitControls 默认配置（中键旋转、右键平移）。
  - 将 `isTouch` 透传给 `<InputController isTouch={isTouch} />`。

## T5. HUD 平板适配

- [x] **T5.1** 修改 `client/src/components/HUD.tsx`：接收 `isTouch: boolean` prop。
  - 触屏模式下，所有按钮最小点击区域 48×48px（调整 `padding` 和 `fontSize`）。
  - 触屏模式下，隐藏十字准心（中心 `+` 元素 `display: 'none'`）。

- [x] **T5.2** 修改 `client/src/components/HUD.tsx`：触屏模式下，在屏幕底部居中新增放置/拆除切换按钮组：
  - `[ 放置 🧱 ]  [ 拆除 🔨 ]`，固定定位 `bottom: 24px`，`left: 50%`，`transform: translateX(-50%)`。
  - 按钮宽度至少 80px，高度 56px，`fontSize: 20`。
  - 激活状态：放置模式蓝色背景，拆除模式红色背景；非激活灰色。
  - 点击时调用 `blockStore.setTouchMode('place' | 'erase')`。

- [x] **T5.3** 修改 `client/src/components/HUD.tsx`：触屏模式下，将方块类型选择器（灰砖/垛口/烽火台）移至底部按钮行（放置/拆除按钮左侧），排成同一行。PC 模式顶部布局不变。

- [x] **T5.4** 修改 `client/src/components/VoxelScene.tsx`：将 `isTouch` prop 传给 `<HUD isTouch={isTouch} />`。

## T6. TutorialModal 平板内容替换

- [x] **T6.1** 修改 `client/src/components/TutorialModal.tsx`：新增 `isTouch: boolean` prop。定义两套 steps 数组：
  - `pcSteps`：保留现有 5 步内容（鼠标操作描述），但将步骤 4 视角描述的触屏提示行去掉（因为触屏用户不会看 PC steps）。
  - `touchSteps`：新增 5 步触屏版本，内容见设计方案第三节（含触控手势 icon，如 👆/✌️）。
  - 使用 `const steps = isTouch ? touchSteps : pcSteps`。

- [x] **T6.2** 修改 `client/src/App.tsx`：将 `isTouch` 传给 `<TutorialModal isTouch={isTouch} onStart={...} />`。
