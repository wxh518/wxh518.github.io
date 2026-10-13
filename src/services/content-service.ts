import type { ContentService } from '../types/content'
import { createHttpContentService } from './http-content-service'

// Only offline mode imports configuration into the browser.
// The production HTTP build receives its content from the Worker.
export const contentService: ContentService = import.meta.env.VITE_CONTENT_SOURCE === 'local'
  ? {
    getHomepage: async () => (await import('./config-content-service')).configContentService.getHomepage(),
    getPosts: async () => (await import('./config-content-service')).configContentService.getPosts(),
    getPost: async slug => (await import('./config-content-service')).configContentService.getPost(slug),
  }
  : createHttpContentService(import.meta.env.VITE_CONTENT_API_URL || '/api')
