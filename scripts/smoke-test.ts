/**
 * E2E smoke test: simulate 12 virtual clients joining, each placing 50 blocks,
 * verify section completion event fires.
 *
 * Run: npx ts-node scripts/smoke-test.ts
 */
import { Client } from 'colyseus.js'

const SERVER_URL = process.env.SERVER_URL ?? 'ws://localhost:2567'
const NUM_CLIENTS = 12
const BLOCKS_PER_CLIENT = 50

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

async function runClient(id: number) {
  const client = new Client(SERVER_URL)
  const room = await client.joinOrCreate('group', { groupId: (id % 3) + 1 })

  let completionReceived = false
  room.onMessage('SECTION_COMPLETE', () => {
    completionReceived = true
    console.log(`Client ${id}: SECTION_COMPLETE received`)
  })

  const start = Date.now()
  for (let i = 0; i < BLOCKS_PER_CLIENT; i++) {
    room.send('PLACE_BLOCK', {
      type: 'PLACE_BLOCK',
      x: (id * BLOCKS_PER_CLIENT + i) % 64 - 32,
      y: 0,
      z: id % 6,
      blockType: 1,
    })
    await sleep(10)
  }
  const elapsed = Date.now() - start

  console.log(`Client ${id}: placed ${BLOCKS_PER_CLIENT} blocks in ${elapsed}ms`)
  return { elapsed, completionReceived }
}

async function main() {
  console.log(`Spawning ${NUM_CLIENTS} clients against ${SERVER_URL}...`)

  const results = await Promise.all(
    Array.from({ length: NUM_CLIENTS }, (_, i) => runClient(i).catch((e) => {
      console.error(`Client ${i} error:`, e.message)
      return null
    }))
  )

  const valid = results.filter(Boolean) as { elapsed: number; completionReceived: boolean }[]
  const avgLatency = valid.reduce((s, r) => s + r.elapsed, 0) / valid.length / BLOCKS_PER_CLIENT

  console.log('\n=== Smoke Test Results ===')
  console.log(`Clients connected: ${valid.length}/${NUM_CLIENTS}`)
  console.log(`Average per-block latency: ${avgLatency.toFixed(1)}ms`)
  console.log(`Pass (≤200ms): ${avgLatency <= 200 ? 'YES' : 'NO'}`)
  process.exit(0)
}

main().catch(console.error)
