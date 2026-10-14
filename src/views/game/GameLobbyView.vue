<script setup>
import { useRouter } from 'vue-router'
import { GAME_CONFIG } from '@/game/config.js'

const router = useRouter()

function startGame() {
  router.push('/game/play')
}

function backHome() {
  router.push('/')
}
</script>

<template>
  <div class="page game-lobby">
    <button class="back-btn" @click="backHome">← 返回首页</button>

    <h1 class="title">🐱 校园猫鼠大作战</h1>
    <p class="subtitle">校园局部地图 · 虚拟坐标单机演示</p>

    <div class="rules-card">
      <h2>游戏规则</h2>
      <ul>
        <li>你控制1只猫，追捕{{ GAME_CONFIG.mouseCount }}只电脑鼠。</li>
        <li>开局先躲藏{{ GAME_CONFIG.hidingDuration }}秒，此时猫不能移动。</li>
        <li>追捕限时{{ GAME_CONFIG.chasingDuration }}秒，距离 ≤ {{ GAME_CONFIG.catchThreshold }}模拟米时自动抓捕并转换阵营。</li>
        <li>被抓的鼠会变成电脑猫；全部抓完猫胜，超时鼠胜。</li>
        <li>灰色障碍区域不可进入，其余区域可以移动。</li>
      </ul>
    </div>

    <div class="config-card">
      <span>地图类型</span>
      <strong>二维虚拟活动区域</strong>
    </div>

    <button class="start-btn" @click="startGame">开始游戏</button>
  </div>
</template>

<style scoped>
.game-lobby {
  text-align: center;
}
.back-btn {
  all: unset;
  cursor: pointer;
  color: var(--color-text-light);
  font-size: 14px;
  margin-bottom: 16px;
}
.title {
  font-size: 28px;
  color: var(--color-primary);
  margin-bottom: 4px;
}
.subtitle {
  color: var(--color-text-light);
  font-size: 14px;
  margin-bottom: 28px;
}
.rules-card,
.config-card {
  background: var(--color-white);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  padding: 20px;
  margin-bottom: 16px;
  text-align: left;
}
.rules-card h2 {
  font-size: 16px;
  margin-bottom: 12px;
  color: var(--color-accent);
}
.rules-card ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rules-card li {
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-text);
}
.config-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.start-btn {
  width: 100%;
  padding: 14px;
  margin-top: 8px;
  background: var(--color-primary);
  color: #fff;
  border: none;
  border-radius: var(--radius);
  font-size: 16px;
  font-weight: 600;
}
.start-btn:hover {
  opacity: 0.9;
}
</style>
