# 校园猫鼠大作战 3.0 开发计划

> 负责人：张慧雯
> 开发分支：`codex/catmouse-v3-dual-role`
> 基线：`origin/master@f020bbe`
> 定位声明：本版本仍是单机模拟定位 Demo，不接入真实 GPS、后端或多人联机。

## 一、基线审查

### 已有能力（2.1及后续修复）

- MapLibre GL JS 渲染本地 OpenStreetMap GeoJSON；运行时不依赖在线瓦片，保留 ODbL 署名。
- 校园数据共146个 OSM 要素，活动区内包含13个建筑障碍；公开数据中已有行政楼、第一/第二教学楼、图书馆、第一/第二/第三食堂、校医院等具名建筑。
- 地图支持缩放、旋转、倾斜、玩家跟随、自由视角、全局视角、轻量模式和碰撞调试。
- 游戏采用模拟米制坐标、30Hz固定时间步、连续输入、扫掠碰撞和统一 `players` 状态。
- NPC复用42节点本地道路图、A*寻路和定时重规划；电脑鼠路线可按对局种子变化。
- 现有模式为1只玩家猫追捕5只AI老鼠；80米内即时抓捕最近一只，并避免同次接触批量转换。
- 现有逻辑测试55/55通过，Vite生产构建通过。

### 尚未实现或当前存在的问题

- 当前只有 `/game/play` 对战路由；独立游戏大厅和结果页已在后续平台合并中移除。
- 趣味玩法卡片直接进入对战，不能选择猫/鼠阵营。
- 引擎只能按“玩家猫+5只AI鼠”创建角色，不能创建“玩家鼠+AI猫+4只AI鼠”。
- 当前自动抓捕只允许玩家猫触发，无法满足鼠模式下AI猫抓捕玩家和AI鼠。
- `updateNavigatingAi()` 尚未显式阻止AI猫在躲藏阶段寻路。
- 地图已保存可靠OSM名称，但当前不渲染地标文字。
- 建筑/水域碰撞仍是OSM几何外包矩形，不能宣称为真实轮廓碰撞。
- `npm run verify:game` 当前指向生产预览不存在的根路径，并仍检查已移除的结果页；旧验证产物不能作为当前基准。
- `src/game/INTEGRATION.md` 中部分旧描述与当前80米、单目标抓捕行为不一致，需要随3.0统一。

## 二、目标架构

```text
趣味玩法入口
   ↓
独立游戏大厅（选择阵营 / Demo房间 / 规则）
   ↓ sessionStorage仅保存本局设置
统一 GameState（mode + players + phase + events）
   ↓
固定步长模拟 → 玩家移动 → AI寻路 → 距离抓捕 → 阵营转换 → 结算
   ↓
MapLibre校园地图 + HUD + 轻量动画 + 独立结果页
```

- `players` 继续作为角色唯一数据源，地图只负责渲染。
- 在 `GameState` 中增加明确的初始阵营/模式字段，不建立第二套猫模式、鼠模式引擎。
- 抓捕统一为按猫鼠配对记录接触状态，避免重复抓捕；猫模式保留当前已确认的单目标即时抓捕体验。
- 大厅设置和结算快照只使用 `sessionStorage`，不伪装成真实房间或联网状态。

## 三、四阶段实施计划

### P1：校园地图优化与验收基线修复

目标：在不更换地图引擎和数据源的前提下，提高校园辨识度并恢复可信浏览器验收。

涉及文件：

- `src/views/game/components/CampusMap.vue`
- `src/game/data/campus-data.js`（只读取现有OSM属性，不手工篡改原始数据）
- 可新增 `src/game/landmarks.js` 与对应测试
- `scripts/verify-campus-map.mjs`
- `package.json`

实现方案：

- 从本地OSM要素中筛选已有 `name` 的校园建筑，生成少量主要地标标签；不添加数据中不存在的名称、位置和楼高。
- 优化初始活动区视角、道路/运动区/建筑的颜色和层级，同时保留三种镜头模式、轻量模式和移动端布局。
- 修正生产预览子路径和过时结果页造成的验收脚本问题；P1只验证当前对战页，结果页检查在P4恢复。
- 保留模拟定位、示意楼高、近似碰撞和OSM许可说明。

验收：地图、角色、地标、碰撞调试、镜头控制、移动端和断网场景正常；逻辑测试、构建、浏览器验收全部通过。

### P2：独立游戏大厅

目标：从趣味玩法进入独立大厅，选择阵营后再开始比赛。

涉及文件：

- 新增 `src/views/game/GameLobbyView.vue`
- 新增 `src/game/game-session.js` 及测试
- `src/router/index.js`
- `src/views/play/PlayView.vue`（仅修改猫鼠卡片入口）
- `scripts/verify-campus-map.mjs`

实现方案：

- 新增 `/game` 大厅路由；保留 `/game/play` 对战路由兼容旧链接。
- 大厅展示规则、猫/鼠阵营、郑东校区地图名、6名模拟角色和“Demo模拟房间”声明。
- 角色选择写入会话级设置；开始按钮进入对战页。
- 不创建服务器、房间号匹配、在线玩家或虚假联网状态。

验收：趣味玩法→大厅→选阵营→比赛链路正确；旧 `/game/play` 仍可进入默认猫模式；其他平台页面和主导航不受影响。

### P3：猫鼠双阵营规则

目标：同一套引擎完整支持玩家猫和玩家鼠。

涉及文件：

