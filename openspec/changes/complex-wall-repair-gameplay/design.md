# 设计方案：复杂长城修复玩法——完整-破损-完整结构

## 架构总览

变更涉及三个层面：数据层（新 section-1.json 蓝图）、服务端逻辑（区分固定段与修复段）、客户端展示（增强蓝图虚影 + 过关弹窗 + 教程新步骤）。

```
服务端
├── maps/section-1.json           ← 重新设计：三段式结构，带 fixed 标记
├── rooms/GroupRoom.ts             ← 加载蓝图时固定段直接填充，修复段随机保留70%

客户端
├── components/BlueprintOverlay.tsx ← 修复区虚影增强（颜色/动效）
├── components/CompletionModal.tsx  ← 新增：过关庆祝弹窗
├── components/TutorialModal.tsx    ← 新增修复玩法介绍步骤
└── components/VoxelScene.tsx       ← 接收 SECTION_COMPLETE 后显示 CompletionModal
```

## 技术方案

### 1. 重新设计 section-1.json 蓝图

城墙总长 20 格（x: 0–19），分三段：
- **左完整段**：x: 0–5（宽6格）— 预置且固定，不可被移除
- **破损待修复段**：x: 6–13（宽8格）— 预置70%，30%留空待修复
- **右完整段**：x: 14–19（宽6格）— 预置且固定，不可被移除

城墙高度：y: 0–3（4层，灰砖 type=1，顶层垛口 type=2），z: 0–1（2格深度）。

在 section-1.json 中新增 `fixed` 字段标记固定方块：

```json
{
  "name": "great-wall-section-1",
  "size": { "x": 20, "y": 4, "z": 2 },
  "blocks": [
    { "x": 0, "y": 0, "z": 0, "type": 1, "fixed": true },
    ...
    { "x": 6, "y": 0, "z": 0, "type": 1, "fixed": false },
    ...
  ]
}
```

### 2. 服务端 GroupRoom.ts 加载逻辑变更

修改 `loadBlueprint` 方法，识别 `fixed` 字段：
- `fixed: true` 的方块**直接预置**，加入 `targetBlocks` 集合，同时加入 `fixedBlocks` 集合
- `fixed: false` 或无 `fixed` 的方块**随机保留 70%**（30% 留空为修复任务），全部加入 `targetBlocks`

`checkCompletion` 仅检查 `targetBlocks` 中无 `fixed` 标记的方块（修复段），固定段不参与完成检测（因为固定段始终存在）。

```typescript
// GroupRoom.ts
private fixedBlocks: Set<string> = new Set()

private loadBlueprint(blocks: Array<{ x: number; y: number; z: number; type: number; fixed?: boolean }>) {
  const repairBlocks: typeof blocks = []
  
  for (const b of blocks) {
    const key = `${b.x},${b.y},${b.z}`
    this.targetBlocks.add(key)
    if (b.fixed) {
      // 固定段：直接填充
      this.fixedBlocks.add(key)
      const block = new BlockState()
      block.blockType = b.type
      this.state.blocks.set(key, block)
    } else {
      repairBlocks.push(b)
    }
  }
  
  // 修复段：随机保留 70%
  const indices = repairBlocks.map((_, i) => i)
  const toRemove = new Set(
    indices.sort(() => Math.random() - 0.5).slice(0, Math.floor(repairBlocks.length * 0.3))
  )
  for (let i = 0; i < repairBlocks.length; i++) {
    if (!toRemove.has(i)) {
      const b = repairBlocks[i]
      const block = new BlockState()
      block.blockType = b.type
      this.state.blocks.set(`${b.x},${b.y},${b.z}`, block)
    }
  }
}

private checkCompletion() {
  // 只检查修复段（非固定方块）
  const repairTargets = [...this.targetBlocks].filter(k => !this.fixedBlocks.has(k))
  if (repairTargets.length === 0) return
  for (const key of repairTargets) {
    if (!this.state.blocks.has(key)) return
  }
  this.broadcast('SECTION_COMPLETE', { groupId: this.groupId })
}
```

### 3. 客户端 BlueprintOverlay.tsx 增强虚影

当前：单色蓝色半透明线框（`#88aaff`，opacity 0.25）。

改进：修复段缺失方块使用更突出的渲染：
- 颜色改为橙黄色 `#ffcc44`（对幼儿更友好、更醒目）
- opacity 提升至 0.4
- 添加 CSS 动画脉冲效果（通过 `useFrame` 实现 opacity 在 0.3–0.6 之间缓慢呼吸）

```tsx
// BlueprintOverlay.tsx 中使用 useFrame 控制呼吸动画
useFrame(({ clock }) => {
  const pulse = 0.4 + 0.2 * Math.sin(clock.elapsedTime * 2)
  ghostMeshRef.current?.material.opacity = pulse
})
```

实现上使用单独的 `BreathingGhost` 子组件（每个缺失方块一个），避免共用 ref 冲突。

### 4. 新增 CompletionModal.tsx 过关弹窗

新组件，在 `VoxelScene` 接收到 `SECTION_COMPLETE` 消息后显示：

```tsx
// client/src/components/CompletionModal.tsx
export default function CompletionModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={overlayStyle}>
      <div style={modalStyle}>
        <div style={{ fontSize: 80 }}>🎉</div>
        <h2 style={{ fontSize: 32, color: '#e67e22' }}>恭喜你已经成功修复城墙！</h2>
        <p style={{ fontSize: 18, color: '#555' }}>太棒了！城墙又变得坚固了！</p>
        <button onClick={onClose} style={btnStyle}>继续探索 →</button>
      </div>
    </div>
  )
}
```

`VoxelScene` 中监听 `SECTION_COMPLETE`，设置 `showCompletion` state，条件渲染 `CompletionModal`。

### 5. TutorialModal.tsx 新增修复玩法步骤

在现有教程步骤末尾（"和小伙伴一起建造！"之前）插入新步骤：

```tsx
{
  title: '修复破损的城墙',
  desc: '城墙中间有一段已经损坏了！\n找到橙色虚影提示的位置，放置对应的砖块来修复它。\n全部修复后，你们就胜利了！',
  icon: '🧱',
}
```

PC 和触摸两种步骤数组均需添加。

## 文件变更清单

| 文件 | 操作 | 说明 |
|---|---|---|
| `server/maps/section-1.json` | 修改 | 重新设计三段式蓝图，添加 `fixed` 字段 |
| `server/src/rooms/GroupRoom.ts` | 修改 | `loadBlueprint` 识别 `fixed` 字段；`checkCompletion` 只检查修复段 |
| `client/src/components/BlueprintOverlay.tsx` | 修改 | 增强虚影：橙黄色 + 呼吸动画 |
| `client/src/components/CompletionModal.tsx` | 新增 | 过关庆祝弹窗组件 |
| `client/src/components/VoxelScene.tsx` | 修改 | 监听 `SECTION_COMPLETE`，渲染 `CompletionModal` |
| `client/src/components/TutorialModal.tsx` | 修改 | 插入"修复破损城墙"教程步骤 |

服务端 schema.ts、LobbyRoom.ts 无需修改。
