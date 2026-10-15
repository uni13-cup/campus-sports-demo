<script setup>
import { computed, nextTick, ref } from 'vue'
import { useRouter } from 'vue-router'

// AI 角色智能陪跑：选角色 + 定目标配速 → 每跑完 1 公里播报配速变化
// 全部使用本地预设语音包：不接大模型、不需要网络，离线也能演示
const router = useRouter()
const back = () => router.push('/play')

// —— 预设角色（台词包）——
const characters = [
  {
    id: 'deer',
    icon: '🦌',
    name: '小鹿',
    type: '鼓励型',
    color: '#0ea394',
    lines: {
      start: '别紧张，跟着我就好，我们按自己的节奏来～',
      ahead: ['哇，比目标还快！你今天状态超好，不过别一下冲太猛哦。', '配速很漂亮！稳住呼吸，把这份感觉记住。'],
      onpace: ['就是这个节奏，你跑得很稳，继续保持！', '完美贴住目标配速，步频很均匀，加油！'],
      behind: ['没关系，深呼吸，把步子放轻松，我就在你旁边。', '稍微慢了一点点，调整呼吸，我们一起追回来。']
    }
  },
  {
    id: 'wolf',
    icon: '🐺',
    name: '老狼',
    type: '严厉型',
    color: '#b45309',
    lines: {
      start: '目标定了就别废话，跟紧我，掉队自己加练。',
      ahead: ['不错，这才像话。别得意，把配速给我咬住。', '有进步，但这只是开始，继续。'],
      onpace: ['配速稳住，可以。别松劲。', '达标了，保持摆臂，别让我抓到你掉速。'],
      behind: ['掉速了！摆臂带起来，步频提上去，别让我等你。', '想停下来？没门，先追上我再说。']
    }
  },
  {
    id: 'bot',
    icon: '🤖',
    name: 'PaceBot',
    type: '数据型',
    color: '#334155',
    lines: {
      start: '系统就绪。已锁定目标配速，将逐公里进行播报。',
      ahead: ['检测到当前配速快于目标，运动表现良好，建议保留 10% 体能余量。'],
      onpace: ['当前配速与目标偏差小于 3 秒，处于最优区间，请保持。'],
      behind: ['警告：当前配速低于目标，建议提高步频、缩小步幅，30 秒后复测。']
    }
  }
]

// —— 目标配速（秒/公里）——
const goals = [
  { label: "5'30\"", sec: 330 },
  { label: "6'00\"", sec: 360 },
  { label: "6'30\"", sec: 390 },
  { label: "7'00\"", sec: 420 }
]

const activeChar = ref(characters[0])
const activeGoal = ref(goals[1])
// —— 目标距离（公里）——
const distances = [3, 5, 10]
const goalKm = ref(5)
const voiceOn = ref(false)
const feed = ref([])          // 播报流
const segments = ref([])      // 每公里数据
const feedEl = ref(null)

const totalKm = computed(() => segments.value.length)
const finished = computed(() => totalKm.value >= goalKm.value)
const avgPace = computed(() => {
  if (!segments.value.length) return null
  const avg = segments.value.reduce((s, x) => s + x.sec, 0) / segments.value.length
  return fmtPace(avg)
})
// 总用时（秒 → m分ss秒）
const totalDur = computed(() =>
  segments.value.reduce((s, x) => s + x.sec, 0)
)
const durText = computed(() => fmtDur(totalDur.value))
// 达标判定：平均配速不慢于目标
const achieved = computed(() => {
  if (!segments.value.length) return false
  const avg = totalDur.value / segments.value.length
  return avg <= activeGoal.value.sec + 3
})
const steadyCount = computed(() =>
  segments.value.filter((x) => Math.abs(x.delta) < 4).length
)

