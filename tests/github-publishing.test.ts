import assert from 'node:assert/strict'
import { test } from 'node:test'
import { configContentSource } from '../src/services/config-content-service'
import { contentFingerprint, createGitHubPublisher, preparePublication, PublishConflict } from '../src/services/github-content'
import type { ContentDocument } from '../src/types/admin'

const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='
function source() { return structuredClone(configContentSource) }
function github(remote: ContentDocument, racing = false) {
  const calls: { method: string; path: string; body: Record<string, unknown>; auth: string | null }[] = []
  const fetcher = (async (input, init) => {
    const url = new URL(String(input))
    assert.equal(url.origin, 'https://api.github.com')
    const path = url.pathname.replace('/repos/wxh518/wxh518.github.io', '')
    const method = init?.method || 'GET'
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    calls.push({ method, path, body, auth: new Headers(init?.headers).get('Authorization') })
    if (path === '/git/ref/heads/master') return Response.json({ object: { sha: 'head-current' } })
    if (path === '/git/commits/head-current') return Response.json({ tree: { sha: 'tree-with-other-code' } })
    if (path.startsWith('/contents/')) {
      assert.equal(url.searchParams.get('ref'), 'head-current')
      const value = path.endsWith('homepage.json') ? { $schema: './schemas/homepage.schema.json', ...remote.homepage } : { $schema: './schemas/posts.schema.json', schemaVersion: 1, posts: remote.posts }
      return Response.json({ encoding: 'base64', content: Buffer.from(JSON.stringify(value)).toString('base64') })
    }
    if (path === '/git/blobs') return Response.json({ sha: `blob-${calls.length}` })
    if (path === '/git/trees') return Response.json({ sha: 'new-tree' })
    if (path === '/git/commits') return Response.json({ sha: 'new-commit' })
    if (path === '/git/refs/heads/master') return racing ? new Response('', { status: 422 }) : Response.json({ object: { sha: 'new-commit' } })
    if (path.startsWith('/actions/')) return Response.json({ workflow_runs: [{ status: 'completed', conclusion: 'success', html_url: 'https://github.com/example/run' }] })
    throw new Error(`Unexpected request: ${method} ${path}`)
  }) as typeof fetch
  return { client: createGitHubPublisher(fetcher), calls }
}

test('publication excludes private drafts and their images while local drafts remain intact', async () => {
  const document = source()
  document.posts.push({ ...document.posts[0], slug: 'private-draft', title: '', body: `PRIVATE DRAFT ![](${png})`, status: 'draft' })
  const prepared = await preparePublication(document)
  assert.equal(prepared.document.posts.length, document.posts.length - 1)
  assert.equal(prepared.files.length, 2)
  assert.ok(!JSON.stringify(prepared.files).includes('PRIVATE DRAFT'))
  assert.equal(document.posts.at(-1)?.status, 'draft')
})

test('images in profile and Markdown become shared site assets in the same publication', async () => {
  const document = source()
  document.homepage.profile.avatarImage = png
  document.posts[0].body = `中文正文\n\n![图片](${png})`
  const prepared = await preparePublication(document)
  assert.equal(prepared.files.length, 3)
  assert.match(prepared.files[0].path, /^public\/images\/uploads\/[a-f0-9]{64}\.png$/)
  assert.equal(prepared.files[0].encoding, 'base64')
  const imagePath = './' + prepared.files[0].path.slice('public/'.length)
  assert.equal(prepared.document.homepage.profile.avatarImage, imagePath)
  assert.ok(prepared.document.posts[0].body.includes(imagePath))
  assert.ok(!JSON.stringify(prepared.document).includes('data:image'))
  assert.equal(document.homepage.profile.avatarImage, png)
})

test('a publication keeps unrelated repository files and advances the branch atomically', async () => {
  const original = source()
  const edited = source(); edited.posts[0].title = '中文发布测试'
  const { client, calls } = github(original)
  const result = await client.publish(edited, contentFingerprint(original), 'test-only-token')
  assert.equal(result.sha, 'new-commit')
  const tree = calls.find(call => call.path === '/git/trees')!
  assert.equal(tree.body.base_tree, 'tree-with-other-code')
  assert.deepEqual((tree.body.tree as { path: string }[]).map(item => item.path), ['content/homepage.json', 'content/posts.json'])
  assert.deepEqual(calls.find(call => call.path === '/git/commits')!.body.parents, ['head-current'])
  assert.deepEqual(calls.at(-1)!.body, { sha: 'new-commit', force: false })
})

test('remote content conflicts cause no writes; a race never forces a branch update', async () => {
  const original = source()
  const remote = source(); remote.homepage.profile.name = '其他设备修改'
  const edited = source(); edited.posts[0].title = '本机修改'
  const conflict = github(remote)
  await assert.rejects(conflict.client.publish(edited, contentFingerprint(original), 'test-only-token'), PublishConflict)
  assert.ok(conflict.calls.every(call => call.method === 'GET'))
  const race = github(original, true)
  await assert.rejects(race.client.publish(edited, contentFingerprint(original), 'test-only-token'), PublishConflict)
  assert.equal(race.calls.at(-1)!.body.force, false)
})

test('invalid public articles are rejected before network access and repeated content is a no-op', async () => {
  const original = source()
  const invalid = source(); invalid.posts[0].title = ''
  const { client, calls } = github(original)
  await assert.rejects(client.publish(invalid, contentFingerprint(original), 'test-only-token'), /title/)
  assert.equal(calls.length, 0)
  const result = await client.publish(original, contentFingerprint(original), 'test-only-token')
  assert.equal(result.changed, false)
  assert.ok(calls.every(call => call.method === 'GET'))
})

test('deployment progress does not require exposing a write token', async () => {
  const { client, calls } = github(source())
  assert.equal((await client.deployment('new-commit'))?.conclusion, 'success')
  assert.equal(calls[0].auth, null)
})

test('short draft image references publish with their bytes; unused private images stay local', async () => {
  const document = source()
  const path = './images/uploads/' + 'a'.repeat(64) + '.png'
  const unused = './images/uploads/' + 'b'.repeat(64) + '.png'
  document.posts[0].body = `![文章图片](${path})`
  const prepared = await preparePublication(document, { [path]: png, [unused]: 'data:image/png;base64,cHJpdmF0ZQ==' })
  assert.equal(prepared.files.length, 3)
  assert.ok(!prepared.files.some(file => file.content === 'cHJpdmF0ZQ=='))
  assert.match(prepared.document.posts[0].body, /\.\/images\/uploads\/[a-f0-9]{64}\.png/)
  assert.ok(!prepared.document.posts[0].body.includes('data:'))
  assert.equal(document.posts[0].body, `![文章图片](${path})`)
})
