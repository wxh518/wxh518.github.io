import type { ContentService, HomepageContent, Post, PostSummary } from '../types/content'
import { homepageContent } from '../data/homepage'
import { posts } from '../data/posts'

export const localContentService: ContentService = {
  async getHomepage() { return homepageContent },
  async getPosts() { return posts.map(({ body: _body, ...summary }) => summary) },
  async getPost(slug) { return posts.find(post => post.slug === slug) ?? null },
}

// The API returns the same JSON structures as the local adapter (no envelope).
// Put authentication and endpoint-specific mapping here, never in UI components.
export function createHttpContentService(baseUrl: string): ContentService {
  const base = baseUrl.replace(/\/$/, '')
  async function request<T>(path: string, signal?: AbortSignal): Promise<T | null> {
    const response = await fetch(`${base}${path}`, { signal, headers: { Accept: 'application/json' } })
    if (response.status === 404) return null
    if (!response.ok) throw new Error(`内容请求失败（HTTP ${response.status}）`)
    return response.json() as Promise<T>
  }
  return {
    async getHomepage(signal) {
      const data = await request<HomepageContent>('/homepage', signal)
      if (!data || data.schemaVersion !== 1 || !data.profile || !Array.isArray(data.sections)) throw new Error('主页数据不存在或版本不兼容')
      return data
    },
    async getPosts(signal) {
      const data = await request<PostSummary[]>('/posts', signal)
      if (!Array.isArray(data)) throw new Error('文章列表格式不正确')
      return data
    },
    getPost(slug, signal) { return request<Post>(`/posts/${encodeURIComponent(slug)}`, signal) },
  }
}

export const contentService: ContentService = import.meta.env.VITE_CONTENT_SOURCE === 'http'
  ? createHttpContentService(import.meta.env.VITE_CONTENT_API_URL || '/api')
  : localContentService
