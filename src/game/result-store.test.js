import test from 'node:test'
import assert from 'node:assert/strict'
import { initGame } from './engine.js'
import {
  createResultSnapshot,
  loadGameResult,
  RESULT_STORAGE_KEY,
  saveGameResult
} from './result-store.js'

function memoryStorage() {
  const data = new Map()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key)
  }
}

test('result snapshot omits positions and keeps the scoreboard', () => {
  const state = initGame()
  state.phase = 'ended'
  state.winner = 'mouse'
  const snapshot = createResultSnapshot(state, 1000)
  assert.equal(snapshot.players.length, 6)
  assert.equal('position' in snapshot.players[0], false)
  assert.equal(snapshot.savedAt, 1000)
  assert.deepEqual(snapshot.events, [])
  assert.equal(snapshot.version, 3)
  assert.equal(snapshot.initialHumanRole, 'cat')
})

test('mouse-mode result records the chosen role and final human role', () => {
  const state = initGame({ humanRole: 'mouse' })
  state.phase = 'ended'
  state.winner = 'cat'
  state.players.find((player) => player.controller === 'human').role = 'cat'
  const snapshot = createResultSnapshot(state, 1000)

  assert.equal(snapshot.initialHumanRole, 'mouse')
  assert.equal(snapshot.players.find((player) => player.controller === 'human').role, 'cat')
})

test('session result can be saved and loaded', () => {
  const storage = memoryStorage()
  const state = initGame()
  state.phase = 'ended'
  state.winner = 'mouse'
  assert.equal(saveGameResult(state, storage), true)
  assert.equal(loadGameResult(storage)?.winner, 'mouse')
})

test('expired or invalid session result is cleared', () => {
  const storage = memoryStorage()
  storage.setItem(RESULT_STORAGE_KEY, JSON.stringify({
    version: 2,
    expiresAt: 10,
    players: []
  }))
  assert.equal(loadGameResult(storage, 11), null)
  assert.equal(storage.getItem(RESULT_STORAGE_KEY), null)
})

test('version 2 result remains readable with a cat-mode compatibility default', () => {
  const storage = memoryStorage()
  storage.setItem(RESULT_STORAGE_KEY, JSON.stringify({
    version: 2,
    expiresAt: 2000,
    players: []
  }))
  assert.equal(loadGameResult(storage, 1000).initialHumanRole, 'cat')
})
