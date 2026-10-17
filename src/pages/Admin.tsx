import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { ArrowLeft, ArrowUpRight, BookOpen, Check, ChevronRight, Code2, Download, Eye, FileText, Globe, History, LayoutGrid, LockKeyhole, LogOut, Save, Settings2, ShieldCheck, Upload, UserRound } from 'lucide-react'
import homepageSchema from '../../content/schemas/homepage.schema.json'
import postsSchema from '../../content/schemas/posts.schema.json'
import { SchemaField, UploadContext, type Schema } from '../components/admin/SchemaField'
import { AdminError, adminRequest, loadEditor, readSession, saveEditor, storeSession } from '../services/admin-service'
import { validateContent } from '../lib/content-validation'
import type { ContentDocument, EditorState } from '../types/admin'
import type { HomepageContent } from '../types/content'
import './Admin.css'

const schema = homepageSchema as Schema
const postSchema = postsSchema as Schema
const localKey = 'orbit-editor-recovery-v1'
const previewKey = 'orbit-editor-preview-v1'
const tabs = [
  { id: 'profile', label: '个人资料', icon: UserRound, hint: '名字、头像、个人介绍与社交账号。先从这里开始。' },
  { id: 'projects', label: '项目作品', icon: Code2, hint: '管理开发、游戏、视频与音乐作品，顺序决定主页上的展示位置。' },
  { id: 'skills', label: '技能', icon: Settings2, hint: '记录擅长的技术。技能的关联标签与项目标签一致时，会自动关联。' },
  { id: 'sections', label: '模块与导航', icon: LayoutGrid, hint: '选择展示哪些模块，使用上移、下移调整页面顺序。' },
  { id: 'copy', label: '模块文案', icon: FileText, hint: '每个区域的标题与介绍都可以在这里修改。' },
  { id: 'statistics', label: '图表与足迹', icon: Globe, hint: '填写自己的时间分配和喜好。没有真实数据时，可以先关闭统计模块。' },
  { id: 'books', label: '书单', icon: BookOpen, hint: '整理阅读记录，分类会自动生成筛选项。' },
  { id: 'posts', label: '博客文章', icon: FileText, hint: '使用 Markdown 写文章，在下方即时预览。保存为草稿后不会公开。' },
  { id: 'settings', label: '备份与安全', icon: ShieldCheck, hint: '导入导出配置、恢复历史版本和修改后台密码。' },
] as const
type Tab = typeof tabs[number]['id']
const formatTime = (value: string | null) => value ? new Date(value).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false }) : '尚未保存'
const validation = (document: ContentDocument) => validateContent(document.homepage, { schemaVersion: 1, posts: document.posts })
function download(document: ContentDocument) {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ format: 'orbit-content-backup', version: 1, exportedAt: new Date().toISOString(), ...document }, null, 2)], { type: 'application/json' }))
  const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = `homepage-backup-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(url)
}

export default function Admin() {
  const [token, setToken] = useState(readSession)
  const [password, setPassword] = useState('')
  const [state, setState] = useState<EditorState | null>(null)
  const [document, setDocument] = useState<ContentDocument | null>(null)
  const [tab, setTab] = useState<Tab>('profile')
  const [busy, setBusy] = useState(false)
  const [uploads, setUploads] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [formKey, setFormKey] = useState(0)
  const [recovery, setRecovery] = useState<{ document: ContentDocument; revision: number; savedAt: string } | null>(null)
  const [history, setHistory] = useState<{ revision: number; createdAt: string }[]>([])
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [postPreview, setPostPreview] = useState(0)
  const [restoreVersion, setRestoreVersion] = useState<number | null>(null)
  const [reloadPending, setReloadPending] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const previewWindow = useRef<Window | null>(null)
  const currentTab = tabs.find(item => item.id === tab)!
  const dirty = useMemo(() => Boolean(document && state && JSON.stringify(document) !== JSON.stringify(state.document)), [document, state])
  const hasDraft = Boolean(state && (state.revision !== state.publishedRevision || dirty))
  useEffect(() => {
    if (dirty) setMessage(previous => previous.startsWith('发布成功') || previous.startsWith('草稿已保存') ? '' : previous)
  }, [dirty])

  function session(value: string) { storeSession(value); setToken(value) }
  function showError(cause: unknown) {
    setError((cause as Error).message)
    setMessage('')
    if (cause instanceof AdminError) {
      setErrors(cause.details)
      if (cause.status === 401) { session(''); setState(null) }
    }
  }
  function adopt(next: EditorState) { setState(next); setDocument(next.document); setFormKey(key => key + 1); setErrors([]) }
  async function reload() {
    setBusy(true); setError('')
    try { adopt(await loadEditor(token)); setReloadPending(false); setMessage('已载入服务器草稿。') } catch (cause) { showError(cause) } finally { setBusy(false) }
  }
  useEffect(() => { window.document.title = '内容工作台 · 个人主页' }, [])
  useEffect(() => {
    if (!token) return
    let active = true
    setBusy(true)
    loadEditor(token).then(next => {
      if (!active) return
      adopt(next)
      try {
        const saved = JSON.parse(localStorage.getItem(localKey) || 'null')
        if (saved?.document && Number.isSafeInteger(saved.revision) && JSON.stringify(saved.document) !== JSON.stringify(next.document)) setRecovery(saved)
      } catch { /* 损坏的本机缓存不影响服务器草稿。 */ }
    }).catch(cause => { if (active) showError(cause) }).finally(() => { if (active) setBusy(false) })
    return () => { active = false }
  }, [token])
  useEffect(() => {
    if (!document || !state || recovery) return
    const timer = setTimeout(() => {
      try { localStorage.setItem(localKey, JSON.stringify({ document, revision: state.revision, savedAt: new Date().toISOString() })) } catch { setMessage('本机恢复缓存不可用，请及时保存到云端。') }
    }, 600)
    return () => clearTimeout(timer)
  }, [document, state, recovery])
  useEffect(() => {
    if (!dirty) return
    const leave = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', leave)
    return () => window.removeEventListener('beforeunload', leave)
  }, [dirty])
  useEffect(() => {
    const timer = setTimeout(() => {
      if (previewWindow.current && !previewWindow.current.closed && document) previewWindow.current.postMessage({ type: 'orbit-preview', document }, window.location.origin)
    }, 350)
    return () => clearTimeout(timer)
  }, [document])
  async function save(action: 'draft' | 'publish') {
    if (!document || !state) return
    setError(''); setErrors([]); setMessage('')
    if (action === 'publish') {
      const issues = validation(document)
      if (issues.length) { setError('有些字段需要修正。可先保存草稿，完善后再发布。'); setErrors(issues); return }
    }
    setBusy(true)
    try {
      const next = await saveEditor(token, document, state.revision, action)
      adopt(next); setRecovery(null)
      setMessage(action === 'publish' ? '发布成功！主页内容已更新，浏览器缓存最多约 60 秒。' : '草稿已保存到云端，访客仍看到上次发布的内容。')
    } catch (cause) { showError(cause) } finally { setBusy(false) }
  }
  function updateHomepage(key: string, value: unknown) {
    setDocument(previous => previous ? { ...previous, homepage: { ...previous.homepage, [key]: value } as HomepageContent } : previous)
    setMessage('')
  }
  function preview() {
    if (!document) return
    const issues = validation(document)
    if (issues.length) { setError('请先修正配置，再预览主页。'); setErrors(issues); return }
    try { localStorage.setItem(previewKey, JSON.stringify(document)); previewWindow.current = window.open(`${window.location.href.split('#')[0]}#/preview`, 'orbit-content-preview') }
    catch { setError('浏览器禁止预览存储，请允许当前网站使用本地存储。') }
  }
  async function importFile(file: File) {
    if (file.size > 1_400_000) { setError('配置文件最多 1.4 MB。'); return }
    try {
      const input = JSON.parse(await file.text())
      if (!input.homepage || !Array.isArray(input.posts)) throw new Error('请选择从此工作台导出的完整备份文件。')
      const issues = validation(input)
      if (issues.length) { setErrors(issues); throw new Error('备份数据未通过校验，尚未导入。') }
      setDocument({ homepage: input.homepage, posts: input.posts }); setFormKey(key => key + 1); setError(''); setMessage('备份已载入编辑区。保存草稿或发布后才会更新云端。')
    } catch (cause) { showError(cause) }
  }
  async function loadHistory() {
    try { setHistory(await adminRequest('/history', token)); setMessage('已载入最近 20 次发布记录。') } catch (cause) { showError(cause) }
  }
  async function restore() {
    if (restoreVersion === null) return
    setBusy(true)
    try { setDocument(await adminRequest<ContentDocument>(`/history/${restoreVersion}`, token)); setFormKey(key => key + 1); setRestoreVersion(null); setMessage('历史内容已载入编辑区；点击发布后才会替换线上内容。') } catch (cause) { showError(cause) } finally { setBusy(false) }
  }
  async function changePassword(event: React.FormEvent) {
    event.preventDefault()
    if (dirty) { setError('请先保存当前草稿，再修改密码。'); return }
    if (newPassword !== confirmPassword) { setError('两次输入的新密码不一致。'); return }
    setBusy(true); setError('')
    try {
      const result = await adminRequest<{ token: string }>('/password', token, { method: 'PUT', body: JSON.stringify({ oldPassword, newPassword }) })
      session(result.token); setOldPassword(''); setNewPassword(''); setConfirmPassword(''); setMessage('密码已更新，其他设备的登录已失效。')
    } catch (cause) { showError(cause) } finally { setBusy(false) }
  }
  const notice = <>{message && <div className="admin-notice admin-success" role="status"><Check size={18} /><span>{message}</span></div>}{error && <div className="admin-notice admin-error" role="alert"><span>{error}</span></div>}{errors.length > 0 && <details className="admin-validation" open><summary>需要修正 {errors.length} 项</summary><ul>{errors.map((issue, index) => <li key={index}>{issue}</li>)}</ul></details>}</>

  if (!token) return <div className="admin-root admin-login"><Link className="admin-back" to="/"><ArrowLeft size={16} />返回主页</Link><div className="admin-login-card"><span className="admin-brand-icon"><Settings2 size={25} /></span><span className="admin-kicker">YOUR LITTLE UNIVERSE</span><h1>让主页，成为你的样子。</h1><p>登录内容工作台，填写资料、整理作品，记录新的想法。</p><form onSubmit={async event => {
    event.preventDefault(); setBusy(true); setError('')
    try { const result = await adminRequest<{ token: string }>('/login', '', { method: 'POST', body: JSON.stringify({ password }) }); session(result.token); setPassword('') } catch (cause) { showError(cause) } finally { setBusy(false) }
  }}><label htmlFor="admin-password">管理密码</label><div className="admin-password-input"><LockKeyhole size={18} /><input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required maxLength={256} placeholder="输入你的管理密码" /></div>{notice}<button className="admin-primary" disabled={busy || uploads > 0}>{busy ? '登录中…' : '进入工作台'}<ArrowUpRight size={17} /></button></form><small><ShieldCheck size={14} />仅站点管理员可修改，草稿不会公开。</small></div><span className="admin-login-foot">A SPACE TO MAKE IT YOURS · 内容工作台</span></div>

  return <div className="admin-root"><aside className="admin-sidebar"><Link to="/admin" className="admin-logo"><span className="admin-brand-icon"><Settings2 size={21} /></span><span>内容工作台<small>MY LITTLE UNIVERSE</small></span></Link><div className="admin-sidebar-label">管理我的主页</div><nav aria-label="配置分区">{tabs.map(item => { const Icon = item.icon; return <button key={item.id} disabled={busy || uploads > 0} aria-current={tab === item.id ? 'page' : undefined} className={tab === item.id ? 'active' : ''} onClick={() => { setTab(item.id); window.scrollTo({ top: 0, behavior: 'instant' }) }}><Icon size={18} /><span>{item.label}</span>{tab === item.id && <ChevronRight size={14} />}</button> })}</nav><div className="admin-sidebar-bottom"><a href="#/" target="_blank" rel="noreferrer"><Globe size={16} />查看线上主页<ArrowUpRight size={14} /></a><button disabled={busy || uploads > 0} onClick={async () => {
    if (dirty) { setError('还有未保存的修改，请先保存草稿或导出备份后退出。'); return }
    try { await adminRequest('/logout', token, { method: 'POST' }); session(''); setDocument(null); setState(null); setError('') } catch (cause) { showError(cause) }
  }}><LogOut size={16} />退出登录</button></div></aside><div className="admin-workspace"><header className="admin-toolbar"><div><span className={`admin-status-dot ${hasDraft ? 'pending' : ''}`} /><span>{dirty ? '有未保存的修改' : hasDraft ? '草稿已保存，尚未发布' : '已与线上同步'}</span></div><div className="admin-toolbar-actions"><button disabled={busy || uploads > 0 || !document} onClick={preview}><Eye size={16} />预览</button><button disabled={busy || uploads > 0 || !document} onClick={() => void save('draft')}><Save size={16} />保存草稿</button><button className="admin-primary" disabled={busy || uploads > 0 || !document} onClick={() => void save('publish')}><Upload size={16} />{busy ? '处理中…' : '发布到主页'}</button></div></header><main className="admin-main"><div className="admin-page-heading"><span className="admin-kicker">CONTENT STUDIO / {String(tabs.findIndex(item => item.id === tab) + 1).padStart(2, '0')}</span><h1>{currentTab.label}<span>✳</span></h1><p>{currentTab.hint}</p></div>{notice}{recovery && <div className="admin-recovery"><strong>发现此浏览器中尚未同步的内容</strong><p>本机记录：{formatTime(recovery.savedAt)}。恢复后请检查内容，再保存到云端。</p><div><button onClick={() => { setDocument(recovery.document); setRecovery(null); setFormKey(key => key + 1); setMessage('本机内容已恢复到编辑区。') }}>恢复本机内容</button><button onClick={() => setRecovery(null)}>使用服务器草稿</button></div></div>}{!document || !state ? <div className="admin-card admin-empty">{busy ? '正在载入你的内容…' : <button onClick={() => void reload()}>重新载入配置</button>}</div> : <><div className="admin-save-info"><span>云端草稿 {formatTime(state.updatedAt)}</span><span>上次发布 {formatTime(state.publishedAt)}</span></div><UploadContext.Provider value={delta => setUploads(count => Math.max(0, count + delta))}><fieldset className="admin-edit-region" disabled={busy || uploads > 0} key={formKey}>
    {tab !== 'settings' && tab !== 'posts' && <div className="admin-card">{tab === 'profile' && <SchemaField schema={schema.properties!.isDemo} root={schema} value={document.homepage.isDemo} name="isDemo" path="isDemo" token={token} required onChange={value => updateHomepage('isDemo', value)} />}<SchemaField schema={schema.properties![tab]} root={schema} value={document.homepage[tab as keyof HomepageContent]} name={tab} path={tab} token={token} required onChange={value => {
      if (tab === 'sections') {
        const next = value as HomepageContent['sections']; const enabled = new Set(next.filter(section => section.enabled).map(section => section.id))
        // 模块关闭时一并移除指向它的身份入口，避免产生失效的跳转。
        setDocument(previous => previous ? { ...previous, homepage: { ...previous.homepage, sections: next, profile: { ...previous.homepage.profile, roles: previous.homepage.profile.roles.filter(role => enabled.has(role.target)) } } } : previous)
      } else updateHomepage(tab, value)
    }} />{tab === 'sections' && <p className="admin-tip">关闭模块时，对应的首屏身份标签也会被移除；重新启用后可在“个人资料”中添加。</p>}</div>}
    {tab === 'posts' && <><div className="admin-card"><SchemaField schema={postSchema.properties!.posts} root={postSchema} value={document.posts} name="posts" path="posts" token={token} required onChange={value => setDocument(previous => previous ? { ...previous, posts: value as ContentDocument['posts'] } : previous)} /></div>{document.posts.length > 0 && <div className="admin-card admin-post-preview"><div className="admin-array-heading"><h2>文章预览</h2><select aria-label="选择预览文章" value={Math.min(postPreview, document.posts.length - 1)} onChange={event => setPostPreview(Number(event.target.value))}>{document.posts.map((post, index) => <option key={index} value={index}>{post.title || '未命名文章'}</option>)}</select></div><h2>{document.posts[Math.min(postPreview, document.posts.length - 1)].title}</h2><article className="markdown-body"><ReactMarkdown>{document.posts[Math.min(postPreview, document.posts.length - 1)].body}</ReactMarkdown></article></div>}</>}
    {tab === 'settings' && <><section className="admin-card"><h2>内容备份</h2><p>下载完整 JSON 备份，包含主页、文章和未公开草稿，请自行保管。上传的图片仍保存在云端，备份记录其链接。</p><div className="admin-button-row"><button onClick={() => download(document)}><Download size={16} />导出当前配置</button><button onClick={() => fileInput.current?.click()}><Upload size={16} />导入 JSON 备份</button><input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={event => { const file = event.target.files?.[0]; if (file) void importFile(file); event.target.value = '' }} /></div></section><section className="admin-card"><h2>发布历史</h2><p>保留最近 20 次发布。历史内容会先载入编辑区，检查后再发布。</p><button onClick={() => void loadHistory()}><History size={16} />载入历史版本</button>{history.length > 0 && <div className="admin-history">{history.map(item => <div key={item.revision}><span>版本 {item.revision}<small>{formatTime(item.createdAt)}</small></span><button onClick={() => setRestoreVersion(item.revision)}>载入此版本</button></div>)}</div>}{restoreVersion !== null && <div className="admin-confirm"><p>载入版本 {restoreVersion} 会替换当前编辑区。可先导出配置保留当前修改。</p><button onClick={() => void restore()}>载入到编辑区</button><button onClick={() => setRestoreVersion(null)}>取消</button></div>}</section><section className="admin-card"><h2>修改管理密码</h2><p>首次登录后建议设置自己的密码。密码更新后，其他设备需要重新登录。</p><form className="admin-password-form" onSubmit={event => void changePassword(event)}><label>当前密码<input type="password" autoComplete="current-password" required maxLength={256} value={oldPassword} onChange={event => setOldPassword(event.target.value)} /></label><label>新密码<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder="12～128 个字符" /></label><label>再次输入新密码<input type="password" autoComplete="new-password" required minLength={12} maxLength={128} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} /></label><button type="submit"><LockKeyhole size={16} />更新密码</button></form></section><section className="admin-card"><h2>重新载入云端草稿</h2><p>遇到多个标签页保存冲突时，先导出当前配置，再重新载入。</p><button onClick={() => setReloadPending(true)}>重新载入</button>{reloadPending && <div className="admin-confirm"><p>将替换当前编辑区中未保存的内容。</p><button onClick={() => void reload()}>载入云端草稿</button><button onClick={() => setReloadPending(false)}>取消</button></div>}</section></>}
    </fieldset></UploadContext.Provider><div className="admin-bottom-note"><ShieldCheck size={15} /><span>草稿仅自己可见。点击“发布到主页”后，访客才能看到更新。</span></div></>}</main></div></div>
}
