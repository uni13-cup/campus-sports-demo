/**
 * 校园猫鼠大作战 · 游戏引擎
 *
 * 负责人：张慧雯（游戏核心逻辑）
 * 说明：本文件提供可独立测试的二维虚拟坐标逻辑，并暂时兼容现有页面调用。
 *      其他人请勿修改本文件的判定逻辑。
 *
 * 临时实现使用模拟二维坐标，不依赖 DOM，可独立测试。
 * 所有返回的状态对象均可被前端直接使用。
 */

import { GAME_CONFIG } from './config.js'

/**
 * 游戏状态结构
 * @typedef {Object} GameState
 * @property {'hiding'|'chasing'|'ended'} phase
 * @property {Array<Object>} players
 * @property {number} hidingTimeLeft
 * @property {number} chasingTimeLeft
 * @property {string|null} winner  - 'cat' | 'mouse' | null
 */

/** 当前游戏状态（模块级单例，简单演示用） */
let state = null
let timerId = null

/**
 * 初始化一局游戏
 * @param {Object} [opts] - 覆盖默认配置
 * @returns {GameState}
 */
export function initGame(opts = {}) {
  clearTimer()
  const cfg = { ...GAME_CONFIG, ...opts }
  const initialHumanRole = cfg.humanRole === 'mouse' ? 'mouse' : 'cat'
  state = {
    phase: 'hiding',
    initialHumanRole,
    players: createPlayers({ ...cfg, humanRole: initialHumanRole }),
    hidingTimeLeft: cfg.hidingDuration,
    chasingTimeLeft: cfg.chasingDuration,
    winner: null,
    endReason: null,
    captureContactMouseIds: [],
    captureContactKeys: [],
    config: {
      mapWidth: cfg.mapWidth,
      mapHeight: cfg.mapHeight,
      geoBounds: { ...cfg.geoBounds },
      coordinateSystem: cfg.coordinateSystem,
      boundaryPadding: cfg.boundaryPadding,
      catchThreshold: cfg.catchThreshold,
      moveStep: cfg.moveStep,
      simulationStep: cfg.simulationStep,
      playerSpeed: cfg.playerSpeed,
      mouseSpeed: cfg.mouseSpeed,
      aiCatSpeed: cfg.aiCatSpeed,
      aiSeed: cfg.aiSeed,
      movementPresentation: { ...cfg.movementPresentation },
      obstacles: cfg.obstacles.map((obstacle) => ({ ...obstacle }))
    }
  }
  addLegacyFields(state)
  return getState()
}

/**
 * 移动角色（临时实现：随机走一步，并夹在地图范围内）
 * 新接口：moveCharacter(state, playerId, delta) 返回新状态，不修改传入状态。
 * 兼容接口：moveCharacter('cat'|'mouse', delta) 更新模块内状态。
 * @param {GameState|'cat'|'mouse'} stateOrWho
 * @param {string|{dx:number,dy:number}} playerIdOrDelta
 * @param {{dx:number,dy:number}} delta
 * @returns {GameState}
 */
export function moveCharacter(stateOrWho, playerIdOrDelta, delta) {
  if (isGameState(stateOrWho)) {
    const movedState = movePlayerInState(stateOrWho, playerIdOrDelta, delta)
    return checkCaptures(movedState).state
  }

  if (!state || state.phase === 'ended') return getState()
  const playerId = resolveLegacyPlayerId(stateOrWho)
  state = movePlayerInState(state, playerId, playerIdOrDelta)
  state = checkCaptures(state).state
  if (state.phase === 'ended') clearTimer()
  return getState()
}

/**
 * 倒计时推进一秒
 * @returns {GameState}
 */
export function tick() {
  if (!state || state.phase === 'ended') return getState()
  state = tickGame(state, 1)
  if (state.phase === 'ended') clearTimer()
  return getState()
}

/**
 * 推进游戏计时；可一次推进多秒，并正确跨越躲藏与追捕阶段。
 * @param {GameState} gameState
 * @param {number} [deltaSeconds]
 * @returns {GameState}
 */
