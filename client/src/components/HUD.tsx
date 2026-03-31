import React from 'react'
import { useBlockStore } from '../store/blockStore'

const BLOCK_LABELS: Record<number, string> = {
  1: '灰砖',
  2: '垛口',
  3: '烽火台',
}

export default function HUD({ isTouch = false }: { isTouch?: boolean }) {
  const blocks = useBlockStore((s) => s.blocks)
  const undo = useBlockStore((s) => s.undo)
  const history = useBlockStore((s) => s.history)
  const selectedType = useBlockStore((s) => s.selectedType)
  const setSelectedType = useBlockStore((s) => s.setSelectedType)
  const touchMode = useBlockStore((s) => s.touchMode)
  const setTouchMode = useBlockStore((s) => s.setTouchMode)

  const blockTypeSelector = (
    <div style={{ display: 'flex', gap: 8 }}>
      {([1, 2, 3] as const).map((type) => (
        <button
          key={type}
          onClick={() => setSelectedType(type)}
          style={{
            padding: isTouch ? '12px 20px' : '8px 16px',
            fontSize: isTouch ? 18 : 16,
            borderRadius: 8,
            border: selectedType === type ? '3px solid #f1c40f' : '3px solid transparent',
            background: selectedType === type ? '#2980b9' : '#555',
            color: '#fff',
            cursor: 'pointer',
            fontWeight: 'bold',
            minWidth: isTouch ? 48 : undefined,
            minHeight: isTouch ? 48 : undefined,
          }}
        >
          {BLOCK_LABELS[type]}
        </button>
      ))}
    </div>
  )

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
            padding: isTouch ? '12px 24px' : '8px 20px',
            fontSize: isTouch ? 20 : 18,
            borderRadius: 8,
            border: 'none',
            background: history.length === 0 ? '#666' : '#e67e22',
            color: '#fff',
            cursor: history.length === 0 ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            minWidth: isTouch ? 48 : undefined,
            minHeight: isTouch ? 48 : undefined,
          }}
        >
          ↩ 撤销
        </button>

        {/* Block type selector — top bar for PC only */}
        {!isTouch && <div style={{ marginLeft: 'auto' }}>{blockTypeSelector}</div>}
      </div>

      {/* Crosshair — PC only */}
      {!isTouch && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'rgba(255,255,255,0.7)',
          fontSize: 28,
          pointerEvents: 'none',
        }}>+</div>
      )}

      {/* Bottom bar — touch only: block type selector + place/erase toggle */}
      {isTouch && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          pointerEvents: 'auto',
        }}>
          {blockTypeSelector}
          <div style={{ width: 1, height: 48, background: 'rgba(255,255,255,0.3)', margin: '0 4px' }} />
          <button
            onClick={() => setTouchMode('place')}
            style={{
              width: 90,
              height: 56,
              fontSize: 20,
              borderRadius: 12,
              border: 'none',
              background: touchMode === 'place' ? '#2980b9' : '#555',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            放置 🧱
          </button>
          <button
            onClick={() => setTouchMode('erase')}
            style={{
              width: 90,
              height: 56,
              fontSize: 20,
              borderRadius: 12,
              border: 'none',
              background: touchMode === 'erase' ? '#c0392b' : '#555',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            拆除 🔨
          </button>
        </div>
      )}
    </div>
  )
}
