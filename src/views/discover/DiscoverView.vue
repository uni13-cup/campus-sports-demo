<script setup>
import { computed, ref } from 'vue'

// 操场页：东校区约跑 → 跑团榜（团队排名）→ 个人榜
// 负责人：李浩阳（原页面由李金燚创建，本次换掉社群九宫格与跑团列表的呈现方式）

// 关注的人
const following = ref([
  { name: '王同学', avatar: '🦊', live: true },
  { name: '李同学', avatar: '🐼', live: false },
  { name: '张同学', avatar: '🐨', live: true },
  { name: '赵同学', avatar: '🦁', live: false },
  { name: '陈同学', avatar: '🐯', live: false }
])

// 社区动态
const posts = ref([
  {
    author: '王同学', avatar: '🦊', time: '10 分钟前',
    text: '今天操场 5 公里打卡，配速又进了 10 秒！💪',
    likes: 23, liked: false, comments: 5
  },
  {
    author: '李同学', avatar: '🐼', time: '32 分钟前',
    text: '约了晚跑的小伙伴，操场南门集合，有人一起来吗？',
    likes: 12, liked: false, comments: 8
  },
  {
    author: '张同学', avatar: '🐨', time: '1 小时前',
    text: '猫鼠大作战太好玩了，被追着跑了两公里哈哈哈',
    likes: 41, liked: true, comments: 15
  }
])

function toggleLike(p) {
  p.liked = !p.liked
  p.likes += p.liked ? 1 : -1
}

const campus = '东校区'
const onlineCount = 86

// 今日约跑：可以点"加入"的活动卡片
const meetups = ref([
  {
    icon: '🏸', sport: '羽毛球', title: '体育馆双打',
    when: '今晚 19:30', place: '东体育馆 2 号场', joined: 3, cap: 4, mine: false
  },
  {
    icon: '🏃', sport: '夜跑', title: '操场环线 5 公里',
    when: '今晚 20:30', place: '东操场南门', joined: 7, cap: 10, mine: false
  },
  {
    icon: '⚽', sport: '足球', title: '八人制友谊赛',
    when: '周三 16:00', place: '西区足球场', joined: 14, cap: 16, mine: false
  },
  {
    icon: '🥏', sport: '飞盘', title: '草坪飞盘局',
    when: '周四 17:00', place: '中心草坪', joined: 5, cap: 12, mine: false
  }
])

// 跑团榜：团队排名
const teams = ref([
  { rank: 1, name: '追风跑团', km: 412, members: 36, joined: false },
  { rank: 2, name: '夜航跑团', km: 340, members: 28, joined: true },
  { rank: 3, name: '体测冲锋队', km: 286, members: 22, joined: false },
  { rank: 4, name: '羽林小分队', km: 233, members: 19, joined: false }
])
const teamMax = computed(() => Math.max(...teams.value.map((t) => t.km)))

// 个人榜：轻量 Top3 + 我的名次
const soloTop = [
  { rank: 1, name: '王同学', km: 42.6, avatar: '🦊' },
  { rank: 2, name: '李同学', km: 38.2, avatar: '🐼' },
  { rank: 3, name: '张同学', km: 35.7, avatar: '🐨' }
]
const podium = [soloTop[1], soloTop[0], soloTop[2]]
const me = { rank: 7, km: 22.5 }

const toast = ref('')
let toastTimer = null
function flash(text) {
  toast.value = text
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => (toast.value = ''), 2000)
}
function joinMeet(m) {
  if (m.mine) return
  m.mine = true
  m.joined += 1
  flash(`已加入「${m.title}」，已通知发起人`)
}
function joinTeam(t) {
  if (t.joined) return
  t.joined = true
  flash(`已加入跑团「${t.name}」`)
}
</script>

