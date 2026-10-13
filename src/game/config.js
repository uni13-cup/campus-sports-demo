/**
 * 游戏配置常量
 *
 * 负责人：张慧雯（游戏核心逻辑）
 * 说明：此文件为接口约定占位，数值待张慧雯确认后调整。
 * 其他人请勿修改本文件的具体参数。
 */
export const GAME_CONFIG = {
  // 地图范围（模拟坐标，单位：米）
  mapWidth: 500,
  mapHeight: 400,

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
    cat: { x: 400, y: 350 },
    mice: [
      { x: 60, y: 80 },
      { x: 60, y: 320 },
      { x: 180, y: 80 },
      { x: 315, y: 90 },
      { x: 370, y: 175 }
    ]
  },

  spawnClearance: {
    catToMouse: 80,
    mouseToMouse: 35,
    obstacle: 10
  },

  // 建筑障碍物；矩形内部及边界均不可进入
  obstacles: [
    { id: 'obstacle-1', x: 220, y: 30, width: 85, height: 55 },
    { id: 'obstacle-2', x: 220, y: 110, width: 85, height: 55 },
    { id: 'obstacle-3', x: 220, y: 190, width: 85, height: 55 },
    { id: 'obstacle-4', x: 340, y: 220, width: 120, height: 80 }
  ]
}
