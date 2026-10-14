import test from 'node:test'
import assert from 'node:assert/strict'

import { GAME_CONFIG } from './config.js'
import {
  calcDistance,
  checkCaptures,
  initGame,
  isWalkablePosition,
  moveCharacter,
  resetGame,
  tickGame,
  updateAi
} from './engine.js'

test('initGame creates one human cat and five AI mice', () => {
  const state = initGame()
  const cats = state.players.filter((player) => player.role === 'cat')
  const mice = state.players.filter((player) => player.role === 'mouse')

  assert.equal(state.phase, 'hiding')
  assert.equal(state.hidingTimeLeft, 5)
  assert.equal(state.chasingTimeLeft, 30)
  assert.equal(cats.length, 1)
  assert.equal(mice.length, 5)
  assert.equal(state.config.movementPresentation.mode, 'accelerated-demo')
  assert.equal(state.config.movementPresentation.demoMultiplier, 7)
  assert.equal(cats[0].controller, 'human')
  assert.ok(mice.every((mouse) => mouse.controller === 'ai'))
  assert.ok(
    state.players.every(({ position }) =>
      position.x >= 0 &&
      position.x <= GAME_CONFIG.mapWidth &&
      position.y >= 0 &&
      position.y <= GAME_CONFIG.mapHeight
    )
  )
})

test('moveCharacter returns a new state and moves the player cat while chasing', () => {
  const initial = { ...initGame(), phase: 'chasing' }
  const catBefore = initial.players.find((player) => player.id === 'cat-1')
  const moved = moveCharacter(initial, 'cat-1', { dx: 10, dy: -5 })
  const catAfter = moved.players.find((player) => player.id === 'cat-1')

  assert.notEqual(moved, initial)
  assert.deepEqual(catBefore.position, GAME_CONFIG.spawnPoints.cat)
  assert.deepEqual(catAfter.position, {
    x: GAME_CONFIG.spawnPoints.cat.x + 10,
    y: GAME_CONFIG.spawnPoints.cat.y - 5
  })
})

test('moveCharacter keeps a role inside the activity boundary', () => {
  const initial = { ...initGame(), phase: 'chasing' }
  const moved = moveCharacter(initial, 'cat-1', {
    dx: GAME_CONFIG.mapWidth * 2,
    dy: -GAME_CONFIG.mapHeight * 2
  })
  const cat = moved.players.find((player) => player.id === 'cat-1')

  assert.deepEqual(cat.position, {
    x: GAME_CONFIG.mapWidth - GAME_CONFIG.boundaryPadding,
    y: GAME_CONFIG.boundaryPadding
  })
})

test('positions outside the activity boundary are not walkable', () => {
  const boundaryOnlyConfig = { ...GAME_CONFIG, obstacles: [] }
  assert.equal(
    isWalkablePosition(
      { x: GAME_CONFIG.boundaryPadding, y: GAME_CONFIG.boundaryPadding },
      boundaryOnlyConfig
    ),
    true
  )
  assert.equal(
    isWalkablePosition(
      { x: GAME_CONFIG.boundaryPadding - 1, y: GAME_CONFIG.boundaryPadding },
      boundaryOnlyConfig
    ),
    false
  )
})

test('the player cat cannot move during the hiding phase', () => {
  const initial = initGame()
  const moved = moveCharacter(initial, 'cat-1', { dx: 10, dy: 0 })

  assert.deepEqual(moved, initial)
})

test('calcDistance returns an exact Euclidean distance in virtual metres', () => {
  assert.equal(calcDistance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5)
  assert.equal(calcDistance({ x: 0, y: 0 }, { x: 1, y: 1 }), Math.SQRT2)
})

test('all configured spawn points are walkable', () => {
  const state = initGame()

  assert.ok(
    state.players.every((player) =>
      isWalkablePosition(player.position, state.config)
    )
  )
})

test('configured spawn points keep the agreed safety distances', () => {
  const state = initGame()
  const cat = state.players.find((player) => player.role === 'cat')
  const mice = state.players.filter((player) => player.role === 'mouse')

  assert.ok(
    mice.every((mouse) =>
      calcDistance(cat.position, mouse.position) >=
      GAME_CONFIG.spawnClearance.catToMouse
    )
  )

  for (let first = 0; first < mice.length; first += 1) {
    for (let second = first + 1; second < mice.length; second += 1) {
      assert.ok(
        calcDistance(mice[first].position, mice[second].position) >=
        GAME_CONFIG.spawnClearance.mouseToMouse
      )
    }
  }

  assert.ok(
    state.players.every((player) =>
      state.config.obstacles.every((obstacle) =>
        distanceToRectangle(player.position, obstacle) >=
        GAME_CONFIG.spawnClearance.obstacle
      )
    )
  )
})

