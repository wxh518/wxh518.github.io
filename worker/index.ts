import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { configContentService } from '../src/services/config-content-service'
import type { ContentService } from '../src/types/content'
import { publishedContent, type Database } from './database'
import { admin } from './admin'

export type Bindings = { ALLOWED_ORIGINS: string; DB?: Database; ADMIN_PASSWORD_HASH?: string }

export function createApp(content: ContentService = configContentService) {
  const app = new Hono<{ Bindings: Bindings }>()

  app.use('*', async (c, next) => {
    c.header('X-Content-Type-Options', 'nosniff')
    c.header('Cache-Control', 'no-store')
    await next()
  })
  app.use('/api/*', cors({
    origin: (origin, c) => {
      const configured: string = c.env?.ALLOWED_ORIGINS || ''
      const allowed = configured.split(',').map(value => value.trim())
      return allowed.includes(origin) ? origin : undefined
    },
    allowMethods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT'],
    allowHeaders: ['Accept', 'Authorization', 'Content-Type'],
    maxAge: 86400,
  }))
  app.route('/api/admin', admin)
  app.use('*', async (c, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
      c.header('Allow', 'GET, HEAD, OPTIONS')
      return c.json({ error: { code: 'METHOD_NOT_ALLOWED', message: 'This API is read-only.' } }, 405)
    }
    await next()
  })
  app.get('/', c => c.json({ name: 'Homepage content API', version: 1, endpoints: ['/api/health', '/api/homepage', '/api/posts', '/api/posts/:slug'] }))
  app.get('/api/health', c => c.json({ status: 'ok', schemaVersion: 1, source: c.env?.DB ? 'd1' : 'config' }))
  app.get('/api/media/:id', async c => {
    const id = c.req.param('id')
    if (!/^[a-f0-9]{64}$/.test(id) || !c.env?.DB) return c.notFound()
    const media = await c.env.DB.prepare('SELECT mime, data FROM media WHERE id = ?').bind(id).first<{ mime: string; data: ArrayBuffer | number[] }>()
    if (!media) return c.notFound()
    c.header('Content-Type', media.mime)
    c.header('Content-Security-Policy', "default-src 'none'; sandbox")
    c.header('Cache-Control', 'public, max-age=31536000, immutable')
    return c.body(new Uint8Array(media.data instanceof ArrayBuffer ? media.data : media.data))
  })
  app.get('/api/homepage', async c => {
    const service = content === configContentService ? await publishedContent(c.env?.DB) : content
    const data = await service.getHomepage(c.req.raw.signal)
    c.header('Cache-Control', 'public, max-age=60')
    return c.json(data)
  })
  app.get('/api/posts', async c => {
    const service = content === configContentService ? await publishedContent(c.env?.DB) : content
    const data = await service.getPosts(c.req.raw.signal)
    c.header('Cache-Control', 'public, max-age=60')
    return c.json(data)
  })
  app.get('/api/posts/:slug', async c => {
    const service = content === configContentService ? await publishedContent(c.env?.DB) : content
    const post = await service.getPost(c.req.param('slug'), c.req.raw.signal)
    if (!post) return c.json({ error: { code: 'POST_NOT_FOUND', message: 'Article not found.' } }, 404)
    c.header('Cache-Control', 'public, max-age=60')
    return c.json(post)
  })
  app.notFound(c => c.json({ error: { code: 'NOT_FOUND', message: 'Endpoint not found.' } }, 404))
  app.onError((error, c) => {
    console.error('Content API request failed:', error)
    c.header('Cache-Control', 'no-store')
    return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Content is temporarily unavailable.' } }, 500)
  })
  return app
}

export default createApp()
