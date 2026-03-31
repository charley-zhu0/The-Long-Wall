# 设计文档：轻量化 HTTPS 一键部署优化

## 总体架构

保持现有双容器架构（nginx + game-server），重点优化：
1. 构建与运行分离（避免低内存机器 OOM）
2. nginx 增加 HTTPS 支持
3. 添加自签名证书生成逻辑
4. 提供一键部署脚本

```
宿主机
├── deploy.sh                   # 一键部署入口（用户唯一需修改的文件）
├── docker-compose.yml          # 运行时编排（不含 build，镜像预先构建）
├── docker-compose.build.yml    # 构建专用 compose（与运行分离）
├── Dockerfile                  # 多阶段构建（不变）
├── nginx.conf                  # HTTP → HTTPS 重定向
├── nginx-ssl.conf              # HTTPS + WSS 配置（新增）
└── certs/                      # 自签名证书目录（由 deploy.sh 生成）
    ├── server.crt
    └── server.key
```

## 各组件详细设计

### 1. 内存优化策略

**构建与运行分离**

在低内存机器上，不在运行时机器上执行 `docker build`。`deploy.sh` 提供两种模式：
- **本地构建模式**（默认）：在本机 `docker build`，导出镜像 tar，上传至目标机器后 `docker load`。
- **在线构建模式**（`--build-on-target`）：直接在目标机器上 build，适用于 2GB+ 机器，但增加 swap 建议。

**Node.js 内存限制**

在 `docker-compose.yml` 中为 `game-server` 容器设置内存限制，并通过 `NODE_OPTIONS` 限制 V8 堆大小：

```yaml
environment:
  - NODE_OPTIONS=--max-old-space-size=512
deploy:
  resources:
    limits:
      memory: 600m
```

nginx 容器本身内存占用 < 30MB，无需额外限制。

**nginx worker 进程数**

将 nginx worker 数固定为 1（低配机器无需多 worker），减少进程内存开销：

```nginx
worker_processes 1;
```

### 2. HTTPS 支持设计

**证书生成**

`deploy.sh` 中使用 `openssl` 生成自签名证书，证书中包含 SAN（Subject Alternative Name），使 Chrome 等现代浏览器接受：

```bash
openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
  -keyout certs/server.key \
  -out certs/server.crt \
  -subj "/CN=${SERVER_IP}" \
  -addext "subjectAltName=IP:${SERVER_IP}"
```

证书有效期 10 年，避免频繁更新。

**nginx SSL 配置（`nginx-ssl.conf`）**

```
server {
    listen 80;
    return 301 https://$host$request_uri;   # HTTP → HTTPS 重定向
}

server {
    listen 443 ssl;
    ssl_certificate     /etc/nginx/certs/server.crt;
    ssl_certificate_key /etc/nginx/certs/server.key;
    ssl_protocols       TLSv1.2 TLSv1.3;
    
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /colyseus/ {
        proxy_pass http://game-server:2567/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

**证书挂载**

`docker-compose.yml` 中 nginx 容器新增 certs 目录挂载：

```yaml
volumes:
  - ./client/dist:/usr/share/nginx/html:ro
  - ./nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro
  - ./certs:/etc/nginx/certs:ro
```

同时暴露 443 端口：

```yaml
ports:
  - '80:80'
  - '443:443'
```

### 3. 一键部署脚本 `deploy.sh`

**用户配置区（脚本顶部）**

```bash
# ===== 用户配置（仅需修改此处）=====
SERVER_IP="192.168.1.100"   # 填写服务器 IP 地址
# =====================================
```

**脚本执行流程**

```
1. 检查依赖（docker、docker compose、openssl）
2. 检查 certs/ 目录，若证书不存在则生成自签名证书
3. 检查 client/dist/ 目录，若不存在则执行构建
   - 若本机有 docker buildx，在本机构建并导出镜像
   - 否则提示用户先在另一台机器构建
4. 停止旧容器（docker compose down）
5. 启动新容器（docker compose up -d）
6. 等待健康检查通过（curl https://${SERVER_IP} -k，超时 60s）
7. 打印访问地址和部署完成信息
```

**依赖检查**

脚本检查以下工具是否存在：
- `docker`：提供安装提示（apt/yum）
- `docker compose`（v2 plugin）或 `docker-compose`（v1）：兼容两种格式
- `openssl`：用于生成证书

**错误处理**

- 使用 `set -euo pipefail`，任何命令失败立即退出
- 每步操作前打印进度信息（带颜色）
- 失败时打印诊断提示

### 4. 客户端 WebSocket URL 兼容性

客户端 `network/client.ts` 使用 `VITE_SERVER_URL` 环境变量，默认为 `ws://localhost:2567`。

为支持 HTTPS 场景下的 `wss://` 协议，`deploy.sh` 在构建客户端时注入正确的服务器 URL：

**方案**：`deploy.sh` 在构建前写入 `client/.env.production`：

```
VITE_SERVER_URL=wss://<SERVER_IP>/colyseus
```

这样构建出的客户端会通过 nginx 的 `/colyseus/` 路径反代 WebSocket，走 HTTPS/WSS。

> 注意：nginx 中 `/colyseus/` 路径的 proxy_pass 已存在，无需修改服务端。

### 5. 文件变更清单

| 文件 | 操作 | 说明 |
|---|---|---|
| `docker-compose.yml` | 修改 | 增加内存限制、443 端口、certs 挂载、ssl nginx conf |
| `nginx-ssl.conf` | 新增 | HTTPS + WSS 反代配置（含 HTTP→HTTPS 重定向） |
| `nginx.conf` | 保留 | 仅用于本地开发（HTTP only） |
| `deploy.sh` | 新增 | 一键部署脚本 |
| `.gitignore` | 修改 | 忽略 `certs/` 目录（证书不入版本控制） |

### 6. 本地开发不受影响

`nginx.conf`（HTTP）保持不变，`npm run dev` 流程不涉及任何新增文件。HTTPS 配置仅在生产部署（`docker compose up`）时生效。
