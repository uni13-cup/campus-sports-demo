<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { clearGameResult, loadGameResult } from '@/game/result-store.js'

const router = useRouter()
const result = ref(null)
const remainingMice = computed(() =>
  result.value?.players.filter((player) => player.role === 'mouse').length ?? 0
)
const catCount = computed(() =>
  result.value?.players.filter((player) => player.role === 'cat').length ?? 0
)
const human = computed(() =>
  result.value?.players.find((player) => player.controller === 'human') ?? null
)
const wasConverted = computed(() =>
  result.value?.initialHumanRole === 'mouse' && human.value?.role === 'cat'
)
const captureEvents = computed(() => (result.value?.events ?? [])
  .filter((event) => event.type === 'capture-confirmed')
  .slice(-5))

onMounted(() => {
  result.value = loadGameResult()
  if (!result.value) router.replace('/game')
})

function playAgain() {
  clearGameResult()
  router.push('/game/play')
}

function chooseRole() {
  clearGameResult()
  router.push('/game')
}
</script>

<template>
  <main v-if="result" class="result-page" :class="`winner-${result.winner}`">
    <section class="result-card">
      <div class="result-badge">MATCH COMPLETE · 模拟赛果</div>
      <div class="winner-icon">{{ result.winner === 'cat' ? '🐱' : '🐭' }}</div>
      <h1>{{ result.winner === 'cat' ? '猫阵营完成抓捕' : '老鼠坚持到最后' }}</h1>
      <p class="result-reason">
        {{ result.winner === 'cat'
          ? '全部老鼠已完成阵营转换。'
          : `追捕时间结束，仍有 ${remainingMice} 只老鼠存活。` }}
      </p>
      <p v-if="wasConverted" class="conversion-note">你在本局被抓后转换为玩家猫，并继续参加了比赛。</p>

      <div class="result-stats">
        <article><span>最终猫阵营</span><strong>{{ catCount }}</strong></article>
        <article><span>存活老鼠</span><strong>{{ remainingMice }}</strong></article>
        <article><span>你的最终身份</span><strong>{{ human?.role === 'cat' ? '猫' : '鼠' }}</strong></article>
        <article><span>你的抓捕</span><strong>{{ human?.captures ?? 0 }}</strong></article>
      </div>

      <div class="match-summary">
        <span>赛事回顾</span>
        <p v-if="captureEvents.length === 0">本局没有抓捕记录。</p>
        <p v-for="event in captureEvents" :key="event.id">
          {{ event.catId }} 抓获 {{ event.mouseId }} · {{ Number(event.distance).toFixed(1) }}m
        </p>
      </div>
      <p class="result-disclaimer">本结果来自本地二维模拟定位，不代表真实 GPS 轨迹或在线多人比赛。</p>
    </section>

    <div class="result-actions">
      <button class="primary" @click="playAgain">保持当前阵营再来一局</button>
      <button @click="chooseRole">返回大厅重新选阵营</button>
    </div>
  </main>
</template>

<style scoped>
.result-page {
  flex: 1;
  min-height: calc(100vh - 108px);
  padding: clamp(30px, 6vw, 72px) 16px 52px;
  background:
    radial-gradient(circle at 50% 0%, rgba(35, 194, 133, .2), transparent 36%),
    #edf4ef;
  color: #163b2c;
  text-align: center;
}
.result-page.winner-mouse { background: radial-gradient(circle at 50% 0%, rgba(240, 181, 57, .22), transparent 36%), #f2f3ed; }
.result-card { width: min(680px, 100%); margin: 0 auto; padding: clamp(28px, 5vw, 48px); border: 1px solid rgba(24,76,56,.1); border-radius: 28px; background: rgba(255,255,255,.88); box-shadow: 0 25px 70px rgba(20,63,47,.13); }
.result-badge { color: #17865e; font-size: 10px; font-weight: 850; letter-spacing: .14em; }
.winner-icon { display: grid; place-items: center; width: 84px; height: 84px; margin: 22px auto 14px; border-radius: 28px; background: #e8f5ee; font-size: 48px; transform: rotate(-4deg); animation: winner-in .55s cubic-bezier(.2,.8,.2,1); }
h1 { margin: 0; font-size: clamp(28px, 5vw, 46px); letter-spacing: -.04em; }
.result-reason { margin: 10px 0 0; color: #60776d; font-size: 13px; }
.conversion-note { margin: 15px auto 0; padding: 10px 13px; border-radius: 12px; background: #fff5dc; color: #7b5a13; font-size: 11px; }
.result-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 28px; }
.result-stats article { padding: 15px 8px; border-radius: 14px; background: #f1f6f3; }
.result-stats span { display: block; color: #71857c; font-size: 9px; }
.result-stats strong { display: block; margin-top: 5px; font-size: 22px; }
.match-summary { margin-top: 18px; padding: 15px 18px; border: 1px solid rgba(25,86,62,.1); border-radius: 14px; background: #fbfdfb; text-align: left; }
.match-summary > span { color: #16865d; font-size: 9px; font-weight: 850; letter-spacing: .1em; }
.match-summary p { margin: 6px 0 0; color: #637970; font-size: 10px; }
.result-disclaimer { margin: 16px 0 0; color: #82938c; font-size: 9px; }
.result-actions { display: flex; width: min(680px, 100%); gap: 10px; margin: 14px auto 0; }
.result-actions button { flex: 1; padding: 13px; border: 1px solid rgba(22,101,71,.16); border-radius: 13px; background: rgba(255,255,255,.8); color: #386451; font-size: 12px; font-weight: 750; cursor: pointer; }
.result-actions .primary { border-color: transparent; background: #147d55; color: #fff; }
@keyframes winner-in { from { opacity: 0; transform: translateY(12px) rotate(-12deg) scale(.7); } }
@media (max-width: 620px) {
  .result-page { padding-top: 24px; }
  .result-stats { grid-template-columns: 1fr 1fr; }
  .result-actions { flex-direction: column; }
}
@media (prefers-reduced-motion: reduce) { .winner-icon { animation: none; } }
</style>
