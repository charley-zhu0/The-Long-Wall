# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A multiplayer voxel (3D pixel) game where children cooperatively build/repair sections of the Great Wall. Up to 12 players split into 3 groups of 4, with a teacher observer role. The tech spec is in `task.md`.

## Commands

### Development
```bash
# Run both client and server in watch mode
npm run dev

# Run individually
npm run dev --workspace=client   # Vite dev server on :3000
npm run dev --workspace=server   # ts-node-dev on :2567
```

### Build
```bash
npm run build              # Build both client and server
npm run build:client
npm run build:server
```

### Smoke test (requires running server)
```bash
npx ts-node scripts/smoke-test.ts   # Simulates 12 clients, checks latency ≤200ms
SERVER_URL=ws://host:2567 npx ts-node scripts/smoke-test.ts
```

### Production (Docker)
```bash
docker compose up --build
# Nginx on :80 (SPA + WebSocket proxy), Colyseus on :2567
# Colyseus monitor admin panel: http://localhost:2567/colyseus
```

## Architecture

This is an npm workspaces monorepo with `client/` and `server/` packages.

### Server (`server/src/`)
- **`index.ts`** — Express + Colyseus server on `PORT` (default 2567). Registers two room types and serves static client build.
- **`schema.ts`** — Colyseus `@colyseus/schema` definitions: `PlayerState`, `BlockState`, `GroupRoomState`. Block positions are encoded as `"x,y,z"` string keys in a `MapSchema`.
- **`rooms/LobbyRoom.ts`** — Waiting room (max 14 clients). Assigns players to groups 1–3 (round-robin least-full). Teacher triggers `START_GAME` to create group rooms.
- **`rooms/GroupRoom.ts`** — Per-group room (max 5: 4 students + teacher). Handles `PLACE_BLOCK`, `DESTROY_BLOCK`, `MOVE`, `TEACHER_HIGHLIGHT`, `TEACHER_ENCOURAGE`. Runs BFS floating-block detection on destroy; broadcasts `UNSTABLE_WARNING`. Blueprint mode: loads a `section-*.json` map, pre-fills 70% of blocks, tracks `targetBlocks` set, broadcasts `SECTION_COMPLETE` when all filled.
- **`maps/section-1.json`** — Blueprint data for the first Great Wall section.

The server is the authoritative state owner. All block/player mutations go through Colyseus `MapSchema` which auto-broadcasts deltas to clients.

### Client (`client/src/`)
- **`main.tsx` / `App.tsx`** — Entry point. Route `/teacher` renders `TeacherHUD`; all other routes show `TutorialModal` then `VoxelScene`.
- **`network/client.ts`** — Colyseus.js singleton. `VITE_SERVER_URL` env var overrides server URL (default `ws://localhost:2567`). Three join functions: `joinLobby()`, `joinGroup(groupId)`, `joinGroupAsTeacher()`.
- **`store/blockStore.ts`** — Zustand store for local block state. Block types: `1=灰砖` (grey brick), `2=垛口` (merlon), `3=烽火台` (beacon tower). Maintains undo history.
- **`store/playerStore.ts`** — Zustand store for remote player positions and local `groupId`.
- **`components/VoxelScene.tsx`** — Main 3D canvas: React Three Fiber `<Canvas>` with `BlockGrid`, `InputController`, `HUD`, OrbitControls (middle=orbit, right=pan).
- **`components/BlockGrid.tsx`** — Renders blocks as Three.js `InstancedMesh` (one per block type for performance).
- **`components/InputController.tsx`** — Raycasting for block placement/destruction. PC: left click = place, right click = destroy. Touch: tap = place, long-press 500ms = destroy.
- **`components/BlueprintOverlay.tsx`** — Semi-transparent blueprint ghost showing target block positions.
- **`components/TeacherHUD.tsx`** — Teacher god-view: fly camera, highlight/encourage controls per group.
- **`components/TutorialModal.tsx`** — Tutorial shown before gameplay begins.
- **`i18n/`** — `zh-CN.json` and `en.json` translation files.

### Key WebSocket Messages
| Message | Direction | Description |
|---|---|---|
| `PLACE_BLOCK` | client→server | `{x,y,z,blockType}` |
| `DESTROY_BLOCK` | client→server | `{x,y,z}` |
| `MOVE` | client→server | `{x,y,z}` |
| `TEACHER_HIGHLIGHT` | client→server→broadcast | `{groupId,x,y,z}` |
| `TEACHER_ENCOURAGE` | client→server→broadcast | `{groupId,message:'star'|'heart'|'thumbsup'}` |
| `SECTION_COMPLETE` | server→broadcast | `{groupId}` |
| `UNSTABLE_WARNING` | server→broadcast | `{positions:[{x,y,z}]}` |
| `GROUP_ASSIGNED` | server→client | `{groupId}` |

### Grid Bounds
Server enforces `x,z ∈ [-32, 32]`, `y ∈ [0, 32]`. Blocks outside bounds are silently rejected.

### Vite Dev Proxy
In development, `/colyseus` requests are proxied from `:3000` to `ws://localhost:2567` (configured in `vite.config.ts`). In production, nginx handles this proxy.
