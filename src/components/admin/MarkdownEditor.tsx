import { useDeferredValue, useEffect, useRef, useState, type CSSProperties } from 'react'
import { ImagePlus, Redo2, Undo2 } from 'lucide-react'
import { MarkdownContent } from '../MarkdownContent'
import { editMarkdown, type MarkdownAction, type MarkdownEdit } from '../../lib/markdown-edit'
import './MarkdownEditor.css'

type Mode = 'write' | 'split' | 'preview'
const preferenceKey = 'orbit-writing-preferences-v1'
const defaultPreferences = { editor: 18, preview: 18 }
function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(preferenceKey) || '{}')
    const valid = (value: unknown) => typeof value === 'number' && Number.isInteger(value) && value >= 12 && value <= 32
    return { editor: valid(saved.editor) ? saved.editor as number : 18, preview: valid(saved.preview) ? saved.preview as number : 18 }
  } catch { return defaultPreferences }
}
const groups: { label: string; tools: [MarkdownAction, string, string?][] }[] = [
  { label: '文字', tools: [['bold', '加粗', 'Ctrl/⌘ + B'], ['italic', '斜体', 'Ctrl/⌘ + I'], ['boldItalic', '粗斜体'], ['strike', '删除线', 'Ctrl/⌘ + Shift + X'], ['inlineCode', '行内代码']] },
  { label: '段落', tools: [['quote', '引用'], ['bullet', '无序列表'], ['ordered', '有序列表'], ['task', '任务清单'], ['indent', '增加缩进'], ['outdent', '减少缩进']] },
  { label: '内容', tools: [['code', '代码块'], ['link', '链接', 'Ctrl/⌘ + K'], ['reference', '引用式链接'], ['autolink', '自动链接'], ['image', '图片链接'], ['table', '表格'], ['rule', '分隔线'], ['footnote', '脚注'], ['break', '换行'], ['escape', '转义符']] },
]

interface Props {
  value: string
  images: Record<string, string>
  onChange: (value: string) => void
  onImageUpload: (file: File) => Promise<string>
  onUploadCount: (delta: number) => void
  onError: (cause: unknown) => void
}

