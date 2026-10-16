// 内存数据存储 + 演示种子数据
// 零数据库依赖：进程启动即载入，重启恢复初始状态，便于课堂反复演示。
// 数据口径与前端 Demo 保持一致（能量 10 点/公里、4 项权益、4 支跑团、5 个活动）。

export const ENERGY_PER_KM = 10

function seed() {
  const users = [
    { id: 'u1', username: 'demo', password: '123456', nickname: '李金燚', avatar: '🦌', college: '会计学院', teamId: 't2', totalKm: 22.5, runCount: 11, streakDays: 7, myEarned: 0, createdAt: Date.now() - 86400000 * 30 },
    { id: 'u2', username: '', password: '', nickname: '王同学', avatar: '🦊', college: '金融学院', teamId: 't1', totalKm: 42.6, runCount: 19, streakDays: 12, myEarned: 0, createdAt: Date.now() - 86400000 * 45 },
    { id: 'u3', username: '', password: '', nickname: '李同学', avatar: '🐼', college: '工商管理学院', teamId: 't1', totalKm: 38.2, runCount: 17, streakDays: 5, myEarned: 0, createdAt: Date.now() - 86400000 * 40 },
    { id: 'u4', username: '', password: '', nickname: '张同学', avatar: '🐨', college: '计算机学院', teamId: 't3', totalKm: 35.7, runCount: 15, streakDays: 9, myEarned: 0, createdAt: Date.now() - 86400000 * 36 },
    { id: 'u5', username: '', password: '', nickname: '赵同学', avatar: '🦁', college: '法学院', teamId: 't2', totalKm: 26.1, runCount: 12, streakDays: 3, myEarned: 0, createdAt: Date.now() - 86400000 * 20 },
    { id: 'u6', username: '', password: '', nickname: '陈同学', avatar: '🐯', college: '会计学院', teamId: 't4', totalKm: 24.8, runCount: 10, streakDays: 4, myEarned: 0, createdAt: Date.now() - 86400000 * 18 }
  ]

  // 跑团（对齐发现页跑团榜）；energyPool 为队伍能量公共池
  const teams = [
    { id: 't1', name: '追风跑团', college: '金融学院', weekKm: 412, members: 36, energyPool: 360, weekGoal: 4000, createdAt: Date.now() - 86400000 * 60 },
    { id: 't2', name: '夜航跑团', college: '会计学院', weekKm: 340, members: 28, energyPool: 120, weekGoal: 4000, createdAt: Date.now() - 86400000 * 55 },
    { id: 't3', name: '体测冲锋队', college: '计算机学院', weekKm: 286, members: 22, energyPool: 200, weekGoal: 4000, createdAt: Date.now() - 86400000 * 50 },
    { id: 't4', name: '羽林小分队', college: '体育学院', weekKm: 233, members: 19, energyPool: 90, weekGoal: 4000, createdAt: Date.now() - 86400000 * 40 }
  ]

  // 校园活动（对齐趣味玩法页活动卡片）
  const activities = [
    { id: 'catmouse', title: '校园猫鼠大作战', tag: '本周', badge: '可玩', icon: '🐱', when: '每周六 16:00', place: '东校区操场', desc: '真人版猫追鼠，跑起来才不会被抓', joinedCount: 18, capacity: 30, status: 'open', createdAt: Date.now() - 86400000 * 10 },
    { id: 'runmonth', title: '校园跑步月 · 5 公里挑战', tag: '挑战', badge: '报名中', icon: '🏃', when: '10.20 – 11.20', place: '全校 · 操场任意时段', desc: '30 天内累计完成 10 次 5 公里，达标解锁徽章', joinedCount: 126, capacity: 500, status: 'open', createdAt: Date.now() - 86400000 * 9 },
    { id: 'collegepk', title: '学院 PK 榜 · 团队里程赛', tag: '组队', badge: '报名中', icon: '🏆', when: '本周日 24:00 截止', place: '线上打卡 · 按学院统计', desc: '以学院为单位累计里程，前三名进荣誉墙', joinedCount: 84, capacity: 1000, status: 'open', createdAt: Date.now() - 86400000 * 8 },
    { id: 'nightrun', title: '晨光夜跑团 · 周三夜跑', tag: '本周', badge: '报名中', icon: '🌙', when: '每周三 19:00', place: '东校区操场南门', desc: '5 公里配速跑，新手也跟得上', joinedCount: 22, capacity: 40, status: 'open', createdAt: Date.now() - 86400000 * 6 },
    { id: 'soon', title: '撕名牌 · 躲避球', tag: '筹备', badge: '筹备中', icon: '🏷️', when: '时间待定', place: '场地待定', desc: '组队对抗玩法，规则设计中', joinedCount: 0, capacity: 0, status: 'preparing', createdAt: Date.now() - 86400000 * 3 }
  ]

  // 权益商品（对齐能量消费联盟商城）
  const rewards = [
    { id: 'gym', icon: '🏸', name: '体育馆场地 1 小时', desc: '羽毛球 / 篮球时段任选', cost: 120, stock: 20 },
    { id: 'meal', icon: '🍱', name: '食堂套餐券 1 张', desc: '校内食堂窗口通用', cost: 80, stock: 50 },
    { id: 'print', icon: '🖨️', name: '打印额度 50 张', desc: '图书馆自助打印', cost: 60, stock: 100 },
    { id: 'swim', icon: '🏊', name: '游泳馆单次票', desc: '本学期内有效', cost: 100, stock: 30 }
  ]

  // demo 用户近期跑步记录
  const sportRecords = [
    { id: 'r1', userId: 'u1', distanceKm: 5, durationSec: 1850, paceSec: 370, source: 'sensor', verifiedKm: 5, createdAt: Date.now() - 86400000 * 2 },
    { id: 'r2', userId: 'u1', distanceKm: 3, durationSec: 1170, paceSec: 390, source: 'sim', verifiedKm: 3, createdAt: Date.now() - 86400000 * 4 },
    { id: 'r3', userId: 'u1', distanceKm: 5, durationSec: 1805, paceSec: 361, source: 'sensor', verifiedKm: 5, createdAt: Date.now() - 86400000 * 6 }
  ]

  // 核验记录（含被拦截的摇手机作弊，对齐「被拦下的次数不计入成绩」）
  const verifyRecords = [
    { id: 'v1', userId: 'u1', behavior: 'run', cadence: 171, durationSec: 1850, verified: true, validKm: 5, reason: '步频与波动稳定，判定为真实跑步', createdAt: Date.now() - 86400000 * 2 },
    { id: 'v2', userId: 'u1', behavior: 'shake', cadence: 0, durationSec: 60, verified: false, validKm: 0, reason: '检测到规律摇手机特征，里程不计入', createdAt: Date.now() - 86400000 * 3 },
    { id: 'v3', userId: 'u1', behavior: 'run', cadence: 168, durationSec: 1170, verified: true, validKm: 3, reason: '步频与波动稳定，判定为真实跑步', createdAt: Date.now() - 86400000 * 4 }
  ]

  // 能量流水
  const transactions = [
    { id: 'x1', userId: 'u1', teamId: 't2', type: 'earn', amount: 50, title: '合格跑步 5 公里', detail: '真实传感器核验通过', createdAt: Date.now() - 86400000 * 2 },
    { id: 'x2', userId: 'u1', teamId: 't2', type: 'earn', amount: 30, title: '合格跑步 3 公里', detail: '模拟训练', createdAt: Date.now() - 86400000 * 4 },
    { id: 'x3', userId: 'u1', teamId: 't2', type: 'earn', amount: 50, title: '合格跑步 5 公里', detail: '真实传感器核验通过', createdAt: Date.now() - 86400000 * 6 }
  ]

  return {
    users,
    teams,
    activities,
    rewards,
    sportRecords,
    verifyRecords,
    transactions,
    coupons: [],
    signups: [
      { userId: 'u1', activityId: 'nightrun', createdAt: Date.now() - 86400000 * 2 }
    ],
    seq: 100
  }
}

const db = seed()

export function nextId(prefix) {
  db.seq += 1
  return `${prefix}${db.seq}`
}

export function findUser(id) {
  return db.users.find((u) => u.id === id) || null
}

export function findUserByName(username) {
  return db.users.find((u) => u.username === username) || null
}

export function teamOf(userId) {
  const u = findUser(userId)
  return u && u.teamId ? db.teams.find((t) => t.id === u.teamId) || null : null
}

// 写入能量流水（跑步获取 / 兑换消耗）
export function addEnergyTx({ userId, teamId, type, amount, title, detail }) {
  const tx = { id: nextId('x'), userId, teamId: teamId || null, type, amount, title, detail, createdAt: Date.now() }
  db.transactions.unshift(tx)
  return tx
}

export function resetDb() {
  const fresh = seed()
  for (const key of Object.keys(db)) delete db[key]
  Object.assign(db, fresh)
}

export default db
