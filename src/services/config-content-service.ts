import homepageFile from '../../content/homepage.json'
import postsFile from '../../content/posts.json'
import type { ContentService, HomepageContent, Post, PostSummary } from '../types/content'

/** 数据来源边界：未来数据库适配器实现同一个 ContentService 即可。 */
export interface ConfigContentSource {
  homepage: HomepageContent
  posts: Post[]
}

/** 创建只读配置适配器，也允许测试注入独立的数据源。 */
export function createConfigContentService(source: ConfigContentSource): ContentService {
  // 保留独立快照，调用方修改输入或查询结果都不会污染下一次请求。
  const homepage = structuredClone(source.homepage)
  const posts = structuredClone(source.posts).filter(post => post.status !== 'draft')
  const postsBySlug = new Map(posts.map(post => [post.slug, post]))
  // 明确列出公开摘要字段，避免以后新增正文或存储专用字段时意外泄露。
  const summaries: PostSummary[] = posts.map(post => ({
    slug: post.slug,
    title: post.title,
    description: post.description,
    publishedAt: post.publishedAt,
    tags: post.tags,
    readingMinutes: post.readingMinutes,
  }))

  return {
    async getHomepage() { return structuredClone(homepage) },
    async getPosts() { return structuredClone(summaries) },
    async getPost(slug) { return structuredClone(postsBySlug.get(slug) ?? null) },
  }
}

// JSON Schema 在开发、构建和部署前校验；编辑器元数据不属于 HTTP 数据契约。
// Workers 没有本机文件路径：这里的 JSON 导入会由 Wrangler 打包进 Worker。
const { $schema: _schema, ...homepage } = homepageFile
export const configContentSource: ConfigContentSource = {
  homepage: homepage as HomepageContent,
  posts: postsFile.posts as Post[],
}
export const configContentService = createConfigContentService(configContentSource)
