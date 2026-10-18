import type { CSSProperties } from 'react'
import type { HomepageContent } from '../types/content'
import { Reveal } from './ui'
import { TimeChart } from './statistics/TimeChart'
import { RadarChart } from './statistics/RadarChart'
import { FootprintMap } from './statistics/FootprintMap'
import './statistics/Statistics.css'

export function Statistics({ data }: { data: HomepageContent }) {
  const { statistics, profile } = data
  const { descriptions, space } = statistics
  return <Reveal id="statistics" className="page-width statistics-section section-space">
    <div className="statistics-top">
      <div className="statistics-time surface"><h2>Time</h2><p>{descriptions?.time}</p><TimeChart ages={statistics.ages} series={statistics.time} /></div>
      <div className="statistics-side">
        <div className="statistics-space surface"><h2>Space</h2><p>{descriptions?.space}</p>
          {space?.bounds && space.currentLocation ? <FootprintMap space={space} profile={profile} /> : space ? <div className="footprint-map">
            <img className="footprint-image" src={space.mapImage} alt={space.mapAlt} loading="lazy" width="600" height="586" />
            <span className="footprint-marker" style={{ '--marker-x': `${space.marker.x}%`, '--marker-y': `${space.marker.y}%` } as CSSProperties}>
              <span className="footprint-pulse" />
              {profile.avatarImage ? <img src={profile.avatarImage} alt="" loading="lazy" /> : <span className="footprint-initial">{profile.name[0]}</span>}
            </span>
            <span className="footprint-caption">{space.caption ?? profile.city}</span>
          </div> : <div className="footprint-empty">{profile.city}</div>}
        </div>
        <div className="statistics-wordmark surface-dark"><h2>Statistics</h2></div>
      </div>
    </div>
    <div className="statistics-bottom">
      <div className="statistics-radar surface"><h3>Movie</h3><p>{descriptions?.movies}</p><RadarChart items={statistics.movies} title="电影类型分布" /></div>
      <div className="statistics-radar surface"><h3>Album</h3><p>{descriptions?.music}</p><RadarChart items={statistics.music} title="专辑类型分布" /></div>
    </div>
  </Reveal>
}
