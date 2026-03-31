import React from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sky } from '@react-three/drei'
import BlockGrid from './BlockGrid'
import InputController from './InputController'
import HUD from './HUD'
import SunGlow from './SunGlow'
import MountainRange from './MountainRange'
import ForestDecoration from './ForestDecoration'

function Ground() {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, -0.5, 0]}
      receiveShadow
      // @ts-ignore – custom flag for raycasting
      isGroundPlane
    >
      <planeGeometry args={[200, 200]} />
      <meshLambertMaterial color="#6daa4a" />
    </mesh>
  )
}

function GridHelper() {
  return <gridHelper args={[200, 200, '#444', '#333']} position={[0, -0.49, 0]} />
}

export default function VoxelScene({ inputEnabled = true }: { inputEnabled?: boolean }) {
  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <HUD />
      <Canvas
        shadows
        camera={{ position: [0, 10, 18], fov: 60 }}
        style={{ background: '#87ceeb' }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <ambientLight intensity={0.6} />
        <directionalLight
          castShadow
          position={[50, 80, 50]}
          intensity={1.2}
          shadow-mapSize={[2048, 2048]}
        />
        <Sky sunPosition={[100, 30, -100]} turbidity={8} rayleigh={0.5} mieCoefficient={0.005} mieDirectionalG={0.8} />
        <SunGlow />
        <MountainRange />
        <ForestDecoration />
        <Ground />
        <GridHelper />
        <BlockGrid />
        {inputEnabled && <InputController />}
        <OrbitControls
          mouseButtons={{
            LEFT: undefined as any, // left click is handled by InputController
            MIDDLE: 1,              // orbit with middle mouse
            RIGHT: 2,               // pan with right (but right is also destroy – handled first)
          }}
          enablePan
          enableZoom
          maxPolarAngle={Math.PI / 2 - 0.05}
        />
      </Canvas>
    </div>
  )
}
