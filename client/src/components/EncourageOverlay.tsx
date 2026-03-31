import React, { useEffect, useState } from 'react'

const EMOJIS: Record<string, string> = {
  star: '⭐',
  heart: '❤️',
  thumbsup: '👍',
}

interface Props {
  message: 'star' | 'heart' | 'thumbsup' | null
  onDone: () => void
}

export default function EncourageOverlay({ message, onDone }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!message) return
    setVisible(true)
    const timer = setTimeout(() => {
      setVisible(false)
      onDone()
    }, 2000)
    return () => clearTimeout(timer)
  }, [message]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!message || !visible) return null

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      pointerEvents: 'none',
      zIndex: 50,
      animation: 'encourageFadeOut 2s ease-out forwards',
    }}>
      <style>{`
        @keyframes encourageFadeOut {
          0%   { opacity: 1; transform: scale(1); }
          70%  { opacity: 1; transform: scale(1.2); }
          100% { opacity: 0; transform: scale(1.4); }
        }
      `}</style>
      <span style={{ fontSize: 120, lineHeight: 1 }}>{EMOJIS[message] ?? '🎉'}</span>
    </div>
  )
}
