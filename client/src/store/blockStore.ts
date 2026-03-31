import { create } from 'zustand'

export type BlockType = 1 | 2 | 3 // 1=灰砖, 2=垛口, 3=烽火台

interface BlockEntry {
  type: BlockType
}

interface BlockStoreState {
  blocks: Map<string, BlockEntry>
  selectedType: BlockType
  history: Array<{ key: string; prev: BlockEntry | null }>
  placeBlock: (x: number, y: number, z: number, type: BlockType) => void
  destroyBlock: (x: number, y: number, z: number) => void
  setBlocks: (entries: Map<string, { type: BlockType }>) => void
  undo: () => void
  setSelectedType: (type: BlockType) => void
}

export const encodeKey = (x: number, y: number, z: number) => `${x},${y},${z}`

export const useBlockStore = create<BlockStoreState>((set) => ({
  blocks: new Map(),
  selectedType: 1,
  history: [],

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

  destroyBlock: (x, y, z) =>
    set((state) => {
      const key = encodeKey(x, y, z)
      if (!state.blocks.has(key)) return state
      const prev = state.blocks.get(key)!
      const blocks = new Map(state.blocks)
      blocks.delete(key)
      return {
        blocks,
        history: [...state.history, { key, prev }],
      }
    }),

  setBlocks: (entries) =>
    set(() => {
      const blocks = new Map<string, BlockEntry>()
      for (const [key, val] of entries) {
        blocks.set(key, { type: val.type })
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

  setSelectedType: (type) => set({ selectedType: type }),
}))
