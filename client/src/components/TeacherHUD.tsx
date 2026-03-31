import React, { useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { PointerLockControls, Sky } from '@react-three/drei'
import BlockGrid from './BlockGrid'

export default function TeacherHUD() {
  const [selectedGroup, setSelectedGroup] = useState<1 | 2 | 3>(1)
  const [encourageMessage, setEncourageMessage] = useState<string | null>(null)

  const sendHighlight = (groupId: number) => {
    // In real integration: send TEACHER_HIGHLIGHT to server via network room
    console.log('Highlight group', groupId)
  }

  const sendEncourage = (msg: 'star' | 'heart' | 'thumbsup') => {
    setEncourageMessage(msg)
    // In real integration: send TEACHER_ENCOURAGE to server
    console.log('Encourage group', selectedGroup, msg)
    setTimeout(() => setEncourageMessage(null), 2000)
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#1a1a2e' }}>
      {/* Teacher overlay panel */}
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: 280,
        height: '100vh',
        background: 'rgba(0,0,0,0.8)',
        color: '#fff',
        padding: 20,
        zIndex: 10,
        overflowY: 'auto',
      }}>
        <h2 style={{ fontSize: 20, marginBottom: 16, color: '#f1c40f' }}>教师控制台</h2>

        {/* Group selector */}
        <div style={{ marginBottom: 16 }}>
          <p style={{ fontSize: 14, marginBottom: 8, color: '#aaa' }}>选择小组</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {([1, 2, 3] as const).map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGroup(g)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 8,
                  border: selectedGroup === g ? '2px solid #f1c40f' : '2px solid transparent',
                  background: selectedGroup === g ? '#2980b9' : '#444',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: 16,
                }}
              >
                第{g}组
              </button>
            ))}
          </div>
        </div>

        {/* Highlight button */}
        <button
          onClick={() => sendHighlight(selectedGroup)}
          style={{
            width: '100%',
            padding: '12px 0',
            marginBottom: 12,
            borderRadius: 8,
            border: 'none',
            background: '#e74c3c',
            color: '#fff',
            fontSize: 16,
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          🔴 高亮提示该小组
        </button>

        {/* Encourage buttons */}
        <p style={{ fontSize: 14, marginBottom: 8, color: '#aaa' }}>发送鼓励</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['star', 'heart', 'thumbsup'] as const).map((msg) => (
            <button
              key={msg}
              onClick={() => sendEncourage(msg)}
              style={{
                flex: 1,
                minWidth: 70,
                padding: '12px 0',
                borderRadius: 8,
                border: 'none',
                background: '#27ae60',
                color: '#fff',
                fontSize: 28,
                cursor: 'pointer',
              }}
            >
              {msg === 'star' ? '⭐' : msg === 'heart' ? '❤️' : '👍'}
            </button>
          ))}
        </div>

        {/* Minimap placeholder */}
        <div style={{ marginTop: 24 }}>
          <p style={{ fontSize: 14, marginBottom: 8, color: '#aaa' }}>小组概览</p>
          {([1, 2, 3] as const).map((g) => (
            <div
              key={g}
              onClick={() => setSelectedGroup(g)}
              style={{
                height: 60,
                marginBottom: 8,
                background: selectedGroup === g ? '#2c3e50' : '#1c2833',
                borderRadius: 8,
                border: selectedGroup === g ? '2px solid #3498db' : '2px solid #333',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#aaa',
                fontSize: 13,
              }}
            >
              第{g}组工作区
            </div>
          ))}
        </div>
      </div>

      {/* 3D View */}
      <Canvas
        camera={{ position: [10, 20, 30], fov: 60 }}
        style={{ position: 'absolute', inset: 0 }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[50, 80, 50]} intensity={1.2} />
        <Sky sunPosition={[100, 20, 100]} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
          <planeGeometry args={[200, 200]} />
          <meshLambertMaterial color="#5a8a3a" />
        </mesh>
        <BlockGrid />
        <PointerLockControls />
      </Canvas>
    </div>
  )
}
