import test from 'node:test'
import assert from 'node:assert/strict'
import {
  createGameSession,
  GAME_SESSION_KEY,
  loadGameSession,
  saveGameSession
} from './game-session.js'

function createStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  }
}

test('game session records a normalized role and explicit Demo metadata', () => {
  const session = createGameSession('mouse', 1000)
  assert.equal(session.humanRole, 'mouse')
  assert.equal(session.roomId, 'DEMO-ZD-01')
  assert.equal(session.positioningMode, 'simulated')
  assert.equal(session.participantCount, 6)
})

test('game session can be saved and restored for the match page', () => {
  const storage = createStorage()
  saveGameSession('mouse', storage, 1000)
  assert.equal(loadGameSession(storage, 2000).humanRole, 'mouse')
})

test('invalid or expired game session safely falls back to cat mode', () => {
  const storage = createStorage()
  storage.setItem(GAME_SESSION_KEY, JSON.stringify({
    version: 3,
    humanRole: 'dog',
    expiresAt: 500
  }))
  assert.equal(loadGameSession(storage, 1000).humanRole, 'cat')
  assert.equal(storage.getItem(GAME_SESSION_KEY), null)
})
