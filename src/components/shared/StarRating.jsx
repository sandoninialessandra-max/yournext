import { useState } from 'react'

export default function StarRating({ value, onChange }) {
  const [hover, setHover] = useState(null)
  const stars = [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ display: 'flex', gap: 2 }}>
        {[1, 2, 3, 4, 5].map(star => {
          const active = hover !== null ? hover : value
          const full = active >= star
          const half = !full && active >= star - 0.5
          return (
            <div key={star} style={{ position: 'relative', width: 20, height: 20, cursor: 'pointer' }}>
              <svg viewBox="0 0 20 20" style={{ width: 20, height: 20, position: 'absolute' }}>
                <polygon points="10,1 12.9,7 19.5,7.6 14.5,12 16.2,18.5 10,15 3.8,18.5 5.5,12 0.5,7.6 7.1,7" fill={full ? 'var(--accent)' : half ? 'url(#half)' : 'var(--bg4)'} stroke="var(--accent)" strokeWidth="0.5" />
                <defs><linearGradient id="half"><stop offset="50%" stopColor="var(--accent)" /><stop offset="50%" stopColor="var(--bg4)" /></linearGradient></defs>
              </svg>
              <div style={{ position: 'absolute', left: 0, top: 0, width: '50%', height: '100%' }} onMouseEnter={() => setHover(star - 0.5)} onMouseLeave={() => setHover(null)} onClick={() => onChange(star - 0.5)} />
              <div style={{ position: 'absolute', right: 0, top: 0, width: '50%', height: '100%' }} onMouseEnter={() => setHover(star)} onMouseLeave={() => setHover(null)} onClick={() => onChange(star)} />
            </div>
          )
        })}
      </div>
      {value && <button onClick={() => onChange(null)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 12, padding: '0 4px' }}>✕</button>}
    </div>
  )
}
