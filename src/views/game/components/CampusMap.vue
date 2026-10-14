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

setWorkerUrl(mapLibreWorkerUrl)

const props = defineProps({
  players: { type: Array, required: true },
  config: { type: Object, required: true },
  phase: { type: String, required: true }
})
const emit = defineEmits(['ready'])

const mapContainer = ref(null)
const followHuman = ref(true)
const showCollision = ref(false)
const mapReady = ref(false)
const markers = new Map()
const previousPositions = new Map()
let map = null
let programmaticMove = false

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
      collisions: { type: 'geojson', data: collisionFeatures() }
    },
    layers: [
      { id: 'offline-base', type: 'background', paint: { 'background-color': '#dce7dc' } },
      {
        id: 'campus-area', type: 'fill', source: 'campus',
        filter: ['==', ['get', 'kind'], 'campus'],
        paint: { 'fill-color': '#d6e8d2', 'fill-opacity': 0.62 }
      },
      {
        id: 'green-area', type: 'fill', source: 'campus',
        filter: ['==', ['get', 'kind'], 'green'],
        paint: { 'fill-color': '#b8d8af', 'fill-opacity': 0.9 }
      },
      {
        id: 'leisure-area', type: 'fill', source: 'campus',
        filter: ['==', ['get', 'kind'], 'leisure'],
        paint: { 'fill-color': '#a8cfa1', 'fill-outline-color': '#6ea16a', 'fill-opacity': 0.82 }
      },
      {
        id: 'water-area', type: 'fill', source: 'campus',
        filter: ['==', ['get', 'kind'], 'water'],
        paint: { 'fill-color': '#83c7dc', 'fill-outline-color': '#4c9eba', 'fill-opacity': 0.92 }
      },
      {
        id: 'campus-roads-casing', type: 'line', source: 'campus',
        filter: ['==', ['get', 'kind'], 'road'],
        paint: { 'line-color': '#c7c6bd', 'line-width': 7, 'line-opacity': 0.9 }
      },
      {
        id: 'campus-roads', type: 'line', source: 'campus',
        filter: ['==', ['get', 'kind'], 'road'],
        paint: { 'line-color': '#f4f2e7', 'line-width': 4.5, 'line-opacity': 0.98 }
      },
      {
        id: 'campus-buildings', type: 'fill', source: 'campus',
        filter: ['==', ['get', 'kind'], 'building'],
        paint: { 'fill-color': '#d8d3ca', 'fill-outline-color': '#77736d', 'fill-opacity': 0.96 }
      },
      {
        id: 'activity-mask', type: 'fill', source: 'activity',
        paint: { 'fill-color': '#2d8f5b', 'fill-opacity': 0.035 }
      },
      {
        id: 'activity-border', type: 'line', source: 'activity',
        paint: { 'line-color': '#18a86b', 'line-width': 3, 'line-dasharray': [2, 1] }
      },
      {
        id: 'collision-debug', type: 'line', source: 'collisions',
        layout: { visibility: 'none' },
        paint: { 'line-color': '#ff3d5a', 'line-width': 2, 'line-dasharray': [1, 1] }
      }
    ]
  }
}

function markerElement(player) {
  const element = document.createElement('div')
  element.className = 'campus-role-marker'
  element.setAttribute('role', 'img')
  element.innerHTML = `
    <span class="marker-direction">▲</span>
    <span class="marker-face"></span>
    <span class="marker-label"></span>
  `
  applyMarkerAppearance(element, player)
  return element
}

function applyMarkerAppearance(element, player) {
  const converted = player.role === 'cat' && player.controller === 'ai'
  element.className = [
    'campus-role-marker',
    `is-${player.role}`,
    player.controller === 'human' ? 'is-human' : 'is-ai',
    converted ? 'is-converted' : ''
  ].filter(Boolean).join(' ')
  element.querySelector('.marker-face').textContent = player.role === 'cat' ? '🐱' : '🐭'
  element.querySelector('.marker-label').textContent =
    player.controller === 'human' ? '你' : converted ? '已转化' : ''
  element.setAttribute(
    'aria-label',
    player.controller === 'human' ? '玩家猫' : player.role === 'cat' ? '电脑猫' : '电脑鼠'
  )
}

