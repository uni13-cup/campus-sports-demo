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

    <p class="lead">一个人跑不动，两个人就能出门。</p>

    <div class="section">
      <h2>它解决什么问题</h2>
      <p>校园跑的难点不是不想跑，是找不到人一起跑。约不到人，跑两圈就停了。</p>
    </div>

    <div class="section">
      <h2>怎么玩</h2>
      <ol class="steps">
        <li>填上自己的空闲时段和习惯配速</li>
        <li>按配速接近、时间重合筛出同频跑友</li>
        <li>一键约跑，跑完互相确认里程</li>
      </ol>
    </div>

    <div class="section">
      <h2>模拟案例</h2>
      <div class="case-card">
        <div class="case-row"><span>🕗 空闲时段</span><span>周一至周五 18:00–20:00</span></div>
        <div class="case-row"><span>🏃 习惯配速</span><span>6分30秒 / 公里</span></div>
        <div class="case-row"><span>👥 匹配结果</span><span>3 位同频跑友</span></div>
      </div>
      <p class="note-line">以上为模拟数据，用于说明交互流程，非真实用户。</p>
    </div>

    <div class="section">
      <h2>设计依据</h2>
      <p>自我决定理论指出，自主感、胜任感与关系联结是维持运动内部动机的三个支点。搭子墙补的正是「关系联结」这一环：有人等，就更容易出门。</p>
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