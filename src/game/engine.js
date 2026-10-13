/**
 * 校园猫鼠大作战 · 游戏引擎
 *
 * 负责人：张慧雯（游戏核心逻辑）
 * 说明：本文件为【接口约定 + 临时 mock 实现】，供李金燚开发页面时联调用。
 *      张慧雯确认正式接口后可整体替换实现，但请保持导出函数名与返回结构一致。
 *      其他人请勿修改本文件的判定逻辑。
 *
 * 临时实现使用模拟二维坐标，不依赖 DOM，可独立测试。
 * 所有返回的状态对象均可被前端直接使用。
 */

import { GAME_CONFIG } from './config.js'

/**
 * 游戏状态结构
 * @typedef {Object} GameState
 * @property {string} status       - 'idle' | 'running' | 'caught' | 'timeout'
 * @property {{x:number,y:number}} cat   - 猫的位置
 * @property {{x:number,y:number}} mouse  - 鼠的位置
 * @property {number} distance     - 猫鼠直线距离（米）
 * @property {number} timeLeft     - 剩余时间（秒）
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
  state = {
    status: 'running',
    cat: { x: Math.round(cfg.mapWidth * 0.2), y: Math.round(cfg.mapHeight / 2) },
    mouse: { x: Math.round(cfg.mapWidth * 0.8), y: Math.round(cfg.mapHeight / 2) },
    distance: 0,
    timeLeft: cfg.duration,
    winner: null
  }
  state.distance = calcDistance(state.cat, state.mouse)
  return getState()
}

/**
 * 移动角色（临时实现：随机走一步，并夹在地图范围内）
 * @param {'cat'|'mouse'} who
 * @param {{dx:number,dy:number}} delta
 * @returns {GameState}
 */
export function moveCharacter(who, delta) {
  if (!state || state.status !== 'running') return getState()
  const cfg = GAME_CONFIG
  const target = state[who]
  target.x = clamp(target.x + delta.dx, 0, cfg.mapWidth)
  target.y = clamp(target.y + delta.dy, 0, cfg.mapHeight)
  state.distance = calcDistance(state.cat, state.mouse)
  checkCatch()
  return getState()
}

/**
 * 倒计时推进一秒
 * @returns {GameState}
 */
export function tick() {
  if (!state || state.status !== 'running') return getState()
  state.timeLeft -= 1
  if (state.timeLeft <= 0) {
    state.timeLeft = 0
    state.status = 'timeout'
    state.winner = 'mouse'
    clearTimer()
  }
  return getState()
}

/**
 * 计算两点间直线距离
 * @param {{x:number,y:number}} a
 * @param {{x:number,y:number}} b
 * @returns {number}
 */
export function calcDistance(a, b) {
  return Math.round(Math.hypot(a.x - b.x, a.y - b.y))
}

/**
 * 判断抓捕条件
 * @returns {boolean}
 */
export function checkCatch() {
  if (!state || state.status !== 'running') return false
  if (state.distance <= GAME_CONFIG.catchThreshold) {
    state.status = 'caught'
    state.winner = 'cat'
    clearTimer()
    return true
  }
  return false
}

/**
 * 结束游戏
 * @returns {GameState}
 */
export function endGame() {
  if (state && state.status === 'running') {
    state.status = 'timeout'
    state.winner = 'mouse'
  }
  clearTimer()
  return getState()
}

/**
 * 重置游戏（回到未开始状态）
 * @returns {GameState}
 */
export function resetGame() {
  clearTimer()
  state = null
  return getState()
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
