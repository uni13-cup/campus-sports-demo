<script setup>
import { computed, nextTick, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
// 真实数据连接：复用核验模块的传感器管线（加速度→步频→速度→真实里程，判定通过才累计）
import { HZ, WIN, DT, analyze, classify, speedFromCadence } from '../../verify/analyzer'
import { attachMotion, requestMotionPermission, isSecure } from '../../verify/sensor'

// AI 角色智能陪跑：选角色 + 定目标配速 → 每跑完 1 公里播报配速变化
// 全部使用本地预设语音包：不接大模型、不需要网络，离线也能演示
const router = useRouter()
const back = () => router.push('/play')

// —— 陪跑风格台词包（数据层：预设角色与自定义角色共用同一套结构）——
// 每条可以是：字符串 / 字符串数组（随机取一条）/ 函数（注入当前训练数据）
const PACKS = {
  cheer: {
    type: '鼓励型', color: '#0ea394', icon: '🦌',
    lines: {
      start: '别紧张，跟着我就好，我们按自己的节奏来～',
      ahead: ['哇，比目标还快！你今天状态超好，不过别一下冲太猛哦。', '配速很漂亮！稳住呼吸，把这份感觉记住。'],
      onpace: ['就是这个节奏，你跑得很稳，继续保持！', '完美贴住目标配速，步频很均匀，加油！'],
      behind: ['没关系，深呼吸，把步子放轻松，我就在你旁边。', '稍微慢了一点点，调整呼吸，我们一起追回来。'],
      half: ['已经过半啦，最难的部分其实才刚开始，我们一起咬住！', '半程达成！呼吸和步子都很稳，继续相信自己。'],
      final: ['最后一公里啦！冲过终点好好犒劳自己，加油！', '看到终点了吗？把背挺起来，用最帅的姿势冲线！'],
      finish: () => '太棒了，全程我都在旁边看着呢，回去好好拉伸，下次我们再一起跑～',
      tired: ['累就对了，说明你在变强。放慢 10 秒也行，别停下来走。', '手臂摆起来，吸气两步、呼气两步，我陪你撑过这一公里。'],
      far: (d) => `还剩 ${d.remaining} 公里，按现在的节奏大概还要 ${d.eta}，我们一小段一小段来。`,
      wait: ['好好好，我慢一点，你把呼吸调匀，跟上我三步就行。']
    }
  },
  strict: {
    type: '严厉型', color: '#b45309', icon: '🐺',
    lines: {
      start: '目标定了就别废话，跟紧我，掉队自己加练。',
      ahead: ['不错，这才像话。别得意，把配速给我咬住。', '有进步，但这只是开始，继续。'],
      onpace: ['配速稳住，可以。别松劲。', '达标了，保持摆臂，别让我抓到你掉速。'],
      behind: ['掉速了！摆臂带起来，步频提上去，别让我等你。', '想停下来？没门，先追上我再说。'],
      half: ['过半了。后半程才是真训练，别给我垮。', '半程，保持。把现在的配速给我焊死。'],
      final: ['最后一公里！冲刺，冲不动就给我滚到终点！', '别回头，冲线！今天的成绩你自己有数。'],
      finish: () => '今天没掉队，算你及格。想达标？明天加练两公里。',
      tired: ['累？你的对手可不会等你。再顶一公里。', '不想练的人早就在床上了，你还在这跑——继续。'],
      far: (d) => `还剩 ${d.remaining} 公里。少看表，多迈腿。`,
      wait: ['等你？行，我只给你 30 秒，30 秒后追上来。']
    }
  },
  data: {
    type: '数据型', color: '#334155', icon: '🤖',
    lines: {
      start: '系统就绪。已锁定目标配速，将逐公里进行播报。',
      ahead: ['检测到当前配速快于目标，运动表现良好，建议保留 10% 体能余量。'],
      onpace: ['当前配速与目标偏差小于 3 秒，处于最优区间，请保持。'],
      behind: ['警告：当前配速低于目标，建议提高步频、缩小步幅，30 秒后复测。'],
      half: (d) => `里程过半，当前平均配速 ${d.avg}，建议保持心率区间、注意补给。`,
      final: ['进入最后一公里，可将步频提升至 180 spm，准备冲刺。'],
      finish: (d) => `本次训练结束。配速稳定率 ${d.steady}%，最快 ${d.best}、最慢 ${d.worst}，训练报告已生成，数据仅存本地。`,
      tired: ['疲劳反馈已记录。建议：步幅缩小 5%、保持步频，切勿直接停跑。'],
      far: (d) => `剩余 ${d.remaining} 公里，预计剩余用时 ${d.eta}。`,
      wait: ['已进入巡航伴跑模式，配速下调 5 秒/公里，请在 200 米内回位。']
    }
  },
  funny: {
    type: '损友型', color: '#db2777', icon: '🐱',
    lines: {
      start: '哈喽啊，今天别又跑一半拐去买奶茶啊。',
      ahead: ['哟，跑这么快？前面是有共享单车要扫吗？', '可以啊，脚后跟都快跑出火星子了，稳住别摔。'],
      onpace: ['配速拿捏，丑但稳，也是一种实力。', '这个速度非常合适——既不会瘦太快让朋友认不出，也不会白跑。'],
      behind: ['哎哎哎，前面走路的大爷都超你三回了。', '要不要我帮你拦辆校园小巴？算了，跑都跑了。'],
      half: ['半程了！奶茶店还有两公里——我是说终点还有两公里。', '跑完一半，腹肌正在感谢你，再坚持一下。'],
      final: ['最后一公里！冲啊！跑完你就是朋友圈最靓的仔（分组可见也行）！'],
      finish: () => '行了别叉着腰喘了，走两步缓缓，记得拉伸，不然明天下楼得扶墙。',
      tired: ['累？你昨晚追剧到两点的时候可没说累。', '想想你收藏的「跑步必瘦」，现在就是它生效的时候。'],
      far: (d) => `还剩 ${d.remaining} 公里，近得很，也就是再刷六条短视频的事。`,
      wait: ['等你等你，反正我一个 AI 也不累，就是有点丢人。']
    }
  }
}

// 预设角色（引用风格包）
const presetChars = [
  { id: 'deer', name: '小鹿', pack: 'cheer' },
  { id: 'wolf', name: '老狼', pack: 'strict' },
  { id: 'bot', name: 'PaceBot', pack: 'data' }
]

// 把角色规格补全为可渲染对象（预设与自定义同构）
function buildChar(spec) {
  const pk = PACKS[spec.pack]
  return {
    ...spec,
    icon: spec.icon || pk.icon,
    type: pk.type + (spec.custom ? ' · 自定义' : ''),
    color: pk.color,
    lines: pk.lines
  }
}

// —— 目标配速（秒/公里）——
const goals = [
  { label: "5'30\"", sec: 330 },
  { label: "6'00\"", sec: 360 },
  { label: "6'30\"", sec: 390 },
  { label: "7'00\"", sec: 420 }
]

// —— 自定义角色（localStorage 持久化，刷新/下次打开还在）——
const CUSTOM_KEY = 'ai-pacer-custom-chars-v1'
const customChars = ref(loadCustom())
const allChars = computed(() => [
  ...presetChars.map(buildChar),
  ...customChars.value.map(buildChar)
])
const activeChar = ref(allChars.value[0])

function loadCustom() {
  try {
    const raw = JSON.parse(localStorage.getItem(CUSTOM_KEY) || '[]')
    return Array.isArray(raw) ? raw.filter((x) => x && PACKS[x.pack]) : []
  } catch {
    return []
  }
}
function persistCustom() {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(customChars.value))
}

