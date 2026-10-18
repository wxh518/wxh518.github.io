import assert from 'node:assert/strict'
import { test } from 'node:test'
import homepageFile from '../content/homepage.json'
import postsFile from '../content/posts.json'
import { validateContent } from '../src/lib/content-validation'
import { projectPlace } from '../src/lib/map-projection'

test('geographic projection aligns the map corners and all configured city points stay visible', () => {
  const space = homepageFile.statistics.space
  const bounds = space.bounds
  assert.deepEqual(projectPlace({ name: 'northwest', latitude: bounds.north, longitude: bounds.west }, bounds), { x: 0, y: 0 })
  assert.deepEqual(projectPlace({ name: 'southeast', latitude: bounds.south, longitude: bounds.east }, bounds), { x: 100, y: 100 })
  for (const place of [space.currentLocation, ...space.visitedPlaces]) {
    const point = projectPlace(place, bounds)
    assert.ok(point.x > 0 && point.x < 100 && point.y > 0 && point.y < 100, `${place.name} should be inside the map`)
  }
  const north = projectPlace({ name: 'north', latitude: 47, longitude: 120 }, bounds)
  const south = projectPlace({ name: 'south', latitude: 25, longitude: 120 }, bounds)
  assert.equal(north.x, south.x)
  assert.ok(north.y < south.y)
})

test('city configuration rejects duplicate cities, reversed bounds and coordinates outside the map', () => {
  const homepage = structuredClone(homepageFile)
  homepage.statistics.space.visitedPlaces.push({ ...homepage.statistics.space.visitedPlaces[0] })
  homepage.statistics.space.visitedPlaces[1].longitude = 150
  homepage.statistics.space.bounds.north = 20
  const errors = validateContent(homepage, postsFile).join('\n')
  assert.match(errors, /visitedPlaces/)
  assert.match(errors, /超出底图范围/)
  assert.match(errors, /bounds/)
})
