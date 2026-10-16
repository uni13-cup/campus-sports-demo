// points 组：权益商品 / 能量余额与流水 / 兑换 / 我的券包 / 核销
import { Router } from 'express'
import db, { nextId, teamOf, addEnergyTx } from '../store.js'
import { ok, fail, wrap } from '../util.js'
import { authRequired } from '../middleware/auth.js'

const router = Router()

function makeCode() {
  const n = () => Math.floor(1000 + Math.random() * 9000)
  return `${n()}-${n()}`
}

// 可兑换权益列表
router.get('/rewards', (req, res) => {
  ok(res, db.rewards)
})

// 能量余额（队伍公共池 + 个人本周贡献 + 目标）
router.get('/points/balance', authRequired, (req, res) => {
  const team = teamOf(req.userId)
  ok(res, {
    pool: team ? team.energyPool : 0,
    myEarned: req.user.myEarned,
    weekGoal: team ? team.weekGoal : 200,
    team: team ? { id: team.id, name: team.name } : null
  })
})

// 能量流水
router.get('/points/transactions', authRequired, (req, res) => {
  const list = db.transactions
    .filter((x) => x.userId === req.userId)
    .sort((a, b) => b.createdAt - a.createdAt)
  ok(res, list)
})

// 兑换权益：能量从队伍公共池扣除，生成券放入我的券包
router.post('/points/exchange', authRequired, wrap((req, res) => {
  const { rewardId } = req.body || {}
  const good = db.rewards.find((g) => g.id === rewardId)
  if (!good) return fail(res, '权益不存在', 404, 404)
  const team = teamOf(req.userId)
  if (!team) return fail(res, '请先加入跑团再使用队伍能量池', 403, 403)
  if (team.energyPool < good.cost) return fail(res, '队伍能量不足，先去跑步攒能量', 409, 409)
  if (good.stock <= 0) return fail(res, '该权益今日已兑完', 409, 409)

  team.energyPool -= good.cost
  good.stock -= 1
  const coupon = {
    id: nextId('c'),
    code: makeCode(),
    userId: req.userId,
    rewardId: good.id,
    name: good.name,
    icon: good.icon,
    used: false,
    createdAt: Date.now(),
    usedAt: null
  }
  db.coupons.unshift(coupon)
  addEnergyTx({
    userId: req.userId,
    teamId: team.id,
    type: 'cost',
    amount: -good.cost,
    title: `兑换 · ${good.name}`,
    detail: `券码 ${coupon.code} 已入券包`
  })
  ok(res, { coupon, pool: team.energyPool }, '兑换成功，已放入券包')
}))

// 我的券包
router.get('/coupons', authRequired, (req, res) => {
  const list = db.coupons
    .filter((c) => c.userId === req.userId)
    .sort((a, b) => b.createdAt - a.createdAt)
  ok(res, list)
})

// 到店核销
router.post('/coupons/:id/redeem', authRequired, wrap((req, res) => {
  const c = db.coupons.find((x) => x.id === req.params.id && x.userId === req.userId)
  if (!c) return fail(res, '券不存在', 404, 404)
  if (c.used) return fail(res, '该券已核销', 409, 409)
  c.used = true
  c.usedAt = Date.now()
  ok(res, c, '核销成功')
}))

export default router
