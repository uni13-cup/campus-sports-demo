<script setup>
import { computed, ref } from 'vue'
import { useRun } from '@/verify/useRun'

// 运动页：真实传感器核验 + 跑步控制
// 负责人：李浩阳
//
// 和第一版最大的区别：这里四个数字不再是本地计时器编出来的，
// 而是来自 useRun()——手机加速度传感器 50Hz 采样，判定通过才累计里程。
const run = useRun()
const {
  running,
  okKm,
  okSec,
  speed,
  cadence,
  verdict,
  sensorState,
  useSim,
  scenario,
  scenarios
} = run

const sports = ['校园跑', '户外行走', '体测模拟']
const activeSport = ref('校园跑')
const modes = ['目标跑', '自由跑', '课程跑', '自定义']
const activeMode = ref('自由跑')

const kmText = computed(() => okKm.value.toFixed(2))

const durationText = computed(() => {
  const t = Math.floor(okSec.value)
  const m = String(Math.floor(t / 60)).padStart(2, '0')
  const s = String(t % 60).padStart(2, '0')
  return `${m}:${s}`
})

// 配速由步频估出来的速度换算：60 / (公里每小时) = 每公里几分钟
const paceText = computed(() => {
  if (speed.value < 0.5) return `--'--"`
  const p = 60 / speed.value
  const mi = Math.floor(p)
  const se = String(Math.round((p - mi) * 60)).padStart(2, '0')
  return `${mi}'${se}"`
})

const kcalText = computed(() => Math.round(okKm.value * 62))

const sensorText = computed(() => {
  if (useSim.value) return '演示数据（模拟）'
  switch (sensorState.value) {
    case 'requesting':
      return '正在申请传感器权限…'
    case 'on':
      return '传感器已连接'
    case 'denied':
      return '未授权传感器'
    case 'nodata':
      return '本机没读到传感器'
    default:
      return '传感器待启动'
  }
})

const dotCls = computed(() => {
  if (useSim.value) return 'sim'
  return sensorState.value === 'on' ? 'on' : 'off'
})

const hintText = computed(() => {
  if (useSim.value) return '当前是演示数据（模拟），不会计入真实成绩。'
  if (sensorState.value === 'nodata') {
    return '电脑一般没有运动传感器，请换手机打开；也可以先切到「演示数据（模拟）」看效果。'
  }
  if (sensorState.value === 'denied') {
    return 'iPhone 需要 Safari 打开 https 页面才能授权传感器。'
  }
  return ''
})

function toggle() {
  if (running.value) run.stop()
  else run.start()
}

function pickScenario(key) {
  scenario.value = key
}
</script>

<template>
  <div class="page exercise-page">
    <!-- 数据板：配速做主数字，其余三个次之 -->
    <section class="dash" :class="verdict.cls">
      <div class="dash-top">
        <span>{{ useSim ? '演示数据 · 模拟' : '实时核验' }}</span>
        <span>{{ running ? `步频 ${cadence} 步/分` : '未开始' }}</span>
      </div>
      <div class="dash-pace">
        <strong>{{ paceText }}</strong>
        <span>配速 / 公里</span>
      </div>
      <div class="dash-nums">
        <div><strong>{{ kmText }}</strong><span>公里</span></div>
        <div><strong>{{ durationText }}</strong><span>时长</span></div>
        <div><strong>{{ kcalText }}</strong><span>千卡</span></div>
      </div>
      <div class="dash-verify">
        <span class="dot" :class="dotCls"></span>
        <span class="v-txt">{{ sensorText }}</span>
        <span class="judge" :class="verdict.cls">{{ verdict.txt }}</span>
      </div>
    </section>

    <p v-if="hintText" class="hint">{{ hintText }}</p>

    <!-- 动作行 -->
    <div class="action-row">
      <button class="mini-btn">🎵<span>音乐</span></button>
      <button class="run-btn" :class="{ running }" @click="toggle">
        {{ running ? '结束跑步' : '开始跑步' }}
      </button>
      <button class="mini-btn">🎒<span>装备</span></button>
    </div>

    <!-- 数据源：真实传感器 / 演示数据 -->
    <div class="src-row">
      <button class="src-btn" :class="{ active: !useSim }" @click="run.toggleSim(false)">
        真实传感器
      </button>
      <button class="src-btn" :class="{ active: useSim }" @click="run.toggleSim(true)">
        演示数据（模拟）
      </button>
    </div>
    <div v-if="useSim" class="chips scenario-chips">
      <button
        v-for="s in scenarios"
        :key="s.key"
        class="chip"
        :class="{ active: scenario === s.key }"
        @click="pickScenario(s.key)"
      >{{ s.label }}</button>
    </div>

    <!-- 原理入口 -->
    <router-link to="/verify" class="verify-link card">
      <span class="vl-icon">🛡️</span>
      <div class="vl-text">
        <strong>这一步是怎么判出来的？</strong>
        <p>加速度波形 → 自相关找步频 → 五类判定，点开看原理和实时波形</p>
      </div>
      <span class="vl-arrow">›</span>
    </router-link>

    <!-- 运动类型 + 跑步模式 -->
    <section class="card setup-card">
      <div class="setup-row">
        <span class="setup-label">运动</span>
        <div class="chips">
          <button
            v-for="s in sports"
            :key="s"
            class="chip"
            :class="{ active: activeSport === s }"
            @click="activeSport = s"
          >{{ s }}</button>
        </div>
      </div>
      <div class="setup-row">
        <span class="setup-label">模式</span>
        <div class="chips">
          <button
            v-for="m in modes"
            :key="m"
            class="chip"
            :class="{ active: activeMode === m }"
            @click="activeMode = m"
          >{{ m }}</button>
        </div>
      </div>
    </section>

    <!-- 工具行 -->
    <section class="card tools">
      <button class="tool"><span>🛰️</span>GPS 轨迹</button>
      <button class="tool"><span>👥</span>组队开跑</button>
      <button class="tool"><span>🗺️</span>路线推荐</button>
    </section>
  </div>
