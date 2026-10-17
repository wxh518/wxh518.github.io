import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { DatabaseSync, type SQLInputValue } from 'node:sqlite'
import { createApp } from '../worker/index'
import type { Database, Statement } from '../worker/database'
import { hashPassword } from '../worker/auth'
import type { ContentDocument, EditorState } from '../src/types/admin'

// 真实 SQLite 运行迁移、原子更新和触发器，不用会掩盖 SQL 错误的内存假数据。
class TestDatabase implements Database {
  sqlite = new DatabaseSync(':memory:')
  constructor() { this.sqlite.exec(readFileSync('migrations/0001_content_editor.sql', 'utf8')) }
  prepare(sql: string): Statement {
    const query = this.sqlite.prepare(sql)
    let bindings: SQLInputValue[] = []
    return {
      bind(...values) { bindings = values.map(value => value instanceof ArrayBuffer ? new Uint8Array(value) : value) as SQLInputValue[]; return this },
      async first<T>() { return (query.get(...bindings) ?? null) as T | null },
      async all<T>() { return { results: query.all(...bindings) as T[] } },
      async run() { return { meta: { changes: Number(query.run(...bindings).changes) } } },
    }
  }
  async batch<T>(statements: Statement[]) {
    this.sqlite.exec('BEGIN')
    try {
      const results = []
      for (const statement of statements) { const result = await statement.run(); results.push({ results: [] as T[], meta: result.meta }) }
      this.sqlite.exec('COMMIT'); return results
    } catch (error) { this.sqlite.exec('ROLLBACK'); throw error }
  }
}
const password = 'a-long-test-only-password'
const origin = 'https://wxh518.github.io'
async function fixture() {
  const db = new TestDatabase()
  const app = createApp()
  const env = { DB: db, ADMIN_PASSWORD_HASH: await hashPassword(password), ALLOWED_ORIGINS: origin }
  const request = (path: string, init: RequestInit = {}, token = '') => app.request(`https://api.example.test/api${path}`, { ...init, headers: { Origin: origin, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } }, env)
  const login = async () => (await (await request('/admin/login', { method: 'POST', body: JSON.stringify({ password }) })).json() as { token: string }).token
  const write = (document: ContentDocument, revision: number, action: string, token: string) => request('/admin/content', { method: 'PUT', body: JSON.stringify({ document, revision, action }) }, token)
  return { db, request, login, write }
}

