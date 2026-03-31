import { Client, Room } from 'colyseus.js'

const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'ws://localhost:2567'

let colyseusClient: Client | null = null

function getClient(): Client {
  if (!colyseusClient) {
    colyseusClient = new Client(SERVER_URL)
  }
  return colyseusClient
}

export async function joinLobby(options?: Record<string, unknown>): Promise<Room> {
  return getClient().joinOrCreate('lobby', options ?? {})
}

export async function joinGroup(groupId: number): Promise<Room> {
  return getClient().joinOrCreate('group', { groupId })
}

export async function joinGroupById(roomId: string): Promise<Room> {
  return getClient().joinById(roomId)
}

export async function joinGroupAsTeacher(): Promise<Room[]> {
  const rooms: Room[] = []
  for (let g = 1; g <= 3; g++) {
    const room = await getClient().joinOrCreate('group', { groupId: g, isTeacher: true })
    rooms.push(room)
  }
  return rooms
}
