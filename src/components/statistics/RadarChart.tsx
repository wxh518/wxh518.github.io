import { useEffect, useId, useRef, useState } from 'react'
import { cardinalClosed, radarGeometry } from '../../lib/chart-geometry'

type ChartItem = { label: string; value: number; color: string }
export function RadarChart({ items, title }: { items: ChartItem[]; title: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const id = useId()
  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  const { center, radius, axes, vertices, labels, compact } = radarGeometry(items.map(item => item.value), width)
  const color = items[0]?.color ?? '#b3e2cd'
  return <div className="radar-chart" ref={ref}>
    {width > 0 && <svg width={width} height="350" role="img" aria-labelledby={`${id}-title ${id}-description`}>
      <title id={`${id}-title`}>{title}</title><desc id={`${id}-description`}>{items.map(item => `${item.label} ${item.value}`).join('，')}</desc>
      <g transform={`translate(${center.x},${center.y})`}>
        {[1, .8, .6, .4, .2].map(scale => <circle key={scale} className="radar-grid" r={radius * scale} />)}
        {axes.map((point, index) => <line key={items[index].label} className="radar-grid" x2={point.x} y2={point.y} />)}
        <path className="radar-area" d={cardinalClosed(vertices)} fill={color} stroke={color} />
        {labels.map((point, index) => <text key={items[index].label} x={point.x} y={point.y} dominantBaseline="central" textAnchor={Math.abs(point.x) < 1 ? 'middle' : point.x > 0 ? 'start' : 'end'} fontSize={compact ? 12 : 18}>{items[index].label}</text>)}
        {vertices.map((point, index) => <g key={items[index].label} tabIndex={0} role="img" aria-label={`${items[index].label}：${items[index].value}`} onMouseEnter={() => setSelected(index)} onMouseLeave={() => setSelected(null)} onFocus={() => setSelected(index)} onBlur={() => setSelected(null)}>
          <circle cx={point.x} cy={point.y} r="12" fill="transparent" /><circle className="radar-dot" cx={point.x} cy={point.y} r={selected === index ? 7 : 5} fill={items[index].color} stroke={items[index].color} />
        </g>)}
      </g>
    </svg>}
    {selected !== null && <div className="statistics-tooltip radar-tooltip" role="status"><strong>{items[selected].label}</strong><span>{items[selected].value}</span></div>}
  </div>
}
