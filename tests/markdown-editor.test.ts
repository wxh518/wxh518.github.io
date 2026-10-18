import test from 'node:test'
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { editMarkdown } from '../src/lib/markdown-edit'

test('inline tools wrap selected text and preserve adjacent prose', () => {
  const result = editMarkdown('前文重点后文', 2, 4, 'bold')
  assert.equal(result.value, '前文**重点**后文')
  assert.equal(result.value.slice(result.start, result.end), '重点')
  const removed = editMarkdown('**重点**', 0, 6, 'bold')
  assert.equal(removed.value, '重点')
})

test('placeholder and link URL are selected for immediate replacement', () => {
  const bold = editMarkdown('', 0, 0, 'bold')
  assert.equal(bold.value.slice(bold.start, bold.end), '加粗文字')
  const link = editMarkdown('官网', 0, 2, 'link')
  assert.equal(link.value, '[官网](https://example.com)')
  assert.equal(link.value.slice(link.start, link.end), 'https://example.com')
})

test('line tools transform only touched lines and do not consume trailing newline', () => {
  const text = '前段\n苹果\n香蕉\n后段'
  assert.equal(editMarkdown(text, 3, 9, 'ordered').value, '前段\n1. 苹果\n2. 香蕉\n后段')
  assert.equal(editMarkdown('- [x] 已完成\n- 第二项', 0, 17, 'bullet').value, '- 已完成\n- 第二项')
  assert.equal(editMarkdown('## 旧标题', 3, 6, 'h4').value, '#### 旧标题')
  assert.equal(editMarkdown('\n正文', 0, 0, 'quote').value, '> \n正文')
})

test('code fences are longer than backticks in the selected code', () => {
  const text = '```js\nconsole.log(1)\n```'
  const result = editMarkdown(text, 0, text.length, 'code')
  assert.equal(result.value, `\`\`\`\`text\n${text}\n\`\`\`\`\n`)
  assert.equal(result.value.slice(result.start, result.end), text)
  const inline = editMarkdown('`x`', 0, 3, 'inlineCode')
  assert.equal(inline.value, '`` `x` ``')
})

test('block templates separate neighboring paragraphs and preserve selected table text', () => {
  const rule = editMarkdown('前文后文', 2, 2, 'rule')
  assert.equal(rule.value, '前文\n\n---\n\n后文')
  const table = editMarkdown('a|b', 0, 3, 'table')
  assert.match(table.value, /a\\\|b/)
  const indented = editMarkdown('第一行\n第二行', 0, 7, 'indent')
  assert.equal(editMarkdown(indented.value, 0, indented.value.length, 'outdent').value, '第一行\n第二行')
})

test('footnotes and reference links allocate unused labels and retain definitions', () => {
  const text = '已有[^1]\n\n[^1]: 旧脚注\n新说明'
  const result = editMarkdown(text, text.length - 3, text.length, 'footnote')
  assert.match(result.value, /已有\[\^1\]/)
  assert.match(result.value, /\[\^2\]: 新说明/)
  assert.equal(result.value.slice(result.start, result.end), '新说明')
  assert.match(editMarkdown('[link-1]: /old\n新链接', 15, 18, 'reference').value, /\[link-2\]: https:\/\/example.com/)
})

// CSS-free renderer import keeps this integration test usable in Node.
test('GFM preview and public rendering support tables, tasks, footnotes and safe URLs', async () => {
  const { default: ReactMarkdown } = await import('react-markdown')
  const { default: remarkGfm } = await import('remark-gfm')
  const markdown = '| 名称 | 数量 |\n| --- | ---: |\n| 示例 | 2 |\n\n- [x] 完成\n\n~~删除~~\n\n说明[^1]\n\n[^1]: 补充说明\n\nhttps://example.com\n\n[危险](javascript:alert(1))\n\n<script>alert(1)</script>'
  const html = renderToStaticMarkup(createElement(ReactMarkdown, { remarkPlugins: [remarkGfm], children: markdown }))
  assert.match(html, /<table>/)
  assert.match(html, /text-align:right/)
  assert.match(html, /type="checkbox"[^>]*checked/)
  assert.match(html, /<del>删除<\/del>/)
  assert.match(html, /data-footnotes/)
  assert.match(html, /href="https:\/\/example.com"/)
  assert.doesNotMatch(html, /href="javascript:/)
  assert.doesNotMatch(html, /<script>/)
})
