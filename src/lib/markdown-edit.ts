export type MarkdownAction = 'bold' | 'italic' | 'boldItalic' | 'strike' | 'inlineCode' | 'code' | 'quote' | 'bullet' | 'ordered' | 'task' | 'indent' | 'outdent' | 'link' | 'reference' | 'autolink' | 'image' | 'table' | 'rule' | 'footnote' | 'break' | 'escape' | `h${1 | 2 | 3 | 4 | 5 | 6}`
export interface MarkdownEdit { value: string; start: number; end: number }

// 所有工具都只修改选区或当前行，返回新选区以便继续输入。
export function editMarkdown(value: string, start: number, end: number, action: MarkdownAction): MarkdownEdit {
  const selected = value.slice(start, end)
  const replace = (text: string, offset = text.length, length = 0, from = start, to = end): MarkdownEdit => ({
    value: value.slice(0, from) + text + value.slice(to), start: from + offset, end: from + offset + length,
  })
  const wrap = (left: string, right: string, placeholder: string) => {
    if (selected.startsWith(left) && selected.endsWith(right) && selected.length > left.length + right.length) {
      const text = selected.slice(left.length, -right.length)
      return replace(text, 0, text.length)
    }
    const text = selected || placeholder
    return replace(left + text + right, left.length, text.length)
  }
  const block = (text: string, offset = text.length, length = 0) => {
    const before = value.slice(0, start)
    const after = value.slice(end)
    const prefix = before ? before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n' : ''
    const suffix = after ? after.startsWith('\n\n') ? '' : after.startsWith('\n') ? '\n' : '\n\n' : '\n'
    return replace(prefix + text + suffix, prefix.length + offset, length)
  }
  if (action === 'bold') return wrap('**', '**', '加粗文字')
  if (action === 'italic') return wrap('*', '*', '斜体文字')
  if (action === 'boldItalic') return wrap('***', '***', '加粗斜体')
  if (action === 'strike') return wrap('~~', '~~', '删除文字')
  if (action === 'inlineCode') {
    const longest = Math.max(0, ...(selected.match(/`+/g) || []).map(run => run.length))
    const fence = '`'.repeat(longest + 1)
    const pad = selected.includes('`') ? ' ' : ''
    return wrap(fence + pad, pad + fence, 'code')
  }
  if (action === 'code') {
    const text = selected || '在这里输入代码'
    const fence = '`'.repeat(Math.max(3, ...((text.match(/`+/g) || []).map(run => run.length + 1))))
    return block(`${fence}text\n${text}\n${fence}`, fence.length + 5, text.length)
  }
  if (action === 'link' || action === 'image') {
    const text = selected || (action === 'image' ? '图片说明' : '链接文字')
    const prefix = action === 'image' ? '![' : '['
    return replace(`${prefix}${text}](https://example.com)`, prefix.length + text.length + 2, 19)
  }
  if (action === 'reference') {
    let index = 1
    while (value.includes(`[link-${index}]`)) index++
    const text = selected || '链接文字'
    const label = `link-${index}`
    const result = replace(`[${text}][${label}]`, 1, text.length)
    return { ...result, value: result.value + `\n\n[${label}]: https://example.com "链接标题"\n` }
  }
  if (action === 'autolink') return wrap('<', '>', 'https://example.com')
  if (action === 'table') {
    const cell = selected ? selected.replaceAll('|', '\\|').replaceAll('\n', ' ') : '内容'
    return block(`| 列一 | 列二 | 列三 |\n| :--- | :---: | ---: |\n| ${cell} | 内容 | 内容 |\n| 内容 | 内容 | 内容 |`, 2, 2)
  }
  if (action === 'rule') return block('---')
  if (action === 'footnote') {
    let index = 1
    while (value.includes(`[^${index}]`)) index++
    const note = selected || '脚注说明'
    const marker = `[^${index}]`
    const result = replace(marker)
    const prefix = `${result.value}\n\n${marker}: `
    return { value: prefix + note + '\n', start: prefix.length, end: prefix.length + note.length }
  }
  if (action === 'break') return replace('  \n')
  if (action === 'escape') {
    const text = selected || '*按原样显示*'
    const escaped = text.replace(/[\\`*{}[\]()#+\-.!_|>~]/g, '\\$&')
    return replace(escaped, 0, escaped.length)
  }
  const lineStart = start === 0 ? 0 : value.lastIndexOf('\n', start - 1) + 1
  const last = end > start && value[end - 1] === '\n' ? end - 1 : end
  const nextBreak = value.indexOf('\n', last)
  const lineEnd = nextBreak < 0 ? value.length : nextBreak
  const lines = value.slice(lineStart, lineEnd).split('\n')
  const heading = /^h[1-6]$/.test(action) ? '#'.repeat(Number(action.slice(1))) + ' ' : ''
  const transformed = lines.map((line, index) => {
    if (heading) return heading + (line.replace(/^ {0,3}#{1,6}(?:\s+|$)/, '') || '标题')
    if (action === 'quote') return '> ' + line
    if (action === 'indent') return '    ' + line
    if (action === 'outdent') return line.replace(/^(?: {1,4}|\t)/, '')
    const text = line.replace(/^\s*(?:[-+*]\s+(?:\[[ xX]\]\s+)?|\d+[.)]\s+)/, '') || '列表项'
    if (action === 'bullet') return '- ' + text
    if (action === 'ordered') return `${index + 1}. ${text}`
    return '- [ ] ' + text
  }).join('\n')
  return replace(transformed, 0, transformed.length, lineStart, lineEnd)
}
