import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { HashRouter, Link, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { MotionConfig, useReducedMotion } from 'motion/react'
import { ArrowUp, ArrowUpRight, Menu, Pause, Play, Sparkles, X } from 'lucide-react'
import { Hero } from './components/Hero'
import { CodeSection, Stories } from './components/StoriesAndCode'
import { BooksSection, EssaysSection, GamesSection, MusicSection } from './components/Showcase'
import { Statistics } from './components/Statistics'
import { BrandIcon, DetailDialog, ExperienceContext, Reveal } from './components/ui'
import type { Detail } from './components/ui'
import { ContentState, NotFound } from './components/ContentState'
import { useContent } from './hooks/useContent'
import { contentService } from './services/content-service'
import type { HomepageContent, SectionId } from './types/content'
import { scrollToSection } from './lib/navigation'

const loadHomepage = (signal: AbortSignal) => contentService.getHomepage(signal)
const BlogList = lazy(() => import('./pages/Blog').then(module => ({ default: module.BlogList })))
const BlogPost = lazy(() => import('./pages/Blog').then(module => ({ default: module.BlogPost })))
const Admin = lazy(() => import.meta.env.VITE_CONTENT_SOURCE === 'http' ? import('./pages/Admin') : import('./pages/StaticAdmin'))
const AdminPreview = lazy(() => import('./pages/AdminPreview'))
const sectionComponents = { influencer: Stories, code: CodeSection, game: GamesSection, video: EssaysSection, music: MusicSection, statistics: Statistics, books: BooksSection }

export function Home({ data }: { data: HomepageContent }) {
  return <main id="main"><p className="mobile-view-note">View on desktop for better experience.</p><Hero profile={data.profile} />{data.sections.filter(section => section.enabled).map(section => {
    const Component = sectionComponents[section.id]
    return Component ? <Component key={section.id} data={data} /> : null
  })}<Reveal className="page-width closing-section"><span className="eyebrow">THE NEXT CHAPTER</span><p>{data.profile.contact}</p></Reveal></main>
}

function Site() {
  const { data, loading, error, retry } = useContent(loadHomepage)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState('')
  const [paused, setPaused] = useState(() => { try { return localStorage.getItem('orbit-motion-paused') === 'true' } catch { return false } })
  const reduced = useReducedMotion()
  const animated = !paused && !reduced
  const location = useLocation()
  const navigate = useNavigate()
  const experience = useMemo(() => ({ animated, openDetail: setDetail }), [animated])
  useEffect(() => {
    document.documentElement.classList.toggle('motion-paused', !animated)
    try { localStorage.setItem('orbit-motion-paused', String(paused)) } catch { /* Storage can be disabled. */ }
  }, [animated, paused])
  useEffect(() => {
    setMenuOpen(false)
    const frame = requestAnimationFrame(() => {
      const target = (location.state as { section?: string } | null)?.section
      if (target && location.pathname === '/') scrollToSection(target, animated)
      else window.scrollTo({ top: 0, behavior: 'instant' })
    })
    return () => cancelAnimationFrame(frame)
  }, [location.pathname, location.state, data])
  useEffect(() => {
    if (!data || location.pathname !== '/') { setActive(''); return }
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) setActive(entry.target.id) })
    }, { rootMargin: '-15% 0px -65% 0px', threshold: 0 })
    document.querySelectorAll('#home, main > section[id]').forEach(element => observer.observe(element))
    return () => observer.disconnect()
  }, [data, location.pathname])
  const goTo = (section: SectionId) => {
    setMenuOpen(false)
    if (location.pathname === '/') scrollToSection(section, animated)
    else navigate('/', { state: { section } })
  }
  if (loading || error || !data) return <ContentState loading={loading} error={error} retry={retry} />
  const contact = () => setDetail({ title: "Let's make something interesting.", subtitle: 'SAY HELLO', description: data.profile.email ? `你可以通过 ${data.profile.email} 联系我。` : '这里将显示你的邮箱和联系方式。当前使用占位内容，尚未配置真实联系地址。', children: data.profile.email ? <a className="text-link" href={`mailto:${data.profile.email}`}>{data.profile.email}<ArrowUpRight size={18} /></a> : undefined })
  return <ExperienceContext.Provider value={experience}><MotionConfig reducedMotion={animated ? 'user' : 'always'}><div className={`site ${animated ? '' : 'paused'}`}>
    <a className="skip-link" href="#page-content" onClick={event => { event.preventDefault(); document.getElementById('page-content')?.focus() }}>跳到主要内容</a>
    <header className="site-header"><div className="nav-inner"><Link to="/" className="wordmark" onClick={() => window.scrollTo({ top: 0, behavior: animated ? 'smooth' : 'instant' })}>{data.profile.name}</Link><nav className={`main-nav ${menuOpen ? 'menu-open' : ''}`} aria-label="主要导航"><button className="favorites-link" onClick={() => { setMenuOpen(false); setDetail({ title: 'A cabinet of curiosities', subtitle: 'FAVORITES & INSPIRATIONS', description: '一些书，一些想法，以及让人重新看待世界的小小瞬间。这里预留给你的收藏和灵感记录。', children: <div className="favorites-list">{data.books.map((book, i) => <div key={book.title}><span>0{i + 1}</span><strong>{book.title}</strong><small>{book.subtitle}</small></div>)}</div> }) }}><Sparkles size={16} />Favorites</button>{data.sections.filter(section => section.enabled && section.inNavigation).map(section => <button key={section.id} className={active === section.id ? 'nav-active' : ''} onClick={() => goTo(section.id)}>{section.label}</button>)}<Link className={location.pathname.startsWith('/blog') ? 'nav-active' : ''} to="/blog">Blog<span className="blog-dot" /></Link></nav><div className="header-actions"><div className="header-socials">{data.profile.socials.slice(0, 4).map(social => <button className="icon-button" key={social.id} aria-label={social.name} onClick={() => setDetail({ title: social.name, subtitle: social.handle, description: social.description, url: social.url })}><BrandIcon name={social.id} size={21} /></button>)}</div><span className="header-separator" /><button className="icon-button motion-toggle" aria-label={animated ? '暂停动画' : reduced ? '系统已启用减少动态效果' : '播放动画'} title={animated ? '暂停动画' : reduced ? '跟随系统：减少动态效果' : '播放动画'} aria-pressed={!animated} disabled={Boolean(reduced)} onClick={() => setPaused(value => !value)}>{animated ? <Pause size={16} /> : <Play size={16} />}</button><button className="menu-toggle icon-button" aria-label={menuOpen ? '关闭菜单' : '打开菜单'} aria-expanded={menuOpen} onClick={() => setMenuOpen(value => !value)}>{menuOpen ? <X /> : <Menu />}</button></div></div></header>
    <div id="page-content" tabIndex={-1}><Suspense fallback={<ContentState loading error={null} retry={retry} />}><Routes><Route path="/" element={<Home data={data} />} /><Route path="/blog" element={<BlogList isDemo={data.isDemo} />} /><Route path="/blog/:slug" element={<BlogPost />} /><Route path="*" element={<NotFound />} /></Routes></Suspense></div>
    <footer className="site-footer page-width">
      <div className="footer-top"><Link to="/" className="wordmark">{data.profile.name}<span> & a little curiosity.</span></Link><button className="text-link" onClick={contact}>Say hello <ArrowUpRight size={20} /></button></div>
      <div className="footer-socials">{data.profile.socials.slice(0, 4).map(social => <button className="icon-button" key={social.id} aria-label={social.name} onClick={() => setDetail({ title: social.name, subtitle: social.handle, description: social.description, url: social.url })}><BrandIcon name={social.id} size={24} /></button>)}</div>
      <div className="footer-bottom"><span>{data.isDemo ? 'DEMO · 内容与数据均为占位示例' : data.profile.tagline}</span><span>Made with curiosity <span className="orange">✳</span></span><button className="back-to-top" onClick={() => window.scrollTo({ top: 0, behavior: animated ? 'smooth' : 'instant' })}>Back to top<ArrowUp size={14} /></button></div>
      <p className="footer-credit">页面设计参考 <a href="https://www.qzq.at/" target="_blank" rel="noopener noreferrer">SamuelQZQ 的个人主页</a>，本站代码独立实现。</p>
    </footer>
    <DetailDialog detail={detail} onClose={() => setDetail(null)} />
  </div></MotionConfig></ExperienceContext.Provider>
}

export default function App() { return <HashRouter><Suspense fallback={<ContentState loading error={null} retry={() => window.location.reload()} />}><Routes><Route path="/admin" element={<Admin />} /><Route path="/preview" element={<AdminPreview />} /><Route path="*" element={<Site />} /></Routes></Suspense></HashRouter> }
