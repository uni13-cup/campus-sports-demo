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

  // 倒计时（秒）
  duration: 60,

  // 抓捕阈值：猫鼠距离 <= 该值视为被抓（米）
  catchThreshold: 15,

  // 移动步长（米 / 帧）
  moveStep: 10,

  // 刷新间隔（毫秒）
  tickInterval: 1000
}