export function tickGame(gameState, deltaSeconds = 1) {
  if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
    throw new TypeError('deltaSeconds must be a non-negative finite number')
  }

  const nextState = clone(gameState)
  if (nextState.phase === 'ended' || deltaSeconds === 0) return nextState

  let remaining = deltaSeconds
  if (nextState.phase === 'hiding') {
    const hidingElapsed = Math.min(nextState.hidingTimeLeft, remaining)
    nextState.hidingTimeLeft -= hidingElapsed
    remaining -= hidingElapsed
    if (nextState.hidingTimeLeft === 0) nextState.phase = 'chasing'
  }

  if (nextState.phase === 'chasing' && remaining > 0) {
    nextState.chasingTimeLeft = Math.max(
      0,
      nextState.chasingTimeLeft - remaining
    )
    if (nextState.chasingTimeLeft === 0) {
      nextState.phase = 'ended'
      nextState.winner = 'mouse'
      nextState.endReason = 'timeout'
    }
  }

  addLegacyFields(nextState)
  return nextState
}

/**
 * 计算两点间直线距离
 * @param {{x:number,y:number}} a
 * @param {{x:number,y:number}} b
 * @returns {number}
 */
export function calcDistance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/**
 * 判断虚拟坐标是否位于地图内且不在建筑障碍物中。
 * @param {{x:number,y:number}} position
 * @param {Object} [config]
 * @returns {boolean}
 */
export function isWalkablePosition(position, config = GAME_CONFIG) {
  if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    return false
  }
  const boundaryPadding = config.boundaryPadding ?? 0
  if (
    position.x < boundaryPadding ||
    position.x > config.mapWidth - boundaryPadding ||
    position.y < boundaryPadding ||
    position.y > config.mapHeight - boundaryPadding
  ) {
    return false
  }

  return !(config.obstacles ?? []).some((obstacle) =>
    position.x >= obstacle.x &&
    position.x <= obstacle.x + obstacle.width &&
    position.y >= obstacle.y &&
    position.y <= obstacle.y + obstacle.height
  )
}

/**
 * 检查玩家猫与存活鼠之间的实时距离，并将最近且新进入范围的鼠转为电脑猫。
 * 同一次空间接触只转换一只；其他已在范围内的鼠必须离开后重新进入才可被抓，
 * 同时禁止新转化的电脑猫触发自动连锁抓捕。
 * @param {GameState} gameState
 * @returns {{state: GameState, captures: Array<Object>}}
 */
export function checkCaptures(gameState) {
  const nextState = clone(gameState)
  const captures = []
  if (nextState.phase !== 'chasing') return { state: nextState, captures }

  const cats = nextState.players.filter((player) =>
    player.role === 'cat' &&
    (nextState.initialHumanRole === 'mouse' || player.controller === 'human')
  )
  const mice = nextState.players.filter((player) => player.role === 'mouse')

  const candidates = cats
    .flatMap((cat) => mice.map((mouse) => ({
      cat,
      mouse,
      distance: calcDistance(cat.position, mouse.position)
    })))
    .filter(({ distance }) => distance <= nextState.config.catchThreshold)
    .sort((left, right) => left.distance - right.distance)
  const previousContacts = new Set(
    nextState.captureContactKeys ??
    (nextState.captureContactMouseIds ?? []).map((mouseId) => `cat-1|${mouseId}`)
  )
  nextState.captureContactKeys = [...new Set(
    candidates.map(({ cat, mouse }) => `${cat.id}|${mouse.id}`)
  )]
  nextState.captureContactMouseIds = [...new Set(
    candidates.map(({ mouse }) => mouse.id)
  )]
  const catcher = candidates.find(({ cat, mouse }) =>
    !previousContacts.has(`${cat.id}|${mouse.id}`)
  )

  if (catcher) {
    const mutableMouse = nextState.players.find((player) => player.id === catcher.mouse.id)
    const mutableCat = nextState.players.find(
      (player) => player.id === catcher.cat.id
    )
    mutableMouse.role = 'cat'
    mutableMouse.capturedAt = nextState.chasingTimeLeft
    mutableMouse.captures = 0
    mutableCat.captures = (mutableCat.captures ?? 0) + 1
    captures.push({
      catId: mutableCat.id,
      mouseId: mutableMouse.id,
      distance: catcher.distance
    })
  }

  if (!nextState.players.some((player) => player.role === 'mouse')) {
    nextState.phase = 'ended'
    nextState.winner = 'cat'
    nextState.endReason = 'all-mice-caught'
  }
  addLegacyFields(nextState)
  return { state: nextState, captures }
}

