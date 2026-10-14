<!--
  快跑 · 真实跑步与防作弊核验
  负责人：李浩阳
  位置：src/views/verify/VerifyView.vue
  路由：/verify
  说明：核验逻辑在 src/verify/ 下，页面只负责展示和交互
-->
<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRun } from '../../verify/useRun'

const run = useRun()
const canvasRef = ref(null)

const paceText = computed(() => {
  if (!run.speed.value) return '--'
  const min = 60 / run.speed.value
  const m = Math.floor(min)
  const s = Math.round((min - m) * 60)
  return m + "'" + String(s).padStart(2, '0') + '"'
})

const envTip = computed(() => {
  if (run.isIOS() && !run.isSecure()) {
    return '检测到 iPhone：本地 http 地址读不到传感器，请用 https 打开（Netlify 地址），并且用 Safari。'
  }
  if (run.isIOS() && !run.isSafari()) {
    return '检测到 iPhone：请改用 Safari 打开，其他浏览器读不到运动传感器。'
  }
  if (!run.isSecure()) {
    return '当前不是 https（也不是 localhost）：手机浏览器会拒绝提供传感器数据。'
  }
  if (run.sensorState.value === 'nodata') {
    return '已开启传感器但 3 秒没读到数据：这台设备可能没有运动传感器，可以切到「演示数据」看判定过程。'
  }
  if (run.sensorState.value === 'denied') {
    return '传感器权限被拒绝。可以在浏览器设置里重新允许，或先切到「演示数据」。'
  }
  return ''
})

const settle = computed(() => ({
  km: run.okKm.value.toFixed(3),
  sec: Math.round(run.okSec.value),
  pace: paceText.value
}))

function draw() {
  const cv = canvasRef.value
  if (!cv) return
  const dpr = window.devicePixelRatio || 1
  const w = cv.clientWidth
  const h = cv.clientHeight
  if (!w || !h) return
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
    cv.width = Math.round(w * dpr)
    cv.height = Math.round(h * dpr)
  }
  const cx = cv.getContext('2d')
  cx.setTransform(dpr, 0, 0, dpr, 0, 0)
  cx.clearRect(0, 0, w, h)

  // 中线
  cx.strokeStyle = '#e0e7ee'
  cx.lineWidth = 1
  cx.beginPath()
  cx.moveTo(0, h / 2)
  cx.lineTo(w, h / 2)
  cx.stroke()

  const data = run.wave.value
  if (!data || data.length < 2) return
  const step = w / data.length
  const maxA = 8
  cx.beginPath()
  for (let i = 0; i < data.length; i++) {
    const x = i * step
    const y = h / 2 - (data[i] / maxA) * (h / 2 - 6)
    if (i) cx.lineTo(x, y)
    else cx.moveTo(x, y)
  }
  cx.strokeStyle = run.verdict.value.ok ? '#2fa87c' : '#ef5b6b'
  cx.lineWidth = 2
  cx.lineJoin = 'round'
  cx.stroke()
}

watch(() => run.wave.value, draw)
onMounted(draw)
</script>

