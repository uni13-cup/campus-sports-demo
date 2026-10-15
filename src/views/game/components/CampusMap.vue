<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  AttributionControl,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import mapLibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { CAMPUS_MAP_SOURCE_URL } from '@/game/campus.js'
import { gameToLngLat, geoBoundsToMapLibre } from '@/game/coordinates.js'
import { CAMPUS_DATA_META, CAMPUS_SCENE } from '@/game/data/campus-data.js'
import { CAMPUS_LANDMARKS } from '@/game/landmarks.js'

setWorkerUrl(mapLibreWorkerUrl)

const props = defineProps({
  players: { type: Array, required: true },
  config: { type: Object, required: true },
  phase: { type: String, required: true },
  captureCandidate: { type: Object, default: null }
})
const emit = defineEmits(['ready'])

const mapContainer = ref(null)
const cameraMode = ref('follow')
const visualPreset = ref('immersive')
const performanceMode = ref(false)
const showCollision = ref(false)
const mapReady = ref(false)
const markers = new Map()
const landmarkMarkers = new Map()
const previousPositions = new Map()
const trailHistories = new Map()
let map = null
let programmaticMove = false
let lastCameraUpdate = 0

function addLandmarkMarkers() {
  if (!map) return
  for (const landmark of CAMPUS_LANDMARKS) {
    if (landmarkMarkers.has(landmark.id)) continue
    const element = document.createElement('div')
    element.className = 'campus-landmark'
    element.textContent = landmark.name
    element.setAttribute('aria-label', `OSM地标：${landmark.name}`)
    element.dataset.osmId = landmark.osmId
    const marker = new Marker({ element, anchor: 'bottom' })
      .setLngLat(landmark.position)
      .addTo(map)
    landmarkMarkers.set(landmark.id, marker)
  }
}

function emptyFeatureCollection() {
  return { type: 'FeatureCollection', features: [] }
}

function activityPolygon() {
  const { west, south, east, north } = props.config.geoBounds
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [west, north], [east, north], [east, south], [west, south], [west, north]
      ]]
    }
  }
}

function collisionFeatures() {
  return {
    type: 'FeatureCollection',
    features: props.config.obstacles.map((obstacle) => {
      const nw = gameToLngLat({ x: obstacle.x, y: obstacle.y }, props.config)
      const se = gameToLngLat(
        { x: obstacle.x + obstacle.width, y: obstacle.y + obstacle.height },
        props.config
      )
      return {
        type: 'Feature',
        properties: { id: obstacle.id },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [nw[0], nw[1]], [se[0], nw[1]], [se[0], se[1]],
            [nw[0], se[1]], [nw[0], nw[1]]
          ]]
        }
      }
    })
  }
}

