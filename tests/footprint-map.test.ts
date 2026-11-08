import assert from 'node:assert/strict'
import { test } from 'node:test'
import { validateContent } from '../src/lib/content-validation'
import { projectPlace } from '../src/lib/map-projection'
import { createConfigFixture } from './fixtures/content'

test('geographic projection aligns the map corners and all configured city points stay visible', () => {
  const space = createConfigFixture().homepage.statistics.space!
  const bounds = space.bounds!
  assert.deepEqual(projectPlace({ name: 'northwest', latitude: bounds.north, longitude: bounds.west }, bounds), { x: 0, y: 0 })
  assert.deepEqual(projectPlace({ name: 'southeast', latitude: bounds.south, longitude: bounds.east }, bounds), { x: 100, y: 100 })
  for (const place of [space.currentLocation!, ...space.visitedPlaces!]) {
    const point = projectPlace(place, bounds)
    assert.ok(point.x > 0 && point.x < 100 && point.y > 0 && point.y < 100, `${place.name} should be inside the map`)
  }
  const north = projectPlace({ name: 'north', latitude: 47, longitude: 120 }, bounds)
  const south = projectPlace({ name: 'south', latitude: 25, longitude: 120 }, bounds)
  assert.equal(north.x, south.x)
  assert.ok(north.y < south.y)
})

test('city configuration rejects duplicate cities, reversed bounds and coordinates outside the map', () => {
  const { homepage, articles } = createConfigFixture()
  const space = homepage.statistics.space!
  const places = space.visitedPlaces!
  places.push({ ...places[0] })
  places[1].longitude = 150
  space.bounds!.north = 20
  const errors = validateContent(homepage, articles).join('\n')
  assert.match(errors, /visitedPlaces/)
  assert.match(errors, /超出底图范围/)
  assert.match(errors, /bounds/)
})
