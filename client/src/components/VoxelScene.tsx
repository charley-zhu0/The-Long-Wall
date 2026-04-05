import React, { useState, useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sky } from '@react-three/drei'
import * as THREE from 'three'
import { Room } from 'colyseus.js'
import BlockGrid from './BlockGrid'
import InputController from './InputController'
import HUD from './HUD'
import SunGlow from './SunGlow'
import MountainRange from './MountainRange'
import ForestDecoration from './ForestDecoration'
import EncourageOverlay from './EncourageOverlay'
import CompletionModal from './CompletionModal'
import TowerFire from './TowerFire'

function Ground() {
  const grassTexture = useMemo(() => {
    const loader = new THREE.TextureLoader()
    const tex = loader.load('/textures/grass.png')
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
    tex.repeat.set(40, 40)
    tex.magFilter = THREE.LinearFilter
    tex.minFilter = THREE.LinearMipmapLinearFilter
    return tex
  }, [])

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.5, 0]}
      receiveShadow
      // @ts-ignore – custom flag for raycasting
      isGroundPlane
    >
      <planeGeometry args={[200, 200]} />
      <meshLambertMaterial map={grassTexture} />
    </mesh>
  )
}

function GridHelper() {
  return <gridHelper args={[200, 200, '#444', '#333']} position={[0, -0.49, 0]} />
}

export default function VoxelScene({
  inputEnabled = true,
  groupRoom,
  encourageMessage,
  onEncourageDone,
  isTouch = false,
}: {
  inputEnabled?: boolean
  groupRoom?: Room | null
  encourageMessage?: 'star' | 'heart' | 'thumbsup' | null
  onEncourageDone?: () => void
  isTouch?: boolean
}) {
  const [showCompletion, setShowCompletion] = useState(false)
  const completionShown = React.useRef(false)

  useEffect(() => {
    if (!groupRoom) return
    groupRoom.onMessage('SECTION_COMPLETE', () => {
      if (completionShown.current) return
      completionShown.current = true
      setShowCompletion(true)
    })
  }, [groupRoom])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <HUD isTouch={isTouch} />
      <EncourageOverlay message={encourageMessage ?? null} onDone={onEncourageDone ?? (() => {})} />
      {showCompletion && <CompletionModal onClose={() => setShowCompletion(false)} />}
      <Canvas
        shadows
        camera={{ position: [0, 28, 60], fov: 60 }}
        style={{ background: '#4a9edd' }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <ambientLight intensity={0.6} />
        <directionalLight
          castShadow
          position={[50, 80, 50]}
          intensity={1.2}
          shadow-mapSize={[2048, 2048]}
        />
        <Sky sunPosition={[100, 40, -100]} turbidity={2} rayleigh={3} mieCoefficient={0.003} mieDirectionalG={0.85} />
        <SunGlow />
        <MountainRange />
        <ForestDecoration />
        <Ground />
        <GridHelper />
        <BlockGrid />
        {/* Tower beacons: cx=tower center X, cy=top of tower body (Y=7), cz=wall center Z=3.5 */}
        <TowerFire cx={-20} cy={7} cz={3.5} />
        <TowerFire cx={32}  cy={7} cz={3.5} />
        {inputEnabled && <InputController groupRoom={groupRoom ?? null} isTouch={isTouch} />}
        {isTouch ? (
          <OrbitControls
            mouseButtons={{ LEFT: undefined as any, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }}
            touches={{ ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE }}
            enablePan
            enableZoom
            maxPolarAngle={Math.PI / 2 - 0.05}
          />
        ) : (
          <OrbitControls
            mouseButtons={{
              LEFT: undefined as any,
              MIDDLE: 1,
              RIGHT: 2,
            }}
            enablePan
            enableZoom
            maxPolarAngle={Math.PI / 2 - 0.05}
          />
        )}
      </Canvas>
    </div>
  )
}
