<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

// 趣味玩法页：校园活动卡片列表（可筛选、可报名）
// 原页面：李金燚 ｜ 本次由「小游戏入口列表」改为「活动卡片列表」：李浩阳
const router = useRouter()

const filters = ['全部', '本周', '组队', '挑战']
const activeFilter = ref('全部')

// 示例活动数据（本地写死，不连服务器）
const events = ref([
  {
    id: 'catmouse',
    title: '校园猫鼠大作战',
    tag: '本周',
    badge: '可玩',
    icon: '🐱',
    theme: 'teal',
    when: '每周六 16:00',
    place: '东校区操场',
    desc: '真人版猫追鼠，跑起来才不会被抓',
    action: '立即开玩',
    path: '/game/play'
  },
  {
    id: 'runmonth',
    title: '校园跑步月 · 5 公里挑战',
    tag: '挑战',
    badge: '报名中',
    icon: '🏃',
    theme: 'amber',
    when: '10.20 – 11.20',
    place: '全校 · 操场任意时段',
    desc: '30 天内累计完成 10 次 5 公里，达标解锁徽章',
    action: '立即报名'
  },
  {
    id: 'collegepk',
    title: '学院 PK 榜 · 团队里程赛',
    tag: '组队',
    badge: '报名中',
    icon: '🏆',
    theme: 'forest',
    when: '本周日 24:00 截止',
    place: '线上打卡 · 按学院统计',
    desc: '以学院为单位累计里程，前三名进荣誉墙',
    action: '立即报名'
  },
  {
    id: 'nightrun',
    title: '晨光夜跑团 · 周三夜跑',
    tag: '本周',
    badge: '报名中',
    icon: '🌙',
    theme: 'night',
    when: '每周三 19:00',
    place: '东校区操场南门',
    desc: '5 公里配速跑，新手也跟得上',
    action: '立即报名'
  },
  {
    id: 'soon',
    title: '撕名牌 · 躲避球',
    tag: '筹备',
    badge: '筹备中',
    icon: '🏷️',
    theme: 'muted',
    when: '时间待定',
    place: '场地待定',
    desc: '组队对抗玩法，规则设计中',
    action: '敬请期待',
    disabled: true
  }
])

const visible = computed(() =>
  activeFilter.value === '全部'
    ? events.value
    : events.value.filter((e) => e.tag === activeFilter.value)
)

// 已报名的活动 id
const joined = ref([])

function isJoined(e) {
  return joined.value.includes(e.id)
}

function onAction(e) {
  if (e.disabled) return
  if (e.path) {
    router.push(e.path)
    return
  }
  const i = joined.value.indexOf(e.id)
  if (i >= 0) joined.value.splice(i, 1)
  else joined.value.push(e.id)
}

const shortcuts = [
  { name: '能量商城', desc: '跑步攒能量，校园里花出去', icon: '⚡', path: '/features/energy-league' },
  { name: 'AI 陪跑', desc: '跑步时有人说话', icon: '🤖', path: '/features/ai-pacer' }
]
</script>

<template>
  <div class="page play">
    <section class="hero">
      <h1>校园活动</h1>
      <p>找一个理由出门。挑一个活动，今天就能跑起来。</p>
    </section>

    <!-- 筛选 -->
    <div class="chips">
      <button
        v-for="f in filters"
        :key="f"
        class="chip"
        :class="{ active: activeFilter === f }"
        @click="activeFilter = f"
      >{{ f }}</button>
    </div>

    <!-- 活动卡片列表 -->
    <div class="event-list">
      <article
        v-for="e in visible"
        :key="e.id"
        class="event-card"
        :class="{ off: e.disabled }"
      >
        <div class="poster" :class="'t-' + e.theme">
          <span class="poster-icon">{{ e.icon }}</span>
          <span class="poster-badge" :class="{ done: isJoined(e) }">
            {{ isJoined(e) ? '已报名' : e.badge }}
          </span>
          <span class="poster-title">{{ e.title }}</span>
        </div>

        <div class="event-body">
          <h3 class="event-title">{{ e.title }}</h3>
          <p class="event-meta">
            <span>🕒 {{ e.when }}</span>
            <span>📍 {{ e.place }}</span>
          </p>
          <p class="event-desc">{{ e.desc }}</p>
          <button
            class="event-btn"
            :class="{ done: isJoined(e), off: e.disabled }"
            @click="onAction(e)"
          >{{ isJoined(e) ? '已报名 ✓' : e.action }}</button>
        </div>
      </article>
    </div>

    <!-- 配套玩法 -->
    <div class="section-head">
      <h3>配套玩法</h3>
    </div>
    <div class="shortcuts">
      <button
        v-for="s in shortcuts"
        :key="s.name"
        class="shortcut"
        @click="router.push(s.path)"
      >
        <span class="shortcut-icon">{{ s.icon }}</span>
        <strong>{{ s.name }}</strong>
        <span class="shortcut-desc">{{ s.desc }}</span>
      </button>
    </div>

    <p class="footnote">＊活动信息为 Demo 示例数据，用于展示报名流程</p>
  </div>
