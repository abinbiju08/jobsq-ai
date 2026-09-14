import { useEffect, useState } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const LANG_META = {
  python:     { icon: '🐍', color: '#3b82f6', label: 'Python' },
  javascript: { icon: '🟨', color: '#f59e0b', label: 'JavaScript' },
  java:       { icon: '☕', color: '#ef4444', label: 'Java' },
  'c++':      { icon: '⚙️', color: '#8b5cf6', label: 'C++' },
  sql:        { icon: '🗄️', color: '#10b981', label: 'SQL' },
}

const BADGES = [
  { min: 0,    name: 'Beginner',   icon: '🌱', color: '#6b7280' },
  { min: 50,   name: 'Apprentice', icon: '🔧', color: '#10b981' },
  { min: 150,  name: 'Developer',  icon: '💻', color: '#3b82f6' },
  { min: 300,  name: 'Engineer',   icon: '⚙️', color: '#8b5cf6' },
  { min: 500,  name: 'Senior',     icon: '🚀', color: '#f59e0b' },
  { min: 800,  name: 'Expert',     icon: '🏆', color: '#ef4444' },
  { min: 1200, name: 'Master',     icon: '👑', color: '#fbbf24' },
]

function getBadge(xp) {
  let badge = BADGES[0]
  for (const b of BADGES) { if (xp >= b.min) badge = b }
  return badge
}

export default function SkillBadges({ userId, compact = false }) {
  const [scores, setScores] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    fetch(`${API}/terminal/skill-scores/${userId}`)
      .then(r => r.json())
      .then(d => { if (d.success) setScores(d.scores) })
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) return (
    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ width: '80px', height: '70px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', animation: 'pulse 1.5s ease infinite' }}/>
      ))}
    </div>
  )

  const attempted = Object.entries(scores).filter(([, s]) => s.xp > 0)

  if (compact) {
    // Small inline badges for Dashboard
    return (
      <div style={{ display: 'flex', gap: '.4rem', flexWrap: 'wrap' }}>
        {Object.entries(LANG_META).map(([langId, meta]) => {
          const score = scores[langId] || { xp: 0 }
          const badge = getBadge(score.xp)
          const active = score.xp > 0
          return (
            <div key={langId} title={`${meta.label} · ${badge.name} · ${score.xp} XP`}
              style={{ display: 'flex', alignItems: 'center', gap: '.3rem', padding: '3px 8px', borderRadius: '20px', background: active ? `${meta.color}18` : 'rgba(255,255,255,0.03)', border: `0.5px solid ${active ? meta.color + '44' : 'rgba(255,255,255,0.06)'}`, opacity: active ? 1 : 0.4 }}>
              <span style={{ fontSize: '13px' }}>{meta.icon}</span>
              <span style={{ fontSize: '10px', fontWeight: 700, color: active ? meta.color : '#4a5168' }}>{badge.icon}</span>
              {active && <span style={{ fontSize: '10px', color: '#4a5168' }}>{score.xp}xp</span>}
            </div>
          )
        })}
      </div>
    )
  }

  // Full card view for Profile
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
      <div style={{ fontSize: '12px', fontWeight: 700, color: '#4a5168', textTransform: 'uppercase', letterSpacing: '.06em' }}>
        Coding Skills · {attempted.length} language{attempted.length !== 1 ? 's' : ''} practiced
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '.5rem' }}>
        {Object.entries(LANG_META).map(([langId, meta]) => {
          const score = scores[langId] || { xp: 0, problems_solved: 0 }
          const badge = getBadge(score.xp)
          const active = score.xp > 0
          const nextBadge = BADGES.find(b => b.min > score.xp)
          const pct = nextBadge
            ? Math.min(100, ((score.xp - badge.min) / (nextBadge.min - badge.min)) * 100)
            : 100

          return (
            <div key={langId}
              style={{ background: active ? `${meta.color}0d` : 'rgba(255,255,255,0.02)', border: `0.5px solid ${active ? meta.color + '33' : 'rgba(255,255,255,0.06)'}`, borderRadius: '12px', padding: '.75rem', display: 'flex', flexDirection: 'column', gap: '.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '1.2rem' }}>{meta.icon}</span>
                <span style={{ fontSize: '1rem' }}>{badge.icon}</span>
              </div>
              <div style={{ fontSize: '12px', fontWeight: 700, color: active ? '#eef0ff' : '#4a5168' }}>{meta.label}</div>
              <div style={{ fontSize: '10px', color: active ? badge.color : '#4a5168', fontWeight: 600 }}>{badge.name}</div>
              <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: active ? `linear-gradient(90deg,${meta.color},${badge.color})` : 'rgba(255,255,255,0.04)', borderRadius: '2px', transition: 'width .6s' }}/>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#4a5168' }}>
                <span>{score.xp} XP</span>
                <span>{score.problems_solved} solved</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}