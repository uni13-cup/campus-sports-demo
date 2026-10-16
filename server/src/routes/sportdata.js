// sportdata 组：运动总览 / 记录列表 / 上报跑步记录（核验通过才计里程与能量）
import { Router } from 'express'
import db, { nextId, findUser, teamOf, addEnergyTx, ENERGY_PER_KM } from '../store.js'
import { ok, fail, wrap } from '../util.js'
import { authRequired } from '../middleware/auth.js'

const router = Router()

// 我的运动总览（对齐「我的」页统计）
router.get('/overview', authRequired, (req, res) => {
  const u = req.user
  const weekRecords = db.sportRecords.filter((r) => r.userId === u.id && Date.now() - r.createdAt < 86400000 * 7)
  const weekKm = weekRecords.reduce((s, r) => s + (r.verifiedKm || r.distanceKm), 0)
  const team = teamOf(u.id)
  ok(res, {
    totalKm: u.totalKm,
    runCount: u.runCount,
    weekKm: Number(weekKm.toFixed(1)),
    streakDays: u.streakDays,
    myEarned: u.myEarned,
    team: team ? { id: team.id, name: team.name, weekKm: team.weekKm } : null
  })
})

// 跑步记录列表
router.get('/records', authRequired, (req, res) => {
  const list = db.sportRecords
    .filter((r) => r.userId === req.userId)
    .sort((a, b) => b.createdAt - a.createdAt)
  ok(res, list)
})

// 上报跑步记录
// body: { distanceKm, durationSec, source: 'sim'|'sensor', verifiedKm? }
// 规则：只有核验里程（verifiedKm，缺省取 distanceKm）才累计成绩并按 10 点/公里折算能量入队
router.post('/records', authRequired, wrap((req, res) => {
  const { distanceKm, durationSec, source } = req.body || {}
  let verifiedKm = Number(req.body?.verifiedKm)
  const d = Number(distanceKm)
  const t = Number(durationSec)
  if (!Number.isFinite(d) || d <= 0 || d > 100) return fail(res, '距离需在 0-100 公里之间')
  if (!Number.isFinite(t) || t <= 0 || t > 12 * 3600) return fail(res, '用时不合法')
  if (!Number.isFinite(verifiedKm) || verifiedKm < 0) verifiedKm = d

  const paceSec = Math.round(t / d)
  const record = {
    id: nextId('r'),
    userId: req.userId,
    distanceKm: Number(d.toFixed(2)),
    durationSec: Math.round(t),
    paceSec,
    source: source === 'sensor' ? 'sensor' : 'sim',
    verifiedKm: Number(Math.min(verifiedKm, d).toFixed(2)),
    createdAt: Date.now()
  }
  db.sportRecords.unshift(record)

  const u = findUser(req.userId)
  u.totalKm = Number((u.totalKm + record.verifiedKm).toFixed(2))
  u.runCount += 1

  // 能量进入队伍公共池（无队伍则只累计个人贡献，不入池）
  const gained = Math.round(record.verifiedKm * ENERGY_PER_KM)
  const team = teamOf(u.id)
  let energyTx = null
  if (gained > 0) {
    u.myEarned += gained
    if (team) team.energyPool += gained
    energyTx = addEnergyTx({
      userId: u.id,
      teamId: team ? team.id : null,
      type: 'earn',
      amount: gained,
      title: `合格跑步 ${record.verifiedKm} 公里`,
      detail: record.source === 'sensor' ? '真实传感器核验通过' : '模拟训练'
    })
  }

  ok(res, { record, energyGained: gained, teamPool: team ? team.energyPool : null, transaction: energyTx }, '记录已保存')
}))

export default router
