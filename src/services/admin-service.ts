import type { ContentDocument, EditorState } from '../types/admin'

const base = (import.meta.env.VITE_CONTENT_API_URL || '/api').replace(/\/+$/, '')
const sessionKey = 'orbit-admin-session'
export function readSession() { try { return sessionStorage.getItem(sessionKey) || '' } catch { return '' } }
export function storeSession(token: string) { try { token ? sessionStorage.setItem(sessionKey, token) : sessionStorage.removeItem(sessionKey) } catch { /* 内存会话仍可使用 */ } }
export class AdminError extends Error { constructor(message: string, public status: number, public details: string[] = []) { super(message) } }
export async function adminRequest<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 30000)
  try {
    const response = await fetch(`${base}/admin${path}`, { ...init, cache: 'no-store', signal: controller.signal, headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.body && typeof init.body === 'string' ? { 'Content-Type': 'application/json' } : {}), ...init.headers } })
    const data = await response.json()
    if (!response.ok) throw new AdminError(data.error?.message || `请求失败（${response.status}）`, response.status, data.error?.details)
    return data as T
  } catch (error) {
    if (error instanceof AdminError) throw error
    throw new Error('无法连接管理接口，请检查网络后重试。')
  } finally { clearTimeout(timer) }
}
export const loadEditor = (token: string) => adminRequest<EditorState>('/content', token)
export const saveEditor = (token: string, document: ContentDocument, revision: number, action: 'draft' | 'publish') => adminRequest<EditorState>('/content', token, { method: 'PUT', body: JSON.stringify({ document, revision, action }) })

export async function uploadImage(file: File, token: string) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw new Error('请选择 PNG、JPEG 或 WebP 图片。')
  if (file.size > 20 * 1024 * 1024) throw new Error('原图请控制在 20 MB 以内。')
  const image = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 1600 / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale))
    canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
    let blob: Blob | null = null
    for (const quality of [.85, .7, .5, .35]) {
      blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality))
      if (blob && blob.size <= 512 * 1024) break
    }
    if (!blob || blob.size > 512 * 1024) throw new Error('压缩后仍超过 512 KB，请裁剪图片后重试。')
    return (await adminRequest<{ url: string }>('/media', token, { method: 'POST', body: blob, headers: { 'Content-Type': blob.type } })).url
  } finally { image.close() }
}
