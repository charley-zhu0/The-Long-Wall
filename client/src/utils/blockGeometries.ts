import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export function makeMerlonGeometry(): THREE.BufferGeometry {
  const base = new THREE.BoxGeometry(1.0, 0.5, 1.0)
  base.translate(0, -0.25, 0)
  const left = new THREE.BoxGeometry(0.35, 0.5, 1.0)
  left.translate(-0.325, 0.25, 0)
  const right = new THREE.BoxGeometry(0.35, 0.5, 1.0)
  right.translate(0.325, 0.25, 0)
  return mergeGeometries([base, left, right])!
}

export function makeTowerGeometry(): THREE.BufferGeometry {
  const base = new THREE.BoxGeometry(1.0, 0.55, 1.0)
  base.translate(0, -0.225, 0)
  const top = new THREE.BoxGeometry(0.65, 0.45, 0.65)
  top.translate(0, 0.275, 0)
  return mergeGeometries([base, top])!
}
