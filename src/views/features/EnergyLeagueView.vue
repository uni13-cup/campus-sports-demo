<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
const back = () => router.push('/')

// —— 模拟案例可交互部分：对应「怎么玩」三步 ——
// 1) 合格跑步折算能量（每公里 10 能量）2) 进入 A 队公共池 3) 兑换校园权益
const pool = ref(22.5) // 沿用原模拟案例的初始值
const logs = ref([])

const rewards = [
  { name: '体育馆 1 小时', cost: 20 },
  { name: '食堂套餐券', cost: 15 },
  { name: '打印额度 50 张', cost: 10 }
]

function simulateRun() {
  const km = 3 + Math.floor(Math.random() * 4) // 3~6 公里
  const gain = km * 10
  pool.value = +(pool.value + gain).toFixed(1)
  logs.value.unshift(`合格跑步 ${km} 公里，能量 +${gain}，已入 A 队公共池`)
}

function redeem(reward) {
  if (pool.value < reward.cost) return
  pool.value = +(pool.value - reward.cost).toFixed(1)
  logs.value.unshift(`兑换「${reward.name}」，能量 -${reward.cost}`)
}
</script>

<template>
  <div class="page feature-page">
    <button class="back-btn" @click="back">← 返回首页</button>
    <h1 class="title">⚡ 能量消费联盟</h1>
    <div class="badge">概念原型 · 非已上线服务</div>

    <p class="lead">跑步攒下的能量，能在校园里花出去。</p>

    <div class="section">
      <h2>它解决什么问题</h2>
      <p>积分只是屏幕上的一个数字，攒到最后也没想过它能拿来干嘛，自然就没有拉力。</p>
    </div>

    <div class="section">
      <h2>怎么玩</h2>
      <ol class="steps">
        <li>每次合格跑步折算成能量值</li>
        <li>能量进入队伍公共池，全队共享</li>
        <li>攒够之后兑换体育馆时段、食堂券、打印额度</li>
      </ol>
    </div>

    <div class="section">
      <h2>模拟案例 <span class="sim-tag">可点击体验</span></h2>
      <div class="case-card">
        <div class="case-row"><span>🏃 本周累计</span><span>{{ pool }} 能量</span></div>
        <div class="case-row"><span>👥 归属</span><span>A 队公共池</span></div>
        <div class="case-row redeem-row">
          <span>🎁 可兑换</span>
          <span class="reward-btns">
            <button
              v-for="r in rewards"
              :key="r.name"
              class="reward-btn"
              :disabled="pool < r.cost"
              @click="redeem(r)"
            >{{ r.name }} · {{ r.cost }}</button>
          </span>
        </div>
      </div>
      <button class="sim-btn" @click="simulateRun">🏃 模拟一次合格跑步（3～6 公里，每公里折算 10 能量）</button>
      <ul v-if="logs.length" class="sim-log">
        <li v-for="(text, i) in logs.slice(0, 3)" :key="i">{{ text }}</li>
      </ul>
      <p class="note-line">以上为模拟数据，用于说明兑换流程，非真实权益。</p>
    </div>

    <div class="section">
      <h2>设计依据</h2>
      <p>游戏化干预的元分析结果显示，单纯的个人积分奖励效果有限，团队挑战与排行榜带来的行为改变更大。所以这里把能量设计成队伍公共池，而不是个人钱包。</p>
    </div>
  </div>
</template>

<style scoped>
.feature-page { padding-bottom: 48px; }
.back-btn { all: unset; cursor: pointer; color: var(--color-text-light); font-size: 14px; margin-bottom: 16px; }
.title { font-size: 24px; color: var(--color-primary); }
.badge { display: inline-block; background: var(--color-primary-light); color: var(--color-accent); font-size: 12px; padding: 4px 10px; border-radius: 20px; margin-top: 8px; }
.lead { font-size: 15px; line-height: 1.7; color: var(--color-text); margin-top: 14px; }
.section { margin-top: 24px; }
.section h2 { font-size: 16px; color: var(--color-accent); margin-bottom: 10px; }
.section p { font-size: 14px; line-height: 1.7; color: var(--color-text); }
.steps { list-style: none; counter-reset: s; }
.steps li { position: relative; padding-left: 30px; font-size: 14px; line-height: 1.7; color: var(--color-text); margin-bottom: 10px; }
.steps li:last-child { margin-bottom: 0; }
.steps li::before { counter-increment: s; content: counter(s); position: absolute; left: 0; top: 3px; width: 20px; height: 20px; border-radius: 50%; background: var(--color-primary-light); color: var(--color-primary); font-size: 12px; font-weight: 700; text-align: center; line-height: 20px; }
.case-card { background: var(--color-white); border-radius: var(--radius); box-shadow: var(--shadow); padding: 8px 0; }
.case-row { display: flex; justify-content: space-between; gap: 12px; padding: 12px 16px; font-size: 14px; border-bottom: 1px solid var(--color-border); }
.case-row:last-child { border-bottom: none; }
.note-line { font-size: 12px; color: var(--color-text-light); margin-top: 10px; }

/* —— 模拟案例交互（新增，不动原有样式）—— */
.sim-tag { font-size: 11px; font-weight: 500; color: var(--color-primary); background: var(--color-primary-light); border-radius: 999px; padding: 2px 8px; vertical-align: 2px; }
.redeem-row { align-items: center; }
.reward-btns { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
.reward-btn { border: 1px solid var(--color-border); background: var(--color-primary-light); color: var(--color-primary-dark); font-size: 12px; border-radius: 999px; padding: 4px 10px; cursor: pointer; }
.reward-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.sim-btn { margin-top: 10px; width: 100%; border: none; border-radius: 12px; padding: 10px; background: var(--color-primary); color: #fff; font-size: 13px; cursor: pointer; }
.sim-log { margin: 10px 0 0; padding: 10px 14px; list-style: none; background: var(--color-white); border-radius: var(--radius); box-shadow: var(--shadow); font-size: 12px; color: var(--color-text-light); }
.sim-log li { padding: 3px 0; }
</style>