function createStyle() {
  return {
    version: 8,
    sources: {
      campus: { type: 'geojson', data: CAMPUS_SCENE },
      activity: { type: 'geojson', data: activityPolygon() },
      collisions: { type: 'geojson', data: collisionFeatures() },
      trails: { type: 'geojson', data: emptyFeatureCollection() }
    },
    layers: [
      { id: 'offline-base', type: 'background', paint: { 'background-color': '#c7d9ce' } },
      {
        id: 'campus-area', type: 'fill', source: 'campus',
        filter: ['==', ['get', 'kind'], 'campus'],
        paint: { 'fill-color': '#d9e8dc', 'fill-opacity': 0.92 }
      },
      {
        id: 'leisure-area', type: 'fill', source: 'campus',
        filter: ['==', ['get', 'kind'], 'leisure'],
        paint: {
          'fill-color': [
            'match', ['get', 'class'],
            'pitch', '#b9d49c',
            'stadium', '#a9c98d',
            '#a8cf9e'
          ],
          'fill-outline-color': '#73986b',
          'fill-opacity': 0.92
        }
      },
      {
        id: 'water-shadow', type: 'fill', source: 'campus',
        filter: ['==', ['get', 'kind'], 'water'],
        paint: { 'fill-color': '#245c70', 'fill-translate': [2, 3], 'fill-opacity': 0.3 }
      },
      {
        id: 'water-area', type: 'fill', source: 'campus',
        filter: ['==', ['get', 'kind'], 'water'],
        paint: { 'fill-color': '#58b8d4', 'fill-outline-color': '#2e86a5', 'fill-opacity': 0.96 }
      },
      {
        id: 'campus-roads-casing', type: 'line', source: 'campus',
        filter: ['==', ['get', 'kind'], 'road'],
        paint: {
          'line-color': '#87958c',
          'line-width': ['interpolate', ['linear'], ['zoom'], 15, 5, 18, 11],
          'line-opacity': 0.72
        }
      },
      {
        id: 'campus-roads', type: 'line', source: 'campus',
        filter: ['==', ['get', 'kind'], 'road'],
        paint: {
          'line-color': '#fff9e9',
          'line-width': ['interpolate', ['linear'], ['zoom'], 15, 3, 18, 7.2],
          'line-opacity': 1
        }
      },
      {
        id: 'campus-buildings-shadow', type: 'fill', source: 'campus',
        filter: ['==', ['get', 'kind'], 'building'],
        paint: { 'fill-color': '#263c35', 'fill-translate': [3, 5], 'fill-opacity': 0.22 }
      },
      {
        id: 'campus-buildings-flat', type: 'fill', source: 'campus',
        filter: ['==', ['get', 'kind'], 'building'],
        layout: { visibility: 'none' },
        paint: { 'fill-color': '#d9d4ca', 'fill-outline-color': '#6b716d', 'fill-opacity': 0.98 }
      },
      {
        id: 'campus-buildings-3d', type: 'fill-extrusion', source: 'campus',
        filter: ['==', ['get', 'kind'], 'building'],
        paint: {
          'fill-extrusion-color': '#d9d3c8',
          'fill-extrusion-height': 16,
          'fill-extrusion-base': 0,
          'fill-extrusion-opacity': 0.96,
          'fill-extrusion-vertical-gradient': true
        }
      },
      {
        id: 'activity-mask', type: 'fill', source: 'activity',
        paint: { 'fill-color': '#16a66c', 'fill-opacity': 0.035 }
      },
      {
        id: 'trails-layer', type: 'line', source: 'trails',
        paint: {
          'line-color': ['match', ['get', 'role'], 'cat', '#ff5a47', '#f0b827'],
          'line-width': ['case', ['==', ['get', 'human'], true], 5, 3],
          'line-opacity': 0.52,
          'line-blur': 1.2
        }
      },
      {
        id: 'activity-border', type: 'line', source: 'activity',
        paint: { 'line-color': '#12b878', 'line-width': 3, 'line-dasharray': [2, 1] }
      },
      {
        id: 'collision-debug', type: 'line', source: 'collisions',
        layout: { visibility: 'none' },
        paint: { 'line-color': '#ff3156', 'line-width': 2, 'line-dasharray': [1, 1] }
      }
    ]
  }
}

function markerElement(player) {
  const element = document.createElement('div')
  element.className = 'campus-role-marker'
  element.setAttribute('role', 'img')
  element.innerHTML = `
    <span class="marker-ring"></span>
    <span class="marker-direction">▲</span>
    <span class="marker-face"></span>
    <span class="marker-label"></span>
  `
  applyMarkerAppearance(element, player)
  return element
}

function applyMarkerAppearance(element, player) {
  const converted = player.role === 'cat' && player.controller === 'ai'
  const isCandidate = props.captureCandidate?.mouseId === player.id
  element.className = [
    'campus-role-marker',
    `is-${player.role}`,
    player.controller === 'human' ? 'is-human' : 'is-ai',
    converted ? 'is-converted' : '',
    isCandidate ? 'is-candidate' : ''
  ].filter(Boolean).join(' ')
  element.querySelector('.marker-face').textContent = player.role === 'cat' ? '🐱' : '🐭'
  element.querySelector('.marker-label').textContent =
    player.controller === 'human'
      ? '你'
      : isCandidate
        ? '可抓捕'
        : converted
          ? '新猫'
          : ''
  element.setAttribute(
    'aria-label',
    player.controller === 'human' ? '玩家猫' : player.role === 'cat' ? '电脑猫' : '电脑鼠'
  )
}

