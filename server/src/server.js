// 服务启动入口：node src/server.js
import { pathToFileURL } from 'node:url'
import app from './app.js'

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isMain) {
  const PORT = process.env.PORT || 3001
  app.listen(PORT, () => {
    console.log('')
    console.log('  趣跑校园后端服务已启动（演示版 · 内存数据）')
    console.log(`  本地地址:   http://localhost:${PORT}/api/health`)
    console.log('  演示账号:   demo / 123456')
    console.log('  接口文档:   server/README.md')
    console.log('  提示: 数据保存在内存中，重启服务即恢复初始状态')
    console.log('')
  })
}

export { app }