/**
 * 推进一帧电脑角色移动。
 * 躲藏阶段电脑鼠随机分散；追捕阶段鼠远离最近的猫，电脑猫追逐最近的鼠。
 * 不传 gameState 时更新模块内状态，供现有页面直接调用。
 * @param {GameState} [gameState]
 * @param {Function} [random]
 * @returns {GameState}
 */
export function updateAi(gameState, random = Math.random) {
  if (typeof random !== 'function') throw new TypeError('random must be a function')

  const updatesModuleState = gameState === undefined
  if (updatesModuleState) gameState = state
  if (!gameState) return null

  let nextState = clone(gameState)
  if (nextState.phase === 'ended') return nextState

  const aiPlayerIds = nextState.players
    .filter((player) => player.controller === 'ai')
    .map((player) => player.id)

  for (const playerId of aiPlayerIds) {
    const player = nextState.players.find((item) => item.id === playerId)
    if (!player) continue

    const delta = getAiDelta(nextState, player, random)
    if (!delta) continue
    moveAiPlayer(nextState, player, delta)
  }

  addLegacyFields(nextState)
  nextState = checkCaptures(nextState).state
  if (updatesModuleState) {
    state = nextState
    if (state.phase === 'ended') clearTimer()
    return getState()
  }
  return nextState
}

/**
 * 判断抓捕条件
 * @returns {boolean}
 */
export function checkCatch() {
  if (!state || state.phase !== 'chasing') return false
  const result = checkCaptures(state)
  state = result.state
  if (state.phase === 'ended') clearTimer()
  return result.captures.length > 0
}

/**
 * 结束游戏
 * @returns {GameState}
 */
export function endGame() {
  if (state && state.phase !== 'ended') {
    state.phase = 'ended'
    state.winner = 'mouse'
    state.endReason = 'manual'
    addLegacyFields(state)
  }
  clearTimer()
  return getState()
}

/**
 * 重置游戏（回到未开始状态）
 * @returns {GameState}
 */
export function resetGame(opts = {}) {
  clearTimer()
  return initGame(opts)
}

/**
 * 获取当前状态快照（只读副本）
 * @returns {GameState|null}
 */
export function getState() {
  if (!state) return null
  return JSON.parse(JSON.stringify(state))
}

/**
 * 为新模拟器同步旧页面仍会读取的兼容字段。
 * 新代码应继续以 players 为唯一角色数据源。
 * @param {GameState} gameState
 * @returns {GameState}
 */
export function syncLegacyFields(gameState) {
  addLegacyFields(gameState)
  return gameState
}

/**
 * 启动倒计时定时器
 * @param {Function} onUpdate - 每次 tick 回调
 * @returns {number} timerId
 */
export function startTimer(onUpdate) {
  clearTimer()
  timerId = setInterval(() => {
    tick()
    if (typeof onUpdate === 'function') onUpdate(getState())
  }, GAME_CONFIG.tickInterval)
  return timerId
}

/** 清除定时器 */
export function clearTimer() {
  if (timerId) {
    clearInterval(timerId)
    timerId = null
  }
}

/* ===== 工具函数 ===== */
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v))
}

function createPlayers(cfg) {
  const catSpawn = cfg.spawnPoints.cat
  const humanIsMouse = cfg.humanRole === 'mouse'
  const players = [
    {
      id: 'cat-1',
      role: 'cat',
      controller: humanIsMouse ? 'ai' : 'human',
      position: { x: catSpawn.x, y: catSpawn.y },
      captures: 0
    }
  ]

  for (let index = 0; index < cfg.mouseCount; index += 1) {
    const spawn = cfg.spawnPoints.mice[index]
    if (!spawn) throw new RangeError(`Missing spawn point for mouse-${index + 1}`)
    players.push({
      id: `mouse-${index + 1}`,
      role: 'mouse',
      controller: humanIsMouse && index === 0 ? 'human' : 'ai',
      position: { x: spawn.x, y: spawn.y },
      capturedAt: null
    })
  }

  return players
}

