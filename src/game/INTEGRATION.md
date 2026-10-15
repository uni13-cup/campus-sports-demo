# 校园猫鼠大作战核心逻辑接入说明

## 当前规则

- 单机模拟演示，不使用真实 GPS、后端或多人联机。
- 地图逻辑采用约 `763.4 × 306.1` 米的本地二维模拟坐标，左上角是 `(0, 0)`，`x` 向东、`y` 向南。
- 1 只玩家猫追捕 5 只电脑鼠。
- 躲藏阶段 5 秒，猫不能移动，电脑鼠自动分散。
- 追捕阶段 30 秒，玩家猫与任意老鼠距离小于或等于 40 个模拟米时自动抓捕距离最近的一只并转换阵营；该阈值服务于加速演示，不代表真实 GPS 距离。
- 被抓的鼠转为电脑猫，从下一次 AI 更新开始协助追捕。
- 全部鼠被抓时猫方获胜；追捕倒计时结束仍有鼠存活时鼠方获胜。
- OSM 建筑对应的矩形近似障碍不可进入；其余区域可移动。
- 猫和鼠的中心坐标均被限制在虚线活动边界内。

## 推荐接口

```js
import {
  initGame,
  moveCharacter,
  tickGame,
  updateAi,
  checkCaptures,
  calcDistance,
  isWalkablePosition,
  resetGame
} from '@/game/engine.js'

import {
  gameToLngLat,
  lngLatToGame,
  measureGeoBounds
} from '@/game/coordinates.js'
```

| 接口 | 输入 | 返回 | 用途 |
|---|---|---|---|
| `initGame(options?)` | 可选配置覆盖项 | 初始 `GameState` | 创建一局游戏 |
| `moveCharacter(state, playerId, delta)` | 状态、角色 ID、`{dx,dy}` | 新状态 | 移动角色并自动检查抓捕 |
| `tickGame(state, deltaSeconds)` | 状态、推进秒数 | 新状态 | 更新阶段和倒计时 |
| `updateAi(state, random?)` | 状态、可选随机函数 | 新状态 | 更新电脑鼠和电脑猫 |
| `checkCaptures(state)` | 状态 | `{state,captures}` | 单独执行抓捕检查 |
| `calcDistance(a, b)` | 两个坐标 | 精确距离 | 计算二维直线距离 |
| `isWalkablePosition(position, config?)` | 坐标、可选配置 | 布尔值 | 判断边界和建筑碰撞 |
| `resetGame(options?)` | 可选配置覆盖项 | 全新初始状态 | 重新开始 |
| `gameToLngLat(position, config)` | 游戏坐标、配置 | `[longitude, latitude]` | 游戏逻辑位置转 WGS84 地图位置 |
| `lngLatToGame(lngLat, config)` | 经纬度、配置 | `{x,y}` | WGS84 地图位置转游戏坐标 |

以上接口不会依赖 DOM。传入状态的接口返回新对象，不直接修改 Vue 当前持有的状态。

## 状态结构

```js
{
  phase: 'hiding', // hiding | chasing | ended
  players: [
    {
      id: 'cat-1',
      role: 'cat', // cat | mouse
      controller: 'human', // human | ai
      position: { x: 180, y: 260 },
      captures: 0
    }
  ],
  hidingTimeLeft: 5,
  chasingTimeLeft: 30,
  winner: null, // cat | mouse | null
  endReason: null, // all-mice-caught | timeout | manual | null
  config: {
    mapWidth: 763.4044462128343,
    mapHeight: 306.12859968138207,
    geoBounds: {
      west: 113.8112,
      south: 34.7844,
      east: 113.81955,
      north: 34.78715
    },
    coordinateSystem: 'simulated-local-meters',
    catchThreshold: 80,
    moveStep: 10,
    obstacles: []
  }
}
```

前端应以 `players` 为角色唯一数据来源。`cat`、`mouse`、`distance`、`timeLeft` 和 `status` 是为旧页面保留的临时兼容字段，不适合表现多角色游戏。

## Vue 页面调用示例

```js
import { ref, onMounted, onBeforeUnmount } from 'vue'
import {
  initGame,
  moveCharacter,
  tickGame,
  updateAi
} from '@/game/engine.js'

const gameState = ref(initGame())
let timerId = null

function moveCat(dx, dy) {
  gameState.value = moveCharacter(
    gameState.value,
    'cat-1',
    { dx, dy }
  )
  stopWhenEnded()
}

function advanceOneSecond() {
  let nextState = tickGame(gameState.value, 1)
  nextState = updateAi(nextState)
  gameState.value = nextState
  stopWhenEnded()
}

function stopWhenEnded() {
  if (gameState.value.phase === 'ended' && timerId) {
    clearInterval(timerId)
    timerId = null
  }
}

onMounted(() => {
  timerId = setInterval(advanceOneSecond, 1000)
})

onBeforeUnmount(() => {
  if (timerId) clearInterval(timerId)
})
```

不要同时使用页面自己的 `setInterval` 和引擎的旧 `startTimer()`，否则倒计时会被重复推进。

## 地图渲染与数据

