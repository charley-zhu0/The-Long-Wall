import React from 'react'

export default function SunGlow() {
  const layers = [
    { scale: 3, opacity: 1.0, color: '#fff7a0' },
    { scale: 6, opacity: 0.4, color: '#ffee44' },
    { scale: 10, opacity: 0.15, color: '#ffee44' },
  ]

  return (
    <group position={[100, 40, -80]}>
      {layers.map((layer, i) => (
        <mesh
          key={i}
          scale={[layer.scale, layer.scale, 1]}
          raycast={() => null}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            color={layer.color}
            transparent
            opacity={layer.opacity}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  )
}
