# 趣跑校园 · 后端接口服务（课程演示版）

对应计划书 8.3「后端接口设计」：六组接口 user / activity / sportdata / verify / team / points。

- 技术栈：Node.js + Express，ESM 规范，Node.js >= 18
- 数据存储：**内存 + 种子数据**，零数据库依赖；重启服务即恢复初始状态，方便课堂反复演示
- 认证：登录返回演示 Token（Base64），请求头携带 `Authorization: Bearer <token>`
- 统一响应格式：`{ "code": 0, "message": "ok", "data": ... }`，`code = 0` 表示成功

## 一、启动

```bash
cd server
npm install        # 仅需 express、cors 两个依赖
npm start          # 默认端口 3001，可用 PORT=8080 npm start 更换
```

看到如下输出即成功：

```
趣跑校园后端服务已启动（演示版 · 内存数据）
本地地址:   http://localhost:3001/api/health
演示账号:   demo / 123456
```

也可在仓库根目录直接运行（需先在 `server/` 内执行过 `npm install`）：

```bash
npm run server        # 启动服务
npm run test:server   # 运行 35 项冒烟测试
```

## 二、演示账号

| 账号 | 密码 | 身份 | 所属跑团 |
|---|---|---|---|
| demo | 123456 | 李金燚（会计学院） | 夜航跑团（能量池初始 120） |

另外可以通过 `POST /api/user/register` 随时注册新账号。

## 三、接口清单（25 个）

### 1. user 用户组

| 方法 | 路径 | 登录 | 说明 |
|---|---|---|---|
| POST | /api/user/register | 否 | 注册，入参 username/password/nickname/college，返回 token |
| POST | /api/user/login | 否 | 登录，入参 username/password，返回 token 与用户信息 |
| GET | /api/user/me | 是 | 当前登录用户（含所属跑团） |
| GET | /api/user/rankings/personal | 是 | 个人里程榜 Top20 + 我的名次 |

### 2. activity 活动组

| 方法 | 路径 | 登录 | 说明 |
|---|---|---|---|
| GET | /api/activity/list | 否 | 活动列表，`?tag=本周\|挑战\|组队\|筹备` 筛选，含 joined 标记 |
| GET | /api/activity/:id | 否 | 活动详情 |
| POST | /api/activity/:id/join | 是 | 报名（筹备中不可报、不可重复报、校验容量） |
| POST | /api/activity/:id/leave | 是 | 取消报名 |
| POST | /api/activity | 是 | 发布活动，入参 title/tag/when/place/desc/capacity |

### 3. sportdata 运动数据组

| 方法 | 路径 | 登录 | 说明 |
|---|---|---|---|
| GET | /api/sportdata/overview | 是 | 总览：累计公里、次数、本周公里、连续天数、贡献能量 |
| GET | /api/sportdata/records | 是 | 我的跑步记录列表 |
| POST | /api/sportdata/records | 是 | 上报跑步记录；仅 verifiedKm 累计成绩，按 10 点/公里折算能量入队伍公共池 |

### 4. verify 核验组

| 方法 | 路径 | 登录 | 说明 |
|---|---|---|---|
| POST | /api/verify/motion | 是 | 运动真实性核验，支持窗口明细或单段结论，返回 verified/validKm/reason |
| GET | /api/verify/records | 是 | 核验记录 + 本周统计（提交/通过/拦截/有效公里） |

服务端复核规则：`behavior=run`、平均步频在 140–200 spm、窗口明细中跑步窗口占比 ≥ 60% 才通过；
摇手机、静止、走路、乘车骑行一律返回 `verified=false`，里程不计入。

### 5. team 跑团组

| 方法 | 路径 | 登录 | 说明 |
|---|---|---|---|
| GET | /api/team/rankings | 否 | 跑团周里程排行榜 |
| GET | /api/team/recommend | 否 | 推荐跑团 Top3 |
| GET | /api/team/:id | 否 | 跑团详情（含成员里程榜） |
| POST | /api/team/create | 是 | 创建跑团并自动加入 |
| POST | /api/team/:id/join | 是 | 加入跑团（每人限一支） |
| POST | /api/team/leave | 是 | 退出当前跑团 |

### 6. points 能量积分组

| 方法 | 路径 | 登录 | 说明 |
|---|---|---|---|
| GET | /api/rewards | 否 | 可兑换权益列表（体育馆/食堂券/打印额度/游泳票） |
| GET | /api/points/balance | 是 | 队伍能量池、个人贡献、周目标 |
| GET | /api/points/transactions | 是 | 能量流水（earn 获取 / cost 消耗） |
| POST | /api/points/exchange | 是 | 兑换权益（校验队伍与余额），生成券码入券包 |
| GET | /api/coupons | 是 | 我的券包 |
| POST | /api/coupons/:id/redeem | 是 | 到店核销，不可重复核销 |

另有 `GET /api/health` 健康检查。

## 四、快速演示（curl / PowerShell）

```bash
# 1. 登录拿 token
curl -X POST http://localhost:3001/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"username":"demo","password":"123456"}'

# 2. 上报一次 5 公里真实跑步（核验通过，+50 能量入队）
curl -X POST http://localhost:3001/api/sportdata/records \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \
  -d '{"distanceKm":5,"durationSec":1850,"source":"sensor","verifiedKm":5}'

# 3. 摇手机尝试作弊 → verified=false
curl -X POST http://localhost:3001/api/verify/motion \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \
  -d '{"behavior":"shake","cadence":0,"durationSec":60}'

# 4. 兑换食堂套餐券（80 能量）→ 返回券码
curl -X POST http://localhost:3001/api/points/exchange \
  -H "Content-Type: application/json" -H "Authorization: Bearer <token>" \
  -d '{"rewardId":"meal"}'

# 5. 出示券码到店核销
curl -X POST http://localhost:3001/api/coupons/<券id>/redeem \
  -H "Authorization: Bearer <token>"
```

## 五、目录结构

```
server/
├─ package.json          依赖与脚本（start / test）
├─ smoke-test.mjs        35 项接口冒烟测试（node smoke-test.mjs）
├─ README.md
└─ src/
   ├─ server.js          启动入口（默认 3001 端口）
   ├─ app.js             Express 装配：CORS、JSON、六组路由、统一错误处理
   ├─ store.js           内存存储 + 种子数据（与前端 Demo 数据口径一致）
   ├─ util.js            统一响应、演示 Token、密码字段过滤
   ├─ middleware/auth.js 登录态中间件（必须 / 可选）
   └─ routes/            user / activity / sportdata / verify / team / points
```

## 六、与前端的关系

当前版本前端仍使用 LocalStorage + Mock 数据独立运行（线上 GitHub Pages 版本不受影响），
后端作为第二阶段「真实数据化」的接口底座先行交付；前端对接时只需把 Mock 调用替换为
`fetch('http://localhost:3001/api/...')`，接口字段已按现有页面数据结构设计。

## 七、正式版升级方向（计划书第二阶段）

1. Token 升级为 JWT + HTTPS，密码 bcrypt 加盐哈希
2. 内存存储替换为 MySQL/PostgreSQL，运动记录与轨迹按用户隔离
3. WebSocket 多设备同步，服务端维护猫鼠对局实时状态
4. CORS 收敛为前端域名白名单，增加接口限流与操作审计
