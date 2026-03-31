import { useMemo } from 'react'
import * as THREE from 'three'
import { useBlockStore } from '../store/blockStore'
import { makeMerlonGeometry, makeTowerGeometry } from '../utils/blockGeometries'

interface Props {
  targetBlocks: Map<string, number> // key -> blockType
  highlightedPositions?: Set<string>
}

export default function BlueprintOverlay({ targetBlocks, highlightedPositions }: Props) {
  const blocks = useBlockStore((s) => s.blocks)

  const ghostGeometries = useMemo(() => ({
    1: new THREE.BoxGeometry(1.02, 1.02, 1.02),
    2: makeMerlonGeometry(),
    3: makeTowerGeometry(),
  }), [])

  const missingPositions = useMemo(() => {
    const missing: Array<[number, number, number, number]> = []
    for (const [key, blockType] of targetBlocks) {
      if (!blocks.has(key)) {
        const [x, y, z] = key.split(',').map(Number)
        missing.push([x, y, z, blockType])
      }
    }
    return missing
  }, [targetBlocks, blocks])

  if (missingPositions.length === 0) return null

  return (
    <>
      {missingPositions.map(([x, y, z, blockType]) => {
        const key = `${x},${y},${z}`
        const isHighlighted = highlightedPositions?.has(key)
        const geomType = (blockType === 2 || blockType === 3) ? blockType : 1
        return (
          <mesh key={key} position={[x, y, z]}>
            <primitive object={ghostGeometries[geomType]} />
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
