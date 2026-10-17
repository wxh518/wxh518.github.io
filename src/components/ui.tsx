import { createContext, useContext, useEffect, useRef } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { motion, useInView, useMotionValue, useSpring, useTransform } from 'motion/react'
import { ArrowUpRight, BookOpen, Github, Instagram, Music2, Radio, X } from 'lucide-react'
import { Artwork } from '../Artwork'
import type { Project } from '../types/content'

export interface Detail { title: string; subtitle?: string; description?: string; tags?: string[]; art?: Project['art']; image?: string; url?: string; children?: ReactNode }
export const ExperienceContext = createContext<{ animated: boolean; openDetail: (detail: Detail) => void }>({ animated: true, openDetail: () => {} })
export const useExperience = () => useContext(ExperienceContext)

export function BrandIcon({ name, size = 22 }: { name: string; size?: number }) {
  if (name === 'github') return <Github size={size} />
  if (name === 'instagram') return <Instagram size={size} />
  if (name === 'book') return <BookOpen size={size} />
  if (name === 'music') return <Music2 size={size} />
  if (name === 'twitter') return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M22 5.8a8.2 8.2 0 0 1-2.4.7 4.1 4.1 0 0 0 1.8-2.3 8.2 8.2 0 0 1-2.6 1 4.1 4.1 0 0 0-7 3.7A11.6 11.6 0 0 1 3.4 4.6a4.1 4.1 0 0 0 1.3 5.5 4.1 4.1 0 0 1-1.9-.5 4.1 4.1 0 0 0 3.3 4 4.2 4.2 0 0 1-1.8.1 4.1 4.1 0 0 0 3.8 2.9A8.2 8.2 0 0 1 2 18.3a11.6 11.6 0 0 0 17.9-9.8v-.6A8 8 0 0 0 22 5.8Z" /></svg>
  if (name === 'bilibili') return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><rect x="3" y="6" width="18" height="14" rx="3" /><path d="m7 2 4 4m6-4-4 4M8 11v3m8-3v3m-6 3 2 1 2-1" /></svg>
  return <Radio size={size} />
}

export function Reveal({ children, className = '', id, delay = 0, distance = 30 }: { children: ReactNode; className?: string; id?: string; delay?: number; distance?: number }) {
  const { animated } = useExperience()
  return <motion.section id={id} className={className} initial={animated ? { opacity: 0, y: distance, scale: .95 } : false} whileInView={{ opacity: 1, y: 0, scale: 1 }} viewport={{ once: true, margin: '0px 0px -35px 0px' }} animate={!animated ? { opacity: 1, y: 0, scale: 1 } : undefined} transition={{ duration: .75, delay, ease: [.22, 1, .36, 1] }}>{children}</motion.section>
}

export function CountUp({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const visible = useInView(ref, { once: true })
  const { animated } = useExperience()
  const count = useMotionValue(0)
  const spring = useSpring(count, { stiffness: 45, damping: 20 })
  const display = useTransform(spring, latest => Math.round(latest).toLocaleString('en-US'))
  useEffect(() => { if (visible) count.set(value) }, [visible, value, count])
  return <span ref={ref}>{animated ? <motion.span>{display}</motion.span> : value.toLocaleString('en-US')}</span>
}

export function ProjectCard({ project, className = '', compact = false }: { project: Project; className?: string; compact?: boolean }) {
  const { openDetail } = useExperience()
  return <button className={`project-card ${compact ? 'compact' : ''} ${className}`} onClick={() => openDetail(project)} aria-label={`查看项目：${project.title}`}>
    {project.image ? <img src={project.image} alt={project.title} loading="lazy" /> : <Artwork kind={project.art} />}
    <span className="project-overlay"><span className="project-title">{project.title}</span><span className="project-subtitle">{project.subtitle}</span><span className="project-arrow"><ArrowUpRight size={20} /></span></span>
    <span className="cover-label">{project.title}<ArrowUpRight size={14} /></span>
  </button>
}

export function DetailDialog({ detail, onClose }: { detail: Detail | null; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    if (!dialog || !detail) return
    const previousOverflow = document.body.style.overflow
    dialog.showModal()
    document.body.style.overflow = 'hidden'
    return () => { dialog.close(); document.body.style.overflow = previousOverflow }
  }, [detail])
  return <dialog ref={ref} className="detail-dialog" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }} aria-labelledby="dialog-title">
    {detail && <div className="dialog-body">
      <button className="dialog-close icon-button" aria-label="关闭详情" onClick={onClose}><X size={22} /></button>
      {detail.image ? <img className="dialog-art" src={detail.image} alt={detail.title} /> : detail.art && <Artwork className="dialog-art" kind={detail.art} />}
      <div className="dialog-copy"><span className="eyebrow">A LITTLE MORE ABOUT</span><h2 id="dialog-title">{detail.title}</h2>{detail.subtitle && <p className="dialog-subtitle">{detail.subtitle}</p>}{detail.description && <p className="chinese-copy">{detail.description}</p>}{detail.tags && <div className="tags">{detail.tags.map(tag => <span key={tag}>{tag}</span>)}</div>}{detail.children}{detail.url && /^(https?:\/\/)/i.test(detail.url) ? <a className="text-link" href={detail.url} target="_blank" rel="noreferrer">Explore project <ArrowUpRight size={16} /></a> : <p className="demo-note">示例内容 · 在配置文件中替换为你的真实资料</p>}</div>
    </div>}
  </dialog>
}

export function Parallax({ children, className = '', offset = 60, range }: { children: ReactNode; className?: string; offset?: number; range?: [number, number] }) {
  const ref = useRef<HTMLDivElement>(null)
  const y = useMotionValue(0)
  const smooth = useSpring(y, { stiffness: 65, damping: 24 })
  const { animated } = useExperience()
  const start = range?.[0], end = range?.[1]
  useEffect(() => {
    if (!animated) { y.set(0); return }
    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const box = ref.current?.getBoundingClientRect()
        if (!box) return
        const top = box.top - smooth.get()
        if (start !== undefined && end !== undefined) {
          const progress = Math.max(0, Math.min(1, (window.innerHeight - top) / (window.innerHeight + box.height)))
          y.set(start + (end - start) * progress)
        } else if (top < window.innerHeight && top + box.height > 0) y.set(((top + box.height / 2) / window.innerHeight - .5) * offset)
      })
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); cancelAnimationFrame(frame) }
  }, [animated, offset, y, smooth, start, end])
  return <motion.div ref={ref} className={className} style={{ y: animated ? smooth : 0 }}>{children}</motion.div>
}

export function OrbitIcon({ type, style, initial = 'Y', image }: { type: 'edge' | 'chrome' | 'ethereum' | 'avatar'; style?: CSSProperties; initial?: string; image?: string }) {
  if (type !== 'avatar') return <span className={`orbit-icon ${type}-orb`} style={style}><img src={`./images/orbit/${type === 'edge' ? 'edge.png' : `${type}.svg`}`} alt="" draggable={false} /></span>
  return <span className="orbit-icon avatar-orb" style={style}>{image ? <img src={image} alt="" draggable={false} /> : <span>{initial}<span className="avatar-spark">✳</span></span>}</span>
}
