import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MotionConfig } from 'motion/react'
import { Home } from '../App'
import { DetailDialog, ExperienceContext } from '../components/ui'
import type { Detail } from '../components/ui'
import type { ContentDocument } from '../types/admin'
import { validateDraftHomepage } from '../lib/content-validation'
import './Admin.css'

const previewKey = 'orbit-editor-preview-v1'
function validDocument(value: unknown): value is ContentDocument {
  if (!value || typeof value !== 'object' || !('homepage' in value) || !('posts' in value)) return false
  const input = value as ContentDocument
  return Array.isArray(input.posts) && validateDraftHomepage(input.homepage).length === 0
}
export default function AdminPreview() {
  const [data, setData] = useState<ContentDocument | null>(() => {
    try { const value = JSON.parse(localStorage.getItem(previewKey) || 'null'); return validDocument(value) ? value : null } catch { return null }
  })
  const [detail, setDetail] = useState<Detail | null>(null)
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.source === window.opener && event.data?.type === 'orbit-preview' && validDocument(event.data.document)) setData(event.data.document)
    }
    window.addEventListener('message', receive)
    return () => window.removeEventListener('message', receive)
  }, [])
  return <><div className="admin-preview-bar"><span>草稿预览 · 尚未发布 · 在工作台修改后会自动更新此窗口</span><Link to="/admin">返回工作台</Link></div>{data ? <ExperienceContext.Provider value={{ animated: false, openDetail: setDetail }}><MotionConfig reducedMotion="always"><div className="site paused"><Home data={data.homepage} /><DetailDialog detail={detail} onClose={() => setDetail(null)} /></div></MotionConfig></ExperienceContext.Provider> : <div className="admin-root admin-empty">请先在配置工作台点击“预览”。</div>}</>
}
