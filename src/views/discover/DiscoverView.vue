<script setup>
import { ref } from 'vue'

// 发现页：校区横幅 + 运动社群 + 热门跑团组队（对应参考视频发现/社区页）
const tabs = ['关注', '社区', '兴趣活动']
const activeTab = ref('社区')

const groups = [
  { icon: '⚽', name: '足球', online: 23 },
  { icon: '🏸', name: '羽毛球', online: 18 },
  { icon: '🏀', name: '篮球', online: 31 },
  { icon: '🏃', name: '长跑', online: 45 },
  { icon: '🚴', name: '骑行', online: 12 },
  { icon: '🧘', name: '瑜伽', online: 9 },
  { icon: '🥏', name: '飞盘', online: 15 },
  { icon: '🏊', name: '游泳', online: 7 }
]

const teams = ref([
  { icon: '🌙', bg: '#e3edff', name: '晨光夜跑团', desc: '128 人 · 本周已跑 340 km · 江东校区', joined: true },
  { icon: '🏸', bg: '#e0f7e3', name: '羽你同行', desc: '64 人 · 每周三晚七操场集合', joined: false },
  { icon: '🏆', bg: '#ffe8d9', name: '马拉松特训营', desc: '96 人 · 备战校马 · 教练带队', joined: false }
])

const toast = ref('')
let toastTimer = null
function join(t) {
  if (t.joined) return
  t.joined = true
  toast.value = '组队成功，已通知对方'
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2000)
}
</script>

<template>
  <div class="page">
    <!-- 搜索 + 标签页 -->
    <div class="search-bar card">
      <span>🔍</span>
      <span class="ph">搜索同学 / 跑团 / 活动</span>
    </div>
    <div class="tabs page-tabs">
      <button
        v-for="t in tabs"
        :key="t"
        class="tab-item"
        :class="{ active: activeTab === t }"
        @click="activeTab = t"
      >{{ t }}</button>
    </div>

    <!-- 校区横幅 -->
    <section class="campus-banner">
      <span class="pin">📍</span>
      <div class="campus-info">
        <strong>本校区 · 江东校区</strong>
        <p>2 公里内 86 位同学正在运动</p>
      </div>
      <button class="switch-btn">切换</button>
    </section>

    <!-- 运动社群 -->
    <div class="section-head">
      <h3>运动社群</h3>
      <span class="more">全部 ›</span>
    </div>
    <section class="card group-grid">
      <div v-for="g in groups" :key="g.name" class="group">
        <span class="g-icon">{{ g.icon }}</span>
        <span class="g-name">{{ g.name }}</span>
        <span class="g-online">{{ g.online }} 在线</span>
      </div>
    </section>

    <!-- 热门跑团 -->
    <div class="section-head">
      <h3>热门跑团</h3>
      <router-link to="/features/sports-wall" class="more">搭子墙 ›</router-link>
    </div>
    <section class="team-list">
      <div v-for="t in teams" :key="t.name" class="team-card card">
        <span class="t-icon" :style="{ background: t.bg }">{{ t.icon }}</span>
        <div class="t-info">
          <strong>{{ t.name }}</strong>
          <p>{{ t.desc }}</p>
        </div>
        <button class="join-btn" :class="{ joined: t.joined }" @click="join(t)">
          {{ t.joined ? '已加入' : '组队' }}
        </button>
      </div>
    </section>

    <!-- 附近的人 -->
    <section class="nearby card">
      <div class="avatars">
        <span v-for="e in ['🦊', '🐼', '🐨', '🦁']" :key="e">{{ e }}</span>
      </div>
      <p><strong>2 km</strong> 内有 <strong>8</strong> 位同学正在运动<br /><span>去认识一下，约个伴？</span></p>
      <router-link to="/features/sports-wall" class="view-btn">查看 ›</router-link>
    </section>

    <!-- toast -->
    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
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
  margin: 16px 2px 0;
}
.campus-banner {
  margin-top: 14px;
  border-radius: var(--radius);
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(135deg, #3b82f6, var(--color-primary-dark));
  color: #fff;
  box-shadow: 0 8px 20px rgba(46, 107, 255, 0.3);
}
.pin {
  font-size: 20px;
}
.campus-info {
  flex: 1;
}
.campus-info strong {
  font-size: 15px;
}
.campus-info p {
  font-size: 12px;
  opacity: 0.85;
  margin-top: 2px;
}
.switch-btn {
  border: none;
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
  font-size: 12px;
  padding: 6px 14px;
  border-radius: 999px;
}
.group-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px 6px;
  padding: 16px 10px;
}
.group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.g-icon {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: var(--color-primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}
.g-name {
  font-size: 13px;
}
.g-online {
  font-size: 10px;
  color: var(--color-accent);
}
.team-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.team-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
}
.t-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}
.t-info {
  flex: 1;
  min-width: 0;
}
.t-info strong {
  font-size: 15px;
}
.t-info p {
  font-size: 12px;
  color: var(--color-text-light);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.join-btn {
  border: none;
  border-radius: 999px;
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary);
  flex-shrink: 0;
}
.join-btn.joined {
  background: #f0fdf4;
  color: var(--color-accent);
  box-shadow: inset 0 0 0 1.5px var(--color-accent);
}
.nearby {
  margin-top: 14px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.avatars span {
  display: inline-block;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--color-primary-light);
  text-align: center;
  line-height: 30px;
  font-size: 15px;
  margin-left: -8px;
  border: 2px solid #fff;
}
.avatars span:first-child {
  margin-left: 0;
}
.nearby p {
  flex: 1;
  font-size: 13px;
  line-height: 1.5;
}
.nearby p span {
  color: var(--color-text-light);
  font-size: 12px;
}
.view-btn {
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;
}
.toast {
  position: fixed;
  left: 50%;
  bottom: 120px;
  transform: translateX(-50%);
  background: rgba(23, 35, 61, 0.92);
  color: #fff;
  font-size: 13px;
  padding: 10px 20px;
  border-radius: 999px;
  z-index: 200;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
