import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHttpContentService } from '../src/services/http-content-service'

test('HTTP errors are reported instead of silently substituting placeholder content', async () => {
  const client = createHttpContentService('/api', async () => new Response('', { status: 503 }))
  await assert.rejects(client.getHomepage(), /HTTP 503/)
})

test('an incorrect API URL returning the frontend HTML is diagnosed', async () => {
  const client = createHttpContentService('/api', async () => new Response('<html></html>', { headers: { 'Content-Type': 'text/html' } }))
  await assert.rejects(client.getPosts(), /JSON/)
})

test('malformed article list and detail responses are rejected', async () => {
  const client = createHttpContentService('/api', async () => Response.json([{ title: 'Incomplete article' }]))
  await assert.rejects(client.getPosts(), /格式/)
  await assert.rejects(client.getPost('incomplete'), /格式/)
})

test('article slugs are URL encoded', async () => {
  let requested = ''
  const client = createHttpContentService('/api/', async input => {
    requested = String(input)
    return new Response(null, { status: 404 })
  })
  await client.getPost('hello/世界?draft=true')
  assert.equal(requested, '/api/posts/hello%2F%E4%B8%96%E7%95%8C%3Fdraft%3Dtrue')
})

test('cancelling the UI request also cancels the underlying HTTP request', async () => {
  const controller = new AbortController()
  const client = createHttpContentService('/api', (_input, init) => new Promise((_resolve, reject) => {
    const signal = init?.signal
    if (signal?.aborted) reject(signal.reason)
    else signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
  }))
  const pending = client.getHomepage(controller.signal)
  controller.abort()
  await assert.rejects(pending, error => error instanceof DOMException && error.name === 'AbortError')
})
