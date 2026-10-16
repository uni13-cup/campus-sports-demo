// 统一响应与演示用轻量 Token 工具
// 说明：本服务为课程演示版，Token 仅做 Base64 编码（非加密），不设过期刷新机制；
//       正式运营阶段须替换为 JWT + HTTPS + 密码加盐哈希（bcrypt）。

export function ok(res, data = null, message = 'ok') {
  res.json({ code: 0, message, data })
}

export function fail(res, message = '请求失败', httpStatus = 400, code = 1) {
  res.status(httpStatus).json({ code, message, data: null })
}

// 包一层异步路由，异常统一交给错误中间件
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

export function makeToken(userId) {
  return Buffer.from(JSON.stringify({ uid: userId, ts: Date.now() }), 'utf8').toString('base64')
}

export function parseToken(token) {
  try {
    const json = JSON.parse(Buffer.from(String(token), 'base64').toString('utf8'))
    return json.uid ? String(json.uid) : null
  } catch {
    return null
  }
}

// 不回传密码等敏感字段
export function publicUser(u) {
  if (!u) return null
  const { password, ...rest } = u
  return rest
}