</template>

<style scoped>
.play {
  padding: 16px;
  max-width: 520px;
  margin: 0 auto;
}

.hero h1 {
  font-size: 24px;
  font-weight: 800;
  margin: 0 0 6px;
}
.hero p {
  margin: 0 0 16px;
  color: var(--color-text-light);
  font-size: 14px;
}

/* 活动卡片 */
.event-list {
  margin-top: 16px;
}
.event-card {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;
  margin-bottom: 14px;
}
.event-card.off {
  opacity: 0.62;
}

/* 海报块：纯 CSS 渐变，不依赖外部图片 */
.poster {
  position: relative;
  height: 132px;
  padding: 14px;
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}
.poster::after {
  content: '';
  position: absolute;
  right: -40px;
  top: -60px;
  width: 190px;
  height: 190px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  pointer-events: none;
}
.t-teal {
  background: linear-gradient(135deg, #1ec2ad 0%, #07786d 100%);
}
.t-amber {
  background: linear-gradient(135deg, #fbbf24 0%, #f97316 100%);
}
.t-forest {
  background: linear-gradient(135deg, #34d399 0%, #0f766e 100%);
}
.t-night {
  background: linear-gradient(135deg, #5b6ba8 0%, #1f2a4a 100%);
}
.t-muted {
  background: linear-gradient(135deg, #cbd6d4 0%, #9aadaa 100%);
}

.poster-title {
  position: relative;
  z-index: 1;
  max-width: 74%;
  color: #fff;
  font-size: 19px;
  font-weight: 800;
  line-height: 1.28;
  letter-spacing: 0.3px;
  text-shadow: 0 1px 8px rgba(15, 47, 44, 0.28);
}
.poster-icon {
  position: absolute;
  right: 14px;
  bottom: 8px;
  font-size: 54px;
  line-height: 1;
  opacity: 0.42;
}
.poster-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--color-primary-dark);
  font-size: 11px;
  font-weight: 700;
}
.poster-badge.done {
  background: var(--color-dark);
  color: #fff;
}

/* 卡片正文 */
.event-body {
  padding: 12px 14px 14px;
}
.event-title {
  font-size: 15px;
  font-weight: 700;
  margin: 0 0 6px;
}
.event-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--color-text-light);
}
.event-desc {
  margin: 0 0 12px;
  font-size: 12.5px;
  color: var(--color-text-light);
  line-height: 1.5;
}
.event-btn {
  width: 100%;
  padding: 10px 0;
  border: none;
  border-radius: 10px;
  background: var(--color-primary);
  color: #fff;
  font-size: 14px;
  font-weight: 700;
  transition: background 0.15s, color 0.15s;
}
.event-btn.done {
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
}
.event-btn.off {
  background: #eef2f1;
  color: #a8b6b3;
  cursor: not-allowed;
}

/* 配套玩法 */
.shortcuts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.shortcut {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 14px;
  text-align: left;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  background: var(--color-white);
  box-shadow: var(--shadow);
  transition: transform 0.15s;
}
.shortcut:active {
  transform: scale(0.985);
}
.shortcut-icon {
  font-size: 20px;
}
.shortcut strong {
  font-size: 14px;
}
.shortcut-desc {
  font-size: 11.5px;
  color: var(--color-text-light);
  line-height: 1.4;
}

.footnote {
  margin: 18px 2px 0;
  font-size: 11px;
  color: var(--color-text-light);
  text-align: center;
}
</style>