export function MarkdownEditor({ value, images, onChange, onImageUpload, onUploadCount, onError }: Props) {
  const [mode, setMode] = useState<Mode>('split')
  const [preferences, setPreferences] = useState(readPreferences)
  const preview = useDeferredValue(value)
  const input = useRef<HTMLTextAreaElement>(null)
  const imageInput = useRef<HTMLInputElement>(null)
  const latest = useRef(value)
  latest.current = value
  const history = useRef<MarkdownEdit[]>([{ value, start: 0, end: 0 }])
  const position = useRef(0)
  const [, refreshHistory] = useState(0)
  useEffect(() => {
    try { localStorage.setItem(preferenceKey, JSON.stringify(preferences)) } catch { /* 禁用存储时仍可在本次会话调节。 */ }
  }, [preferences])
  useEffect(() => {
    // 切换文章或恢复备份时重新建立历史，避免跨文章撤销。
    if (history.current[position.current].value !== value) {
      history.current = [{ value, start: 0, end: 0 }]; position.current = 0; refreshHistory(count => count + 1)
    }
  }, [value])

  function focus(edit: MarkdownEdit) {
    requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(edit.start, edit.end) })
  }
  function commit(edit: MarkdownEdit, restoreFocus = true) {
    if (edit.value === latest.current) { if (restoreFocus) focus(edit); return }
    const current = input.current
    history.current[position.current] = { value: latest.current, start: current?.selectionStart || 0, end: current?.selectionEnd || 0 }
    history.current = history.current.slice(0, position.current + 1)
    history.current.push(edit)
    if (history.current.length > 100) history.current.shift()
    position.current = history.current.length - 1
    latest.current = edit.value
    onChange(edit.value)
    refreshHistory(count => count + 1)
    if (restoreFocus) focus(edit)
  }
  function travel(delta: number) {
    const next = position.current + delta
    if (next < 0 || next >= history.current.length) return
    position.current = next
    const edit = history.current[next]
    latest.current = edit.value; onChange(edit.value); refreshHistory(count => count + 1); focus(edit)
  }
  function apply(action: MarkdownAction) {
    if (mode === 'preview') setMode('split')
    commit(editMarkdown(latest.current, input.current?.selectionStart ?? latest.current.length, input.current?.selectionEnd ?? latest.current.length, action))
  }
  async function upload(file: File) {
    const before = latest.current
    const start = input.current?.selectionStart ?? before.length
    const end = input.current?.selectionEnd ?? start
    onUploadCount(1)
    try {
      const path = await onImageUpload(file)
      const text = latest.current
      const from = text === before ? start : text.length
      const to = text === before ? end : text.length
      const image = `\n\n![图片说明](${path})\n\n`
      if (mode === 'preview') setMode('split')
      commit({ value: text.slice(0, from) + image + text.slice(to), start: from + 4, end: from + 8 })
    } catch (cause) { onError(cause) } finally { onUploadCount(-1) }
  }
  const style = { '--editor-font-size': `${preferences.editor}px`, '--preview-font-size': `${preferences.preview}px` } as CSSProperties
  return <section className="markdown-workbench" aria-label="Markdown 编辑器" style={style}>
    <div className="markdown-preferences">
      <div className="markdown-font-controls">{(['editor', 'preview'] as const).map(kind => <label key={kind}>
        {kind === 'editor' ? '编辑字号' : '预览字号'}
        <select aria-label={kind === 'editor' ? '编辑字号' : '预览字号'} value={preferences[kind]} onChange={event => setPreferences(previous => ({ ...previous, [kind]: Number(event.target.value) }))}>
          {Array.from({ length: 21 }, (_, index) => index + 12).map(size => <option key={size} value={size}>{size} px</option>)}
        </select>
      </label>)}</div>
      <div className="markdown-modes" role="group" aria-label="编辑模式">{(['write', 'split', 'preview'] as const).map(item => <button type="button" key={item} aria-pressed={mode === item} onClick={() => setMode(item)}>{item === 'write' ? '写作' : item === 'split' ? '对照' : '预览'}</button>)}</div>
    </div>
    <div className="markdown-tools" aria-label="Markdown 工具栏">
      <div className="markdown-tool-group"><span className="markdown-tool-label">历史</span><button type="button" title="撤销（Ctrl/⌘ + Z）" aria-label="撤销" disabled={position.current === 0} onClick={() => travel(-1)}><Undo2 size={15} /></button><button type="button" title="重做（Ctrl/⌘ + Shift + Z）" aria-label="重做" disabled={position.current === history.current.length - 1} onClick={() => travel(1)}><Redo2 size={15} /></button>
        <select aria-label="插入标题" value="" onChange={event => { if (event.target.value) apply(event.target.value as MarkdownAction) }}><option value="" disabled>标题 H1–H6</option>{[1, 2, 3, 4, 5, 6].map(level => <option value={`h${level}`} key={level}>H{level} · {level} 级标题</option>)}</select>
      </div>
      {groups.map(group => <div className="markdown-tool-group" key={group.label} role="group" aria-label={group.label}><span className="markdown-tool-label">{group.label}</span>{group.tools.map(([action, label, shortcut]) => <button type="button" key={action} title={shortcut ? `${label}（${shortcut}）` : label} onClick={() => apply(action)}>{label}</button>)}</div>)}
      <div className="markdown-tool-group"><span className="markdown-tool-label">图片</span><button type="button" onClick={() => imageInput.current?.click()}><ImagePlus size={15} />插入图片</button><input ref={imageInput} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={event => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = '' }} /></div>
    </div>
    <div className={`markdown-editor markdown-editor-${mode}`}>
      <textarea ref={input} aria-label="Markdown 正文" placeholder="开始写作，支持 Markdown。可以直接粘贴剪贴板图片。" spellCheck={false} value={value}
        onChange={event => commit({ value: event.target.value, start: event.target.selectionStart, end: event.target.selectionEnd }, false)}
        onKeyDown={event => {
          if (!(event.ctrlKey || event.metaKey) || event.altKey || event.nativeEvent.isComposing) return
          const key = event.key.toLowerCase()
          let action: MarkdownAction | null = null
          if (!event.shiftKey) action = key === 'b' ? 'bold' : key === 'i' ? 'italic' : key === 'k' ? 'link' : null
          if (event.shiftKey && key === 'x') action = 'strike'
          if (action) { event.preventDefault(); apply(action) }
          else if (key === 'z' || key === 'y') { event.preventDefault(); travel(key === 'y' || event.shiftKey ? 1 : -1) }
        }} onPaste={event => { const file = [...event.clipboardData.files].find(item => item.type.startsWith('image/')); if (file) { event.preventDefault(); void upload(file) } }} />
      <article aria-label="Markdown 预览" aria-busy={preview !== value} className="markdown-body markdown-editor-preview-body"><MarkdownContent images={images}>{preview || '正文预览会显示在这里。'}</MarkdownContent></article>
    </div>
    <p className="admin-tip">字号仅影响当前浏览器的写作视图，不会改变文章内容。选中文字后点击格式按钮；支持 Ctrl/⌘ + B 加粗、I 斜体、K 链接、Z 撤销。</p>
    <details className="markdown-help"><summary>Markdown 语法与图片说明</summary><p>支持 CommonMark 与 GitHub 风格 Markdown：H1–H6、强调、列表、引用、代码、链接、图片、表格、任务清单、删除线、脚注、换行和转义。代码块首行的 text 可改成 javascript 等语言；表格分隔行的冒号控制对齐。任务框可将 [ ] 改为 [x] 标记完成。正文中的 HTML 不执行，数学公式与 Mermaid 图暂不渲染。</p><p>“插入图片”会压缩本机图片并插入正文；也支持截图后直接粘贴。“图片链接”用于已有图片网址。草稿图片保存在当前浏览器，发布时自动生成站内图片链接。</p></details>
  </section>
}
