import { useState } from 'react'
import type { CSSProperties } from 'react'
import { Sparkles } from 'lucide-react'
import type { HomepageContent } from '../types/content'
import { CountUp, Parallax, ProjectCard, Reveal, useExperience } from './ui'

export function GamesSection({ data }: { data: HomepageContent }) {
  return <Reveal id="game" className="page-width games-section section-space">
    <div className="jam-column surface"><h3><span className="orange">Games</span> I made for fun</h3>{data.projects.games.slice(0, 3).map(project => <ProjectCard key={project.id} project={project} compact />)}</div>
    <div className="games-right"><div className="company-games surface"><h3><span className="orange">Games</span> & bigger experiments</h3><div className="company-covers">{data.projects.games.slice(3).map(project => <ProjectCard key={project.id} project={project} />)}</div></div><div className="game-type surface-dark"><Parallax offset={45}><h2>Game <span>+</span> Code</h2></Parallax><span className="tiny-caption">SERIOUS ABOUT PLAY.</span></div></div>
  </Reveal>
}

export function EssaysSection({ data }: { data: HomepageContent }) {
  const topics = data.copy.essays.topics
  const [topic, setTopic] = useState<string | null>(null)
  const filtered = topic ? data.projects.essays.filter(project => project.tags.includes(topic)) : data.projects.essays
  return <Reveal id="video" className="page-width essays-section section-space">
    <div className="essay-intro"><h3>{data.copy.essays.title}</h3><div className="essay-identity surface-dark"><div className="essay-profile"><span className="mini-avatar">{data.profile.avatarImage ? <img src={data.profile.avatarImage} alt="" loading="lazy" /> : data.profile.name[0]}</span><span>{data.copy.essays.name}</span></div>{data.copy.essays.metrics && <div className="essay-metrics">{data.copy.essays.metrics.map((metric, index) => <span key={`${metric.unit}-${index}`}><CountUp value={metric.value} /> {metric.unit}</span>)}</div>}</div><div className="essay-copy surface"><p className="preserve-lines">{data.copy.essays.introduction}</p><p>{data.copy.essays.description}</p><small>THINGS I KEEP THINKING ABOUT</small><div className="topic-tags">{topics.map(item => <button key={item} className={topic === item ? 'selected' : ''} aria-pressed={topic === item} onClick={() => setTopic(topic === item ? null : item)}>{item}</button>)}</div></div></div>
    <div className="essay-grid surface" aria-live="polite">{filtered.map(project => <div className="essay-item" key={project.id}><ProjectCard project={project} /></div>)}{filtered.length === 0 && <p className="empty-state">这个主题的内容还在酝酿中。</p>}</div>
  </Reveal>
}

export function MusicSection({ data }: { data: HomepageContent }) {
  return <Reveal id="music" className="page-width music-section section-space">
    {data.copy.music.decorations?.map((image, index) => <Parallax key={image} className={`synth-decoration ${index ? 'synth-decoration-secondary' : ''}`} range={index ? [0, -500] : [0, 200]}><img src={image} alt="" loading="lazy" /></Parallax>)}
    <div className="music-layout">
      <div className="music-sidebar"><div className="music-about surface-dark"><p>{data.copy.music.introduction}</p><p className="preserve-lines">{data.copy.music.description}</p></div><div className="gear-list surface"><strong>My Gears:</strong>{data.copy.music.gear.map(item => <span key={item}>{item}</span>)}</div></div>
      <div className="music-stack">
        <div className="band-tile surface"><div className="music-label surface-dark"><h3>Band</h3></div><div className="band-projects">{data.projects.music.slice(0, 1).map(project => <ProjectCard key={project.id} project={project} />)}</div></div>
        <div className="sound-tile surface"><div className="sound-projects">{data.projects.music.slice(1, 3).map(project => <ProjectCard key={project.id} project={project} />)}</div><div className="music-code surface-dark"><h2>Code <span>+</span><br />Music</h2></div></div>
        <div className="synth-tile surface"><div className="music-label surface-dark"><h3>Synthesizer</h3></div><div className="synth-projects">{data.projects.music.slice(data.projects.music.length > 3 ? 3 : 2).map(project => <ProjectCard key={project.id} project={project} />)}</div></div>
      </div>
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
    <div className="books-heading"><div className="book-tabs" role="tablist" aria-label="书架分类">{categories.map(category => <button role="tab" key={category} id={`book-tab-${category.replaceAll(' ', '-')}`} aria-controls="books-panel" aria-selected={current === category} tabIndex={current === category ? 0 : -1} onKeyDown={event => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return
      event.preventDefault()
      const index = categories.indexOf(category)
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? categories.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + categories.length) % categories.length
      setSelected(categories[next]); document.getElementById(`book-tab-${categories[next].replaceAll(' ', '-')}`)?.focus()
    }} onClick={() => setSelected(category)}>{category}<sup>{data.books.filter(book => book.category === category).length}</sup></button>)}</div><div className="reading-copy surface-dark"><h2>Reading List</h2><p className="preserve-lines">{data.copy.reading.introduction}<br />{data.copy.reading.description}</p></div></div>
    <div className="books-display" role="tabpanel" id="books-panel" aria-labelledby={current ? `book-tab-${current.replaceAll(' ', '-')}` : undefined} aria-label={current ? undefined : '书架'}>
      {filtered.map(book => <button key={book.title} className="book-object" style={{ '--book-color': book.color } as CSSProperties} onClick={() => openDetail({ title: book.title, subtitle: book.author, description: '这是一本虚构的占位书籍，用来展示你的书架。之后可以在配置文件中填写真实书名、作者、封面和阅读笔记。', tags: [book.category] })}><span className="book-cover"><span className="book-kicker">THE PERSONAL LIBRARY</span><span className="book-title">{book.title}</span><span className="book-art"><Sparkles size={46} strokeWidth={1} /></span><span className="book-subtitle">{book.subtitle}</span><span className="book-author">{book.author}</span></span><span className="book-pages" /></button>)}
      {filtered.length === 0 && <p className="empty-state">A new chapter is waiting.</p>}
    </div>
  </Reveal>
}
