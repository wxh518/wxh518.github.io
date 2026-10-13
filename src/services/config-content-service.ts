import type { ContentService } from '../types/content'
import { homepageContent } from '../data/homepage'
import { posts } from '../data/posts'

// Shared by the Worker and the optional offline preview. Replace this adapter
// with a database implementation later without changing the HTTP routes.
export const configContentService: ContentService = {
  async getHomepage() { return homepageContent },
  async getPosts() { return posts.map(({ body: _body, ...summary }) => summary) },
  async getPost(slug) { return posts.find(post => post.slug === slug) ?? null },
}