function recordTrail(player, now) {
  const history = trailHistories.get(player.id) ?? []
  const previous = history.at(-1)
  if (!previous || Math.hypot(
    player.position.x - previous.position.x,
    player.position.y - previous.position.y
  ) >= 1.4) {
    history.push({ position: { ...player.position }, at: now })
  }
  trailHistories.set(
    player.id,
    history.filter((point) => now - point.at <= 4200).slice(-90)
  )
}

function updateMapOverlays() {
  if (!map) return
  const now = performance.now()
  for (const player of props.players) recordTrail(player, now)

  const trailFeatures = performanceMode.value
    ? []
    : props.players.flatMap((player) => {
      const coordinates = (trailHistories.get(player.id) ?? [])
        .map((point) => gameToLngLat(point.position, props.config))
      if (coordinates.length < 2) return []
      return [{
        type: 'Feature',
        properties: { role: player.role, human: player.controller === 'human' },
        geometry: { type: 'LineString', coordinates }
      }]
    })
  map.getSource('trails')?.setData({ type: 'FeatureCollection', features: trailFeatures })
}

function updateMarkers() {
  if (!mapReady.value || !map) return
  const activeIds = new Set(props.players.map((player) => player.id))

  for (const [id, marker] of markers) {
    if (!activeIds.has(id)) {
      marker.remove()
      markers.delete(id)
      previousPositions.delete(id)
      trailHistories.delete(id)
    }
  }

  for (const player of props.players) {
    let marker = markers.get(player.id)
    if (!marker) {
      marker = new Marker({ element: markerElement(player), anchor: 'center' })
        .setLngLat(gameToLngLat(player.position, props.config))
        .addTo(map)
      markers.set(player.id, marker)
    }

    const element = marker.getElement()
    const previous = previousPositions.get(player.id)
    if (previous && (previous.x !== player.position.x || previous.y !== player.position.y)) {
      const heading = Math.atan2(
        player.position.x - previous.x,
        previous.y - player.position.y
      ) * 180 / Math.PI
      element.style.setProperty('--heading', `${heading}deg`)
    }
    applyMarkerAppearance(element, player)
    marker.setLngLat(gameToLngLat(player.position, props.config))
    previousPositions.set(player.id, { ...player.position })
  }

  updateMapOverlays()
  if (cameraMode.value === 'follow') centerOnHuman(false)
}

function centerOnHuman(force = true) {
  const human = props.players.find((player) => player.controller === 'human')
  if (!human || !map) return
  const now = performance.now()
  if (!force && now - lastCameraUpdate < 100) return
  lastCameraUpdate = now
  cameraMode.value = 'follow'
  programmaticMove = true
  map.easeTo({
    center: gameToLngLat(human.position, props.config),
    zoom: force ? Math.max(map.getZoom(), 17.1) : undefined,
    duration: force ? 650 : 180,
    essential: true
  })
  window.setTimeout(() => { programmaticMove = false }, force ? 700 : 210)
}

function setFreeCamera() {
  cameraMode.value = 'free'
}

function fitActivity() {
  if (!map) return
  cameraMode.value = 'overview'
  programmaticMove = true
  map.fitBounds(geoBoundsToMapLibre(props.config.geoBounds), {
    padding: 44,
    duration: 650,
    pitch: visualPreset.value === 'immersive' && !performanceMode.value ? 38 : 0,
    bearing: visualPreset.value === 'immersive' && !performanceMode.value ? -8 : 0,
    essential: true
  })
  window.setTimeout(() => { programmaticMove = false }, 700)
}