<template>
  <div class="page">
    <!-- 校区信息条 -->
    <section class="campus-bar card">
      <span class="pin">📍</span>
      <div class="campus-info">
        <strong>{{ campus }}</strong>
        <p>2 公里内 <b>{{ onlineCount }}</b> 位同学正在运动</p>
      </div>
      <button class="switch-btn">切换</button>
    </section>

    <!-- 关注的人 -->
    <div class="section-head">
      <h3>关注</h3>
      <span class="more">{{ following.length }} 人</span>
    </div>
    <div class="follow-scroll">
      <div v-for="f in following" :key="f.name" class="follow-item">
        <div class="avatar-wrap" :class="{ live: f.live }">
          <span class="avatar">{{ f.avatar }}</span>
          <span v-if="f.live" class="live-dot"></span>
        </div>
        <span class="follow-name">{{ f.name }}</span>
      </div>
    </div>

    <!-- 社区动态 -->
    <div class="section-head">
      <h3>社区</h3>
      <span class="more">校园动态 ›</span>
    </div>
    <div class="post-list">
      <article v-for="(p, i) in posts" :key="i" class="post-card card">
        <div class="post-head">
          <span class="avatar">{{ p.avatar }}</span>
          <div class="post-author">
            <strong>{{ p.author }}</strong>
            <span>{{ p.time }}</span>
          </div>
        </div>
        <p class="post-text">{{ p.text }}</p>
        <div class="post-actions">
          <button class="post-btn" :class="{ liked: p.liked }" @click="toggleLike(p)">
            {{ p.liked ? '❤️' : '🤍' }} {{ p.likes }}
          </button>
          <button class="post-btn">💬 {{ p.comments }}</button>
        </div>
      </article>
    </div>

    <!-- 今日约跑 -->
    <div class="section-head">
      <h3>今天的约跑</h3>
      <span class="more">左右滑动 ›</span>
    </div>
    <div class="meet-scroll">
      <article
        v-for="m in meetups"
        :key="m.title"
        class="meet-card"
        :class="{ mine: m.mine }"
      >
        <div class="meet-head">
          <span class="meet-icon">{{ m.icon }}</span>
          <span class="meet-sport">{{ m.sport }}</span>
        </div>
        <strong class="meet-title">{{ m.title }}</strong>
        <p class="meet-when">{{ m.when }}</p>
        <p class="meet-place">📍 {{ m.place }}</p>
        <div class="meet-foot">
          <span class="meet-count">{{ m.joined }}/{{ m.cap }} 人</span>
          <button class="meet-btn" :class="{ joined: m.mine }" @click="joinMeet(m)">
            {{ m.mine ? '已加入' : '加入' }}
          </button>
        </div>
      </article>
    </div>

    <!-- 跑团榜 -->
    <div class="section-head">
      <h3>跑团榜 · 本周</h3>
      <span class="more">团队总里程</span>
    </div>
    <section class="card team-board">
      <div
        v-for="t in teams"
        :key="t.name"
        class="team-row"
        :class="{ mine: t.joined }"
      >
        <span class="rank" :class="'r' + t.rank">{{ t.rank }}</span>
        <div class="t-info">
          <strong>{{ t.name }}<em v-if="t.joined">我的</em></strong>
          <div class="t-bar">
            <div class="t-fill" :style="{ width: (t.km / teamMax) * 100 + '%' }"></div>
          </div>
          <p>{{ t.members }} 人 · 本周 {{ t.km }} km</p>
        </div>
        <button class="t-btn" :class="{ joined: t.joined }" @click="joinTeam(t)">
          {{ t.joined ? '已加入' : '加入' }}
        </button>
      </div>
    </section>

    <!-- 个人榜 -->
    <div class="section-head">
      <h3>个人榜 · 本周</h3>
      <span class="more">我第 {{ me.rank }} 名</span>
    </div>
    <section class="card solo-board">
      <div class="podium">
        <div v-for="p in podium" :key="p.name" class="pod" :class="'p' + p.rank">
          <span class="p-avatar">{{ p.avatar }}</span>
          <strong>{{ p.name }}</strong>
          <span class="p-km">{{ p.km }} km</span>
        </div>
      </div>
      <div class="me-row">
        <span class="rank">{{ me.rank }}</span>
        <span class="me-avatar">🧑‍🎓</span>
        <strong>我</strong>
        <span class="me-km">{{ me.km }} km</span>
      </div>
    </section>

    <transition name="fade">
      <div v-if="toast" class="toast">{{ toast }}</div>
    </transition>
  </div>
</template>

<style scoped>
/* ===== 校区信息条 ===== */
.campus-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 16px;
}
.pin {
  font-size: 18px;
}
.campus-info {
  flex: 1;
}
.campus-info strong {
  font-size: 15px;
}
.campus-info p {
  font-size: 12px;
  color: var(--color-text-light);
  margin-top: 2px;
}
.campus-info b {
  color: var(--color-primary);
}
.switch-btn {
  border: 1px solid var(--color-border);
  background: var(--color-white);
  color: var(--color-text-light);
  font-size: 12px;
  padding: 6px 14px;
  border-radius: 999px;
}

/* ===== 今日约跑（横向卡片流） ===== */
.meet-scroll {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  scrollbar-width: none;
  margin: 0 -16px;
  padding: 2px 16px 8px;
}
.meet-scroll::-webkit-scrollbar {
  display: none;
}
.meet-card {
  flex: 0 0 auto;
  width: 172px;
  border-radius: var(--radius);
  padding: 13px 14px;
  background: var(--color-white);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
}
.meet-card.mine {
  border-color: var(--color-primary);
  background: var(--color-primary-light);
}
.meet-head {
  display: flex;
  align-items: center;
  gap: 7px;
}
.meet-icon {
  font-size: 19px;
}
.meet-sport {
  font-size: 11px;
  color: var(--color-primary-dark);
  background: var(--color-primary-light);
  padding: 2px 8px;
  border-radius: 999px;
}
.meet-card.mine .meet-sport {
  background: #fff;
}
.meet-title {
  font-size: 14px;
  margin-top: 9px;
}
.meet-when {
  font-size: 12px;
  color: var(--color-primary-dark);
  font-weight: 600;
  margin-top: 5px;
}
.meet-place {
  font-size: 11px;
  color: var(--color-text-light);
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.meet-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 11px;
}
.meet-count {
  font-size: 11px;
  color: var(--color-text-light);
}
.meet-btn {
  border: none;
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary);
}
.meet-btn.joined {
  background: #fff;
  color: var(--color-primary-dark);
  box-shadow: inset 0 0 0 1px var(--color-primary);
}

