import test from 'node:test'
import assert from 'node:assert/strict'
import { initGame } from './engine.js'
import {
  advanceSimulation,
  clampFrameDelta,
  moveCharacterContinuous,
  normalizeInput,
  sweepPosition
} from './simulation.js'

test('normalizeInput prevents diagonal movement from becoming faster', () => {
  const input = normalizeInput({ x: 1, y: 1 })
  assert.ok(Math.abs(Math.hypot(input.x, input.y) - 1) < 1e-10)
})

test('continuous movement distance is speed multiplied by time', () => {
  const state = initGame({ obstacles: [] })
  state.phase = 'chasing'
  const moved = moveCharacterContinuous(state, 'cat-1', { x: 1, y: 0 }, 0.5, 20)
  assert.equal(moved.players[0].position.x, state.players[0].position.x + 10)
  assert.deepEqual(state.players[0].position, { x: 180, y: 260 })
})

test('player cat stays still during hiding in the continuous API', () => {
  const state = initGame({ obstacles: [] })
  const moved = moveCharacterContinuous(state, 'cat-1', { x: 1, y: 0 }, 1, 20)
  assert.deepEqual(moved.players[0].position, state.players[0].position)
})

test('swept collision stops a high-speed path before a building', () => {
  const config = {
    mapWidth: 200,
    mapHeight: 100,
    boundaryPadding: 0,
    obstacles: [{ id: 'wall', x: 80, y: 20, width: 20, height: 60 }]
  }
  const end = sweepPosition({ x: 10, y: 50 }, { x: 190, y: 50 }, config)
  assert.ok(end.x < 80)
  assert.ok(end.x > 79.9)
  assert.equal(end.y, 50)
})

test('swept collision allows a path that passes above a building', () => {
  const config = {
    mapWidth: 200,
    mapHeight: 100,
    boundaryPadding: 0,
    obstacles: [{ id: 'wall', x: 80, y: 20, width: 20, height: 60 }]
  }
  assert.deepEqual(
    sweepPosition({ x: 10, y: 10 }, { x: 190, y: 10 }, config),
    { x: 190, y: 10 }
  )
})

test('frame delta is capped after a slow frame or background pause', () => {
  assert.equal(clampFrameDelta(5), 0.15)
  assert.equal(clampFrameDelta(-1), 0)
})

test('fixed simulation advances the countdown with fractional seconds', () => {
  const state = initGame({ obstacles: [] })
  const next = advanceSimulation(state, { x: 0, y: 0 }, 1 / 30)
  assert.ok(next.hidingTimeLeft < 5)
  assert.ok(next.hidingTimeLeft > 4.96)
})