// 完赛收尾台词（本地预设）
const finishLines = {
  deer: '太棒了，全程我都在旁边看着呢，回去好好拉伸，下次我们再一起跑～',
  wolf: '今天没掉队，算你及格。想达标？明天加练两公里。',
  bot: '本次训练结束。分段配速稳定率 {steady}%，已生成训练摘要，数据仅存本地。'
}

function fmtPace(sec) {
  const m = Math.floor(sec / 60)
  const s = String(Math.round(sec % 60)).padStart(2, '0')
  return `${m}'${s}"`
}

function fmtDur(sec) {
  const m = Math.floor(sec / 60)
  const s = String(sec % 60).padStart(2, '0')
  return `${m} 分 ${s} 秒`
}

function pickGoal(g) {
  activeGoal.value = g
}
function pickDistance(d) {
  if (totalKm.value > 0) return // 开跑后距离锁定，重置后才可改
  goalKm.value = d
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function speak(text) {
  if (!voiceOn.value || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'zh-CN'
  u.rate = 1.05
  window.speechSynthesis.speak(u)
}

function pushFeed(text, mood) {
  feed.value.push({
    id: Date.now() + Math.random(),
    icon: activeChar.value.icon,
    name: activeChar.value.name,
    text,
    mood
  })
  speak(text)
  nextTick(() => {
    if (feedEl.value) feedEl.value.scrollTop = feedEl.value.scrollHeight
  })
}

function selectChar(c) {
  activeChar.value = c
  window.speechSynthesis?.cancel()
  pushFeed(c.lines.start, 'start')
}

// 模拟跑完 1 公里：配速在目标附近 -20~+25 秒随机波动
function runSegment() {
  const deltaSec = Math.floor(Math.random() * 46) - 20
  const sec = activeGoal.value.sec + deltaSec
  const mood = deltaSec <= -4 ? 'ahead' : deltaSec >= 4 ? 'behind' : 'onpace'
  segments.value.push({ sec, delta: deltaSec, mood })

  const pack = activeChar.value.lines[mood]
  const line = Array.isArray(pack) ? pick(pack) : pack
  const diffTxt = deltaSec === 0
    ? '与目标持平'
    : `${deltaSec < 0 ? '快' : '慢'} ${Math.abs(deltaSec)} 秒`
  pushFeed(`第 ${segments.value.length} 公里 · ${fmtPace(sec)}/公里，${diffTxt}。${line}`, mood)

  // 跑完目标距离 → 出训练摘要（模拟「生成训练报告」，数据只在本地）
  if (segments.value.length >= goalKm.value) {
    const steady = Math.round((steadyCount.value / goalKm.value) * 100)
    let tail = finishLines[activeChar.value.id]
    tail = tail.replace('{steady}', String(steady))
    pushFeed(
      `🏁 完赛！${goalKm.value} 公里总用时 ${fmtDur(totalDur.value)}，平均配速 ${avgPace.value}/公里（目标 ${activeGoal.value.label}），配速稳定率 ${steady}%，${achieved.value ? '平均配速达标' : '未达目标配速'}。${tail}`,
      'start'
    )
  }
}

function reset() {
  window.speechSynthesis?.cancel()
  feed.value = []
  segments.value = []
  pushFeed(activeChar.value.lines.start, 'start')
}

// 初始化第一条播报
pushFeed(characters[0].lines.start, 'start')
</script>

<template>
  <div class="page feature-page">
    <button class="back-btn" @click="back">← 返回趣味玩法</button>
    <h1 class="title">🤖 AI 角色智能陪跑</h1>
    <div class="badge">概念原型 · 本地预设语音包</div>

    <p class="lead">跑步的时候有人说话，比一个人戴耳机强。</p>

    <!-- 角色选择 -->
    <div class="section-head"><h2>选择陪跑角色</h2></div>
    <div class="chars">
      <button
        v-for="c in characters"
        :key="c.id"
        class="char-card"
        :class="{ active: activeChar.id === c.id }"
        :style="activeChar.id === c.id ? { borderColor: c.color } : {}"
        @click="selectChar(c)"
      >
        <span class="char-icon" :style="{ background: c.color + '1a' }">{{ c.icon }}</span>
        <strong>{{ c.name }}</strong>
        <span>{{ c.type }}</span>
      </button>
    </div>

    <!-- 目标距离 -->
    <div class="section-head"><h2>目标距离</h2></div>
    <div class="chips">
      <button
        v-for="d in distances"
        :key="d"
        class="chip"
        :class="{ active: goalKm === d }"
        :disabled="totalKm > 0"
        @click="pickDistance(d)"
      >{{ d }} 公里</button>
    </div>

    <!-- 目标配速 -->
    <div class="section-head"><h2>目标配速</h2></div>
    <div class="chips">
      <button
        v-for="g in goals"
        :key="g.label"
        class="chip"
        :class="{ active: activeGoal.label === g.label }"
        @click="pickGoal(g)"
      >{{ g.label }} / km</button>
    </div>

    <!-- 数据面板 -->
    <section class="dash">
      <div><strong>{{ totalKm }}/{{ goalKm }}</strong><span>进度（公里）</span></div>
      <div><strong>{{ avgPace ?? '--' }}</strong><span>平均配速</span></div>
      <div><strong :class="segments.length && segments[segments.length-1].mood">
        {{ segments.length ? fmtPace(segments[segments.length-1].sec) : '--' }}
      </strong><span>上公里</span></div>
    </section>
    <div class="km-progress">
      <div class="km-progress-fill" :style="{ width: Math.min(100, (totalKm / goalKm) * 100) + '%' }"></div>
    </div>

    <!-- 完赛摘要横幅 -->
    <div v-if="finished" class="finish-banner" :class="{ ok: achieved }">
      <div class="finish-icon">{{ achieved ? '🏆' : '📋' }}</div>
      <div class="finish-body">
        <strong>{{ achieved ? '达标完成！' : '完成本次训练' }}</strong>
        <span>{{ goalKm }} 公里 · 总用时 {{ durText }} · 平均 {{ avgPace }}/km · 稳定 {{ steadyCount }}/{{ goalKm }} 段</span>
      </div>
    </div>

    <!-- 对话播报流 -->
    <div ref="feedEl" class="feed card-box">
      <div
        v-for="f in feed"
        :key="f.id"
        class="bubble"
        :class="f.mood"
      >
        <span class="bubble-icon">{{ f.icon }}</span>
        <div class="bubble-body">
          <span class="bubble-name">{{ f.name }}</span>
          <p>{{ f.text }}</p>
        </div>
      </div>
    </div>

    <!-- 分段配速历史 -->
    <div v-if="segments.length" class="seg-history card-box">
      <div class="seg-head"><span>分段配速</span><span>目标 {{ activeGoal.label }}</span></div>
      <div class="seg-list">
        <div v-for="(s, i) in segments" :key="i" class="seg-row" :class="s.mood">
          <span class="seg-km">{{ i + 1 }} km</span>
          <span class="sec-bar-wrap">
            <i class="seg-bar" :style="{ width: Math.max(8, 100 - Math.abs(s.delta) * 3) + '%' }"></i>
          </span>
          <span class="seg-pace">{{ fmtPace(s.sec) }}</span>
          <span class="seg-delta">{{ s.delta === 0 ? '持平' : (s.delta < 0 ? '快 ' : '慢 ') + Math.abs(s.delta) + '″' }}</span>
        </div>
      </div>
    </div>

    <!-- 操作 -->
    <div class="actions">
      <button class="go-btn" :disabled="finished" @click="runSegment">
        {{ finished ? '✅ 本次训练已完成' : `🏃 模拟跑完第 ${totalKm + 1} 公里（${totalKm}/${goalKm}）` }}
      </button>
      <button class="ghost-btn" @click="reset">重置</button>
    </div>
    <label class="voice-toggle">
      <input type="checkbox" v-model="voiceOn" />
      <span>🔊 开启语音朗读（浏览器内置语音，无需联网）</span>
    </label>

    <!-- 设计依据 -->
    <details class="design">
      <summary>设计依据</summary>
      <p>即时、个性化的反馈能提升运动坚持度。播报全部来自本地预设台词包，不接入大模型接口——既避免 API 费用和密钥暴露，也保证没有网络时依然能播报。</p>
      <p class="disclaimer">＊配速数据为点击模拟生成，非真实传感器记录。</p>
    </details>
  </div>
</template>

<style scoped>
.feature-page { padding-bottom: 48px; }
.back-btn { all: unset; cursor: pointer; color: var(--color-text-light); font-size: 14px; margin-bottom: 16px; }
.title { font-size: 24px; color: var(--color-primary); }
.badge { display: inline-block; background: var(--color-primary-light); color: var(--color-accent); font-size: 12px; padding: 4px 10px; border-radius: 20px; margin-top: 8px; }
.lead { font-size: 15px; line-height: 1.7; color: var(--color-text); margin: 14px 0 4px; }

.section-head { margin: 20px 0 10px; }
.section-head h2 { font-size: 16px; color: var(--color-text); }

/* 角色卡 */
.chars { display: flex; gap: 10px; }
.char-card {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px;
  background: var(--color-white); border: 2px solid var(--color-border);
  border-radius: var(--radius); box-shadow: var(--shadow);
  padding: 14px 6px; cursor: pointer; transition: border-color 0.15s, transform 0.15s;
}
.char-card:active { transform: scale(0.97); }
.char-card strong { font-size: 14px; color: var(--color-text); }
.char-card span:last-child { font-size: 11.5px; color: var(--color-text-light); }
.char-icon {
  width: 46px; height: 46px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px; margin-bottom: 4px;
}

/* 配速 chips */
.chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip {
  border: 1px solid var(--color-border); background: var(--color-white);
  border-radius: 999px; padding: 7px 14px; font-size: 13px;
  color: var(--color-text); cursor: pointer;
}
.chip.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; font-weight: 700; }
.chip:disabled { opacity: 0.45; cursor: not-allowed; }

/* 数据面板 */
.dash {
  margin-top: 18px;
  display: flex; gap: 10px;
  background: linear-gradient(140deg, #14544d, #0f2f2c);
  border-radius: 18px; padding: 16px 10px;
}
.dash div { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.dash strong { font-size: 22px; color: #fff; font-variant-numeric: tabular-nums; }
.dash span { font-size: 11px; color: rgba(255,255,255,0.6); }
.dash .ahead { color: #6ff0c8; }
.dash .behind { color: #ffb4b4; }
.dash .onpace { color: #fde68a; }

/* 公里进度条 + 完赛横幅 */
.km-progress { margin-top: 8px; height: 5px; border-radius: 999px; background: var(--color-border); overflow: hidden; }
.km-progress-fill { height: 100%; border-radius: 999px; background: linear-gradient(90deg, #14c8ae, var(--color-primary-dark)); transition: width 0.35s ease; }
.finish-banner {
  margin-top: 12px; display: flex; align-items: center; gap: 12px;
  background: var(--color-white); border: 1px solid var(--color-border);
  border-left: 4px solid var(--color-text-light);
  border-radius: var(--radius); box-shadow: var(--shadow); padding: 12px 14px;
}
.finish-banner.ok { border-left-color: var(--color-primary); }
.finish-icon { font-size: 26px; }
.finish-body { display: flex; flex-direction: column; gap: 3px; }
.finish-body strong { font-size: 14.5px; color: var(--color-text); }
.finish-body span { font-size: 12px; color: var(--color-text-light); font-variant-numeric: tabular-nums; }

/* 分段历史 */
.seg-history { margin-top: 16px; padding: 12px 14px; }
.seg-head { display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 700; color: var(--color-text); margin-bottom: 8px; }
.seg-head span:last-child { color: var(--color-text-light); font-weight: 400; }
.seg-list { display: flex; flex-direction: column; gap: 7px; }
.seg-row { display: flex; align-items: center; gap: 10px; font-size: 12.5px; color: var(--color-text); }
.seg-km { width: 40px; flex-shrink: 0; color: var(--color-text-light); font-variant-numeric: tabular-nums; }
.sec-bar-wrap { flex: 1; height: 6px; border-radius: 999px; background: #eef3f2; overflow: hidden; }
.seg-bar { display: block; height: 100%; border-radius: 999px; background: var(--color-primary); }
.seg-row.ahead .seg-bar { background: #0ea394; }
.seg-row.behind .seg-bar { background: #e07a5f; }
.seg-row.onpace .seg-bar { background: #eab308; }
.seg-pace { width: 46px; flex-shrink: 0; text-align: right; font-variant-numeric: tabular-nums; font-weight: 600; }
.seg-delta { width: 48px; flex-shrink: 0; text-align: right; color: var(--color-text-light); font-variant-numeric: tabular-nums; }
.seg-row.ahead .seg-delta { color: var(--color-primary-dark); }
.seg-row.behind .seg-delta { color: #c2410c; }
.seg-row.onpace .seg-delta { color: #a16207; }

/* 播报流 */
.feed {
  margin-top: 16px;
  max-height: 300px; overflow-y: auto;
  background: var(--color-white); border: 1px solid var(--color-border);
  border-radius: var(--radius); box-shadow: var(--shadow);
  padding: 14px; display: flex; flex-direction: column; gap: 12px;
}
.bubble { display: flex; gap: 10px; }
.bubble-icon {
  width: 34px; height: 34px; flex-shrink: 0; border-radius: 50%;
  background: var(--color-primary-light);
  display: flex; align-items: center; justify-content: center; font-size: 17px;
}
.bubble-body {
  flex: 1; background: #f3f8f7; border-radius: 4px 14px 14px 14px;
  padding: 9px 12px;
}
.bubble-name { font-size: 11px; font-weight: 700; color: var(--color-primary-dark); }
.bubble-body p { margin: 2px 0 0; font-size: 13px; line-height: 1.6; color: var(--color-text); }
.bubble.ahead .bubble-body { background: #e8faf4; }
.bubble.behind .bubble-body { background: #fdeeee; }
.bubble.onpace .bubble-body { background: #fef8e7; }
.bubble.start .bubble-body { background: #f3f8f7; }

/* 操作 */
.actions { display: flex; gap: 10px; margin-top: 16px; }
.go-btn {
  flex: 1; border: none; border-radius: 14px; height: 50px;
  background: linear-gradient(135deg, #14c8ae, var(--color-primary-dark));
  color: #fff; font-size: 15px; font-weight: 700; cursor: pointer;
  box-shadow: 0 8px 18px rgba(7, 120, 109, 0.25);
}
.go-btn:disabled { background: #a7c4bf; box-shadow: none; cursor: default; }
.ghost-btn {
  width: 84px; border: 1px solid var(--color-border); background: var(--color-white);
  border-radius: 14px; font-size: 14px; color: var(--color-text-light); cursor: pointer;
}
.voice-toggle {
  display: flex; align-items: center; gap: 8px;
  margin-top: 14px; font-size: 12.5px; color: var(--color-text-light); cursor: pointer;
}

/* 设计依据 */
.design { margin-top: 20px; font-size: 13px; color: var(--color-text); }
.design summary { cursor: pointer; color: var(--color-accent); font-size: 14px; font-weight: 600; }
.design p { line-height: 1.7; margin: 10px 0 0; }
.disclaimer { color: var(--color-text-light); font-size: 12px; }
</style>
