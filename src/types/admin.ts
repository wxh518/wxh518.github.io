import type { HomepageContent, Post } from './content'

/** 公开内容的完整快照。草稿仅通过管理接口读取，不会进入公开接口。 */
export interface ContentDocument { homepage: HomepageContent; posts: Post[] }
export interface EditorState {
  document: ContentDocument
  revision: number
  updatedAt: string | null
  publishedAt: string | null
  publishedRevision: number | null
}
