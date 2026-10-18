import type { ContentDocument } from '../types/admin'
import type { HomepageContent, Post } from '../types/content'
import { validateContent } from '../lib/content-validation'

export const repository = { owner: 'wxh518', name: 'wxh518.github.io', branch: 'master' } as const
export const repositoryUrl = `https://github.com/${repository.owner}/${repository.name}`
const api = `https://api.github.com/repos/${repository.owner}/${repository.name}`
export const tokenSetupUrl = 'https://github.com/settings/personal-access-tokens/new?name=Homepage+Studio&target_name=wxh518&expires_in=90&contents=write'

export class PublishConflict extends Error {
  constructor() { super('仓库内容已被其他页面或设备更新。请先导出当前草稿，再从线上重新载入并合并修改，避免覆盖新内容。') }
}
export interface PublishFile { path: string; content: string; encoding: 'utf-8' | 'base64' }
export interface PreparedPublication { document: ContentDocument; files: PublishFile[] }
export interface RepositorySnapshot { document: ContentDocument; head: string; tree: string }

/** 草稿绝不写入公开仓库，包括草稿正文中的图片。 */
export function publicDocument(document: ContentDocument): ContentDocument {
  return { homepage: structuredClone(document.homepage), posts: structuredClone(document.posts.filter(post => post.status !== 'draft')) }
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`
  return JSON.stringify(value)
}
/** 仅比较内容，不因仓库里其他代码提交而阻塞发布。 */
export function contentFingerprint(document: ContentDocument) { return canonical(publicDocument(document)) }

export async function preparePublication(input: ContentDocument, pendingImages: Record<string, string> = {}): Promise<PreparedPublication> {
  const document = publicDocument(input)
  let serialized = JSON.stringify(document)
  for (const [path, image] of Object.entries(pendingImages)) {
    if (!/^\.\/images\/uploads\/[a-f0-9]{64}\.(?:png|jpg|webp)$/.test(path) || !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(image)) throw new Error('草稿中的图片记录不完整，请重新选择图片。')
    serialized = serialized.replaceAll(path, image)
  }
  const images = [...new Set(serialized.match(/data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}/g) || [])]
  if (images.length > 100) throw new Error('单次发布最多包含 100 张新图片，请分批发布。')
  const files: PublishFile[] = []
  for (const image of images) {
    const [header, content] = image.split(',')
    const bytes = Uint8Array.from(atob(content), char => char.charCodeAt(0))
    if (bytes.length > 512 * 1024) throw new Error('图片超过 512 KB，请通过图片按钮重新选择并压缩。')
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(byte => byte.toString(16).padStart(2, '0')).join('')
    const extension = header.includes('jpeg') ? 'jpg' : header.includes('png') ? 'png' : 'webp'
    const path = `images/uploads/${hash}.${extension}`
    files.push({ path: `public/${path}`, content, encoding: 'base64' })
    serialized = serialized.replaceAll(image, `./${path}`)
  }
  if (serialized.includes('data:image/') || serialized.includes('workers.dev/api/media/')) throw new Error('配置中存在未处理的图片，请使用后台图片按钮重新选择图片。')
  const output = JSON.parse(serialized) as ContentDocument
  const errors = validateContent(output.homepage, { schemaVersion: 1, posts: output.posts })
  if (errors.length) throw new Error(errors.join('\n'))
  files.push(
    { path: 'content/homepage.json', content: JSON.stringify({ $schema: './schemas/homepage.schema.json', ...output.homepage }, null, 2) + '\n', encoding: 'utf-8' },
    { path: 'content/posts.json', content: JSON.stringify({ $schema: './schemas/posts.schema.json', schemaVersion: 1, posts: output.posts }, null, 2) + '\n', encoding: 'utf-8' },
  )
  if (files.reduce((size, file) => size + file.content.length, 0) > 25 * 1024 * 1024) throw new Error('单次发布内容过大，请减少新图片后重试。')
  return { document: output, files }
}

export function createGitHubPublisher(fetcher: typeof fetch = fetch) {
  async function request<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 30000)
    try {
      const response = await fetcher(`${api}${path}`, { ...init, signal: controller.signal, cache: 'no-store', headers: {
        Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10', ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      } })
      if (!response.ok) {
        if (response.status === 401) throw new Error('GitHub 授权无效或已过期，请重新连接。')
        if (response.status === 403 || response.status === 404) throw new Error('GitHub 拒绝访问，请检查授权是否选择了本站仓库及 Contents 读写权限；也可能暂时触发访问限额。')
        if (response.status === 409 || response.status === 422) throw new PublishConflict()
        throw new Error(`GitHub 请求失败（${response.status}），请稍后重试。`)
      }
      return await response.json() as T
    } catch (error) {
      if (error instanceof TypeError || (error instanceof Error && error.name === 'AbortError')) throw new Error('暂时无法连接 GitHub，请检查网络后重试；本机草稿仍保留。')
      throw error
    } finally { clearTimeout(timer) }
  }
  const post = <T,>(path: string, token: string, body: unknown) => request<T>(path, token, { method: 'POST', body: JSON.stringify(body) })
  async function readJson(path: string, head: string, token: string) {
    const file = await request<{ encoding: string; content: string }>(`/contents/${path}?ref=${head}`, token)
    if (file.encoding !== 'base64') throw new Error('仓库配置文件格式不受支持。')
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(file.content.replace(/\s/g, '')), char => char.charCodeAt(0))))
  }
  async function load(token = ''): Promise<RepositorySnapshot> {
    const ref = await request<{ object: { sha: string } }>(`/git/ref/heads/${repository.branch}`, token)
    const [commit, homepageFile, postsFile] = await Promise.all([
      request<{ tree: { sha: string } }>(`/git/commits/${ref.object.sha}`, token),
      readJson('content/homepage.json', ref.object.sha, token), readJson('content/posts.json', ref.object.sha, token),
    ])
    const { $schema: _schema, ...homepage } = homepageFile
    const document = { homepage: homepage as HomepageContent, posts: postsFile.posts as Post[] }
    const issues = validateContent(homepage, postsFile)
    if (issues.length) throw new Error('仓库中的配置未通过校验，请检查最近的发布记录。')
    return { document: publicDocument(document), head: ref.object.sha, tree: commit.tree.sha }
  }
  return {
    load,
    async connect(token: string) {
      if (!token.trim()) throw new Error('请先填写 GitHub 授权令牌。')
      await request('', token)
    },
    async publish(input: ContentDocument, expected: string, token: string, onProgress: (message: string) => void = () => {}, pendingImages: Record<string, string> = {}) {
      if (!token) throw new Error('请先在“发布设置”连接 GitHub。')
      const prepared = await preparePublication(input, pendingImages)
      onProgress('正在检查仓库最新内容…')
      const current = await load(token)
      if (contentFingerprint(current.document) === contentFingerprint(prepared.document)) return { sha: current.head, document: prepared.document, changed: false }
      if (contentFingerprint(current.document) !== expected) throw new PublishConflict()
      const entries: { path: string; mode: '100644'; type: 'blob'; sha: string }[] = []
      for (const [index, file] of prepared.files.entries()) {
        onProgress(`正在提交文章与图片 ${index + 1}/${prepared.files.length}…`)
        // 写入路径只来自内部生成的白名单，用户无法修改站点代码或工作流。
        const blob = await post<{ sha: string }>('/git/blobs', token, { content: file.content, encoding: file.encoding })
        entries.push({ path: file.path, mode: '100644', type: 'blob', sha: blob.sha })
      }
      const tree = await post<{ sha: string }>('/git/trees', token, { base_tree: current.tree, tree: entries })
      const commit = await post<{ sha: string }>('/git/commits', token, { message: 'Publish content from homepage studio', tree: tree.sha, parents: [current.head] })
      onProgress('正在触发网站发布…')
      // 非强制更新：并发提交发生时拒绝覆盖，不会重写历史。
      await request(`/git/refs/heads/${repository.branch}`, token, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }) })
      return { sha: commit.sha, document: prepared.document, changed: true }
    },
    async deployment(sha: string) {
      // 公开仓库的发布进度无需额外授予 Actions 权限。
      const result = await request<{ workflow_runs: { status: string; conclusion: string | null; html_url: string }[] }>(`/actions/workflows/deploy-pages.yml/runs?head_sha=${encodeURIComponent(sha)}&per_page=1`, '')
      return result.workflow_runs[0] ?? null
    },
  }
}
export const githubPublisher = createGitHubPublisher()
