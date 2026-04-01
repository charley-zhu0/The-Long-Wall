# 任务清单：复杂长城修复玩法——完整-破损-完整结构

## 阶段一 — 重新设计蓝图数据

- [x] **1.1** 重写 `server/maps/section-1.json`：设计三段式长城蓝图（总宽20格，高4层，深2格）。
  - 左完整段 x:0–5，全部方块标记 `"fixed": true`（y:0–2 灰砖 type=1，y:3 垛口 type=2）
  - 破损修复段 x:6–13，全部方块标记 `"fixed": false`（结构相同）
  - 右完整段 x:14–19，全部方块标记 `"fixed": true`（结构相同）
  - 保留 `name` 和 `size` 字段，更新 `size.y` 为 4

## 阶段二 — 服务端修复逻辑

- [x] **2.1** 修改 `server/src/rooms/GroupRoom.ts`：
  - 在类中新增 `private fixedBlocks: Set<string> = new Set()`
  - 更新 `loadBlueprint` 方法签名，接受 `fixed?: boolean` 字段
  - 固定段（`fixed: true`）：直接 `state.blocks.set(key, block)` 并加入 `fixedBlocks`，无需随机移除
  - 修复段（`fixed: false` 或无 `fixed`）：收集后随机保留70%（现有逻辑）
  - `targetBlocks` 集合包含所有方块（固定+修复），保持完整性
  - 修改 `checkCompletion`：过滤掉 `fixedBlocks` 中的键，只检查修复段是否全部填满

## 阶段三 — 客户端增强蓝图虚影

- [x] **3.1** 修改 `client/src/components/BlueprintOverlay.tsx`：
  - 将缺失方块的 `meshBasicMaterial` 颜色从 `#88aaff` 改为 `#ffcc44`（橙黄色，非高亮状态）
  - opacity 从 0.25 提升至 0.4
  - `wireframe` 改为 `false`（实心半透明，更醒目）
  - 提取单独的 `BreathingGhost` 子组件，使用 `useRef<THREE.Mesh>` 和 `useFrame` 实现呼吸动画：`opacity = 0.3 + 0.2 * Math.sin(clock.elapsedTime * 2.5)`
  - `BreathingGhost` 的 mesh 上保留 `raycast={() => null}` 防止误触

## 阶段四 — 过关庆祝弹窗

- [x] **4.1** 新建 `client/src/components/CompletionModal.tsx`：
  - Props：`{ onClose: () => void }`
  - 全屏半透明遮罩（`position: fixed, inset: 0, background: rgba(0,0,0,0.6), zIndex: 300`）
  - 居中白色圆角卡片，内容：大图标 🎉、标题"恭喜你已经成功修复城墙！"（fontSize 30, color `#e67e22`）、副文本"太棒了！城墙又变得坚固了！"、"继续探索 →"按钮（点击触发 `onClose`）

- [x] **4.2** 修改 `client/src/components/VoxelScene.tsx`：
  - 导入 `CompletionModal`
  - 新增 state：`const [showCompletion, setShowCompletion] = useState(false)`
  - 在 room 消息监听处新增：`room.onMessage('SECTION_COMPLETE', () => setShowCompletion(true))`
  - 在 JSX 中条件渲染：`{showCompletion && <CompletionModal onClose={() => setShowCompletion(false)} />}`
  - `CompletionModal` 渲染在 Canvas 外部（DOM 层），与 HUD 同级

## 阶段五 — 教程新增修复玩法说明

- [x] **5.1** 修改 `client/src/components/TutorialModal.tsx`：
  - 在 `pcSteps` 数组"和小伙伴一起建造！"步骤之前插入新步骤：
    ```ts
    {
      title: '修复破损的城墙',
      desc: '城墙中间有一段已经损坏了！\n找到橙色虚影标记的位置，放置对应的砖块来修复它。\n全部修复后，你们就胜利了！🏆',
      icon: '🧱',
    }
    ```
  - `touchSteps` 数组同样位置插入相同步骤（desc 稍作触摸操作适配，其余相同）
  - 无需修改步骤导航逻辑，步骤数自动+1

## 验证

- [ ] **6.1** 运行 `npm run dev`，进入游戏，验证：
  - 场景内左右两侧长城段完整，中间段有明显缺口
  - 缺口位置显示橙黄色实心半透明虚影，带呼吸动画
  - 教程中出现"修复破损的城墙"说明步骤
  - 补全中间段所有缺失方块后，弹出"恭喜你已经成功修复城墙！"弹窗
  - 点击"继续探索"关闭弹窗，游戏可正常继续操作
