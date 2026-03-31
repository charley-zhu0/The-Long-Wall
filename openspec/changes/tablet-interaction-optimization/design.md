# 设计方案：优化平板设备玩家交互体验

## 整体策略

通过检测设备类型（触屏检测）将学生端分为"触屏模式"和"PC 模式"，在触屏模式下替换交互逻辑和 UI 元素。教师端路由（`/teacher`）不参与任何修改。

---

## 一、设备检测

**文件**：新增 `client/src/utils/deviceDetect.ts`

```ts
export const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  (navigator.maxTouchPoints > 0 || 'ontouchstart' in window)
```

在 `App.tsx` 中用 `useState` 初始化一次：
```ts
const [isTouch] = useState(() => isTouchDevice())
```
通过 React Context（或 prop drilling）将 `isTouch` 向下传递给需要它的组件。

---

## 二、InputController 重构

**文件**：`client/src/components/InputController.tsx`

### 核心问题

当前触屏手势混用 `useGesture` 的 `onPointerDown`/`onClick`，在触屏上 `onClick` 的 `event` 不携带 `clientX/clientY`（是合成事件），导致 raycasting 坐标错误。

### 触屏模式设计

**放置/拆除模式切换**：引入一个本地 state `touchMode: 'place' | 'erase'`，通过 HUD 的底部切换按钮控制（见第四节）。这样避免长按/双击等复杂手势，儿童用户体验更直觉。

**手势绑定**（仅触屏模式）：

```
单指 tap（pointerup 且移动距离 < 8px）→ 根据 touchMode 执行 handlePlace 或 handleDestroy
双指手势 → 交给 OrbitControls（缩放/旋转），不做 raycasting
```

实现方式：
- 移除 `useGesture` 库的 `onClick` 和 `onPointerDown` 处理，改为手动监听 `pointerdown` / `pointerup`：
  ```
  pointerdown → 记录 startX, startY, pointerId
  pointerup   → 若同一 pointerId 且移动 < 8px 且总时长 < 300ms → 视为 tap
  ```
- `e.clientX / e.clientY` 在 `pointerdown`/`pointerup` 上可靠。
- 双指（`e.pointerType === 'touch'` 且 `touches.length === 2`）直接忽略，让 OrbitControls 处理。

**PC 鼠标模式**（`isTouch === false`）：
- 保持现有逻辑：`mousedown` 左键 = 放置，右键 = 拆除，不变。
- 同时保留 `contextmenu` 的 `preventDefault`，避免右键菜单弹出。

### OrbitControls 配置

**文件**：`client/src/components/VoxelScene.tsx`

触屏模式下，`OrbitControls` 需禁用左键（单指）旋转，改为：
```
mouseButtons={{ LEFT: undefined, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
```
这样单指在触屏上不会驱动 OrbitControls，双指负责旋转+缩放+平移。

触控手势冲突消除：`InputController` 的 `pointerup` tap 判断与 OrbitControls 的双指手势互不干扰，因为 OrbitControls 使用 `pointermove` 跟踪，而单指 tap 不产生大于阈值的 `pointermove`。

---

## 三、TutorialModal 适配

**文件**：`client/src/components/TutorialModal.tsx`

根据 `isTouch` prop 选取对应的步骤内容：

```ts
const steps = isTouch ? touchSteps : pcSteps
```

**触屏 steps 内容**：

| 步骤 | 标题 | 描述 |
|---|---|---|
| 0 | 欢迎来到长城建造！ | 我们要一起修复古老的长城！ |
| 1 | 如何放置砖块 | 点击屏幕上的蓝色虚影位置，即可放置砖块。底部选择砖块类型后再点击放置。 |
| 2 | 如何拆除砖块 | 点击屏幕底部的「拆除」按钮切换到拆除模式，再点击已有砖块即可拆除。 |
| 3 | 如何控制视角 | 用**双指**拖拽旋转和平移视角，双指捏合缩放。 |
| 4 | 和小伙伴一起建造！ | 蓝色虚影提示你需要放置砖块的位置，完成后会有庆祝！ |

**PC steps**（现有内容保持）：已有步骤 0-4 不变。

Props 变更：`TutorialModal` 新增 `isTouch: boolean` prop，由 `App.tsx` 传入。

---

## 四、HUD 优化（触屏模式）

**文件**：`client/src/components/HUD.tsx`

### 变更

1. **接收 `isTouch` prop**，在触屏模式下切换布局。

2. **按钮尺寸**：触屏模式下所有交互按钮最小 48×48px，字号提升（方块类型按钮 `padding: '12px 20px'`，撤销按钮加大）。

3. **移除十字准心**：触屏模式下隐藏中心 `+` 准心（`display: 'none'`）。

4. **新增底部"放置/拆除"切换按钮**（仅触屏模式）：
   ```
   [ 放置 🧱 ]  [ 拆除 🔨 ]
   ```
   位于屏幕底部居中，固定定位，`pointerEvents: 'auto'`。  
   当前激活模式高亮显示（蓝色/红色背景）。  
   `touchMode` state 提升到 `HUD` 并通过回调传给 `InputController`（或用 Zustand action 共享）。

5. **方块类型选择器**：触屏模式下移至底部切换按钮左侧，排成一行（避免顶部按钮过密）。

### touchMode 状态共享

方案：在 `blockStore`（Zustand）中新增 `touchMode: 'place' | 'erase'` 和 `setTouchMode` action，HUD 写入，InputController 读取，避免 prop drilling。

---

## 五、受影响文件

| 文件 | 变更类型 | 说明 |
|---|---|---|
| `client/src/utils/deviceDetect.ts` | 新增 | 触屏设备检测工具函数 |
| `client/src/App.tsx` | 修改 | 初始化 `isTouch`，通过 props 传递给 TutorialModal、VoxelScene |
| `client/src/store/blockStore.ts` | 修改 | 新增 `touchMode` state 和 `setTouchMode` action |
| `client/src/components/InputController.tsx` | 修改 | 重构触屏手势：pointer tap 替代 useGesture onClick，移除长按拆除，读取 `touchMode` |
| `client/src/components/VoxelScene.tsx` | 修改 | 接收 `isTouch` prop，配置 OrbitControls 的 mouseButtons/touches（触屏模式禁用单指 OrbitControls 旋转） |
| `client/src/components/HUD.tsx` | 修改 | 接收 `isTouch` prop，大尺寸触屏按钮，隐藏准心，新增放置/拆除切换按钮 |
| `client/src/components/TutorialModal.tsx` | 修改 | 接收 `isTouch` prop，根据设备展示对应操作步骤内容 |

教师端文件（`TeacherHUD.tsx`、`/teacher` 路由）**不涉及**。
