import { useRef, useCallback, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useGesture } from '@use-gesture/react'
import * as THREE from 'three'
import { useBlockStore } from '../store/blockStore'

const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

export default function InputController() {
  const { camera, gl, scene } = useThree()
  const placeBlock = useBlockStore((s) => s.placeBlock)
  const destroyBlock = useBlockStore((s) => s.destroyBlock)
  const selectedType = useBlockStore((s) => s.selectedType)

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const getIntersection = useCallback(
    (clientX: number, clientY: number) => {
      const rect = gl.domElement.getBoundingClientRect()
      mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(mouse, camera)

      const targets: THREE.Object3D[] = []
      scene.traverse((obj) => {
        if (
          (obj instanceof THREE.InstancedMesh && obj.count > 0) ||
          (obj as any).isGroundPlane
        ) {
          targets.push(obj)
        }
      })
      return raycaster.intersectObjects(targets, false)
    },
    [camera, gl, scene],
  )

  const handlePlace = useCallback(
    (clientX: number, clientY: number) => {
      const intersects = getIntersection(clientX, clientY)
      if (intersects.length === 0) return
      const hit = intersects[0]
      const normal = hit.face?.normal ?? new THREE.Vector3(0, 1, 0)
      const worldNormal = normal.clone().transformDirection(hit.object.matrixWorld)
      const placePos = hit.point.clone().add(worldNormal.multiplyScalar(0.5))
      placeBlock(Math.round(placePos.x), Math.round(placePos.y), Math.round(placePos.z), selectedType)
    },
    [getIntersection, placeBlock, selectedType],
  )

  const handleDestroy = useCallback(
    (clientX: number, clientY: number) => {
      const intersects = getIntersection(clientX, clientY)
      if (intersects.length === 0) return
      const hit = intersects[0]
      if (!(hit.object instanceof THREE.InstancedMesh)) return
      const instanceId = hit.instanceId
      if (instanceId == null) return
      const matrix = new THREE.Matrix4()
      ;(hit.object as THREE.InstancedMesh).getMatrixAt(instanceId, matrix)
      const pos = new THREE.Vector3().setFromMatrixPosition(matrix)
      destroyBlock(Math.round(pos.x), Math.round(pos.y), Math.round(pos.z))
    },
    [getIntersection, destroyBlock],
  )

  // Mouse handler
  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (e.button === 2) {
        handleDestroy(e.clientX, e.clientY)
      } else if (e.button === 0) {
        handlePlace(e.clientX, e.clientY)
      }
    },
    [handlePlace, handleDestroy],
  )

  useEffect(() => {
    const el = gl.domElement
    el.addEventListener('mousedown', handleMouseDown)
    return () => el.removeEventListener('mousedown', handleMouseDown)
  }, [gl.domElement, handleMouseDown])

  // Touch: tap = place, long-press (500ms) = destroy
  useGesture(
    {
      onPointerDown: ({ event }) => {
        if (!(event instanceof TouchEvent)) return
        const touch = (event as TouchEvent).touches[0]
        longPressTimer.current = setTimeout(() => {
          handleDestroy(touch.clientX, touch.clientY)
        }, 500)
      },
      onPointerUp: ({ event }) => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current)
          longPressTimer.current = null
        }
      },
      onClick: ({ event }) => {
        if (event instanceof MouseEvent) return // handled above
        const touch = (event as any)
        handlePlace(touch.clientX ?? 0, touch.clientY ?? 0)
      },
    },
    { target: gl.domElement },
  )

  return null
}
