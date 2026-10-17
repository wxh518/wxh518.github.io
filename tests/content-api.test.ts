import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createApp } from '../worker/index'
import homepageFile from '../content/homepage.json'
import postsFile from '../content/posts.json'
import { configContentService } from '../src/services/config-content-service'
import { createHttpContentService } from '../src/services/http-content-service'

const { $schema: _schema, ...homepageContent } = homepageFile
const { posts } = postsFile
const app = createApp()
const origin = 'https://wxh518.github.io'
const env = { ALLOWED_ORIGINS: `${origin},http://127.0.0.1:5173` }
const request = (path: string, init?: RequestInit) => app.request(`https://api.example.test${path}`, init, env)

test('homepage returns the configured contract with JSON and browser cache headers', async () => {
  const response = await request('/api/homepage', { headers: { Origin: origin } })
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), homepageContent)
  assert.match(response.headers.get('content-type') || '', /application\/json/)
  assert.equal(response.headers.get('cache-control'), 'public, max-age=60')
  assert.equal(response.headers.get('access-control-allow-origin'), origin)
  assert.match(response.headers.get('vary') || '', /Origin/i)
})

test('post list omits Markdown bodies, while detail returns the full article', async () => {
  const list = await (await request('/api/posts')).json() as Record<string, unknown>[]
  assert.equal(list.length, posts.length)
  assert.ok(list.every(post => !('body' in post)))
  const detail = await request(`/api/posts/${posts[0].slug}`)
  assert.deepEqual(await detail.json(), posts[0])
})

test('unknown articles and endpoints return JSON 404 without cache', async () => {
  for (const path of ['/api/posts/missing', '/api/missing']) {
    const response = await request(path)
    assert.equal(response.status, 404)
    assert.equal(response.headers.get('cache-control'), 'no-store')
    assert.ok((await response.json() as { error: unknown }).error)
  }
})

test('preflight allows configured frontend and local development origins', async () => {
  for (const allowed of [origin, 'http://127.0.0.1:5173']) {
    const response = await request('/api/posts', { method: 'OPTIONS', headers: { Origin: allowed, 'Access-Control-Request-Method': 'GET' } })
    assert.equal(response.status, 204)
    assert.equal(response.headers.get('access-control-allow-origin'), allowed)
    assert.match(response.headers.get('access-control-allow-methods') || '', /GET/)
    assert.equal(response.headers.get('access-control-allow-credentials'), null)
  }
})

test('unlisted and deceptive origins are not granted browser access', async () => {
  for (const denied of ['https://example.test', `${origin}.example.test`]) {
    const response = await request('/api/homepage', { headers: { Origin: denied } })
    assert.equal(response.headers.get('access-control-allow-origin'), null)
  }
})

test('write requests are rejected, HEAD and health remain available', async () => {
  const write = await request('/api/posts', { method: 'POST' })
  assert.equal(write.status, 405)
  assert.equal(write.headers.get('allow'), 'GET, HEAD, OPTIONS')
  const head = await request('/api/posts', { method: 'HEAD' })
  assert.equal(head.status, 200)
  assert.equal(await head.text(), '')
  assert.equal((await (await request('/api/health')).json() as { status: string }).status, 'ok')
})

test('repository errors return a generic uncached 500 and keep CORS headers', async t => {
  t.mock.method(console, 'error', () => {})
  const broken = createApp({ ...configContentService, async getHomepage() { throw new Error('private implementation detail') } })
  const response = await broken.request('/api/homepage', { headers: { Origin: origin } }, env)
  assert.equal(response.status, 500)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.equal(response.headers.get('access-control-allow-origin'), origin)
  assert.doesNotMatch(await response.text(), /private implementation detail/)
})

test('frontend HTTP adapter consumes the real Hono routes end to end', async () => {
  const fetcher: typeof fetch = async (input, init) => app.fetch(new Request(input, init), env)
  const client = createHttpContentService('https://api.example.test/api/', fetcher)
  assert.deepEqual(await client.getHomepage(), homepageContent)
  const summaries = await client.getPosts()
  assert.equal(summaries.length, posts.length)
  assert.deepEqual(await client.getPost(summaries[0].slug), posts[0])
  assert.equal(await client.getPost('missing'), null)
})
