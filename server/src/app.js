// Express 应用装配（不直接 listen，方便冒烟测试以随机端口引入）
import express from 'express'
import cors from 'cors'

import userRouter from './routes/user.js'
import activityRouter from './routes/activity.js'
import sportdataRouter from './routes/sportdata.js'
import verifyRouter from './routes/verify.js'
import teamRouter from './routes/team.js'
import pointsRouter from './routes/points.js'
import { fail } from './util.js'

const app = express()

app.use(cors()) // 演示版允许任意来源；正式版应按前端域名收敛白名单
app.use(express.json())

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ code: 0, message: 'ok', data: { service: 'campus-sports-demo-server', status: 'up', time: Date.now() } })
})

// 六组接口（对应计划书 8.3 预留的后端接口设计）
app.use('/api/user', userRouter)
app.use('/api/activity', activityRouter)
app.use('/api/sportdata', sportdataRouter)
app.use('/api/verify', verifyRouter)
app.use('/api/team', teamRouter)
// points 组内同时包含 /api/rewards、/api/coupons 与 /api/points/*，统一挂在 /api 下
app.use('/api', pointsRouter)

// 404
app.use((req, res) => fail(res, `接口不存在：${req.method} ${req.originalUrl}`, 404, 404))

// 统一错误处理
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return fail(res, '请求体不是合法 JSON', 400, 400)
  console.error('[server error]', err)
  fail(res, err.message || '服务器内部错误', 500, 500)
})

export default app
