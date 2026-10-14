import { ACTIVITY_GEO_BOUNDS } from './campus.js'
import { lngLatToGame, measureGeoBounds } from './coordinates.js'
import { CAMPUS_BUILDING_BOUNDS, CAMPUS_SCENE } from './data/campus-data.js'

const activitySize = measureGeoBounds(ACTIVITY_GEO_BOUNDS)
const activityConfig = {
  mapWidth: activitySize.width,
  mapHeight: activitySize.height,
  geoBounds: ACTIVITY_GEO_BOUNDS
}

function geometryBounds(feature) {
  const coordinates = []
  function collect(value) {
    if (!Array.isArray(value)) return
    if (
      value.length >= 2 &&
      Number.isFinite(value[0]) &&
      Number.isFinite(value[1])
    ) {
      coordinates.push(value)
      return
    }
    value.forEach(collect)
  }
  collect(feature.geometry.coordinates)
  return {
    id: feature.id,
    osmId: feature.properties.osmId,
    kind: feature.properties.kind,
    west: Math.min(...coordinates.map(([longitude]) => longitude)),
    south: Math.min(...coordinates.map(([, latitude]) => latitude)),
    east: Math.max(...coordinates.map(([longitude]) => longitude)),
    north: Math.max(...coordinates.map(([, latitude]) => latitude))
  }
}

const waterBounds = CAMPUS_SCENE.features
  .filter((feature) => feature.properties.kind === 'water')
  .map(geometryBounds)

const campusObstacles = [
  ...CAMPUS_BUILDING_BOUNDS.map((building) => ({ ...building, kind: 'building' })),
  ...waterBounds
]
  .map((building) => {
    const northWest = lngLatToGame([building.west, building.north], activityConfig)
    const southEast = lngLatToGame([building.east, building.south], activityConfig)
    const x = Math.max(0, northWest.x)
    const y = Math.max(0, northWest.y)
    const right = Math.min(activitySize.width, southEast.x)
    const bottom = Math.min(activitySize.height, southEast.y)

    return {
      id: building.id,
      osmId: building.osmId,
      kind: building.kind,
      x,
      y,
      width: Math.max(0, right - x),
      height: Math.max(0, bottom - y)
    }
  })
  .filter((obstacle) => obstacle.width > 0 && obstacle.height > 0)

/**
 * 游戏配置常量
 *
 * 负责人：张慧雯（游戏核心逻辑）
 * 说明：此文件为接口约定占位，数值待张慧雯确认后调整。
 * 其他人请勿修改本文件的具体参数。
 */
export const GAME_CONFIG = {
  // 活动范围使用本地米制模拟坐标，不代表真实 GPS 定位。
  mapWidth: activitySize.width,
  mapHeight: activitySize.height,
  geoBounds: ACTIVITY_GEO_BOUNDS,
  coordinateSystem: 'simulated-local-meters',

  // 角色中心与地图边缘的最小距离，对应页面中的虚线活动边界
  boundaryPadding: 20,

  // 阵营规模：1 只玩家猫追捕 5 只电脑鼠
  catCount: 1,
  mouseCount: 5,

  // 阶段倒计时（秒）
  hidingDuration: 5,
  chasingDuration: 30,

  // 兼容现有页面；正式计时逻辑使用 chasingDuration
  duration: 30,

  // 抓捕阈值：猫鼠距离 <= 该值视为被抓（米）
  catchThreshold: 15,

  // 移动步长（米 / 帧）
  moveStep: 10,

  // 刷新间隔（毫秒）
  tickInterval: 1000,

  // 固定出生点（虚拟坐标，不代表真实 GPS）
  spawnPoints: {
    cat: { x: 180, y: 260 },
    mice: [
      { x: 260, y: 80 },
      { x: 540, y: 250 },
      { x: 650, y: 160 },
      { x: 360, y: 180 },
      { x: 550, y: 80 }
    ]
  },

  spawnClearance: {
    catToMouse: 80,
    mouseToMouse: 35,
    obstacle: 10
  },

  // 第一阶段碰撞仍是建筑/水体外包矩形近似，并非真实多边形碰撞。
  obstacles: campusObstacles
}
