import test from 'node:test'
import assert from 'node:assert/strict'
import { ACTIVITY_GEO_BOUNDS } from './campus.js'
import { CAMPUS_LANDMARKS, createCampusLandmarks } from './landmarks.js'

test('campus landmarks come from named local OSM buildings', () => {
  assert.deepEqual(
    CAMPUS_LANDMARKS.slice(0, 4).map((landmark) => landmark.name),
    ['第二食堂', '第三食堂', '艺术学院楼', '办公楼']
  )
  assert.equal(CAMPUS_LANDMARKS.length, 7)
  assert.ok(CAMPUS_LANDMARKS.every((landmark) => /^\d+$/.test(landmark.osmId)))
})

test('campus landmarks stay inside the agreed activity boundary', () => {
  for (const landmark of CAMPUS_LANDMARKS) {
    const [longitude, latitude] = landmark.position
    assert.ok(longitude >= ACTIVITY_GEO_BOUNDS.west)
    assert.ok(longitude <= ACTIVITY_GEO_BOUNDS.east)
    assert.ok(latitude >= ACTIVITY_GEO_BOUNDS.south)
    assert.ok(latitude <= ACTIVITY_GEO_BOUNDS.north)
  }
})

test('unnamed or invented buildings are not promoted to landmarks', () => {
  const scene = {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: { kind: 'building', name: '不存在的楼', osmId: '1' },
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [113.812, 34.785], [113.813, 34.785],
          [113.813, 34.786], [113.812, 34.785]
        ]]
      }
    }]
  }
  assert.deepEqual(createCampusLandmarks(scene), [])
})