- `src/game/config.js`
- `src/game/engine.js` / `engine.test.js`
- `src/game/simulation.js` / `simulation.test.js`
- `src/game/navigation.js` / `navigation.test.js`
- `src/game/capture.js` / `capture.test.js`
- `src/views/game/GameMapView.vue`
- `src/views/game/components/CampusMap.vue`

实现方案：

- `initGame({ humanRole })`：猫模式创建1只玩家猫+5只AI鼠；鼠模式创建1只玩家鼠+1只AI猫+4只AI鼠。
- 躲藏阶段允许玩家鼠和AI鼠移动，AI猫保持静止且不能抓捕。
- 追捕阶段AI猫使用既有A*追逐最近老鼠；老鼠继续按道路图选安全目标。
- 抓捕以实时模拟距离为准；玩家鼠被抓后保留 `controller: 'human'` 并转为玩家猫，继续参加比赛。
- AI鼠被抓后转为AI猫；使用猫鼠配对接触记录防止同一接触重复转换。
- 胜负仍由“全部老鼠被抓”或“倒计时结束仍有老鼠”决定，与玩家当前阵营分开记录。
- HUD、移动限制、最近威胁和说明根据玩家当前角色切换，不复制第二套页面。

新增验收测试：

- 两种阵营的初始化人数与控制器正确。
- 玩家鼠可在躲藏阶段移动，AI猫不能移动或抓捕。
- AI猫在追捕阶段能抓AI鼠和玩家鼠。
- 玩家鼠被抓后变为玩家控制猫并继续移动。
- 一次接触不重复抓捕，全部抓获与超时结算正确。
- 两种模式都能以确定性模拟完成完整对局。

### P4：抓捕动画、音效和结果页

目标：增强反馈但不改变判定时机和准确性。

涉及文件：

- `src/views/game/GameMapView.vue`
- `src/views/game/components/CampusMap.vue`
- 新增 `src/views/game/GameResultView.vue`
- `src/game/result-store.js` / `result-store.test.js`
- `src/router/index.js`
- `scripts/verify-campus-map.mjs`

实现方案：

- 使用现有事件队列驱动轻量抓捕闪光、角色转换脉冲和阶段切换提示，不在动画回调中执行规则判定。
- 为接近、抓捕、转换、阶段切换和结算使用短Web Audio提示，继续保留静音。
- 恢复独立 `/game/result`，展示选择阵营、最终身份、抓捕数、存活鼠、胜负和模拟定位声明。
- 结算页提供再来一局、返回大厅和返回趣味玩法；不保存精细轨迹。
- 扩展浏览器验收覆盖大厅选择、猫模式、鼠模式、移动端、离线和结果恢复。

验收：动画与音效不延迟抓捕；移动端操作流畅；两种阵营结算正确；结果页刷新后在TTL内可恢复。

## 四、阶段执行与提交

每阶段执行：分析→最小实现→测试→自查差异→修复→重新测试→阶段提交。

建议提交：

1. `docs(game): plan catmouse v3 dual-role upgrade`
2. `feat(game): improve campus map landmarks and verification`
3. `feat(game): add standalone demo lobby`
4. `feat(game): support player cat and mouse roles`
5. `feat(game): add capture feedback and result flow`
6. `docs(game): record catmouse v3 acceptance`

任何阶段测试失败都不进入下一阶段。所有提交只进入 `codex/catmouse-v3-dual-role`，不直接提交或合并 `master`。

## 五、测试与验收标准

每个阶段至少运行：

```powershell
npm run test:game
npm run build
npm run preview -- --host 127.0.0.1
npm run verify:game
```

最终浏览器验收至少覆盖：

- 桌面与390×844移动端。
- 本地OSM地图、署名、地标、建筑、道路、运动区和活动边界。
- 跟随/自由/全局镜头以及缩放、旋转、倾斜。
- 猫模式完整流程和鼠模式完整流程。
- 玩家鼠躲藏、AI猫追逐、玩家阵营转换。
- 单目标抓捕、无重复转换、倒计时和胜负结算。
- 断网运行时无空白地图、无外部地图请求、无运行时异常。

## 六、风险与回退

| 风险 | 控制方式 | 回退方式 |
|---|---|---|
| OSM名称或位置不足 | 只显示当前本地数据已有名称；不足则少显示，不猜测 | 回退P1提交，保留2.1无标签地图 |
| 鼠模式破坏猫模式 | 用 `humanRole` 参数扩展统一状态并保留猫模式回归测试 | 回退P3提交，不影响P1/P2 |
| AI猫躲藏期误追捕 | 在导航和抓捕两层同时限制阶段，并增加测试 | 回退对应导航/抓捕提交 |
| 转换后控制权丢失 | 控制器与阵营分字段；玩家转换只改角色不改控制器 | 通过角色转换测试锁定 |
| 动画影响规则 | 动画只消费事件，不写规则状态 | 关闭P4视觉层即可恢复逻辑 |
| 平台路由冲突 | 仅新增 `/game`、`/game/result`，保留 `/game/play` | 回退P2/P4路由提交 |
| 生产预览子路径错误 | 验证脚本统一基于配置URL生成导航地址 | 回退脚本变更并保留测试证据 |

## 七、完成定义

- 猫阵营和鼠阵营均可从大厅选择并完成一局。
- 地图、本地降级、移动、碰撞、A*、抓捕、转换、结算和移动端全部通过测试。
- 不修改猫鼠入口之外的其他平台业务逻辑。
- 不引入真实GPS、服务器、虚假在线房间或未经核验的校园信息。
- 生成 `docs/CAT_MOUSE_V3_REPORT.md`，记录代码、运行效果、测试证据和已知问题。
