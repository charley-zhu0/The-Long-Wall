# 任务清单：长城像素建模多人协作游戏

## 第一阶段 — 基础框架（单机体素场景）

- [x] **1.1** 初始化npm workspaces monorepo：`client/`（Vite + React + TypeScript）和 `server/`（Node.js + TypeScript），在根目录 `package.json` 中添加开发/构建脚本。
- [x] **1.2** 安装客户端依赖：`react`、`react-dom`、`@react-three/fiber`、`@react-three/drei`、`three`、`zustand`、`@use-gesture/react`。
- [x] **1.3** 搭建 `client/src/main.tsx` 和 `client/index.html` 骨架，验证Vite开发服务器可正常启动。
- [x] **1.4** 创建 `<VoxelScene>` 组件：R3F `<Canvas>`，包含环境光+平行光，以及PC端 `<OrbitControls>` 轨道相机。
- [x] **1.5** 实现 `blockStore`（Zustand）：`blocks: Map<string, number>`，提供 `placeBlock(x,y,z,type)`、`destroyBlock(x,y,z)`、`undo()` 方法。
- [x] **1.6** 创建 `<BlockGrid>` 组件：读取 `blockStore`，使用 `BoxGeometry(1,1,1)` 按方块类型各渲染一个 `InstancedMesh`，支持至少10,000个实例。
- [x] **1.7** 实现基于射线检测的PC端 `<InputController>`：鼠标左键点击面法线方向放置方块；右键点击销毁方块。使用R3F的 `useThree` 和 `Raycaster`。
- [x] **1.8** 添加无限平铺地面（仅视觉，不参与交互）和简单网格辅助线。
- [x] **1.9** 添加最简HUD（React覆盖层）：方块数量显示 + 撤销按钮，与 `blockStore.undo()` 联动。
- [x] **1.10** 绘制基础灰砖贴图（64×64像素风格PNG，长城风格），作为 `MeshLambertMaterial` 的 map 应用到方块实例上。

## 第二阶段 — 多人联机

- [x] **2.1** 安装服务端依赖：`colyseus`、`@colyseus/monitor`、`express`。配置 `server/src/index.ts`，在2567端口启动Colyseus + Express。
- [x] **2.2** 定义 `GroupRoomState` Colyseus Schema，包含 `MapSchema<BlockState>` 和 `MapSchema<PlayerState>`（详见design.md）。
- [x] **2.3** 实现 `GroupRoom`：处理 `PLACE_BLOCK` / `DESTROY_BLOCK` / `MOVE` 消息，验证坐标（边界检查），更新状态，广播增量。
- [x] **2.4** 实现 `LobbyRoom`：接受最多12名客户端，分配 `groupId`（1–3），房间满员（或教师触发开始）时创建/加入3个 `GroupRoom` 实例。
- [x] **2.5** 安装客户端网络库 `colyseus.js`，创建 `network/client.ts` 封装Colyseus客户端，提供 `joinLobby()`、`joinGroup(groupId)` 工具函数。
- [x] **2.6** 将 `<InputController>` 事件改为向服务端发送 `PLACE_BLOCK` / `DESTROY_BLOCK` 消息，不再直接调用 `blockStore`。
- [x] **2.7** 将Colyseus传入的增量状态（`onStateChange`）同步到 `blockStore` 及独立的 `playerStore`。
- [x] **2.8** 添加 `<PlayerAvatar>` 组件：从 `playerStore` 读取数据，为每位远程玩家渲染彩色方块头像 + 悬浮名称标签。本地相机/角色位置变化时发送 `MOVE` 消息。
- [x] **2.9** 在 `GroupRoom` 中实现悬空检测：每次 `PLACE_BLOCK` 后，从地面层执行BFS/DFS；任何不连通的方块触发 `{ type: "UNSTABLE_WARNING", positions: [...] }` 消息发送给该小组。
- [ ] **2.10** 压力测试：在开发服务器上打开12个浏览器标签，验证localhost环境下方块增量同步延迟在200ms以内。

