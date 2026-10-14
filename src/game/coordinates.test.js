import test from 'node:test'
import assert from 'node:assert/strict'

import { ACTIVITY_GEO_BOUNDS } from './campus.js'
import {
  gameToLngLat,
  geoBoundsToMapLibre,
  lngLatToGame,
  measureGeoBounds
} from './coordinates.js'

const size = measureGeoBounds(ACTIVITY_GEO_BOUNDS)
const config = {
  mapWidth: size.width,
  mapHeight: size.height,
  geoBounds: ACTIVITY_GEO_BOUNDS
}

test('activity bounds measure a plausible campus-sized area', () => {
  assert.ok(size.width > 700 && size.width < 800)
  assert.ok(size.height > 300 && size.height < 310)
})

test('game coordinates round-trip through WGS84 coordinates', () => {
  const position = { x: 321.25, y: 128.75 }
  const result = lngLatToGame(gameToLngLat(position, config), config)

  assert.ok(Math.abs(result.x - position.x) < 1e-8)
  assert.ok(Math.abs(result.y - position.y) < 1e-8)
})

test('activity corners use longitude-latitude order', () => {
  assert.deepEqual(gameToLngLat({ x: 0, y: 0 }, config), [
    ACTIVITY_GEO_BOUNDS.west,
    ACTIVITY_GEO_BOUNDS.north
  ])
  assert.deepEqual(geoBoundsToMapLibre(ACTIVITY_GEO_BOUNDS), [
    [ACTIVITY_GEO_BOUNDS.west, ACTIVITY_GEO_BOUNDS.south],
    [ACTIVITY_GEO_BOUNDS.east, ACTIVITY_GEO_BOUNDS.north]
  ])
})

