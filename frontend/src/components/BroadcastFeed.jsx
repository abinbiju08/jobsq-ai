import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h/24)}d ago`
}

export default function BroadcastFeed({ room = 'all' }) {
  const [broadcasts, setBroadcasts] = useState([])
  const [expanded, setExpanded]     = useState(true)

  useEffect(() => {
    fetch(`${API}/broadcast/?room=${encodeURIComponent(room)}`)
      .then(r => r.json())
      .then(d => { if (d.success) setBroadcasts(d.broadcasts) })
      .catch(() => {})
  }, [room])

  if (broadcasts.length === 0) return null

  const pinned = broadcasts.filter(b => b.pinned)
  const feed   = broadcasts.filter(b => !b.pinned)

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"/>
      <div style={{ borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.5rem 1.25rem', background: 'rgba(0,229,160,0.03)', borderBottom: '0.5px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
            <i className="ti ti-speakerphone" style={{ fontSize: '13px', color: '#00e5a0' }} aria-hidden="true"/>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#00e5a0', textTransform: 'uppercase', letterSpacing: '.05em' }}>
              Broadcasts · {broadcasts.length}
            </span>
          </div>
          <button onClick={() => setExpanded(e => !e)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', display: 'flex', alignItems: 'center', padding: '2px 6px', borderRadius: '6px' }}>
            <i className={`ti ${expanded ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: '13px' }} aria-hidden="true"/>
          </button>
        </div>

        {/* Cards */}
        {expanded && (
          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {[...pinned, ...feed].map((b, i) => (
              <div key={b.id || i} style={{ display: 'flex', alignItems: 'flex-start', gap: '.65rem', padding: '.75rem 1.25rem', borderBottom: i < broadcasts.length - 1 ? '0.5px solid var(--border)' : 'none', background: b.pinned ? `${b.bg}` : 'transparent' }}>

                {/* Icon */}
                <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: b.bg, border: `0.5px solid ${b.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`ti ${b.icon}`} style={{ fontSize: '15px', color: b.color }} aria-hidden="true"/>
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Meta row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', marginBottom: '3px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)' }}>JobsQ</span>
                    <span style={{ fontSize: '9px', padding: '1px 7px', borderRadius: '10px', background: b.bg, border: `0.5px solid ${b.border}`, color: b.color, fontWeight: 700 }}>{b.type}</span>
                    {b.pinned && <i className="ti ti-pin" style={{ fontSize: '11px', color: 'var(--text3)' }} aria-hidden="true"/>}
                    <span style={{ fontSize: '10px', color: 'var(--text3)' }}>{timeAgo(b.created_at)}</span>
                  </div>

                  {/* Headline */}
                  <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px', lineHeight: 1.4 }}>{b.headline}</div>

                  {/* Details */}
                  {b.details && <div style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '.4rem', lineHeight: 1.4 }}>{b.details}</div>}

                  {/* Link */}
                  {b.link && (
                    <a href={b.link} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '.25rem', fontSize: '11px', fontWeight: 700, color: b.color, textDecoration: 'none' }}>
                      {b.link_label} <i className="ti ti-arrow-right" style={{ fontSize: '11px' }} aria-hidden="true"/>
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}