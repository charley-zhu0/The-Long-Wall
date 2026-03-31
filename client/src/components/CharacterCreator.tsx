import React, { useState } from 'react'
import { Room } from 'colyseus.js'
import { joinLobby } from '../network/client'
import { usePlayerStore } from '../store/playerStore'

const AVATAR_COLORS = ['#FF6B6B', '#FF9F43', '#FFD93D', '#6BCB77', '#4ECDC4', '#4D96FF', '#9B59B6', '#FF6FB7']

function AvatarFace({ color, size = 64 }: { color: string; size?: number }) {
  const s = size
  return (
    <svg width={s} height={s} viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
      {/* Face */}
      <circle cx="32" cy="32" r="28" fill={color} />
      {/* Eyes */}
      <circle cx="22" cy="26" r="5" fill="#fff" />
      <circle cx="42" cy="26" r="5" fill="#fff" />
      <circle cx="23" cy="27" r="3" fill="#333" />
      <circle cx="43" cy="27" r="3" fill="#333" />
      {/* Smile */}
      <path d="M20 40 Q32 52 44 40" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}

interface Props {
  onDone: (lobbyRoom: Room) => void
}

export default function CharacterCreator({ onDone }: Props) {
  const [username, setUsername] = useState('')
  const [selectedAvatar, setSelectedAvatar] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const setLocalProfile = usePlayerStore((s) => s.setLocalProfile)

  const canConfirm = username.trim().length > 0 && selectedAvatar !== null && !loading

  const handleConfirm = async () => {
    if (!canConfirm) return
    setLoading(true)
    try {
      const avatarId = selectedAvatar!
      setLocalProfile(username.trim(), avatarId)
      const lobbyRoom = await joinLobby()
      lobbyRoom.send('SET_PROFILE', { username: username.trim(), avatarId })
      onDone(lobbyRoom)
    } catch (e) {
      console.error('Failed to join lobby', e)
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      fontFamily: 'sans-serif',
      zIndex: 100,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 24,
        padding: '40px 48px',
        maxWidth: 520,
        width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        textAlign: 'center',
      }}>
        <h1 style={{ fontSize: 28, margin: '0 0 8px', color: '#333' }}>创建你的角色</h1>
        <p style={{ fontSize: 16, color: '#777', margin: '0 0 28px' }}>输入名字，选择你的头像</p>

        {/* Username input */}
        <input
          type="text"
          maxLength={8}
          placeholder="输入你的名字"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            fontSize: 22,
            padding: '12px 16px',
            borderRadius: 12,
            border: '2px solid #ddd',
            outline: 'none',
            marginBottom: 28,
            textAlign: 'center',
            color: '#333',
          }}
          onFocus={(e) => { e.target.style.borderColor = '#667eea' }}
          onBlur={(e) => { e.target.style.borderColor = '#ddd' }}
        />

        {/* Avatar grid */}
        <p style={{ fontSize: 16, color: '#555', margin: '0 0 16px', fontWeight: 600 }}>选择头像</p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 32,
        }}>
          {AVATAR_COLORS.map((color, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedAvatar(idx)}
              style={{
                background: 'none',
                border: `3px solid ${selectedAvatar === idx ? color : 'transparent'}`,
                borderRadius: 16,
                padding: 6,
                cursor: 'pointer',
                outline: 'none',
                boxShadow: selectedAvatar === idx ? `0 0 0 2px ${color}55` : 'none',
                transition: 'border-color 0.15s, box-shadow 0.15s',
                minWidth: 48,
                minHeight: 48,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label={`头像 ${idx + 1}`}
            >
              <AvatarFace color={color} size={56} />
            </button>
          ))}
        </div>

        {/* Confirm button */}
        <button
          onClick={handleConfirm}
          disabled={!canConfirm}
          style={{
            fontSize: 20,
            fontWeight: 700,
            padding: '14px 48px',
            borderRadius: 14,
            border: 'none',
            cursor: canConfirm ? 'pointer' : 'not-allowed',
            background: canConfirm ? 'linear-gradient(135deg, #667eea, #764ba2)' : '#ccc',
            color: '#fff',
            minWidth: 160,
            minHeight: 52,
            transition: 'background 0.2s, opacity 0.2s',
            opacity: canConfirm ? 1 : 0.6,
          }}
        >
          {loading ? '连接中…' : '确认'}
        </button>
      </div>
    </div>
  )
}