function applyVisualMode() {
  if (!mapReady.value || !map) return
  const immersive = visualPreset.value === 'immersive' && !performanceMode.value
  map.setLayoutProperty('campus-buildings-3d', 'visibility', immersive ? 'visible' : 'none')
  map.setLayoutProperty('campus-buildings-flat', 'visibility', immersive ? 'none' : 'visible')
  map.setLayoutProperty('trails-layer', 'visibility', performanceMode.value ? 'none' : 'visible')
  map.easeTo({ pitch: immersive ? 38 : 0, bearing: immersive ? -8 : 0, duration: 500, essential: true })
  updateMarkers()
}

function toggleVisualPreset() {
  visualPreset.value = visualPreset.value === 'immersive' ? 'classic' : 'immersive'
  applyVisualMode()
}

function togglePerformanceMode() {
  performanceMode.value = !performanceMode.value
  applyVisualMode()
}

function toggleCollisions() {
  showCollision.value = !showCollision.value
  if (map?.getLayer('collision-debug')) {
    map.setLayoutProperty('collision-debug', 'visibility', showCollision.value ? 'visible' : 'none')
  }
}

onMounted(() => {
  map = new MapLibreMap({
    container: mapContainer.value,
    style: createStyle(),
    bounds: geoBoundsToMapLibre(props.config.geoBounds),
    fitBoundsOptions: { padding: 58 },
    maxBounds: geoBoundsToMapLibre(props.config.geoBounds),
    minZoom: 15.4,
    maxZoom: 20,
    pitch: 38,
    bearing: -8,
    maxPitch: 65,
    attributionControl: false
  })
  window.__campusMap = map
  window.__campusMapErrors = []
  map.on('error', (event) => {
    window.__campusMapErrors.push(event.error?.message ?? String(event.error))
  })
  map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right')
  map.addControl(new AttributionControl({
    compact: true,
    customAttribution: `<a href="${CAMPUS_MAP_SOURCE_URL}" target="_blank" rel="noreferrer">OpenStreetMap campus data</a> · ODbL 1.0`
  }))
  map.on('load', () => {
    mapReady.value = true
    addLandmarkMarkers()
    updateMarkers()
    emit('ready')
  })
  for (const eventName of ['dragstart', 'rotatestart', 'pitchstart', 'zoomstart']) {
    map.on(eventName, () => {
      if (!programmaticMove) setFreeCamera()
    })
  }
})

watch(
  () => [props.players, props.captureCandidate, props.phase],
  updateMarkers,
  // 抓捕发生时同步刷新角色，避免逻辑已变猫而地图仍多显示一帧老鼠。
  { deep: true, flush: 'sync' }
)

onBeforeUnmount(() => {
  for (const marker of markers.values()) marker.remove()
  markers.clear()
  for (const marker of landmarkMarkers.values()) marker.remove()
  landmarkMarkers.clear()
  trailHistories.clear()
  map?.remove()
  delete window.__campusMap
  delete window.__campusMapErrors
  map = null
})
</script>

<template>
  <div class="campus-map-shell" :class="[`preset-${visualPreset}`, { 'performance-mode': performanceMode }]">
    <div ref="mapContainer" class="campus-map-canvas" aria-label="河南财经政法大学郑东校区猫鼠游戏地图"></div>

    <div class="map-status">
      <span class="status-live">本地校园场景</span>
      <span>{{ CAMPUS_DATA_META.featureCount }} 个 OSM 要素</span>
      <span>模拟定位 · 加速演示</span>
      <span v-if="visualPreset === 'immersive' && !performanceMode">建筑为示意楼高</span>
    </div>

    <div class="map-actions" aria-label="地图显示控制">
      <div class="action-group">
        <button :class="{ active: cameraMode === 'follow' }" @click="centerOnHuman()">跟随</button>
        <button :class="{ active: cameraMode === 'free' }" @click="setFreeCamera">自由</button>
        <button :class="{ active: cameraMode === 'overview' }" @click="fitActivity">全局</button>
      </div>
      <div class="action-group secondary-actions">
        <button :class="{ active: visualPreset === 'immersive' }" @click="toggleVisualPreset">
          {{ visualPreset === 'immersive' ? '沉浸' : '经典' }}
        </button>
        <button :class="{ active: performanceMode }" @click="togglePerformanceMode">轻量</button>
        <button class="debug-control" :class="{ active: showCollision }" @click="toggleCollisions">调试</button>
      </div>
    </div>

    <div v-if="phase === 'hiding'" class="map-phase-notice">
      <span class="notice-eyebrow">HIDING PHASE</span>
      <strong>老鼠正在躲藏</strong>
      <span>观察全场，追捕即将开始</span>
    </div>
  </div>
