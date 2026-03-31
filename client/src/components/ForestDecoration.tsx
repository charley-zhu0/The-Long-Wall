import React from 'react'

// Linear congruential generator with seed=42 for deterministic tree positions
function lcg(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

function generateTrees() {
  const rand = lcg(42)
  const trees: { x: number; z: number }[] = []
  let attempts = 0
  while (trees.length < 20 && attempts < 200) {
    attempts++
    const x = (rand() - 0.5) * 80 // -40 to 40
    const z = rand() * 25 - 5     // -5 to 20
    if (x < -8 || x > 22) {
      trees.push({ x, z })
    }
  }
  return trees
}

const TREES = generateTrees()

export default function ForestDecoration() {
  return (
    <group>
      {TREES.map((tree, i) => (
        <group key={i} position={[tree.x, -0.5, tree.z]}>
          {/* Trunk */}
          <mesh position={[0, 0.75, 0]} raycast={() => null}>
            <cylinderGeometry args={[0.3, 0.3, 1.5, 6]} />
            <meshLambertMaterial color="#8B6914" />
          </mesh>
          {/* Canopy */}
          <mesh position={[0, 2.75, 0]} raycast={() => null}>
            <coneGeometry args={[1.5, 3.5, 7]} />
            <meshLambertMaterial color="#2d8a2d" />
          </mesh>
        </group>
      ))}
    </group>
  )
}
