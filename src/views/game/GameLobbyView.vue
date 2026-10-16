<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { saveGameSession } from '@/game/game-session.js'

const router = useRouter()
const selectedRole = ref('cat')

const roles = [
  {
    id: 'cat',
    icon: '🐱',
    name: '猫阵营',
    slogan: '主动追捕，逐个转化',
    detail: '你控制 1 只猫，追捕 5 只自主行动的电脑鼠。'
  },
  {
    id: 'mouse',
    icon: '🐭',
    name: '鼠阵营',
    slogan: '躲藏逃跑，坚持到最后',
    detail: '你控制 1 只老鼠，与 4 只电脑鼠共同躲避 AI 猫。'
  }
]

function startGame() {
  saveGameSession(selectedRole.value)
  router.push('/game/play')
}
</script>

<template>
  <main class="lobby-page">
    <section class="lobby-hero">
      <div class="hero-copy">
        <span class="eyebrow">CAT & MOUSE · 3.0 DEMO</span>
        <h1>校园猫鼠大作战</h1>
        <p>以河南财经政法大学郑东校区为现实场景的校园追逐模拟。</p>
        <div class="scene-meta">
          <span>📍 河南财经政法大学郑东校区</span>
          <span>👥 6 名模拟参与者</span>
          <span>🧭 二维模拟定位</span>
        </div>
      </div>
      <div class="room-card" aria-label="模拟房间信息">
        <span>模拟房间 · Demo</span>
        <strong>DEMO-ZD-01</strong>
        <small>本版本无真实多人服务器</small>
      </div>
    </section>

    <section class="lobby-grid">
      <div class="role-panel">
        <header>
          <span>选择玩家阵营</span>
          <strong>这一局，你想追还是逃？</strong>
        </header>
        <div class="role-options">
          <button
            v-for="role in roles"
            :key="role.id"
            class="role-card"
            :class="[role.id, { selected: selectedRole === role.id }]"
            :aria-pressed="selectedRole === role.id"
            @click="selectedRole = role.id"
          >
            <span class="role-icon">{{ role.icon }}</span>
            <span class="role-copy">
              <strong>{{ role.name }}</strong>
              <em>{{ role.slogan }}</em>
              <small>{{ role.detail }}</small>
            </span>
            <span class="role-check">{{ selectedRole === role.id ? '已选择' : '选择' }}</span>
          </button>
        </div>
        <button class="start-button" @click="startGame">
          以{{ selectedRole === 'cat' ? '猫' : '鼠' }}阵营开始游戏
          <span>进入校园地图 →</span>
        </button>
      </div>

      <aside class="rules-panel">
        <span class="panel-label">本局规则</span>
        <h2>5 秒躲藏，30 秒追捕</h2>
        <ol>
          <li><strong>躲藏阶段</strong><span>老鼠先行移动，猫等待倒计时结束。</span></li>
          <li><strong>追捕阶段</strong><span>进入抓捕距离后，最近的一只鼠会转为猫。</span></li>
          <li><strong>胜负结算</strong><span>全部抓获猫方胜；时间结束仍有鼠存活则鼠方胜。</span></li>
        </ol>
        <p class="notice">定位、房间和其他参与者均为本地模拟数据，不是真实 GPS 或在线玩家。</p>
      </aside>
    </section>
  </main>
</template>