</template>

<style>
.campus-map-shell {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #cbdacb;
}
.campus-map-shell::after {
  position: absolute;
  z-index: 1;
  inset: 0;
  border: 1px solid rgba(255, 255, 255, 0.42);
  box-shadow: inset 0 0 70px rgba(10, 41, 31, 0.12);
  content: '';
  pointer-events: none;
}
.campus-map-canvas { width: 100%; height: 100%; }
.campus-map-canvas .maplibregl-canvas { outline: none; }
.campus-map-canvas .maplibregl-ctrl-top-right { top: 52px; right: 6px; }
.campus-map-canvas .maplibregl-ctrl-group {
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.62);
  border-radius: 13px;
  background: rgba(12, 33, 27, 0.78);
  box-shadow: 0 10px 28px rgba(9, 31, 24, 0.24);
  backdrop-filter: blur(10px);
}
.campus-map-canvas .maplibregl-ctrl-group button { filter: invert(1); }
.campus-map-canvas .maplibregl-ctrl-attrib { color: #496257; font-size: 10px; }

.campus-landmark {
  padding: 4px 8px;
  border: 1px solid rgba(34, 72, 57, 0.2);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.88);
  color: #244f3d;
  box-shadow: 0 4px 12px rgba(26, 62, 47, 0.16);
  font-size: 10px;
  font-weight: 750;
  line-height: 1.2;
  pointer-events: none;
  white-space: nowrap;
}

