<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
const back = () => router.push('/')
</script>

<template>
  <div class="page feature-page">
    <button class="back-btn" @click="back">← 返回首页</button>
    <h1 class="title">👥 运动搭子墙</h1>
    <div class="badge">概念原型 · 非已上线服务</div>
    <div class="section">
      <h2>功能介绍</h2>
      <p>在校园内寻找志同道合的运动伙伴，按项目、时段、水平匹配，让独自运动变成社交体验。</p>
    </div>
    <div class="section">
      <h2>模拟案例</h2>
      <div class="case-card">
        <div class="case-row"><span>👤 小明</span><span>篮球 · 周三晚</span></div>
        <div class="case-row"><span>👤 小红</span><span>夜跑 · 每天 21:00</span></div>
        <div class="case-row"><span>👤 大壮</span><span>羽毛球 · 周末</span></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.feature-page { padding-bottom: 48px; }
.back-btn { all: unset; cursor: pointer; color: var(--color-text-light); font-size: 14px; margin-bottom: 16px; }
.title { font-size: 24px; color: var(--color-primary); }
.badge { display: inline-block; background: var(--color-primary-light); color: var(--color-accent); font-size: 12px; padding: 4px 10px; border-radius: 20px; margin-top: 8px; }
.section { margin-top: 24px; }
.section h2 { font-size: 16px; color: var(--color-accent); margin-bottom: 10px; }
.section p { font-size: 14px; line-height: 1.7; color: var(--color-text); }
.case-card { background: var(--color-white); border-radius: var(--radius); box-shadow: var(--shadow); padding: 8px 0; }
.case-row { display: flex; justify-content: space-between; padding: 12px 16px; font-size: 14px; border-bottom: 1px solid var(--color-border); }
.case-row:last-child { border-bottom: none; }
</style>
