import { create } from 'zustand'

export interface RemotePlayer {
  id: string
  groupId: number
  x: number
  y: number
  z: number
  avatarColor: string
  username: string
  avatarId: number
}

interface PlayerStoreState {
  players: Map<string, RemotePlayer>
  localGroupId: number | null
  localUsername: string | null
  localAvatarId: number | null
  setLocalGroupId: (id: number) => void
  setLocalProfile: (username: string, avatarId: number) => void
  upsertPlayer: (p: RemotePlayer) => void
  removePlayer: (id: string) => void
}

export const usePlayerStore = create<PlayerStoreState>((set) => ({
  players: new Map(),
  localGroupId: null,
  localUsername: null,
  localAvatarId: null,

  setLocalGroupId: (id) => set({ localGroupId: id }),

  setLocalProfile: (username, avatarId) => set({ localUsername: username, localAvatarId: avatarId }),

  upsertPlayer: (p) =>
    set((state) => {
      const players = new Map(state.players)
      players.set(p.id, p)
      return { players }
    }),

  removePlayer: (id) =>
    set((state) => {
      const players = new Map(state.players)
      players.delete(id)
      return { players }
    }),
}))
