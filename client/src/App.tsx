import React, { useState, useEffect, useRef } from 'react'
import { Room } from 'colyseus.js'
import VoxelScene from './components/VoxelScene'
import TeacherHUD from './components/TeacherHUD'
import CharacterCreator from './components/CharacterCreator'
import GroupSelector from './components/GroupSelector'
import { joinGroupById } from './network/client'
import { useBlockStore } from './store/blockStore'
import type { BlockType } from './store/blockStore'
import { isTouchDevice } from './utils/deviceDetect'

type AppPhase = 'character' | 'group' | 'waiting' | 'game'

const isTeacher = window.location.pathname === '/teacher'

export default function App() {
  const [phase, setPhase] = useState<AppPhase>('character')
  const [isTouch] = useState(() => isTouchDevice())
  const [lobbyRoom, setLobbyRoom] = useState<Room | null>(null)
  const [groupRoom, setGroupRoom] = useState<Room | null>(null)
  const [encourageMessage, setEncourageMessage] = useState<'star' | 'heart' | 'thumbsup' | null>(null)
  const [pendingGroupId, setPendingGroupId] = useState<number | null>(null)
  const setBlocks = useBlockStore((s) => s.setBlocks)
  const groupRoomRef = useRef<Room | null>(null)

  // Sync groupRoom to ref for stable closure access
  useEffect(() => {
    groupRoomRef.current = groupRoom
  }, [groupRoom])

  // After group selected, wait for GAME_STARTED to get the real roomId
  useEffect(() => {
    if (!lobbyRoom || pendingGroupId == null) return

    const handleGameStarted = async (data: { groupRoomIds: Record<string, string> }) => {
      const roomId = data.groupRoomIds[String(pendingGroupId)]
      if (!roomId) return
      try {
        const room = await joinGroupById(roomId)
        // Sync initial state immediately
        const syncBlocks = (state: any) => {
          const entries = new Map<string, { type: BlockType; fixed?: boolean }>()
          state.blocks.forEach((block: any, key: string) => {
            entries.set(key, { type: block.blockType as BlockType, fixed: block.fixed ?? false })
          })
          setBlocks(entries)
        }
        syncBlocks(room.state)
        room.onStateChange(syncBlocks)
        room.onMessage('TEACHER_ENCOURAGE', (msg: { message: 'star' | 'heart' | 'thumbsup' }) => {
          setEncourageMessage(msg.message)
        })
        setGroupRoom(room)
        setPhase('game')
      } catch (err) {
        console.error('Failed to join GroupRoom', err)
      }
    }

    lobbyRoom.onMessage('GAME_STARTED', handleGameStarted)
  }, [lobbyRoom, pendingGroupId, setBlocks])

  if (isTeacher) {
    return <TeacherHUD />
  }

  const handleGroupDone = (groupId: number, roomId: string | null) => {
    setPendingGroupId(groupId)
    if (roomId) {
      // Game already started — join immediately
      joinGroupById(roomId).then((room) => {
        const syncBlocks = (state: any) => {
          const entries = new Map<string, { type: BlockType; fixed?: boolean }>()
          state.blocks.forEach((block: any, key: string) => {
            entries.set(key, { type: block.blockType as BlockType, fixed: block.fixed ?? false })
          })
          setBlocks(entries)
        }
        syncBlocks(room.state)
        room.onStateChange(syncBlocks)
        room.onMessage('TEACHER_ENCOURAGE', (msg: { message: 'star' | 'heart' | 'thumbsup' }) => {
          setEncourageMessage(msg.message)
        })
        setGroupRoom(room)
        setPhase('game')
      }).catch((err) => console.error('Failed to join GroupRoom', err))
    } else {
      // Game not started yet — show waiting screen, listen for GAME_STARTED
      setPhase('waiting')
    }
  }

  if (phase === 'character') {
    return (
      <CharacterCreator
        onDone={(room) => {
          setLobbyRoom(room)
          setPhase('group')
        }}
      />
    )
  }

  if (phase === 'group' && lobbyRoom) {
    return (
      <GroupSelector
        lobbyRoom={lobbyRoom}
        onDone={handleGroupDone}
      />
    )
  }

  if (phase === 'waiting') {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #43c6ac 0%, #191654 100%)',
        fontFamily: 'sans-serif', color: '#fff', fontSize: 22,
      }}>
        等待老师开始游戏…
      </div>
    )
  }

  return (
    <>
      <VoxelScene
        inputEnabled={phase === 'game'}
        groupRoom={groupRoom}
        encourageMessage={encourageMessage}
        onEncourageDone={() => setEncourageMessage(null)}
        isTouch={isTouch}
      />
    </>
  )
}
