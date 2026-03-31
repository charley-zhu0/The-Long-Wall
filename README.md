# 长城协作建造游戏 (The Long Wall)

面向幼儿的多人在线3D像素（Voxel）协作游戏，玩家分组合作搭建与修复长城，培养空间想象力、动手能力和团队协作精神。

## 功能特色

- **多人协作**：最多12名玩家同时在线，分成3组（每组4人）各自完成长城修复任务
- **教师模式**：教师以上帝视角巡视各组，可高亮提示错误位置并发送鼓励标识
- **蓝图引导**：半透明虚影指引玩家在正确位置放置方块
- **实时同步**：基于 Colyseus 的权威服务端状态同步，延迟 ≤200ms
- **稳固性检测**：销毁方块时自动检测悬空结构并发出警告
- **多端支持**：PC（鼠标键盘）和平板（触屏）均可操作

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React + React Three Fiber (Three.js) + Zustand + Vite |
| 后端 | Node.js + Colyseus（状态同步 + 房间管理） |
| 网络 | WebSocket（Colyseus 协议） |
| 部署 | Docker + Nginx（反向代理 + SPA） |

---

## 快速开始（开发模式）

### 前置要求

- Node.js 18+
- npm 9+

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

同时启动：
- 客户端 Vite 开发服务器：`http://localhost:3000`
- 服务端 Colyseus：`ws://localhost:2567`

> Vite 已配置 `/colyseus` 路径的 WebSocket 代理，无需额外配置。

---

## 生产部署

### 方式一：Docker Compose（推荐）

```bash
docker compose up --build
```

启动后：
- 游戏入口：`http://localhost`（Nginx 端口 80）
- Colyseus 管理面板：`http://localhost:2567/colyseus`

服务说明：
- `game-server`：Node.js 游戏服务，端口 2567
- `nginx`：反向代理 + 静态文件服务，端口 80，`/colyseus/` 路径代理至游戏服务

### 方式二：手动构建

```bash
# 构建前后端
npm run build

# 启动服务端
node server/dist/index.js
```

环境变量：

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `PORT` | `2567` | 服务端监听端口 |
| `NODE_ENV` | `development` | 运行环境 |
| `VITE_SERVER_URL` | `ws://localhost:2567` | 客户端连接的服务端 WebSocket 地址 |

---

## 游戏操作说明

### PC 端

| 操作 | 功能 |
|------|------|
| 左键点击方块面 | 放置方块 |
| 右键点击方块 | 销毁方块 |
| 鼠标中键拖拽 | 旋转视角 |
| 鼠标右键拖拽 | 平移视角 |
| 滚轮 | 缩放视角 |

### 触屏/平板端

| 操作 | 功能 |
|------|------|
| 单指点击 | 放置方块 |
| 长按（500ms） | 销毁方块 |
| 单指拖拽 | 旋转视角 |

### 方块类型

| 图标 | 名称 | 说明 |
|------|------|------|
| 1 | 灰砖 | 基础砖块 |
| 2 | 垛口 | 长城顶部防御齿 |
| 3 | 烽火台 | 瞭望/信号台 |

---

## 角色说明

### 学生玩家

1. 打开 `http://localhost`
2. 查看新手引导（TutorialModal）后进入大厅
3. 系统自动分配至某一小组（1、2 或 3）
4. 在本组工作区内按照蓝图虚影放置方块，完成长城修复

### 教师

1. 打开 `http://localhost/teacher`
2. 以上帝视角飞行巡视各小组
3. 可点击"高亮"指定坐标，向学生显示错误或目标位置
4. 可向各组发送鼓励标识（⭐ 星星 / ❤️ 爱心 / 👍 点赞）
5. 在大厅就绪后，点击"开始游戏"触发各组房间创建

---

## 冒烟测试

需先启动服务端，再运行：

```bash
npx ts-node scripts/smoke-test.ts
```

模拟12个客户端并发连接，验证延迟 ≤200ms。

指定自定义服务地址：

```bash
SERVER_URL=ws://your-host:2567 npx ts-node scripts/smoke-test.ts
```

---

## 项目结构

```
The-Long-Wall/
├── client/                  # 前端（React + R3F）
│   └── src/
│       ├── components/      # 3D场景、HUD、教师视图等
│       ├── network/         # Colyseus 客户端
│       ├── store/           # Zustand 状态管理
│       └── i18n/            # 中英文翻译
├── server/                  # 后端（Node.js + Colyseus）
│   └── src/
│       ├── rooms/           # LobbyRoom、GroupRoom
│       ├── schema.ts        # 状态 Schema 定义
│       └── index.ts         # 服务入口
│   └── maps/
│       └── section-1.json   # 第一段长城蓝图数据
├── scripts/
│   └── smoke-test.ts        # 压力/延迟测试脚本
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
└── package.json             # npm workspaces 根配置
```

---

## 网格边界

服务端强制限制坐标范围，超出范围的方块操作会被静默拒绝：

- `x, z ∈ [-32, 32]`
- `y ∈ [0, 32]`

---

## License

MIT
