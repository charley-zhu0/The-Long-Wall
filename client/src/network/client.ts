import { Client, Room } from 'colyseus.js'

// 自动适配协议和域名：
//   开发环境 (localhost)     → ws://localhost:2567       (直连，不走 nginx)
//   生产环境 (https访问)     → wss://your-ip/colyseus    (走 nginx wss 代理)
//   生产环境 (http访问)      → ws://your-ip/colyseus
function resolveServerUrl(): string {
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL as string
  }
  const { protocol, hostname, port } = window.location
  // 本地开发直连游戏服务器
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `ws://${hostname}:2567`
  }
  // 生产：通过 nginx /colyseus 代理转发，协议跟随页面
  const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:'
  const portSuffix = (port && port !== '443' && port !== '80') ? `:${port}` : ''
  return `${wsProtocol}//${hostname}${portSuffix}/colyseus`
}

const SERVER_URL = resolveServerUrl()

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
