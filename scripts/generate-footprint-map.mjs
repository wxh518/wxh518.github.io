import fs from 'node:fs/promises'
import path from 'node:path'

// 只在构建素材时读取地理数据；线上页面始终使用站内 SVG，不请求地图服务。
const directory = process.argv[2] || '.deployment-repo/map-data'
const { statistics: { space } } = JSON.parse(await fs.readFile('content/homepage.json', 'utf8'))
const bounds = space.bounds
const width = 600, height = 586
const mercator = latitude => Math.log(Math.tan(Math.PI / 4 + latitude * Math.PI / 360))
const project = ([longitude, latitude]) => [
  (longitude - bounds.west) / (bounds.east - bounds.west) * width,
  (mercator(bounds.north) - mercator(Math.max(-85, Math.min(85, latitude)))) / (mercator(bounds.north) - mercator(bounds.south)) * height,
]
const point = ([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`

// 裁掉当前视窗以外的多边形，避免把全球数万个顶点发送到浏览器。
function clipPolygon(input) {
  let points = input.map(project)
  for (const [axis, edge, sign] of [[0, -2, 1], [0, width + 2, -1], [1, -2, 1], [1, height + 2, -1]]) {
    const output = []
    for (let index = 0; index < points.length; index++) {
      const a = points[index], b = points[(index + 1) % points.length]
      const insideA = (a[axis] - edge) * sign >= 0, insideB = (b[axis] - edge) * sign >= 0
      if (insideA) output.push(a)
      if (insideA !== insideB) {
        const t = (edge - a[axis]) / (b[axis] - a[axis])
        output.push([a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])])
      }
    }
    points = output
    if (!points.length) break
  }
  return points.length > 2 ? `M${points.map(point).join('L')}Z` : ''
}

function linePath(coordinates) {
  // 按线段包围盒筛选，保留穿过地图边缘的河流和边界。
  let result = '', connected = false
  const points = coordinates.map(project)
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1], b = points[index]
    if (Math.max(a[0], b[0]) < 0 || Math.min(a[0], b[0]) > width || Math.max(a[1], b[1]) < 0 || Math.min(a[1], b[1]) > height) { connected = false; continue }
    result += `${connected ? '' : `M${point(a)}`}L${point(b)}`
    connected = true
  }
  return result
}

async function paths(name) {
  const data = JSON.parse(await fs.readFile(path.join(directory, `${name}.geojson`), 'utf8'))
  return data.features.map(({ geometry }) => {
    if (!geometry) return ''
    if (geometry.type === 'Polygon') return geometry.coordinates.map(clipPolygon).join('')
    if (geometry.type === 'MultiPolygon') return geometry.coordinates.flatMap(polygon => polygon.map(clipPolygon)).join('')
    if (geometry.type === 'LineString') return linePath(geometry.coordinates)
    if (geometry.type === 'MultiLineString') return geometry.coordinates.map(linePath).join('')
    return ''
  }).filter(Boolean).map(d => `<path d="${d}"/>`).join('')
}
const [land, lakes, rivers, borders] = await Promise.all([
  paths('ne_50m_land'), paths('ne_50m_lakes'), paths('ne_50m_rivers_lake_centerlines'), paths('ne_50m_admin_0_boundary_lines_land'),
])
const labels = [
  ['中国', 108.5, 35.5, 24], ['蒙古', 106, 48, 19], ['俄罗斯', 132, 50.6, 19],
  ['朝鲜', 127, 40.5, 16], ['韩国', 127.6, 35.7, 16], ['日本', 137, 36, 19],
  ['越南', 105.5, 23, 16], ['黄海', 123.3, 34, 16], ['东海', 126, 27.5, 17], ['日本海', 134, 41.5, 17],
].map(([name, longitude, latitude, size]) => {
  const [x, y] = project([longitude, latitude])
  return `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" font-size="${size}">${name}</text>`
}).join('')
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"><title>东亚旅行足迹底图</title><desc>Natural Earth 1:50m 地理数据；墨卡托投影。城市标记由主页配置单独绘制。</desc><defs><linearGradient id="water" x2=".8" y2="1"><stop stop-color="#adc9f4"/><stop offset="1" stop-color="#a7c5f1"/></linearGradient><linearGradient id="land" x2=".8" y2="1"><stop stop-color="#dfecdf"/><stop offset=".55" stop-color="#eef0e4"/><stop offset="1" stop-color="#d5e8d4"/></linearGradient><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="3" seed="7"/><feColorMatrix type="matrix" values="0 0 0 0 .36 0 0 0 0 .57 0 0 0 0 .4 .5 0 0 0 -.12"/><feComposite operator="in" in2="SourceGraphic"/></filter><clipPath id="frame"><rect width="${width}" height="${height}"/></clipPath><g id="landforms" fill-rule="evenodd">${land}</g></defs><g clip-path="url(#frame)"><rect width="${width}" height="${height}" fill="url(#water)"/><use href="#landforms" fill="url(#land)" stroke="#c4d5be" stroke-width="1.2"/><use href="#landforms" fill="#98bd97" filter="url(#grain)"/><g fill="none" stroke="#b5bca6" stroke-width="1.3" stroke-dasharray="3 2" opacity=".8">${borders}</g><g fill="#adc9f4" stroke="#aac8e0" stroke-width=".7" fill-rule="evenodd">${lakes}</g><g fill="none" stroke="#b1c9d6" stroke-width="1" opacity=".8">${rivers}</g><g font-family="Microsoft YaHei,system-ui,sans-serif" text-anchor="middle" fill="#758678" paint-order="stroke" stroke="#f8faf0" stroke-width="3" stroke-opacity=".7">${labels}</g></g></svg>`
await fs.writeFile('public/images/maps/east-asia.svg', svg)
console.log(`Generated east-asia.svg (${Buffer.byteLength(svg)} bytes)`)
