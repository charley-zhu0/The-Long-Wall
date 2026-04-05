import { Schema, MapSchema, type } from '@colyseus/schema'

export class BlockState extends Schema {
  @type('uint8')   blockType: number = 0
  @type('boolean') fixed: boolean = false
}

export class PlayerState extends Schema {
  @type('string') id: string = ''
  @type('uint8')  groupId: number = 0
  @type('float32') x: number = 0
  @type('float32') y: number = 0
  @type('float32') z: number = 0
  @type('string')  avatarColor: string = '#ffffff'
  @type('string')  username: string = ''
  @type('uint8')   avatarId: number = 0
}

export class LobbyState extends Schema {
  @type('uint8') playerCount: number = 0
  @type('uint8') group1Count: number = 0
  @type('uint8') group2Count: number = 0
  @type('uint8') group3Count: number = 0
}

export class GroupRoomState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>()
  @type({ map: BlockState })  blocks  = new MapSchema<BlockState>()
}
