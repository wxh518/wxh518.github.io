import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { hashPassword } from '../worker/auth'

// 明文初始密码只写入本机 Git 忽略目录，不进入终端、前端代码或仓库。
await mkdir('.deployment-repo', { recursive: true })
const path = '.deployment-repo/admin-access.txt'
let password: string
try { password = (await readFile(path, 'utf8')).match(/初始密码：(.+)/)![1].trim() }
catch {
  password = randomBytes(24).toString('base64url')
  await writeFile(path, `管理入口：https://wxh518.github.io/#/admin\n初始密码：${password}\n\n请首次登录后在「备份与安全」中设置自己的密码。\n此文件仅保存在本机，未提交到 Git。修改密码后此处的初始密码会失效。\n`)
}
const hash = await hashPassword(password)
if (process.argv.includes('--remote')) {
  const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'secret', 'put', 'ADMIN_PASSWORD_HASH'], { input: hash, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
  process.stdout.write(result.stdout); process.stderr.write(result.stderr)
  if (result.status !== 0) process.exit(result.status || 1)
} else {
  await writeFile('.dev.vars', `# 本机开发用的管理密码摘要，明文见 .deployment-repo/admin-access.txt\nADMIN_PASSWORD_HASH=${JSON.stringify(hash)}\n`)
}
console.log(`管理入口及初始密码已保存到本机 ${path}（Git 已忽略）。`)
