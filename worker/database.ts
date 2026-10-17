import { configContentService, configContentSource, createConfigContentService } from '../src/services/config-content-service'
import type { ContentDocument, EditorState } from '../src/types/admin'

/** 只依赖所用的 D1 接口，测试可注入 SQLite 适配器。 */
export interface Database {
  prepare(sql: string): Statement
  batch<T = unknown>(statements: Statement[]): Promise<{ results: T[]; meta: { changes: number } }[]>
}
export interface Statement {
  bind(...values: unknown[]): Statement
  first<T = Record<string, unknown>>(): Promise<T | null>
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>
  run(): Promise<{ meta: { changes: number } }>
}
interface ContentRow { draft: string; published: string; revision: number; published_revision: number; updated_at: string; published_at: string }

export async function initialDocument(): Promise<ContentDocument> {
  return structuredClone({ homepage: configContentSource.homepage, posts: configContentSource.posts })
}

export async function initializeContent(db: Database) {
  if (await db.prepare('SELECT id FROM content_state WHERE id = 1').first()) return
  const document = JSON.stringify(await initialDocument())
  const now = new Date().toISOString()
  await db.batch([
    db.prepare('INSERT OR IGNORE INTO content_state (id, draft, published, updated_at, published_at) VALUES (1, ?, ?, ?, ?)').bind(document, document, now, now),
    db.prepare('INSERT OR IGNORE INTO content_history SELECT published_revision, published, published_at FROM content_state WHERE id = 1'),
  ])
}
export function editorState(row: ContentRow): EditorState {
  return { document: JSON.parse(row.draft), revision: row.revision, updatedAt: row.updated_at, publishedAt: row.published_at, publishedRevision: row.published_revision }
}
export async function getEditorState(db: Database): Promise<EditorState> {
  await initializeContent(db)
  return editorState((await db.prepare('SELECT * FROM content_state WHERE id = 1').first<ContentRow>())!)
}
export async function writeDocument(db: Database, document: ContentDocument, revision: number, publish: boolean): Promise<EditorState | null> {
  const json = JSON.stringify(document)
  const now = new Date().toISOString()
  // 比较并交换在一条 SQL 内完成，多个标签页同时保存时不会静默覆盖。
  const row = publish
    ? await db.prepare('UPDATE content_state SET draft = ?, published = ?, revision = revision + 1, published_revision = revision + 1, updated_at = ?, published_at = ? WHERE id = 1 AND revision = ? RETURNING *').bind(json, json, now, now, revision).first<ContentRow>()
    : await db.prepare('UPDATE content_state SET draft = ?, revision = revision + 1, updated_at = ? WHERE id = 1 AND revision = ? RETURNING *').bind(json, now, revision).first<ContentRow>()
  return row ? editorState(row) : null
}
export async function publishedContent(db?: Database) {
  if (!db) return configContentService
  const row = await db.prepare('SELECT published FROM content_state WHERE id = 1').first<{ published: string }>()
  if (!row) return configContentService
  const document: ContentDocument = JSON.parse(row.published)
  return createConfigContentService({ homepage: document.homepage, posts: document.posts })
}
