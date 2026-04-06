import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useBlockStore } from '../store/blockStore'

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

function BlockLayer({ blockType }: { blockType: number }) {
  const blocks = useBlockStore((s) => s.blocks)

  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])

  const material = useMemo(() => {
    const urls: Record<number, string> = {
      1: '/textures/brick_gray.png',
      2: '/textures/brick_merlon.png',
      3: '/textures/brick_tower.png',
      4: '/textures/brick_window.png',
    }
    const url = urls[blockType] ?? urls[1]
    return new THREE.MeshLambertMaterial({ map: loadPixelTexture(url) })
  }, [blockType])

  const ref = useRef<THREE.InstancedMesh | null>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  useEffect(() => {
    return () => { geometry.dispose() }
  }, [geometry])

  const positions = useMemo(() => {
    const result: Array<[number, number, number]> = []
    for (const [key, entry] of blocks) {
      if ((entry.type ?? 1) === blockType) {
        const [x, y, z] = key.split(',').map(Number)
        result.push([x, y, z])
      }
    }
    return result
  }, [blocks, blockType])

  useEffect(() => {
    const mesh = ref.current
    if (!mesh) return
    positions.forEach(([x, y, z], i) => {
      dummy.position.set(x, y, z)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.count = positions.length
    mesh.instanceMatrix.needsUpdate = true
  }, [positions, dummy])

  if (positions.length === 0) return null

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, material, MAX_INSTANCES]}
      count={positions.length}
      castShadow
      receiveShadow
    />
  )
}

export default function BlockGrid() {
  return (
    <>
      <BlockLayer blockType={1} />
      <BlockLayer blockType={2} />
      <BlockLayer blockType={3} />
      <BlockLayer blockType={4} />
    </>
  )
}
