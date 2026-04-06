import { create } from 'zustand'

export type BlockType = 1 | 2 | 3 | 4 | 5 // 1=普通城墙, 2=垛口, 3=烽火台, 4=窗户, 5=门洞

interface BlockEntry {
  type: BlockType
  fixed?: boolean
}

interface BlockStoreState {
  blocks: Map<string, BlockEntry>
  history: Array<{ key: string; prev: BlockEntry | null }>
  touchMode: 'place' | 'erase'
  placeBlock: (x: number, y: number, z: number, type: BlockType) => void
  destroyBlock: (x: number, y: number, z: number) => { blocked: boolean }
  setBlocks: (entries: Map<string, { type: BlockType; fixed?: boolean }>) => void
  undo: () => void
  setTouchMode: (mode: 'place' | 'erase') => void
}

export const encodeKey = (x: number, y: number, z: number) => `${x},${y},${z}`

export const useBlockStore = create<BlockStoreState>((set) => ({
  blocks: new Map(),
  history: [],
  touchMode: 'place',

  placeBlock: (x, y, z, type) =>
    set((state) => {
      const key = encodeKey(x, y, z)
      const prev = state.blocks.get(key) ?? null
      const blocks = new Map(state.blocks)
      blocks.set(key, { type })
      return {
        blocks,
        history: [...state.history, { key, prev }],
      }
    }),

  destroyBlock: (x, y, z) => {
    let blocked = false
    set((state) => {
      const key = encodeKey(x, y, z)
      if (!state.blocks.has(key)) return state
      const prev = state.blocks.get(key)!
      // Do not destroy fixed (initial wall) blocks on the client
      if (prev.fixed) {
        blocked = true
        return state
      }
      const blocks = new Map(state.blocks)
      blocks.delete(key)
      return {
        blocks,
        history: [...state.history, { key, prev }],
      }
    })
    return { blocked }
  },

  setBlocks: (entries) =>
    set(() => {
      const blocks = new Map<string, BlockEntry>()
      for (const [key, val] of entries) {
        blocks.set(key, { type: val.type, fixed: val.fixed ?? false })
      }
      return { blocks, history: [] }
    }),

  undo: () =>
    set((state) => {
      if (state.history.length === 0) return state
      const history = [...state.history]
      const last = history.pop()!
      const blocks = new Map(state.blocks)
      if (last.prev === null) {
        blocks.delete(last.key)
      } else {
        blocks.set(last.key, last.prev)
      }
      return { blocks, history }
    }),

  setTouchMode: (mode) => set({ touchMode: mode }),
}))
