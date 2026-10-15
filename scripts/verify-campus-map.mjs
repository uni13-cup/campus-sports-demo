import { mkdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright-core'

const url = process.argv[2] ?? 'http://127.0.0.1:4173/campus-sports-demo/game/play'
const lobbyUrl = url.replace(/\/game\/play$/, '/game')
const appOrigin = new URL(url).origin
const chromePath = process.env.CHROME_PATH ??
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const artifactsDir = path.resolve('artifacts', 'campus-map')

await mkdir(artifactsDir, { recursive: true })
await Promise.all([
  rm(path.join(artifactsDir, 'online-map.png'), { force: true }),
  rm(path.join(artifactsDir, 'offline-map.png'), { force: true })
])

const runtimeErrors = []
const externalRequests = []
const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--enable-webgl', '--enable-unsafe-swiftshader', '--use-angle=swiftshader']
})

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error') runtimeErrors.push(message.text())
  })
  page.on('request', (request) => {
    const requestUrl = request.url()
    if (/^https?:/i.test(requestUrl) && !requestUrl.startsWith(`${appOrigin}/`)) {
      externalRequests.push(requestUrl)
    }
  })

  await page.goto(lobbyUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 })
  await page.locator('.role-card.mouse').click()
  const mouseSelection = await page.locator('.role-card.mouse').getAttribute('aria-pressed')
  await page.locator('.start-button').click()
  await page.waitForURL(/\/game\/play$/)
  await page.waitForFunction(
    () => document.querySelectorAll('.campus-role-marker').length === 6,
    null,
    { timeout: 15_000 }
  )
  await page.getByRole('button', { name: '自由' }).click()
  const humanMouseMarker = page.locator('.campus-role-marker.is-human')
  const mouseBeforeMove = await humanMouseMarker.boundingBox()
  const mouseModeInitial = await page.evaluate(() => ({
    humanLabel: document.querySelector('.campus-role-marker.is-human')?.getAttribute('aria-label'),
    aiCats: document.querySelectorAll('.campus-role-marker.is-cat.is-ai').length,
    aiMice: document.querySelectorAll('.campus-role-marker.is-mouse.is-ai').length,
    phase: document.querySelector('.phase-timer span')?.textContent.trim()
  }))
  await page.keyboard.down('ArrowRight')
  await page.waitForTimeout(400)
  await page.keyboard.up('ArrowRight')
  const mouseAfterMove = await humanMouseMarker.boundingBox()
  const mouseMode = {
    ...mouseModeInitial,
    hidingMovement: mouseBeforeMove && mouseAfterMove
      ? Math.hypot(mouseAfterMove.x - mouseBeforeMove.x, mouseAfterMove.y - mouseBeforeMove.y)
      : 0
  }

  await page.goto(lobbyUrl, { waitUntil: 'domcontentloaded', timeout: 20_000 })
  await page.locator('.role-card.cat').click()
  const lobby = await page.evaluate(() => ({
    title: document.title,
    roles: document.querySelectorAll('.role-card').length,
    room: document.querySelector('.room-card strong')?.textContent.trim(),
    campus: document.querySelector('.scene-meta')?.textContent.includes('河南财经政法大学郑东校区'),
    demoNotice: document.querySelector('.notice')?.textContent.includes('不是真实 GPS')
  }))
  await page.screenshot({ path: path.join(artifactsDir, 'lobby.png') })
  await page.locator('.start-button').click()
  await page.waitForURL(/\/game\/play$/)
  try {
    await page.waitForFunction(
      () => document.querySelectorAll('.campus-role-marker').length === 6,
      null,
      { timeout: 15_000 }
    )
  } catch (error) {
    await page.screenshot({ path: path.join(artifactsDir, 'failed-map.png') })
    const diagnostics = await page.evaluate(() => ({
      url: location.href,
      title: document.title,
      body: document.body.innerText.slice(0, 500),
      markers: document.querySelectorAll('.campus-role-marker').length,
      mapErrors: window.__campusMapErrors ?? []
    }))
    throw new Error(`Map markers did not load: ${JSON.stringify({ diagnostics, runtimeErrors })}`, {
      cause: error
    })
  }

  const initial = await page.evaluate(() => ({
    title: document.title,
    canvas: document.querySelector('.maplibregl-canvas')?.getBoundingClientRect().toJSON(),
    markers: document.querySelectorAll('.campus-role-marker').length,
    landmarks: [...document.querySelectorAll('.campus-landmark')]
      .map((node) => node.textContent.trim()),
    playerMarkers: document.querySelectorAll('.campus-role-marker.is-human').length,
    controls: document.querySelectorAll('.maplibregl-ctrl button').length,
    attribution: document.querySelector('.maplibregl-ctrl-attrib')?.innerText,
    status: [...document.querySelectorAll('.map-status span')]
      .map((node) => node.textContent.trim()),
    cameraModes: [...document.querySelectorAll('.map-actions .action-group:first-child button')]
      .map((node) => node.textContent.trim()),
    visualModes: [...document.querySelectorAll('.map-actions .secondary-actions button')]
      .map((node) => node.textContent.trim()),
    mapDebug: window.__campusMap ? (() => {
      const debug = {
        loaded: window.__campusMap.loaded(),
        styleLoaded: window.__campusMap.isStyleLoaded(),
        layers: window.__campusMap.getStyle()?.layers?.map((layer) => layer.id) ?? [],
        center: window.__campusMap.getCenter().toArray(),
        zoom: window.__campusMap.getZoom(),
        pitch: window.__campusMap.getPitch()
      }
      try {
        debug.campusFeatures = window.__campusMap.querySourceFeatures('campus').length
        debug.activityFeatures = window.__campusMap.querySourceFeatures('activity').length
      } catch (error) {
        debug.sourceError = error.message
      }
      return debug
    })() : null,
    mapErrors: window.__campusMapErrors ?? []
  }))
  await page.screenshot({ path: path.join(artifactsDir, 'local-map.png') })

  const zoom = page.locator('.maplibregl-ctrl-zoom-in')
  const fullView = page.getByRole('button', { name: '全局' })
  const collision = page.getByRole('button', { name: '调试' })
  const interaction = {
    zoomClicked: await zoom.count() > 0,
    fullViewClicked: await fullView.count() > 0,
    collisionClicked: await collision.count() > 0
  }
  if (interaction.zoomClicked) await zoom.click()
  if (interaction.fullViewClicked) await fullView.click()
  if (interaction.collisionClicked) await collision.click()
  await page.waitForTimeout(1200)

  const localScene = await page.evaluate(() => ({
    markers: document.querySelectorAll('.campus-role-marker').length,
    canvasWidth: document.querySelector('.maplibregl-canvas')?.width,
    canvasHeight: document.querySelector('.maplibregl-canvas')?.height,
    collisionActive: [...document.querySelectorAll('.map-actions button')]
      .some((button) => button.textContent.includes('调试') && button.classList.contains('active')),
    phaseTime: document.querySelector('.phase-timer strong')?.textContent.trim()
  }))
  await page.screenshot({ path: path.join(artifactsDir, 'collision-debug.png') })

  await page.waitForFunction(
    () => document.querySelector('.phase-timer span')?.textContent.trim() === '追捕',
    null,
    { timeout: 10_000 }
  )
  const playerMarker = page.locator('.campus-role-marker.is-human')
  const beforeMove = await playerMarker.boundingBox()
  await page.keyboard.down('ArrowRight')
  await page.waitForTimeout(800)
  await page.keyboard.up('ArrowRight')
  await page.waitForTimeout(200)
  const afterMove = await playerMarker.boundingBox()
  const movement = {
    before: beforeMove,
    after: afterMove,
    screenDistance: beforeMove && afterMove
      ? Math.hypot(afterMove.x - beforeMove.x, afterMove.y - beforeMove.y)
      : 0
  }
  await page.screenshot({ path: path.join(artifactsDir, 'continuous-movement.png') })

  const collisionClass = await collision.getAttribute('class')
  if (collisionClass?.includes('active')) await collision.click()
  await page.getByRole('button', { name: '跟随' }).click()
  await context.setOffline(true)
  await page.waitForTimeout(300)
  const offline = await page.evaluate(() => ({
    canvas: Boolean(document.querySelector('.maplibregl-canvas')),
    markers: document.querySelectorAll('.campus-role-marker').length,
    attribution: document.querySelector('.maplibregl-ctrl-attrib')?.innerText
  }))

  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(500)
  const mobile = await page.evaluate(() => ({
    viewport: { width: innerWidth, height: innerHeight },
    mapHeight: document.querySelector('.map-panel')?.getBoundingClientRect().height,
    dpadVisible: Boolean(document.querySelector('.dpad')),
    hudHeight: document.querySelector('.match-hud')?.getBoundingClientRect().height,
    hudDetailsVisible: document.querySelector('.hud-details')?.getBoundingClientRect().height > 0,
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
  }))
  await page.screenshot({ path: path.join(artifactsDir, 'mobile-map.png') })

  const report = {
    url,
    lobby: { ...lobby, mouseSelection },
    mouseMode,
    initial,
    interaction,
    localScene,
    movement,
    offline,
    mobile,
    externalRequests: [...new Set(externalRequests)],
    runtimeErrors
  }
  await writeFile(
    path.join(artifactsDir, 'verification.json'),
    `${JSON.stringify(report, null, 2)}\n`
  )
  console.log(JSON.stringify(report, null, 2))

  if (movement.screenDistance < 2) throw new Error('Continuous keyboard movement was not visible')
  if (lobby.roles !== 2 || lobby.room !== 'DEMO-ZD-01' || !lobby.campus ||
      !lobby.demoNotice || mouseSelection !== 'true') {
    throw new Error('Game lobby verification failed')
  }
  if (mouseMode.humanLabel !== '玩家鼠' || mouseMode.aiCats !== 1 ||
      mouseMode.aiMice !== 4 || mouseMode.phase !== '躲藏' ||
      mouseMode.hidingMovement < 2) {
    throw new Error(`Mouse mode verification failed: ${JSON.stringify(mouseMode)}`)
  }
  if (runtimeErrors.length > 0) {
    throw new Error(`Browser runtime errors: ${runtimeErrors.join('; ')}`)
  }
  if (!offline.canvas || offline.markers !== 6) {
    throw new Error('Local campus scene did not survive offline mode')
  }
  if (mobile.mapHeight < 400 || !mobile.dpadVisible || mobile.horizontalOverflow) {
    throw new Error('Mobile layout verification failed')
  }
  if (externalRequests.length > 0) {
    throw new Error(`Unexpected runtime network requests: ${externalRequests.join('; ')}`)
  }
  if (initial.markers !== 6 || initial.mapErrors.length > 0) {
    throw new Error(`Map initialization failed: ${initial.mapErrors.join('; ')}`)
  }
  if (!initial.landmarks.includes('第二食堂') || !initial.landmarks.includes('第三食堂')) {
    throw new Error('Verified OSM landmark labels are incomplete')
  }
  if (!initial.cameraModes.includes('跟随') ||
      !initial.cameraModes.includes('自由') ||
      !initial.cameraModes.includes('全局')) {
    throw new Error('Camera mode controls are incomplete')
  }
} finally {
  await browser.close()
}
