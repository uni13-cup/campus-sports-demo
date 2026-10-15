<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

// 能量消费联盟：合格跑步 → 折算能量 → 进入队伍公共池 → 兑换校园权益
// 纯前端 Demo：所有数据写在本地，不连服务器、不产生真实权益
const router = useRouter()
const back = () => router.push('/play')

// 每公里折算 10 能量（对应「每次合格跑步折算成能量值」）
const ENERGY_PER_KM = 10

const pool = ref(120)            // A 队公共池初始能量
const myEarned = ref(0)          // 我本次会话贡献的能量
const running = ref(false)
const toast = ref('')
let toastTimer = null

// 可兑换权益（对应体育馆时段 / 食堂券 / 打印额度）
const goods = ref([
  { id: 'gym',    icon: '🏸', name: '体育馆场地 1 小时', desc: '羽毛球 / 篮球时段任选', cost: 120, count: 0 },
  { id: 'meal',   icon: '🍱', name: '食堂套餐券 1 张', desc: '校内食堂窗口通用', cost: 80, count: 0 },
  { id: 'print',  icon: '🖨️', name: '打印额度 50 张', desc: '图书馆自助打印', cost: 60, count: 0 },
  { id: 'swim',   icon: '🏊', name: '游泳馆单次票', desc: '本学期内有效', cost: 100, count: 0 }
])

const records = ref([])
const totalCost = computed(() =>
  goods.value.reduce((sum, g) => sum + g.count * g.cost, 0)
)

function showToast(text) {
  toast.value = text
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toast.value = '' }, 2200)
}

// 模拟一次合格跑步：3~6 公里，核验通过才折算能量
function simulateRun() {
  if (running.value) return
  running.value = true
  setTimeout(() => {
    const km = 3 + Math.floor(Math.random() * 4) // 3~6km
    const gained = km * ENERGY_PER_KM
    pool.value += gained
    myEarned.value += gained
    records.value.unshift({
      id: Date.now(),
      type: 'earn',
      icon: '🏃',
      title: `合格跑步 ${km} 公里`,
      detail: '核验通过 · 能量已入 A 队公共池',
      energy: `+${gained}`
    })
    running.value = false
    showToast(`本次跑步 ${km} 公里，获得 ${gained} 能量`)
  }, 1200)
}

function redeem(good) {
  if (pool.value < good.cost) {
    showToast('能量不足，去跑两圈再来吧')
    return
  }
  pool.value -= good.cost
  good.count += 1
  records.value.unshift({
    id: Date.now(),
    type: 'cost',
    icon: good.icon,
    title: `兑换 · ${good.name}`,
    detail: '凭码到对应商户核销（模拟）',
    energy: `-${good.cost}`
  })
  showToast(`兑换成功：${good.name}`)
}
</script>

<template>
  <div class="page feature-page">
    <button class="back-btn" @click="back">← 返回趣味玩法</button>
    <h1 class="title">⚡ 能量消费联盟</h1>
    <div class="badge">概念原型 · 非已上线服务</div>

    <p class="lead">跑步攒下的能量，能在校园里花出去。</p>

    <!-- 队伍公共池 -->
    <section class="pool-card">
      <div class="pool-top">
        <div>
          <span class="pool-label">A 队公共池</span>
          <strong class="pool-num">{{ pool }}<small> 能量</small></strong>
        </div>
        <button class="run-mini" :disabled="running" @click="simulateRun">
          {{ running ? '核验中…' : '🏃 模拟跑一次' }}
        </button>
      </div>
      <p class="pool-rule">合格跑步每公里折算 {{ ENERGY_PER_KM }} 能量，全队共享；本次我已贡献 {{ myEarned }} 能量</p>
    </section>

    <!-- 兑换商城 -->
    <div class="section-head">
      <h2>能量商城</h2>
      <span>已兑换 {{ totalCost }} 能量</span>
    </div>
    <div class="goods">
      <div v-for="g in goods" :key="g.id" class="good-card">
        <span class="good-icon">{{ g.icon }}</span>
        <div class="good-body">
          <strong>{{ g.name }}</strong>
          <span>{{ g.desc }}</span>
          <em v-if="g.count" class="owned">已兑换 ×{{ g.count }}</em>
        </div>
        <button
          class="redeem-btn"
          :class="{ poor: pool < g.cost }"
          @click="redeem(g)"
        >{{ g.cost }} ⚡</button>
      </div>
    </div>

    <!-- 能量流水 -->
    <div class="section-head">
      <h2>能量流水</h2>
    </div>
    <div class="records card-box">
      <p v-if="!records.length" class="empty">还没有记录，点上面「模拟跑一次」试试</p>
      <div v-for="r in records" :key="r.id" class="rec-row">
        <span class="rec-icon">{{ r.icon }}</span>
        <div class="rec-body">
          <strong>{{ r.title }}</strong>
          <span>{{ r.detail }}</span>
        </div>
        <span class="rec-energy" :class="r.type">{{ r.energy }}</span>
      </div>
    </div>

    <!-- 设计依据（保留概念说明） -->
    <details class="design">
      <summary>设计依据</summary>
      <p>游戏化干预的元分析显示，单纯的个人积分效果有限，团队挑战带来的行为改变更大。所以能量进入队伍公共池而不是个人钱包——一个人跑，全队受益。</p>
      <p class="disclaimer">＊所有能量与权益均为 Demo 模拟数据，不产生真实消费。</p>
    </details>

    <transition name="toast">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<style scoped>
