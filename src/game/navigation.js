import { CAMPUS_SCENE } from './data/campus-data.js'
import { DEMO_ROUTE_LINES } from './data/campus-routes.js'
import { GAME_CONFIG } from './config.js'
import { lngLatToGame } from './coordinates.js'
import { calcDistance, isWalkablePosition, syncLegacyFields } from './engine.js'
import { normalizeInput, sweepPosition } from './simulation.js'

const WALKABLE_ROAD_CLASSES = new Set([
  'footway',
  'living_street',
  'residential'
])
const INTERSECTION_LINK_DISTANCE = 18

export function createCampusRoadGraph(config = GAME_CONFIG) {
  const nodeByKey = new Map()
  const edgeKeys = new Set()

  function addNode(position) {
    const key = `${position.x.toFixed(2)},${position.y.toFixed(2)}`
    if (!nodeByKey.has(key)) {
      nodeByKey.set(key, {
        id: `road-${nodeByKey.size + 1}`,
        position,
        neighbors: []
      })
    }
    return nodeByKey.get(key)
  }

  function connect(left, right) {
    if (!left || !right || left.id === right.id) return
    const key = [left.id, right.id].sort().join('|')
    if (edgeKeys.has(key) || !segmentIsWalkable(left.position, right.position, config)) return
    edgeKeys.add(key)
    const cost = calcDistance(left.position, right.position)
    left.neighbors.push({ id: right.id, cost })
    right.neighbors.push({ id: left.id, cost })
  }

  for (const feature of CAMPUS_SCENE.features) {
    if (
      feature.properties.kind !== 'road' ||
      !WALKABLE_ROAD_CLASSES.has(feature.properties.class) ||
      feature.geometry.type !== 'LineString'
    ) continue

    let previous = null
    for (const coordinate of feature.geometry.coordinates) {
      const position = lngLatToGame(coordinate, config)
      const inside = isWalkablePosition(position, config)
      const current = inside ? addNode(position) : null
      if (previous && current) connect(previous, current)
      previous = current
    }
  }

  for (const line of DEMO_ROUTE_LINES) {
    let previous = null
    for (const position of line) {
      const current = isWalkablePosition(position, config)
        ? addNode({ ...position })
        : null
      if (previous && current) connect(previous, current)
      previous = current
    }
  }

  const nodes = [...nodeByKey.values()]
  for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
      const left = nodes[leftIndex]
      const right = nodes[rightIndex]
      if (calcDistance(left.position, right.position) <= INTERSECTION_LINK_DISTANCE) {
        connect(left, right)
      }
    }
  }

  const connectedNodes = nodes.filter((node) => node.neighbors.length > 0)
  return {
    source: 'local-osm-roads-with-audited-demo-fallback',
    nodes: connectedNodes,
    nodeById: Object.fromEntries(connectedNodes.map((node) => [node.id, node]))
  }
}

export const CAMPUS_ROAD_GRAPH = createCampusRoadGraph()

export function findNearestRoadNode(graph, position) {
  return graph.nodes
    .map((node) => ({ node, distance: calcDistance(node.position, position) }))
    .sort((left, right) => left.distance - right.distance)[0]?.node ?? null
}

export function findPath(graph, startId, goalId) {
  if (!graph.nodeById[startId] || !graph.nodeById[goalId]) return []
  if (startId === goalId) return [startId]

  const open = new Set([startId])
  const cameFrom = new Map()
  const costFromStart = new Map([[startId, 0]])
  const estimatedTotal = new Map([[
    startId,
    heuristic(graph.nodeById[startId], graph.nodeById[goalId])
  ]])

  while (open.size > 0) {
    const currentId = [...open].sort((left, right) =>
      (estimatedTotal.get(left) ?? Infinity) -
      (estimatedTotal.get(right) ?? Infinity)
    )[0]
    if (currentId === goalId) return reconstructPath(cameFrom, currentId)
    open.delete(currentId)

    for (const edge of graph.nodeById[currentId].neighbors) {
      const tentative = (costFromStart.get(currentId) ?? Infinity) + edge.cost
      if (tentative >= (costFromStart.get(edge.id) ?? Infinity)) continue
      cameFrom.set(edge.id, currentId)
      costFromStart.set(edge.id, tentative)
      estimatedTotal.set(
        edge.id,
        tentative + heuristic(graph.nodeById[edge.id], graph.nodeById[goalId])
      )
      open.add(edge.id)
    }
  }
  return []
}

