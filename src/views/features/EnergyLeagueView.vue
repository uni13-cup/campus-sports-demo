<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
const back = () => router.push('/')
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
      <h2>模拟案例</h2>
      <div class="case-card">
        <div class="case-row"><span>🏃 本周累计</span><span>22.5 能量</span></div>
        <div class="case-row"><span>👥 归属</span><span>A 队公共池</span></div>
        <div class="case-row"><span>🎁 可兑换</span><span>体育馆 1 小时</span></div>
      </div>
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
</style>