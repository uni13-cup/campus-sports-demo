<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
const back = () => router.push('/')
</script>

<template>
  <div class="page feature-page">
    <button class="back-btn" @click="back">← 返回首页</button>
    <h1 class="title">🗺️ 校园地标主题探索跑</h1>
    <div class="badge">概念原型 · 非已上线服务</div>

    <p class="lead">把校园跑成一条路线，不再是绕圈。</p>

    <div class="section">
      <h2>它解决什么问题</h2>
      <p>路线永远只有一条，跑的是圈，不是路。跑到第三圈，人就只剩盯着终点看了。</p>
    </div>

    <div class="section">
      <h2>怎么玩</h2>
      <ol class="steps">
        <li>按主题把校园地标串成一条路线</li>
        <li>跑到地标附近自动点亮</li>
        <li>集齐一个主题，解锁下一组路线</li>
      </ol>
    </div>

    <div class="section">
      <h2>模拟案例</h2>
      <div class="case-card">
        <div class="case-row"><span>🗺️ 当前主题</span><span>校园八景</span></div>
        <div class="case-row"><span>📍 已点亮</span><span>5 / 8</span></div>
        <div class="case-row"><span>🏅 集齐奖励</span><span>解锁校园故事徽章</span></div>
      </div>
      <p class="note-line">以上为模拟数据，用于说明探索流程，非真实打卡记录。</p>
    </div>

    <div class="section">
      <h2>设计依据</h2>
      <p>场景化设计用环境线索替代重复路线，把注意力从「还剩几圈」转移到「下一个点在哪」，降低同一路线带来的心理疲劳。</p>
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
</style>