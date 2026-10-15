import test from 'node:test'
import assert from 'node:assert/strict'
import {
  checkCaptures,
  initGame,
  moveCharacter,
  tickGame
} from './engine.js'
import { updateNavigatingAi } from './navigation.js'
import { updateCaptureFlow } from './capture.js'
import { advanceSimulation } from './simulation.js'

test('mouse mode creates one human mouse, one AI cat and four AI mice', () => {
  const state = initGame({ humanRole: 'mouse' })
  const human = state.players.find((player) => player.controller === 'human')
  const aiCat = state.players.find(
    (player) => player.role === 'cat' && player.controller === 'ai'
  )

  assert.equal(state.initialHumanRole, 'mouse')
  assert.equal(human.id, 'mouse-1')
  assert.equal(human.role, 'mouse')
  assert.equal(aiCat.id, 'cat-1')
  assert.equal(state.players.filter((player) => player.role === 'mouse').length, 5)
})

test('human mouse can move while the AI cat stays still during hiding', () => {
  const state = initGame({ humanRole: 'mouse', obstacles: [] })
  const humanBefore = state.players.find((player) => player.controller === 'human')
  const catBefore = state.players.find((player) => player.role === 'cat')
  const moved = moveCharacter(state, humanBefore.id, { dx: 8, dy: 0 })
  const navigated = updateNavigatingAi(moved, 1 / 30)
  const humanAfter = navigated.players.find((player) => player.controller === 'human')
  const catAfter = navigated.players.find((player) => player.id === catBefore.id)

  assert.equal(humanAfter.position.x, humanBefore.position.x + 8)
  assert.deepEqual(catAfter.position, catBefore.position)
})

test('AI cat follows a road route toward mice after chasing begins', () => {
  const state = initGame({ humanRole: 'mouse' })
  state.phase = 'chasing'
  const catBefore = state.players.find((player) => player.id === 'cat-1')
  const next = updateNavigatingAi(state, 0.5)
  const catAfter = next.players.find((player) => player.id === 'cat-1')

  assert.notDeepEqual(catAfter.position, catBefore.position)
  assert.ok(next.navigation['cat-1'].path.length > 0)
})

test('AI cat captures only the nearest mouse and preserves a human controller', () => {
  const state = initGame({ humanRole: 'mouse', obstacles: [] })
  state.phase = 'chasing'
  const cat = state.players.find((player) => player.id === 'cat-1')
  const humanMouse = state.players.find((player) => player.id === 'mouse-1')
  const otherMouse = state.players.find((player) => player.id === 'mouse-2')
  cat.position = { x: 200, y: 200 }
  humanMouse.position = { x: 210, y: 200 }
  otherMouse.position = { x: 215, y: 200 }

  const result = checkCaptures(state)
  const convertedHuman = result.state.players.find((player) => player.id === 'mouse-1')

  assert.equal(result.captures.length, 1)
  assert.equal(result.captures[0].mouseId, 'mouse-1')
  assert.equal(convertedHuman.role, 'cat')
  assert.equal(convertedHuman.controller, 'human')
  assert.equal(result.state.players.find((player) => player.id === 'mouse-2').role, 'mouse')
})

test('converted human mouse continues as a player cat and can capture', () => {
  const state = initGame({ humanRole: 'mouse', obstacles: [] })
  state.phase = 'chasing'
  state.players.find((player) => player.id === 'cat-1').position = { x: 200, y: 200 }
  state.players.find((player) => player.id === 'mouse-1').position = { x: 210, y: 200 }
  let next = checkCaptures(state).state
  const humanCat = next.players.find((player) => player.id === 'mouse-1')
  const target = next.players.find((player) => player.id === 'mouse-2')
  humanCat.position = { x: 400, y: 300 }
  target.position = { x: 410, y: 300 }
  next.captureContactKeys = []

  const result = checkCaptures(next)
  assert.equal(result.captures.length, 1)
  assert.equal(result.captures[0].catId, 'mouse-1')
  assert.equal(result.captures[0].mouseId, 'mouse-2')
})

test('mouse mode still awards surviving mice the victory at timeout', () => {
  const ended = tickGame(initGame({ humanRole: 'mouse' }), 35)
  assert.equal(ended.phase, 'ended')
  assert.equal(ended.winner, 'mouse')
  assert.equal(ended.endReason, 'timeout')
})

test('AI movement is followed by an immediate capture check', () => {
  const state = initGame({ humanRole: 'mouse', obstacles: [] })
  state.phase = 'chasing'
  const human = state.players.find((player) => player.controller === 'human')
  state.players.find((player) => player.id === 'cat-1').position = { x: 200, y: 200 }
  human.position = { x: 400, y: 300 }
  for (const mouse of state.players.filter((player) => player.role === 'mouse' && player.id !== human.id)) {
    mouse.position = { x: 650, y: 500 + Number(mouse.id.at(-1)) * 20 }
  }

  const next = advanceSimulation(state, { x: 0, y: 0 }, 1 / 30, {
    captureUpdater: updateCaptureFlow,
    aiUpdater(current) {
      const moved = structuredClone(current)
      moved.players.find((player) => player.id === 'cat-1').position = { ...human.position }
      return moved
    }
  })

  const converted = next.players.find((player) => player.id === human.id)
  assert.equal(converted.role, 'cat')
  assert.equal(converted.controller, 'human')
})

test('mouse mode can complete a full match with all mice converted', () => {
  let state = initGame({ humanRole: 'mouse', obstacles: [] })
  state.phase = 'chasing'
  while (state.players.some((player) => player.role === 'mouse')) {
    const cat = state.players.find((player) => player.id === 'cat-1')
    const mouse = state.players.find((player) => player.role === 'mouse')
    mouse.position = { x: cat.position.x + 10, y: cat.position.y }
    state.captureContactKeys = []
    state = checkCaptures(state).state
  }

  assert.equal(state.phase, 'ended')
  assert.equal(state.winner, 'cat')
  assert.equal(state.players.filter((player) => player.role === 'cat').length, 6)
  assert.equal(state.players.find((player) => player.controller === 'human').role, 'cat')
})
