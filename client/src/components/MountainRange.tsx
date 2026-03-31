import React from 'react'

const peaks = [
  { x: -50, z: -90, height: 35, radius: 28, color: '#4a7c59' },
  { x: -20, z: -100, height: 42, radius: 22, color: '#5a6e8a' },
  { x:  10, z: -85,  height: 30, radius: 25, color: '#4a7c59' },
  { x:  40, z: -95,  height: 38, radius: 30, color: '#5a6e8a' },
  { x:  65, z: -80,  height: 28, radius: 20, color: '#5a6e8a' },
]

export default function MountainRange() {
  return (
    <group>
      {peaks.map((peak, i) => (
        <mesh
          key={i}
          position={[peak.x, peak.height / 2 - 0.5, peak.z]}
          raycast={() => null}
        >
          <coneGeometry args={[peak.radius, peak.height, 8]} />
          <meshLambertMaterial color={peak.color} />
        </mesh>
      ))}
    </group>
  )
}
