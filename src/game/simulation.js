import {
  calcDistance,
  checkCaptures,
  syncLegacyFields,
  tickGame
} from './engine.js'

export const FIXED_STEP_SECONDS = 1 / 30
export const MAX_FRAME_DELTA_SECONDS = 0.15

export function normalizeInput(input = {}) {
  const x = Number.isFinite(input.x) ? input.x : 0
  const y = Number.isFinite(input.y) ? input.y : 0
  const magnitude = Math.hypot(x, y)
  if (magnitude === 0) return { x: 0, y: 0 }
  if (magnitude <= 1) return { x, y }
  return { x: x / magnitude, y: y / magnitude }
}

export function clampFrameDelta(deltaSeconds) {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return 0
  return Math.min(deltaSeconds, MAX_FRAME_DELTA_SECONDS)
}

/**
 * 沿整段路径寻找最早障碍交点，避免高速移动直接穿过建筑矩形。
 * 当前障碍仍是 OSM 建筑/水域的外包矩形近似。
 */
export function sweepPosition(start, requestedEnd, config) {
  const padding = config.boundaryPadding ?? 0
  const end = {
    x: clamp(requestedEnd.x, padding, config.mapWidth - padding),
    y: clamp(requestedEnd.y, padding, config.mapHeight - padding)
  }
  const delta = { x: end.x - start.x, y: end.y - start.y }
  const distance = Math.hypot(delta.x, delta.y)
  if (distance === 0) return { ...start }

  let earliest = 1
  for (const obstacle of config.obstacles ?? []) {
    const entry = segmentRectangleEntry(start, end, obstacle)
    if (entry !== null) earliest = Math.min(earliest, entry)
  }

  if (earliest >= 1) return end
  const clearanceT = Math.min(0.02 / distance, 0.01)
  const safeT = Math.max(0, earliest - clearanceT)
  return {
    x: start.x + delta.x * safeT,
    y: start.y + delta.y * safeT
  }
}

export function moveCharacterContinuous(
  gameState,
  playerId,
  input,
  deltaSeconds,
  speedOverride
) {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
    throw new TypeError('deltaSeconds must be a non-negative finite number')
  }
  const nextState = clone(gameState)
  const player = nextState.players.find((item) => item.id === playerId)
  if (!player) throw new RangeError(`Unknown player: ${playerId}`)
  if (nextState.phase === 'ended') return nextState
  if (nextState.phase === 'hiding' && player.role === 'cat') return nextState

  const direction = normalizeInput(input)
  const speed = speedOverride ?? nextState.config.playerSpeed ?? 42
  const requestedEnd = {
    x: player.position.x + direction.x * speed * deltaSeconds,
    y: player.position.y + direction.y * speed * deltaSeconds
  }
  player.position = sweepPosition(player.position, requestedEnd, nextState.config)
  return syncLegacyFields(nextState)
}

export function updateAiContinuous(gameState, deltaSeconds) {
  let nextState = clone(gameState)
  if (nextState.phase === 'ended') return nextState

  const aiIds = nextState.players
    .filter((player) => player.controller === 'ai')
    .map((player) => player.id)

  for (const id of aiIds) {
    const player = nextState.players.find((item) => item.id === id)
    if (!player) continue
    const input = getAiInput(nextState, player)
    if (!input) continue
    const speed = player.role === 'mouse'
      ? (nextState.config.mouseSpeed ?? 28)
      : (nextState.config.aiCatSpeed ?? 34)
    moveWithFallback(nextState, id, input, deltaSeconds, speed)
  }

  return syncLegacyFields(nextState)
}

export function advanceSimulation(
  gameState,
  humanInput,
  deltaSeconds,
  options = {}
) {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
    throw new TypeError('deltaSeconds must be a non-negative finite number')
  }
  if (gameState.phase === 'ended' || deltaSeconds === 0) return clone(gameState)

  let nextState = gameState
  const human = nextState.players.find((player) => player.controller === 'human')
  if (human) {
    nextState = moveCharacterContinuous(
      nextState,
      human.id,
      humanInput,
      deltaSeconds
    )
  }
  const aiUpdater = options.aiUpdater ?? updateAiContinuous
  nextState = aiUpdater(nextState, deltaSeconds)
  nextState = tickGame(nextState, deltaSeconds)
  if (nextState.phase === 'chasing') {
    const captureUpdater = options.captureUpdater ?? ((current) => checkCaptures(current).state)
    nextState = captureUpdater(nextState, deltaSeconds)
  }
  return syncLegacyFields(nextState)
}

function getAiInput(gameState, player) {
  if (gameState.phase === 'hiding') {
    if (player.role !== 'mouse') return null
    const human = gameState.players.find((item) => item.controller === 'human')
    if (!human) return null
    return directionBetween(human.position, player.position)
  }
  if (gameState.phase !== 'chasing') return null

  const targetRole = player.role === 'cat' ? 'mouse' : 'cat'
  const target = gameState.players
    .filter((item) => item.role === targetRole)
    .map((item) => ({
      item,
      distance: calcDistance(player.position, item.position)
    }))
    .sort((left, right) => left.distance - right.distance)[0]?.item
  if (!target) return null
  return player.role === 'mouse'
    ? directionBetween(target.position, player.position)
    : directionBetween(player.position, target.position)
}

function moveWithFallback(gameState, playerId, preferred, deltaSeconds, speed) {
  const player = gameState.players.find((item) => item.id === playerId)
  const before = { ...player.position }
  const candidates = [
    preferred,
    { x: preferred.x, y: 0 },
    { x: 0, y: preferred.y },
    { x: -preferred.y, y: preferred.x },
    { x: preferred.y, y: -preferred.x }
  ]
  for (const candidate of candidates) {
    const direction = normalizeInput(candidate)
    const requestedEnd = {
      x: before.x + direction.x * speed * deltaSeconds,
      y: before.y + direction.y * speed * deltaSeconds
    }
    const after = sweepPosition(before, requestedEnd, gameState.config)
    if (calcDistance(before, after) > 0.001) {
      player.position = after
      return
    }
  }
}

function directionBetween(from, to) {
  return normalizeInput({ x: to.x - from.x, y: to.y - from.y })
}

function segmentRectangleEntry(start, end, rect) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  let near = 0
  let far = 1
  const slabs = [
    [start.x, dx, rect.x, rect.x + rect.width],
    [start.y, dy, rect.y, rect.y + rect.height]
  ]

  for (const [origin, direction, minimum, maximum] of slabs) {
    if (Math.abs(direction) < 1e-9) {
      if (origin < minimum || origin > maximum) return null
      continue
    }
    const first = (minimum - origin) / direction
    const second = (maximum - origin) / direction
    const slabNear = Math.min(first, second)
    const slabFar = Math.max(first, second)
    near = Math.max(near, slabNear)
    far = Math.min(far, slabFar)
    if (near > far) return null
  }
  return far >= 0 && near <= 1 ? Math.max(0, near) : null
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value))
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}
