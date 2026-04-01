import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// 垛口（Merlon）: 真实长城垛口形状
// 结构: 底座平台 + 左右两个垛墙体 + 垛墙顶部各有一个小瞭望孔缺口
// 整体轮廓: 宽底 → 中间开口(箭孔) → 两侧垛柱 → 顶部略收
export function makeMerlonGeometry(): THREE.BufferGeometry {
  // 底座: 完整宽度，矮而厚，作为女儿墙基础
  const base = new THREE.BoxGeometry(1.0, 0.28, 1.0)
  base.translate(0, -0.36, 0)

  // 左垛柱: 占宽度约38%，高度为主体
  const leftPillar = new THREE.BoxGeometry(0.36, 0.52, 1.0)
  leftPillar.translate(-0.32, 0.0, 0)

  // 右垛柱: 对称
  const rightPillar = new THREE.BoxGeometry(0.36, 0.52, 1.0)
  rightPillar.translate(0.32, 0.0, 0)

  // 左垛柱顶帽: 略宽于柱身，形成压顶石效果
  const leftCap = new THREE.BoxGeometry(0.40, 0.10, 1.04)
  leftCap.translate(-0.30, 0.29, 0)

  // 右垛柱顶帽
  const rightCap = new THREE.BoxGeometry(0.40, 0.10, 1.04)
  rightCap.translate(0.30, 0.29, 0)

  // 左垛柱上的瞭望孔(小矩形缺口): 在柱身中部挖去一小块
  // 用负空间无法实现，改为在孔洞周围加框
  // 左侧孔洞上沿横梁（很薄）
  const leftHoleTop = new THREE.BoxGeometry(0.36, 0.06, 0.28)
  leftHoleTop.translate(-0.32, 0.14, -0.36)

  // 右侧孔洞上沿横梁
  const rightHoleTop = new THREE.BoxGeometry(0.36, 0.06, 0.28)
  rightHoleTop.translate(0.32, 0.14, -0.36)

  return mergeGeometries([
    base,
    leftPillar, rightPillar,
    leftCap, rightCap,
    leftHoleTop, rightHoleTop,
  ])!
}

// 烽火台（Beacon Tower）: 三层台体结构，底宽上窄
// 真实烽火台: 方形夯土/砖石台，多层收分，顶部有矮墙
export function makeTowerGeometry(): THREE.BufferGeometry {
  // 第一层(底层): 最宽，占整个格子，高度约45%
  const tier1 = new THREE.BoxGeometry(1.0, 0.40, 1.0)
  tier1.translate(0, -0.30, 0)

  // 第二层(中层): 收分约15%，站在第一层之上
  const tier2 = new THREE.BoxGeometry(0.80, 0.28, 0.80)
  tier2.translate(0, 0.04, 0)

  // 第三层(顶层): 再次收分，形成台顶平台
  const tier3 = new THREE.BoxGeometry(0.62, 0.16, 0.62)
  tier3.translate(0, 0.26, 0)

  // 顶部四角角柱: 烽火台顶四角的小柱，用于悬挂烽火
  const cornerSize = 0.13
  const cornerH = 0.20
  const offset = 0.22
  const cornerY = 0.42

  const c1 = new THREE.BoxGeometry(cornerSize, cornerH, cornerSize)
  c1.translate(-offset, cornerY, -offset)
  const c2 = new THREE.BoxGeometry(cornerSize, cornerH, cornerSize)
  c2.translate( offset, cornerY, -offset)
  const c3 = new THREE.BoxGeometry(cornerSize, cornerH, cornerSize)
  c3.translate(-offset, cornerY,  offset)
  const c4 = new THREE.BoxGeometry(cornerSize, cornerH, cornerSize)
  c4.translate( offset, cornerY,  offset)

  // 顶部四边矮墙(连接四角柱): 形成烽火台顶部围栏
  const wallThick = 0.08
  const wallH = 0.14
  const wallY = 0.40

  // 前后矮墙
  const wallFront = new THREE.BoxGeometry(0.62, wallH, wallThick)
  wallFront.translate(0, wallY, 0.27)
  const wallBack = new THREE.BoxGeometry(0.62, wallH, wallThick)
  wallBack.translate(0, wallY, -0.27)
  // 左右矮墙
  const wallLeft = new THREE.BoxGeometry(wallThick, wallH, 0.62)
  wallLeft.translate(-0.27, wallY, 0)
  const wallRight = new THREE.BoxGeometry(wallThick, wallH, 0.62)
  wallRight.translate(0.27, wallY, 0)

  return mergeGeometries([
    tier1, tier2, tier3,
    c1, c2, c3, c4,
    wallFront, wallBack, wallLeft, wallRight,
  ])!
}
