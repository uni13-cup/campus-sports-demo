export const GAME_SESSION_KEY = 'campus-catmouse-session-v3'
export const GAME_SESSION_TTL_MS = 2 * 60 * 60 * 1000

export function createGameSession(humanRole = 'cat', now = Date.now()) {
  return {
    version: 3,
    roomId: 'DEMO-ZD-01',
    campusName: '河南财经政法大学郑东校区',
    humanRole: normalizeRole(humanRole),
    participantCount: 6,
    positioningMode: 'simulated',
    createdAt: now,
    expiresAt: now + GAME_SESSION_TTL_MS
  }
}

export function saveGameSession(humanRole, storage = getSessionStorage(), now = Date.now()) {
  const session = createGameSession(humanRole, now)
  storage?.setItem(GAME_SESSION_KEY, JSON.stringify(session))
  return session
}

export function loadGameSession(storage = getSessionStorage(), now = Date.now()) {
  if (!storage) return createGameSession()
  try {
    const session = JSON.parse(storage.getItem(GAME_SESSION_KEY))
    if (
      session?.version !== 3 ||
      session.expiresAt <= now ||
      !['cat', 'mouse'].includes(session.humanRole)
    ) {
      storage.removeItem(GAME_SESSION_KEY)
      return createGameSession()
    }
    return { ...session, humanRole: normalizeRole(session.humanRole) }
  } catch {
    storage.removeItem(GAME_SESSION_KEY)
    return createGameSession()
  }
}

function normalizeRole(role) {
  return role === 'mouse' ? 'mouse' : 'cat'
}

function getSessionStorage() {
  return typeof window === 'undefined' ? null : window.sessionStorage
}