<style scoped>
.lobby-page {
  flex: 1;
  min-height: calc(100vh - 108px);
  padding: clamp(24px, 5vw, 68px) clamp(16px, 5vw, 72px) 56px;
  background:
    radial-gradient(circle at 8% 8%, rgba(24, 190, 139, 0.18), transparent 32%),
    radial-gradient(circle at 92% 92%, rgba(246, 178, 53, 0.16), transparent 30%),
    #edf4ef;
  color: #173b2d;
}
.lobby-hero, .lobby-grid { width: min(1120px, 100%); margin: 0 auto; }
.lobby-hero { display: flex; align-items: end; justify-content: space-between; gap: 28px; }
.eyebrow, .panel-label { color: #168b61; font-size: 11px; font-weight: 850; letter-spacing: 0.16em; }
.hero-copy h1 { margin: 8px 0; font-size: clamp(34px, 5vw, 62px); line-height: 1.05; letter-spacing: -0.04em; }
.hero-copy > p { max-width: 620px; margin: 0; color: #547065; font-size: 15px; }
.scene-meta { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
.scene-meta span { padding: 7px 10px; border: 1px solid rgba(24, 83, 60, 0.12); border-radius: 999px; background: rgba(255,255,255,.62); font-size: 11px; }
.room-card { min-width: 220px; padding: 18px; border-radius: 18px; background: #153e2f; color: #fff; box-shadow: 0 18px 45px rgba(20,61,46,.18); }
.room-card span, .room-card small { display: block; color: rgba(255,255,255,.62); font-size: 10px; }
.room-card strong { display: block; margin: 5px 0; font-size: 21px; letter-spacing: .08em; }
.lobby-grid { display: grid; grid-template-columns: minmax(0, 1.55fr) minmax(280px, .75fr); gap: 18px; margin-top: 36px; }
.role-panel, .rules-panel { border: 1px solid rgba(25, 76, 56, .11); border-radius: 24px; background: rgba(255,255,255,.82); box-shadow: 0 22px 60px rgba(24,67,51,.1); backdrop-filter: blur(12px); }
.role-panel { padding: clamp(20px, 3vw, 32px); }
.role-panel header { display: flex; flex-direction: column; gap: 4px; }
.role-panel header span { color: #6e847b; font-size: 11px; }
.role-panel header strong { font-size: 22px; }
.role-options { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 22px; }
.role-card { display: grid; grid-template-columns: auto 1fr; gap: 12px; position: relative; min-height: 154px; padding: 18px; border: 2px solid transparent; border-radius: 18px; background: #f1f5f2; color: inherit; text-align: left; cursor: pointer; transition: .18s ease; }
.role-card:hover { transform: translateY(-2px); }
.role-card.selected.cat { border-color: #ff6a50; background: #fff4ef; box-shadow: 0 12px 28px rgba(213,76,50,.1); }
.role-card.selected.mouse { border-color: #e2ad29; background: #fff9e9; box-shadow: 0 12px 28px rgba(204,151,26,.11); }
.role-icon { font-size: 38px; line-height: 1; }
.role-copy { display: flex; flex-direction: column; gap: 5px; }
.role-copy strong { font-size: 18px; }
.role-copy em { color: #2f6d54; font-size: 12px; font-style: normal; font-weight: 750; }
.role-copy small { color: #6e827a; font-size: 10px; line-height: 1.55; }
.role-check { position: absolute; right: 12px; bottom: 11px; color: #597067; font-size: 9px; font-weight: 800; }
.start-button { display: flex; align-items: center; justify-content: space-between; width: 100%; margin-top: 14px; padding: 15px 18px; border: 0; border-radius: 15px; background: #137c54; color: #fff; font-size: 14px; font-weight: 800; cursor: pointer; box-shadow: 0 13px 30px rgba(18,112,76,.2); }
.start-button span { font-size: 10px; font-weight: 600; opacity: .72; }
.rules-panel { padding: 26px; }
.rules-panel h2 { margin: 8px 0 22px; font-size: 22px; }
.rules-panel ol { display: grid; gap: 15px; margin: 0; padding: 0; list-style: none; }
.rules-panel li { display: flex; flex-direction: column; gap: 4px; padding-left: 13px; border-left: 3px solid #37b881; }
.rules-panel li strong { font-size: 12px; }
.rules-panel li span { color: #6a8076; font-size: 10px; line-height: 1.55; }
.notice { margin: 24px 0 0; padding: 12px; border-radius: 12px; background: #eef5f0; color: #64786f; font-size: 9px; line-height: 1.55; }
@media (max-width: 760px) {
  .lobby-page { padding-top: 28px; }
  .lobby-hero { align-items: stretch; flex-direction: column; }
  .room-card { min-width: 0; }
  .lobby-grid { grid-template-columns: 1fr; margin-top: 20px; }
  .role-options { grid-template-columns: 1fr; }
  .role-card { min-height: 130px; }
}
</style>
