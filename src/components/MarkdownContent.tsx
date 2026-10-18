import { memo } from 'react'
import ReactMarkdown, { defaultUrlTransform, type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import './MarkdownContent.css'

const plugins = [remarkGfm]
const components: Components = {
    a: ({ node: _node, href, children, ...props }) => <a {...props} href={href} onClick={event => {
      // HashRouter 使用 # 保存页面路由；文内锚点直接滚动，避免脚注点击后离开文章。
      if (!href?.startsWith('#') || href.startsWith('#/')) return
      event.preventDefault()
      let id: string
      try { id = decodeURIComponent(href.slice(1)) } catch { return }
      const target = event.currentTarget.ownerDocument.getElementById(id)
      if (target) { target.scrollIntoView({ block: 'nearest' }); target.tabIndex = -1; target.focus({ preventScroll: true }) }
    }}>{children}</a>,
}

/** 写作预览和正式文章共用语法与 URL 策略，不执行正文中的 HTML。 */
export const MarkdownContent = memo(function MarkdownContent({ children, images = {} }: { children: string; images?: Record<string, string> }) {
  return <ReactMarkdown remarkPlugins={plugins} remarkRehypeOptions={{ footnoteLabel: '脚注', footnoteBackLabel: '返回正文' }} components={components} urlTransform={url => {
    const resolved = images[url] || url
    return /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(resolved) ? resolved : defaultUrlTransform(resolved)
  }}>{children}</ReactMarkdown>
})
