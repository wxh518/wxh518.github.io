import type { ContentService, HomepageContent, Post, PostSummary } from '../types/content'

type Fetch = typeof fetch
const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object'
const isSummary = (value: unknown): value is PostSummary => isRecord(value)
  && ['slug', 'title', 'description', 'publishedAt'].every(key => typeof value[key] === 'string')
  && typeof value.readingMinutes === 'number'
  && Array.isArray(value.tags) && value.tags.every(tag => typeof tag === 'string')

export function createHttpContentService(baseUrl: string, fetcher: Fetch = fetch): ContentService {
  const base = baseUrl.replace(/\/+$/, '')
  if (!base) throw new Error('未配置内容接口地址')

  async function request(path: string, signal?: AbortSignal): Promise<unknown> {
    const timeout = new AbortController()
    const abort = () => timeout.abort(signal?.reason)
    if (signal?.aborted) abort()
    else signal?.addEventListener('abort', abort, { once: true })
    const timer = setTimeout(() => timeout.abort(new DOMException('内容请求超时，请重试', 'TimeoutError')), 15000)
    try {
      const response = await fetcher(`${base}${path}`, { signal: timeout.signal, headers: { Accept: 'application/json' } })
      if (response.status === 404) return null
      if (!response.ok) throw new Error(`内容请求失败（HTTP ${response.status}）`)
      if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('接口未返回 JSON，请检查接口地址')
      return await response.json()
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
    }
  }

  return {
    async getHomepage(signal) {
      const data = await request('/homepage', signal)
      if (!isRecord(data) || data.schemaVersion !== 1 || !isRecord(data.profile)
        || typeof data.profile.name !== 'string' || !Array.isArray(data.sections)
        || !isRecord(data.projects) || !Array.isArray(data.skills) || !Array.isArray(data.books)
        || !isRecord(data.copy) || !isRecord(data.statistics)) throw new Error('主页数据不存在或版本不兼容')
      return data as unknown as HomepageContent
    },
    async getPosts(signal) {
      const data = await request('/posts', signal)
      if (!Array.isArray(data) || !data.every(isSummary)) throw new Error('文章列表格式不正确')
      return data
    },
    async getPost(slug, signal) {
      const data = await request(`/posts/${encodeURIComponent(slug)}`, signal)
      if (data === null) return null
      if (!isSummary(data) || !('body' in data) || typeof data.body !== 'string') throw new Error('文章内容格式不正确')
      return data as Post
    },
  }
}
