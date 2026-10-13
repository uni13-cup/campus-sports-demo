# 校园猫鼠大作战核心逻辑接入说明

## 当前规则

- 单机模拟演示，不使用真实 GPS、后端或多人联机。
- 地图采用 `500 × 400` 二维虚拟坐标，左上角是 `(0, 0)`。
- 1 只玩家猫追捕 5 只电脑鼠。
- 躲藏阶段 5 秒，猫不能移动，电脑鼠自动分散。
- 追捕阶段 30 秒，猫鼠距离小于或等于 15 个虚拟米时自动抓捕。
- 被抓的鼠转为电脑猫，从下一次 AI 更新开始协助追捕。
- 全部鼠被抓时猫方获胜；追捕倒计时结束仍有鼠存活时鼠方获胜。
- 建筑物不可进入；西运动场、道路和广场可移动。

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
      position: { x: 400, y: 350 },
      spawnLandmark: '第二食堂南侧圆形广场',
      captures: 0
    }
  ],
  hidingTimeLeft: 5,
  chasingTimeLeft: 30,
  winner: null, // cat | mouse | null
  endReason: null, // all-mice-caught | timeout | manual | null
  config: {
    mapWidth: 500,
    mapHeight: 400,
    catchThreshold: 15,
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

## 地图渲染

角色坐标可转成 CSS 百分比：

```js
function toPercent(position, config) {
  return {
    left: `${position.x / config.mapWidth * 100}%`,
    top: `${position.y / config.mapHeight * 100}%`
  }
}
```

- `players` 中 `role === 'cat'` 的角色显示为猫。
- `role === 'mouse'` 的角色显示为鼠。
- `controller === 'human'` 的猫应有明显玩家标识。
- `config.obstacles` 可绘制成透明建筑碰撞层，但地标名称继续显示。
- HUD 建议显示当前阶段、当前阶段剩余时间、存活鼠数量和玩家猫抓捕数。

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

点击“再来一局”时直接执行：

```js
gameState.value = resetGame()
```

## 测试

在仓库根目录运行：

```powershell
node --test src/game/engine.test.js
npm run build
```

截至 2026-10-13，逻辑测试共 23 项，覆盖初始化、移动、地图边界、建筑碰撞、距离、抓捕边界、阵营转换、倒计时、胜负、重置、电脑 AI 和完整回合。

## 当前限制

- AI 采用简单的直线追逐、逃离和局部绕障，不是完整寻路算法。
- 所有坐标和距离均为模拟数据，不代表真实 GPS 定位。
- 没有房间、账号、服务器、数据库或实时多人同步。
- 页面仍需由李金燚根据 `players` 数组改为多角色渲染。
