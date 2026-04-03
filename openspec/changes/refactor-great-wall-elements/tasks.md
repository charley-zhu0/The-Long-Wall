# 任务清单：重构长城元素为单一正方体

## 第一阶段 — 客户端简化

- [x] **1.1** 修改 `client/src/store/blockStore.ts`：将 `BlockType = 1 | 2 | 3` 改为 `BlockType = 1`，移除 `selectedType` 状态字段和 `setSelectedType` action，`history` 等其余逻辑保持不变。

- [x] **1.2** 修改 `client/src/components/BlockGrid.tsx`：删除对 `makeMerlonGeometry`、`makeTowerGeometry` 和多贴图的引用，改为只创建 1 个 `BoxGeometry(1,1,1)`、1 个 `MeshLambertMaterial`（使用 `brick_gray.png`）和 1 个 `InstancedMesh`，渲染所有方块。

- [x] **1.3** 删除 `client/src/utils/blockGeometries.ts`（整个文件）。

- [x] **1.4** 删除贴图文件 `client/public/textures/merlon.png` 和 `client/public/textures/tower.png`。

- [x] **1.5** 修改 `client/src/components/VoxelScene.tsx`（或 HUD 组件）：移除"灰砖/垛口/烽火台"3种方块类型选择按钮及相关逻辑（`setSelectedType` 调用等）；`InputController` 中发送 `PLACE_BLOCK` 时 `blockType` 固定为 `1`。

## 第二阶段 — 蓝图 JSON 生成

- [x] **2.1** 新建目录 `server/src/maps/`，创建 `section-1.json`，按照 `game.md` 的三视图设计完整长城蓝图：
  - X 轴城墙总长约 30 格（X=-15 到 X=14），城墙厚度 Z=0~7（共 8 格）
  - Y=0：地基全填（城门孔洞区除外）
  - Y=1~3：外墙（Z=0,1）+ 空心人行道（Z=2~5）+ 内墙（Z=6,7）
  - Y=4：全行封顶（走道地面）
  - Y=5：外垛口（Z=0，每隔 2 格放 1 个）+ 内垛口（Z=7，每隔 2 格放 1 个）
  - 城门区（X=-15~-9 和 X=8~14，各 7 格宽）：Y=1 中间 5 格 Z=2~4 无方块，Y=2 中间 3 格空，Y=3 中间 1 格空，Y=4 封顶，Y=0 城门跨度无地基
  - 烽火台区（X=-2~2，共 5 格宽）：Y=5~7 全填（Z=0~7 全填），Y=8 顶垛口间隔放
  - `fixed: true` 用于城门两侧城墙段；`fixed: false` 用于中间城墙段和烽火台修复区

- [x] **2.2** 验证 `section-1.json` 格式正确：每个条目含 `{ x, y, z, type, fixed }`，`type` 均为 `1`，坐标均在服务端 `GRID` 边界内（x,z ∈ [-32,32]，y ∈ [0,32]）。

## 第三阶段 — 服务端确认

- [x] **3.1** 确认 `server/src/rooms/LobbyRoom.ts` 中的蓝图加载路径 `maps/section-1.json` 正确解析新建的 JSON 文件，无需改动代码。

- [x] **3.2** 确认 `server/src/rooms/GroupRoom.ts` 中 `loadBlueprint` 逻辑与新蓝图兼容（`type=1`，`fixed` 字段正常读取）；`checkCompletion` 和 `runFloatingCheck` 无需改动。

## 第四阶段 — 验证

- [ ] **4.1** 启动开发服务器（`npm run dev`），打开浏览器确认：
  - 游戏中只渲染正方体，无 U 形垛口或台式烽火台几何体
  - HUD 中无多类型选择器（或仅显示单一方块类型）
  - 控制台无贴图加载 404 错误

- [ ] **4.2** 进入教师界面触发 `START_GAME`，确认蓝图正常加载：
  - 半透明蓝图虚影按 game.md 的三视图显示城墙形状
  - 城门拱形孔洞、烽火台区域可见

- [ ] **4.3** 放置方块补全修复区，确认 `SECTION_COMPLETE` 正常触发。
