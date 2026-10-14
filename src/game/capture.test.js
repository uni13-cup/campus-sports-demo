import test from 'node:test'
import assert from 'node:assert/strict'
import { initGame } from './engine.js'
import {
  confirmCapture,
  detectCaptureCandidates,
  updateCaptureFlow
} from './capture.js'

function chasingState() {
  const state = initGame({ obstacles: [] })
  state.phase = 'chasing'
  return state
}

test('human proximity automatically captures and converts the mouse', () => {
  const state = chasingState()
  state.players[1].position = {
    x: state.players[0].position.x + state.config.catchThreshold,
    y: state.players[0].position.y
  }
  const next = updateCaptureFlow(state, 1 / 30)
  assert.equal(next.captureCandidate, null)
  assert.equal(next.players[1].role, 'cat')
  assert.equal(next.players[0].captures, 1)
  assert.deepEqual(next.events.slice(-3).map((event) => event.type), [
    'capture-candidate',
    'capture-confirmed',
    'role-converted'
  ])
})

test('human proximity outside the configured threshold does not capture', () => {
  const state = chasingState()
  state.players[1].position = {
    x: state.players[0].position.x + state.config.catchThreshold + 0.01,
    y: state.players[0].position.y
  }
  const next = updateCaptureFlow(state, 1 / 30)
  assert.equal(next.players[1].role, 'mouse')
  assert.equal(next.players[0].captures, 0)
})

test('simulated touch confirmation converts a candidate and records events', () => {
  const state = chasingState()
  state.players[1].position = { ...state.players[0].position }
  const next = confirmCapture(state, 'mouse-1', 'cat-1')
  assert.equal(next.players[1].role, 'cat')
  assert.equal(next.players[0].captures, 1)
  assert.deepEqual(next.events.slice(-2).map((event) => event.type), [
    'capture-confirmed',
    'role-converted'
  ])
})

test('confirmation outside the threshold does not capture', () => {
  const state = chasingState()
  assert.equal(detectCaptureCandidates(state).length, 0)
  const next = confirmCapture(state, 'mouse-1', 'cat-1')
  assert.equal(next.players[1].role, 'mouse')
})

test('computer cats confirm captures automatically', () => {
  const state = chasingState()
  state.players[1].role = 'cat'
  state.players[1].controller = 'ai'
  state.players[2].position = { ...state.players[1].position }
  const next = updateCaptureFlow(state, 1 / 30)
  assert.equal(next.players[2].role, 'cat')
})

test('confirming the final mouse ends the game with a cat victory', () => {
  const state = chasingState()
  for (const player of state.players.slice(2)) player.role = 'cat'
  state.players[1].position = { ...state.players[0].position }
  const next = confirmCapture(updateCaptureFlow(state), 'mouse-1')
  assert.equal(next.phase, 'ended')
  assert.equal(next.winner, 'cat')
  assert.equal(next.events.at(-1).type, 'game-ended')
})
