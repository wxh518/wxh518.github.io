import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import type { HomepageContent, Project, Social } from '../types/content'
import { BrandIcon, CountUp, Parallax, Reveal, useExperience } from './ui'

function SocialCard({ social, duplicate }: { social: Social; duplicate: boolean }) {
  const { openDetail } = useExperience()
  return <button tabIndex={duplicate ? -1 : 0} className="social-card" onClick={() => openDetail({ title: social.name, subtitle: social.handle, description: social.description, url: social.url })}>
    <div className="flex items-center gap-3"><span className="social-avatar" style={{ color: social.color }}><BrandIcon name={social.id} size={26} /></span><div><strong>{social.handle}</strong><span className="social-platform">{social.name}</span></div><ArrowUpRight className="social-arrow" size={17} /></div>
    <div className="social-metric"><CountUp value={social.metric} /><span>{social.unit}</span></div>
    <p>{social.description}</p>
  </button>
}

export function Stories({ data }: { data: HomepageContent }) {
  const { profile } = data
  const rows = [profile.socials.slice(0, 3), profile.socials.slice(3)]
  return <Reveal id="influencer" className="stories-section section-space">
    <div className="page-width stories-intro"><p>{profile.intro.split(/(#[\w-]+)/g).map((part, i) => part.startsWith('#') ? <span className="highlight" key={i}>{part}</span> : part)}</p><p>{profile.statement}</p><span className="demo-note">{data.isDemo ? 'DEMO CONTENT · 示例账号与数据' : 'FIND ME AROUND THE INTERNET'}</span></div>
    <div className="marquee-window">{rows.map((row, i) => <div key={i} className={`marquee-row ${i ? 'reverse' : ''}`}><div className="marquee-track">{[0, 1].map(copy => <div className="marquee-group" key={copy} aria-hidden={copy === 1 || undefined}>{row.map(social => <SocialCard key={social.id} social={social} duplicate={copy === 1} />)}</div>)}</div></div>)}</div>
    <div className="page-width stories-outro"><p>{data.copy.stories.title}</p><p>{data.copy.stories.description}</p><a href="#/blog" className="text-link">Read my notes <ArrowUpRight size={17} /></a></div>
  </Reveal>
}

export function CodeSection({ data }: { data: HomepageContent }) {
  const { openDetail } = useExperience()
  const [active, setActive] = useState<string | null>(null)
  const [paths, setPaths] = useState<string[]>([])
  const root = useRef<HTMLElement>(null)
  useEffect(() => {
    const measure = () => {
      const container = root.current
      if (!container || !active || !window.matchMedia('(min-width: 900px)').matches) { setPaths([]); return }
      const origin = container.querySelector<HTMLElement>(`[data-skill="${CSS.escape(active)}"]`)
      if (!origin) return
      const parent = container.getBoundingClientRect()
      const source = origin.getBoundingClientRect()
      const targets = [...container.querySelectorAll<HTMLElement>('[data-project]')].filter(el => el.dataset.tags?.split(',').includes(active))
      setPaths(targets.map(target => {
        const box = target.getBoundingClientRect()
        const x1 = source.x + source.width / 2 - parent.x
        const y1 = source.y - parent.y + 2
        const x2 = box.x + box.width / 2 - parent.x
        const y2 = box.bottom - parent.y - 2
        const middle = (y1 + y2) / 2
        return `M${x1},${y1} C${x1},${middle} ${x2},${middle} ${x2},${y2}`
      }))
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [active])
  const workCard = (project: Project) => <button key={project.id} data-project={project.id} data-tags={project.tags.join(',')} className={`work-card ${active && project.tags.includes(active) ? 'connected' : ''}`} onClick={() => openDetail(project)} onMouseEnter={() => setActive(project.tags[0])} onMouseLeave={() => setActive(null)} onFocus={() => setActive(project.tags[0])} onBlur={() => setActive(null)}><ArrowUpRight size={17} /><strong>{project.title}</strong><p>{project.subtitle}</p><span className="work-extra">{project.tags.join(' / ')}</span></button>
  return <section id="code" className="page-width code-section section-space" ref={root}>
    <Reveal className="work-layout">
      <div className="work-intro surface"><h2>{data.copy.work.title}</h2><p className="preserve-lines">{data.copy.work.introduction}</p>{data.projects.work.slice(0, 1).map(workCard)}</div>
      <div className="open-source surface-dark"><div className="work-stack">{data.projects.work.slice(1).map(workCard)}</div><div className="open-source-copy"><div className="open-source-heading"><span className="code-braces">{`{ }`}</span><h2>{data.copy.work.openSourceTitle}</h2></div><p>{data.copy.work.openSourceLead}</p><p>{data.copy.work.openSourceDescription}</p><span className="source-decoration" aria-hidden="true">&lt;/&gt;</span></div></div>
    </Reveal>
    <Reveal className="skills-grid">{data.skills.map((skill, i) => <button key={skill.tag} className={`skill-card surface ${active === skill.tag ? 'active' : ''}`} data-skill={skill.tag} onMouseEnter={() => setActive(skill.tag)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(skill.tag)} onBlur={() => setActive(null)} onClick={() => openDetail({ title: skill.name, description: skill.note, tags: data.projects.work.filter(project => project.tags.includes(skill.tag)).map(project => project.title) })}>
      <span className="skill-index">0{i + 1}</span><strong>{skill.name}</strong><span className="skill-meter" aria-label={`示例熟练度 ${skill.level} / 10`}>{Array.from({ length: 10 }, (_, index) => <i key={index} className={index < skill.level ? 'filled' : ''} />)}</span><span className="skill-hint">{skill.note}</span>
    </button>)}<div className="skill-sign surface-dark"><Parallax offset={25}><span>S<span className="orange">kills</span><Sparkles size={25} /></span></Parallax><small>ALWAYS A WORK IN PROGRESS</small></div></Reveal>
    <svg className="skill-connections" aria-hidden="true">{paths.map(path => <path key={path} d={path} />)}</svg>
  </section>
}
