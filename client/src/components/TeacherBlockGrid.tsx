import { useRef, useMemo, useEffect } from 'react'
import * as THREE from 'three'

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

interface Props {
  blocks: Map<string, { type: number }>
}

export default function TeacherBlockGrid({ blocks }: Props) {
  const ref = useRef<THREE.InstancedMesh | null>(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const material = useMemo(
    () => new THREE.MeshLambertMaterial({ map: loadPixelTexture('/textures/brick_gray.png') }),
    []
  )

  useEffect(() => {
    return () => { geometry.dispose() }
  }, [geometry])

  const positions = useMemo(() => {
    const result: Array<[number, number, number]> = []
    for (const [key] of blocks) {
      const [x, y, z] = key.split(',').map(Number)
      result.push([x, y, z])
    }
    return result
  }, [blocks])

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