.campus-role-marker {
  --heading: 0deg;
  position: relative;
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #ffd65f;
  box-shadow: 0 7px 18px rgba(11, 35, 27, 0.38);
  /* MapLibre writes transform on this element every frame. Do not animate or
     override it, otherwise the visible marker trails behind its game position. */
  transition: filter 0.2s ease;
}
.campus-role-marker .marker-face {
  z-index: 1;
  font-size: 22px;
  line-height: 1;
  transition: transform 0.13s ease;
}
.campus-role-marker .marker-ring {
  position: absolute;
  inset: -7px;
  border: 2px solid rgba(255, 214, 95, 0.35);
  border-radius: 50%;
  opacity: 0;
}
.campus-role-marker .marker-direction {
  position: absolute;
  z-index: 2;
  top: -14px;
  color: #c89200;
  font-size: 14px;
  filter: drop-shadow(0 1px 0 #fff);
  transform: rotate(var(--heading));
  transform-origin: 50% 27px;
  transition: transform 0.18s ease;
}
.campus-role-marker .marker-label {
  position: absolute;
  z-index: 2;
  top: -28px;
  min-width: 24px;
  padding: 3px 7px;
  border-radius: 999px;
  background: #132f27;
  color: #fff;
  font-size: 9px;
  font-weight: 850;
  line-height: 1.35;
  text-align: center;
  white-space: nowrap;
}
.campus-role-marker .marker-label:empty { display: none; }
.campus-role-marker.is-cat { background: #64bcff; }
.campus-role-marker.is-cat .marker-direction { color: #1678bd; }
.campus-role-marker.is-human {
  width: 47px;
  height: 47px;
  border-width: 3px;
  box-shadow: 0 0 0 5px rgba(255, 77, 56, 0.34), 0 10px 30px rgba(12, 37, 28, 0.42);
}
.campus-role-marker.is-human .marker-label { background: #ed4b37; }
.campus-role-marker.is-human .marker-ring { border-color: rgba(255, 77, 56, 0.5); opacity: 1; animation: marker-pulse 1.6s ease-out infinite; }
.campus-role-marker.is-converted { background: #ab8cf3; }
.campus-role-marker.is-converted .marker-direction { color: #6848bb; }
.campus-role-marker.is-candidate { background: #ff7c62; }
.campus-role-marker.is-candidate .marker-face { transform: scale(1.12); }
.campus-role-marker.is-candidate .marker-ring { border-color: #ff5a47; opacity: 1; animation: candidate-pulse 0.72s ease-out infinite; }

.map-status, .map-actions { position: absolute; z-index: 3; display: flex; gap: 7px; }
.map-status { top: 12px; left: 12px; flex-wrap: wrap; max-width: calc(100% - 130px); }
.map-status span {
  padding: 6px 9px;
  border: 1px solid rgba(255, 255, 255, 0.36);
  border-radius: 999px;
  background: rgba(12, 36, 28, 0.78);
  color: rgba(255, 255, 255, 0.9);
  font-size: 10px;
  font-weight: 700;
  backdrop-filter: blur(10px);
}
.map-status .status-live { background: rgba(13, 151, 94, 0.92); color: #fff; }
.map-actions { right: 14px; bottom: 34px; flex-direction: column; align-items: flex-end; }
.action-group {
  display: flex;
  gap: 4px;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 13px;
  background: rgba(12, 36, 28, 0.78);
  box-shadow: 0 8px 22px rgba(12, 36, 28, 0.18);
  backdrop-filter: blur(10px);
}
.map-actions button {
  padding: 7px 10px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: rgba(255, 255, 255, 0.74);
  font-size: 10px;
  font-weight: 800;
  cursor: pointer;
}
.map-actions button.active { background: #16a46a; color: #fff; }
.map-actions .debug-control.active { background: #ee4460; }
.map-phase-notice {
  position: absolute;
  z-index: 3;
  left: 50%;
  top: 50%;
  display: flex;
  min-width: 220px;
  flex-direction: column;
  gap: 4px;
  padding: 18px 24px;
  transform: translate(-50%, -50%);
  border: 1px solid rgba(255, 255, 255, 0.46);
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(13, 45, 34, 0.9), rgba(24, 70, 52, 0.82));
  color: #fff;
  text-align: center;
  box-shadow: 0 20px 60px rgba(8, 30, 22, 0.3);
  backdrop-filter: blur(12px);
}
.map-phase-notice .notice-eyebrow { color: #66e3ae; font-size: 9px; font-weight: 900; letter-spacing: 0.16em; }
.map-phase-notice strong { font-size: 19px; }
.map-phase-notice span:last-child { font-size: 11px; opacity: 0.78; }

@keyframes marker-pulse {
  0% { transform: scale(0.84); opacity: 0.8; }
  100% { transform: scale(1.65); opacity: 0; }
}
@keyframes candidate-pulse {
  0% { transform: scale(0.92); opacity: 1; }
  100% { transform: scale(1.8); opacity: 0; }
}
@media (max-width: 700px) {
  .map-status { max-width: calc(100% - 70px); }
  .map-status span:nth-child(2), .map-status span:nth-child(4) { display: none; }
  .map-actions { right: 9px; bottom: 30px; gap: 5px; }
  .secondary-actions .debug-control { display: none; }
  .map-actions button { padding: 6px 8px; font-size: 9px; }
  .campus-map-canvas .maplibregl-ctrl-top-right { top: 46px; }
  .campus-role-marker { width: 35px; height: 35px; }
  .campus-role-marker .marker-face { font-size: 20px; }
  .campus-role-marker.is-human { width: 43px; height: 43px; }
  .campus-landmark { padding: 3px 6px; font-size: 8px; }
}
@media (prefers-reduced-motion: reduce) {
  .campus-role-marker, .campus-role-marker .marker-direction, .campus-role-marker .marker-ring {
    transition: none;
    animation: none;
  }
}
</style>
