import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { ArrowUpRight, Sparkles } from 'lucide-react'
import type { HomepageContent, Project, Skill, Social } from '../types/content'
import { BrandIcon, CountUp, Parallax, Reveal, useExperience } from './ui'

function SocialCard({ social, duplicate }: { social: Social; duplicate: boolean }) {
  const { openDetail } = useExperience()
  return <button tabIndex={duplicate ? -1 : 0} className="social-card" style={{ '--social-color': social.color } as CSSProperties} onClick={() => openDetail({ title: social.name, subtitle: social.handle, description: social.description, url: social.url })}>
    <div className="social-card-heading"><strong>{social.handle}</strong><span className="social-platform"><BrandIcon name={social.id} size={17} />{social.name}</span></div>
    <div className="social-metrics">{(social.metrics ?? [{ value: social.metric, unit: social.unit }]).map((metric, index) => <span className="social-metric" key={`${metric.unit}-${index}`}><CountUp value={metric.value} /><span>{metric.unit}</span></span>)}</div>
    <p>{social.description}</p>
  </button>
}

export function Stories({ data }: { data: HomepageContent }) {
  const { profile } = data
  const rows = [profile.socials.slice(0, 3), profile.socials.slice(3)]
  const followers = profile.socials.filter(social => social.unit.toLowerCase() === 'followers').reduce((total, social) => total + social.metric, 0)
  return <Reveal id="influencer" className="stories-section section-space">
    <div className="page-width stories-intro"><p>{profile.intro}</p>{followers > 0 && <p>My stories have attracted approximately <strong className="orange"><CountUp value={followers} /></strong> followers.</p>}<p><mark>{profile.statement}</mark></p></div>
    <div className="marquee-window">{rows.map((row, i) => <div key={i} className={`marquee-row ${i ? 'reverse' : ''}`}><div className="marquee-track">{[0, 1].map(copy => <div className="marquee-group" key={copy} aria-hidden={copy === 1 || undefined}>{row.map(social => <SocialCard key={social.id} social={social} duplicate={copy === 1} />)}</div>)}</div></div>)}</div>
    <div className="page-width stories-outro"><p>{data.copy.stories.title}</p><p className="sr-only">{data.copy.stories.description}</p><a href="#/blog" className="text-link">Read my notes <ArrowUpRight size={17} /></a></div>
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
  const workCard = (project: Project) => <button key={project.id} data-project={project.id} data-tags={project.tags.join(',')} className={`work-card ${active && project.tags.includes(active) ? 'connected' : ''}`} onClick={() => openDetail(project)} onMouseEnter={() => setActive(project.tags[0])} onMouseLeave={() => setActive(null)} onFocus={() => setActive(project.tags[0])} onBlur={() => setActive(null)}><ArrowUpRight size={17} /><span className="work-card-front"><strong>{project.title}</strong><span className="work-card-subtitle">{project.subtitle}</span></span><span className="work-card-description">{project.description}</span></button>
  const skillCard = (skill: Skill, i: number) => <button key={skill.tag} className={`skill-card surface ${active === skill.tag ? 'active' : ''}`} data-skill={skill.tag} onMouseEnter={() => setActive(skill.tag)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(skill.tag)} onBlur={() => setActive(null)} onClick={() => openDetail({ title: skill.name, description: skill.note, tags: data.projects.work.filter(project => project.tags.includes(skill.tag)).map(project => project.title) })}>
    <span className="skill-index">{i + 1}</span><strong>{skill.name}</strong><span className="skill-meter" aria-label={`示例熟练度 ${skill.level} / 10`}>{'█'.repeat(skill.level)}{'░'.repeat(10 - skill.level)}</span><span className="skill-hint">{skill.note}</span>
  </button>
  return <section id="code" className="page-width code-section section-space" ref={root}>
    <Reveal className="work-layout" distance={50}>
      <div className="work-intro surface"><div className="work-intro-copy"><h2><span className="window-mark" aria-hidden="true">{[0, 1, 2, 3].map(i => <i key={i} />)}</span>{data.copy.work.title}</h2><p className="preserve-lines">{data.copy.work.introduction}</p>{data.projects.work.slice(0, 1).map(workCard)}</div></div>
      <div className="open-source surface-dark"><div className="work-stack">{data.projects.work.slice(1).map(workCard)}</div><div className="open-source-copy"><div className="open-source-heading"><span className="code-braces">{`{ }`}</span><h2>{data.copy.work.openSourceTitle}</h2></div><p>{data.copy.work.openSourceLead}</p><p>{data.copy.work.openSourceDescription}</p><span className="source-decoration" aria-hidden="true">&lt;/&gt;</span></div></div>
    </Reveal>
    <Reveal className="skills-grid">{data.skills.slice(0, 8).map(skillCard)}<div className={`skills-tail ${data.skills.length <= 8 ? 'skills-tail-empty' : ''}`}>
      {data.skills.slice(8, 9).map((skill, i) => skillCard(skill, i + 8))}<div className="skill-sign surface-dark"><Parallax offset={25}><span>S<span className="orange">kills</span><Sparkles size={25} /></span></Parallax><small>ALWAYS A WORK IN PROGRESS</small></div>{data.skills.slice(9).map((skill, i) => skillCard(skill, i + 9))}
    </div></Reveal>
    <svg className="skill-connections" aria-hidden="true">{paths.map(path => <path key={path} d={path} />)}</svg>
  </section>
}
