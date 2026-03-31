import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useBlockStore } from '../store/blockStore'

const MAX_INSTANCES = 10000

// Generate a canvas-based 64x64 pixel-art brick texture
function makeBrickTexture(color: string, accent: string): THREE.Texture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = color
  ctx.fillRect(0, 0, size, size)
  // mortar lines
  ctx.strokeStyle = accent
  ctx.lineWidth = 2
  // horizontal
  ctx.beginPath(); ctx.moveTo(0, 16); ctx.lineTo(size, 16); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0, 32); ctx.lineTo(size, 32); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(0, 48); ctx.lineTo(size, 48); ctx.stroke()
  // vertical - row 1 & 3 (offset 0)
  ctx.beginPath(); ctx.moveTo(32, 0); ctx.lineTo(32, 16); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(32, 32); ctx.lineTo(32, 48); ctx.stroke()
  // vertical - row 2 & 4 (offset 16)
  ctx.beginPath(); ctx.moveTo(16, 16); ctx.lineTo(16, 32); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(48, 16); ctx.lineTo(48, 32); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(16, 48); ctx.lineTo(16, 64); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(48, 48); ctx.lineTo(48, 64); ctx.stroke()
  const tex = new THREE.CanvasTexture(canvas)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  return tex
}

const BLOCK_COLORS: Record<number, [string, string]> = {
  1: ['#a8a8a8', '#6e6e6e'], // 灰砖
  2: ['#c0b090', '#7a6840'], // 垛口
  3: ['#8b6060', '#5a3030'], // 烽火台
}

export default function BlockGrid() {
  const blocks = useBlockStore((s) => s.blocks)

  const refs = useRef<Record<number, THREE.InstancedMesh | null>>({})
  const dummy = useMemo(() => new THREE.Object3D(), [])

  const textures = useMemo(() =>
    Object.fromEntries(
      Object.entries(BLOCK_COLORS).map(([k, [c, a]]) => [k, makeBrickTexture(c, a)])
    ), [])

  const materials = useMemo(() =>
    Object.fromEntries(
      Object.entries(textures).map(([k, tex]) => [
        k,
        new THREE.MeshLambertMaterial({ map: tex }),
      ])
    ), [textures])

  const geometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])

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
          args={[geometry, materials[type], MAX_INSTANCES]}
          count={byType[type]?.length ?? 0}
          castShadow
          receiveShadow
        />
      ))}
    </>
  )
}
