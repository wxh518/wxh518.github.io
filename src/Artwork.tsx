import { useId } from 'react'
import type { Artwork as ArtworkKind } from './types/content'

// Original SVG placeholder covers; kept local so previews work without image services.
export function Artwork({ kind, className = '' }: { kind: ArtworkKind; className?: string }) {
  const id = useId().replace(/:/g, '')
  const palettes: Record<ArtworkKind, string[]> = {
    forest: ['#779ba2', '#d5d3b1'], cats: ['#eed1c1', '#f8e7c7'], space: ['#172838', '#645577'],
    mountain: ['#8ba4aa', '#d5ddd6'], tiles: ['#9ed5c7', '#f5d399'], waves: ['#243d4b', '#739f9b'],
    shapes: ['#e6b5a4', '#f1debf'], code: ['#c9d4df', '#9aaebb'], studio: ['#c9b397', '#5a6969'],
  }
  const colors = palettes[kind]
  return <svg className={`artwork ${className}`} viewBox="0 0 600 400" role="img" aria-label={`${kind} 项目占位插画`} preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id={`${id}-bg`} x2="1" y2="1"><stop stopColor={colors[0]} /><stop offset="1" stopColor={colors[1]} /></linearGradient>
      <linearGradient id={`${id}-shade`} x2="0" y2="1"><stop stopColor="#13232f" stopOpacity="0" /><stop offset="1" stopColor="#13232f" stopOpacity=".55" /></linearGradient>
      <pattern id={`${id}-grid`} width="30" height="30" patternUnits="userSpaceOnUse"><path d="M 30 0 H 0 V 30" fill="none" stroke="white" strokeOpacity=".1" /></pattern>
    </defs>
    <rect width="600" height="400" fill={`url(#${id}-bg)`} />
    {kind === 'forest' && <>
      <circle cx="399" cy="99" r="48" fill="#f5ecc8" />
      <path d="M0 215 Q150 75 310 218 T600 155 V400 H0" fill="#668f83" />
      <path d="M0 278 Q170 166 345 280 T600 208 V400 H0" fill="#385f59" />
      {[20, 78, 140, 490, 545, 590].map((x, i) => <g key={x} transform={`translate(${x}, ${i % 2 * 28})`}><path d="M0 20 L-70 270 H70 Z" fill={i % 2 ? '#264c46' : '#2c5550'} /><path d="M0 95 V365" stroke="#203f3d" strokeWidth="9" /></g>)}
      <path d="M248 400 Q370 322 302 283 Q262 251 358 228" fill="none" stroke="#b4c8a1" strokeWidth="25" />
      <text x="300" y="190" textAnchor="middle" fill="#fff8dc" fontSize="43" fontFamily="Georgia" fontStyle="italic">Moonlit Forest</text>
      <text x="300" y="221" textAnchor="middle" fill="#fff8dc" fontSize="11" letterSpacing="5">A LITTLE ADVENTURE</text>
    </>}
    {kind === 'cats' && <>
      {[70, 180, 290, 400, 510].map((x, i) => <circle key={x} cx={x} cy={65 + i % 2 * 245} r="27" fill="#d29c86" opacity=".25" />)}
      <path d="M0 329 Q150 220 300 325 T600 320 V400 H0" fill="#c7988b" opacity=".5" />
      {[{ x: 213, c: '#eff0df', d: -8 }, { x: 379, c: '#6e7a7e', d: 8 }].map(cat => <g key={cat.x} transform={`translate(${cat.x},210) rotate(${cat.d})`}>
        <ellipse cy="59" rx="59" ry="75" fill={cat.c} /><path d="M-51-15 L-48-80 L-8-42 Q10-49 25-38 L52-79 L56-6Z" fill={cat.c} />
        <ellipse cy="-6" rx="58" ry="49" fill={cat.c} /><path d="M-30-8 q10-12 20 0 M15-8 q10-12 20 0" stroke="#39474b" strokeWidth="4" fill="none" />
        <path d="M-2 8 l9 0 -4 5Z" fill="#d38676" /><path d="M48 73 Q109 78 73 28" fill="none" stroke={cat.c} strokeWidth="17" />
      </g>)}
      <text x="300" y="85" textAnchor="middle" fill="#8d6657" fontSize="34" fontFamily="Georgia" fontStyle="italic">Two Little Cats</text>
      <text x="300" y="111" textAnchor="middle" fill="#a07662" fontSize="10" letterSpacing="5">BETTER TOGETHER</text>
    </>}
    {kind === 'space' && <>
      {Array.from({ length: 36 }, (_, i) => <circle key={i} cx={(i * 137 + 13) % 600} cy={(i * 83 + 27) % 400} r={i % 3 === 0 ? 2 : 1} fill="#f5ead3" opacity=".65" />)}
      <circle cx="458" cy="99" r="68" fill="#ddae85" /><ellipse cx="458" cy="99" rx="117" ry="21" transform="rotate(-25 458 99)" stroke="#e5c9a4" strokeWidth="8" fill="none" />
      <path d="M160 205 L232 246 L158 268 L177 239Z" fill="#e9e6d9" /><path d="M173 236 L115 219 L132 244 L111 254 L173 249" fill="#f3a86f" />
      <text x="57" y="335" fill="#faf5e7" fontSize="38" fontFamily="monospace" letterSpacing="3">LOST IN ORBIT</text>
      <text x="61" y="361" fill="#c0bdd3" fontSize="10" letterSpacing="5">GO A LITTLE FURTHER</text>
    </>}
    {kind === 'mountain' && <>
      <circle cx="419" cy="86" r="46" fill="#f0e9cd" opacity=".9" />
      <path d="M0 321 L144 93 L282 280 L388 130 L600 359 V400 H0Z" fill="#758e91" /><path d="M80 195 L144 93 L206 185 L158 162 L137 180 L113 165Z" fill="#e4e9e1" />
      <path d="M0 400 L196 191 L301 346 L461 173 L600 327 V400Z" fill="#3f626a" /><path d="M388 255 L461 173 L512 230 L471 221 L442 241 L429 221Z" fill="#c0ceca" />
      <path d="M0 370 Q170 280 325 390 T600 333 V400H0" fill="#23434e" />
      <path d="M271 388 Q329 332 292 315" fill="none" stroke="#c5a983" strokeWidth="5" />
      <text x="300" y="97" textAnchor="middle" fill="#fff" fontSize="36" fontFamily="sans-serif" fontWeight="bold" letterSpacing="9">NORTHBOUND</text>
      <text x="300" y="124" textAnchor="middle" fill="#f1f3e8" fontSize="10" letterSpacing="4">FIND YOUR OWN WAY</text>
    </>}
    {kind === 'tiles' && <>
      {Array.from({ length: 20 }, (_, i) => <g key={i} transform={`translate(${65 + i % 5 * 118}, ${45 + Math.floor(i / 5) * 104}) rotate(${i % 2 ? 12 : -10})`}>
        <rect x="-38" y="-34" width="79" height="76" rx="21" fill={['#e7a668', '#f6dfaa', '#f0b7a0', '#70b7a4', '#d9cf97'][i % 5]} stroke="#fff" strokeOpacity=".3" strokeWidth="3" />
        <circle r="14" fill="none" stroke="white" strokeOpacity=".65" strokeWidth="4" />
      </g>)}
      <rect x="107" y="143" width="386" height="106" rx="22" fill="#fff3d8" transform="rotate(-5 300 200)" />
      <text x="300" y="189" textAnchor="middle" fill="#53877b" fontFamily="Georgia" fontSize="36" fontStyle="italic">Little</text>
      <text x="300" y="230" textAnchor="middle" fill="#53877b" fontFamily="Georgia" fontWeight="bold" fontSize="42">Playground</text>
    </>}
    {kind === 'waves' && <>
      <rect width="600" height="400" fill={`url(#${id}-grid)`} />
      {Array.from({ length: 19 }, (_, i) => <path key={i} d={`M-20 ${110 + i * 12} C110 ${290 + i * 4},180 ${20 + i * 11},300 ${130 + i * 8} S490 ${310 - i * 6},620 ${100 + i * 12}`} fill="none" stroke={i % 3 === 0 ? '#f0ad77' : '#b7d6c2'} strokeOpacity={.3 + i / 35} strokeWidth="2" />)}
      <text x="37" y="55" fill="#e8efdd" fontSize="12" letterSpacing="5">FREQUENCIES / 001</text>
      <text x="38" y="364" fill="#e8efdd" fontSize="26" fontFamily="monospace">a sound of possibility_</text>
    </>}
    {kind === 'shapes' && <>
      <circle cx="230" cy="160" r="105" fill="#e7d4a9" />
      <path d="M275 85 H427 V236 H275Z" fill="#819692" transform="rotate(18 351 160)" />
      <path d="M299 155 L398 326 H200Z" fill="#a67465" /><circle cx="157" cy="271" r="48" fill="#647987" />
      <text x="36" y="47" fill="#795f51" fontSize="12" letterSpacing="4">THE SHAPE OF AN IDEA</text>
      <text x="567" y="364" textAnchor="end" fill="#795f51" fontSize="11" letterSpacing="3">EXPERIMENT NO. 02</text>
    </>}
    {kind === 'code' && <>
      <rect x="65" y="51" width="470" height="298" rx="16" fill="#f7f8f5" /><path d="M65 95H535" stroke="#d6dedd" />
      {[87, 104, 121].map((x, i) => <circle key={x} cx={x} cy="74" r="4" fill={['#dba690', '#dcc595', '#8fae9d'][i]} />)}
      <rect x="86" y="115" width="102" height="212" rx="7" fill="#e7ece9" />
      {[0, 1, 2, 3, 4, 5].map(i => <rect key={i} x="98" y={136 + i * 26} width={60 - i % 3 * 8} height="5" rx="2" fill="#b0c0bc" />)}
      <text x="211" y="145" fill="#425963" fontSize="18" fontFamily="sans-serif">A place for your ideas.</text>
      {[0, 1, 2].map(i => <g key={i}><rect x={211 + i * 100} y="169" width="86" height="73" rx="8" fill={['#e7c8a9', '#abc1b5', '#b3c5d3'][i]} /><rect x={212 + i * 100} y="258" width="67" height="5" rx="2" fill="#b4c1c1" /><rect x={212 + i * 100} y="273" width="42" height="4" rx="2" fill="#d2dbd8" /></g>)}
      <rect x="211" y="299" width="286" height="13" rx="4" fill="#e7ece9" />
    </>}
    {kind === 'studio' && <>
      <rect width="600" height="400" fill={`url(#${id}-shade)`} />
      <g transform="translate(70,105) rotate(-9 230 100)">
        <rect width="466" height="217" rx="13" fill="#313d40" stroke="#ae9780" strokeWidth="8" />
        {Array.from({ length: 7 }, (_, i) => <g key={i}><circle cx={47 + i * 61} cy="39" r="12" fill="#8b9181" /><path d={`M${47 + i * 61} 30v9`} stroke="#e7e1bc" strokeWidth="2" /></g>)}
        {Array.from({ length: 19 }, (_, i) => <rect key={i} x={17 + i * 23} y="92" width="21" height="106" rx="2" fill="#ede9d8" />)}
        {Array.from({ length: 18 }, (_, i) => i % 7 !== 2 && i % 7 !== 6 && <rect key={i} x={32 + i * 23} y="92" width="13" height="63" rx="2" fill="#263639" />)}
        <rect x="188" y="60" width="90" height="14" rx="2" fill="#e4ae75" />
      </g>
      <text x="35" y="47" fill="#f3e6cc" fontSize="12" letterSpacing="5">SUNDAY SESSIONS</text>
    </>}
  </svg>
}