<template>
  <div class="page verify-page">
    <router-link class="back" to="/home">← 返回首页</router-link>

    <h1 class="title">🏃 真实跑步 · 防作弊核验</h1>
    <p class="lead">手机握在手里跑几步，它自己判断你是真跑、站着不动，还是在摇手机。</p>

    <p v-if="envTip" class="tip">{{ envTip }}</p>

    <div class="grid">
      <div class="stat">
        <strong>{{ run.cadence.value || '--' }}</strong>
        <span>步频（步/分）</span>
      </div>
      <div class="stat">
        <strong>{{ run.speed.value.toFixed(1) }}</strong>
        <span>速度（km/h）</span>
      </div>
      <div class="stat">
        <strong>{{ settle.km }}</strong>
        <span>有效里程（km）</span>
      </div>
      <div class="stat">
        <strong>{{ paceText }}</strong>
        <span>配速（分/公里）</span>
      </div>
    </div>

    <div class="verdict" :class="run.verdict.value.cls">
      {{ run.verdict.value.txt }}
    </div>

    <div class="card">
      <div class="card-head">
        <span>加速度波形（最近 2 秒）</span>
        <span class="muted">规律=跑步　杂乱=摇手机</span>
      </div>
      <canvas ref="canvasRef" class="wave"></canvas>
    </div>

    <div class="card">
      <div class="card-head"><span>本次核验统计</span></div>
      <div class="counts">
        <span class="c-ok">通过 {{ run.stats.value.pass }}</span>
        <span class="c-bad">静止 {{ run.stats.value.still }}</span>
        <span class="c-bad">摇手机 {{ run.stats.value.shake }}</span>
        <span class="c-bad">乘车存疑 {{ run.stats.value.vehicle }}</span>
        <span class="c-warn">待复核 {{ run.stats.value.unknown }}</span>
      </div>
      <p class="muted small">只有判定「通过」的时间才会累计里程，所以不动就不会涨。</p>
    </div>

    <div class="actions">
      <button v-if="!run.running.value" class="btn primary" @click="run.start()">开始</button>
      <button v-else class="btn danger" @click="run.stop()">停止</button>
    </div>

    <div class="card">
      <div class="card-head"><span>数据源</span></div>
      <div class="switch">
        <button class="chip" :class="{ on: !run.useSim.value }" @click="run.toggleSim(false)">真实传感器</button>
        <button class="chip" :class="{ on: run.useSim.value }" @click="run.toggleSim(true)">演示数据（模拟）</button>
      </div>
      <div v-if="run.useSim.value" class="scenarios">
        <button
          v-for="s in run.scenarios"
          :key="s.key"
          class="chip small"
          :class="{ on: run.scenario.value === s.key }"
          @click="run.scenario.value = s.key"
        >
          {{ s.label }}
        </button>
        <p class="muted small">演示数据是代码生成的波形，用来在没有传感器的设备上讲解判定过程，不是真实运动记录。</p>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><span>它怎么判的</span></div>
      <p class="small">
        手机加速度以 50Hz 采样，每次只看最近 100 个点（2 秒）。用自相关找出这段波形里最规律的重复周期，
        换算成步频，再由步频估算速度，最后交叉判定：波形太平 → 静止；速度高但波形没规律 → 乘车/骑行；
        速度几乎为零但抖得厉害 → 摇手机；步频和规律性都达标 → 跑步通过。
      </p>
      <p class="muted small">
        全程不读取位置、不上传服务器，只在本机计算。速度由步频估算，不是 GPS，精度有限——这是为了免授权、
        室内可用刻意做的取舍。
      </p>
    </div>

    <p class="footnote">概念原型 · 判定为阈值判定，用于演示真实性校验思路</p>
  </div>
</template>

<style scoped>
.verify-page { padding-bottom: 48px; }
.back { display: inline-block; font-size: 14px; color: var(--color-text-light); margin-bottom: 14px; }
.title { font-size: 24px; color: var(--color-primary); }
.lead { font-size: 14px; line-height: 1.7; color: var(--color-text); margin-top: 8px; }
.tip { margin-top: 14px; background: #fff7e6; color: #8a6100; font-size: 13px; line-height: 1.7; padding: 12px 14px; border-radius: var(--radius); }
.grid { margin-top: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.stat { background: var(--color-white); border-radius: var(--radius); box-shadow: var(--shadow); padding: 14px 12px; text-align: center; }
.stat strong { display: block; font-size: 22px; color: var(--color-primary); }
.stat span { display: block; font-size: 12px; color: var(--color-text-light); margin-top: 4px; }
.verdict { margin-top: 14px; text-align: center; font-size: 16px; font-weight: 700; padding: 14px; border-radius: var(--radius); background: #eef1f7; color: #5b6270; }
.verdict.ok { background: #e5f7f0; color: #1f7a5a; }
.verdict.bad { background: #ffeaea; color: #c2352f; }
.card { background: var(--color-white); border-radius: var(--radius); box-shadow: var(--shadow); padding: 14px 16px; margin-top: 14px; }
.card-head { display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; font-weight: 600; color: var(--color-accent); margin-bottom: 10px; }
.wave { width: 100%; height: 120px; display: block; background: #f8fafc; border-radius: 8px; }
.counts { display: flex; flex-wrap: wrap; gap: 8px; }
.counts span { font-size: 12px; padding: 4px 10px; border-radius: 999px; }
.c-ok { background: #e5f7f0; color: #1f7a5a; }
.c-bad { background: #ffeaea; color: #c2352f; }
.c-warn { background: #eef1f7; color: #5b6270; }
.muted { color: var(--color-text-light); font-weight: 400; }
.small { font-size: 13px; line-height: 1.7; }
.actions { margin-top: 16px; }
.btn { width: 100%; border: none; border-radius: var(--radius); padding: 15px; font-size: 16px; font-weight: 700; color: #fff; }
.btn.primary { background: var(--color-primary); }
.btn.danger { background: #c2352f; }
.switch { display: flex; gap: 8px; flex-wrap: wrap; }
.chip { border: 1px solid var(--color-border); background: #fff; color: var(--color-text); border-radius: 999px; padding: 7px 14px; font-size: 13px; }
.chip.on { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
.chip.small { padding: 5px 11px; font-size: 12px; }
.scenarios { margin-top: 12px; display: flex; flex-wrap: wrap; gap: 8px; }
.scenarios p { flex: 1 0 100%; }
.footnote { margin-top: 16px; text-align: center; font-size: 12px; color: var(--color-text-light); }
</style>