import type { ContentService } from '../types/content'
import { createHttpContentService } from './http-content-service'

// 默认读取随站点发布的 JSON，公开页面不依赖 Worker 的网络可达性。
// 保留 HTTP 适配器，后续只需显式配置 http 即可恢复接口数据源。
export const contentService: ContentService = import.meta.env.VITE_CONTENT_SOURCE === 'http'
  ? createHttpContentService(import.meta.env.VITE_CONTENT_API_URL || '/api')
  : {
    getHomepage: async () => (await import('./config-content-service')).configContentService.getHomepage(),
    getPosts: async () => (await import('./config-content-service')).configContentService.getPosts(),
    getPost: async slug => (await import('./config-content-service')).configContentService.getPost(slug),
  }