function movePlayerInState(gameState, playerId, delta) {
  if (!delta || !Number.isFinite(delta.dx) || !Number.isFinite(delta.dy)) {
    throw new TypeError('delta.dx and delta.dy must be finite numbers')
  }

  const nextState = clone(gameState)
  const player = nextState.players.find((item) => item.id === playerId)
  if (!player) throw new RangeError(`Unknown player: ${playerId}`)
  if (nextState.phase === 'ended') return nextState
  if (nextState.phase === 'hiding' && player.role === 'cat') return nextState

  const nextPosition = {
    x: clamp(
      player.position.x + delta.dx,
      nextState.config.boundaryPadding,
      nextState.config.mapWidth - nextState.config.boundaryPadding
    ),
    y: clamp(
      player.position.y + delta.dy,
      nextState.config.boundaryPadding,
      nextState.config.mapHeight - nextState.config.boundaryPadding
    )
  }
  if (isWalkablePosition(nextPosition, nextState.config)) {
    player.position = nextPosition
  }
  addLegacyFields(nextState)
  return nextState
}

function getAiDelta(gameState, player, random) {
  const step = gameState.config.moveStep
  if (gameState.phase === 'hiding') {
    if (player.role !== 'mouse') return null
    const directions = [
      { dx: 1, dy: 0 },
      { dx: 1, dy: 1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: -1, dy: -1 },
      { dx: 0, dy: -1 },
      { dx: 1, dy: -1 }
    ]
    const randomValue = clamp(Number(random()) || 0, 0, 0.999999)
    const direction = directions[Math.floor(randomValue * directions.length)]
    return normalizeDelta(direction.dx, direction.dy, step)
  }

  if (gameState.phase !== 'chasing') return null
  const targetRole = player.role === 'cat' ? 'mouse' : 'cat'
  const target = findNearestPlayer(gameState, player, targetRole)
  if (!target) return null

  const towardX = target.position.x - player.position.x
  const towardY = target.position.y - player.position.y
  const multiplier = player.role === 'mouse' ? -1 : 1
  return normalizeDelta(towardX * multiplier, towardY * multiplier, step)
}

function moveAiPlayer(gameState, player, preferredDelta) {
  const candidates = [
    preferredDelta,
    { dx: preferredDelta.dx, dy: 0 },
    { dx: 0, dy: preferredDelta.dy },
    { dx: -preferredDelta.dy, dy: preferredDelta.dx },
    { dx: preferredDelta.dy, dy: -preferredDelta.dx }
  ]

  for (const delta of candidates) {
    if (delta.dx === 0 && delta.dy === 0) continue
    const position = {
      x: player.position.x + delta.dx,
      y: player.position.y + delta.dy
    }
    if (isWalkablePosition(position, gameState.config)) {
      player.position = position
      return
    }
  }
}

function findNearestPlayer(gameState, source, targetRole) {
  return gameState.players
    .filter((player) => player.role === targetRole)
    .map((player) => ({
      player,
      distance: calcDistance(source.position, player.position)
    }))
    .sort((left, right) => left.distance - right.distance)[0]?.player ?? null
}

function normalizeDelta(dx, dy, step) {
  const distance = Math.hypot(dx, dy)
  if (distance === 0) return null
  return {
    dx: Math.round((dx / distance) * step),
    dy: Math.round((dy / distance) * step)
  }
}

function resolveLegacyPlayerId(who) {
  if (who === 'cat') return 'cat-1'
  if (who === 'mouse') {
    return state.players.find((player) => player.role === 'mouse')?.id
  }
  return who
}

function addLegacyFields(gameState) {
  const cat = gameState.players.find((player) => player.role === 'cat')
  const mouse = gameState.players.find((player) => player.role === 'mouse')

  gameState.cat = cat ? { ...cat.position } : { x: 0, y: 0 }
  gameState.mouse = mouse ? { ...mouse.position } : { ...gameState.cat }
  gameState.distance = mouse
    ? calcDistance(gameState.cat, gameState.mouse)
    : 0
  gameState.timeLeft = gameState.phase === 'hiding'
    ? gameState.hidingTimeLeft
    : gameState.chasingTimeLeft
  gameState.status = gameState.phase === 'ended'
    ? (gameState.winner === 'cat' ? 'caught' : 'timeout')
    : 'running'
}

function isGameState(value) {
  return Boolean(value && typeof value === 'object' && Array.isArray(value.players))
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}