test('private content requires authentication, origins and preflights are checked', async () => {
  const { request } = await fixture()
  assert.equal((await request('/admin/content')).status, 401)
  assert.equal((await request('/admin/login', { method: 'POST', headers: { Origin: 'https://evil.example' }, body: JSON.stringify({ password }) })).status, 403)
  const preflight = await request('/admin/content', { method: 'OPTIONS', headers: { 'Access-Control-Request-Method': 'PUT', 'Access-Control-Request-Headers': 'authorization,content-type' } })
  assert.equal(preflight.status, 204)
  assert.match(preflight.headers.get('access-control-allow-headers') || '', /Authorization/)
})
test('cloud drafts stay private, publication updates every public content route and persists', async () => {
  const { request, login, write } = await fixture()
  const token = await login()
  const state = await (await request('/admin/content', {}, token)).json() as EditorState
  const document = structuredClone(state.document)
  document.homepage.profile.name = '真实姓名'
  document.posts = [{ ...document.posts[0], slug: 'new-article', title: '我的新文章', body: '# 私人草稿正文' }]
  const draft = await write(document, state.revision, 'draft', token)
  assert.equal(draft.status, 200)
  const saved = await draft.json() as EditorState
  assert.notEqual((await (await request('/homepage')).json() as ContentDocument['homepage']).profile.name, '真实姓名')
  assert.equal((await request('/posts/new-article')).status, 404)
  assert.equal((await write(document, saved.revision, 'publish', token)).status, 200)
  assert.equal((await (await request('/homepage')).json() as ContentDocument['homepage']).profile.name, '真实姓名')
  const posts = await (await request('/posts')).json() as Record<string, unknown>[]
  assert.equal(posts[0].title, '我的新文章'); assert.equal(posts[0].body, undefined)
  assert.equal((await (await request('/posts/new-article')).json() as { body: string }).body, '# 私人草稿正文')
  assert.equal((await request('/admin/content', {}, token)).headers.get('cache-control'), 'no-store')
  const secondToken = await login()
  assert.deepEqual((await (await request('/admin/content', {}, secondToken)).json() as EditorState).document, document)
})
test('invalid drafts can be saved, publishing invalid charts is rejected and concurrent editors get 409', async () => {
  const { request, login, write } = await fixture()
  const token = await login()
  const state = await (await request('/admin/content', {}, token)).json() as EditorState
  const invalid = structuredClone(state.document); invalid.homepage.statistics.time[0].values[0] = 99
  assert.equal((await write(invalid, state.revision, 'publish', token)).status, 422)
  const result = await write(invalid, state.revision, 'draft', token)
  assert.equal(result.status, 200)
  assert.equal((await write(state.document, state.revision, 'draft', token)).status, 409)
  assert.deepEqual((await (await request('/homepage')).json()), state.document.homepage)
})
test('per-article drafts remain private even when the complete document is published', async () => {
  const { request, login, write } = await fixture()
  const token = await login()
  const state = await (await request('/admin/content', {}, token)).json() as EditorState
  const document = structuredClone(state.document)
  document.posts[0].status = 'draft'
  const slug = document.posts[0].slug
  assert.equal((await write(document, state.revision, 'publish', token)).status, 200)
  assert.equal((await request(`/posts/${slug}`)).status, 404)
  assert.ok(!(await (await request('/posts')).json() as { slug: string }[]).some(post => post.slug === slug))
  assert.equal((await (await request('/admin/content', {}, token)).json() as EditorState).document.posts[0].body, document.posts[0].body)
})
test('history can restore prior content, keeps at most twenty releases and never exposes drafts', async () => {
  const { request, login, write } = await fixture()
  const token = await login()
  let state = await (await request('/admin/content', {}, token)).json() as EditorState
  const original = state.document
  for (let i = 0; i < 21; i++) {
    const next = structuredClone(original); next.homepage.profile.name = `Version ${i}`
    state = await (await write(next, state.revision, 'publish', token)).json() as EditorState
  }
  const history = await (await request('/admin/history', {}, token)).json() as { revision: number }[]
  assert.equal(history.length, 20)
  const old = await (await request(`/admin/history/${history[history.length - 1].revision}`, {}, token)).json() as ContentDocument
  assert.equal((await write(old, state.revision, 'publish', token)).status, 200)
  assert.equal((await (await request('/homepage')).json() as ContentDocument['homepage']).profile.name, old.homepage.profile.name)
  assert.equal((await request('/admin/history')).status, 401)
})
test('logout and password rotation revoke sessions, new password works and old password fails', async () => {
  const { request, login } = await fixture()
  const token = await login()
  const other = await login()
  const response = await request('/admin/password', { method: 'PUT', body: JSON.stringify({ oldPassword: password, newPassword: 'my-updated-long-password' }) }, token)
  assert.equal(response.status, 200)
  const nextToken = (await response.json() as { token: string }).token
  assert.equal((await request('/admin/content', {}, other)).status, 401)
  assert.equal((await request('/admin/content', {}, token)).status, 401)
  assert.equal((await request('/admin/content', {}, nextToken)).status, 200)
  assert.equal((await request('/admin/login', { method: 'POST', body: JSON.stringify({ password }) })).status, 401)
  assert.equal((await request('/admin/login', { method: 'POST', body: JSON.stringify({ password: 'my-updated-long-password' }) })).status, 200)
  await request('/admin/logout', { method: 'POST' }, nextToken)
  assert.equal((await request('/admin/content', {}, nextToken)).status, 401)
})
test('failed logins are rate limited and expired sessions do not authenticate', async () => {
  const { request, login, db } = await fixture()
  const token = await login()
  db.sqlite.exec('UPDATE admin_sessions SET expires_at = 0')
  assert.equal((await request('/admin/content', {}, token)).status, 401)
  for (let i = 0; i < 4; i++) assert.equal((await request('/admin/login', { method: 'POST', body: JSON.stringify({ password: 'wrong' }) })).status, 401)
  const blocked = await request('/admin/login', { method: 'POST', body: JSON.stringify({ password }) })
  assert.equal(blocked.status, 429); assert.equal(blocked.headers.get('retry-after'), '900')
})
test('only authenticated raster uploads are accepted and published media is immutable', async () => {
  const { request, login } = await fixture()
  const token = await login()
  const image = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0])
  assert.equal((await request('/admin/media', { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: image })).status, 401)
  assert.equal((await request('/admin/media', { method: 'POST', headers: { 'Content-Type': 'image/svg+xml' }, body: '<svg/>' }, token)).status, 415)
  assert.equal((await request('/admin/media', { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: 'fake-image' }, token)).status, 415)
  const result = await request('/admin/media', { method: 'POST', headers: { 'Content-Type': 'image/png' }, body: image }, token)
  assert.equal(result.status, 201)
  const { url } = await result.json() as { url: string }
  const media = await request(new URL(url).pathname.replace('/api', ''))
  assert.equal(media.status, 200); assert.equal(media.headers.get('content-type'), 'image/png')
  assert.match(media.headers.get('cache-control') || '', /immutable/)
  assert.deepEqual(new Uint8Array(await media.arrayBuffer()), image)
})
