import React, { useState } from 'react'

interface Props {
  onStart: () => void
  isTouch?: boolean
}

export default function TutorialModal({ onStart, isTouch = false }: Props) {
  const [step, setStep] = useState(0)

  const pcSteps = [
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
      desc: '鼠标中键拖拽旋转视角，鼠标右键拖拽平移视角，滚轮缩放。',
      icon: '🎥',
    },
    {
      title: '修复破损的城墙',
      desc: '城墙中间有一段已经损坏了！\n找到橙色虚影标记的位置，放置对应的砖块来修复它。\n全部修复后，你们就胜利了！🏆',
      icon: '🧱',
    },
    {
      title: '和小伙伴一起建造！',
      desc: '蓝色虚影提示你需要放置砖块的位置，完成后会有庆祝！',
      icon: '🎉',
    },
  ]

  const touchSteps = [
    {
      title: '欢迎来到长城建造！',
      desc: '我们要一起修复古老的长城！',
      icon: '🏯',
    },
    {
      title: '如何放置砖块',
      desc: '点击屏幕上的蓝色虚影位置，即可放置砖块。底部选择砖块类型后再点击放置。',
      icon: '👆',
    },
    {
      title: '如何拆除砖块',
      desc: '点击屏幕底部的「拆除」按钮切换到拆除模式，再点击已有砖块即可拆除。',
      icon: '🔨',
    },
    {
      title: '如何控制视角',
      desc: '用双指拖拽旋转和平移视角，双指捏合缩放。',
      icon: '✌️',
    },
    {
      title: '修复破损的城墙',
      desc: '城墙中间有一段已经损坏了！\n找到橙色虚影标记的位置，点击放置对应的砖块来修复它。\n全部修复后，你们就胜利了！🏆',
      icon: '🧱',
    },
    {
      title: '和小伙伴一起建造！',
      desc: '蓝色虚影提示你需要放置砖块的位置，完成后会有庆祝！',
      icon: '🎉',
    },
  ]

  const steps = isTouch ? touchSteps : pcSteps

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
