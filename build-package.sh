#!/usr/bin/env bash
# ============================================================
# build-package.sh  —  在本机构建并打包 The Long Wall
# 运行一次，生成可直接上传到目标服务器的 tar.gz
# 产物: the-long-wall-deploy.tar.gz
# ============================================================
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
STAGE_DIR="$(mktemp -d)"
PKG_NAME="the-long-wall-deploy"
PKG_DIR="$STAGE_DIR/$PKG_NAME"
OUTPUT="$REPO_DIR/${PKG_NAME}.tar.gz"

cleanup() { rm -rf "$STAGE_DIR"; }
trap cleanup EXIT

echo "==> [1/6] 构建 client ..."
cd "$REPO_DIR"
npm run build:client

echo "==> [2/6] 构建 server ..."
npm run build:server

echo "==> [3/6] 准备目录结构 ..."
# 打包目录结构（必须与 server/dist 里的相对路径计算一致）:
#
#   the-long-wall-deploy/
#     server/
#       dist/           ← server 编译产物，__dirname = .../server/dist
#       maps/           ← section-1.json，LobbyRoom.js 用 ../../maps 从 dist/rooms 到这里
#     client/
#       dist/           ← 静态文件，index.js 用 ../../client/dist 从 server/dist 到这里
#     node_modules/     ← server 生产依赖
#     package.json
#     nginx-ssl.conf
#     deploy.sh
#
# 路径验证：
#   index.js __dirname = .../the-long-wall-deploy/server/dist
#   distPath = resolve(__dirname, '../../client/dist')
#            = .../the-long-wall-deploy/client/dist  ✓
#
#   LobbyRoom.js __dirname = .../the-long-wall-deploy/server/dist/rooms
#   blueprintPath = resolve(__dirname, '../../maps/section-1.json')
#                 = .../the-long-wall-deploy/server/maps/section-1.json  ✓

mkdir -p "$PKG_DIR/server/dist/rooms"
mkdir -p "$PKG_DIR/server/maps"
mkdir -p "$PKG_DIR/client/dist"
mkdir -p "$PKG_DIR/certs"

# server 编译产物
cp -r "$REPO_DIR/server/dist/." "$PKG_DIR/server/dist/"

# server 地图数据
cp -r "$REPO_DIR/server/src/maps/." "$PKG_DIR/server/maps/"

# client 静态产物
cp -r "$REPO_DIR/client/dist/." "$PKG_DIR/client/dist/"

echo "==> [4/6] 安装 server 生产依赖（npm install）..."
cat > "$PKG_DIR/package.json" <<'PKGJSON'
{
  "name": "the-long-wall-server",
  "version": "1.0.0",
  "private": true,
  "main": "server/dist/index.js",
  "dependencies": {
    "@colyseus/monitor": "^0.15.5",
    "colyseus": "^0.15.21",
    "express": "^4.19.2"
  }
}
PKGJSON
cd "$PKG_DIR"
npm install --omit=dev --prefer-offline 2>&1 | tail -5

echo "==> [5/6] 复制部署配置文件 ..."
cp "$REPO_DIR/nginx-ssl.conf"            "$PKG_DIR/"
cp "$REPO_DIR/deploy/deploy.sh"          "$PKG_DIR/"
chmod +x "$PKG_DIR/deploy.sh"

echo "==> [6/6] 打包成 tar.gz ..."
cd "$STAGE_DIR"
tar -czf "$OUTPUT" "$PKG_NAME"

echo ""
echo "✅ 打包完成！"
echo "   文件: $OUTPUT"
echo "   大小: $(du -sh "$OUTPUT" | cut -f1)"
echo ""
echo "─────────────────────────────────────────────"
echo "   上传到目标服务器（替换 YOUR_SERVER_IP）:"
echo "   scp ${PKG_NAME}.tar.gz root@YOUR_SERVER_IP:~/"
echo ""
echo "   然后在目标服务器上执行:"
echo "   tar xzf ${PKG_NAME}.tar.gz"
echo "   cd ${PKG_NAME}"
echo "   bash deploy.sh"
echo "─────────────────────────────────────────────"
