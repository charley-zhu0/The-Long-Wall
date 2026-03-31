import React, { useState, useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sky } from '@react-three/drei'
import { Room } from 'colyseus.js'
import { joinLobby, joinGroupById } from '../network/client'
import TeacherBlockGrid from './TeacherBlockGrid'

export default function TeacherHUD() {
  const [selectedGroup, setSelectedGroup] = useState<1 | 2 | 3>(1)
  const [groupBlocks, setGroupBlocks] = useState<Record<number, Map<string, { type: number }>>>({
    1: new Map(),
    2: new Map(),
    3: new Map(),
  })
  const [gameStarted, setGameStarted] = useState(false)
  const [starting, setStarting] = useState(false)
  const lobbyRoom = useRef<Room | null>(null)
  const rooms = useRef<Room[]>([])

  useEffect(() => {
    let cancelled = false
    joinLobby({ isTeacher: true }).then((lobby) => {
      if (cancelled) return
      lobbyRoom.current = lobby

      lobby.onMessage('GAME_STARTED', async (data: { groupRoomIds: Record<string, string> }) => {
        if (cancelled) return
        setGameStarted(true)
        setStarting(false)

        // Join all 3 group rooms as observer
        const joined: Room[] = []
        for (const [groupIdStr, roomId] of Object.entries(data.groupRoomIds)) {
          const groupId = Number(groupIdStr)
          try {
            const room = await joinGroupById(roomId)
            joined.push(room)
            const syncBlocks = (state: any) => {
              const entries = new Map<string, { type: number }>()
              state.blocks.forEach((block: any, key: string) => {
                entries.set(key, { type: block.blockType })
              })
              setGroupBlocks((prev) => ({ ...prev, [groupId]: entries }))
            }
            syncBlocks(room.state)
            room.onStateChange(syncBlocks)
          } catch (err) {
            console.error(`Teacher failed to join group ${groupId}`, err)
          }
        }
        rooms.current = joined
      })
    }).catch((err) => console.error('Teacher joinLobby failed', err))

    return () => {
      cancelled = true
      lobbyRoom.current?.leave()
      lobbyRoom.current = null
      rooms.current.forEach((r) => r.leave())
      rooms.current = []
    }
  }, [])

  const handleStartGame = () => {
    if (!lobbyRoom.current || starting || gameStarted) return
    setStarting(true)
    lobbyRoom.current.send('START_GAME', {})
  }

  const sendEncourage = (msg: 'star' | 'heart' | 'thumbsup') => {
    const room = rooms.current[selectedGroup - 1]
    if (room) {
      room.send('TEACHER_ENCOURAGE', { groupId: selectedGroup, message: msg })
    }
  }

  const sendHighlight = (groupId: number) => {
    const room = rooms.current[groupId - 1]
    if (room) {
      room.send('TEACHER_HIGHLIGHT', { groupId })
    }
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

        {/* Start game button */}
        <button
          onClick={handleStartGame}
          disabled={starting || gameStarted}
          style={{
            width: '100%',
            padding: '14px 0',
            marginBottom: 20,
            borderRadius: 8,
            border: 'none',
            background: gameStarted ? '#555' : starting ? '#888' : '#e67e22',
            color: '#fff',
            fontSize: 17,
            fontWeight: 'bold',
            cursor: gameStarted || starting ? 'not-allowed' : 'pointer',
          }}
        >
          {gameStarted ? '游戏已开始' : starting ? '正在启动…' : '▶ 开始游戏'}
        </button>

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
          disabled={!gameStarted}
          style={{
            width: '100%',
            padding: '12px 0',
            marginBottom: 12,
            borderRadius: 8,
            border: 'none',
            background: gameStarted ? '#e74c3c' : '#555',
            color: '#fff',
            fontSize: 16,
            cursor: gameStarted ? 'pointer' : 'not-allowed',
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
              disabled={!gameStarted}
              style={{
                flex: 1,
                minWidth: 70,
                padding: '12px 0',
                borderRadius: 8,
                border: 'none',
                background: gameStarted ? '#27ae60' : '#555',
                color: '#fff',
                fontSize: 28,
                cursor: gameStarted ? 'pointer' : 'not-allowed',
              }}
            >
              {msg === 'star' ? '⭐' : msg === 'heart' ? '❤️' : '👍'}
            </button>
          ))}
        </div>

        {/* Minimap */}
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
              第{g}组 · {groupBlocks[g]?.size ?? 0} 块
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
        <TeacherBlockGrid blocks={groupBlocks[selectedGroup] ?? new Map()} />
        <OrbitControls />
      </Canvas>
    </div>
  )
}

