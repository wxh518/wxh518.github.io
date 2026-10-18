import { useState, type CSSProperties } from 'react'
import type { HomepageContent, MapPlace, Profile } from '../../types/content'
import { projectPlace } from '../../lib/map-projection'

type Space = NonNullable<HomepageContent['statistics']['space']>
export function FootprintMap({ space, profile }: { space: Space; profile: Profile }) {
  const [active, setActive] = useState<MapPlace | null>(null)
  const bounds = space.bounds!
  const current = space.currentLocation!
  const position = (place: MapPlace): CSSProperties => {
    const point = projectPlace(place, bounds)
    return { left: `${point.x}%`, top: `${point.y}%` }
  }
  const places = space.visitedPlaces || []
  return <div className="travel-footprint">
    <div className="footprint-map footprint-geographic">
      <img className="footprint-image" src={space.mapImage} alt={space.mapAlt} loading="lazy" width="600" height="586" />
      {places.map(place => <button key={place.name} type="button" className={`footprint-place ${active?.name === place.name ? 'is-active' : ''}`} style={position(place)} aria-label={`去过：${place.name}`} aria-pressed={active?.name === place.name} onMouseEnter={() => setActive(place)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(place)} onBlur={() => setActive(null)} onClick={() => setActive(place)}><span /></button>)}
      <button type="button" className="footprint-current" style={position(current)} aria-label={`当前位置：${current.name}`} onMouseEnter={() => setActive(current)} onMouseLeave={() => setActive(null)} onFocus={() => setActive(current)} onBlur={() => setActive(null)} onClick={() => setActive(current)}>
        <span className="footprint-current-pulse" />{profile.avatarImage ? <img src={profile.avatarImage} alt="" loading="lazy" /> : <span>{profile.name[0]}</span>}
      </button>
      {active && <span className={`footprint-location-tooltip ${active.name === current.name ? 'is-current' : ''}`} style={position(active)} role="status">{active.name}{active.name === current.name ? ' · 当前所在地' : ' · 曾经去过'}</span>}
      <span className="footprint-caption">{space.caption || current.name}</span>
      <a className="footprint-source" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" aria-label="地图数据来源：Natural Earth 与 OpenStreetMap">© OpenStreetMap</a>
    </div>
  </div>
}
