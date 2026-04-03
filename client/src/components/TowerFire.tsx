import { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

interface Props {
  cx: number
  cy: number
  cz: number
}

const FLAME_COUNT = 80
const SMOKE_COUNT = 50

function newFlameParticle(cx: number, cy: number, cz: number) {
  return {
    x: cx + (Math.random() - 0.5) * 1.8,
    y: cy + 0.3 + Math.random() * 0.4,
    z: cz + (Math.random() - 0.5) * 1.8,
    vx: (Math.random() - 0.5) * 0.6,
    vy: 2.5 + Math.random() * 2.5,
    vz: (Math.random() - 0.5) * 0.6,
    age: Math.random() * 0.5,
    maxAge: 0.6 + Math.random() * 0.6,
  }
}

function newSmokeParticle(cx: number, cy: number, cz: number) {
  return {
    x: cx + (Math.random() - 0.5) * 1.2,
    y: cy + 1.5 + Math.random() * 0.8,
    z: cz + (Math.random() - 0.5) * 1.2,
    vx: (Math.random() - 0.5) * 0.25,
    vy: 2.5 + Math.random() * 2.0,
    vz: (Math.random() - 0.5) * 0.25,
    age: Math.random() * 2.0,
    maxAge: 4.0 + Math.random() * 3.0,
  }
}

function FireParticles({ cx, cy, cz }: Props) {
  const flameData = useMemo(() =>
    Array.from({ length: FLAME_COUNT }, () => newFlameParticle(cx, cy, cz)), [cx, cy, cz])
  const smokeData = useMemo(() =>
    Array.from({ length: SMOKE_COUNT }, () => newSmokeParticle(cx, cy, cz)), [cx, cy, cz])

  const flameGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FLAME_COUNT * 3), 3))
    geo.setAttribute('size', new THREE.BufferAttribute(new Float32Array(FLAME_COUNT), 1))
    return geo
  }, [])

  const smokeGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SMOKE_COUNT * 3), 3))
    geo.setAttribute('size', new THREE.BufferAttribute(new Float32Array(SMOKE_COUNT), 1))
    return geo
  }, [])

  const flameMat = useMemo(() => new THREE.PointsMaterial({
    color: '#ff6600',
    size: 0.9,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  }), [])

  const smokeMat = useMemo(() => new THREE.PointsMaterial({
    color: '#444444',
    size: 1.2,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    blending: THREE.NormalBlending,
    sizeAttenuation: true,
  }), [])

  useFrame((_, delta) => {
    const flamePos = flameGeo.attributes.position as THREE.BufferAttribute
    const flameSize = flameGeo.attributes.size as THREE.BufferAttribute
    const smokePos = smokeGeo.attributes.position as THREE.BufferAttribute
    const smokeSize = smokeGeo.attributes.size as THREE.BufferAttribute

    for (let i = 0; i < FLAME_COUNT; i++) {
      const p = flameData[i]
      p.age += delta
      if (p.age >= p.maxAge) Object.assign(p, newFlameParticle(cx, cy, cz))
      p.vx += (Math.random() - 0.5) * 0.5 * delta
      p.x += p.vx * delta
      p.y += p.vy * delta
      p.z += p.vz * delta
      const t = p.age / p.maxAge
      flamePos.setXYZ(i, p.x, p.y, p.z)
      flameSize.setX(i, (1 - t) * 0.95 + 0.08)
    }
    flamePos.needsUpdate = true
    flameSize.needsUpdate = true

    for (let i = 0; i < SMOKE_COUNT; i++) {
      const p = smokeData[i]
      p.age += delta
      if (p.age >= p.maxAge) Object.assign(p, newSmokeParticle(cx, cy, cz))
      p.vx += (Math.random() - 0.5) * 0.2 * delta
      p.x += p.vx * delta
      p.y += p.vy * delta
      p.z += p.vz * delta
      const t = p.age / p.maxAge
      smokePos.setXYZ(i, p.x, p.y, p.z)
      smokeSize.setX(i, 0.5 + t * 2.8)
    }
    smokePos.needsUpdate = true
    smokeSize.needsUpdate = true

    const flicker = 0.5 + 0.5 * Math.sin(Date.now() * 0.012)
    flameMat.color.setRGB(1, 0.28 + flicker * 0.45, 0)
    smokeMat.opacity = 0.15 + 0.07 * Math.sin(Date.now() * 0.003)
  })

  return (
    <>
      <points geometry={flameGeo} material={flameMat} />
      <points geometry={smokeGeo} material={smokeMat} />
    </>
  )
}

function LogPile({ cx, cy, cz }: Props) {
  const logMat  = useMemo(() => new THREE.MeshLambertMaterial({ color: '#3d2010' }), [])
  const logH    = useMemo(() => new THREE.BoxGeometry(2.2, 0.22, 0.35), [])
  const logV    = useMemo(() => new THREE.BoxGeometry(0.35, 0.22, 2.2), [])
  const logH2   = useMemo(() => new THREE.BoxGeometry(1.8, 0.22, 0.3), [])
  const logV2   = useMemo(() => new THREE.BoxGeometry(0.3, 0.22, 1.8), [])
  const emberMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#dd2200' }), [])
  const emberGeo = useMemo(() => new THREE.BoxGeometry(1.1, 0.12, 1.1), [])

  return (
    <group position={[cx, cy, cz]}>
      {/* Bottom layer: 2 horizontal logs */}
      <mesh geometry={logH} material={logMat} position={[0, 0.11,  0.3]} />
      <mesh geometry={logH} material={logMat} position={[0, 0.11, -0.3]} />
      {/* Bottom layer: 2 vertical logs */}
      <mesh geometry={logV} material={logMat} position={[ 0.3, 0.11, 0]} />
      <mesh geometry={logV} material={logMat} position={[-0.3, 0.11, 0]} />
      {/* Top layer cross logs */}
      <mesh geometry={logH2} material={logMat} position={[0, 0.33,  0.2]} />
      <mesh geometry={logH2} material={logMat} position={[0, 0.33, -0.2]} />
      <mesh geometry={logV2} material={logMat} position={[ 0.2, 0.33, 0]} />
      <mesh geometry={logV2} material={logMat} position={[-0.2, 0.33, 0]} />
      {/* Glowing embers */}
      <mesh geometry={emberGeo} material={emberMat} position={[0, 0.2, 0]} />
    </group>
  )
}

export default function TowerFire({ cx, cy, cz }: Props) {
  const logY  = cy + 0.5
  const fireY = logY + 0.55

  return (
    <group>
      <LogPile cx={cx} cy={logY} cz={cz} />
      <FireParticles cx={cx} cy={fireY} cz={cz} />
    </group>
  )
}
