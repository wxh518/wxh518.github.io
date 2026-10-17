import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import type { Bindings } from './index'
import { createSession, digest, hashPassword, isAuthenticated, passwordHash, verifyPassword, allowLoginAttempt, randomToken } from './auth'
import { getEditorState, writeDocument } from './database'
import type { ContentDocument } from '../src/types/admin'
import { validateContent } from '../src/lib/content-validation'

export const admin = new Hono<{ Bindings: Bindings }>()
const error = (code: string, message: string) => ({ error: { code, message } })
admin.use('*', bodyLimit({ maxSize: 1_500_000, onError: c => c.json(error('TOO_LARGE', '内容过大，请缩小图片或减少文章内容。'), 413) }))
admin.use('*', async (c, next) => {
  if (!c.env?.DB || !c.env.ADMIN_PASSWORD_HASH) return c.json(error('NOT_CONFIGURED', '管理后台尚未完成数据库和登录配置。'), 503)
  const origin = c.req.header('Origin')
  if (origin && !c.env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).includes(origin)) return c.json(error('ORIGIN_DENIED', '此来源无权访问管理接口。'), 403)
  await next()
})
admin.post('/login', async c => {
  if (!await allowLoginAttempt(c.env.DB!, c.req.header('CF-Connecting-IP') || 'local')) {
    c.header('Retry-After', '900')
    return c.json(error('RATE_LIMITED', '尝试过于频繁，请 15 分钟后再试。'), 429)
  }
  const input = await c.req.json().catch(() => null)
  if (typeof input?.password !== 'string' || input.password.length > 256 || !await verifyPassword(input.password, await passwordHash(c.env.DB!, c.env.ADMIN_PASSWORD_HASH!))) return c.json(error('INVALID_PASSWORD', '密码不正确。'), 401)
  return c.json({ token: await createSession(c.env.DB!) })
})
admin.use('*', async (c, next) => {
  const token = c.req.header('Authorization')?.replace(/^Bearer /, '') ?? ''
  if (!await isAuthenticated(c.env.DB!, token)) return c.json(error('UNAUTHORIZED', '登录已过期，请重新登录。'), 401)
  await next()
})
admin.post('/logout', async c => {
  await c.env.DB!.prepare('DELETE FROM admin_sessions WHERE token_hash = ?').bind(await digest(c.req.header('Authorization')!.slice(7))).run()
  return c.json({ ok: true })
})
admin.get('/content', async c => c.json(await getEditorState(c.env.DB!)))
admin.put('/content', async c => {
  const input = await c.req.json().catch(() => null)
  if (!input || !Number.isSafeInteger(input.revision) || !['draft', 'publish'].includes(input.action) || !input.document?.homepage?.profile || !Array.isArray(input.document.posts)) return c.json(error('INVALID_REQUEST', '配置格式或版本不正确。'), 400)
  const document = input.document as ContentDocument
  const errors = validateContent(document.homepage, { schemaVersion: 1, posts: document.posts })
  if (input.action === 'publish' && errors.length) return c.json({ error: { code: 'VALIDATION_FAILED', message: '请修正字段后再发布。', details: errors } }, 422)
  const saved = await writeDocument(c.env.DB!, document, input.revision, input.action === 'publish')
  if (!saved) return c.json(error('CONFLICT', '其他标签页已更新配置。请先导出本地备份，再重新载入服务器草稿。'), 409)
  return c.json(saved)
})
admin.get('/history', async c => {
  const result = await c.env.DB!.prepare('SELECT revision, created_at AS createdAt FROM content_history ORDER BY revision DESC LIMIT 20').all()
  return c.json(result.results)
})
admin.get('/history/:revision', async c => {
  const row = await c.env.DB!.prepare('SELECT document FROM content_history WHERE revision = ?').bind(Number(c.req.param('revision'))).first<{ document: string }>()
  return row ? c.json(JSON.parse(row.document)) : c.json(error('NOT_FOUND', '没有找到此版本。'), 404)
})
admin.put('/password', async c => {
  const input = await c.req.json().catch(() => null)
  if (typeof input?.oldPassword !== 'string' || input.oldPassword.length > 256 || typeof input.newPassword !== 'string' || input.newPassword.length < 12 || input.newPassword.length > 128) return c.json(error('INVALID_PASSWORD', '新密码须为 12～128 个字符。'), 400)
  if (!await allowLoginAttempt(c.env.DB!, c.req.header('CF-Connecting-IP') || 'local')) return c.json(error('RATE_LIMITED', '尝试过于频繁，请 15 分钟后再试。'), 429)
  if (!await verifyPassword(input.oldPassword, await passwordHash(c.env.DB!, c.env.ADMIN_PASSWORD_HASH!))) return c.json(error('INVALID_PASSWORD', '当前密码不正确。'), 400)
  const hash = await hashPassword(input.newPassword)
  await c.env.DB!.batch([
    c.env.DB!.prepare('INSERT INTO admin_auth (id, password_hash) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET password_hash = excluded.password_hash').bind(hash),
    c.env.DB!.prepare('DELETE FROM admin_sessions'),
  ])
  return c.json({ token: await createSession(c.env.DB!) })
})
admin.post('/media', async c => {
  const mime = c.req.header('Content-Type') || ''
  if (!['image/webp', 'image/png', 'image/jpeg'].includes(mime)) return c.json(error('INVALID_IMAGE', '仅支持 WebP、PNG、JPEG 图片。'), 415)
  const data = await c.req.arrayBuffer()
  if (data.byteLength > 512 * 1024) return c.json(error('TOO_LARGE', '单张图片压缩后最多 512 KB。'), 413)
  const bytes = new Uint8Array(data)
  const valid = mime === 'image/png' ? [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => bytes[i] === v)
    : mime === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  if (!valid) return c.json(error('INVALID_IMAGE', '图片内容与文件类型不匹配。'), 415)
  const id = randomToken()
  await c.env.DB!.prepare('INSERT INTO media VALUES (?, ?, ?, ?)').bind(id, mime, data, new Date().toISOString()).run()
  const origin = new URL(c.req.url)
  return c.json({ url: `${origin.protocol === 'https:' ? origin.origin : ''}/api/media/${id}` }, 201)
})