/* ===== 跑团榜 ===== */
.team-board {
  padding: 6px 14px;
}
.team-row {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 11px 0;
  border-bottom: 1px solid var(--color-border);
}
.team-row:last-child {
  border-bottom: none;
}
.rank {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  border-radius: 8px;
  background: var(--color-bg);
  color: var(--color-text-light);
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.rank.r1 {
  background: #fef3c7;
  color: #b45309;
}
.rank.r2 {
  background: #e7e9ee;
  color: #5b6472;
}
.rank.r3 {
  background: #fde8d7;
  color: #b4632d;
}
.t-info {
  flex: 1;
  min-width: 0;
}
.t-info strong {
  font-size: 14px;
}
.t-info strong em {
  font-style: normal;
  font-size: 10px;
  color: var(--color-primary-dark);
  background: var(--color-primary-light);
  padding: 1px 6px;
  border-radius: 999px;
  margin-left: 6px;
}
.t-bar {
  height: 4px;
  border-radius: 2px;
  background: var(--color-bg);
  overflow: hidden;
  margin: 6px 0 4px;
}
.t-fill {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, #17c9ae, var(--color-primary-dark));
}
.t-info p {
  font-size: 11px;
  color: var(--color-text-light);
}
.t-btn {
  flex-shrink: 0;
  border: none;
  border-radius: 999px;
  padding: 6px 13px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: var(--color-primary);
}
.t-btn.joined {
  background: var(--color-primary-light);
  color: var(--color-primary-dark);
}

/* ===== 个人榜 ===== */
.solo-board {
  padding: 18px 14px 12px;
}
.podium {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  gap: 8px;
}
.pod {
  flex: 1;
  max-width: 104px;
  border-radius: 12px;
  padding: 10px 4px;
  background: var(--color-bg);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.pod.p1 {
  background: linear-gradient(180deg, #fef3c7, #fde68a);
  padding-top: 16px;
  padding-bottom: 16px;
}
.pod.p3 {
  background: #fde8d7;
}
.p-avatar {
  font-size: 24px;
}
.pod strong {
  font-size: 12px;
}
.p-km {
  font-size: 11px;
  color: var(--color-text-light);
}
.pod.p1 .p-km {
  color: #92400e;
}
.me-row {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-top: 14px;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--color-primary-light);
}
.me-row .rank {
  background: #fff;
  color: var(--color-primary-dark);
}
.me-avatar {
  font-size: 18px;
}
.me-row strong {
  flex: 1;
  font-size: 14px;
}
.me-km {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-primary-dark);
}

/* ===== 关注的人 ===== */
.follow-scroll {
  display: flex;
  gap: 14px;
  overflow-x: auto;
  scrollbar-width: none;
  margin: 0 -16px;
  padding: 4px 16px 12px;
}
.follow-scroll::-webkit-scrollbar {
  display: none;
}
.follow-item {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.avatar-wrap {
  position: relative;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  border: 2px solid var(--color-primary-light);
}
.avatar-wrap.live {
  border-color: #ef4444;
}
.live-dot {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ef4444;
  border: 2px solid var(--color-bg-card);
}
.follow-name {
  font-size: 11px;
  color: var(--color-text-light);
}

/* ===== 社区动态 ===== */
.post-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 20px;
}
.post-card {
  padding: 14px;
}
.post-head {
  display: flex;
  align-items: center;
  gap: 10px;
}
.post-head .avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-primary-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}
.post-author {
  display: flex;
  flex-direction: column;
}
.post-author strong {
  font-size: 14px;
}
.post-author span {
  font-size: 11px;
  color: var(--color-text-light);
}
.post-text {
  font-size: 14px;
  line-height: 1.6;
  margin: 10px 0 12px;
  color: var(--color-text);
}
.post-actions {
  display: flex;
  gap: 16px;
}
.post-btn {
  border: none;
  background: none;
  font-size: 13px;
  color: var(--color-text-light);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}
.post-btn.liked {
  color: #ef4444;
}

/* ===== toast ===== */
.toast {
  position: fixed;
  left: 50%;
  bottom: 60px;
  transform: translateX(-50%);
  background: rgba(15, 47, 44, 0.92);
  color: #fff;
  font-size: 13px;
  padding: 10px 20px;
  border-radius: 999px;
  z-index: 200;
  white-space: nowrap;
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
