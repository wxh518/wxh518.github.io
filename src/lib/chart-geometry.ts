export interface Point { x: number; y: number }

// 统一保留三位小数，保证缩放后的 SVG 平滑且可以稳定对照。
const n = (value: number) => Math.round(value * 1000) / 1000
const pair = (point: Point) => `${n(point.x)},${n(point.y)}`

/** 与 D3 curveBumpX 一致：相邻控制点之间保持水平切线。 */
export function bumpLine(points: readonly Point[], move = 'M'): string {
  if (!points.length) return ''
  let path = `${move}${pair(points[0])}`
  for (let i = 1; i < points.length; i++) {
    const previous = points[i - 1]
    const current = points[i]
    const middle = n((previous.x + current.x) / 2)
    path += `C${middle},${n(previous.y)},${middle},${n(current.y)},${pair(current)}`
  }
  return path
}

/** 年龄按真实间距映射；不能按数组下标等分，否则原站的曲线形态会发生变化。 */
export function stackedAreas(ages: readonly number[], series: readonly { values: readonly number[] }[], width = 500, height = 300) {
  if (ages.length < 2 || ages.at(-1)! <= ages[0]) return []
  const sums = ages.map(() => 0)
  const point = (value: number, i: number): Point => ({
    x: (ages[i] - ages[0]) / (ages.at(-1)! - ages[0]) * width,
    y: height * (1 - value / 100),
  })
  return series.map(item => {
    const lower = sums.map(point)
    for (let i = 0; i < ages.length; i++) sums[i] += item.values[i] ?? 0
    const upper = sums.map(point)
    return { path: `${bumpLine(upper)}${bumpLine([...lower].reverse(), 'L')}Z`, lower, upper }
  })
}

/** 闭合 Cardinal 曲线（tension = 0），用于原站的柔和雷达轮廓。 */
export function cardinalClosed(points: readonly Point[]): string {
  const size = points.length
  if (!size) return ''
  if (size < 3) return `M${points.map(pair).join('L')}Z`
  let path = `M${pair(points[1])}`
  for (let i = 1; i <= size; i++) {
    const previous = points[(i - 1) % size]
    const current = points[i % size]
    const next = points[(i + 1) % size]
    const after = points[(i + 2) % size]
    const c1 = { x: current.x + (next.x - previous.x) / 6, y: current.y + (next.y - previous.y) / 6 }
    const c2 = { x: next.x - (after.x - current.x) / 6, y: next.y - (after.y - current.y) / 6 }
    path += `C${pair(c1)},${pair(c2)},${pair(next)}`
  }
  return path
}

export function radarGeometry(values: readonly number[], width: number, height = 350) {
  const compact = width < 480
  const left = compact ? 70 : 180
  const right = compact ? 70 : 130
  const radius = Math.max(0, Math.min(width - left - right, height - 100) / 2)
  const maximum = Math.max(0, ...values) || 1
  const polar = (index: number, distance: number): Point => {
    const angle = index * Math.PI * 2 / Math.max(1, values.length) - Math.PI / 2
    return { x: Math.cos(angle) * distance, y: Math.sin(angle) * distance }
  }
  return {
    center: { x: left + (width - left - right) / 2, y: height / 2 },
    radius,
    vertices: values.map((value, index) => polar(index, Math.max(0, value) / maximum * radius)),
    axes: values.map((_, index) => polar(index, radius)),
    labels: values.map((_, index) => polar(index, radius + (compact ? 14 : 20))),
    compact,
  }
}
