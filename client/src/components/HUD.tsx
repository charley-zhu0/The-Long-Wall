import React from 'react'
import { useBlockStore } from '../store/blockStore'

const BLOCK_LABELS: Record<number, string> = {
  1: '灰砖',
  2: '垛口',
  3: '烽火台',
}

export default function HUD() {
  const blocks = useBlockStore((s) => s.blocks)
  const undo = useBlockStore((s) => s.undo)
  const history = useBlockStore((s) => s.history)
  const selectedType = useBlockStore((s) => s.selectedType)
  const setSelectedType = useBlockStore((s) => s.setSelectedType)

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      pointerEvents: 'none',
      zIndex: 10,
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '12px 20px',
        background: 'rgba(0,0,0,0.45)',
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        pointerEvents: 'auto',
      }}>
        <span>🧱 {blocks.size} 块</span>
        <button
          onClick={undo}
          disabled={history.length === 0}
          style={{
            padding: '8px 20px',
            fontSize: 18,
            borderRadius: 8,
            border: 'none',
            background: history.length === 0 ? '#666' : '#e67e22',
            color: '#fff',
            cursor: history.length === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          ↩ 撤销
        </button>

        {/* Block type selector */}
        <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
          {([1, 2, 3] as const).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              style={{
                padding: '8px 16px',
                fontSize: 16,
                borderRadius: 8,
                border: selectedType === type ? '3px solid #f1c40f' : '3px solid transparent',
                background: selectedType === type ? '#2980b9' : '#555',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              {BLOCK_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Crosshair */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        color: 'rgba(255,255,255,0.7)',
        fontSize: 28,
        pointerEvents: 'none',
      }}>+</div>
    </div>
  )
}
