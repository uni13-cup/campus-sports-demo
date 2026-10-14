import test from 'node:test'
import assert from 'node:assert/strict'
import { GAME_CONFIG } from './config.js'
import { initGame, isWalkablePosition } from './engine.js'
import {
  CAMPUS_ROAD_GRAPH,
  findPath,
  planRoadRoute,
  updateNavigatingAi
} from './navigation.js'

test('campus graph contains a substantial locally filtered road network', () => {
  assert.equal(CAMPUS_ROAD_GRAPH.source, 'local-osm-roads-with-audited-demo-fallback')
  assert.ok(CAMPUS_ROAD_GRAPH.nodes.length >= 40)
  assert.ok(CAMPUS_ROAD_GRAPH.nodes.every((node) => node.neighbors.length > 0))
  assert.ok(CAMPUS_ROAD_GRAPH.nodes.every((node) =>
    isWalkablePosition(node.position, GAME_CONFIG)
  ))
})

test('A* returns the lowest-cost route on a deterministic graph', () => {
  const graph = {
    nodeById: {
      a: { id: 'a', position: { x: 0, y: 0 }, neighbors: [{ id: 'b', cost: 2 }, { id: 'c', cost: 9 }] },
      b: { id: 'b', position: { x: 2, y: 0 }, neighbors: [{ id: 'a', cost: 2 }, { id: 'c', cost: 2 }] },
      c: { id: 'c', position: { x: 4, y: 0 }, neighbors: [{ id: 'a', cost: 9 }, { id: 'b', cost: 2 }] }
    }
  }
  assert.deepEqual(findPath(graph, 'a', 'c'), ['a', 'b', 'c'])
})

test('A* returns an empty path for an unreachable goal', () => {
  const graph = {
    nodeById: {
      a: { id: 'a', position: { x: 0, y: 0 }, neighbors: [] },
      b: { id: 'b', position: { x: 2, y: 0 }, neighbors: [] }
    }
  }
  assert.deepEqual(findPath(graph, 'a', 'b'), [])
})

test('spawn areas can connect to a campus road route', () => {
  const route = planRoadRoute(
    CAMPUS_ROAD_GRAPH,
    GAME_CONFIG.spawnPoints.cat,
    GAME_CONFIG.spawnPoints.mice[0]
  )
  assert.ok(route.length >= 2)
})

test('navigating AI moves continuously and stays walkable', () => {
  const state = initGame()
  state.phase = 'chasing'
  const before = state.players.find((player) => player.id === 'mouse-1').position
  const next = updateNavigatingAi(state, 1 / 30)
  const after = next.players.find((player) => player.id === 'mouse-1').position
  assert.notDeepEqual(after, before)
  assert.ok(isWalkablePosition(after, next.config))
  assert.ok(next.navigation['mouse-1'].path.length > 0)
})
