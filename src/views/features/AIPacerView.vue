<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
const back = () => router.push('/')
</script>

<template>
  <div class="page feature-page">
    <button class="back-btn" @click="back">← 返回首页</button>
    <h1 class="title">🤖 AI角色智能陪跑</h1>
    <div class="badge">概念原型 · 非已上线服务</div>
    <div class="section">
      <h2>功能介绍</h2>
      <p>虚拟 AI 角色作为陪练伙伴，根据你的配速、心率与目标动态调整，提供语音鼓励与训练建议。</p>
    </div>
    <div class="section">
      <h2>模拟案例</h2>
      <div class="case-card">
        <div class="case-row"><span>🎯 目标配速</span><span>5'30"/km</span></div>
        <div class="case-row"><span>🤖 AI 陪练</span><span>小鹿 · 鼓励型</span></div>
        <div class="case-row"><span>💬 实时反馈</span><span>"保持节奏，加油！"</span></div>
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
