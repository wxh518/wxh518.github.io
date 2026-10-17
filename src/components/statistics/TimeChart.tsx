import { useId, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { HomepageContent } from '../../types/content'
import { stackedAreas } from '../../lib/chart-geometry'

type TimeSeries = HomepageContent['statistics']['time']
// 原站的描边使用 500ms Cubic InOut；直接使用同一缓动函数以保留过渡节奏。
const cubicInOut = (progress: number) => progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2

export function TimeChart({ ages, series }: { ages: number[]; series: TimeSeries }) {
  const [hovered, setHovered] = useState<number | null>(null)
  const [keyboardSelection, setKeyboardSelection] = useState<number | null>(null)
  const active = hovered ?? keyboardSelection
  const reducedMotion = useReducedMotion()
  const id = useId()
  const areas = stackedAreas(ages, series)
  const min = ages[0], max = ages.at(-1) ?? min
  const x = (age: number) => (age - min) / (max - min) * 500
  const ticks = Array.from({ length: Math.max(0, Math.floor(max / 5) - Math.ceil(Math.max(0, min) / 5) + 1) }, (_, i) => (Math.ceil(Math.max(0, min) / 5) + i) * 5)
  return <div className="time-chart">
    <svg viewBox="0 0 500 300" role="img" tabIndex={0} aria-labelledby={`${id}-title ${id}-description`}
      onPointerLeave={() => setHovered(null)} onPointerDown={() => setKeyboardSelection(null)} onBlur={() => setKeyboardSelection(null)} onFocus={event => {
        if (event.currentTarget.matches(':focus-visible')) setKeyboardSelection(0)
      }} onKeyDown={event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape'].includes(event.key)) return
        event.preventDefault()
        if (event.key === 'Escape') { setHovered(null); setKeyboardSelection(null); return }
        setHovered(null)
        setKeyboardSelection(index => event.key === 'Home' ? 0 : event.key === 'End' ? series.length - 1 : Math.max(0, Math.min(series.length - 1, (index ?? active ?? 0) + (event.key === 'ArrowRight' ? 1 : -1))))
      }}>
      <title id={`${id}-title`}>不同年龄的时间分配</title>
      <desc id={`${id}-description`}>平滑堆叠面积图。悬停色块可高亮活动分类，也可使用左右方向键选择分类，Escape 取消高亮。</desc>
      {series.map((item, index) => <motion.path key={item.label} className="time-area" d={areas[index]?.path} fill={item.color} opacity={1} stroke="white" strokeWidth={0}
        initial={false} animate={{ strokeWidth: active === index ? 5 : 0 }} transition={{ type: 'tween', duration: reducedMotion ? 0 : .5, ease: cubicInOut }}
        onPointerEnter={() => setHovered(index)} onPointerLeave={() => setHovered(null)} />)}
      <g className="time-axis" transform="translate(-1,0)"><path d="M1,300.5H0.5V0.5H1" />{[20, 40, 60, 80].map(value => <g key={value} transform={`translate(0,${300 * (1 - value / 100) + .5})`}><line x2="7" /><text x="10" dy=".32em">{value}%</text></g>)}</g>
      <g className="time-axis time-axis-x" transform="translate(0,301)"><path d="M0.5,-1V0.5H500.5V-1" />{ticks.map(age => <g key={age} transform={`translate(${x(age) + .5},0)`}><line y2="-7" /><text y="-10" textAnchor="middle">{age}</text></g>)}</g>
      {series.map((item, index) => {
        // 未指定标签位置时，选择此分类面积最宽的年龄段中心。
        const widest = item.values.indexOf(Math.max(...item.values))
        if (item.values[widest] <= 0) return null
        const automatic = areas[index] && { x: Math.max(8, Math.min(500 - item.label.length * 8, areas[index].upper[widest].x)), y: Math.max(18, Math.min(282, (areas[index].upper[widest].y + areas[index].lower[widest].y) / 2)) }
        const label = item.labelPosition ?? automatic
        return label && <text key={item.label} className="time-area-label" transform={`translate(${label.x},${label.y}) scale(${item.labelPosition?.scale ?? 1})`}>{item.label}</text>
      })}
      <text className="time-age-label" transform="translate(260,290)" textAnchor="middle">Age</text>
    </svg>
    <span className="sr-only" role="status">{active === null ? '' : series[active]?.label}</span>
  </div>
}
