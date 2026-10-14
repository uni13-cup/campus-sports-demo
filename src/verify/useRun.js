// 快跑 · 跑步会话（把采样、分析、判定、有效里程串成一次完整的跑步）
// 负责人：李浩阳
//
// 数据流：
//   手机加速度传感器 --50Hz--> 100 点滑动窗口 --自相关--> 步频
//   --> 由步频估速度 --> 波形规律性 + 强度 + 速度 交叉判定
//   --> 判定通过才累计里程（所以"不动就不会涨里程"）

import { ref, onUnmounted } from 'vue'
import { HZ, WIN, DT, analyze, classify, speedFromCadence } from './analyzer'
import {
  attachMotion,
  requestMotionPermission,
  isIOS,
  isSafari,
  isSecure
} from './sensor'

// 演示用数据源。只有读不到真实传感器时才用它，页面上会明确标注「模拟」
const SCENARIOS = [
  { key: 'run', label: '跑步（约170步/分）', cad: 170, amp: 3.0, noise: 0.6 },
  { key: 'walk', label: '走路（约110步/分）', cad: 110, amp: 1.8, noise: 0.8 },
  { key: 'still', label: '静止不动', cad: 0, amp: 0, noise: 0.3 },
  { key: 'shake', label: '摇手机', cad: 0, amp: 12, noise: 12 },
  { key: 'ride', label: '骑车（颠簸但无规律）', cad: 0, amp: 1.2, noise: 1.2 }
]

export function useRun() {
  const running = ref(false)
  const cadence = ref(0)
  const speed = ref(0) // km/h
  const okKm = ref(0) // 只有判定通过才累计
  const okSec = ref(0)
  const tickCount = ref(0)
  const wave = ref([]) // 给波形图用的数组快照
  const verdict = ref({ ok: false, txt: '未开始', cls: '' })
  const reason = ref('') // 无效原因统计里的最后一条

  // 计数器：现场讲解时很好用，能看出"核验拦住了什么"
  const stats = ref({ pass: 0, still: 0, shake: 0, vehicle: 0, unknown: 0 })

  const useSim = ref(false) // 是否使用演示数据
  const scenario = ref('run')
  const sensorState = ref('idle') // idle | requesting | on | denied | unavailable | nodata

  let timer = null
  let detach = null
  let buf = []
  let phaseT = 0
  let latest = null // 传感器最新值
  let hasData = false
  let ticksSinceWave = 0

  function reset() {
    buf = []
    phaseT = 0
    latest = null
    hasData = false
    ticksSinceWave = 0
    cadence.value = 0
    speed.value = 0
    okKm.value = 0
    okSec.value = 0
    tickCount.value = 0
    wave.value = []
    verdict.value = { ok: false, txt: '采样中…', cls: '' }
    stats.value = { pass: 0, still: 0, shake: 0, vehicle: 0, unknown: 0 }
  }

  function simSample() {
    const s = SCENARIOS.find((x) => x.key === scenario.value) || SCENARIOS[0]
    if (s.cad === 0 && s.amp === 0) return (Math.random() - 0.5) * s.noise
    if (s.cad === 0) return (Math.random() - 0.5) * s.amp
    return s.amp * Math.sin(2 * Math.PI * (s.cad / 60) * phaseT) + (Math.random() - 0.5) * s.noise
  }

  function tick() {
    const usingSensor = !useSim.value
    let a
    if (usingSensor) {
      if (!hasData) {
        // 还没读到任何传感器数据：只更新提示，不计入
        verdict.value = {
          ok: false,
          txt: sensorState.value === 'denied' ? '未授权传感器' : '等待传感器数据…',
          cls: ''
        }
        return
      }
      a = latest
    } else {
      a = simSample()
    }
    phaseT += DT

    buf.push(a)
    if (buf.length > WIN) buf.shift()

    const f = analyze(buf)
    let sp = 0
    if (usingSensor) {
      // 关键：只有达到"确定在动"的门槛才给速度，否则静止时速度会乱跳
      const moving = f && f.cad >= 70 && f.p >= 0.5
      sp = moving ? speedFromCadence(f.cad) : 0
    } else {
      const moving = f && f.cad >= 70 && f.p >= 0.5
      sp = moving ? speedFromCadence(f.cad) : 0
    }

    const v = classify(f, sp)
    verdict.value = v
    speed.value = sp
    cadence.value = f && f.p >= 0.5 ? Math.round(f.cad) : 0
    reason.value = v.txt

    if (v.ok) {
      okKm.value += (sp / 3600) * DT
      okSec.value += DT
      stats.value.pass++
    } else {
      if (v.txt.indexOf('静止') >= 0) stats.value.still++
      else if (v.txt.indexOf('摇手机') >= 0) stats.value.shake++
      else if (v.txt.indexOf('乘车') >= 0) stats.value.vehicle++
      else stats.value.unknown++
    }

    tickCount.value++
    ticksSinceWave++
    if (ticksSinceWave >= 3) {
      ticksSinceWave = 0
      wave.value = buf.slice()
    }
  }

  async function start() {
    if (running.value) return
    reset()
    if (!useSim.value) {
      sensorState.value = 'requesting'
      const granted = await requestMotionPermission()
      if (!granted) {
        sensorState.value = 'denied'
        verdict.value = { ok: false, txt: '未授权传感器', cls: '' }
        return
      }
      detach = attachMotion((v) => {
        latest = v
        hasData = true
        if (sensorState.value === 'requesting') sensorState.value = 'on'
      })
      // 3 秒内没读到数据 → 提示本机可能没有运动传感器
      setTimeout(() => {
        if (running.value && !useSim.value && !hasData) sensorState.value = 'nodata'
      }, 3000)
    }
    running.value = true
    timer = setInterval(tick, 1000 * DT)
  }

  function stop() {
    running.value = false
    if (timer) {
      clearInterval(timer)
      timer = null
    }
    if (detach) {
      detach()
      detach = null
    }
    verdict.value = { ok: false, txt: '已结束', cls: '' }
  }

  function toggleSim(on) {
    const was = running.value
    if (was) stop()
    useSim.value = on
    if (was) start()
  }

  onUnmounted(() => {
    stop()
  })

  return {
    running,
    cadence,
    speed,
    okKm,
    okSec,
    tickCount,
    wave,
    verdict,
    reason,
    stats,
    useSim,
    scenario,
    sensorState,
    scenarios: SCENARIOS,
    start,
    stop,
    toggleSim,
    isIOS,
    isSafari,
    isSecure
  }
}