`CampusMap.vue` 使用 MapLibre GL JS 渲染本地 GeoJSON，不依赖 DOM 参与游戏距离或抓捕计算。角色位置统一通过 `gameToLngLat()` 转换：

```js
const lngLat = gameToLngLat(player.position, gameState.value.config)
```

- 数据来自 OpenStreetMap 官方 Map API 对郑东校区范围的提取，生成脚本为 `scripts/generate-campus-scene.mjs`。
- 本地数据文件为 `src/game/data/campus-data.js`，包含道路、建筑、绿化、运动区域和水体，不包含运行时在线瓦片依赖。
- 页面必须保留可见的 `© OpenStreetMap contributors · ODbL 1.0` 署名。
- 地图不渲染地标文字；名称只保留在数据属性中用于核验。
- `players` 中 `role === 'cat'` 的角色显示为猫。
- `role === 'mouse'` 的角色显示为鼠。
- `controller === 'human'` 的猫应有明显玩家标识。
- `config.obstacles` 是 OSM 建筑多边形的外包矩形近似，可通过页面“碰撞范围”开关核对。
- HUD 建议显示当前阶段、当前阶段剩余时间、存活鼠数量和玩家猫抓捕数。
- MapLibre 支持缩放、旋转和最大 `65°` 倾斜；默认镜头倾斜约 `38°`，并支持玩家跟随与全场视野。
- 地图完成本地场景加载后才开始 5 秒躲藏倒计时，避免首次加载占用游戏时间。

当前阶段时间：

```js
const timeLeft = gameState.value.phase === 'hiding'
  ? gameState.value.hidingTimeLeft
  : gameState.value.chasingTimeLeft
```

## 结果判断

```js
if (gameState.value.phase === 'ended') {
  if (gameState.value.winner === 'cat') {
    // 所有鼠已被抓
  } else {
    // 追捕时间耗尽，仍有鼠存活
  }
}
```

## 2.0 抓捕与事件

- 玩家猫与任意电脑鼠的实时距离进入 `catchThreshold` 后，直接抓捕距离最近且刚进入范围的一只并完成阵营转换。没有计时冷却或额外技能；同一次空间接触中的其他老鼠不会在后续帧连锁转换，必须离开范围后重新进入。转换后的电脑猫不参与自动抓捕。`confirmCapture()` 继续保留给旧调用方兼容使用。
- 电脑猫在范围内仍自动确认，以便单机局可以自然结束。
- 电脑鼠在道路图上从多个安全候选目标中按本局随机种子选择逃跑路线，并约每 0.8～1.6 秒重新规划；同一局可复现，不同局路线会变化。
- `events` 是有长度上限的瞬时游戏事件队列，包含 `capture-candidate`、`capture-confirmed`、`role-converted` 和 `game-ended` 等事件。
- 结算前使用 `saveGameResult()` 写入两小时有效的 `sessionStorage` 快照；快照仅含胜负和计分信息，不保存位置轨迹。

点击“再来一局”时直接执行：

```js
gameState.value = resetGame()
```

## 测试

在仓库根目录运行：

```powershell
node --test src/game/engine.test.js src/game/coordinates.test.js
npm run build
node scripts/verify-campus-map.mjs http://127.0.0.1:4173/game/play
```

截至 2026-10-14，共 47 项测试通过：原有规则和坐标测试全部保留，并覆盖连续运动、扫掠碰撞、A*、NPC 路径、抓捕确认、事件和结算快照。浏览器验证脚本还会检查本地地图画布、6 个角色、MapLibre 控件、OSM 署名、连续键盘移动、断网保持、移动端布局和结算恢复。

## 2.0 连续运动与 NPC 寻路

- 游戏页使用 `requestAnimationFrame` 驱动 30 Hz 固定步长逻辑，按住方向键、WASD 或触屏方向按钮即可连续移动。
- 角色速度单位是模拟米/秒；页面从后台恢复时会清空累计帧时间，避免瞬移。
- `sweepPosition()` 检查整段移动路径，解决旧版只检查目标点时可能高速穿越矩形障碍的问题。
- NPC 使用本地道路节点图与 A*。图数据由活动区内 OSM 可步行道路和人工核验的演示通行线组成；后者只是数据不足时的本地降级，不是官方导航数据。
- 电脑猫追逐最近老鼠；电脑鼠选择远离猫群的安全节点并沿路径逃跑。

## 当前限制

- 路网尚未经过校园现场逐路段核验；演示通行线只保证与当前近似障碍模型一致。
- 所有坐标和距离均为模拟数据，不代表真实 GPS 定位。
- 建筑碰撞仍使用目标点与外包矩形判断，不是真实多边形碰撞，也没有解决高速移动穿越障碍的问题。
- NPC 的危险评估是确定性启发式，不含协作包围、视野或体力系统。
- OSM 数据覆盖反映提取时的公开地图状态，可能与校园现场细节存在差异；需要通过生成脚本人工刷新和复核。
- 没有房间、账号、服务器、数据库或实时多人同步。
- 模块级旧接口仍作为兼容层保留；2.0 游戏页面已经统一为显式 `GameState` 数据流。
