import { Room, Client, matchMaker } from 'colyseus'
import { Schema, type } from '@colyseus/schema'
import * as fs from 'fs'
import * as path from 'path'

const MAX_PLAYERS = 12

class LobbyState extends Schema {
  @type('uint8') playerCount: number = 0
  @type('uint8') group1Count: number = 0
  @type('uint8') group2Count: number = 0
  @type('uint8') group3Count: number = 0
}

export class LobbyRoom extends Room<LobbyState> {
  maxClients = MAX_PLAYERS + 2 // +2 for teachers
  private playerGroups: Map<string, number> = new Map()
  private groupRoomIds: Map<number, string> = new Map()
  private groupPlayerCounts: Map<number, number> = new Map([
    [1, 0], [2, 0], [3, 0],
  ])
  private profiles: Map<string, { username: string; avatarId: number }> = new Map()

  onCreate() {
    this.setState(new LobbyState())

    this.onMessage('START_GAME', async (client) => {
      // Teacher triggers game start — create 3 group rooms
      await this.createGroupRooms()
    })

    this.onMessage('SET_PROFILE', (client, data: { username: string; avatarId: number }) => {
      this.profiles.set(client.sessionId, {
        username: data.username.slice(0, 8),
        avatarId: Math.min(7, Math.max(0, data.avatarId)),
      })
      this.broadcastGroupCounts()
    })

    this.onMessage('SELECT_GROUP', async (client, data: { groupId: number }) => {
      const groupId = data.groupId
      if (![1, 2, 3].includes(groupId)) return
      if ((this.groupPlayerCounts.get(groupId) ?? 0) >= 4) {
        client.send('GROUP_FULL', { groupId })
        return
      }

      this.playerGroups.set(client.sessionId, groupId)
      this.groupPlayerCounts.set(groupId, (this.groupPlayerCounts.get(groupId) ?? 0) + 1)
      this.state.playerCount++

      const roomId = this.groupRoomIds.get(groupId) ?? null
      const profile = this.profiles.get(client.sessionId) ?? { username: '玩家', avatarId: 0 }

      client.send('GROUP_CONFIRMED', { groupId, roomId, ...profile })
      this.broadcastGroupCounts()
    })
  }

  onJoin(client: Client, options: { isTeacher?: boolean }) {
    // Only broadcast current counts — no auto-assignment
    this.broadcastGroupCounts()
  }

  onLeave(client: Client) {
    const groupId = this.playerGroups.get(client.sessionId)
    if (groupId != null) {
      this.groupPlayerCounts.set(groupId, Math.max(0, (this.groupPlayerCounts.get(groupId) ?? 1) - 1))
      this.playerGroups.delete(client.sessionId)
      this.state.playerCount = Math.max(0, this.state.playerCount - 1)
    }
    this.profiles.delete(client.sessionId)
    this.broadcastGroupCounts()
  }

  private broadcastGroupCounts() {
    this.broadcast('LOBBY_STATE', {
      groupCounts: {
        1: this.groupPlayerCounts.get(1) ?? 0,
        2: this.groupPlayerCounts.get(2) ?? 0,
        3: this.groupPlayerCounts.get(3) ?? 0,
      },
    })
  }

  private async createGroupRooms() {
    const blueprintPath = path.resolve(__dirname, '../../maps/section-1.json')
    const blueprintData = JSON.parse(fs.readFileSync(blueprintPath, 'utf-8'))
    const blueprint = blueprintData.blocks as Array<{ x: number; y: number; z: number; type: number }>

    for (const groupId of [1, 2, 3]) {
      const room = await matchMaker.createRoom('group', { groupId, blueprint })
      this.groupRoomIds.set(groupId, room.roomId)
    }

    this.broadcast('GAME_STARTED', { groupRoomIds: Object.fromEntries(this.groupRoomIds) })
  }
}
