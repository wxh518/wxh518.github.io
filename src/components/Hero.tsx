import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { AnimatePresence, motion, useMotionValue, useSpring } from 'motion/react'
import type { Profile } from '../types/content'
import { OrbitIcon, useExperience } from './ui'
import { scrollToSection } from '../lib/navigation'

export function Hero({ profile }: { profile: Profile }) {
  const { animated } = useExperience()
  const [nameIndex, setNameIndex] = useState(0)
  const card = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const rotateX = useSpring(x, { stiffness: 160, damping: 22 })
  const rotateY = useSpring(y, { stiffness: 160, damping: 22 })
  const names = profile.names.length ? profile.names : [profile.name]
  const currentName = animated ? names[nameIndex % names.length] : profile.name
  const nameUnits = Array.from(currentName).reduce((total, letter) => total + (/[^\x00-\xff]/.test(letter) ? 1 : .62), 0)
  useEffect(() => {
    if (!animated) { x.set(0); y.set(0); return }
    const timer = window.setInterval(() => setNameIndex(value => (value + 1) % names.length), 4200)
    return () => clearInterval(timer)
  }, [animated, names.length, x, y])
  return <section className="hero" id="home" aria-label="个人介绍">
    <div className="hero-glow" />
    <div className="hero-universe">
      <div className="orbit-track track-one" /><div className="orbit-track track-two" />
      {(['edge', 'chrome', 'ethereum', 'avatar'] as const).map((type, index) => <div key={type} className={`orbit orbit-${index}`} style={{ '--orbit-duration': `${42 + index * 9}s`, '--orbit-delay': `${-index * 11 - 6}s` } as CSSProperties}><div className="orbit-counter"><OrbitIcon type={type} initial={profile.name[0]} image={profile.avatarImage} /></div></div>)}
      <motion.div ref={card} className="identity-card" style={{ rotateX: animated ? rotateX : 0, rotateY: animated ? rotateY : 0 }} onMouseMove={event => {
        if (!animated || event.buttons || !window.matchMedia('(hover: hover)').matches) return
        const box = card.current!.getBoundingClientRect()
        x.set(-(event.clientY - box.top - box.height / 2) / 36)
        y.set((event.clientX - box.left - box.width / 2) / 36)
      }} onMouseLeave={() => { x.set(0); y.set(0) }}>
        <p className="identity-label">My name is:</p>
        <h1 className="name-slot" aria-label={profile.name} style={{ '--name-units': Math.max(nameUnits, 1) } as CSSProperties}>
          <AnimatePresence mode="wait" initial={false}><motion.span className="name-letters" key={animated ? nameIndex : 'static'} initial="enter" animate="visible" exit="exit" transition={{ staggerChildren: .045 }} aria-hidden="true">{Array.from(currentName).map((letter, index) => <motion.span key={index} variants={{ enter: { opacity: 0, y: 14, filter: 'blur(5px)' }, visible: { opacity: 1, y: 0, filter: 'blur(0px)' }, exit: { opacity: 0, y: -14, filter: 'blur(5px)' } }} transition={{ duration: .3 }}>{letter === ' ' ? '\u00a0' : letter}</motion.span>)}</motion.span></AnimatePresence>
        </h1>
        <div className="identity-divider" />
        <p className="identity-label">I'm a:</p>
        <div className="identity-roles">{profile.roles.map(role => <button key={role.label} onClick={() => scrollToSection(role.target, animated)}>{role.label}<span>↗</span></button>)}</div>
        <span className="identity-spark" aria-hidden="true" />
      </motion.div>
    </div>
  </section>
}
