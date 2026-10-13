<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getState } from '@/game/engine.js'

const router = useRouter()
const result = ref(null)

onMounted(() => {
  result.value = getState()
})

function playAgain() {
  router.push('/game')
}

function backHome() {
  router.push('/')
}
</script>

<template>
  <div class="page game-result">
    <div class="result-card" v-if="result">
      <div class="emoji">{{ result.winner === 'cat' ? '🐱' : '🐭' }}</div>
      <h1 class="title">
        {{ result.winner === 'cat' ? '猫获胜！' : '鼠逃脱成功！' }}
      </h1>
      <p class="reason">
        {{ result.status === 'caught' ? '猫在限定时间内抓到了鼠' : '时间用尽，鼠成功逃脱' }}
      </p>

      <div class="stats">
        <div class="stat-item">
          <span>最终距离</span>
          <strong>{{ result.distance }} m</strong>
        </div>
        <div class="stat-item">
          <span>剩余时间</span>
          <strong>{{ result.timeLeft }} s</strong>
        </div>
      </div>
    </div>

    <div class="actions">
      <button class="btn-primary" @click="playAgain">再来一局</button>
      <button class="btn-secondary" @click="backHome">返回首页</button>
    </div>
  </div>
</template>

<style scoped>
.game-result {
  text-align: center;
}
.result-card {
  background: var(--color-white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 40px 24px;
  margin-bottom: 20px;
}
.emoji {
  font-size: 64px;
  margin-bottom: 12px;
}
.title {
  font-size: 24px;
  color: var(--color-primary);
  margin-bottom: 8px;
}
.reason {
  font-size: 14px;
  color: var(--color-text-light);
  margin-bottom: 28px;
}
.stats {
  display: flex;
  justify-content: center;
  gap: 32px;
}
.stat-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.stat-item span {
  font-size: 13px;
  color: var(--color-text-light);
}
.stat-item strong {
  font-size: 22px;
  color: var(--color-primary);
}
.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.btn-primary,
.btn-secondary {
  width: 100%;
  padding: 14px;
  border: none;
  border-radius: var(--radius);
  font-size: 16px;
  font-weight: 600;
}
.btn-primary {
  background: var(--color-primary);
  color: #fff;
}
.btn-secondary {
  background: var(--color-primary-light);
  color: var(--color-primary);
}
</style>
