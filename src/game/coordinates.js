const EARTH_RADIUS_METERS = 6378137

function assertBounds(bounds) {
  if (
    !bounds ||
    !Number.isFinite(bounds.west) ||
    !Number.isFinite(bounds.south) ||
    !Number.isFinite(bounds.east) ||
    !Number.isFinite(bounds.north) ||
    bounds.west >= bounds.east ||
    bounds.south >= bounds.north
  ) {
    throw new TypeError('geoBounds must contain valid west, south, east and north values')
  }
}

function assertPosition(position) {
  if (!position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) {
    throw new TypeError('position.x and position.y must be finite numbers')
  }
}

export function measureGeoBounds(bounds) {
  assertBounds(bounds)
  const middleLatitude = (bounds.north + bounds.south) / 2
  const width = degreesToRadians(bounds.east - bounds.west) *
    EARTH_RADIUS_METERS * Math.cos(degreesToRadians(middleLatitude))
  const height = degreesToRadians(bounds.north - bounds.south) *
    EARTH_RADIUS_METERS

  return { width, height }
}

// 游戏坐标以活动区左上角为原点：x 向东，y 向南，单位为模拟米。
export function gameToLngLat(position, config) {
  assertPosition(position)
  assertBounds(config?.geoBounds)
  if (!Number.isFinite(config.mapWidth) || !Number.isFinite(config.mapHeight)) {
    throw new TypeError('config.mapWidth and config.mapHeight must be finite numbers')
  }

  const longitude = config.geoBounds.west +
    (position.x / config.mapWidth) *
    (config.geoBounds.east - config.geoBounds.west)
  const latitude = config.geoBounds.north -
    (position.y / config.mapHeight) *
    (config.geoBounds.north - config.geoBounds.south)

  return [longitude, latitude]
}

export function lngLatToGame(lngLat, config) {
  if (
    !Array.isArray(lngLat) ||
    lngLat.length < 2 ||
    !Number.isFinite(lngLat[0]) ||
    !Number.isFinite(lngLat[1])
  ) {
    throw new TypeError('lngLat must be a [longitude, latitude] pair')
  }
  assertBounds(config?.geoBounds)

  return {
    x: ((lngLat[0] - config.geoBounds.west) /
      (config.geoBounds.east - config.geoBounds.west)) * config.mapWidth,
    y: ((config.geoBounds.north - lngLat[1]) /
      (config.geoBounds.north - config.geoBounds.south)) * config.mapHeight
  }
}

export function geoBoundsToMapLibre(bounds) {
  assertBounds(bounds)
  return [
    [bounds.west, bounds.south],
    [bounds.east, bounds.north]
  ]
}

function degreesToRadians(value) {
  return value * Math.PI / 180
}

