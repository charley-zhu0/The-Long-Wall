import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import { usePlayerStore } from '../store/playerStore'

export default function PlayerAvatars() {
  const players = usePlayerStore((s) => s.players)

  return (
    <>
      {Array.from(players.values()).map((p) => (
        <group key={p.id} position={[p.x, p.y + 1, p.z]}>
          <mesh castShadow>
            <boxGeometry args={[0.8, 0.8, 0.8]} />
            <meshLambertMaterial color={p.avatarColor} />
          </mesh>
          <Text
            position={[0, 0.8, 0]}
            fontSize={0.4}
            color="white"
            anchorX="center"
            anchorY="bottom"
            outlineColor="black"
            outlineWidth={0.05}
          >
            {p.username || p.id.slice(0, 6)}
          </Text>
        </group>
      ))}
    </>
  )
}