// 自定义角色表单
const charIcons = ['🦌', '🐺', '🤖', '🐱', '🐯', '🦊', '🐼', '🦁', '🐰', '🐨']
const styleOptions = [
  { id: 'cheer', label: '元气鼓励' },
  { id: 'strict', label: '硬核严厉' },
  { id: 'data', label: '理性数据' },
  { id: 'funny', label: '损友搞笑' }
]
const showCharForm = ref(false)
const charForm = ref({ name: '', icon: '🐱', pack: 'funny', catchphrase: '' })
const formError = ref('')

function openCharForm() {
  charForm.value = { name: '', icon: '🐱', pack: 'funny', catchphrase: '' }
  formError.value = ''
  showCharForm.value = true
}
function saveCustomChar() {
  const name = charForm.value.name.trim()
  if (!name) { formError.value = '给你的陪跑起个名字吧'; return }
  if (name.length > 8) { formError.value = '名字别超过 8 个字'; return }
  const spec = {
    id: 'custom-' + Date.now(),
    custom: true,
    name,
    icon: charForm.value.icon,
    pack: charForm.value.pack,
    catchphrase: charForm.value.catchphrase.trim().slice(0, 12)
  }
  customChars.value.push(spec)
  persistCustom()
  showCharForm.value = false
  selectChar(buildChar(spec))
}
function removeCustomChar(c) {
  if (!c.custom) return
  customChars.value = customChars.value.filter((x) => x.id !== c.id)
  persistCustom()
  if (activeChar.value.id === c.id) selectChar(allChars.value[0])
}

// —— 目标：距离 / 配速（预设 + 自定义）——
const activeGoal = ref(goals[1])
const distances = [3, 5, 10]
const goalKm = ref(5)
const showKmInput = ref(false)
const kmDraft = ref('')
const kmError = ref('')
const showPaceInput = ref(false)
const paceMin = ref('6')
const paceSec = ref('10')
const paceError = ref('')
const locked = computed(() => totalKm.value > 0) // 开跑后目标锁定

function applyCustomKm() {
  const v = Number(kmDraft.value)
  if (!Number.isFinite(v) || v < 1 || v > 42 || !Number.isInteger(v)) {
    kmError.value = '请输入 1~42 的整数公里'
    return
  }
  goalKm.value = v
  showKmInput.value = false
  kmError.value = ''
}
function applyCustomPace() {
  const m = Number(paceMin.value), s = Number(paceSec.value)
  if (![m, s].every(Number.isInteger) || m < 3 || m > 10 || s < 0 || s > 59) {
    paceError.value = '配速范围 3′00″~10′00″，秒 0~59'
    return
  }
  const sec = m * 60 + s
  activeGoal.value = { label: fmtPace(sec), sec, custom: true }
  showPaceInput.value = false
  paceError.value = ''
}
const isCustomKm = computed(() => !distances.includes(goalKm.value))
const goalChipLabel = computed(() => `✏️ ${goalKm} km`)

