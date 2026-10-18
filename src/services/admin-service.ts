import type { ContentDocument, EditorState } from '../types/admin'
import { compressImage } from '../lib/compress-image'

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
  const blob = await compressImage(file)
  return (await adminRequest<{ url: string }>('/media', token, { method: 'POST', body: blob, headers: { 'Content-Type': blob.type } })).url
}
