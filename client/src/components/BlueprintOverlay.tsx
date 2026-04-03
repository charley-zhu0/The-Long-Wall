import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useBlockStore } from '../store/blockStore'

interface Props {
  targetBlocks: Map<string, number> // key -> blockType
  highlightedPositions?: Set<string>
}

const ghostGeometry = new THREE.BoxGeometry(1.02, 1.02, 1.02)

function BreathingGhost({
  position,
  isHighlighted,
}: {
  position: [number, number, number]
  isHighlighted: boolean
}) {
  const matRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame(({ clock }) => {
    if (matRef.current && !isHighlighted) {
      matRef.current.opacity = 0.3 + 0.2 * Math.sin(clock.elapsedTime * 2.5)
    }
  })

  return (
    <mesh position={position} raycast={() => null}>
      <primitive object={ghostGeometry} />
      <meshBasicMaterial
        ref={matRef}
        color={isHighlighted ? '#ff4444' : '#ffcc44'}
        transparent
        opacity={isHighlighted ? 0.6 : 0.4}
        wireframe={false}
      />
    </mesh>
  )
}

export default function BlueprintOverlay({ targetBlocks, highlightedPositions }: Props) {
  const blocks = useBlockStore((s) => s.blocks)

  const missingPositions = useMemo(() => {
    const missing: Array<[number, number, number]> = []
    for (const [key] of targetBlocks) {
      if (!blocks.has(key)) {
        const [x, y, z] = key.split(',').map(Number)
        missing.push([x, y, z])
      }
    }
    return missing
  }, [targetBlocks, blocks])

  if (missingPositions.length === 0) return null

  return (
    <>
      {missingPositions.map(([x, y, z]) => {
        const key = `${x},${y},${z}`
        const isHighlighted = highlightedPositions?.has(key) ?? false
        return (
          <BreathingGhost
            key={key}
            position={[x, y, z]}
            isHighlighted={isHighlighted}
          />
        )
      })}
    </>
  )
}
