import { useMemo } from 'react'
import * as THREE from 'three'
import { useBlockStore } from '../store/blockStore'

interface Props {
  targetBlocks: Map<string, number> // key -> blockType
  highlightedPositions?: Set<string>
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
        const isHighlighted = highlightedPositions?.has(key)
        return (
          <mesh key={key} position={[x, y, z]}>
            <boxGeometry args={[1.02, 1.02, 1.02]} />
            <meshBasicMaterial
              color={isHighlighted ? '#ff4444' : '#88aaff'}
              transparent
              opacity={isHighlighted ? 0.6 : 0.25}
              wireframe={!isHighlighted}
            />
          </mesh>
        )
      })}
    </>
  )
}
