import React, { useState, useEffect } from 'react'
import { Room } from 'colyseus.js'
import { usePlayerStore } from '../store/playerStore'

const GROUP_NAMES: Record<number, string> = { 1: '太阳组', 2: '大树组', 3: '小花组' }
const GROUP_ICONS: Record<number, string> = { 1: '☀️', 2: '🌳', 3: '🌸' }
const GROUP_COLORS: Record<number, string> = { 1: '#FFD93D', 2: '#6BCB77', 3: '#FF6FB7' }

interface Props {
  lobbyRoom: Room
  onDone: (groupId: number, roomId: string | null) => void
}

export default function GroupSelector({ lobbyRoom, onDone }: Props) {
  const [groupCounts, setGroupCounts] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0 })
  const [pending, setPending] = useState<number | null>(null) // groupId awaiting confirm dialog
  const [waiting, setWaiting] = useState(false)
  const [fullNotice, setFullNotice] = useState<number | null>(null)
  const setLocalGroupId = usePlayerStore((s) => s.setLocalGroupId)

  useEffect(() => {
    const lobbyHandler = (data: { groupCounts: Record<string, number> }) => {
      setGroupCounts({
        1: data.groupCounts[1] ?? 0,
        2: data.groupCounts[2] ?? 0,
        3: data.groupCounts[3] ?? 0,
      })
    }

    const confirmedHandler = (data: { groupId: number; roomId: string | null }) => {
      setLocalGroupId(data.groupId)
      onDone(data.groupId, data.roomId)
    }

    const fullHandler = (data: { groupId: number }) => {
      setWaiting(false)
      setPending(null)
      setFullNotice(data.groupId)
      setTimeout(() => setFullNotice(null), 3000)
    }

    lobbyRoom.onMessage('LOBBY_STATE', lobbyHandler)
    lobbyRoom.onMessage('GROUP_CONFIRMED', confirmedHandler)
    lobbyRoom.onMessage('GROUP_FULL', fullHandler)

    return () => {
      // colyseus.js doesn't support removeListener on onMessage, handlers are replaced on reconnect
    }
  }, [lobbyRoom, onDone, setLocalGroupId])

  const handleGroupClick = (groupId: number) => {
    if ((groupCounts[groupId] ?? 0) >= 4) return
    setPending(groupId)
  }

  const handleConfirm = () => {
    if (pending == null) return
    setWaiting(true)
    lobbyRoom.send('SELECT_GROUP', { groupId: pending })
  }

  const handleCancel = () => {
    setPending(null)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #43c6ac 0%, #191654 100%)',
      fontFamily: 'sans-serif',
      zIndex: 100,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 24,
        padding: '40px 48px',
        maxWidth: 560,
        width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        textAlign: 'center',
      }}>
        <h1 style={{ fontSize: 28, margin: '0 0 8px', color: '#333' }}>选择你的小组</h1>
        <p style={{ fontSize: 16, color: '#777', margin: '0 0 32px' }}>选择一个小组加入，每组最多4人</p>

        {fullNotice != null && (
          <div style={{
            background: '#ffe0e0', color: '#c0392b',
            borderRadius: 10, padding: '10px 20px',
            marginBottom: 16, fontSize: 16,
          }}>
            {GROUP_NAMES[fullNotice]}已满，请选择其他小组
          </div>
        )}

        {/* Group cards */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
          {[1, 2, 3].map((groupId) => {
            const count = groupCounts[groupId] ?? 0
            const isFull = count >= 4
            const color = GROUP_COLORS[groupId]
            return (
              <button
                key={groupId}
                onClick={() => handleGroupClick(groupId)}
                disabled={isFull || waiting}
                style={{
                  flex: '1 1 140px',
                  minHeight: 140,
                  minWidth: 120,
                  borderRadius: 18,
                  border: `3px solid ${isFull ? '#ccc' : color}`,
                  background: isFull ? '#f5f5f5' : `${color}22`,
                  cursor: isFull || waiting ? 'not-allowed' : 'pointer',
                  padding: '20px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  opacity: isFull ? 0.5 : 1,
                  pointerEvents: isFull ? 'none' : 'auto',
                }}
                onMouseEnter={(e) => {
                  if (!isFull) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
                }}
              >
                <span style={{ fontSize: 40 }}>{GROUP_ICONS[groupId]}</span>
                <span style={{ fontSize: 20, fontWeight: 700, color: isFull ? '#aaa' : '#333' }}>
                  {GROUP_NAMES[groupId]}
                </span>
                <span style={{ fontSize: 16, color: isFull ? '#bbb' : '#666' }}>
                  {count} / 4 人
                </span>
                {isFull && (
                  <span style={{ fontSize: 13, color: '#aaa', marginTop: 2 }}>已满</span>
                )}
              </button>
            )
          })}
        </div>

        {/* Confirm dialog */}
        {pending != null && !waiting && (
          <div style={{
            background: '#f9f9f9', borderRadius: 14,
            padding: '20px 24px', marginTop: 8,
            border: `2px solid ${GROUP_COLORS[pending]}`,
          }}>
            <p style={{ fontSize: 18, margin: '0 0 16px', color: '#333' }}>
              确定加入 <strong style={{ color: GROUP_COLORS[pending] }}>{GROUP_NAMES[pending]}</strong> 吗？
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button
                onClick={handleConfirm}
                style={{
                  fontSize: 18, fontWeight: 700,
                  padding: '12px 36px', borderRadius: 12,
                  border: 'none', cursor: 'pointer',
                  background: GROUP_COLORS[pending], color: '#fff',
                  minHeight: 48,
                }}
              >
                加入
              </button>
              <button
                onClick={handleCancel}
                style={{
                  fontSize: 18, padding: '12px 36px',
                  borderRadius: 12, border: '2px solid #ccc',
                  cursor: 'pointer', background: '#fff', color: '#555',
                  minHeight: 48,
                }}
              >
                取消
              </button>
            </div>
          </div>
        )}

        {waiting && (
          <p style={{ fontSize: 16, color: '#888', marginTop: 8 }}>正在加入，请稍候…</p>
        )}
      </div>
    </div>
  )
}
