// 快跑 · 传感器接入（只读加速度，不读定位、不上传）
// 负责人：李浩阳

export function isIOS() {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function isSafari() {
  const ua = navigator.userAgent
  return /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
}

/** 是否处于安全上下文：https 或 localhost 才算，http 局域网 IP 不算 */
export function isSecure() {
  return window.isSecureContext === true
}

/**
 * iPhone 必须显式申请权限，而且只有 Safari + https 才给。
 * 安卓浏览器一般不需申请，直接监听即可。
 */
export async function requestMotionPermission() {
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    try {
      const res = await DeviceMotionEvent.requestPermission()
      return res === 'granted'
    } catch (e) {
      return false
    }
  }
  return true
}

/**
 * 从事件里取出一个「标量加速度」（已经扣掉重力）。
 * 优先用 accelerationIncludingGravity，因为它在大手机上更稳。
 */
export function readAccel(e) {
  const g = e.accelerationIncludingGravity
  if (g && g.x !== null && g.x !== undefined) {
    const m = Math.sqrt(g.x * g.x + g.y * g.y + g.z * g.z)
    if (m > 4 && m < 20) return m - 9.81
    return null
  }
  const b = e.acceleration
  if (b && b.x !== null && b.x !== undefined) {
    const m = Math.sqrt(b.x * b.x + b.y * b.y + b.z * b.z)
    if (m < 12) return m
  }
  return null
}

/** 开始监听，返回一个「停止监听」的函数 */
export function attachMotion(onSample) {
  const handler = (e) => {
    const v = readAccel(e)
    if (v !== null) onSample(v)
  }
  window.addEventListener('devicemotion', handler)
  return () => window.removeEventListener('devicemotion', handler)
}