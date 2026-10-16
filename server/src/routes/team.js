// team 组：跑团榜 / 推荐 / 详情 / 创建 / 加入 / 退出
import { Router } from 'express'
import db, { nextId } from '../store.js'
import { ok, fail, wrap } from '../util.js'
import { authRequired, authOptional } from '../middleware/auth.js'

const router = Router()

// 跑团周里程排行榜
router.get('/rankings', authOptional, (req, res) => {
  const list = [...db.teams]
    .sort((a, b) => b.weekKm - a.weekKm)
    .map((t, i) => ({
      rank: i + 1,
      id: t.id,
      name: t.name,
      college: t.college,
      weekKm: t.weekKm,
      members: t.members,
      energyPool: t.energyPool,
      joined: req.userId ? db.users.find((u) => u.id === req.userId)?.teamId === t.id : false
    }))
  const me = req.userId ? db.users.find((u) => u.id === req.userId) : null
  ok(res, { list, myTeamId: me?.teamId || null })
})

// 推荐加入的跑团（人数未满、按周里程降序）
router.get('/recommend', (req, res) => {
  const list = [...db.teams].sort((a, b) => b.weekKm - a.weekKm).slice(0, 3)
    .map((t) => ({ id: t.id, name: t.name, college: t.college, members: t.members, weekKm: t.weekKm }))
  ok(res, list)
})

// 跑团详情
router.get('/:id', (req, res) => {
  const t = db.teams.find((x) => x.id === req.params.id)
  if (!t) return fail(res, '跑团不存在', 404, 404)
  const members = db.users.filter((u) => u.teamId === t.id)
    .sort((a, b) => b.totalKm - a.totalKm)
    .map((u) => ({ id: u.id, nickname: u.nickname, avatar: u.avatar, totalKm: u.totalKm }))
  ok(res, { ...t, memberList: members })
})

// 创建跑团并自动加入
router.post('/create', authRequired, wrap((req, res) => {
  const { name, college } = req.body || {}
  if (!name) return fail(res, '跑团名称不能为空')
  if (db.teams.some((t) => t.name === name)) return fail(res, '跑团名称已存在', 409, 409)
  if (req.user.teamId) return fail(res, '你已加入跑团，请先退出当前跑团', 409, 409)

  const t = {
    id: nextId('t'),
    name: String(name).slice(0, 16),
    college: college ? String(college).slice(0, 20) : req.user.college || '',
    weekKm: 0,
    members: 1,
    energyPool: 0,
    weekGoal: 4000,
    createdAt: Date.now()
  }
  db.teams.push(t)
  req.user.teamId = t.id
  t.members = 1
  ok(res, t, '跑团创建成功')
}))

// 加入跑团
router.post('/:id/join', authRequired, wrap((req, res) => {
  const t = db.teams.find((x) => x.id === req.params.id)
  if (!t) return fail(res, '跑团不存在', 404, 404)
  if (req.user.teamId === t.id) return fail(res, '你已在该跑团中', 409, 409)
  if (req.user.teamId) return fail(res, '你已加入其他跑团，请先退出', 409, 409)
  req.user.teamId = t.id
  t.members += 1
  ok(res, { id: t.id, name: t.name, members: t.members }, '加入成功')
}))

// 退出跑团
router.post('/leave', authRequired, wrap((req, res) => {
  const t = db.teams.find((x) => x.id === req.user.teamId)
  if (!t) return fail(res, '你当前没有加入跑团', 404, 404)
  req.user.teamId = null
  t.members = Math.max(0, t.members - 1)
  ok(res, null, '已退出跑团')
}))

export default router
