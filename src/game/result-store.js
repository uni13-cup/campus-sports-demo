export const RESULT_STORAGE_KEY = 'campus-catmouse-result-v2'
export const RESULT_TTL_MS = 2 * 60 * 60 * 1000

export function createResultSnapshot(gameState, now = Date.now()) {
  return {
    version: 3,
    savedAt: now,
    expiresAt: now + RESULT_TTL_MS,
    phase: gameState.phase,
    winner: gameState.winner,
    endReason: gameState.endReason,
    hidingTimeLeft: gameState.hidingTimeLeft,
    chasingTimeLeft: gameState.chasingTimeLeft,
    initialHumanRole: gameState.initialHumanRole ?? 'cat',
    events: (gameState.events ?? [])
      .filter((event) => ['capture-confirmed', 'role-converted', 'game-ended'].includes(event.type))
      .slice(-8)
      .map((event) => ({ ...event })),
    players: gameState.players.map((player) => ({
      id: player.id,
      role: player.role,
      controller: player.controller,
      captures: player.captures ?? 0,
      capturedAt: player.capturedAt ?? null
    }))
  }
}

export function saveGameResult(gameState, storage = getSessionStorage()) {
  if (!storage || gameState.phase !== 'ended') return false
  storage.setItem(RESULT_STORAGE_KEY, JSON.stringify(createResultSnapshot(gameState)))
  return true
}

export function loadGameResult(storage = getSessionStorage(), now = Date.now()) {
  if (!storage) return null
  try {
    const raw = storage.getItem(RESULT_STORAGE_KEY)
    if (!raw) return null
    const result = JSON.parse(raw)
    if (![2, 3].includes(result.version) || result.expiresAt <= now || !Array.isArray(result.players)) {
      storage.removeItem(RESULT_STORAGE_KEY)
      return null
    }
    return {
      ...result,
      initialHumanRole: result.initialHumanRole ?? 'cat'
    }
  } catch {
    storage.removeItem(RESULT_STORAGE_KEY)
    return null
  }
}

export function clearGameResult(storage = getSessionStorage()) {
  storage?.removeItem(RESULT_STORAGE_KEY)
}

function getSessionStorage() {
  return typeof window === 'undefined' ? null : window.sessionStorage
}
