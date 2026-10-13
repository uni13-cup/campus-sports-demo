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
    cat: { x: 400, y: 350, landmark: '第二食堂南侧圆形广场' },
    mice: [
      { x: 60, y: 80, landmark: '西运动场西北角跑道' },
      { x: 60, y: 320, landmark: '西运动场西南角跑道' },
      { x: 180, y: 80, landmark: '西运动场东北侧道路' },
      { x: 315, y: 90, landmark: '笃行书院1号楼北侧道路' },
      { x: 370, y: 175, landmark: '第二食堂北侧偏西道路' }
    ]
  },

  spawnClearance: {
    catToMouse: 80,
    mouseToMouse: 35,
    obstacle: 10
  },

  // 建筑障碍物；矩形内部及边界均不可进入
  obstacles: [
    { id: 'duxing-3', name: '笃行书院3号楼', x: 220, y: 30, width: 85, height: 55 },
    { id: 'duxing-2', name: '笃行书院2号楼', x: 220, y: 110, width: 85, height: 55 },
    { id: 'duxing-1', name: '笃行书院1号楼', x: 220, y: 190, width: 85, height: 55 },
    { id: 'canteen-2', name: '第二食堂', x: 340, y: 220, width: 120, height: 80 }
  ]
}
