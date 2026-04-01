import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useBlockStore } from '../store/blockStore'
import { makeMerlonGeometry, makeTowerGeometry } from '../utils/blockGeometries'

const MAX_INSTANCES = 10000

const loader = new THREE.TextureLoader()

function loadPixelTexture(url: string): THREE.Texture {
  const tex = loader.load(url)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  return tex
}

export default function BlockGrid() {
  const blocks = useBlockStore((s) => s.blocks)

  const refs = useRef<Record<number, THREE.InstancedMesh | null>>({})
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const textures = useMemo(() => ({
    1: loadPixelTexture('/textures/brick_gray.png'),
    2: loadPixelTexture('/textures/merlon.png'),
    3: loadPixelTexture('/textures/tower.png'),
  }), [])

  const materials = useMemo(() =>
    Object.fromEntries(
      Object.entries(textures).map(([k, tex]) => [
        k,
        new THREE.MeshLambertMaterial({ map: tex }),
      ])
    ), [textures])

  const geometries = useMemo(() => ({
    1: new THREE.BoxGeometry(1, 1, 1),
    2: makeMerlonGeometry(),
    3: makeTowerGeometry(),
  }), [])

  useEffect(() => {
    return () => {
      Object.values(geometries).forEach((g) => g.dispose())
    }
  }, [geometries])

  // Group blocks by type
  const byType = useMemo(() => {
    const groups: Record<number, Array<[number, number, number]>> = { 1: [], 2: [], 3: [] }
    for (const [key, entry] of blocks) {
      const [x, y, z] = key.split(',').map(Number)
      groups[entry.type]?.push([x, y, z])
    }
    return groups
  }, [blocks])

  useEffect(() => {
    for (const [typeStr, positions] of Object.entries(byType)) {
      const mesh = refs.current[Number(typeStr)]
      if (!mesh) continue
      positions.forEach(([x, y, z], i) => {
        dummy.position.set(x, y, z)
        dummy.updateMatrix()
        mesh.setMatrixAt(i, dummy.matrix)
      })
      mesh.count = positions.length
      mesh.instanceMatrix.needsUpdate = true
    }
  }, [byType, dummy])

  return (
    <>
      {([1, 2, 3] as const).map((type) => (
        <instancedMesh
          key={type}
          ref={(el) => { refs.current[type] = el }}
          args={[geometries[type], materials[type], MAX_INSTANCES]}
          count={byType[type]?.length ?? 0}
          castShadow
          receiveShadow
        />
      ))}
    </>
  )
}
