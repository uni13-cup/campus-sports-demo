# 校园猫鼠大作战 3.0 开发报告

> 负责人：张慧雯
> 开发分支：`codex/catmouse-v3-dual-role`
> 基线：`origin/master@f020bbe`
> 完成日期：2026-10-16

## 一、结论

3.0 已按 P1 至 P4 增量完成。猫阵营和鼠阵营均使用同一套游戏状态、固定时间步、碰撞、A* 路径与抓捕规则；大厅、地图、对战和结算形成完整页面链路。所有定位、房间与其他角色继续明确标注为本地模拟数据，没有接入真实 GPS、后端或多人服务器，也没有直接修改或合并 `master`。

## 二、代码改了什么

### P1：校园地图优化

- 保留 MapLibre GL JS 和本地 OSM GeoJSON，优化道路、建筑、绿化与初始倾斜视角。
- 从已有 OSM 属性白名单提取 7 个活动区内地标：第二食堂、第三食堂、艺术学院楼、办公楼、怡苑1号楼、怡苑2号楼、怡苑3号楼；没有补写数据中不存在的名称。
- 保留 OSM / ODbL 署名、跟随/自由/全局镜头、缩放旋转倾斜、轻量模式和碰撞调试。
- 修复生产环境 `/campus-sports-demo/` 子路径路由，并将浏览器验收改为复用本机 Chrome 的 Playwright Core。

### P2：独立游戏大厅

- 新增 `/game` 游戏大厅及本地会话设置。
- 展示阵营说明、5 秒躲藏/30 秒追捕规则、郑东校区名称、6 名模拟参与者和 `DEMO-ZD-01` 本地 Demo 房间。
- 猫鼠卡片只把入口从 `/game/play` 改到 `/game`，未改变其他趣味玩法和平台页面。

### P3：猫鼠双阵营

- `initGame({ humanRole })` 支持：
  - 猫模式：1 只玩家猫 + 5 只 AI 鼠。
  - 鼠模式：1 只玩家鼠 + 1 只 AI 猫 + 4 只 AI 鼠。
- 玩家鼠可在躲藏期移动；AI 猫躲藏期静止，追捕期使用原 A* 道路图追逐最近老鼠。
- 玩家鼠被抓后只改变 `role`，保留 `controller: 'human'`，继续作为玩家猫参赛。
- 抓捕使用猫鼠配对接触记录；每次只转换实时距离最近的一只，避免同帧批量转换和重复抓捕。
- 保留猫模式 2.1 已确认的“只由玩家猫触发抓捕”行为；鼠模式中的 AI 猫和转换后的猫可继续抓捕。

### P4：反馈与结算

- 事件驱动抓捕闪光、角色转换脉冲和追捕阶段切换提示；动画不参与规则判定。
- 使用轻量 Web Audio 多音提示区分追捕、危险、抓捕和结算，保留静音开关。
- 恢复 `/game/result` 独立结算页，显示初始阵营、最终身份、抓捕数、存活鼠、事件摘要和模拟定位声明。
- 结果快照升级为 v3，同时继续读取 v2 快照，不保存精细位置轨迹。

## 三、主要文件

新增：

- `docs/CAT_MOUSE_V3_PLAN.md`
- `docs/CAT_MOUSE_V3_REPORT.md`
- `src/game/dual-role.test.js`
- `src/game/game-session.js`
- `src/game/game-session.test.js`
- `src/game/landmarks.js`
- `src/game/landmarks.test.js`
- `src/views/game/GameLobbyView.vue`
- `src/views/game/GameResultView.vue`

主要修改：

- `src/game/engine.js`
- `src/game/capture.js`
- `src/game/navigation.js`
- `src/game/simulation.js`
- `src/game/result-store.js`
- `src/game/INTEGRATION.md`
- `src/views/game/GameMapView.vue`
- `src/views/game/components/CampusMap.vue`
- `src/router/index.js`
- `src/views/play/PlayView.vue`（只改猫鼠入口）
- `scripts/verify-campus-map.mjs`

## 四、运行效果与验证

- 地图：本地场景正常显示，6 个角色、7 个核验地标、道路、建筑、运动/绿化区域和活动边界可见。
- 镜头：缩放、旋转、最大 65° 倾斜、跟随、自由和全局视角可用。
- 离线：关闭网络后，已加载的本地校园场景、角色和署名仍正常显示；浏览器运行未发出外部地图请求。
- 猫模式：连续移动、80 模拟米内最近单目标抓捕、阵营转换和全抓获结算正常。
- 鼠模式：躲藏期移动、AI 猫静止、追捕期 A* 追逐、玩家被抓后转为玩家猫和后续比赛正常。
- 移动端：390×844 视口无横向溢出，地图高度、方向控制和紧凑 HUD 正常。
- 页面链路：趣味玩法 → 大厅 → 阵营选择 → 比赛 → 结算 → 再来一局/重新选阵营正常。

最终命令结果：

| 命令 | 结果 |
|---|---|
| `npm run test:game` | 71/71 通过 |
| `npm run build` | 通过；仅有既存的大体积地图 chunk 警告 |
| `npm run verify:game` | 通过；外部请求 0、运行时错误 0 |

浏览器证据位于 `artifacts/campus-map/`：

- `lobby.png`
- `local-map.png`
- `collision-debug.png`
- `continuous-movement.png`
- `mobile-map.png`
- `result-page.png`
- `verification.json`

## 五、与 2.1 的主要区别

- 从直接进入单一猫模式，升级为独立大厅和猫/鼠双阵营。
- 从“玩家只能是猫”，升级为玩家鼠被抓后仍保留控制权并继续参赛。
- 从只验证地图页，升级为覆盖大厅、双阵营、离线、移动端和结算的浏览器验收。
- 增加可靠 OSM 地标标签、阶段/转换反馈和可恢复的独立结算页。

## 六、还有什么问题

- 80 米是加速 Demo 的模拟抓捕阈值，不是现实身体触碰距离，后续真人版必须按 GPS 精度和现场规则重新标定。
- 建筑碰撞仍是 OSM 几何外包矩形近似，楼高仍为示意；没有宣称实现真实建筑轮廓或真实楼高。
- A* 路网包含公开 OSM 道路和人工核验的本地演示通行线，尚未逐路段现场核验。
- AI 使用最近目标和安全节点启发式，没有视野、体力、协作包围或动态人群避让。
- MapLibre 地图模块的生产 chunk 超过 500 kB，构建通过但后续可独立研究懒加载；本轮未为追求警告消失而重构架构。
- 浏览器结算验收使用可重复的 v3 会话快照；两种完整胜负流程由逻辑自动化测试覆盖。

## 七、后续 GPS 真人联机建议

先保持现有 `players`、`controller`、`role` 和事件接口不变，把位置来源抽象为“模拟输入 / GPS 输入 / 服务端快照”三种适配器。GPS 版本需要增加定位精度、时间戳、速度异常、地图匹配和安全边界校验；多人版本再增加权威服务器帧、玩家身份认证、房间状态和抓捕确认仲裁。不要直接用单点 GPS 距离替换当前模拟距离判定，也不要在客户端单方面决定真人抓捕结果。
