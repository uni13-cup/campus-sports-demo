import { ACTIVITY_GEO_BOUNDS } from './campus.js'
import { CAMPUS_SCENE } from './data/campus-data.js'

const LANDMARK_PRIORITY = [
  '第二食堂',
  '第三食堂',
  '艺术学院楼',
  '办公楼',
  '怡苑1号楼',
  '怡苑2号楼',
  '怡苑3号楼'
]

export function createCampusLandmarks(
  scene = CAMPUS_SCENE,
  bounds = ACTIVITY_GEO_BOUNDS
) {
  const priority = new Map(LANDMARK_PRIORITY.map((name, index) => [name, index]))
  return scene.features
    .filter((feature) =>
      feature.properties?.kind === 'building' &&
      priority.has(feature.properties?.name)
    )
    .map((feature) => ({
      id: `landmark-${feature.properties.osmId}`,
      name: feature.properties.name,
      osmId: feature.properties.osmId,
      position: geometryCenter(feature.geometry)
    }))
    .filter(({ position }) => insideBounds(position, bounds))
    .sort((left, right) => priority.get(left.name) - priority.get(right.name))
}

export const CAMPUS_LANDMARKS = createCampusLandmarks()

function geometryCenter(geometry) {
  const coordinates = []
  collectCoordinates(geometry?.coordinates, coordinates)
  if (coordinates.length === 0) return [NaN, NaN]
  return [
    coordinates.reduce((sum, coordinate) => sum + coordinate[0], 0) / coordinates.length,
    coordinates.reduce((sum, coordinate) => sum + coordinate[1], 0) / coordinates.length
  ]
}

function collectCoordinates(value, output) {
  if (!Array.isArray(value)) return
  if (
    value.length >= 2 &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  ) {
    output.push(value)
    return
  }
  value.forEach((item) => collectCoordinates(item, output))
}

function insideBounds([longitude, latitude], bounds) {
  return (
    longitude >= bounds.west &&
    longitude <= bounds.east &&
    latitude >= bounds.south &&
    latitude <= bounds.north
  )
}
