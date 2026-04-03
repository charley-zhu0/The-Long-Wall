import { useRef, useCallback, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Room } from 'colyseus.js'
import { useBlockStore } from '../store/blockStore'

const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()

export default function InputController({
  groupRoom,
  isTouch,
}: {
  groupRoom: Room | null
  isTouch: boolean
}) {
  const { camera, gl, scene } = useThree()
  const placeBlock = useBlockStore((s) => s.placeBlock)
  const destroyBlock = useBlockStore((s) => s.destroyBlock)
  const touchMode = useBlockStore((s) => s.touchMode)

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
      const x = Math.round(placePos.x)
      const y = Math.round(placePos.y)
      const z = Math.round(placePos.z)
      placeBlock(x, y, z, 1)
      groupRoom?.send('PLACE_BLOCK', { x, y, z, blockType: 1 })
    },
    [getIntersection, placeBlock, groupRoom],
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
      const x = Math.round(pos.x)
      const y = Math.round(pos.y)
      const z = Math.round(pos.z)
      destroyBlock(x, y, z)
      groupRoom?.send('DESTROY_BLOCK', { x, y, z })
    },
    [getIntersection, destroyBlock, groupRoom],
  )

  // PC mouse handler
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

  // Touch tap handler refs
  const tapStartX = useRef(0)
  const tapStartY = useRef(0)
  const tapPointerId = useRef<number | null>(null)
  const tapStartTime = useRef(0)
  // Keep latest touchMode in a ref so the event handler always sees the current value
  const touchModeRef = useRef(touchMode)
  useEffect(() => { touchModeRef.current = touchMode }, [touchMode])

  const handlePointerDown = useCallback((e: PointerEvent) => {
    if (e.pointerType !== 'touch') return
    // Ignore taps on HUD elements (buttons etc.)
    if ((e.target as Element)?.closest('button, [data-hud]')) return
    tapStartX.current = e.clientX
    tapStartY.current = e.clientY
    tapPointerId.current = e.pointerId
    tapStartTime.current = Date.now()
  }, [])

  const handlePointerUp = useCallback(
    (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return
      if (e.pointerId !== tapPointerId.current) return
      const dx = e.clientX - tapStartX.current
      const dy = e.clientY - tapStartY.current
      const dist = Math.sqrt(dx * dx + dy * dy)
      const elapsed = Date.now() - tapStartTime.current
      if (dist < 20 && elapsed < 400) {
        // Single-finger tap — use start position for accurate raycasting
        if (touchModeRef.current === 'place') {
          handlePlace(tapStartX.current, tapStartY.current)
        } else {
          handleDestroy(tapStartX.current, tapStartY.current)
        }
      }
    },
    [handlePlace, handleDestroy],
  )

  useEffect(() => {
    const el = gl.domElement
    if (isTouch) {
      // Listen on document to survive OrbitControls' setPointerCapture
      document.addEventListener('pointerdown', handlePointerDown)
      document.addEventListener('pointerup', handlePointerUp)
      return () => {
        document.removeEventListener('pointerdown', handlePointerDown)
        document.removeEventListener('pointerup', handlePointerUp)
      }
    } else {
      el.addEventListener('mousedown', handleMouseDown)
      const preventContext = (e: Event) => e.preventDefault()
      el.addEventListener('contextmenu', preventContext)
      return () => {
        el.removeEventListener('mousedown', handleMouseDown)
        el.removeEventListener('contextmenu', preventContext)
      }
    }
  }, [gl.domElement, isTouch, handleMouseDown, handlePointerDown, handlePointerUp])

  return null
}
