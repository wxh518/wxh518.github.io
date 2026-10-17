import assert from 'node:assert/strict'
import test from 'node:test'
import { cardinalClosed, radarGeometry, stackedAreas } from '../src/lib/chart-geometry'

test('time areas preserve irregular age spacing and close every stacked band without gaps', () => {
  const areas = stackedAreas([-1, 0, 9], [{ values: [0, 20, 60] }, { values: [100, 80, 40] }])
  assert.equal(areas[0].upper[1].x, 50)
  assert.equal(areas[0].upper[1].y, 240)
  assert.deepEqual(areas[0].upper, areas[1].lower)
  assert.ok(areas[1].upper.every(point => point.y === 0))
  assert.ok(areas.every(area => area.path.endsWith('Z') && area.path.includes('C')))
  assert.deepEqual(stackedAreas([3, 3], [{ values: [50, 50] }]), [])
})

test('radar scales fractional weights by the largest value and remains finite for zero or narrow charts', () => {
  const radar = radarGeometry([.5, .25, 0], 529)
  assert.deepEqual(radar.center, { x: 289.5, y: 175 })
  assert.equal(radar.radius, 109.5)
  assert.equal(radar.vertices[0].y, -109.5)
  assert.ok(Math.abs(Math.hypot(radar.vertices[1].x, radar.vertices[1].y) - 54.75) < 1e-10)
  for (const chart of [radarGeometry([0, 0, 0], 300), radarGeometry([1, 2, 3], 100)]) {
    assert.ok(chart.vertices.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)))
  }
})

test('closed cardinal outline joins back to its starting point with matching tangent', () => {
  // 菱形的上端和右端有可手算的切线，验证曲线闭合而非只连直线。
  const path = cardinalClosed([{ x: 0, y: -6 }, { x: 6, y: 0 }, { x: 0, y: 6 }, { x: -6, y: 0 }])
  assert.equal(path, 'M6,0C6,2,2,6,0,6C-2,6,-6,2,-6,0C-6,-2,-2,-6,0,-6C2,-6,6,-2,6,0')
})
