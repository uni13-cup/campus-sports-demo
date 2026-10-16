// 冒烟测试：以随机端口启动 app，顺序验证六组接口主流程
// 运行：node smoke-test.mjs（要求 Node.js >= 18，使用内置 fetch）
import assert from 'node:assert/strict'
import app from './src/app.js'
import { resetDb } from './src/store.js'

let passed = 0
let failed = 0
const results = []

function check(name, cond, extra = '') {
  if (cond) {
    passed += 1
    results.push(`  PASS  ${name}`)
  } else {
    failed += 1
    results.push(`  FAIL  ${name} ${extra}`)
  }
}

const server = app.listen(0)
await new Promise((r) => server.once('listening', r))
const base = `http://127.0.0.1:${server.address().port}`

async function api(method, path, { token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  })
  let json = null
  try { json = await res.json() } catch { /* 非 JSON */ }
  return { status: res.status, json }
}

try {
  resetDb()

  // 0. 健康检查
  let r = await api('GET', '/api/health')
  check('健康检查 200', r.status === 200 && r.json.data.status === 'up')

  // 1. user：登录 demo / 未登录拒绝 / 重复注册
  r = await api('POST', '/api/user/login', { body: { username: 'demo', password: '123456' } })
  check('demo 登录成功', r.status === 200 && r.json.data.user.nickname === '李金燚')
  const token = r.json.data.token

  r = await api('POST', '/api/user/login', { body: { username: 'demo', password: 'wrong' } })
  check('错误密码返回 401', r.status === 401)

  r = await api('GET', '/api/user/me')
  check('未登录访问 /me 返回 401', r.status === 401)

  r = await api('GET', '/api/user/me', { token })
  check('登录后获取当前用户', r.status === 200 && r.json.data.username === 'demo' && !('password' in r.json.data))

  const uname = 'tester' + Math.floor(Math.random() * 1e6)
  r = await api('POST', '/api/user/register', { body: { username: uname, password: 'abc123', nickname: '测试同学' } })
  check('新用户注册成功', r.status === 200 && !!r.json.data.token)
  const token2 = r.json.data.token

  r = await api('POST', '/api/user/register', { body: { username: uname, password: 'abc123' } })
  check('重复用户名返回 409', r.status === 409)

  r = await api('GET', '/api/user/rankings/personal', { token })
  check('个人里程榜含我的名次', r.status === 200 && r.json.data.myRank > 0 && r.json.data.list.length >= 3)

  // 2. activity：列表/筛选/报名/取消
  r = await api('GET', '/api/activity/list')
  check('活动列表 5 个', r.status === 200 && r.json.data.length === 5)

  r = await api('GET', '/api/activity/list?tag=' + encodeURIComponent('本周'))
  check('按标签筛选活动', r.status === 200 && r.json.data.every((a) => a.tag === '本周'))

  r = await api('POST', '/api/activity/catmouse/join', { token })
  check('报名猫鼠活动', r.status === 200 && r.json.data.joined === true)

  r = await api('POST', '/api/activity/catmouse/join', { token })
  check('重复报名返回 409', r.status === 409)

  r = await api('GET', '/api/activity/catmouse', { token })
  check('活动详情含 joined 标记', r.status === 200 && r.json.data.joined === true)

  r = await api('POST', '/api/activity/catmouse/leave', { token })
  check('取消报名', r.status === 200 && r.json.data.joined === false)

  r = await api('POST', '/api/activity/soon/join', { token })
  check('筹备中活动不可报名', r.status === 400)

  // 3. team：新用户创建跑团；榜单
  r = await api('GET', '/api/team/rankings')
  check('跑团榜 4 支且按里程排序', r.status === 200 && r.json.data.list.length === 4 && r.json.data.list[0].name === '追风跑团')

  // 新用户此时还没加入任何跑团，兑换应被拒绝
  r = await api('POST', '/api/points/exchange', { token: token2, body: { rewardId: 'meal' } })
  check('无队伍用户兑换被拒 403', r.status === 403)

  r = await api('POST', '/api/team/create', { token: token2, body: { name: '测试冲锋队', college: '会计学院' } })
  check('新用户创建跑团', r.status === 200 && r.json.data.members === 1)

  // 4. sportdata：上报跑步 → 累计里程 + 能量（demo 在夜航跑团，池初始 120）
  r = await api('GET', '/api/points/balance', { token })
  const pool0 = r.json.data.pool
  check('初始能量池 120', pool0 === 120)

  r = await api('POST', '/api/sportdata/records', { token, body: { distanceKm: 3, durationSec: 1170, source: 'sim', verifiedKm: 3 } })
  check('上报 3km 跑步记录', r.status === 200 && r.json.data.energyGained === 30)

  r = await api('GET', '/api/sportdata/overview', { token })
  check('总览累计里程增加', r.status === 200 && r.json.data.totalKm === 25.5)

  r = await api('GET', '/api/points/balance', { token })
  check('能量池变为 150', r.json.data.pool === 150)

  // 5. verify：真实跑步通过 / 摇手机拒绝
  r = await api('POST', '/api/verify/motion', { token, body: { behavior: 'run', cadence: 172, durationSec: 600 } })
  check('真实跑步核验通过', r.status === 200 && r.json.data.verified === true && r.json.data.validKm > 0)

  r = await api('POST', '/api/verify/motion', { token, body: { behavior: 'shake', cadence: 0, durationSec: 60 } })
  check('摇手机核验拒绝', r.status === 200 && r.json.data.verified === false && r.json.data.validKm === 0)

  r = await api('POST', '/api/verify/motion', {
    token,
    body: { windows: Array.from({ length: 5 }, () => ({ behavior: 'run', cadence: 168 })).concat([{ behavior: 'shake', cadence: 0 }]) }
  })
  check('窗口明细核验（5/6 跑步占比≥60%）', r.status === 200 && r.json.data.verified === true)

  r = await api('GET', '/api/verify/records', { token })
  check('核验记录含本周统计', r.status === 200 && r.json.data.summary.passed >= 2 && r.json.data.summary.blocked >= 1)

  // 6. points：兑换 → 券包 → 核销 → 流水
  r = await api('GET', '/api/rewards')
  check('权益商品 4 项', r.status === 200 && r.json.data.length === 4)

  r = await api('POST', '/api/points/exchange', { token, body: { rewardId: 'meal' } })
  check('demo 兑换食堂套餐券（80）', r.status === 200 && !!r.json.data.coupon.code)

  r = await api('GET', '/api/points/balance', { token })
  check('兑换后能量池 70', r.json.data.pool === 70)

  r = await api('GET', '/api/coupons', { token })
  check('券包含 1 张未核销券', r.status === 200 && r.json.data.length === 1 && r.json.data[0].used === false)
  const couponId = r.json.data[0].id

  r = await api('POST', `/api/coupons/${couponId}/redeem`, { token })
  check('到店核销成功', r.status === 200 && r.json.data.used === true)

  r = await api('POST', `/api/coupons/${couponId}/redeem`, { token })
  check('重复核销返回 409', r.status === 409)

  r = await api('GET', '/api/points/transactions', { token })
  check('流水含获取与消耗两类', r.status === 200 && r.json.data.some((x) => x.type === 'earn') && r.json.data.some((x) => x.type === 'cost'))

  // 7. 其他：404 与非法 JSON
  r = await api('GET', '/api/whatever')
  check('未知路径返回 404', r.status === 404)

  const raw = await fetch(base + '/api/user/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad json' })
  check('非法 JSON 返回 400', raw.status === 400)
} catch (e) {
  failed += 1
  results.push('  FAIL  测试执行异常: ' + e.stack)
} finally {
  server.close()
}

console.log(results.join('\n'))
console.log('')
console.log(`冒烟测试结果：${passed} 通过，${failed} 失败`)
process.exit(failed ? 1 : 0)