.feature-page { padding-bottom: 48px; }
.back-btn { all: unset; cursor: pointer; color: var(--color-text-light); font-size: 14px; margin-bottom: 16px; }
.title { font-size: 24px; color: var(--color-primary); }
.badge { display: inline-block; background: var(--color-primary-light); color: var(--color-accent); font-size: 12px; padding: 4px 10px; border-radius: 20px; margin-top: 8px; }
.lead { font-size: 15px; line-height: 1.7; color: var(--color-text); margin: 14px 0 16px; }

/* 公共池 */
.pool-card {
  background: linear-gradient(140deg, #14c8ae, #07786d);
  color: #fff;
  border-radius: 18px;
  padding: 18px;
  box-shadow: 0 10px 22px rgba(7, 120, 109, 0.25);
}
.pool-top { display: flex; align-items: center; justify-content: space-between; }
.pool-label { display: block; font-size: 12px; opacity: 0.85; }
.pool-num { font-size: 34px; font-weight: 800; font-variant-numeric: tabular-nums; }
.pool-num small { font-size: 13px; font-weight: 500; opacity: 0.85; }
.run-mini {
  border: none; border-radius: 999px; padding: 9px 14px;
  background: #fff; color: var(--color-primary-dark);
  font-size: 13px; font-weight: 700; cursor: pointer;
}
.run-mini:disabled { opacity: 0.7; cursor: wait; }
.pool-rule { margin: 12px 0 0; font-size: 12px; line-height: 1.6; opacity: 0.9; }

/* 区块标题 */
.section-head { display: flex; align-items: baseline; justify-content: space-between; margin: 22px 0 10px; }
.section-head h2 { font-size: 16px; color: var(--color-text); }
.section-head span { font-size: 12px; color: var(--color-text-light); }

/* 商品 */
.goods { display: flex; flex-direction: column; gap: 10px; }
.good-card {
  display: flex; align-items: center; gap: 12px;
  background: var(--color-white); border: 1px solid var(--color-border);
  border-radius: var(--radius); box-shadow: var(--shadow); padding: 14px;
}
.good-icon {
  width: 44px; height: 44px; flex-shrink: 0;
  border-radius: 12px; background: var(--color-primary-light);
  display: flex; align-items: center; justify-content: center; font-size: 22px;
}
.good-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.good-body strong { font-size: 14.5px; color: var(--color-text); }
.good-body span { font-size: 12px; color: var(--color-text-light); }
.owned { color: var(--color-primary); font-style: normal; font-size: 12px; font-weight: 600; }
.redeem-btn {
  flex-shrink: 0; border: none; border-radius: 999px;
  padding: 8px 13px; font-size: 13px; font-weight: 700;
  background: var(--color-primary); color: #fff; cursor: pointer;
}
.redeem-btn.poor { background: #cbd5d2; cursor: not-allowed; }

/* 流水 */
.card-box {
  background: var(--color-white); border: 1px solid var(--color-border);
  border-radius: var(--radius); box-shadow: var(--shadow); padding: 4px 14px;
}
.empty { font-size: 13px; color: var(--color-text-light); text-align: center; padding: 18px 0; }
.rec-row { display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--color-border); }
.rec-row:last-child { border-bottom: none; }
.rec-icon { font-size: 20px; }
.rec-body { flex: 1; display: flex; flex-direction: column; gap: 1px; }
.rec-body strong { font-size: 13.5px; color: var(--color-text); }
.rec-body span { font-size: 11.5px; color: var(--color-text-light); }
.rec-energy { font-size: 14px; font-weight: 800; font-variant-numeric: tabular-nums; }
.rec-energy.earn { color: var(--color-primary); }
.rec-energy.cost { color: var(--color-accent); }

/* 设计依据 */
.design { margin-top: 22px; font-size: 13px; color: var(--color-text); }
.design summary { cursor: pointer; color: var(--color-accent); font-size: 14px; font-weight: 600; }
.design p { line-height: 1.7; margin: 10px 0 0; }
.disclaimer { color: var(--color-text-light); font-size: 12px; }

/* toast */
.toast {
  position: fixed; left: 50%; bottom: 36px; transform: translateX(-50%);
  background: rgba(15, 47, 44, 0.92); color: #fff;
  padding: 10px 18px; border-radius: 999px; font-size: 13px;
  max-width: 80vw; text-align: center; z-index: 20;
}
.toast-enter-active, .toast-leave-active { transition: opacity 0.25s, transform 0.25s; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translate(-50%, 10px); }
</style>
