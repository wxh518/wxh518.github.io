import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import ReactMarkdown, { defaultUrlTransform } from 'react-markdown'
import { ArrowUpRight, BookOpen, Check, Code2, Download, Eye, FileText, Globe, ImagePlus, LayoutGrid, Link2, Plus, Save, Settings2, ShieldCheck, Trash2, Upload, UserRound } from 'lucide-react'
import homepageSchema from '../../content/schemas/homepage.schema.json'
import { configContentSource } from '../services/config-content-service'
import { ImagePreviewContext, ImageUploadContext, SchemaField, UploadContext, type Schema } from '../components/admin/SchemaField'
import { contentFingerprint, githubPublisher, repositoryUrl, tokenSetupUrl } from '../services/github-content'
import { documentWithImages, readStudioDraft, stageImage, writeStudioDraft } from '../services/studio-draft'
import { compressImage } from '../lib/compress-image'
import { validateContent, validateDraftHomepage } from '../lib/content-validation'
import { preparePublication } from '../services/github-content'
import type { ContentDocument } from '../types/admin'
import type { HomepageContent, Post } from '../types/content'
import './Admin.css'
import './StaticAdmin.css'

const schema = homepageSchema as Schema
const tokenKey = 'orbit-github-studio-token'
const tabs = [
  { id: 'posts', label: '博客写作', icon: FileText },
  { id: 'profile', label: '个人资料', icon: UserRound },
  { id: 'projects', label: '项目作品', icon: Code2 },
  { id: 'skills', label: '技能', icon: Settings2 },
  { id: 'sections', label: '模块与导航', icon: LayoutGrid },
  { id: 'copy', label: '模块文案', icon: FileText },
  { id: 'statistics', label: '图表与足迹', icon: Globe },
  { id: 'books', label: '书单', icon: BookOpen },
  { id: 'settings', label: '发布与备份', icon: ShieldCheck },
] as const
type Tab = typeof tabs[number]['id']
const seed = (): ContentDocument => structuredClone(configContentSource)
const localDate = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' })
const previewUrl = (url: string) => /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(url) ? url : defaultUrlTransform(url)
function backup(document: ContentDocument, baseline: string, images: Record<string, string>) {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ format: 'orbit-static-studio', version: 1, document, baseline, images }, null, 2)], { type: 'application/json' }))
  const anchor = window.document.createElement('a'); anchor.href = url; anchor.download = `blog-backup-${localDate()}.json`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function StaticAdmin() {
  const [document, setDocument] = useState<ContentDocument>(seed)
  const [baseline, setBaseline] = useState(() => contentFingerprint(seed()))
  const [images, setImages] = useState<Record<string, string>>({})
  const [ready, setReady] = useState(false)
  const [tab, setTab] = useState<Tab>('posts')
  const [selected, setSelected] = useState(0)
  const [token, setToken] = useState(() => { try { return sessionStorage.getItem(tokenKey) || '' } catch { return '' } })
  const [tokenInput, setTokenInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploads, setUploads] = useState(0)
  const [saved, setSaved] = useState('正在读取本机草稿…')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [progress, setProgress] = useState('')
  const [commit, setCommit] = useState('')
  const [deployment, setDeployment] = useState('')
  const [reloadConfirm, setReloadConfirm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [formKey, setFormKey] = useState(0)
  const [editorMode, setEditorMode] = useState<'split' | 'write' | 'preview'>('split')
  const bodyInput = useRef<HTMLTextAreaElement>(null)
  const imageInput = useRef<HTMLInputElement>(null)
  const importInput = useRef<HTMLInputElement>(null)
  const previewWindow = useRef<Window | null>(null)
  const saving = useRef(false)
  const editSequence = useRef(0)
  const postIndex = Math.min(selected, Math.max(0, document.posts.length - 1))
  const post = document.posts[postIndex]
  const blocked = busy || uploads > 0 || !ready
  const reportError = (cause: unknown) => { setError(cause instanceof Error ? cause.message : '操作失败，请重试。'); setProgress('') }

  useEffect(() => {
    let active = true
    readStudioDraft().then(draft => {
      if (!active) return
      if (draft?.document?.homepage && Array.isArray(draft.document.posts) && typeof draft.baseline === 'string') {
        setDocument(draft.document); setBaseline(draft.baseline); setCommit(draft.commit || ''); setImages(draft.images || {})
      }
      setReady(true)
    }).catch(cause => { if (active) { reportError(cause); setReady(true) } })
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (!ready) return
    saving.current = true; setSaved('正在自动保存…')
    const timer = setTimeout(() => {
      const sequence = editSequence.current
      writeStudioDraft({ document, baseline, savedAt: new Date().toISOString(), commit, images }).then(() => {
        if (sequence === editSequence.current) { saving.current = false; setSaved('草稿已自动保存在此浏览器') }
      }).catch(cause => { setSaved('自动保存失败，请导出备份'); reportError(cause) })
    }, 600)
    return () => clearTimeout(timer)
  }, [document, baseline, commit, images, ready])
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => { if (saving.current || busy || uploads > 0) event.preventDefault() }
    window.addEventListener('beforeunload', leave)
    return () => window.removeEventListener('beforeunload', leave)
  }, [busy, uploads])
  useEffect(() => {
    if (!commit) return
    let active = true
    let timer: ReturnType<typeof setTimeout>
    let attempts = 0
    async function check() {
      try {
        const run = await githubPublisher.deployment(commit)
        if (!active) return
        if (!run) setDeployment('等待 GitHub 开始部署…')
        else if (run.status === 'completed') { setDeployment(run.conclusion === 'success' ? '网站已部署成功，可以打开主页查看。' : '自动部署未成功，请打开发布记录查看原因；提交与本机草稿已保留。'); return }
        else setDeployment('GitHub 正在构建与部署网站…')
      } catch { if (active) setDeployment('暂时无法读取进度，可在 GitHub 发布记录中查看。') }
      if (active && ++attempts < 60) timer = setTimeout(() => void check(), 15000)
    }
    void check()
    return () => { active = false; clearTimeout(timer) }
  }, [commit])
  useEffect(() => {
    if (!previewWindow.current || previewWindow.current.closed) return
    const timer = setTimeout(() => {
      const previewDocument = documentWithImages(document, images)
      try { localStorage.setItem('orbit-editor-preview-v1', JSON.stringify(previewDocument)) } catch { /* 大量图片仍可通过窗口消息预览。 */ }
      previewWindow.current?.postMessage({ type: 'orbit-preview', document: previewDocument }, window.location.origin)
    }, 400)
    return () => clearTimeout(timer)
  }, [document, images])

  async function uploadLocalImage(file: File) {
    const staged = await stageImage(await compressImage(file))
    setImages(previous => ({ ...previous, [staged.path]: staged.data }))
    return staged.path
  }

  function update(next: ContentDocument | ((previous: ContentDocument) => ContentDocument)) { editSequence.current++; setDocument(next); setError(''); setMessage('') }
  function updatePost(change: Partial<Post>) { update(previous => ({ ...previous, posts: previous.posts.map((item, index) => index === postIndex ? { ...item, ...change } : item) })) }
  function insert(text: string) {
    if (!post) return
    const input = bodyInput.current
    const start = input?.selectionStart ?? post.body.length
    const end = input?.selectionEnd ?? start
    updatePost({ body: post.body.slice(0, start) + text + post.body.slice(end) })
    requestAnimationFrame(() => { input?.focus(); input?.setSelectionRange(start + text.length, start + text.length) })
  }
  async function insertImage(file: File) {
    setUploads(count => count + 1); setError('')
    try { insert(`\n\n![图片说明](${await uploadLocalImage(file)})\n\n`) } catch (cause) { reportError(cause) } finally { setUploads(count => count - 1) }
  }
  async function save() {
    try {
      await writeStudioDraft({ document, baseline, savedAt: new Date().toISOString(), commit, images })
      saving.current = false; setSaved('草稿已保存'); setMessage('已保存到当前浏览器，文章与图片均已保留。')
    } catch (cause) { reportError(cause) }
  }
  function preview() {
    const issues = validateDraftHomepage(document.homepage)
    if (issues.length) { setError(issues.join('\n')); return }
    const previewDocument = documentWithImages(document, images)
    try { localStorage.setItem('orbit-editor-preview-v1', JSON.stringify(previewDocument)) } catch { /* 消息传输兼容大图草稿。 */ }
    previewWindow.current = window.open('#/preview', 'orbit-homepage-preview')
    if (!previewWindow.current) { setError('预览窗口被浏览器阻止，请允许本站打开预览窗口。'); return }
    const target = previewWindow.current
    const send = () => { if (!target.closed) target.postMessage({ type: 'orbit-preview', document: previewDocument }, window.location.origin) }
    target.addEventListener('load', send, { once: true }); setTimeout(send, 1500)
  }
  async function publish() {
    if (!token) { setTab('settings'); setError('首次发布请先连接 GitHub，之后点击“发布网站”即可。'); return }
    setBusy(true); setError(''); setMessage(''); setProgress('正在准备公开文章…')
    try {
      const result = await githubPublisher.publish(document, baseline, token, setProgress, images)
      const nextBaseline = contentFingerprint(result.document)
      setBaseline(nextBaseline); setCommit(result.sha)
      await writeStudioDraft({ document, baseline: nextBaseline, savedAt: new Date().toISOString(), commit: result.sha, images })
      setMessage(result.changed ? '文章与图片已提交，网站即将自动更新。草稿文章仍只保存在此浏览器。' : '公开内容与仓库一致，无需重复提交。')
    } catch (cause) { reportError(cause) } finally { setBusy(false); setProgress('') }
  }
  async function reload() {
    setBusy(true); setError('')
    try {
      const snapshot = await githubPublisher.load(token)
      update(previous => ({ ...snapshot.document, posts: [...snapshot.document.posts, ...previous.posts.filter(item => item.status === 'draft' && !snapshot.document.posts.some(remote => remote.slug === item.slug))] }))
      setBaseline(contentFingerprint(snapshot.document)); setFormKey(key => key + 1); setSelected(0); setReloadConfirm(false); setMessage('已载入仓库最新内容，仅本机的新草稿仍保留。')
    } catch (cause) { reportError(cause) } finally { setBusy(false) }
  }
  async function importBackup(file: File) {
    try {
      if (file.size > 30 * 1024 * 1024) throw new Error('备份文件最多 30 MB。')
      const input = JSON.parse(await file.text())
      const next = input.document || (input.homepage && Array.isArray(input.posts) ? { homepage: input.homepage, posts: input.posts } : null)
      if (!next) throw new Error('请选择工作台导出的备份文件。')
      if (!Array.isArray(next.posts) || !next.posts.every((post: Post) => post && typeof post.title === 'string' && typeof post.slug === 'string' && typeof post.body === 'string' && typeof post.description === 'string' && typeof post.publishedAt === 'string' && Array.isArray(post.tags) && post.tags.every(tag => typeof tag === 'string') && Number.isFinite(post.readingMinutes))) throw new Error('备份中的文章字段不完整。')
      const issues = [...validateDraftHomepage(next.homepage), ...validateContent(seed().homepage, { schemaVersion: 1, posts: next.posts.filter((post: Post) => post.status !== 'draft') })]
      if (issues.length) throw new Error(issues.join('\n'))
      await preparePublication({ homepage: seed().homepage, posts: [] }, input.images || {})
      setImages(input.images || {})
      update(next); if (input.format === 'orbit-static-studio' && typeof input.baseline === 'string') setBaseline(input.baseline)
      setFormKey(key => key + 1); setSelected(0); setMessage('备份已恢复到本机编辑区，尚未发布。')
    } catch (cause) { reportError(cause) }
  }

  return <div className="admin-root static-admin"><aside className="admin-sidebar"><Link to="/admin" className="admin-logo"><span className="admin-brand-icon"><FileText size={21} /></span><span>博客工作台<small>WRITE · PREVIEW · PUBLISH</small></span></Link><div className="admin-sidebar-label">专注记录，自在发布</div><nav aria-label="配置分区">{tabs.map(item => { const Icon = item.icon; return <button key={item.id} disabled={blocked} className={tab === item.id ? 'active' : ''} aria-current={tab === item.id ? 'page' : undefined} onClick={() => { setTab(item.id); setDeleteConfirm(false) }}><Icon size={18} /><span>{item.label}</span></button> })}</nav><div className="admin-sidebar-bottom"><Link to="/"><Globe size={16} />查看主页<ArrowUpRight size={14} /></Link><span className="studio-local-note">草稿保存在当前浏览器<br />发布后文章同步至 GitHub</span></div></aside>
    <div className="admin-workspace"><header className="admin-toolbar"><div><span className="admin-status-dot" />{saved}</div><div className="admin-toolbar-actions"><button disabled={blocked} onClick={preview}><Eye size={16} />预览主页</button><button disabled={blocked} onClick={() => void save()}><Save size={16} />保存草稿</button><button className="admin-primary" disabled={blocked} onClick={() => void publish()}><Upload size={16} />{busy ? '处理中…' : '发布网站'}</button></div></header>
      <main className="admin-main"><div className="admin-page-heading"><span className="admin-kicker">YOUR WORDS, YOUR SPACE</span><h1>{tabs.find(item => item.id === tab)?.label}<span>✳</span></h1><p>{tab === 'posts' ? '写文章、放图片、看预览。准备好后，将文章设为公开并点击发布网站。' : tab === 'settings' ? '连接一次 GitHub，文章和图片就可以通过按钮发布。' : '填写你的内容，保存草稿后可随时预览，发布时与文章一并更新。'}</p></div>
      {error && <div className="admin-notice admin-error studio-multiline" role="alert">{error}</div>}{message && <div className="admin-notice admin-success" role="status"><Check size={18} /><span>{message}</span></div>}{progress && <div className="admin-notice studio-progress" role="status">{progress}</div>}
      {commit && <div className="studio-deployment" role="status"><span>{deployment || '正在查询发布进度…'}</span><a href={`${repositoryUrl}/actions?query=branch%3Amaster`} target="_blank" rel="noopener noreferrer">发布记录 ↗</a><a href={`https://wxh518.github.io/?v=${commit.slice(0, 8)}`} target="_blank" rel="noopener noreferrer">查看网站 ↗</a></div>}
      <UploadContext.Provider value={delta => setUploads(count => count + delta)}><ImageUploadContext.Provider value={uploadLocalImage}><ImagePreviewContext.Provider value={src => images[src] || src}><fieldset className="admin-edit-region" disabled={blocked}>
      {tab === 'posts' && <div className="studio-writing"><section className="studio-post-list admin-card"><div className="admin-array-heading"><h2>我的文章 <small>{document.posts.length}</small></h2><button onClick={() => {
        const next: Post = { slug: `post-${Date.now().toString(36)}`, title: '未命名文章', description: '', publishedAt: localDate(), tags: [], readingMinutes: 1, status: 'draft', body: '' }
        update(previous => ({ ...previous, posts: [next, ...previous.posts] })); setSelected(0); setDeleteConfirm(false)
      }}><Plus size={15} />写文章</button></div>{document.posts.map((item, index) => <button key={`${index}-${item.slug}`} className={`studio-post-choice ${postIndex === index ? 'selected' : ''}`} onClick={() => { setSelected(index); setDeleteConfirm(false) }}><strong>{item.title || '未命名文章'}</strong><span>{item.status === 'draft' ? '本机草稿' : '公开文章'} · {item.publishedAt}</span></button>)}{!document.posts.length && <p>点击“写文章”，开始第一篇记录。</p>}</section>
      {post && <section className="studio-composer admin-card"><div className="studio-post-meta"><label>文章标题<input aria-label="文章标题" value={post.title} onChange={event => updatePost({ title: event.target.value })} /></label><label>摘要<textarea aria-label="文章摘要" rows={2} value={post.description} onChange={event => updatePost({ description: event.target.value })} /></label><div className="studio-meta-grid"><label>文章地址<input aria-label="文章地址" value={post.slug} onChange={event => updatePost({ slug: event.target.value })} /><small>英文、数字和连字符；发布后保持稳定。</small></label><label>发布日期<input aria-label="发布日期" type="date" value={post.publishedAt} onChange={event => updatePost({ publishedAt: event.target.value })} /></label><label>阅读分钟数<input aria-label="阅读分钟数" type="number" min={1} value={post.readingMinutes} onChange={event => updatePost({ readingMinutes: Math.max(1, Number(event.target.value)) })} /></label><label>文章状态<select aria-label="文章状态" value={post.status || 'published'} onChange={event => updatePost({ status: event.target.value as Post['status'] })}><option value="draft">草稿 · 仅此浏览器</option><option value="published">公开 · 随网站发布</option></select></label></div><label>标签（每行一个）<textarea aria-label="文章标签" rows={2} value={post.tags.join('\n')} onChange={event => updatePost({ tags: event.target.value ? event.target.value.split('\n') : [] })} onBlur={() => updatePost({ tags: [...new Set(post.tags.map(tag => tag.trim()).filter(Boolean))] })} /></label></div>
      <div className="studio-editor-toolbar"><div><button onClick={() => insert('**加粗文字**')}>加粗</button><button onClick={() => insert('\n\n## 小标题\n\n')}>标题</button><button onClick={() => insert('\n\n```text\n在这里输入代码\n```\n\n')}>代码块</button><button onClick={() => imageInput.current?.click()}><ImagePlus size={15} />插入图片</button><input ref={imageInput} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={event => { const file = event.target.files?.[0]; if (file) void insertImage(file); event.target.value = '' }} /></div><div className="studio-editor-modes">{(['write', 'split', 'preview'] as const).map(mode => <button key={mode} aria-pressed={editorMode === mode} onClick={() => setEditorMode(mode)}>{mode === 'write' ? '写作' : mode === 'split' ? '对照' : '预览'}</button>)}</div></div>
      <div className={`studio-editor studio-editor-${editorMode}`}><textarea ref={bodyInput} aria-label="Markdown 正文" className="admin-markdown-input" placeholder="开始写作，支持 Markdown。可以直接粘贴剪贴板图片。" value={post.body} onChange={event => updatePost({ body: event.target.value })} onPaste={event => { const file = [...event.clipboardData.files].find(item => item.type.startsWith('image/')); if (file) { event.preventDefault(); void insertImage(file) } }} /><article className="markdown-body studio-article-preview"><ReactMarkdown urlTransform={url => previewUrl(images[url] || url)}>{post.body || '正文预览会显示在这里。'}</ReactMarkdown></article></div><p className="admin-tip">图片按钮会自动压缩并插入正文；也支持截图后直接粘贴。草稿含图片保存在当前浏览器，发布时自动生成站内图片链接。</p><div className="studio-post-end"><span>{post.body.length.toLocaleString()} 字符</span><button className="admin-danger" onClick={() => setDeleteConfirm(true)}><Trash2 size={14} />删除文章</button></div>{deleteConfirm && <div className="admin-confirm"><p>删除《{post.title}》？删除后需点击发布网站才会从线上移除。操作前可在“发布与备份”导出草稿。</p><button onClick={() => { update(previous => ({ ...previous, posts: previous.posts.filter((_, index) => index !== postIndex) })); setSelected(0); setDeleteConfirm(false) }}>确认删除</button><button onClick={() => setDeleteConfirm(false)}>取消</button></div>}</section>}</div>}
      {tab !== 'posts' && tab !== 'settings' && <div className="admin-card" key={formKey}>{tab === 'profile' && <SchemaField schema={schema.properties!.isDemo} root={schema} value={document.homepage.isDemo} name="isDemo" path="isDemo" token="" required onChange={value => update(previous => ({ ...previous, homepage: { ...previous.homepage, isDemo: Boolean(value) } }))} />}<SchemaField schema={schema.properties![tab]} root={schema} value={document.homepage[tab as keyof HomepageContent]} name={tab} path={tab} token="" required onChange={value => update(previous => {
        const homepage = { ...previous.homepage, [tab]: value } as HomepageContent
        if (tab === 'sections') { const enabled = new Set(homepage.sections.filter(section => section.enabled).map(section => section.id)); homepage.profile = { ...homepage.profile, roles: homepage.profile.roles.filter(role => enabled.has(role.target)) } }
        return { ...previous, homepage }
      })} /></div>}
      {tab === 'settings' && <><section className="admin-card studio-settings"><h2><Link2 size={19} />连接 GitHub 发布</h2><p>发布目标：wxh518 / wxh518.github.io。文章和图片会一起提交，GitHub Pages 随后自动更新，访客无需访问管理接口。</p><ol><li><a href={tokenSetupUrl} target="_blank" rel="noopener noreferrer">打开 GitHub 官方授权令牌页面 ↗</a></li><li>选择 Only select repositories，仅选 wxh518.github.io。</li><li>Repository permissions 中将 Contents 设为 Read and write，生成令牌后填入下方。</li></ol><p>令牌仅暂存在当前标签页的会话中，不会写入草稿、备份或仓库。关闭标签页或令牌到期后需重新连接。原来的 Cloudflare 管理密码不适用于此模式。</p><label>GitHub 授权令牌<input aria-label="GitHub 授权令牌" type="password" autoComplete="off" value={tokenInput} onChange={event => setTokenInput(event.target.value)} placeholder={token ? '当前标签页已连接，需要更换时填写' : '粘贴 GitHub fine-grained token'} /></label><div className="admin-button-row"><button onClick={async () => {
        setBusy(true); setError('')
        try { const next = tokenInput.trim(); await githubPublisher.connect(next); sessionStorage.setItem(tokenKey, next); setToken(next); setTokenInput(''); setMessage('GitHub 已连接，现在可以回到博客写作并点击发布网站。') } catch (cause) { reportError(cause) } finally { setBusy(false) }
      }}><Link2 size={15} />{token ? '更换连接' : '连接 GitHub'}</button>{token && <button onClick={() => { sessionStorage.removeItem(tokenKey); setToken(''); setMessage('已断开 GitHub 连接，本机草稿仍保留。') }}>断开连接</button>}</div></section>
      <section className="admin-card"><h2>草稿备份</h2><p>自动保存只保存在此浏览器。更换设备、清理浏览器前，请先导出备份；备份包含文章、未公开草稿及新插入的图片。发布后的公开内容保存在 GitHub，可从线上重新载入。</p><div className="admin-button-row"><button onClick={() => backup(document, baseline, images)}><Download size={16} />导出完整备份</button><button onClick={() => importInput.current?.click()}><Upload size={16} />导入备份</button><input ref={importInput} type="file" hidden accept="application/json,.json" onChange={event => { const file = event.target.files?.[0]; if (file) void importBackup(file); event.target.value = '' }} /></div></section>
      <section className="admin-card"><h2>载入线上最新内容</h2><p>在其他设备发布过，或遇到内容冲突时使用。替换当前公开文章和个人资料，保留未与线上文章重名的本机新草稿。请先导出备份保存尚未发布的修改。</p><button onClick={() => setReloadConfirm(true)}>从线上重新载入</button>{reloadConfirm && <div className="admin-confirm"><p>是否替换当前编辑区中的公开内容？</p><button onClick={() => void reload()}>确认载入</button><button onClick={() => setReloadConfirm(false)}>取消</button></div>}</section></>}
      </fieldset></ImagePreviewContext.Provider></ImageUploadContext.Provider></UploadContext.Provider></main>
    </div></div>
}
