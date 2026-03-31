import React, { useState, useEffect } from 'react'

const EMOJIS: Record<string, string> = {
  star: '⭐',
  heart: '❤️',
  thumbsup: '👍',
}

interface Props {
  message?: string | null
}

export function EncourageOverlay({ message }: Props) {
  const [visible, setVisible] = useState(false)
  const [emoji, setEmoji] = useState('')

  useEffect(() => {
    if (!message) return
    setEmoji(EMOJIS[message] ?? '🎉')
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), 2000)
    return () => clearTimeout(timer)
  }, [message])

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      zIndex: 100,
      animation: 'pop 0.3s ease-out',
    }}>
      <span style={{ fontSize: 120, filter: 'drop-shadow(0 0 20px rgba(255,200,0,0.8))' }}>
        {emoji}
      </span>
      <style>{`@keyframes pop { from { transform: scale(0); } to { transform: scale(1); } }`}</style>
    </div>
  )
}
