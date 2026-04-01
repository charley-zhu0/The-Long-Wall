import { Room, Client } from 'colyseus'
import { GroupRoomState, BlockState, PlayerState } from '../schema'

const GRID = { minX: -32, maxX: 32, minY: 0, maxY: 32, minZ: -32, maxZ: 32 }
const AVATAR_COLORS = ['#FF6B6B', '#FF9F43', '#FFD93D', '#6BCB77', '#4ECDC4', '#4D96FF', '#9B59B6', '#FF6FB7']

type PlaceMsg   = { type: 'PLACE_BLOCK';   x: number; y: number; z: number; blockType: number }
type DestroyMsg = { type: 'DESTROY_BLOCK'; x: number; y: number; z: number }
type MoveMsg    = { type: 'MOVE';          x: number; y: number; z: number }
type TeacherHighlight = { type: 'TEACHER_HIGHLIGHT'; groupId: number; x: number; y: number; z: number }
type TeacherEncourage = { type: 'TEACHER_ENCOURAGE'; groupId: number; message: 'star' | 'heart' | 'thumbsup' }

export class GroupRoom extends Room<GroupRoomState> {
  maxClients = 5 // 4 students + 1 teacher observer
  private groupId: number = 1
  private targetBlocks: Set<string> = new Set()
  private fixedBlocks: Set<string> = new Set()

  onCreate(options: { groupId?: number; blueprint?: Array<{ x: number; y: number; z: number; type: number; fixed?: boolean }> }) {
    this.groupId = options.groupId ?? 1
    this.setState(new GroupRoomState())

    // Load blueprint if provided
    if (options.blueprint) {
      this.loadBlueprint(options.blueprint)
    }

    this.onMessage('PLACE_BLOCK', (client, msg: PlaceMsg) => {
      if (!this.inBounds(msg.x, msg.y, msg.z)) return
      const key = `${msg.x},${msg.y},${msg.z}`
      const block = new BlockState()
      block.blockType = msg.blockType ?? 1
      this.state.blocks.set(key, block)
      this.checkCompletion()
    })

    this.onMessage('DESTROY_BLOCK', (client, msg: DestroyMsg) => {
      const key = `${msg.x},${msg.y},${msg.z}`
      this.state.blocks.delete(key)
      this.runFloatingCheck()
    })

    this.onMessage('MOVE', (client, msg: MoveMsg) => {
      const player = this.state.players.get(client.sessionId)
      if (!player) return
      player.x = msg.x
      player.y = msg.y
      player.z = msg.z
    })

    this.onMessage('TEACHER_HIGHLIGHT', (client, msg: TeacherHighlight) => {
      this.broadcast('TEACHER_HIGHLIGHT', msg)
    })

    this.onMessage('TEACHER_ENCOURAGE', (client, msg: TeacherEncourage) => {
      this.broadcast('TEACHER_ENCOURAGE', msg)
    })
  }

  onJoin(client: Client, options: { groupId?: number; isTeacher?: boolean; username?: string; avatarId?: number }) {
    const player = new PlayerState()
    player.id = client.sessionId
    player.groupId = this.groupId
    player.username = options.username ?? '玩家'
    player.avatarId = options.avatarId ?? 0
    player.avatarColor = AVATAR_COLORS[player.avatarId] ?? '#ffffff'
    this.state.players.set(client.sessionId, player)
  }

  onLeave(client: Client) {
    this.state.players.delete(client.sessionId)
  }

  private inBounds(x: number, y: number, z: number): boolean {
    return (
      x >= GRID.minX && x <= GRID.maxX &&
      y >= GRID.minY && y <= GRID.maxY &&
      z >= GRID.minZ && z <= GRID.maxZ
    )
  }

  private loadBlueprint(blocks: Array<{ x: number; y: number; z: number; type: number; fixed?: boolean }>) {
    const repairBlocks: typeof blocks = []

    for (const b of blocks) {
      const key = `${b.x},${b.y},${b.z}`
      this.targetBlocks.add(key)
      if (b.fixed) {
        // Fixed section: place directly, never removed
        this.fixedBlocks.add(key)
        const block = new BlockState()
        block.blockType = b.type
        this.state.blocks.set(key, block)
      } else {
        repairBlocks.push(b)
      }
    }

    // Repair section: randomly keep 70% (remove 30%)
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
    if (this.targetBlocks.size === 0) return
    // Only check repair section (non-fixed blocks)
    const repairTargets = [...this.targetBlocks].filter(k => !this.fixedBlocks.has(k))
    if (repairTargets.length === 0) return
    for (const key of repairTargets) {
      if (!this.state.blocks.has(key)) return
    }
    this.broadcast('SECTION_COMPLETE', { groupId: this.groupId })
  }

  // BFS from ground level — detect floating blocks
  private runFloatingCheck() {
    const allKeys = new Set(this.state.blocks.keys())
    const grounded = new Set<string>()

    // Seed: blocks at y=0 are grounded
    const queue: string[] = []
    for (const key of allKeys) {
      const [, y] = key.split(',').map(Number)
      if (y === 0) {
        grounded.add(key)
        queue.push(key)
      }
    }

    const neighbors = (x: number, y: number, z: number) => [
      `${x+1},${y},${z}`, `${x-1},${y},${z}`,
      `${x},${y+1},${z}`, `${x},${y-1},${z}`,
      `${x},${y},${z+1}`, `${x},${y},${z-1}`,
    ]

    while (queue.length) {
      const key = queue.pop()!
      const [x, y, z] = key.split(',').map(Number)
      for (const nk of neighbors(x, y, z)) {
        if (allKeys.has(nk) && !grounded.has(nk)) {
          grounded.add(nk)
          queue.push(nk)
        }
      }
    }

    const unstable: Array<{ x: number; y: number; z: number }> = []
    for (const key of allKeys) {
      if (!grounded.has(key)) {
        const [x, y, z] = key.split(',').map(Number)
        unstable.push({ x, y, z })
      }
    }

    if (unstable.length > 0) {
      this.broadcast('UNSTABLE_WARNING', { positions: unstable })
    }
  }
}
