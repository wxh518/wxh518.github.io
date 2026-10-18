import type { ContentDocument } from '../types/admin'

export interface StudioDraft { document: ContentDocument; baseline: string; savedAt: string; commit?: string; images?: Record<string, string> }
let database: Promise<IDBDatabase> | undefined
function openDatabase() {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('orbit-static-studio', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('drafts')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => { database = undefined; reject(new Error('无法打开浏览器草稿存储，请允许本站保存数据。')) }
  })
  return database
}
export async function readStudioDraft(): Promise<StudioDraft | undefined> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const request = db.transaction('drafts', 'readonly').objectStore('drafts').get('current')
    request.onsuccess = () => resolve(request.result as StudioDraft | undefined)
    request.onerror = () => reject(new Error('读取本机草稿失败。'))
  })
}
export async function writeStudioDraft(draft: StudioDraft) {
  const db = await openDatabase()
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('drafts', 'readwrite')
    transaction.objectStore('drafts').put(draft, 'current')
    transaction.oncomplete = () => resolve()
    transaction.onerror = transaction.onabort = () => reject(new Error('本机草稿保存失败，浏览器空间可能不足。请先导出备份。'))
  })
}
export function imageDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('读取图片失败。'))
    reader.readAsDataURL(blob)
  })
}
export async function stageImage(blob: Blob) {
  const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))].map(byte => byte.toString(16).padStart(2, '0')).join('')
  const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/jpeg' ? 'jpg' : 'webp'
  return { path: `./images/uploads/${hash}.${extension}`, data: await imageDataUrl(blob) }
}
export function documentWithImages(document: ContentDocument, images: Record<string, string>): ContentDocument {
  let serialized = JSON.stringify(document)
  for (const [path, data] of Object.entries(images)) serialized = serialized.replaceAll(path, data)
  return JSON.parse(serialized)
}
