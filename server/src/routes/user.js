// user 组：注册 / 登录 / 当前用户 / 个人里程榜
import { Router } from 'express'
import db, { nextId, findUserByName } from '../store.js'
import { ok, fail, wrap, makeToken, publicUser } from '../util.js'
import { authRequired } from '../middleware/auth.js'

const router = Router()

// 注册：用户名 2-16 位、密码至少 4 位
router.post('/register', wrap((req, res) => {
  const { username, password, nickname, college } = req.body || {}
  if (!username || !password) return fail(res, '用户名和密码不能为空')
  if (String(username).length < 2 || String(username).length > 16) return fail(res, '用户名长度需为 2-16 位')
  if (String(password).length < 4) return fail(res, '密码至少 4 位')
  if (findUserByName(username)) return fail(res, '用户名已被注册', 409, 409)

  const user = {
    id: nextId('u'),
    username: String(username),
    password: String(password), // 演示版明文；正式版须 bcrypt 加盐哈希
    nickname: nickname ? String(nickname).slice(0, 12) : String(username),
    avatar: '🏃',
    college: college ? String(college).slice(0, 20) : '',
    teamId: null,
    totalKm: 0,
    runCount: 0,
    streakDays: 0,
    myEarned: 0,
    createdAt: Date.now()
  }
  db.users.push(user)
  ok(res, { token: makeToken(user.id), user: publicUser(user) }, '注册成功')
}))

// 登录
router.post('/login', wrap((req, res) => {
  const { username, password } = req.body || {}
  const user = findUserByName(String(username || ''))
  if (!user || !user.password || user.password !== String(password || '')) {
    return fail(res, '用户名或密码错误', 401, 401)
  }
  ok(res, { token: makeToken(user.id), user: publicUser(user) }, '登录成功')
}))

// 当前登录用户
router.get('/me', authRequired, (req, res) => {
  const team = req.user.teamId ? db.teams.find((t) => t.id === req.user.teamId) : null
  ok(res, { ...publicUser(req.user), team: team || null })
})

// 个人里程榜（本周）：返回 Top 列表 + 当前用户名次
router.get('/rankings/personal', authRequired, (req, res) => {
  const ranked = [...db.users]
    .filter((u) => u.totalKm > 0)
    .sort((a, b) => b.totalKm - a.totalKm)
    .map((u, i) => ({ rank: i + 1, id: u.id, nickname: u.nickname, avatar: u.avatar, college: u.college, totalKm: u.totalKm }))
  const myRank = ranked.findIndex((x) => x.id === req.userId) + 1
  ok(res, { list: ranked.slice(0, 20), myRank, myKm: req.user.totalKm })
})

export default router