test('moveCharacter rejects movement into a building', () => {
  const initial = { ...initGame(), phase: 'chasing' }
  const cat = initial.players.find((player) => player.id === 'cat-1')
  const obstacle = initial.config.obstacles[0]
  cat.position = {
    x: obstacle.x - 10,
    y: obstacle.y + obstacle.height / 2
  }

  const moved = moveCharacter(initial, 'cat-1', { dx: 20, dy: 0 })
  const catAfter = moved.players.find((player) => player.id === 'cat-1')

  assert.deepEqual(catAfter.position, cat.position)
})

test('checkCaptures converts a mouse exactly at the catch threshold', () => {
  const initial = createCaptureState(15)
  const result = checkCaptures(initial)
  const convertedMouse = result.state.players.find(
    (player) => player.id === 'mouse-1'
  )

  assert.equal(result.captures.length, 1)
  assert.equal(result.captures[0].distance, 15)
  assert.equal(convertedMouse.role, 'cat')
  assert.equal(convertedMouse.controller, 'ai')
  assert.equal(convertedMouse.capturedAt, 30)
})

test('checkCaptures does not capture a mouse outside the threshold', () => {
  const initial = createCaptureState(15.01)
  const result = checkCaptures(initial)

  assert.equal(result.captures.length, 0)
  assert.equal(result.state.players[1].role, 'mouse')
  assert.equal(result.state.phase, 'chasing')
})

test('checkCaptures is disabled during the hiding phase', () => {
  const initial = { ...createCaptureState(5), phase: 'hiding' }
  const result = checkCaptures(initial)

  assert.equal(result.captures.length, 0)
  assert.equal(result.state.players[1].role, 'mouse')
})

test('capturing the final mouse ends the game with a cat victory', () => {
  const initial = createCaptureState(10)
  const result = checkCaptures(initial)

  assert.equal(result.state.phase, 'ended')
  assert.equal(result.state.winner, 'cat')
  assert.equal(result.state.endReason, 'all-mice-caught')
  assert.equal(result.state.players[0].captures, 1)
})

test('capturing one of several mice keeps the chase running', () => {
  const initial = initGame()
  initial.phase = 'chasing'
  initial.players[0].position = { x: 100, y: 100 }
  initial.players[1].position = { x: 110, y: 100 }

  const result = checkCaptures(initial)

  assert.equal(result.captures.length, 1)
  assert.equal(
    result.state.players.filter((player) => player.role === 'mouse').length,
    4
  )
  assert.equal(result.state.phase, 'chasing')
  assert.equal(result.state.winner, null)
})

test('tickGame changes hiding to chasing after five seconds', () => {
  const initial = initGame()
  const afterFourSeconds = tickGame(initial, 4)
  const afterFiveSeconds = tickGame(afterFourSeconds, 1)

  assert.equal(afterFourSeconds.phase, 'hiding')
  assert.equal(afterFourSeconds.hidingTimeLeft, 1)
  assert.equal(afterFiveSeconds.phase, 'chasing')
  assert.equal(afterFiveSeconds.hidingTimeLeft, 0)
  assert.equal(afterFiveSeconds.chasingTimeLeft, 30)
})

test('tickGame applies excess time to the chasing countdown', () => {
  const state = tickGame(initGame(), 6)

  assert.equal(state.phase, 'chasing')
  assert.equal(state.hidingTimeLeft, 0)
  assert.equal(state.chasingTimeLeft, 29)
})

test('tickGame awards mice the victory when chasing time expires', () => {
  const chasing = tickGame(initGame(), 5)
  const ended = tickGame(chasing, 30)

  assert.equal(ended.phase, 'ended')
  assert.equal(ended.chasingTimeLeft, 0)
  assert.equal(ended.winner, 'mouse')
  assert.equal(ended.endReason, 'timeout')
})

test('characters cannot move after the game has ended', () => {
  const ended = tickGame(initGame(), 35)
  const catBefore = ended.players.find((player) => player.id === 'cat-1')
  const moved = moveCharacter(ended, 'cat-1', { dx: 10, dy: 0 })
  const catAfter = moved.players.find((player) => player.id === 'cat-1')

  assert.deepEqual(catAfter.position, catBefore.position)
  assert.equal(moved.phase, 'ended')
})

test('resetGame returns a fresh game with the agreed timers and spawns', () => {
  tickGame(initGame(), 35)
  const reset = resetGame()
  const cat = reset.players.find((player) => player.id === 'cat-1')

  assert.equal(reset.phase, 'hiding')
  assert.equal(reset.hidingTimeLeft, 5)
  assert.equal(reset.chasingTimeLeft, 30)
  assert.equal(reset.winner, null)
  assert.deepEqual(cat.position, {
    x: GAME_CONFIG.spawnPoints.cat.x,
    y: GAME_CONFIG.spawnPoints.cat.y
  })
})

