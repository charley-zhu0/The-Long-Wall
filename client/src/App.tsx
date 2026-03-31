import React, { useState } from 'react'
import { Room } from 'colyseus.js'
import VoxelScene from './components/VoxelScene'
import TeacherHUD from './components/TeacherHUD'
import TutorialModal from './components/TutorialModal'
import CharacterCreator from './components/CharacterCreator'
import GroupSelector from './components/GroupSelector'

type AppPhase = 'character' | 'group' | 'tutorial' | 'game'

const isTeacher = window.location.pathname === '/teacher'

export default function App() {
  const [phase, setPhase] = useState<AppPhase>('character')
  const [lobbyRoom, setLobbyRoom] = useState<Room | null>(null)

  if (isTeacher) {
    return <TeacherHUD />
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
        onDone={() => setPhase('tutorial')}
      />
    )
  }

  return (
    <>
      {phase === 'tutorial' && <TutorialModal onStart={() => setPhase('game')} />}
      <VoxelScene inputEnabled={phase === 'game'} />
    </>
  )
}
