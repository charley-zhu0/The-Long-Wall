import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  life: number
  color: string
}

const COLORS = ['#f1c40f', '#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#e67e22']

function createParticles(count = 60): Particle[] {
  return Array.from({ length: count }, () => ({
    position: new THREE.Vector3(
      (Math.random() - 0.5) * 20,
      Math.random() * 5,
      (Math.random() - 0.5) * 10,
    ),
    velocity: new THREE.Vector3(
      (Math.random() - 0.5) * 4,
      Math.random() * 6 + 2,
      (Math.random() - 0.5) * 4,
    ),
    life: 1.0,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  }))
}

export function CelebrationParticles({ active }: { active: boolean }) {
  const [particles, setParticles] = useState<Particle[]>(() => createParticles())
  const meshRefs = useRef<(THREE.Mesh | null)[]>([])

  useFrame((_, delta) => {
    if (!active) return
    setParticles((prev) =>
      prev.map((p) => {
        const np = { ...p }
        np.position = p.position.clone().addScaledVector(p.velocity, delta)
        np.velocity = p.velocity.clone()
        np.velocity.y -= 9.8 * delta
        np.life = Math.max(0, p.life - delta * 0.5)
        return np
      })
    )
  })

  if (!active) return null

  return (
    <>
      {particles.map((p, i) => (
        <mesh key={i} position={p.position}>
          <boxGeometry args={[0.3, 0.3, 0.3]} />
          <meshBasicMaterial color={p.color} transparent opacity={p.life} />
        </mesh>
      ))}
    </>
  )
}