export function planRoadRoute(graph, start, goal) {
  const startNode = findNearestRoadNode(graph, start)
  const goalNode = findNearestRoadNode(graph, goal)
  if (!startNode || !goalNode) return []
  const ids = findPath(graph, startNode.id, goalNode.id)
  if (ids.length === 0) return []
  return ids.map((id) => ({ ...graph.nodeById[id].position }))
}

export function updateNavigatingAi(
  gameState,
  deltaSeconds,
  graph = CAMPUS_ROAD_GRAPH
) {
  const nextState = clone(gameState)
  if (nextState.phase === 'ended') return nextState
  nextState.navigation ??= {}

  const aiPlayers = nextState.players.filter((player) => player.controller === 'ai')
  for (const player of aiPlayers) {
    const goal = chooseGoal(nextState, player, graph)
    if (!goal) continue
    const nav = nextState.navigation[player.id] ?? {
      path: [],
      index: 0,
      replanIn: 0,
      goalKey: null
    }
    nav.replanIn -= deltaSeconds
    const goalKey = `${Math.round(goal.x / 12)},${Math.round(goal.y / 12)}`
    if (nav.replanIn <= 0 || nav.goalKey !== goalKey || nav.index >= nav.path.length) {
      nav.path = planRoadRoute(graph, player.position, goal)
      nav.index = nav.path.length > 1 ? 1 : 0
      nav.replanIn = player.role === 'cat' ? 0.45 : 0.7
      nav.goalKey = goalKey
    }
    nextState.navigation[player.id] = nav

    const waypoint = nav.path[nav.index] ?? goal
    moveToward(nextState, player, waypoint, deltaSeconds)
    if (calcDistance(player.position, waypoint) < 2.2) nav.index += 1
  }

  return syncLegacyFields(nextState)
}

function chooseGoal(gameState, player, graph) {
  const cats = gameState.players.filter((item) => item.role === 'cat')
  const mice = gameState.players.filter((item) => item.role === 'mouse')
  if (player.role === 'cat') {
    return mice
      .map((mouse) => ({
        position: mouse.position,
        distance: calcDistance(player.position, mouse.position)
      }))
      .sort((left, right) => left.distance - right.distance)[0]?.position ?? null
  }

  if (cats.length === 0) return null
  return graph.nodes
    .map((node) => {
      const dangerDistance = Math.min(
        ...cats.map((cat) => calcDistance(node.position, cat.position))
      )
      const travelDistance = calcDistance(player.position, node.position)
      return { node, score: dangerDistance - travelDistance * 0.18 }
    })
    .sort((left, right) => right.score - left.score)[0]?.node.position ?? null
}

function moveToward(gameState, player, waypoint, deltaSeconds) {
  const direction = normalizeInput({
    x: waypoint.x - player.position.x,
    y: waypoint.y - player.position.y
  })
  const speed = player.role === 'mouse'
    ? (gameState.config.mouseSpeed ?? 28)
    : (gameState.config.aiCatSpeed ?? 34)
  const distance = Math.min(speed * deltaSeconds, calcDistance(player.position, waypoint))
  const requested = {
    x: player.position.x + direction.x * distance,
    y: player.position.y + direction.y * distance
  }
  player.position = sweepPosition(player.position, requested, gameState.config)
}

function segmentIsWalkable(start, end, config) {
  const distance = calcDistance(start, end)
  const steps = Math.max(1, Math.ceil(distance / 3))
  for (let index = 0; index <= steps; index += 1) {
    const ratio = index / steps
    if (!isWalkablePosition({
      x: start.x + (end.x - start.x) * ratio,
      y: start.y + (end.y - start.y) * ratio
    }, config)) return false
  }
  return true
}

function heuristic(left, right) {
  return calcDistance(left.position, right.position)
}

function reconstructPath(cameFrom, currentId) {
  const path = [currentId]
  while (cameFrom.has(currentId)) {
    currentId = cameFrom.get(currentId)
    path.unshift(currentId)
  }
  return path
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}
