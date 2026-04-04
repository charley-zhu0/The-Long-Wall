#!/usr/bin/env bash
# ============================================================
# deploy.sh — The Long Wall 一键部署脚本
# 在目标服务器上运行，需要 Docker + Node.js(v18+)
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# ── 颜色输出 ────────────────────────────────────────────────
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}==>${NC} $*"; }
warn()  { echo -e "${YELLOW}[!]${NC} $*"; }
error() { echo -e "${RED}[✗]${NC} $*"; exit 1; }

# ── 检查依赖 ────────────────────────────────────────────────
command -v node    >/dev/null 2>&1 || error "未找到 node，请先安装 Node.js v18+"
command -v docker  >/dev/null 2>&1 || error "未找到 docker，请先安装 Docker"
command -v openssl >/dev/null 2>&1 || error "未找到 openssl，请先安装 openssl"
command -v curl    >/dev/null 2>&1 || error "未找到 curl，请先安装 curl"

NODE_VER=$(node -e "process.stdout.write(process.version)")
info "Node.js 版本: $NODE_VER"

# 检查 node_modules 是否存在
[ -d "$SCRIPT_DIR/node_modules" ] || error "node_modules 目录不存在，打包可能不完整"
# 检查 server 编译产物
[ -f "$SCRIPT_DIR/server/dist/index.js" ] || error "server/dist/index.js 不存在，打包可能不完整"
# 检查 client 静态文件
[ -f "$SCRIPT_DIR/client/dist/index.html" ] || error "client/dist/index.html 不存在，打包可能不完整"
# 检查地图数据
[ -f "$SCRIPT_DIR/server/maps/section-1.json" ] || error "server/maps/section-1.json 不存在，打包可能不完整"

# ── 输入公网 IP ─────────────────────────────────────────────
echo ""
echo "┌──────────────────────────────────────────────┐"
echo "│      The Long Wall — 部署配置                │"
echo "└──────────────────────────────────────────────┘"
echo ""

