<script setup>
import { ref } from 'vue'

// 课程页：搜索 + 标签页 + 快捷入口 + 筛选 chips + 课程卡片（对应参考视频课程页）
const tabs = ['课程', '计划', '体测', '跑团']
const activeTab = ref('课程')

const entries = [
  { icon: '📋', label: '全部课程', bg: '#e3edff' },
  { icon: '▶️', label: '免费课', bg: '#d9f7f0' },
  { icon: '🎥', label: '直播课', bg: '#ffe8d9' },
  { icon: '🏃', label: '跑姿库', bg: '#e3edff' },
  { icon: '📍', label: '找跑道', bg: '#e0f7e3' }
]

const chips = ['精选', '体测提分', '减脂塑形', '新手入门']
const activeChip = ref('精选')

const courses = [
  {
    level: 'K1', badge: '免费', bg: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
    title: '八百米达标 · 呼吸节奏入门',
    meta: 'K1 零基础 · 12 分钟 · 评分 9.1',
    desc: '体育教研组官方课 · 新手跑姿打底'
  },
  {
    level: 'K2', badge: '免费', bg: 'linear-gradient(135deg,#14b8a6,#0f766e)',
    title: '一千米满分冲刺 · 间歇训练',
    meta: 'K2 初学 · 20 分钟 · 评分 8.7',
    desc: '体测提分必备 · 400 米 × 4 组'
  },
  {
    level: 'K3', badge: '直播中', bg: 'linear-gradient(135deg,#f97316,#dc2626)',
    title: '夜跑燃脂 · 校园环线跟练',
    meta: 'K3 进阶 · 45 分钟 · 328 人在练',
    desc: '学长带跑 · 操场集合'
  },
  {
    level: 'K1', badge: '免费', bg: 'linear-gradient(135deg,#22c55e,#15803d)',
    title: '跑前热身 · 动态激活 8 式',
    meta: 'K1 零基础 · 8 分钟 · 评分 9.3',
    desc: '避免受伤 · 每次开跑前必做'
  },
  {
    level: 'K2', badge: '主题跑', bg: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
    title: '校园地标主题探索跑',
    meta: 'K2 路线 · 打卡校园地标 · 评分 9.5',
    desc: '边跑边逛 · 解锁地标徽章',
    to: '/features/theme-run'
  }
]
</script>

<template>
  <div class="page">
    <!-- 搜索栏 -->
    <div class="search-bar card">
      <span class="search-icon">🔍</span>
      <span class="search-placeholder">校园跑 · 体测专项</span>
    </div>

    <!-- 顶部标签页 -->
    <div class="tabs page-tabs">
      <button
        v-for="t in tabs"
        :key="t"
        class="tab-item"
        :class="{ active: activeTab === t }"
        @click="activeTab = t"
      >{{ t }}</button>
      <span class="signup-tag">报名开启</span>
    </div>

    <!-- 快捷入口 -->
    <div class="entry-row card">
      <div v-for="e in entries" :key="e.label" class="entry">
        <span class="entry-icon" :style="{ background: e.bg }">{{ e.icon }}</span>
        <span class="entry-label">{{ e.label }}</span>
      </div>
    </div>

    <!-- 筛选 chips -->
    <div class="chips page-chips">
      <button
        v-for="c in chips"
        :key="c"
        class="chip"
        :class="{ active: activeChip === c }"
        @click="activeChip = c"
      >{{ c }}</button>
    </div>

    <!-- 课程卡片列表 -->
    <div class="course-list">
      <component
        :is="c.to ? 'router-link' : 'div'"
        v-for="c in courses"
        :key="c.title"
        :to="c.to"
        class="course-card card"
      >
        <div class="thumb" :style="{ background: c.bg }">
          <span class="badge">{{ c.badge }}</span>
          <span class="level">{{ c.level }}</span>
        </div>
        <div class="info">
          <h4>{{ c.title }}</h4>
          <p class="meta">{{ c.meta }}</p>
          <p class="desc">{{ c.desc }}</p>
        </div>
      </component>
    </div>
  </div>
</template>

<style scoped>
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 14px;
  border-radius: 999px;
  color: var(--color-text-light);
  font-size: 14px;
}
.page-tabs {
  margin: 18px 2px 0;
}
.signup-tag {
  margin-left: auto;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-danger);
}
.entry-row {
  margin-top: 14px;
  display: flex;
  justify-content: space-between;
  padding: 14px 10px;
}
.entry {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 20%;
}
.entry-icon {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}
.entry-label {
  font-size: 12px;
  color: var(--color-text);
}
.page-chips {
  margin-top: 14px;
}
.course-list {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.course-card {
  display: flex;
  gap: 12px;
  padding: 12px;
  color: var(--color-text);
}
.thumb {
  position: relative;
  width: 96px;
  height: 84px;
  border-radius: 12px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.thumb .level {
  color: rgba(255, 255, 255, 0.92);
  font-size: 24px;
  font-weight: 800;
}
.badge {
  position: absolute;
  top: 6px;
  left: 6px;
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 6px;
  backdrop-filter: blur(2px);
}
.info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}
.info h4 {
  font-size: 15px;
  font-weight: 700;
}
.meta {
  font-size: 12px;
  color: var(--color-text);
}
.desc {
  font-size: 12px;
  color: var(--color-text-light);
}
</style>
