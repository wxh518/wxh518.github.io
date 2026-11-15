import { useRef, useState, type DragEvent } from 'react'
import { ChevronDown, ChevronUp, GripVertical, Plus } from 'lucide-react'
import type { Post } from '../../types/content'

type Direction = 'up' | 'down'

export function StudioPostList({ posts, selected, onSelect, onCreate, onMove }: {
  posts: Post[]
  selected: number
  onSelect: (index: number) => void
  onCreate: () => void
  onMove: (from: number, to: number) => void
}) {
  const list = useRef<HTMLOListElement>(null)
  const source = useRef<number | null>(null)
  const [dragged, setDragged] = useState<number | null>(null)
  const [slot, setSlot] = useState<number | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const slugCounts = new Map<string, number>()

  function stopDrag() {
    source.current = null
    setDragged(null)
    setSlot(null)
  }

  function reorder(from: number, to: number, direction?: Direction) {
    if (to === from || to < 0 || to >= posts.length) return
    onMove(from, to)
    setAnnouncement(`《${posts[from].title || '未命名文章'}》已移到第 ${to + 1} 位。`)
    if (direction) requestAnimationFrame(() => list.current?.querySelector<HTMLButtonElement>(`[data-post-index="${to}"] [data-move="${direction}"]`)?.focus())
  }

  function slotAt(event: DragEvent<HTMLLIElement>, index: number) {
    const { top, height } = event.currentTarget.getBoundingClientRect()
    return event.clientY < top + height / 2 ? index : index + 1
  }

  return <section className="studio-post-list admin-card">
    <div className="admin-array-heading"><h2>我的文章 <small>{posts.length}</small></h2><button type="button" onClick={onCreate}><Plus size={15} />写文章</button></div>
    {posts.length > 1 && <p className="studio-order-hint">拖动把手或使用箭头排序，发布后同步到博客。</p>}
    <ol ref={list} className="studio-post-order" aria-label="文章顺序" onDragLeave={event => {
      const next = event.relatedTarget
      if (!(next instanceof Node) || !event.currentTarget.contains(next)) setSlot(null)
    }}>
      {posts.map((post, index) => {
        const title = post.title || '未命名文章'
        const duplicateIndex = slugCounts.get(post.slug) ?? 0
        slugCounts.set(post.slug, duplicateIndex + 1)
        return <li key={`${post.slug}:${duplicateIndex}`} data-post-index={index} className="studio-post-row"
          data-dragged={dragged === index || undefined}
          data-insert={slot === index ? 'before' : slot === posts.length && index === posts.length - 1 ? 'after' : undefined}
          onDragOver={event => {
            if (source.current === null) return
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'
            setSlot(slotAt(event, index))
          }}
          onDrop={event => {
            const from = source.current
            if (from === null) return
            event.preventDefault()
            const insert = slotAt(event, index)
            stopDrag()
            // 插入槽位按原列表计算；拿走前方的源行后，目标位置减一。
            reorder(from, insert - Number(insert > from))
          }}>
          {posts.length > 1 && <span className="studio-drag-handle" draggable aria-hidden="true" title="拖动调整文章顺序"
            onDragStart={event => {
              source.current = index
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/plain', String(index + 1))
              setDragged(index)
            }} onDragEnd={stopDrag}><GripVertical size={15} /></span>}
          <button type="button" className={`studio-post-choice ${selected === index ? 'selected' : ''}`} aria-current={selected === index ? 'true' : undefined} onClick={() => onSelect(index)}>
            <strong>{title}</strong><span>{post.status === 'draft' ? '本机草稿' : '公开文章'} · {post.publishedAt}</span>
          </button>
          {posts.length > 1 && <div className="studio-order-buttons">
            <button type="button" aria-label={`上移《${title}》`} title="上移" data-move="up" aria-disabled={index === 0} onClick={() => reorder(index, index - 1, 'up')}><ChevronUp size={14} /></button>
            <button type="button" aria-label={`下移《${title}》`} title="下移" data-move="down" aria-disabled={index === posts.length - 1} onClick={() => reorder(index, index + 1, 'down')}><ChevronDown size={14} /></button>
          </div>}
        </li>
      })}
    </ol>
    {!posts.length && <p>点击“写文章”，开始第一篇记录。</p>}
    <span className="sr-only" role="status">{announcement}</span>
  </section>
}