const voiceOn = ref(false)
const feed = ref([])          // 播报流
const segments = ref([])      // 每公里数据
const feedEl = ref(null)

const totalKm = computed(() => segments.value.length)
const finished = computed(() => totalKm.value >= goalKm.value)
const avgSec = computed(() =>
  segments.value.length ? segments.value.reduce((s, x) => s + x.sec, 0) / segments.value.length : null
)
const avgPace = computed(() => (avgSec.value === null ? null : fmtPace(avgSec.value)))
// 总用时（秒 → m分ss秒）
const totalDur = computed(() => segments.value.reduce((s, x) => s + x.sec, 0))
const durText = computed(() => fmtDur(totalDur.value))
// 计划用时（按目标配速）
const planDurText = computed(() => fmtDur(goalKm.value * activeGoal.value.sec))
// 预计完赛时间 ETA：跑起来按当前均速，没跑按目标配速
const etaText = computed(() =>
  fmtDur(Math.round((avgSec.value ?? activeGoal.value.sec) * goalKm.value))
)
const remainKm = computed(() => goalKm.value - totalKm.value)
const remainText = computed(() =>
  fmtDur(Math.round((avgSec.value ?? activeGoal.value.sec) * Math.max(0, remainKm.value)))
)
// 达标判定：平均配速不慢于目标
const achieved = computed(() =>
  avgSec.value !== null && avgSec.value <= activeGoal.value.sec + 3
)
const steadyCount = computed(() => segments.value.filter((x) => Math.abs(x.delta) < 4).length)
const bestPace = computed(() => segments.value.length ? fmtPace(Math.min(...segments.value.map((x) => x.sec))) : null)
const worstPace = computed(() => segments.value.length ? fmtPace(Math.max(...segments.value.map((x) => x.sec))) : null)
// 与计划的总用时差（正=慢于计划）
const planGap = computed(() => totalDur.value - activeGoal.value.sec * totalKm.value)

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
  if (locked.value) return
  activeGoal.value = g
  showPaceInput.value = false
}
function pickDistance(d) {
  if (locked.value) return // 开跑后距离锁定，重置后才可改
  goalKm.value = d
  showKmInput.value = false
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

// 当前训练数据（注入函数型台词）
function trainData() {
  return {
    km: goalKm.value,
    pace: activeGoal.value.label,
    plan: planDurText.value,
    remaining: remainKm.value,
    eta: remainText.value,
    avg: avgPace.value ?? activeGoal.value.label
  }
}

// 取角色台词：字符串 / 数组随机 / 函数注入数据；自定义角色按概率带口头禅
function lineOf(char, key, data) {
  const raw = char.lines[key] ?? ''
  let line = typeof raw === 'function' ? raw(data) : Array.isArray(raw) ? pick(raw) : raw
  if (char.catchphrase && !['start', 'finish'].includes(key) && Math.random() < 0.45) {
    line += `（${char.catchphrase}）`
  }
  return line
}

function speak(text) {
  if (!voiceOn.value || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'zh-CN'
  u.rate = 1.05
  window.speechSynthesis.speak(u)
}

function pushFeed(text, mood = 'start') {
  feed.value.push({
    id: Date.now() + Math.random(),
    who: 'ai',
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

// 用户向陪跑喊话（右侧气泡）
function pushUser(text) {
  feed.value.push({ id: Date.now() + Math.random(), who: 'me', text })
  nextTick(() => {
    if (feedEl.value) feedEl.value.scrollTop = feedEl.value.scrollHeight
  })
}

function selectChar(c) {
  activeChar.value = c
  window.speechSynthesis?.cancel()
  pushFeed(lineOf(c, 'start'), 'start')
}

// 模拟跑完 1 公里：目标附近随机波动 + 后程疲劳偏移（越往后越容易掉秒，贴近真实）
function runSegment() {
  if (finished.value) return
  const fatigue = Math.round((segments.value.length / goalKm.value) * 10)
  const deltaSec = Math.floor(Math.random() * 46) - 20 + fatigue
  const sec = activeGoal.value.sec + deltaSec
  const mood = deltaSec <= -4 ? 'ahead' : deltaSec >= 4 ? 'behind' : 'onpace'
  segments.value.push({ sec, delta: deltaSec, mood })
  const n = segments.value.length
  const isFinal = n >= goalKm.value
  const isHalf = !isFinal && goalKm.value >= 4 && n === Math.ceil(goalKm.value / 2)

  const diffTxt = deltaSec === 0
    ? '与目标持平'
    : `${deltaSec < 0 ? '快' : '慢'} ${Math.abs(deltaSec)} 秒`
  const data = trainData()
  // 最后一公里用冲刺台词，其余用常规快慢台词
  const line = lineOf(activeChar.value, isFinal ? 'final' : mood, data)
  pushFeed(
    `第 ${n} 公里${isFinal ? '（最后一公里）' : ''} · ${fmtPace(sec)}/公里，${diffTxt}。累计 ${fmtDur(totalDur.value)}，预计 ${etaText.value} 完赛。${line}`,
    mood
  )

  // 过半提示
  if (isHalf) pushFeed(lineOf(activeChar.value, 'half', data), 'onpace')

  // 跑完目标距离 → 出训练摘要（模拟「生成训练报告」，数据只在本地）
  if (isFinal) finishReport('sim')
}

// 跑步中向陪跑快捷喊话
const quickTalks = [
  { key: 'tired', label: '🥵 我有点累' },
  { key: 'far', label: '⏱ 还有多远' },
  { key: 'wait', label: '🙏 等等我' }
]
function ask(kind) {
  const talk = quickTalks.find((x) => x.key === kind)
  pushUser(talk.label.replace(/^\S+\s/, ''))
  const data = trainData()
  let mood = 'start'
  if (kind === 'far') mood = 'onpace'
  if (kind === 'tired') mood = 'behind'
  pushFeed(lineOf(activeChar.value, kind, data), mood)
}

function reset() {
  window.speechSynthesis?.cancel()
  stopLive()
  feed.value = []
  segments.value = []
  showKmInput.value = false
  showPaceInput.value = false
  pushFeed(lineOf(activeChar.value, 'start'), 'start')
}

// ================= 真实数据连接：传感器陪跑 =================
// 复用核验模块管线：加速度 50Hz → 滑动窗自相关 → 步频/速度 → 判定为真跑步才累计里程
const mode = ref('sim') // sim 模拟演示 | live 连接真实传感器
const securePage = isSecure()
const live = reactive({
  on: false, cad: 0, speed: 0, km: 0, sec: 0,
  verdict: '未开始', verdictCls: '', state: 'idle' // idle|requesting|on|denied|nodata
})
let liveTimer = null, liveDetach = null, liveBuf = [], livePhaseT = 0, liveLatest = null, liveHasData = false, segStartSec = 0

function switchMode(m) {
  if (m === mode.value) return
  stopLive()
  mode.value = m
}

async function startLive() {
  if (live.on || finished.value) return
  live.state = 'requesting'
  const granted = await requestMotionPermission()
  if (!granted) { live.state = 'denied'; live.verdict = '未授权传感器权限'; return }
  liveBuf = []; livePhaseT = 0; liveLatest = null; liveHasData = false
  if (totalKm.value === 0) { live.km = 0; live.sec = 0; segStartSec = 0 }
  liveDetach = attachMotion((v) => { liveLatest = v; liveHasData = true; live.state = 'on' })
  live.on = true
  live.verdict = '采样中…'
  live.verdictCls = ''
  liveTimer = setInterval(liveTick, 1000 * DT)
  setTimeout(() => { if (live.on && !liveHasData) live.state = 'nodata' }, 3000)
  pushFeed(`📡 已连接手机运动传感器，开始真实陪跑。目标 ${goalKm.value} 公里 / ${activeGoal.value.label}/公里，判定为真实跑步才累计里程，跑起来我逐公里播报。`, 'start')
}

function liveTick() {
  if (!liveHasData) return
  liveBuf.push(liveLatest)
  if (liveBuf.length > WIN) liveBuf.shift()
  livePhaseT += DT
  const f = analyze(liveBuf)
  const moving = f && f.cad >= 70 && f.p >= 0.5
  const sp = moving ? speedFromCadence(f.cad) : 0
  const v = classify(f, sp)
  live.verdict = v.txt
  live.verdictCls = v.cls || ''
  live.cad = moving ? Math.round(f.cad) : 0
  live.speed = sp
  if (v.ok) {
    live.km += (sp / 3600) * DT
    live.sec += DT
    if (Math.floor(live.km) > segments.value.length) onLiveKm() // 真实里程跨 1 公里
  }
}

// 真实模式：实际跑完 1 公里 → 用真实用时记一段并播报
function onLiveKm() {
  const segSec = Math.round(live.sec - segStartSec)
  segStartSec = live.sec
  const deltaSec = segSec - activeGoal.value.sec
  const mood = deltaSec <= -4 ? 'ahead' : deltaSec >= 4 ? 'behind' : 'onpace'
  segments.value.push({ sec: segSec, delta: deltaSec, mood })
  const n = segments.value.length
  const isFinal = n >= goalKm.value
  const isHalf = !isFinal && goalKm.value >= 4 && n === Math.ceil(goalKm.value / 2)
  const diffTxt = deltaSec === 0 ? '与目标持平' : `${deltaSec < 0 ? '快' : '慢'} ${Math.abs(deltaSec)} 秒`
  const data = trainData()
  pushFeed(
    `📡 真实数据 · 第 ${n} 公里${isFinal ? '（最后一公里）' : ''} · ${fmtPace(segSec)}/公里，${diffTxt}。${lineOf(activeChar.value, isFinal ? 'final' : mood, data)}`,
    mood
  )
  if (isHalf) pushFeed(lineOf(activeChar.value, 'half', data), 'onpace')
  if (isFinal) {
    stopLive()
    finishReport('live')
  }
}

function stopLive() {
  live.on = false
  if (liveTimer) { clearInterval(liveTimer); liveTimer = null }
  if (liveDetach) { liveDetach(); liveDetach = null }
  if (mode.value === 'live') live.verdict = '已停止'
}

// 完赛报告（模拟/真实共用，标注数据来源）并自动存档
function finishReport(src) {
  const steady = Math.round((steadyCount.value / goalKm.value) * 100)
  const gap = planGap.value
  const gapTxt = gap === 0 ? '与计划持平' : `${gap < 0 ? '快' : '慢'}于计划 ${Math.abs(Math.round(gap))} 秒`
  const data = trainData()
  const tail = lineOf(activeChar.value, 'finish', { ...data, steady, best: bestPace.value, worst: worstPace.value })
  pushFeed(
    `🏁 完赛！${goalKm.value} 公里总用时 ${fmtDur(totalDur.value)}（计划 ${planDurText.value}，${gapTxt}），平均配速 ${avgPace.value}/公里，最快 ${bestPace.value}、最慢 ${worstPace.value}，配速稳定率 ${steady}%，${achieved.value ? '平均配速达标' : '未达目标配速'}。${src === 'live' ? '（数据来源：本机传感器）' : ''}${tail}`,
    'start'
  )
  saveRecord(src)
}

// ================= 训练记录（本地存档 + 角色复盘） =================
const RECORD_KEY = 'ai-pacer-records-v1'
const records = ref(loadRecords())
function loadRecords() {
  try {
    const raw = JSON.parse(localStorage.getItem(RECORD_KEY) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch { return [] }
}
function saveRecord(src) {
  records.value.unshift({
    id: Date.now(), src,
    date: new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    km: goalKm.value, goal: activeGoal.value.label,
    dur: totalDur.value, avg: avgPace.value,
    steady: Math.round((steadyCount.value / goalKm.value) * 100),
    achieved: achieved.value, best: bestPace.value, worst: worstPace.value,
    char: activeChar.value.name
  })
  records.value = records.value.slice(0, 5) // 只留最近 5 次
  localStorage.setItem(RECORD_KEY, JSON.stringify(records.value))
}
function removeRecord(id) {
  records.value = records.value.filter((x) => x.id !== id)
  localStorage.setItem(RECORD_KEY, JSON.stringify(records.value))
}

// 让当前角色复盘一条历史记录：给数据结论 + 对比上一次 + 风格收尾
function reviewRecord(r) {
  const idx = records.value.findIndex((x) => x.id === r.id)
  const prev = records.value[idx + 1]
  const diff = prev ? r.dur - prev.dur : null
  const compareTxt = diff === null
    ? '这是你的第一条存档记录'
    : diff === 0
      ? '与上一次总用时持平'
      : `对比 ${prev.date} 那次${diff < 0 ? '快' : '慢'}了 ${fmtDur(Math.abs(diff))}`
  const mood = r.achieved ? 'onpace' : 'behind'
  pushUser(`帮我复盘 ${r.date} 的 ${r.km} 公里`)
  pushFeed(
    `📋 复盘 ${r.date}（${r.src === 'live' ? '真实数据' : '模拟数据'}）：${r.km} 公里用时 ${fmtDur(r.dur)}，平均 ${r.avg}/公里（目标 ${r.goal}），稳定率 ${r.steady}%，最快 ${r.best}、最慢 ${r.worst}。${compareTxt}。${lineOf(activeChar.value, mood, trainData())}`,
    mood
  )
}

// 初始化第一条播报
pushFeed(lineOf(allChars.value[0], 'start'), 'start')
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
        v-for="c in allChars"
        :key="c.id"
        class="char-card"
        :class="{ active: activeChar.id === c.id }"
        :style="activeChar.id === c.id ? { borderColor: c.color } : {}"
        @click="selectChar(c)"
      >
        <span
          v-if="c.custom"
          class="char-del"
          title="删除该自定义角色"
          @click.stop="removeCustomChar(c)"
        >×</span>
        <span class="char-icon" :style="{ background: c.color + '1a' }">{{ c.icon }}</span>
        <strong>{{ c.name }}</strong>
        <span>{{ c.type }}</span>
      </button>
      <button v-if="!showCharForm" class="char-card add-card" @click="openCharForm">
        <span class="char-icon add-icon">＋</span>
        <strong>自定义</strong>
        <span>创建我的陪跑</span>
      </button>
    </div>

    <!-- 自定义角色表单 -->
    <div v-if="showCharForm" class="char-form card-box">
      <label class="form-row">
        <span>昵称</span>
        <input v-model="charForm.name" maxlength="8" placeholder="给 TA 起个名字（最多 8 字）" />
      </label>
      <div class="form-row">
        <span>头像</span>
        <div class="icon-pick">
          <button
            v-for="ic in charIcons"
            :key="ic"
            type="button"
            :class="{ active: charForm.icon === ic }"
            @click="charForm.icon = ic"
          >{{ ic }}</button>
        </div>
      </div>
      <div class="form-row">
        <span>风格</span>
        <div class="chips">
          <button
            v-for="s in styleOptions"
            :key="s.id"
            type="button"
            class="chip"
            :class="{ active: charForm.pack === s.id }"
            @click="charForm.pack = s.id"
          >{{ s.label }}</button>
        </div>
      </div>
      <label class="form-row">
        <span>口头禅</span>
        <input v-model="charForm.catchphrase" maxlength="12" placeholder="选填，如：再坚持一下（最多 12 字）" />
      </label>
      <p v-if="formError" class="form-error">{{ formError }}</p>
      <div class="form-actions">
        <button type="button" class="ghost-btn" @click="showCharForm = false">取消</button>
        <button type="button" class="save-btn" @click="saveCustomChar">保存并选用</button>
      </div>
    </div>

    <!-- 数据来源：模拟演示 / 连接真实跑步数据 -->
    <div class="section-head"><h2>数据来源</h2></div>
    <div class="mode-switch">
      <button type="button" :class="{ active: mode === 'sim' }" @click="switchMode('sim')">🎮 模拟演示</button>
      <button type="button" :class="{ active: mode === 'live' }" @click="switchMode('live')">📡 真实传感器</button>
    </div>
    <p v-if="mode === 'live'" class="mode-tip">
      将读取本机加速度传感器估算步频与里程，判定为真实跑步才累计，数据只留在本机{{ securePage ? '' : '（需 HTTPS 或 localhost 环境）' }}。
    </p>

    <!-- 目标距离 -->
    <div class="section-head"><h2>目标距离</h2></div>
    <div class="chips">
      <button
        v-for="d in distances"
        :key="d"
        type="button"
        class="chip"
        :class="{ active: goalKm === d }"
        :disabled="locked"
        @click="pickDistance(d)"
      >{{ d }} 公里</button>
      <button
        type="button"
        class="chip custom-chip"
        :class="{ active: isCustomKm }"
        :disabled="locked"
        @click="showKmInput = !showKmInput"
      >{{ isCustomKm ? goalChipLabel : '✏️ 自定义' }}</button>
    </div>
    <div v-if="showKmInput && !locked" class="inline-input">
      <input v-model="kmDraft" type="number" min="1" max="42" step="1" placeholder="1~42" />
      <span>公里</span>
      <button type="button" class="mini-btn" @click="applyCustomKm">确定</button>
      <span v-if="kmError" class="input-error">{{ kmError }}</span>
    </div>

    <!-- 目标配速 -->
    <div class="section-head"><h2>目标配速</h2></div>
    <div class="chips">
      <button
        v-for="g in goals"
        :key="g.label"
        type="button"
        class="chip"
        :class="{ active: activeGoal.sec === g.sec }"
        :disabled="locked"
        @click="pickGoal(g)"
      >{{ g.label }} / km</button>
      <button
        type="button"
        class="chip custom-chip"
        :class="{ active: activeGoal.custom }"
        :disabled="locked"
        @click="showPaceInput = !showPaceInput"
      >{{ activeGoal.custom ? `✏️ ${activeGoal.label}` : '✏️ 自定义' }}</button>
    </div>
    <div v-if="showPaceInput && !locked" class="inline-input">
      <input v-model="paceMin" type="number" min="3" max="10" />
      <span>分</span>
      <input v-model="paceSec" type="number" min="0" max="59" />
      <span>秒 / 公里</span>
      <button type="button" class="mini-btn" @click="applyCustomPace">确定</button>
      <span v-if="paceError" class="input-error">{{ paceError }}</span>
    </div>

    <!-- 今日训练计划（跑前简报，贴近真实运动 App） -->
    <section class="plan-card">
      <div class="plan-item"><strong>{{ goalKm }}</strong><span>目标公里</span></div>
      <div class="plan-item"><strong>{{ activeGoal.label }}</strong><span>目标配速</span></div>
      <div class="plan-item"><strong class="plan-time">{{ planDurText }}</strong><span>计划完赛</span></div>
    </section>
    <p v-if="locked" class="lock-tip">🔒 已开跑，目标锁定；重置后可重新设置</p>

    <!-- 数据面板 -->
    <section class="dash">
      <div><strong>{{ totalKm }}/{{ goalKm }}</strong><span>进度（公里）</span></div>
      <div><strong>{{ avgPace ?? '--' }}</strong><span>平均配速</span></div>
      <div><strong :class="segments.length && segments[segments.length-1].mood">
        {{ segments.length ? fmtPace(segments[segments.length-1].sec) : '--' }}
      </strong><span>上公里</span></div>
      <div><strong class="eta-num">{{ etaText }}</strong><span>预计完赛</span></div>
    </section>
    <div class="km-progress">
      <div class="km-progress-fill" :style="{ width: Math.min(100, (totalKm / goalKm) * 100) + '%' }"></div>
    </div>

    <!-- 真实传感器面板 -->
    <section v-if="mode === 'live'" class="live-panel">
      <div class="live-grid">
        <div><strong>{{ live.cad }}</strong><span>步频 spm</span></div>
        <div><strong>{{ live.speed.toFixed(1) }}</strong><span>速度 km/h</span></div>
        <div><strong>{{ live.km.toFixed(2) }}</strong><span>真实里程 km</span></div>
      </div>
      <div class="live-verdict" :class="live.verdictCls">{{ live.verdict }}</div>
      <p v-if="live.state === 'denied'" class="live-warn">未获得传感器权限：iPhone 请用 Safari 打开本页并允许「动作与方向访问」。</p>
      <p v-else-if="live.state === 'nodata'" class="live-warn">3 秒未读到传感器数据：本机可能没有运动传感器（如电脑），请用手机打开，或切回「模拟演示」。</p>
      <button v-if="!live.on" class="live-btn" :disabled="finished" @click="startLive">
        {{ totalKm > 0 ? '▶ 继续真实跑步' : '📡 开始真实陪跑' }}
      </button>
      <button v-else class="live-btn stop" @click="stopLive">⏸ 暂停陪跑</button>
    </section>

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
        :class="[f.who === 'me' ? 'me' : f.mood]"
      >
        <template v-if="f.who === 'me'">
          <div class="bubble-body"><p>{{ f.text }}</p></div>
          <span class="bubble-icon me-icon">🏃</span>
        </template>
        <template v-else>
          <span class="bubble-icon">{{ f.icon }}</span>
          <div class="bubble-body">
            <span class="bubble-name">{{ f.name }}</span>
            <p>{{ f.text }}</p>
          </div>
        </template>
      </div>
    </div>

    <!-- 跑步中快捷喊话 -->
    <div class="quick-talk">
      <button
        v-for="t in quickTalks"
        :key="t.key"
        type="button"
        :disabled="finished"
        @click="ask(t.key)"
      >{{ t.label }}</button>
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
      <button v-if="mode === 'sim'" class="go-btn" :disabled="finished" @click="runSegment">
        {{ finished ? '✅ 本次训练已完成' : `🏃 模拟跑完第 ${totalKm + 1} 公里（${totalKm}/${goalKm}）` }}
      </button>
      <button class="ghost-btn" :class="{ wide: mode === 'live' }" @click="reset">重置</button>
    </div>
    <label class="voice-toggle">
      <input type="checkbox" v-model="voiceOn" />
      <span>🔊 开启语音朗读（浏览器内置语音，无需联网）</span>
    </label>

    <!-- 训练记录：每次完赛自动存档，可让当前角色复盘 -->
    <div class="section-head">
      <h2>训练记录</h2>
      <span class="rec-count">{{ records.length }} 条 · 仅存本机</span>
    </div>
    <div v-if="records.length" class="record-list">
      <div v-for="r in records" :key="r.id" class="record-card">
        <div class="record-main">
          <strong>{{ r.km }} 公里 · {{ fmtDur(r.dur) }}</strong>
          <span>{{ r.date }} · 平均 {{ r.avg }}/km（目标 {{ r.goal }}）· {{ r.src === 'live' ? '📡 真实' : '🎮 模拟' }}</span>
        </div>
        <div class="record-side">
          <button type="button" class="review-btn" @click="reviewRecord(r)">让{{ activeChar.name }}复盘</button>
          <button type="button" class="rec-del" title="删除该记录" @click="removeRecord(r.id)">×</button>
        </div>
      </div>
    </div>
    <p v-else class="record-empty">完成一次训练后自动存档在这里，可随时让陪跑角色复盘。</p>

    <!-- 设计依据 -->
    <details class="design">
      <summary>设计依据</summary>
      <p>即时、个性化的反馈能提升运动坚持度。播报全部来自本地预设台词包，不接入大模型接口——既避免 API 费用和密钥暴露，也保证没有网络时依然能播报。</p>
      <p class="disclaimer">＊模拟模式为点击生成；真实模式读取本机加速度传感器估算，判定为真实跑步才累计里程，所有数据仅存本机、不上传。</p>
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
.chars { display: flex; gap: 10px; flex-wrap: wrap; }
.char-card {
  position: relative;
  flex: 1 1 22%; min-width: 72px;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  background: var(--color-white); border: 2px solid var(--color-border);
  border-radius: var(--radius); box-shadow: var(--shadow);
  padding: 14px 6px; cursor: pointer; transition: border-color 0.15s, transform 0.15s;
}
.char-card:active { transform: scale(0.97); }
.char-card strong { font-size: 14px; color: var(--color-text); }
.char-card span:last-child { font-size: 11.5px; color: var(--color-text-light); text-align: center; }
.char-icon {
  width: 46px; height: 46px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 24px; margin-bottom: 4px;
}
.char-del {
  position: absolute; top: 4px; right: 6px;
  width: 18px; height: 18px; line-height: 16px; text-align: center;
  border-radius: 50%; background: var(--color-border); color: var(--color-text-light);
  font-size: 13px;
}
.add-card { border-style: dashed; box-shadow: none; }
.add-icon { background: var(--color-primary-light) !important; color: var(--color-primary); font-size: 22px; font-weight: 300; }

/* 自定义角色表单 */
.char-form { margin-top: 10px; padding: 14px; display: flex; flex-direction: column; gap: 12px; }
.form-row { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--color-text); }
.form-row > span { font-weight: 600; }
.form-row input[type="text"], .form-row input {
  border: 1px solid var(--color-border); border-radius: 10px;
  padding: 9px 12px; font-size: 13px; outline: none; background: var(--color-white); color: var(--color-text);
}
.form-row input:focus { border-color: var(--color-primary); }
.icon-pick { display: flex; flex-wrap: wrap; gap: 6px; }
.icon-pick button {
  width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--color-border);
  background: var(--color-white); font-size: 18px; cursor: pointer;
}
.icon-pick button.active { border-color: var(--color-primary); background: var(--color-primary-light); }
.form-error { margin: 0; font-size: 12px; color: #c2410c; }
.form-actions { display: flex; justify-content: flex-end; gap: 10px; }
.form-actions .ghost-btn { width: auto; padding: 9px 16px; }
.save-btn {
  border: none; border-radius: 12px; padding: 9px 18px;
  background: var(--color-primary); color: #fff; font-size: 13.5px; font-weight: 700; cursor: pointer;
}

/* 自定义目标输入 */
.custom-chip { border-style: dashed; }
.inline-input {
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
  margin-top: 8px; background: var(--color-white); border: 1px solid var(--color-border);
  border-radius: var(--radius); padding: 10px 12px; font-size: 13px; color: var(--color-text);
}
.inline-input input {
  width: 64px; border: 1px solid var(--color-border); border-radius: 8px;
  padding: 6px 8px; font-size: 13px; text-align: center; outline: none; background: var(--color-white); color: var(--color-text);
}
.inline-input input:focus { border-color: var(--color-primary); }
.mini-btn {
  border: none; border-radius: 8px; padding: 6px 14px;
  background: var(--color-primary); color: #fff; font-size: 12.5px; font-weight: 700; cursor: pointer;
}
.input-error { font-size: 12px; color: #c2410c; }

/* 跑前训练计划 */
.plan-card {
  margin-top: 16px; display: flex;
  background: var(--color-white); border: 1px solid var(--color-border);
  border-radius: var(--radius); box-shadow: var(--shadow); overflow: hidden;
}
.plan-item { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 12px 4px; }
.plan-item + .plan-item { border-left: 1px solid var(--color-border); }
.plan-item strong { font-size: 17px; color: var(--color-primary-dark); font-variant-numeric: tabular-nums; }
.plan-item .plan-time { font-size: 14px; }
.plan-item span { font-size: 11px; color: var(--color-text-light); }
.lock-tip { margin: 8px 2px 0; font-size: 11.5px; color: var(--color-text-light); }

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
.dash div { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 0; }
.dash strong { font-size: 18px; color: #fff; font-variant-numeric: tabular-nums; }
.dash .eta-num { font-size: 13.5px; line-height: 22px; }
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
/* 用户喊话气泡（右侧） */
.bubble.me { flex-direction: row-reverse; }
.bubble.me .bubble-body {
  background: var(--color-primary); color: #fff;
  border-radius: 14px 4px 14px 14px;
}
.bubble.me .bubble-body p { color: #fff; margin: 0; }
.me-icon { background: var(--color-primary) !important; }

/* 快捷喊话 */
.quick-talk { display: flex; gap: 8px; margin-top: 10px; }
.quick-talk button {
  flex: 1; border: 1px solid var(--color-border); background: var(--color-white);
  border-radius: 999px; padding: 8px 6px; font-size: 12.5px; color: var(--color-text);
  cursor: pointer;
}
.quick-talk button:active { background: var(--color-primary-light); }
.quick-talk button:disabled { opacity: 0.45; cursor: not-allowed; }

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

/* 数据来源切换 */
.mode-switch { display: flex; gap: 8px; }
.mode-switch button {
  flex: 1; border: 2px solid var(--color-border); background: var(--color-white);
  border-radius: var(--radius); padding: 11px 6px; font-size: 13.5px; font-weight: 600;
  color: var(--color-text); cursor: pointer;
}
.mode-switch button.active { border-color: var(--color-primary); background: var(--color-primary-light); color: var(--color-primary-dark); }
.mode-tip { margin: 8px 2px 0; font-size: 12px; line-height: 1.6; color: var(--color-text-light); }

/* 真实传感器面板 */
.live-panel {
  margin-top: 14px; background: var(--color-white); border: 1px solid var(--color-border);
  border-radius: var(--radius); box-shadow: var(--shadow); padding: 14px;
}
.live-grid { display: flex; gap: 10px; }
.live-grid div { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.live-grid strong { font-size: 20px; color: var(--color-primary-dark); font-variant-numeric: tabular-nums; }
.live-grid span { font-size: 11px; color: var(--color-text-light); }
.live-verdict { margin-top: 10px; text-align: center; font-size: 13px; font-weight: 700; color: var(--color-text); }
.live-verdict.ok { color: var(--color-primary-dark); }
.live-verdict.bad { color: #c2410c; }
.live-warn { margin: 10px 0 0; font-size: 12px; line-height: 1.6; color: #c2410c; background: #fef3ec; border-radius: 10px; padding: 8px 10px; }
.live-btn {
  margin-top: 12px; width: 100%; border: none; border-radius: 14px; height: 46px;
  background: linear-gradient(135deg, #14c8ae, var(--color-primary-dark));
  color: #fff; font-size: 14.5px; font-weight: 700; cursor: pointer;
}
.live-btn:disabled { background: #a7c4bf; cursor: default; }
.live-btn.stop { background: var(--color-white); color: var(--color-text); border: 1px solid var(--color-border); }
.ghost-btn.wide { width: 100%; height: 50px; }

/* 训练记录 */
.rec-count { font-size: 12px; color: var(--color-text-light); }
.record-list { display: flex; flex-direction: column; gap: 10px; }
.record-card {
  display: flex; align-items: center; gap: 10px;
  background: var(--color-white); border: 1px solid var(--color-border);
  border-radius: var(--radius); box-shadow: var(--shadow); padding: 12px 14px;
}
.record-main { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.record-main strong { font-size: 14px; color: var(--color-text); font-variant-numeric: tabular-nums; }
.record-main span { font-size: 11.5px; color: var(--color-text-light); font-variant-numeric: tabular-nums; }
.record-side { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.review-btn {
  border: none; border-radius: 999px; padding: 7px 12px;
  background: var(--color-primary); color: #fff; font-size: 12px; font-weight: 700; cursor: pointer;
}
.rec-del {
  width: 24px; height: 24px; border: none; border-radius: 50%;
  background: var(--color-border); color: var(--color-text-light); font-size: 14px; cursor: pointer;
}
.record-empty { font-size: 12.5px; color: var(--color-text-light); text-align: center; background: var(--color-white); border: 1px dashed var(--color-border); border-radius: var(--radius); padding: 16px; }
</style>