# 尝试自动检测公网 IP
DETECTED_IP=""
DETECTED_IP=$(curl -sf --max-time 5 https://api.ipify.org 2>/dev/null || \
              curl -sf --max-time 5 https://ifconfig.me  2>/dev/null || true)
if [ -n "$DETECTED_IP" ]; then
    echo "  检测到公网 IP: $DETECTED_IP"
    read -rp "  请输入公网 IP [直接回车使用检测到的 IP]: " INPUT_IP
    PUBLIC_IP="${INPUT_IP:-$DETECTED_IP}"
else
    read -rp "  请输入服务器公网 IP: " PUBLIC_IP
fi

# 验证格式
if ! echo "$PUBLIC_IP" | grep -qE '^([0-9]{1,3}\.){3}[0-9]{1,3}$'; then
    error "IP 格式不正确: $PUBLIC_IP"
fi
info "使用公网 IP: $PUBLIC_IP"

# ── 生成自签名 SSL 证书 ─────────────────────────────────────
info "生成自签名 SSL 证书（CN=$PUBLIC_IP）..."
mkdir -p certs

# SAN（Subject Alternative Name）让浏览器正确识别 IP 地址证书
cat > /tmp/openssl-san.cnf <<SSLCNF
[req]
default_bits       = 2048
prompt             = no
default_md         = sha256
distinguished_name = dn
x509_extensions    = v3_req

[dn]
CN = $PUBLIC_IP

[v3_req]
subjectAltName = @alt_names
keyUsage       = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
IP.1 = $PUBLIC_IP
IP.2 = 127.0.0.1
SSLCNF

openssl req -x509 -nodes \
    -days 3650 \
    -newkey rsa:2048 \
    -keyout certs/server.key \
    -out    certs/server.crt \
    -config /tmp/openssl-san.cnf 2>/dev/null

info "证书生成完毕（有效期 10 年）"

# ── 停止旧实例 ───────────────────────────────────────────────
info "停止旧进程（如有）..."

# 停止 nginx（只操作我们自己生成的 docker-compose.run.yml）
if [ -f "$SCRIPT_DIR/docker-compose.run.yml" ]; then
    docker compose -f "$SCRIPT_DIR/docker-compose.run.yml" down 2>/dev/null || true
fi

# 停止旧的 game-server（用 PID 文件，避免误杀其他 node 进程）
if [ -f "$SCRIPT_DIR/game-server.pid" ]; then
    OLD_PID=$(cat "$SCRIPT_DIR/game-server.pid")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        kill "$OLD_PID" 2>/dev/null || true
        sleep 1
    fi
    rm -f "$SCRIPT_DIR/game-server.pid"
fi

# ── 启动 game-server（Node.js 直接运行，不用 Docker）────────
info "启动游戏服务器（Node.js on :2567）..."
mkdir -p logs

# 确认 server/dist/index.js 在对的位置
SERVER_ENTRY="$SCRIPT_DIR/server/dist/index.js"

NODE_OPTIONS="--max-old-space-size=400" \
PORT=2567 \
NODE_ENV=production \
nohup node "$SERVER_ENTRY" > logs/game-server.log 2>&1 &

GAME_PID=$!
echo "$GAME_PID" > game-server.pid
info "游戏服务器 PID: $GAME_PID"

# 等待服务器启动（最多10秒）
STARTED=0
for i in $(seq 1 10); do
    sleep 1
    if ! kill -0 $GAME_PID 2>/dev/null; then
        error "游戏服务器启动失败！日志如下：\n$(cat logs/game-server.log)"
    fi
    if grep -q "listening" logs/game-server.log 2>/dev/null; then
        STARTED=1
        break
    fi
done

if [ $STARTED -eq 0 ]; then
    warn "服务器进程存活但未检测到 listening 日志，继续部署..."
    warn "请手动检查: tail -f $SCRIPT_DIR/logs/game-server.log"
fi

info "游戏服务器已启动"

# ── 生成 nginx docker-compose 配置 ──────────────────────────
info "生成 nginx 配置..."

# network_mode: host 让 nginx 容器与宿主机共享网络，
# 从而能访问宿主机上 127.0.0.1:2567 的 game-server
cat > "$SCRIPT_DIR/docker-compose.run.yml" <<DKYML
version: '3.9'
services:
  nginx:
    image: nginx:alpine
    network_mode: host
    volumes:
      - $SCRIPT_DIR/client/dist:/usr/share/nginx/html:ro
      - $SCRIPT_DIR/nginx-ssl.conf:/etc/nginx/nginx.conf:ro
      - $SCRIPT_DIR/certs:/etc/nginx/certs:ro
    restart: unless-stopped
DKYML

# ── 启动 nginx（Docker）─────────────────────────────────────
info "启动 nginx（Docker，host 网络模式）..."
docker compose -f "$SCRIPT_DIR/docker-compose.run.yml" up -d

# ── 验证 ─────────────────────────────────────────────────────
sleep 2
info "验证服务状态..."

if kill -0 $GAME_PID 2>/dev/null; then
    echo -e "   游戏服务器: ${GREEN}运行中${NC} (PID $GAME_PID)"
else
    warn "游戏服务器可能已退出，请检查 logs/game-server.log"
fi

NGINX_STATUS=$(docker compose -f "$SCRIPT_DIR/docker-compose.run.yml" ps --format json 2>/dev/null || \
               docker compose -f "$SCRIPT_DIR/docker-compose.run.yml" ps 2>/dev/null)
if echo "$NGINX_STATUS" | grep -qi "running\|Up"; then
    echo -e "   nginx:       ${GREEN}运行中${NC}"
else
    warn "nginx 可能未正常启动"
    warn "请检查: docker compose -f $SCRIPT_DIR/docker-compose.run.yml logs"
fi

# ── 防火墙提示 ───────────────────────────────────────────────
echo ""
echo "┌──────────────────────────────────────────────────────────┐"
echo "│  部署完成！                                              │"
echo "└──────────────────────────────────────────────────────────┘"
echo ""
echo -e "  🌐 访问地址: ${GREEN}https://${PUBLIC_IP}${NC}"
echo "  📖 教师端:   https://${PUBLIC_IP}/teacher"
echo ""
echo "  ⚠️  浏览器会提示「不安全」，点击「高级」→「继续访问」即可"
echo "     （这是自签名证书的正常现象）"
echo ""
echo "  ⚠️  阿里云服务器需在控制台「安全组」中开放以下端口："
echo "     TCP 443（HTTPS）"
echo "     TCP 80 （HTTP，自动跳转到 HTTPS）"
echo ""
echo "  🔧 常用命令："
echo "     查看服务器日志:  tail -f $SCRIPT_DIR/logs/game-server.log"
echo "     查看 nginx 日志: docker compose -f $SCRIPT_DIR/docker-compose.run.yml logs -f"
echo "     停止所有服务:    bash $SCRIPT_DIR/stop.sh"
echo ""

# ── 生成 stop.sh ─────────────────────────────────────────────
cat > "$SCRIPT_DIR/stop.sh" <<STOPSH
#!/usr/bin/env bash
SCRIPT_DIR="\$(cd "\$(dirname "\$0")" && pwd)"
echo "停止 nginx..."
docker compose -f "\$SCRIPT_DIR/docker-compose.run.yml" down 2>/dev/null || true
echo "停止游戏服务器..."
if [ -f "\$SCRIPT_DIR/game-server.pid" ]; then
    PID=\$(cat "\$SCRIPT_DIR/game-server.pid")
    kill "\$PID" 2>/dev/null && echo "  已停止 (PID \$PID)" || echo "  进程已不存在"
    rm -f "\$SCRIPT_DIR/game-server.pid"
fi
echo "已全部停止。"
STOPSH
chmod +x "$SCRIPT_DIR/stop.sh"
