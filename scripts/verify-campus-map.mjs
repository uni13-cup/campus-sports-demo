import { spawn } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const url = process.argv[2] ?? 'http://127.0.0.1:4173/game/play'
const chromePath = process.env.CHROME_PATH ??
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const artifactsDir = path.resolve('artifacts', 'campus-map')
const legacyProfileDir = path.resolve('.tmp', 'campus-map-chrome')
const profileDir = path.join(os.tmpdir(), `campus-map-chrome-${process.pid}`)
const port = 9223

await mkdir(artifactsDir, { recursive: true })
await Promise.all([
  rm(path.join(artifactsDir, 'online-map.png'), { force: true }),
  rm(path.join(artifactsDir, 'offline-map.png'), { force: true })
])
await rm(legacyProfileDir, { recursive: true, force: true }).catch(() => {})
await rm(profileDir, { recursive: true, force: true })
await mkdir(profileDir, { recursive: true })

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu-sandbox',
  '--enable-webgl',
  '--enable-unsafe-swiftshader',
  '--use-angle=swiftshader',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profileDir}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--window-size=1440,900',
  'about:blank'
], { stdio: 'ignore', windowsHide: true })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function waitForDebugger() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (response.ok) return
    } catch {
      // Chrome is still starting.
    }
    await sleep(100)
  }
  throw new Error('Chrome debugging endpoint did not start')
}

await waitForDebugger()
const target = await fetch(
  `http://127.0.0.1:${port}/json/new?about:blank`,
  { method: 'PUT' }
).then((response) => response.json())

const socket = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

let nextId = 0
const pending = new Map()
const runtimeErrors = []
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data)
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id)
    pending.delete(message.id)
    if (message.error) reject(new Error(message.error.message))
    else resolve(message.result)
  }
  if (message.method === 'Runtime.exceptionThrown') {
    runtimeErrors.push(message.params.exceptionDetails.text)
  }
})

function command(method, params = {}) {
  const id = ++nextId
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
}

async function evaluate(expression) {
  const result = await command('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true
  })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text)
  return result.result.value
}

async function screenshot(filename) {
  const result = await command('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: false
  })
  await writeFile(path.join(artifactsDir, filename), Buffer.from(result.data, 'base64'))
}

try {
  await command('Page.enable')
  await command('Runtime.enable')
  await command('Emulation.setDeviceMetricsOverride', {
    width: 1440,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  })
  await command('Page.navigate', { url })
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const markerCount = await evaluate(
      `document.querySelectorAll('.campus-role-marker').length`
    )
    if (markerCount === 6) break
    await sleep(100)
  }

  const initial = await evaluate(`(() => ({
    title: document.title,
    canvas: document.querySelector('.maplibregl-canvas')?.getBoundingClientRect().toJSON(),
    markers: document.querySelectorAll('.campus-role-marker').length,
    playerMarkers: document.querySelectorAll('.campus-role-marker.is-human').length,
    controls: document.querySelectorAll('.maplibregl-ctrl button').length,
    attribution: document.querySelector('.maplibregl-ctrl-attrib')?.innerText,
    status: [...document.querySelectorAll('.map-status span')].map((node) => node.textContent.trim()),
    mapDebug: window.__campusMap ? {
      loaded: window.__campusMap.loaded(),
      styleLoaded: window.__campusMap.isStyleLoaded(),
      layers: window.__campusMap.getStyle().layers.map((layer) => layer.id),
      campusFeatures: window.__campusMap.querySourceFeatures('campus').length,
      activityFeatures: window.__campusMap.querySourceFeatures('activity').length,
      center: window.__campusMap.getCenter().toArray(),
      zoom: window.__campusMap.getZoom(),
      pitch: window.__campusMap.getPitch()
    } : null,
    mapErrors: window.__campusMapErrors ?? []
  }))()`)
  await screenshot('local-map.png')

  const interaction = await evaluate(`(() => {
    const zoom = document.querySelector('.maplibregl-ctrl-zoom-in')
    zoom?.click()
    const fullView = [...document.querySelectorAll('.map-actions button')]
      .find((button) => button.textContent.includes('查看全场'))
    const collision = [...document.querySelectorAll('.map-actions button')]
      .find((button) => button.textContent.includes('碰撞范围'))
    fullView?.click()
    collision?.click()
    return {
      zoomClicked: Boolean(zoom),
      fullViewClicked: Boolean(fullView),
      collisionClicked: Boolean(collision)
    }
  })()`)
  await sleep(1200)

  const localScene = await evaluate(`(() => ({
    markers: document.querySelectorAll('.campus-role-marker').length,
    canvasWidth: document.querySelector('.maplibregl-canvas')?.width,
    canvasHeight: document.querySelector('.maplibregl-canvas')?.height,
    collisionActive: [...document.querySelectorAll('.map-actions button')]
      .some((button) => button.textContent.includes('碰撞范围') && button.classList.contains('active')),
    phaseTime: document.querySelector('.phase-timer strong')?.textContent.trim()
  }))()`)
  await screenshot('collision-debug.png')

  for (let attempt = 0; attempt < 80; attempt += 1) {
    const chasing = await evaluate(
      `document.querySelector('.phase-timer span')?.textContent.trim() === '追捕'`
    )
    if (chasing) break
    await sleep(100)
  }
  const beforeMove = await evaluate(`(() => {
    const marker = document.querySelector('.campus-role-marker.is-human')
    const rect = marker?.getBoundingClientRect()
    return rect ? { x: rect.x, y: rect.y } : null
  })()`)
  await command('Input.dispatchKeyEvent', {
    type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39
  })
  await sleep(800)
  await command('Input.dispatchKeyEvent', {
    type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39
  })
  await sleep(200)
  const afterMove = await evaluate(`(() => {
    const marker = document.querySelector('.campus-role-marker.is-human')
    const rect = marker?.getBoundingClientRect()
    return rect ? { x: rect.x, y: rect.y } : null
  })()`)
  const movement = {
    before: beforeMove,
    after: afterMove,
    screenDistance: beforeMove && afterMove
      ? Math.hypot(afterMove.x - beforeMove.x, afterMove.y - beforeMove.y)
      : 0
  }
  await screenshot('continuous-movement.png')

  const report = { url, initial, interaction, localScene, movement, runtimeErrors }
  await writeFile(
    path.join(artifactsDir, 'verification.json'),
    `${JSON.stringify(report, null, 2)}\n`
  )
  console.log(JSON.stringify(report, null, 2))
  if (movement.screenDistance < 2) {
    throw new Error('Continuous keyboard movement was not visible')
  }
  if (runtimeErrors.length > 0) {
    throw new Error(`Browser runtime errors: ${runtimeErrors.join('; ')}`)
  }
} finally {
  socket.close()
  chrome.kill()
  await Promise.race([
    new Promise((resolve) => chrome.once('exit', resolve)),
    sleep(2000)
  ])
  await rm(profileDir, { recursive: true, force: true }).catch(() => {})
}
