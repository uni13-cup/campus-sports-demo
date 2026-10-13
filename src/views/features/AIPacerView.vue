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

    <p class="lead">跑步的时候有人说话，比一个人戴耳机强。</p>

    <div class="section">
      <h2>它解决什么问题</h2>
      <p>跑步时的反馈只有「还剩两圈」，中间那段路没人说话，很容易就慢下来、然后停下来。</p>
    </div>

    <div class="section">
      <h2>怎么玩</h2>
      <ol class="steps">
        <li>挑一个陪跑角色和节奏目标</li>
        <li>每跑完一段播报配速变化</li>
        <li>落后时提醒一句，超过时夸一句</li>
      </ol>
    </div>

    <div class="section">
      <h2>模拟案例</h2>
      <div class="case-card">
        <div class="case-row"><span>🤖 陪跑角色</span><span>小鹿 · 鼓励型</span></div>
        <div class="case-row"><span>🎯 本段配速</span><span>6分12秒 / 公里</span></div>
        <div class="case-row"><span>📈 对比上一段</span><span>快 8 秒</span></div>
      </div>
      <p class="note-line">以上为模拟数据，用于说明播报节奏，非真实训练记录。</p>
    </div>

    <div class="section">
      <h2>设计依据</h2>
      <p>即时、个性化的反馈能提升坚持度。这里用预设语音包实现，不接入大模型接口——既避免 API 费用和密钥暴露，也保证没有网络时依然能播报。</p>
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