## 第三阶段 — 游戏逻辑、分组与教师界面

- [x] **3.1** 定义长城蓝图JSON格式（详见design.md），创建至少一个示例地图 `maps/section-1.json`，使用20×8×6网格，约60%预填充方块。
- [x] **3.2** `GroupRoom` 创建时：加载蓝图JSON，计算"破损"状态（随机移除30%方块），预填充 `blocks` 状态，存储 `targetBlocks` 地图用于完成度检测。
- [x] **3.3** 实现 `<BlueprintOverlay>` 组件：在目标位置渲染半透明虚影方块（当前 `blocks` 中缺失但 `targetBlocks` 中存在的位置）。
- [x] **3.4** 在 `GroupRoom` 中实现完成检测：每次 `PLACE_BLOCK` 后对比 `blocks` 与 `targetBlocks`；全部匹配时广播 `{ type: "SECTION_COMPLETE", groupId }`。
- [x] **3.5** 客户端：收到 `SECTION_COMPLETE` 时展示庆祝粒子动画和音效。
- [x] **3.6** 创建教师客户端路由（`/teacher`）：飞行相机（`PointerLockControls` 或自由飞行），面板显示全部3个小组工作区的小地图。
- [x] **3.7** 教师 `HIGHLIGHT`（高亮）功能：教师点击小组小地图中某位置 → 服务端转发 `TEACHER_HIGHLIGHT` 给该小组 → 客户端在该方块上渲染红色脉冲边框。
- [x] **3.8** 教师 `ENCOURAGE`（鼓励）功能：⭐ / ❤️ / 👍 按钮 → 服务端转发 `TEACHER_ENCOURAGE` 给小组 → 客户端展示全屏emoji爆发动画，持续2秒。
- [x] **3.9** 教程弹窗：`<TutorialModal>` 展示步骤图示和 `<video>` 元素（自动播放、静音、循环占位视频）。"开始"按钮关闭弹窗并启用操作输入。
- [x] **3.10** 触控操作：在 `<InputController>` 中集成 `@use-gesture/react`。单指拖拽=旋转视角；点击=放置；长按（500ms）=销毁。在iPad Safari上测试验证。

## 第四阶段 — 打磨与美术资产

- [ ] **4.1** 制作额外方块贴图：参考 `image.png` 创作垛口（`type=2`）和烽火台（`type=3`）的64×64像素风格PNG贴图。
- [x] **4.2** 在HUD中添加3个方块类型选择按钮（灰砖/垛口/烽火台），使用大图标按钮样式。
- [ ] **4.3** 使用Web Audio API或 `howler` 添加音效：方块放置音效（石块碰击声，~200ms WAV）和方块销毁音效（碎裂声，~300ms WAV）。
- [x] **4.4** 添加天空背景：使用 `@react-three/drei` 的 `<Sky>` 组件，配置白天场景参数。
- [x] **4.5** 方块放置粒子效果：使用R3F的 `<Points>` 组件，在放置点发射带动画的小石片粒子。
- [ ] **4.6** 优化 `<BlockGrid>`：实现基于区块的视锥剔除——仅在对应16×16区块的方块发生变化时更新 `InstancedMesh`。
- [ ] **4.7** 移动端性能：对 `devicePixelRatio > 1.5` 的设备降低几何体精度；移动端每种方块类型限制最多5,000个实例。
- [x] **4.8** 国际化脚手架：将所有UI字符串提取到 `i18n/zh-CN.json` 和 `i18n/en.json`；学校部署默认使用中文（zh-CN）。
- [x] **4.9** 部署配置：为服务端添加 `Dockerfile`，通过nginx提供静态 `dist/` 文件。添加 `docker-compose.yml` 用于本地全栈测试。
- [x] **4.10** 端到端冒烟测试：编写脚本模拟12个虚拟客户端加入，每个客户端放置50个方块，验证预设区段的完成事件能正常触发。
