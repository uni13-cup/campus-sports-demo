// activity 组：活动列表 / 详情 / 报名 / 取消报名 / 发布活动
import { Router } from 'express'
import db, { nextId } from '../store.js'
import { ok, fail, wrap } from '../util.js'
import { authRequired, authOptional } from '../middleware/auth.js'

const router = Router()
router.use(authOptional) // 列表与详情需识别「当前用户是否已报名」，未登录也可访问

// 列表：?tag=本周|挑战|组队|筹备
router.get('/list', (req, res) => {
  const tag = String(req.query.tag || '')
  const list = tag && tag !== '全部' ? db.activities.filter((a) => a.tag === tag) : db.activities
  ok(res, list.map(withJoinedFlag(req.userId)))
})

// 详情
router.get('/:id', (req, res) => {
  const a = db.activities.find((x) => x.id === req.params.id)
  if (!a) return fail(res, '活动不存在', 404, 404)
  ok(res, withJoinedFlag(req.userId)(a))
})

// 报名
router.post('/:id/join', authRequired, wrap((req, res) => {
  const a = db.activities.find((x) => x.id === req.params.id)
  if (!a) return fail(res, '活动不存在', 404, 404)
  if (a.status === 'preparing') return fail(res, '活动筹备中，暂未开放报名')
  if (db.signups.some((s) => s.userId === req.userId && s.activityId === a.id)) {
    return fail(res, '你已经报名该活动', 409, 409)
  }
  if (a.capacity && a.joinedCount >= a.capacity) return fail(res, '名额已满')
  db.signups.push({ userId: req.userId, activityId: a.id, createdAt: Date.now() })
  a.joinedCount += 1
  ok(res, { id: a.id, joined: true, joinedCount: a.joinedCount }, '报名成功')
}))

// 取消报名
router.post('/:id/leave', authRequired, wrap((req, res) => {
  const a = db.activities.find((x) => x.id === req.params.id)
  if (!a) return fail(res, '活动不存在', 404, 404)
  const i = db.signups.findIndex((s) => s.userId === req.userId && s.activityId === a.id)
  if (i < 0) return fail(res, '未报名该活动', 404, 404)
  db.signups.splice(i, 1)
  a.joinedCount = Math.max(0, a.joinedCount - 1)
  ok(res, { id: a.id, joined: false, joinedCount: a.joinedCount }, '已取消报名')
}))

// 发布活动（登录即可，演示版不做组织者权限分级）
router.post('/', authRequired, wrap((req, res) => {
  const { title, tag, when, place, desc, capacity } = req.body || {}
  if (!title || !when || !place) return fail(res, '标题、时间、地点为必填项')
  const a = {
    id: nextId('a'),
    title: String(title).slice(0, 30),
    tag: ['本周', '挑战', '组队', '筹备'].includes(tag) ? tag : '本周',
    badge: '报名中',
    icon: '🗓️',
    when: String(when).slice(0, 30),
    place: String(place).slice(0, 30),
    desc: desc ? String(desc).slice(0, 80) : '',
    joinedCount: 1,
    capacity: Number.isInteger(capacity) && capacity > 0 ? capacity : 100,
    status: 'open',
    createdAt: Date.now()
  }
  db.activities.push(a)
  db.signups.push({ userId: req.userId, activityId: a.id, createdAt: Date.now() })
  ok(res, a, '活动发布成功')
}))

// 给活动附加「当前用户是否已报名」标记
function withJoinedFlag(userId) {
  return (a) => ({
    ...a,
    joined: userId ? db.signups.some((s) => s.userId === userId && s.activityId === a.id) : false
  })
}

export default router
