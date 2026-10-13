import { useState } from 'react'
import type { CSSProperties } from 'react'
import { ArrowUpRight, BookOpen, Headphones, Music2, Sparkles } from 'lucide-react'
import type { HomepageContent } from '../types/content'
import { Artwork } from '../Artwork'
import { Parallax, ProjectCard, Reveal, useExperience } from './ui'

export function GamesSection({ data }: { data: HomepageContent }) {
  return <Reveal id="game" className="page-width games-section section-space">
    <div className="jam-column surface"><h3><span className="orange">Games</span> I made for fun</h3>{data.projects.games.slice(0, 3).map(project => <ProjectCard key={project.id} project={project} compact />)}</div>
    <div className="games-right"><div className="company-games surface"><h3><span className="orange">Games</span> & bigger experiments</h3><div className="company-covers">{data.projects.games.slice(3).map(project => <ProjectCard key={project.id} project={project} />)}</div></div><div className="game-type surface-dark"><Parallax offset={45}><h2>Game <span>+</span> Code</h2></Parallax><span className="tiny-caption">SERIOUS ABOUT PLAY.</span></div></div>
  </Reveal>
}

export function EssaysSection({ data }: { data: HomepageContent }) {
  const { openDetail } = useExperience()
  const topics = data.copy.essays.topics
  const [topic, setTopic] = useState<string | null>(null)
  const filtered = topic ? data.projects.essays.filter(project => project.tags.includes(topic)) : data.projects.essays
  return <Reveal id="video" className="page-width essays-section section-space">
    <div className="essay-intro surface"><h3>{data.copy.essays.title}</h3><div className="essay-identity surface-dark"><span className="mini-avatar">{data.profile.name[0]}<span>✳</span></span><span>{data.copy.essays.name}<small>IDEAS, EXPLAINED.</small></span></div><p className="preserve-lines">{data.copy.essays.introduction}</p><p>{data.copy.essays.description}</p><small>THINGS I KEEP THINKING ABOUT</small><div className="topic-tags">{topics.map(item => <button key={item} className={topic === item ? 'selected' : ''} aria-pressed={topic === item} onClick={() => setTopic(topic === item ? null : item)}>{item}</button>)}</div></div>
    <div className="essay-grid surface" aria-live="polite">{filtered.map(project => <div className="essay-item" key={project.id}><ProjectCard project={project} /><button className="essay-caption" onClick={() => openDetail(project)}>{project.title}<ArrowUpRight size={15} /></button></div>)}{filtered.length === 0 && <p className="empty-state">这个主题的内容还在酝酿中。</p>}</div>
  </Reveal>
}

export function MusicSection({ data }: { data: HomepageContent }) {
  return <Reveal id="music" className="page-width music-section section-space">
    <Parallax className="synth-decoration" offset={100}><Artwork kind="studio" /></Parallax>
    <div className="music-intro"><Headphones size={30} strokeWidth={1.3} /><p>Some things are better<br />said with <span className="orange">music.</span></p><span>LESS THINKING. MORE LISTENING.</span></div>
    <div className="music-mosaic">
      <div className="music-about surface"><p>{data.copy.music.introduction}</p><p className="preserve-lines">{data.copy.music.description}</p><div className="gear-list"><strong>On my desk</strong>{data.copy.music.gear.map(item => <span key={item}>{item}</span>)}</div></div>
      <div className="band-tile surface"><h3>Band<span><Music2 size={24} /></span></h3>{data.projects.music.slice(0, 1).map(project => <ProjectCard key={project.id} project={project} />)}</div>
      <div className="music-code surface-dark"><Parallax offset={30}><h2>Code<br /><span>+</span><br />Music</h2></Parallax><span className="sound-bars" aria-hidden="true">{Array.from({ length: 12 }, (_, i) => <i key={i} style={{ '--bar-delay': `${-i * .16}s`, '--bar-height': `${12 + i * 13 % 43}px` } as CSSProperties} />)}</span></div>
      <div className="sound-tile surface">{data.projects.music.slice(1, 2).map(project => <ProjectCard key={project.id} project={project} />)}<span className="sound-label">A loop. A melody. A happy accident.</span></div>
      <div className="synth-tile surface"><h3>Synthesizer</h3>{data.projects.music.slice(2).map(project => <ProjectCard key={project.id} project={project} />)}</div>
    </div>
  </Reveal>
}

export function BooksSection({ data }: { data: HomepageContent }) {
  const { openDetail } = useExperience()
  const categories = [...new Set(data.books.map(book => book.category))]
  const [selected, setSelected] = useState(categories[0] ?? '')
  const current = categories.includes(selected) ? selected : categories[0]
  const filtered = data.books.filter(book => book.category === current)
  return <Reveal id="books" className="page-width books-section section-space">
    <div className="book-tabs" role="tablist" aria-label="书架分类">{categories.map(category => <button role="tab" key={category} id={`book-tab-${category.replaceAll(' ', '-')}`} aria-controls="books-panel" aria-selected={current === category} tabIndex={current === category ? 0 : -1} onKeyDown={event => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      const index = categories.indexOf(category)
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? categories.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + categories.length) % categories.length
      setSelected(categories[next]); document.getElementById(`book-tab-${categories[next].replaceAll(' ', '-')}`)?.focus()
    }} onClick={() => setSelected(category)}>{category}<sup>{data.books.filter(book => book.category === category).length}</sup></button>)}</div>
    <div className="books-layout"><div className="books-display" role="tabpanel" id="books-panel" aria-labelledby={`book-tab-${current?.replaceAll(' ', '-')}`}>
      {filtered.map(book => <button key={book.title} className="book-object" style={{ '--book-color': book.color } as CSSProperties} onClick={() => openDetail({ title: book.title, subtitle: book.author, description: '这是一本虚构的占位书籍，用来展示你的书架。之后可以在配置文件中填写真实书名、作者、封面和阅读笔记。', tags: [book.category] })}><span className="book-cover"><span className="book-kicker">THE PERSONAL LIBRARY</span><span className="book-title">{book.title}</span><span className="book-art"><Sparkles size={46} strokeWidth={1} /></span><span className="book-subtitle">{book.subtitle}</span><span className="book-author">{book.author}</span></span><span className="book-pages" /></button>)}
      {filtered.length === 0 && <p className="empty-state">A new chapter is waiting.</p>}
    </div><div className="reading-copy surface-dark"><BookOpen size={29} strokeWidth={1.4} /><h2>Reading List</h2><p className="preserve-lines">{data.copy.reading.introduction}</p><p className="preserve-lines">{data.copy.reading.description}</p><small>{data.isDemo ? '示例书架 · 点击书籍查看' : 'ONE PAGE AT A TIME.'}</small></div></div>
  </Reveal>
}
