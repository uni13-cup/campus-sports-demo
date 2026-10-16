// verify 组：运动真实性服务端核验 / 核验记录
// 前端 analyzer 在本地把波形分成 2 秒窗口并给出 behavior 判定，
// 这里对窗口结论做服务端复核：跑步窗口占比与步频达标，才累计有效里程。
import { Router } from 'express'
import db, { nextId } from '../store.js'
import { ok, fail, wrap } from '../util.js'
import { authRequired } from '../middleware/auth.js'

const router = Router()

const BEHAVIOR = {
  run: '跑步',
  walk: '走路',
  idle: '静止',
  shake: '摇手机',
  vehicle: '乘车骑行'
}

// 提交一次运动核验
// body 两种形式：
//   1) 窗口明细 { windows: [{ behavior, cadence, intensity, speed }], distanceKm? }
//   2) 单段结论 { behavior: 'run', cadence: 170, durationSec: 600, distanceKm? }
router.post('/motion', authRequired, wrap((req, res) => {
  const body = req.body || {}
  let behavior = ''
  let cadence = 0
  let durationSec = 0
  let winCount = 0
  let runCount = 0

  if (Array.isArray(body.windows) && body.windows.length) {
    const wins = body.windows
    winCount = wins.length
    runCount = wins.filter((w) => w.behavior === 'run').length
    const runWins = wins.filter((w) => w.behavior === 'run')
    cadence = runWins.length
      ? Math.round(runWins.reduce((s, w) => s + Number(w.cadence || 0), 0) / runWins.length)
      : 0
    durationSec = winCount * 2 // 前端窗口固定 2 秒
    behavior = runCount / winCount >= 0.6 ? 'run' : (wins[wins.length - 1]?.behavior || 'idle')
  } else {
    behavior = String(body.behavior || '')
    cadence = Number(body.cadence || 0)
    durationSec = Number(body.durationSec || 0)
    if (!Object.keys(BEHAVIOR).includes(behavior)) return fail(res, 'behavior 取值应为 run/walk/idle/shake/vehicle')
    if (durationSec <= 0 || durationSec > 7200) return fail(res, 'durationSec 需在 0-7200 秒之间')
  }

  // 复核规则
  let verified = false
  let reason = ''
  if (behavior !== 'run') {
    reason = `判定为「${BEHAVIOR[behavior] || behavior}」，非跑步状态，里程不计入`
  } else if (cadence && (cadence < 140 || cadence > 200)) {
    reason = `平均步频 ${cadence} spm 超出真实跑步区间（140-200），里程不计入`
  } else if (winCount && runCount / winCount < 0.6) {
    reason = `跑步窗口占比不足 60%，里程不计入`
  } else {
    verified = true
    reason = '步频与波动稳定，判定为真实跑步'
  }

  // 有效里程：有前端估算距离则按跑步时间占比折算，否则用步频速度估算（速度≈步频×0.0071，单位 km/h）
  let validKm = 0
  if (verified) {
    if (Number.isFinite(Number(body.distanceKm)) && Number(body.distanceKm) > 0) {
      validKm = winCount ? Number(body.distanceKm) * (runCount / winCount) : Number(body.distanceKm)
    } else {
      const speedKmh = cadence * 0.0071
      validKm = (speedKmh * durationSec) / 3600
    }
    validKm = Number(validKm.toFixed(2))
  }

  const record = {
    id: nextId('v'),
    userId: req.userId,
    behavior,
    cadence,
    durationSec,
    verified,
    validKm,
    reason,
    createdAt: Date.now()
  }
  db.verifyRecords.unshift(record)
  ok(res, record, verified ? '核验通过' : '核验未通过')
}))

// 我的核验记录 + 本周统计
router.get('/records', authRequired, (req, res) => {
  const list = db.verifyRecords
    .filter((r) => r.userId === req.userId)
    .sort((a, b) => b.createdAt - a.createdAt)
  const week = list.filter((r) => Date.now() - r.createdAt < 86400000 * 7)
  ok(res, {
    list,
    summary: {
      uploads: week.length,
      passed: week.filter((r) => r.verified).length,
      blocked: week.filter((r) => !r.verified).length,
      validKm: Number(week.reduce((s, r) => s + r.validKm, 0).toFixed(2))
    }
  })
})

export default router
