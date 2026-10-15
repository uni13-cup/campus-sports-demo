<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
const back = () => router.push('/')

// —— 模拟案例可交互部分：对应「怎么玩」三步 ——
// 1) 挑角色和节奏目标 2) 每跑完一段播报配速变化 3) 落后提醒 / 超过夸奖
// 台词为本地预设语音包，不接大模型、不需要网络
const TARGET_SEC = 380 // 目标配速 6分20秒 / 公里

const characters = [
  {
    id: 'deer',
    label: '小鹿 · 鼓励型',
    lines: {
      ahead: '比上一段还快，你状态真好，稳住呼吸，别一下冲太猛～',
      even: '就是这个节奏，你跑得很稳，继续保持！',
      behind: '慢了一点点没关系，调整呼吸，我陪你把节奏追回来。'
    }
  },
  {
    id: 'wolf',
    label: '老狼 · 严厉型',
    lines: {
      ahead: '不错，这配速咬住了，别松劲。',
      even: '配速稳住，可以。',
      behind: '掉速了！摆臂带起来，追上我再说。'
    }
  }
]

const activeChar = ref(characters[0])
// 第一段固定 6分12秒，比目标快 8 秒，与原模拟案例展示一致
const segments = ref([372])
const broadcast = ref('')

const currentPaceText = computed(() => fmtPace(segments.value[segments.value.length - 1]))
const diffText = computed(() => {
  const idx = segments.value.length - 1
  const base = idx === 0 ? TARGET_SEC : segments.value[idx - 1]
  const diff = base - segments.value[idx] // 正数=更快
  if (diff === 0) return '与上一段持平'
  return `${diff > 0 ? '快' : '慢'} ${Math.abs(diff)} 秒`
})

function fmtPace(sec) {
  const m = Math.floor(sec / 60)
  const s = String(sec % 60).padStart(2, '0')
  return `${m}分${s}秒 / 公里`
}

function pickChar(c) {
  activeChar.value = c
  broadcast.value = ''
}

// 模拟再跑完一段：配速在目标附近随机 ±20 秒
function runNextKm() {
  const sec = TARGET_SEC + Math.floor(Math.random() * 41) - 20
  const prev = segments.value[segments.value.length - 1]
  const mood = sec < prev ? 'ahead' : sec > prev ? 'behind' : 'even'
  segments.value.push(sec)
  broadcast.value = activeChar.value.lines[mood]
}
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
      <h2>模拟案例 <span class="sim-tag">可点击体验</span></h2>
      <div class="case-card">
        <div class="case-row">
          <span>🤖 陪跑角色</span>
          <span class="char-btns">
            <button
              v-for="c in characters"
              :key="c.id"
              class="char-btn"
              :class="{ active: activeChar.id === c.id }"
              @click="pickChar(c)"
            >{{ c.label }}</button>
          </span>
        </div>
        <div class="case-row"><span>🎯 本段配速</span><span>{{ currentPaceText }}（目标 6分20秒）</span></div>
        <div class="case-row"><span>📈 对比上一段</span><span>{{ diffText }}</span></div>
      </div>
      <button class="sim-btn" @click="runNextKm">🏃 模拟跑完下 1 公里，听角色播报</button>
      <p v-if="broadcast" class="broadcast">
        <span class="broadcast-avatar">{{ activeChar.id === 'deer' ? '🦌' : '🐺' }}</span>
        <span>{{ broadcast }}</span>
      </p>
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

/* —— 模拟案例交互（新增，不动原有样式）—— */
.sim-tag { font-size: 11px; font-weight: 500; color: var(--color-primary); background: var(--color-primary-light); border-radius: 999px; padding: 2px 8px; vertical-align: 2px; }
.char-btns { display: flex; flex-wrap: wrap; gap: 6px; justify-content: flex-end; }
.char-btn { border: 1px solid var(--color-border); background: var(--color-white); color: var(--color-text); font-size: 12px; border-radius: 999px; padding: 4px 10px; cursor: pointer; }
.char-btn.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
.sim-btn { margin-top: 10px; width: 100%; border: none; border-radius: 12px; padding: 10px; background: var(--color-primary); color: #fff; font-size: 13px; cursor: pointer; }
.broadcast { margin-top: 10px; display: flex; align-items: flex-start; gap: 8px; background: var(--color-primary-light); border-radius: 12px; padding: 10px 12px; font-size: 13px; line-height: 1.6; color: var(--color-primary-dark); }
.broadcast-avatar { flex-shrink: 0; }
</style>