import { useState } from 'react'
import { MapPin } from 'lucide-react'
import type { HomepageContent } from '../types/content'
import { Reveal } from './ui'

type ChartItem = { label: string; value: number; color: string }
function Donut({ items, title }: { items: ChartItem[]; title: string }) {
  const [selected, setSelected] = useState<string | null>(null)
  const total = items.reduce((sum, item) => sum + item.value, 0)
  let offset = 0
  const selectedItem = items.find(item => item.label === selected)
  return <div className="donut-content"><div className="donut-wrap"><svg viewBox="0 0 200 200" role="img" aria-label={`${title}：${items.map(item => `${item.label} ${item.value}`).join('，')}`}><circle cx="100" cy="100" r="68" fill="none" stroke="#e8ebed" strokeWidth="27" />{items.map(item => {
    const length = total ? item.value / total * 427.26 : 0
    const start = offset; offset += length
    return <circle key={item.label} cx="100" cy="100" r="68" fill="none" stroke={item.color} strokeWidth={selected === item.label ? 35 : 27} strokeDasharray={`${Math.max(length - 3, 0)} ${427.26 - Math.max(length - 3, 0)}`} strokeDashoffset={-start} transform="rotate(-90 100 100)" opacity={selected && selected !== item.label ? .4 : 1} onMouseEnter={() => setSelected(item.label)} onMouseLeave={() => setSelected(null)} />
  })}<text x="100" y="98" textAnchor="middle" className="donut-number">{selectedItem ? `${Math.round(selectedItem.value / total * 100)}%` : '100%'}</text><text x="100" y="122" textAnchor="middle" className="donut-caption">{selected ?? 'a little of everything'}</text></svg></div><div className="chart-legend">{items.map(item => <button key={item.label} aria-pressed={selected === item.label} onMouseEnter={() => setSelected(item.label)} onMouseLeave={() => setSelected(null)} onFocus={() => setSelected(item.label)} onBlur={() => setSelected(null)} onClick={() => setSelected(selected === item.label ? null : item.label)}><i style={{ background: item.color }} />{item.label}<span>{total ? Math.round(item.value / total * 100) : 0}%</span></button>)}</div></div>
}

export function Statistics({ data }: { data: HomepageContent }) {
  const { time, ages } = data.statistics
  const [age, setAge] = useState(2)
  const activeAge = Math.min(age, Math.max(0, ages.length - 1))
  const totals = ages.map((_, i) => time.reduce((total, series) => total + (series.values[i] ?? 0), 0))
  let sums = ages.map(() => 0)
  const areas = time.map(series => {
    const bottom = [...sums]
    sums = sums.map((sum, i) => sum + (series.values[i] ?? 0))
    const point = (value: number, i: number) => `${40 + i * 420 / Math.max(ages.length - 1, 1)},${210 - value / (totals[i] || 1) * 178}`
    return { ...series, points: sums.map(point).concat(bottom.map(point).reverse()).join(' ') }
  })
  return <Reveal id="statistics" className="page-width stats-section section-space">
    <div className="stats-top"><div className="time-panel surface"><div className="panel-heading"><h2>Time</h2><span>{data.isDemo ? 'ILLUSTRATIVE DATA' : 'IN PERSPECTIVE'}</span></div><p>Life changes. So do the things we make time for.</p><div className="time-chart"><svg viewBox="0 0 490 250" role="img" aria-label="不同年龄的时间分配示例，使用下方按钮查看数据">{[0, 25, 50, 75, 100].map(value => <g key={value}><path d={`M40 ${210 - value * 1.78} H460`} stroke="#dde2e3" /><text x="27" y={214 - value * 1.78} textAnchor="end" className="axis-label">{value}</text></g>)}{areas.map(series => <polygon key={series.label} points={series.points} fill={series.color} fillOpacity=".85" />)}<path d={`M${40 + activeAge * 420 / Math.max(ages.length - 1, 1)} 32V210`} stroke="#51616c" strokeDasharray="4 4" />{ages.map((value, i) => <text key={value} x={40 + i * 420 / Math.max(ages.length - 1, 1)} y="233" className="axis-label" textAnchor="middle">{value}</text>)}</svg></div><div className="age-selector" aria-label="查看年龄对应的数据">{ages.map((value, i) => <button key={value} onClick={() => setAge(i)} aria-pressed={activeAge === i}>{value}<span>岁</span></button>)}</div><div className="time-legend" aria-live="polite">{time.map(series => <span key={series.label}><i style={{ background: series.color }} />{series.label}<strong>{series.values[activeAge] ?? 0}%</strong></span>)}</div></div>
    <div className="space-panel surface"><div className="panel-heading"><h2>Space</h2><MapPin size={23} /></div><p>A few places. A lot of memories.<br />More of the world still to discover.</p><svg className="world-map" viewBox="0 0 500 280" role="img" aria-label="抽象世界地图，作为旅行模块的占位插画"><defs><pattern id="map-dots" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="2" fill="#a5b5b7" /></pattern></defs><g fill="url(#map-dots)"><path d="M30 54 77 29 124 39 168 70 147 100 126 110 113 146 81 130 73 105 42 97Z" /><path d="m126 143 37 6 29 35-17 48-24 39-18-41-5-44-15-20Z" /><path d="m189 21 27-10 22 17-15 30-24-3Z" /><path d="m239 72 35-27 50-5 39-10 61 28 46 4 15 30-27 28-30-12-34 34-32-4-14-32-33 16-35-15-21 7-28-19Z" /><path d="m238 113 53 1 25 44-18 53-34-10-26-45-11-24Z" /><path d="m363 135 18 7 17 25 24 8-2 15-34-14-11-24Z" /><path d="m412 195 43-12 28 20-10 36-54 3-19-27Z" /><path d="m302 218 9-20 9 10-7 23Z" /></g>{[[89, 88], [251, 90], [376, 113], [441, 213]].map(([x, y], i) => <g key={x} className="map-pin"><circle cx={x} cy={y} r="13" fill="#f99b52" opacity=".15" /><circle cx={x} cy={y} r={i === 2 ? 5 : 3} fill="#ed954e" /></g>)}</svg><div className="location-pill"><span className="status-dot" />{data.profile.city}<MapPin size={14} /></div><span className="map-note">{data.isDemo ? 'SAMPLE FOOTPRINTS' : 'KEEP EXPLORING'}</span></div></div>
    <div className="stats-bottom"><div className="statistics-title surface-dark"><h2>Statis<span>tics<span className="orange">.</span></span></h2><p>Life, in a few numbers.</p><span className="stat-spark" aria-hidden="true">✳</span></div><div className="donut-panel surface"><h3>Movie</h3><p>A window into other worlds.</p><Donut items={data.statistics.movies} title="电影类型分布" /></div><div className="donut-panel surface"><h3>Album</h3><p>The soundtrack to everyday life.</p><Donut items={data.statistics.music} title="音乐类型分布" /></div></div>
  </Reveal>
}
