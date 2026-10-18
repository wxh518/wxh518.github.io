import type { MapBounds, MapPlace } from '../types/content'

/** 与站内底图使用相同的墨卡托投影，返回以左上角为原点的百分比坐标。 */
export function projectPlace(place: MapPlace, bounds: MapBounds) {
  const mercator = (latitude: number) => Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360))
  return {
    x: (place.longitude - bounds.west) / (bounds.east - bounds.west) * 100,
    y: (mercator(bounds.north) - mercator(place.latitude)) / (mercator(bounds.north) - mercator(bounds.south)) * 100,
  }
}