function updateMarkers() {
  if (!mapReady.value || !map) return
  const activeIds = new Set(props.players.map((player) => player.id))

  for (const [id, marker] of markers) {
    if (!activeIds.has(id)) {
      marker.remove()
      markers.delete(id)
      previousPositions.delete(id)
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

  if (followHuman.value) centerOnHuman(false)
}

function centerOnHuman(force = true) {
  const human = props.players.find((player) => player.controller === 'human')
  if (!human || !map) return
  followHuman.value = true
  programmaticMove = true
  const options = {
    center: gameToLngLat(human.position, props.config),
    duration: force ? 650 : 80,
    essential: true
  }
  map.easeTo(options)
  window.setTimeout(() => { programmaticMove = false }, force ? 700 : 100)
}

function toggleCollisions() {
  showCollision.value = !showCollision.value
  if (map?.getLayer('collision-debug')) {
    map.setLayoutProperty(
      'collision-debug',
      'visibility',
      showCollision.value ? 'visible' : 'none'
    )
  }
}

function fitActivity() {
  if (!map) return
  followHuman.value = false
  programmaticMove = true
  map.fitBounds(geoBoundsToMapLibre(props.config.geoBounds), {
    padding: 44,
    duration: 650,
    essential: true
  })
  window.setTimeout(() => { programmaticMove = false }, 700)
}

onMounted(() => {
  map = new MapLibreMap({
    container: mapContainer.value,
    style: createStyle(),
    bounds: geoBoundsToMapLibre(props.config.geoBounds),
    fitBoundsOptions: { padding: 44 },
    maxBounds: geoBoundsToMapLibre(props.config.geoBounds),
    minZoom: 15.4,
    maxZoom: 20,
    pitch: 38,
    bearing: -8,
    maxPitch: 65,
    attributionControl: false
  })
  if (import.meta.env.DEV) {
    window.__campusMap = map
    window.__campusMapErrors = []
    map.on('error', (event) => {
      window.__campusMapErrors.push(event.error?.message ?? String(event.error))
    })
  }
  map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right')
  map.addControl(new AttributionControl({
    compact: true,
    customAttribution: `<a href="${CAMPUS_MAP_SOURCE_URL}" target="_blank" rel="noreferrer">OpenStreetMap campus data</a> · ODbL 1.0`
  }))
  map.on('load', () => {
    mapReady.value = true
    updateMarkers()
    emit('ready')
  })
  for (const eventName of ['dragstart', 'rotatestart', 'pitchstart', 'zoomstart']) {
    map.on(eventName, () => {
      if (!programmaticMove) followHuman.value = false
    })
  }
})

watch(() => props.players, updateMarkers, { deep: true, flush: 'post' })

onBeforeUnmount(() => {
  for (const marker of markers.values()) marker.remove()
  markers.clear()
  map?.remove()
  if (import.meta.env.DEV) delete window.__campusMap
  if (import.meta.env.DEV) delete window.__campusMapErrors
  map = null
})
</script>

<template>
  <div class="campus-map-shell">
    <div ref="mapContainer" class="campus-map-canvas" aria-label="河南财经政法大学郑东校区猫鼠游戏地图"></div>

    <div class="map-status">
      <span class="status-live">本地校园场景</span>
      <span>{{ CAMPUS_DATA_META.featureCount }} 个 OSM 要素</span>
      <span>模拟定位</span>
    </div>

    <div class="map-actions" aria-label="地图显示控制">
      <button :class="{ active: followHuman }" @click="centerOnHuman()">
        {{ followHuman ? '跟随中' : '跟随玩家' }}
      </button>
      <button @click="fitActivity">查看全场</button>
      <button :class="{ active: showCollision }" @click="toggleCollisions">
        碰撞范围
      </button>
    </div>

    <div v-if="phase === 'hiding'" class="map-phase-notice">
      <strong>老鼠正在躲藏</strong>
      <span>玩家猫暂时不能移动</span>
    </div>
  </div>
</template>

<style>
.campus-map-shell {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #dce7dc;
}

.campus-map-canvas { width: 100%; height: 100%; }
.campus-map-canvas .maplibregl-canvas { outline: none; }
.campus-map-canvas .maplibregl-ctrl-group {
  overflow: hidden;
  border: 1px solid rgba(23, 55, 42, 0.12);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(18, 48, 37, 0.14);
}
.campus-map-canvas .maplibregl-ctrl-attrib {
  color: #496257;
  font-size: 10px;
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
  background: #ffe898;
  box-shadow: 0 5px 16px rgba(16, 38, 29, 0.34);
  transition: transform 0.09s linear;
}
.campus-role-marker .marker-face { font-size: 22px; line-height: 1; }
.campus-role-marker .marker-direction {
  position: absolute;
  top: -11px;
  color: #c49300;
  font-size: 13px;
  filter: drop-shadow(0 1px 0 #fff);
  transform: rotate(var(--heading));
  transform-origin: 50% 24px;
  transition: transform 0.25s ease;
}
.campus-role-marker .marker-label {
  position: absolute;
  top: -25px;
  min-width: 24px;
  padding: 2px 6px;
  border-radius: 999px;
  background: #183b2d;
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  line-height: 1.35;
  text-align: center;
  white-space: nowrap;
}
.campus-role-marker .marker-label:empty { display: none; }
.campus-role-marker.is-cat { background: #7dc7ff; }
.campus-role-marker.is-cat .marker-direction { color: #1678bd; }
.campus-role-marker.is-human {
  width: 46px;
  height: 46px;
  border-width: 3px;
  border-color: #fff;
  box-shadow: 0 0 0 5px rgba(255, 77, 56, 0.38), 0 8px 24px rgba(16, 38, 29, 0.38);
}
.campus-role-marker.is-human .marker-label { background: #ed4b37; }
.campus-role-marker.is-converted { background: #b99cff; }
.campus-role-marker.is-converted .marker-direction { color: #6848bb; }

.map-status,
.map-actions {
  position: absolute;
  z-index: 2;
  display: flex;
  gap: 7px;
}
.map-status { top: 12px; left: 12px; flex-wrap: wrap; max-width: calc(100% - 126px); }
.map-status span {
  padding: 6px 9px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 999px;
  background: rgba(24, 53, 42, 0.8);
  color: rgba(255, 255, 255, 0.88);
  font-size: 10px;
  font-weight: 650;
  backdrop-filter: blur(7px);
}
.map-status .status-live { background: rgba(16, 134, 82, 0.9); color: #fff; }
.map-actions { right: 12px; bottom: 30px; }
.map-actions button {
  padding: 7px 10px;
  border: 1px solid rgba(29, 68, 52, 0.16);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.9);
  color: #315345;
  font-size: 10px;
  font-weight: 750;
  box-shadow: 0 5px 16px rgba(20, 48, 37, 0.12);
  cursor: pointer;
  backdrop-filter: blur(7px);
}
.map-actions button.active { border-color: #159664; background: #159664; color: #fff; }
.map-phase-notice {
  position: absolute;
  z-index: 2;
  left: 50%;
  top: 50%;
  display: flex;
  min-width: 190px;
  flex-direction: column;
  gap: 4px;
  padding: 16px 20px;
  transform: translate(-50%, -50%);
  border: 1px solid rgba(255, 255, 255, 0.52);
  border-radius: 16px;
  background: rgba(18, 50, 37, 0.84);
  color: #fff;
  text-align: center;
  box-shadow: 0 18px 50px rgba(11, 31, 23, 0.25);
  backdrop-filter: blur(8px);
}
.map-phase-notice strong { font-size: 17px; }
.map-phase-notice span { font-size: 11px; opacity: 0.8; }

@media (max-width: 700px) {
  .map-status span:nth-child(2) { display: none; }
  .map-actions { left: 10px; right: 10px; bottom: 28px; justify-content: center; }
  .map-actions button { padding: 7px 8px; }
}
</style>
