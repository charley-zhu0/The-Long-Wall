import React from 'react'

// Linear congruential generator with seed for deterministic positions
function lcg(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

// Wall occupies x: -45..44, z: 0..7 (with 10-unit clearance buffer)
function isInsideWall(x: number, z: number, halfW: number): boolean {
  return x >= -46 - halfW && x <= 45 + halfW && z >= -10 - halfW && z <= 17 + halfW
}

function generateTrees() {
  const rand = lcg(42)
  const trees: { x: number; z: number; scale: number; variety: number }[] = []
  let attempts = 0

  // Front forest: z = -10 to -40 (at least 10 units in front of wall)
  while (trees.length < 40 && attempts < 600) {
    attempts++
    const x = (rand() - 0.5) * 140   // -70 to 70
    const z = rand() * -30 - 10       // -10 to -40
    const scale = 0.7 + rand() * 0.8  // 0.7 – 1.5
    const variety = Math.floor(rand() * 3) // 0, 1, 2
    const halfW = scale * 1.5
    if (!isInsideWall(x, z, halfW)) {
      // Ensure minimum spacing between trees
      const tooClose = trees.some(t => {
        const dx = t.x - x, dz = t.z - z
        return Math.sqrt(dx * dx + dz * dz) < 3
      })
      if (!tooClose) trees.push({ x, z, scale, variety })
    }
  }

  // Back forest: z = 18 to 50 (at least 10 units behind wall, wall ends at z=7)
  attempts = 0
  while (trees.length < 70 && attempts < 600) {
    attempts++
    const x = (rand() - 0.5) * 140
    const z = rand() * 32 + 18        // 18 to 50
    const scale = 0.7 + rand() * 0.8
    const variety = Math.floor(rand() * 3)
    const halfW = scale * 1.5
    if (!isInsideWall(x, z, halfW)) {
      const tooClose = trees.some(t => {
        const dx = t.x - x, dz = t.z - z
        return Math.sqrt(dx * dx + dz * dz) < 3
      })
      if (!tooClose) trees.push({ x, z, scale, variety })
    }
  }

  return trees
}

const TREES = generateTrees()

// Three tree varieties: pine, round, tall-pine
function TreeMesh({ scale, variety }: { scale: number; variety: number }) {
  if (variety === 1) {
    // Round deciduous tree
    return (
      <>
        <mesh position={[0, 0.75 * scale, 0]} raycast={() => null}>
          <cylinderGeometry args={[0.25 * scale, 0.35 * scale, 1.5 * scale, 6]} />
          <meshLambertMaterial color="#7a5c1e" />
        </mesh>
        <mesh position={[0, 2.8 * scale, 0]} raycast={() => null}>
          <sphereGeometry args={[1.4 * scale, 7, 6]} />
          <meshLambertMaterial color="#3a9a3a" />
        </mesh>
        <mesh position={[0.6 * scale, 2.3 * scale, 0.4 * scale]} raycast={() => null}>
          <sphereGeometry args={[0.8 * scale, 6, 5]} />
          <meshLambertMaterial color="#2d8a2d" />
        </mesh>
      </>
    )
  }
  if (variety === 2) {
    // Tall pine
    return (
      <>
        <mesh position={[0, 0.9 * scale, 0]} raycast={() => null}>
          <cylinderGeometry args={[0.2 * scale, 0.3 * scale, 1.8 * scale, 6]} />
          <meshLambertMaterial color="#6b4c14" />
        </mesh>
        <mesh position={[0, 2.4 * scale, 0]} raycast={() => null}>
          <coneGeometry args={[1.0 * scale, 2.2 * scale, 7]} />
          <meshLambertMaterial color="#1e6e1e" />
        </mesh>
        <mesh position={[0, 3.8 * scale, 0]} raycast={() => null}>
          <coneGeometry args={[0.65 * scale, 1.8 * scale, 7]} />
          <meshLambertMaterial color="#278027" />
        </mesh>
        <mesh position={[0, 5.0 * scale, 0]} raycast={() => null}>
          <coneGeometry args={[0.35 * scale, 1.2 * scale, 7]} />
          <meshLambertMaterial color="#309030" />
        </mesh>
      </>
    )
  }
  // Default: standard pine
  return (
    <>
      <mesh position={[0, 0.75 * scale, 0]} raycast={() => null}>
        <cylinderGeometry args={[0.3 * scale, 0.3 * scale, 1.5 * scale, 6]} />
        <meshLambertMaterial color="#8B6914" />
      </mesh>
      <mesh position={[0, 2.75 * scale, 0]} raycast={() => null}>
        <coneGeometry args={[1.5 * scale, 3.5 * scale, 7]} />
        <meshLambertMaterial color="#2d8a2d" />
      </mesh>
      <mesh position={[0, 4.2 * scale, 0]} raycast={() => null}>
        <coneGeometry args={[0.9 * scale, 2.0 * scale, 7]} />
        <meshLambertMaterial color="#369436" />
      </mesh>
    </>
  )
}

export default function ForestDecoration() {
  return (
    <group>
      {TREES.map((tree, i) => (
        <group key={i} position={[tree.x, -0.5, tree.z]}>
          <TreeMesh scale={tree.scale} variety={tree.variety} />
        </group>
      ))}
    </group>
  )
}
