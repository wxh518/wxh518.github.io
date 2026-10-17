import type { Database } from './database'

const encode = new TextEncoder()
const hex = (bytes: ArrayBuffer | Uint8Array) => [...new Uint8Array(bytes)].map(n => n.toString(16).padStart(2, '0')).join('')
const unhex = (value: string) => new Uint8Array(value.match(/.{2}/g)!.map(n => parseInt(n, 16)))
export const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)))
export const digest = async (value: string) => hex(await crypto.subtle.digest('SHA-256', encode.encode(value)))

export async function hashPassword(password: string, salt = hex(crypto.getRandomValues(new Uint8Array(16)))) {
  const key = await crypto.subtle.importKey('raw', encode.encode(password), 'PBKDF2', false, ['deriveBits'])
  const derived = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', iterations: 100000, salt: encode.encode(salt) }, key, 256)
  return `pbkdf2:100000:${salt}:${hex(derived)}`
}
export async function verifyPassword(password: string, stored: string) {
  const parts = stored.split(':')
  if (parts.length !== 4 || parts[0] !== 'pbkdf2' || parts[1] !== '100000' || !/^[a-f0-9]{32}$/.test(parts[2]) || !/^[a-f0-9]{64}$/.test(parts[3])) return false
  const actual = unhex((await hashPassword(password, parts[2])).split(':')[3])
  const expected = unhex(parts[3])
  let difference = 0
  for (let i = 0; i < actual.length; i++) difference |= actual[i] ^ expected[i]
  return difference === 0
}
export async function passwordHash(db: Database, bootstrap: string) {
  return (await db.prepare('SELECT password_hash FROM admin_auth WHERE id = 1').first<{ password_hash: string }>())?.password_hash ?? bootstrap
}
export async function createSession(db: Database) {
  const token = randomToken()
  const now = Date.now()
  await db.batch([
    db.prepare('DELETE FROM admin_sessions WHERE expires_at <= ?').bind(now),
    db.prepare('INSERT INTO admin_sessions (token_hash, expires_at) VALUES (?, ?)').bind(await digest(token), now + 8 * 60 * 60 * 1000),
  ])
  return token
}
export async function isAuthenticated(db: Database, token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return false
  const session = await db.prepare('SELECT expires_at FROM admin_sessions WHERE token_hash = ?').bind(await digest(token)).first<{ expires_at: number }>()
  return Boolean(session && session.expires_at > Date.now())
}
export async function allowLoginAttempt(db: Database, ip: string) {
  const now = Date.now()
  const row = await db.prepare(`INSERT INTO login_attempts (ip_hash, attempts, window_start) VALUES (?, 1, ?)
    ON CONFLICT (ip_hash) DO UPDATE SET attempts = CASE WHEN window_start < ? THEN 1 ELSE attempts + 1 END,
    window_start = CASE WHEN window_start < ? THEN excluded.window_start ELSE window_start END RETURNING attempts`)
    .bind(await digest(ip), now, now - 900000, now - 900000).first<{ attempts: number }>()
  // 顺便清理过期记录，避免长期累积访问者 IP 摘要。
  await db.prepare('DELETE FROM login_attempts WHERE window_start < ?').bind(now - 900000).run()
  return (row?.attempts ?? 99) <= 5
}
