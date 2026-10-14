// 快跑 · 真实性核验（纯计算模块，不碰 DOM，可以单独跑测试）
// 负责人：李浩阳
//
// 一句话原理：手机加速度传感器以 50Hz 采样，每次只看最近 100 个点（2 秒窗口），
// 用「自相关」找出这 2 秒里重复得最规律的那个周期，换算成步频；
// 再用步频估速度，最后拿「波形规律性 + 动作强度 + 速度」三个信号交叉判定。
//
// 为什么不读 GPS：定位精度不够、室内没信号、还需要额外授权。
// 这里全程不采集位置、不上传数据。

export const HZ = 50        // 采样率：每秒 50 个点
export const WIN = 100      // 滑动窗口长度：100 点 = 2 秒
export const DT = 1 / HZ    // 两次采样之间的时间间隔
export const STRIDE = 0.95  // 步幅估算系数（米/步）

// 自相关搜索的周期范围：14~50 个采样点
// 对应步频 = 60*HZ/lag，即 60 步/分（lag=50）到 214 步/分（lag=14）
const LAG_MIN = 14
const LAG_MAX = 50

/**
 * 分析一段加速度波形，返回 { sd, p, cad }
 * sd  ：波动强度，用来区分「静止」和「在动」
 * p   ：周期强度 0~1，越接近 1 说明动作越规律（跑步走路高，摇手机骑车低）
 * cad ：估算出的步频（步/分）
 */
export function analyze(w) {
  const n = w.length
  if (n < 20) return null

  // 1. 去均值：后面只看波动，不看绝对大小
  let m = 0
  for (let i = 0; i < n; i++) m += w[i]
  m /= n

  // 2. 方差：波动大不大
  let r0 = 0
  for (let i = 0; i < n; i++) r0 += (w[i] - m) * (w[i] - m)
  const sd = Math.sqrt(r0 / n)

  // 3. 自相关：把信号和自己平移 lag 个点后逐点相乘求平均。
  //    平移量刚好等于一个步周期时，两段波形最重合，得分最高。
  let best = 0
  let lag0 = 0
  const ac = {}
  for (let lag = LAG_MIN; lag <= LAG_MAX; lag++) {
    let ss = 0
    for (let j = lag; j < n; j++) ss += (w[j] - m) * (w[j - lag] - m)
    ss /= n - lag
    ac[lag] = ss
    if (ss > best) best = ss
  }

  // 4. 取「最小的合格周期」，防止把两倍周期当成周期。
  //    踩过的坑：真实步频 176 步/分，误判成 88，就是因为取了峰值而不是最小合格值。
  for (let lag = LAG_MIN; lag <= LAG_MAX; lag++) {
    if (ac[lag] >= 0.85 * best) {
      lag0 = lag
      break
    }
  }

  // 5. 归一化：best 除以方差，得到与幅度无关的纯规律性指标
  const p = r0 > 0 ? best / (r0 / n) : 0

  // 6. 换算步频：一个周期 lag0 个采样点，每点 1/50 秒
  const cad = lag0 ? 60 / (lag0 / HZ) : 0

  return { sd, p, cad }
}

/** 步频估速度：步频/60 = 每秒步数，×步幅 = 米/秒，×3.6 = 公里/小时 */
export function speedFromCadence(cad) {
  return (cad / 60) * STRIDE * 3.6
}

/**
 * 判定：返回 { ok, txt, cls }
 * ok 为 false 表示这次数据不计入成绩，也就是「作弊没收益」
 *
 * 阈值说明（现场被问可以答）：
 * - sd < 0.2      完全不动，静止
 * - speed > 12    超过 12 km/h 且没有规律周期 → 多半是乘车/骑行
 * - speed < 1 且波动很大 → 原地摇手机
 * - 步频 ≥ 140 且 p ≥ 0.6 → 跑步
 * - 步频 ≥ 70  且 p ≥ 0.55 → 走路（低分通过）
 */
export function classify(f, speed) {
  if (!f) return { ok: false, txt: '采样中…', cls: '' }
  if (f.sd < 0.2) return { ok: false, txt: '静止 · 不计入', cls: 'bad' }
  if (speed > 12 && f.p < 0.5) return { ok: false, txt: '乘车 / 骑行 · 不计入', cls: 'bad' }
  if (speed < 1 && f.sd > 2.5) return { ok: false, txt: '摇手机 · 不计入', cls: 'bad' }
  if (f.cad >= 140 && f.p >= 0.6) return { ok: true, txt: '跑步 · 核验通过', cls: 'ok' }
  if (f.cad >= 70 && f.p >= 0.55) return { ok: true, txt: '走路 · 通过（低分）', cls: 'ok' }
  return { ok: false, txt: '信号存疑 · 待复核', cls: '' }
}