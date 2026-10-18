import { useCallback, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MarkdownContent } from '../components/MarkdownContent'
import { ArrowLeft, ArrowUpRight, Search } from 'lucide-react'
import { useContent } from '../hooks/useContent'
import { contentService } from '../services/content-service'
import { Reveal } from '../components/ui'
import { ContentState, NotFound } from '../components/ContentState'

const loadPosts = (signal: AbortSignal) => contentService.getPosts(signal)
export function BlogList({ isDemo = false }: { isDemo?: boolean }) {
  const { data, loading, error, retry } = useContent(loadPosts)
  const [query, setQuery] = useState('')
  const [tag, setTag] = useState('All')
  const tags = useMemo(() => ['All', ...new Set(data?.flatMap(post => post.tags) ?? [])], [data])
  const posts = useMemo(() => data?.filter(post => (tag === 'All' || post.tags.includes(tag)) && `${post.title} ${post.description} ${post.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)) ?? [], [data, query, tag])
  if (loading || error || !data) return <ContentState loading={loading} error={error} retry={retry} />
  return <main className="blog-page page-width"><Link className="text-link back-link" to="/"><ArrowLeft size={16} /> Back to my universe</Link><Reveal className="blog-heading"><span className="eyebrow">A PUBLIC NOTEBOOK</span><h1>Notes & <span className="orange">thoughts.</span></h1><p>Things I've learned. Things I'm still figuring out.</p></Reveal><div className="blog-toolbar"><div className="topic-tags">{tags.map(item => <button key={item} onClick={() => setTag(item)} aria-pressed={item === tag} className={item === tag ? 'selected' : ''}>{item}</button>)}</div><label className="blog-search"><Search size={17} /><input aria-label="搜索文章" placeholder="搜索文章…" value={query} onChange={event => setQuery(event.target.value)} /></label></div><div className="post-list" aria-live="polite">{posts.map((post, i) => <Link to={`/blog/${post.slug}`} key={post.slug} className="post-row"><span className="post-number">0{i + 1}</span><div><div className="post-meta"><time dateTime={post.publishedAt}>{post.publishedAt.replaceAll('-', '.')}</time><span>{post.readingMinutes} MIN READ</span></div><h2>{post.title}</h2><p>{post.description}</p><div className="post-tags">{post.tags.map(value => <span key={value}>#{value}</span>)}</div></div><ArrowUpRight size={25} /></Link>)}{posts.length === 0 && <div className="empty-state"><p>没有找到对应的文章。</p><button className="text-link" onClick={() => { setQuery(''); setTag('All') }}>清除筛选</button></div>}</div>{isDemo && <p className="demo-note">示例文章 · 数据与 Markdown 正文可替换为接口返回内容</p>}</main>
}

export function BlogPost() {
  const { slug = '' } = useParams()
  const loadPost = useCallback((signal: AbortSignal) => contentService.getPost(slug, signal), [slug])
  const { data, loading, error, retry } = useContent(loadPost)
  if (loading || error) return <ContentState loading={loading} error={error} retry={retry} />
  if (!data) return <NotFound message="这篇文章还没有来到这里。" />
  return <main className="article-page"><Link className="text-link back-link" to="/blog"><ArrowLeft size={16} /> All notes</Link><header className="article-heading"><div className="post-meta"><time dateTime={data.publishedAt}>{data.publishedAt}</time><span>{data.readingMinutes} MIN READ</span></div><h1>{data.title}</h1><p>{data.description}</p><div className="tags">{data.tags.map(tag => <Link to="/blog" key={tag}>{tag}</Link>)}</div></header><article className="markdown-body"><MarkdownContent>{data.body}</MarkdownContent></article><div className="article-end"><span>✳</span><p>Thanks for spending a little time here.</p><Link className="text-link" to="/blog">继续阅读 <ArrowUpRight size={16} /></Link></div></main>
}
