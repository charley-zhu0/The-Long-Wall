#!/usr/bin/env bash
set -euo pipefail

# ===== 用户配置（仅需修改此处）=====
SERVER_IP="192.168.1.100"
# =====================================

CERTS_DIR="./certs"
CLIENT_ENV="./client/.env.production"

# 颜色输出
info()  { echo -e "\033[0;34m[INFO]\033[0m  $*"; }
ok()    { echo -e "\033[0;32m[OK]\033[0m    $*"; }
error() { echo -e "\033[0;31m[ERROR]\033[0m $*" >&2; exit 1; }

# 1. 检查依赖
info "检查依赖..."
command -v docker  >/dev/null 2>&1 || error "未找到 docker，请先安装：https://docs.docker.com/engine/install/"
command -v openssl >/dev/null 2>&1 || error "未找到 openssl，请先安装：sudo apt install openssl"
command -v curl    >/dev/null 2>&1 || error "未找到 curl，请先安装：sudo apt install curl"

# 兼容 docker compose v2 和 docker-compose v1
if docker compose version >/dev/null 2>&1; then
    COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE="docker-compose"
else
    error "未找到 docker compose 或 docker-compose，请先安装"
fi
ok "依赖检查通过（使用 ${COMPOSE}）"

# 2. 生成自签名证书
if [ ! -f "${CERTS_DIR}/server.crt" ] || [ ! -f "${CERTS_DIR}/server.key" ]; then
    info "生成自签名 SSL 证书（有效期 10 年）..."
    mkdir -p "${CERTS_DIR}"
    openssl req -x509 -nodes -newkey rsa:2048 -days 3650 \
        -keyout "${CERTS_DIR}/server.key" \
        -out    "${CERTS_DIR}/server.crt" \
        -subj   "/CN=${SERVER_IP}" \
        -addext "subjectAltName=IP:${SERVER_IP}" \
        2>/dev/null
    ok "证书已生成：${CERTS_DIR}/server.crt"
else
    ok "证书已存在，跳过生成"
fi

# 3. 写入客户端生产环境配置（构建前必须写入，Vite 构建时读取）
info "配置客户端 WebSocket 地址..."
echo "VITE_SERVER_URL=wss://${SERVER_IP}/colyseus" > "${CLIENT_ENV}"
ok "已写入 ${CLIENT_ENV}：VITE_SERVER_URL=wss://${SERVER_IP}/colyseus"

# 4. 构建镜像（包含客户端构建，会读取 .env.production）
info "构建 Docker 镜像（首次构建约需 5–8 分钟）..."
$COMPOSE build
ok "镜像构建完成"

# 5. 停止旧容器并启动新容器
info "启动服务..."
$COMPOSE down --remove-orphans 2>/dev/null || true
$COMPOSE up -d
ok "容器已启动"

# 6. 等待服务就绪
info "等待服务就绪..."
MAX_WAIT=60
WAITED=0
until curl -k -sf "https://${SERVER_IP}" >/dev/null 2>&1; do
    if [ $WAITED -ge $MAX_WAIT ]; then
        error "服务启动超时（${MAX_WAIT}s），请运行 '${COMPOSE} logs' 查看日志"
    fi
    sleep 2
    WAITED=$((WAITED + 2))
done

echo ""
echo "======================================================"
ok "部署完成！"
echo ""
echo "  访问地址：https://${SERVER_IP}"
echo "  教师端：  https://${SERVER_IP}/teacher"
echo ""
echo "  提示：首次访问时浏览器会提示证书不受信任，"
echo "        点击「高级」→「继续访问」即可。"
echo "======================================================"