test('updateAi disperses mice while the human cat stays still during hiding', () => {
  const initial = initGame()
  const catBefore = initial.players.find((player) => player.id === 'cat-1')
  const miceBefore = initial.players
    .filter((player) => player.role === 'mouse')
    .map((player) => ({ ...player.position }))

  const updated = updateAi(initial, () => 0)
  const catAfter = updated.players.find((player) => player.id === 'cat-1')
  const miceAfter = updated.players.filter((player) => player.role === 'mouse')

  assert.deepEqual(catAfter.position, catBefore.position)
  assert.ok(
    miceAfter.every((mouse, index) =>
      calcDistance(mouse.position, miceBefore[index]) > 0 &&
      isWalkablePosition(mouse.position, updated.config)
    )
  )
})

test('updateAi makes a mouse flee from its nearest cat while chasing', () => {
  const initial = createCaptureState(30)
  initial.players[0].controller = 'human'
  const updated = updateAi(initial, () => 0)
  const mouse = updated.players.find((player) => player.id === 'mouse-1')

  assert.ok(mouse.position.x > 280)
  assert.equal(mouse.position.y, 200)
})

test('updateAi makes a converted computer cat chase the nearest mouse', () => {
  const initial = initGame()
  initial.phase = 'chasing'
  initial.players = [
    {
      id: 'cat-1',
      role: 'cat',
      controller: 'human',
      position: { x: 450, y: 250 },
      captures: 0
    },
    {
      id: 'mouse-1',
      role: 'cat',
      controller: 'ai',
      position: { x: 200, y: 200 },
      capturedAt: 25,
      captures: 0
    },
    {
      id: 'mouse-2',
      role: 'mouse',
      controller: 'ai',
      position: { x: 240, y: 200 },
      capturedAt: null
    }
  ]

  const updated = updateAi(initial, () => 0)
  const computerCat = updated.players.find((player) => player.id === 'mouse-1')

  assert.ok(computerCat.position.x > 200)
  assert.equal(computerCat.position.y, 200)
})

test('updateAi never moves a computer role into a building', () => {
  const initial = createCaptureState(110)
  const obstacle = initial.config.obstacles.find(
    (item) => item.x > 150 && item.y > initial.config.boundaryPadding
  )
  initial.players[0].position = {
    x: obstacle.x - 120,
    y: obstacle.y + obstacle.height / 2
  }
  initial.players[1].position = {
    x: obstacle.x - 10,
    y: obstacle.y + obstacle.height / 2
  }

  const updated = updateAi(initial, () => 0)
  const mouse = updated.players.find((player) => player.id === 'mouse-1')

  assert.equal(isWalkablePosition(mouse.position, updated.config), true)
  assert.notDeepEqual(mouse.position, {
    x: obstacle.x,
    y: obstacle.y + obstacle.height / 2
  })
})

test('a complete round can progress from hiding to cat victory and reset', () => {
  let state = tickGame(initGame(), 5)
  assert.equal(state.phase, 'chasing')

  while (state.players.some((player) => player.role === 'mouse')) {
    const cat = state.players.find((player) => player.role === 'cat')
    const mouse = state.players.find((player) => player.role === 'mouse')
    mouse.position = {
      x: cat.position.x + state.config.catchThreshold,
      y: cat.position.y
    }
    state = checkCaptures(state).state
  }

  assert.equal(state.phase, 'ended')
  assert.equal(state.winner, 'cat')
  assert.equal(state.endReason, 'all-mice-caught')
  assert.equal(state.players.filter((player) => player.role === 'cat').length, 6)

  const reset = resetGame()
  assert.equal(reset.phase, 'hiding')
  assert.equal(reset.players.filter((player) => player.role === 'mouse').length, 5)
})

test.afterEach(() => {
  resetGame()
})

function distanceToRectangle(position, rectangle) {
  const dx = Math.max(
    rectangle.x - position.x,
    0,
    position.x - (rectangle.x + rectangle.width)
  )
  const dy = Math.max(
    rectangle.y - position.y,
    0,
    position.y - (rectangle.y + rectangle.height)
  )
  return Math.hypot(dx, dy)
}

function createCaptureState(distance) {
  const state = initGame()
  state.phase = 'chasing'
  state.players = state.players.slice(0, 2)
  state.players[0].position = { x: 250, y: 200 }
  state.players[1].position = { x: 250 + distance, y: 200 }
  return state
}
