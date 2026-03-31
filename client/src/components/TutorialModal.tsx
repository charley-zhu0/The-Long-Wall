import React, { useState } from 'react'

interface Props {
  onStart: () => void
}

export default function TutorialModal({ onStart }: Props) {
  const [step, setStep] = useState(0)

  const steps = [
    {
      title: '欢迎来到长城建造！',
      desc: '我们要一起修复古老的长城！',
      icon: '🏯',
    },
    {
      title: '如何放置砖块',
      desc: '用鼠标左键点击地面或虚影位置来放置砖块。',
      icon: '🖱️',
    },
    {
      title: '如何拆除砖块',
      desc: '用鼠标右键点击已有砖块来拆除它。',
      icon: '🔨',
    },
    {
      title: '如何控制视角',
      desc: '鼠标中键拖拽旋转视角，鼠标右键拖拽平移视角，滚轮缩放。\n触屏设备：单指拖拽旋转视角。',
      icon: '🎥',
    },
    {
      title: '和小伙伴一起建造！',
      desc: '蓝色虚影提示你需要放置砖块的位置，完成后会有庆祝！',
      icon: '🎉',
    },
  ]

  const current = steps[step]

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
    }}>
      <div style={{
        background: '#fff',
        borderRadius: 24,
        padding: 48,
        maxWidth: 480,
        textAlign: 'center',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      }}>
        <div style={{ fontSize: 80, marginBottom: 16 }}>{current.icon}</div>
        <h2 style={{ fontSize: 28, marginBottom: 12, color: '#2c3e50' }}>{current.title}</h2>
        <p style={{ fontSize: 20, color: '#555', marginBottom: 32, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{current.desc}</p>

        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              style={{
                padding: '14px 36px',
                fontSize: 20,
                borderRadius: 12,
                border: 'none',
                background: '#3498db',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              下一步 →
            </button>
          ) : (
            <button
              onClick={onStart}
              style={{
                padding: '14px 48px',
                fontSize: 22,
                borderRadius: 12,
                border: 'none',
                background: '#27ae60',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 'bold',
              }}
            >
              开始游戏！🚀
            </button>
          )}
        </div>

        {/* Step dots */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 24 }}>
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: i === step ? '#3498db' : '#ccc',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
