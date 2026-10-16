// 登录态中间件：从 Authorization: Bearer <token> 解析演示 Token
import { parseToken, fail } from '../util.js'
import { findUser } from '../store.js'

// 必须登录
export function authRequired(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const uid = parseToken(token)
  const user = uid ? findUser(uid) : null
  if (!user) return fail(res, '未登录或登录已失效', 401, 401)
  req.user = user
  req.userId = user.id
  next()
}

// 可选登录：带了有效 Token 就挂上用户，没带也放行
export function authOptional(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  const uid = parseToken(token)
  const user = uid ? findUser(uid) : null
  if (user) {
    req.user = user
    req.userId = user.id
  }
  next()
}