</template>

<style scoped>
.exercise-page {
  padding-top: 14px;
}

/* ===== 数据板 ===== */
.dash {
  position: relative;
  overflow: hidden;
  border-radius: 22px;
  padding: 16px 18px 14px;
  color: #fff;
  background: linear-gradient(155deg, #14544d 0%, #0d3b37 55%, #0f2f2c 100%);
  box-shadow: 0 10px 26px rgba(15, 47, 44, 0.22);
  transition: box-shadow 0.25s;
}
.dash::after {
  content: '';
  position: absolute;
  width: 240px;
  height: 240px;
  right: -80px;
  top: -120px;
  background: radial-gradient(circle, rgba(23, 201, 174, 0.5), rgba(23, 201, 174, 0) 70%);
  pointer-events: none;
}
.dash.ok {
  box-shadow: 0 10px 26px rgba(14, 163, 148, 0.36);
}
.dash.bad {
  box-shadow: 0 10px 26px rgba(239, 68, 68, 0.28);
}
.dash-top {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.66);
}
.dash-pace {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin: 10px 0 6px;
}
.dash-pace strong {
  font-size: 46px;
  font-weight: 800;
  letter-spacing: -1px;
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
}
.dash-pace span {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
}
.dash-nums {
  position: relative;
  display: flex;
  gap: 28px;
  padding-bottom: 12px;
}
.dash-nums div {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.dash-nums strong {
  font-size: 19px;
  font-variant-numeric: tabular-nums;
}
.dash-nums span {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.55);
}
.dash-verify {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 11px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 12px;
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #94a3a0;
  flex-shrink: 0;
}
.dot.on {
  background: #2ee6a8;
  box-shadow: 0 0 0 3px rgba(46, 230, 168, 0.18);
}
.dot.sim {
  background: #fbbf24;
}
.dot.off {
  background: #f87171;
}
.v-txt {
  color: rgba(255, 255, 255, 0.7);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.judge {
  margin-left: auto;
  flex-shrink: 0;
  white-space: nowrap;
  padding: 3px 10px;
  border-radius: 999px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.75);
  background: rgba(255, 255, 255, 0.12);
}
.judge.ok {
  background: rgba(46, 230, 168, 0.22);
  color: #6ff0c8;
}
.judge.bad {
  background: rgba(248, 113, 113, 0.22);
  color: #ffb4b4;
}

/* ===== 提示 ===== */
.hint {
  margin-top: 10px;
  font-size: 12px;
  line-height: 1.6;
  color: #9a5b16;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  border-radius: 10px;
  padding: 8px 12px;
}

/* ===== 动作行 ===== */
.action-row {
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.mini-btn {
  width: 56px;
  height: 52px;
  flex-shrink: 0;
  border: 1px solid var(--color-border);
  background: var(--color-white);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 17px;
}
.mini-btn span {
  font-size: 10px;
  color: var(--color-text-light);
}
.run-btn {
  flex: 1;
  height: 52px;
  border: none;
  border-radius: 14px;
  background: linear-gradient(135deg, #14c8ae, var(--color-primary-dark));
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
  box-shadow: 0 8px 18px rgba(7, 120, 109, 0.28);
}
.run-btn.running {
  background: linear-gradient(135deg, #f87171, #dc2626);
  box-shadow: 0 8px 18px rgba(220, 38, 38, 0.26);
}

/* ===== 数据源 ===== */
.src-row {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}
.src-btn {
  border: 1px solid var(--color-border);
  background: var(--color-white);
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 12px;
  color: var(--color-text-light);
}
.src-btn.active {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: var(--color-primary-light);
  font-weight: 600;
}
.scenario-chips {
  margin-top: 10px;
}

/* ===== 原理入口 ===== */
.verify-link {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--color-text);
}
.vl-icon {
  font-size: 20px;
}
.vl-text {
  flex: 1;
  min-width: 0;
}
.vl-text strong {
  font-size: 14px;
}
.vl-text p {
  font-size: 11px;
  color: var(--color-text-light);
  margin-top: 3px;
  line-height: 1.5;
}
.vl-arrow {
  font-size: 20px;
  color: var(--color-text-light);
}

/* ===== 运动 / 模式 ===== */
.setup-card {
  margin-top: 14px;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.setup-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.setup-label {
  width: 30px;
  flex-shrink: 0;
  font-size: 12px;
  color: var(--color-text-light);
}
.setup-row .chips {
  flex: 1;
  min-width: 0;
}

/* ===== 工具行 ===== */
.tools {
  margin-top: 12px;
  display: flex;
  padding: 12px 8px;
}
.tool {
  flex: 1;
  border: none;
  background: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--color-text);
}
.tool span {
  font-size: 18px;
}
</style>
