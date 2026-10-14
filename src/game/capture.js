import { calcDistance, syncLegacyFields } from './engine.js'

const EVENT_LIMIT = 40
const CONFIRM_GRACE_SECONDS = 1.2

export function detectCaptureCandidates(gameState) {
  if (gameState.phase !== 'chasing') return []
  const cats = gameState.players.filter((player) => player.role === 'cat')
  const mice = gameState.players.filter((player) => player.role === 'mouse')
  const candidates = []
  for (const cat of cats) {
    for (const mouse of mice) {
      const distance = calcDistance(cat.position, mouse.position)
      if (distance <= gameState.config.catchThreshold) {
        candidates.push({ catId: cat.id, mouseId: mouse.id, distance })
      }
    }
  }
  return candidates.sort((left, right) => left.distance - right.distance)
}

export function updateCaptureFlow(gameState, deltaSeconds = 0) {
  let nextState = clone(gameState)
  if (nextState.phase !== 'chasing') {
    nextState.captureCandidate = null
    return nextState
  }

  const aiCandidates = detectCaptureCandidates(nextState)
    .filter((candidate) =>
      nextState.players.find((player) => player.id === candidate.catId)?.controller === 'ai'
    )
  const capturedMouseIds = new Set()
  for (const candidate of aiCandidates) {
    if (capturedMouseIds.has(candidate.mouseId)) continue
    nextState = confirmCapture(nextState, candidate.mouseId, candidate.catId)
    capturedMouseIds.add(candidate.mouseId)
    if (nextState.phase === 'ended') return nextState
  }

  const humanCandidate = detectCaptureCandidates(nextState).find((candidate) =>
    nextState.players.find((player) => player.id === candidate.catId)?.controller === 'human'
  )
  const previous = nextState.captureCandidate
  if (humanCandidate) {
    nextState.captureCandidate = {
      ...humanCandidate,
      expiresIn: CONFIRM_GRACE_SECONDS
    }
    if (!previous || previous.mouseId !== humanCandidate.mouseId) {
      appendEvent(nextState, 'capture-candidate', humanCandidate)
    }
  } else if (previous) {
    const expiresIn = previous.expiresIn - deltaSeconds
    nextState.captureCandidate = expiresIn > 0
      ? { ...previous, expiresIn }
      : null
    if (!nextState.captureCandidate) appendEvent(nextState, 'capture-candidate-cleared', previous)
  }
  return syncLegacyFields(nextState)
}

export function confirmCapture(gameState, mouseId, catId = null) {
  const nextState = clone(gameState)
  if (nextState.phase !== 'chasing') return nextState
  const candidate = nextState.captureCandidate
  const resolvedCatId = catId ?? candidate?.catId
  const cat = nextState.players.find((player) => player.id === resolvedCatId)
  const mouse = nextState.players.find((player) => player.id === mouseId)
  if (!cat || cat.role !== 'cat' || !mouse || mouse.role !== 'mouse') return nextState

  const distance = calcDistance(cat.position, mouse.position)
  const allowedDistance = candidate?.mouseId === mouseId
    ? nextState.config.catchThreshold * 1.35
    : nextState.config.catchThreshold
  if (distance > allowedDistance) return nextState

  mouse.role = 'cat'
  mouse.controller = 'ai'
  mouse.capturedAt = nextState.chasingTimeLeft
  mouse.captures = 0
  cat.captures = (cat.captures ?? 0) + 1
  nextState.captureCandidate = null
  appendEvent(nextState, 'capture-confirmed', {
    catId: cat.id,
    mouseId: mouse.id,
    distance
  })
  appendEvent(nextState, 'role-converted', {
    playerId: mouse.id,
    role: 'cat'
  })

  if (!nextState.players.some((player) => player.role === 'mouse')) {
    nextState.phase = 'ended'
    nextState.winner = 'cat'
    nextState.endReason = 'all-mice-caught'
    appendEvent(nextState, 'game-ended', { winner: 'cat' })
  }
  return syncLegacyFields(nextState)
}

export function appendEvent(gameState, type, payload = {}) {
  gameState.eventSequence = (gameState.eventSequence ?? 0) + 1
  gameState.events ??= []
  gameState.events.push({
    id: gameState.eventSequence,
    type,
    at: gameState.chasingTimeLeft,
    ...payload
  })
  if (gameState.events.length > EVENT_LIMIT) {
    gameState.events.splice(0, gameState.events.length - EVENT_LIMIT)
  }
  return gameState
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}
