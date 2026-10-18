import { createContext, useContext, useId, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from 'lucide-react'
import { uploadImage } from '../../services/admin-service'

export interface Schema {
  $ref?: string; type?: string; description?: string; properties?: Record<string, Schema>; required?: string[]
  items?: Schema; enum?: string[]; const?: unknown; anyOf?: Schema[]; definitions?: Record<string, Schema>
  minItems?: number; minimum?: number; maximum?: number; minLength?: number; format?: string; pattern?: string
}
export const UploadContext = createContext<(delta: number) => void>(() => {})
export const ImageUploadContext = createContext<((file: File) => Promise<string>) | null>(null)
export const ImagePreviewContext = createContext<(src: string) => string>(src => src)
const labels: Record<string, string> = {
  bounds: '地图经纬度范围', currentLocation: '当前位置', visitedPlaces: '去过的城市', latitude: '纬度', longitude: '经度', west: '最西经度', east: '最东经度', south: '最南纬度', north: '最北纬度',
  isDemo: '显示示例数据提示', profile: '个人资料', name: '名称', names: '首屏轮换名称', tagline: '一句话介绍', roles: '身份标签', label: '显示名称', target: '跳转模块', city: '所在地', email: '公开邮箱', intro: '个人介绍', statement: '补充介绍', contact: '联系邀请', socials: '社交账号', id: '唯一标识', handle: '账号名称', metric: '统计数量', metrics: '展示统计', value: '数值', unit: '单位', color: '颜色', description: '详细说明', url: '链接', sections: '模块设置', enabled: '显示此模块', inNavigation: '显示在导航中', projects: '项目', work: '开发项目', games: '游戏作品', essays: '视频 / 文章作品', music: '音乐', title: '标题', subtitle: '简短介绍', tags: '标签', art: '备用插画', image: '封面图片', avatarImage: '头像', skills: '技能', tag: '关联标签', level: '熟练度（0～10）', note: '技能说明', books: '书单', author: '作者', category: '分类', copy: '模块文案', stories: '社交区域', introduction: '开场介绍', openSourceTitle: '开源区域标题', openSourceLead: '开源区域引言', openSourceDescription: '开源区域介绍', topics: '话题', gear: '设备列表', decorations: '装饰图片', reading: '阅读区域', statistics: '统计图表', ages: '年龄节点', time: '时间分配', values: '各年龄节点占比', labelPosition: '图中文字位置', x: '横向位置', y: '纵向位置', scale: '文字缩放', movies: '电影偏好', descriptions: '图表介绍', space: '足迹地图', mapImage: '地图图片', mapAlt: '地图说明', marker: '头像标记位置', caption: '地图角标', posts: '博客文章', slug: '文章地址', publishedAt: '发布日期', readingMinutes: '阅读分钟数', body: 'Markdown 正文', schemaVersion: '数据版本',
}
const sectionNames: Record<string, string> = { influencer: '社交', code: '代码', game: '游戏', video: '视频', music: '音乐', statistics: '统计', books: '书单', draft: '草稿（不公开）', published: '公开文章' }
export function resolveSchema(raw: Schema, root: Schema): Schema {
  let schema = raw.$ref ? { ...root.definitions?.[raw.$ref.split('/').pop()!], ...raw } : raw
  if (schema.anyOf) schema = { ...schema, ...resolveSchema(schema.anyOf.find(item => item.type || item.$ref) || schema.anyOf[0], root) }
  return schema
}
export function defaultValue(raw: Schema, root: Schema): unknown {
  const schema = resolveSchema(raw, root)
  if (schema.const !== undefined) return schema.const
  if (schema.enum) return schema.enum[0]
  if (schema.type === 'object') return Object.fromEntries((schema.required || []).map(key => [key, defaultValue(schema.properties![key], root)]))
  if (schema.type === 'array') return Array.from({ length: schema.minItems || 0 }, () => defaultValue(schema.items!, root))
  if (schema.type === 'boolean') return false
  if (schema.type === 'number' || schema.type === 'integer') return schema.minimum ?? 0
  if (schema.format === 'date') return new Date().toLocaleDateString('sv-SE')
  if (schema.pattern?.includes('a-fA-F0-9') || schema.pattern?.includes('A-Fa-f0-9')) return '#f59247'
  return schema.minLength ? '新条目' : ''
}
interface Props { schema: Schema; root: Schema; value: unknown; onChange: (value: unknown) => void; name: string; path: string; token: string; required?: boolean }

function ListInput({ value, numbers, onChange, id }: { value: unknown[]; numbers: boolean; onChange: Props['onChange']; id: string }) {
  const [text, setText] = useState(() => value.join(numbers ? ', ' : '\n'))
  return <textarea id={id} rows={Math.min(7, Math.max(2, value.length + 1))} value={text} onChange={event => {
    const next = event.target.value; setText(next)
    onChange(numbers ? next.split(/[,，\s]+/).filter(Boolean).map(Number) : next ? next.split('\n') : [])
  }} onBlur={() => { if (!numbers) { const next = text.split('\n').map(item => item.trim()).filter(Boolean); setText(next.join('\n')); onChange(next) } }} />
}

export function SchemaField({ schema: raw, root, value, onChange, name, path, token, required }: Props) {
  const id = useId()
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const reportUpload = useContext(UploadContext)
  const customUpload = useContext(ImageUploadContext)
  const previewImage = useContext(ImagePreviewContext)
  const latestChange = useRef(onChange)
  latestChange.current = onChange
  const schema = resolveSchema(raw, root)
  const title = name === 'status' ? '文章可见性' : labels[name] || name
  const image = ['image', 'avatarImage', 'mapImage'].includes(name)
  if (name === '$schema' || name === 'schemaVersion') return null
  if (schema.type === 'object') {
    if (value === undefined) return <div className="admin-optional"><div><strong>{title}</strong><p>{schema.description}</p></div><button type="button" onClick={() => onChange(defaultValue(schema, root))}><Plus size={15} />添加</button></div>
    const object = (value || {}) as Record<string, unknown>
    const fields = Object.entries(schema.properties || {}).filter(([key]) => name !== 'space' || !object.currentLocation || !['marker', 'caption'].includes(key))
    if (name === 'profile') {
      const order = ['name', 'avatarImage', 'names', 'tagline', 'city', 'email', 'intro', 'statement', 'contact', 'roles', 'socials']
      fields.sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
    }
    return <fieldset className="admin-fieldset"><legend>{title}{!required && <button type="button" className="admin-subtle" onClick={() => onChange(undefined)}>移除此项</button>}</legend>{fields.map(([key, item]) => <SchemaField key={key} schema={item} root={root} value={object[key]} name={key} path={`${path}.${key}`} token={token} required={schema.required?.includes(key)} onChange={next => {
      const result = { ...object }; if (next === undefined) delete result[key]; else result[key] = next; onChange(result)
    }} />)}</fieldset>
  }
  if (schema.type === 'array') {
    const items = (Array.isArray(value) ? value : []) as unknown[]
    const itemSchema = resolveSchema(schema.items!, root)
    if (itemSchema.type === 'string' || ['number', 'integer'].includes(itemSchema.type || '')) return <div className="admin-field"><label htmlFor={id}>{title}</label><p>{schema.description} {itemSchema.type === 'string' ? '每行一项。' : '使用逗号分隔。'}</p><ListInput key={path} id={id} value={items} numbers={itemSchema.type !== 'string'} onChange={onChange} /></div>
    return <section className="admin-array"><div className="admin-array-heading"><div><h3>{title}<span>{items.length}</span></h3><p>{schema.description}</p></div><button type="button" disabled={name === 'sections' && items.length >= 7} onClick={() => {
      const item = defaultValue(itemSchema, root) as Record<string, unknown>
      if ('id' in item) item.id = name === 'sections' ? ['influencer', 'code', 'game', 'video', 'music', 'statistics', 'books'].find(id => !items.some(old => (old as { id: string }).id === id)) : `item-${crypto.randomUUID().slice(0, 8)}`
      if ('slug' in item) { item.slug = `new-post-${crypto.randomUUID().slice(0, 8)}`; item.status = 'draft' }
      if ('tag' in item) item.tag = `skill-${crypto.randomUUID().slice(0, 8)}`
      if ('color' in item) item.color = '#f59247'
      if ('art' in item) item.art = 'code'
      if ('body' in item) item.body = '# 新文章\n\n在这里开始写作。'
      onChange([...items, item])
    }}><Plus size={16} />新增</button></div>{items.length === 0 && <p className="admin-empty">还没有内容，点击“新增”添加。</p>}{items.map((item, index) => {
      const record = item as Record<string, unknown>
      const heading = String(record.title || record.name || record.label || `第 ${index + 1} 项`)
      return <details key={`${path}-${index}`} className="admin-item" open={items.length === 1 || undefined}><summary><span className="admin-item-number">{String(index + 1).padStart(2, '0')}</span><strong>{heading}</strong><span className="admin-item-hint">展开编辑</span></summary><div className="admin-item-body"><div className="admin-item-actions"><button type="button" disabled={index === 0} aria-label={`上移${heading}`} onClick={() => { const next = [...items]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; onChange(next) }}><ArrowUp size={14} />上移</button><button type="button" disabled={index === items.length - 1} aria-label={`下移${heading}`} onClick={() => { const next = [...items]; [next[index], next[index + 1]] = [next[index + 1], next[index]]; onChange(next) }}><ArrowDown size={14} />下移</button><button type="button" className="admin-danger" disabled={items.length <= (schema.minItems || 0)} onClick={() => onChange(items.filter((_, i) => i !== index))}><Trash2 size={14} />删除</button></div><SchemaField schema={schema.items!} root={root} value={item} name={name === 'posts' ? 'posts' : '详情'} path={`${path}.${index}`} token={token} required onChange={next => onChange(items.map((old, i) => i === index ? next : old))} /></div></details>
    })}</section>
  }
  if (schema.type === 'boolean') return <label className="admin-toggle"><span><strong>{title}</strong><small>{schema.description}</small></span><input type="checkbox" checked={Boolean(value)} onChange={event => onChange(event.target.checked)} /><span className="admin-switch" aria-hidden="true" /></label>
  return <div className={`admin-field ${image ? 'admin-image-field' : ''}`}><label htmlFor={id}>{title}{required && Boolean(schema.minLength) && <span className="admin-required">*</span>}</label><p id={`${id}-hint`}>{schema.description}</p>{schema.enum ? <select id={id} value={String(value ?? (name === 'status' ? 'published' : schema.enum[0]))} onChange={event => onChange(event.target.value)}>{schema.enum.map(option => <option key={option} value={option}>{sectionNames[option] || option}</option>)}</select>
    : ['number', 'integer'].includes(schema.type || '') ? <input id={id} type="number" min={schema.minimum} max={schema.maximum} step={schema.type === 'integer' ? 1 : 'any'} value={Number.isFinite(value) ? Number(value) : ''} onChange={event => onChange(event.target.value === '' ? 0 : Number(event.target.value))} />
    : ['body', 'description', 'intro', 'statement', 'contact', 'introduction', 'openSourceDescription'].includes(name) ? <textarea id={id} className={name === 'body' ? 'admin-markdown-input' : ''} rows={name === 'body' ? 18 : 3} value={String(value ?? '')} onChange={event => onChange(event.target.value)} />
    : <div className="admin-input-row">{name === 'color' && <input type="color" aria-label="选择颜色" value={/^#[a-f\d]{6}$/i.test(String(value)) ? String(value) : '#f59247'} onChange={event => onChange(event.target.value)} />}<input id={id} type={schema.format === 'date' ? 'date' : name === 'email' ? 'email' : 'text'} aria-describedby={`${id}-hint`} value={String(value ?? '')} placeholder={!required ? '可留空' : undefined} onChange={event => onChange(!required && !event.target.value ? undefined : event.target.value)} /></div>}
    {image && <div className="admin-image-tools">{Boolean(value) && <img src={previewImage(String(value))} alt={`${title}预览`} />}<label className="admin-upload-button"><ImagePlus size={16} />{uploading ? '压缩并上传中…' : '选择图片上传'}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={async event => {
      const file = event.target.files?.[0]; if (!file) return
      setUploading(true); setUploadError(''); reportUpload(1)
      const input = event.target
      try { latestChange.current(await (customUpload ? customUpload(file) : uploadImage(file, token))) } catch (error) { setUploadError((error as Error).message) } finally { setUploading(false); input.value = ''; reportUpload(-1) }
    }} /></label><small>自动压缩为 WebP，最长边 1600 像素。</small>{uploadError && <p className="admin-error-text" role="alert">{uploadError}</p>}</div>}
  </div>
}
