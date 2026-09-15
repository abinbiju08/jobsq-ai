import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const TYPES = ['Hiring', 'Internship', 'Top MNC', 'Scholarship', 'Off campus', 'Announcement']
const TYPE_META = {
  'Hiring':       { color: '#00e5a0', icon: 'ti-briefcase'   },
  'Internship':   { color: '#7c6ff7', icon: 'ti-school'      },
  'Top MNC':      { color: '#f5a623', icon: 'ti-building'    },
  'Scholarship':  { color: '#3b82f6', icon: 'ti-award'       },
  'Off campus':   { color: '#ec4899', icon: 'ti-calendar'    },
  'Announcement': { color: '#14b8a6', icon: 'ti-speakerphone'},
}

const ROOMS = ['all', 'IT & Software', 'Healthcare', 'Finance', 'Engineering', 'Marketing', 'Education', 'Sales', 'Design', 'Operations', 'General']

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h/24)}d ago`
}

export default function AdminBroadcast() {
  const [user, setUser]         = useState(null)
  const [broadcasts, setBroadcasts] = useState([])
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState('')
  const [error, setError]       = useState('')
  const [form, setForm]         = useState({
    type:       'Hiring',
    rooms:      ['all'],
    headline:   '',
    details:    '',
    link:       '',
    link_label: 'Apply now',
    pinned:     true,
    pin_days:   7,
  })

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    loadBroadcasts()
  }, [])

  async function loadBroadcasts() {
    const { data } = await supabase.from('broadcasts').select('*').order('created_at', { ascending: false }).limit(20)
    setBroadcasts(data || [])
  }

  function toggleRoom(room) {
    setForm(f => {
      if (room === 'all') return { ...f, rooms: ['all'] }
      const without = f.rooms.filter(r => r !== 'all' && r !== room)
      return { ...f, rooms: f.rooms.includes(room) ? without : [...without, room] }
    })
  }

  async function send() {
    if (!form.headline.trim()) { setError('Headline is required'); return }
    if (!user?.email) { setError('Not logged in'); return }
    setLoading(true); setError(''); setSuccess('')
    try {
      const res  = await fetch(`${API}/broadcast/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, admin_email: user.email })
      })
      const data = await res.json()
      if (!data.success) throw new Error('Failed')
      setSuccess('Broadcast sent successfully!')
      setForm(f => ({ ...f, headline: '', details: '', link: '' }))
      loadBroadcasts()
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError('Failed to send broadcast. Check backend connection.')
    }
    setLoading(false)
  }

  async function deleteBroadcast(id) {
    if (!user?.email) return
    await fetch(`${API}/broadcast/${id}?admin_email=${encodeURIComponent(user.email)}`, { method: 'DELETE' })
    setBroadcasts(prev => prev.filter(b => b.id !== id))
  }

  const meta = TYPE_META[form.type] || TYPE_META['Announcement']

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontFamily: 'Inter,sans-serif' }}>

        {/* Compose panel */}
        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', marginBottom: '1rem' }}>
            <i className="ti ti-speakerphone" style={{ fontSize: '18px', color: '#00e5a0' }} aria-hidden="true"/>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>New broadcast</span>
          </div>

          {/* Type selector */}
          <div style={{ marginBottom: '.85rem' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.4rem' }}>Type</div>
            <div style={{ display: 'flex', gap: '.35rem', flexWrap: 'wrap' }}>
              {TYPES.map(t => {
                const m = TYPE_META[t]
                const active = form.type === t
                return (
                  <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                    style={{ display: 'flex', alignItems: 'center', gap: '.3rem', padding: '4px 12px', borderRadius: '20px', border: `0.5px solid ${active ? m.color + '55' : 'var(--border)'}`, background: active ? m.color + '18' : 'transparent', color: active ? m.color : 'var(--text3)', fontSize: '12px', fontWeight: active ? 700 : 400, cursor: 'pointer', fontFamily: 'Inter,sans-serif', transition: 'all .15s' }}>
                    <i className={`ti ${m.icon}`} style={{ fontSize: '13px' }} aria-hidden="true"/>
                    {t}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Room selector */}
          <div style={{ marginBottom: '.85rem' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.4rem' }}>Send to</div>
            <div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap' }}>
              {ROOMS.map(r => {
                const active = form.rooms.includes(r)
                return (
                  <button key={r} onClick={() => toggleRoom(r)}
                    style={{ padding: '3px 10px', borderRadius: '20px', border: `0.5px solid ${active ? 'rgba(0,229,160,0.4)' : 'var(--border)'}`, background: active ? 'rgba(0,229,160,0.1)' : 'transparent', color: active ? '#00e5a0' : 'var(--text3)', fontSize: '11px', fontWeight: active ? 700 : 400, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                    {r === 'all' ? 'All rooms' : r}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Headline */}
          <div style={{ marginBottom: '.75rem' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.35rem' }}>Headline</div>
            <input value={form.headline} onChange={e => setForm(f => ({ ...f, headline: e.target.value }))}
              placeholder="e.g. Google India hiring — 120 openings across SWE, PM, Data"
              style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '9px', padding: '.55rem .85rem', color: 'var(--text)', fontSize: '13px', fontFamily: 'Inter,sans-serif', outline: 'none', boxSizing: 'border-box' }}/>
          </div>

          {/* Details */}
          <div style={{ marginBottom: '.75rem' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.35rem' }}>Details</div>
            <input value={form.details} onChange={e => setForm(f => ({ ...f, details: e.target.value }))}
              placeholder="e.g. Full-time · Bangalore · Freshers welcome · Last date Oct 15"
              style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '9px', padding: '.55rem .85rem', color: 'var(--text)', fontSize: '13px', fontFamily: 'Inter,sans-serif', outline: 'none', boxSizing: 'border-box' }}/>
          </div>

          {/* Link row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '.65rem', marginBottom: '.85rem' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.35rem' }}>Apply / register link</div>
              <input value={form.link} onChange={e => setForm(f => ({ ...f, link: e.target.value }))}
                placeholder="https://..."
                style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '9px', padding: '.55rem .85rem', color: 'var(--text)', fontSize: '13px', fontFamily: 'Inter,sans-serif', outline: 'none', boxSizing: 'border-box' }}/>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.35rem' }}>Button label</div>
              <select value={form.link_label} onChange={e => setForm(f => ({ ...f, link_label: e.target.value }))}
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '9px', padding: '.55rem .75rem', color: 'var(--text)', fontSize: '13px', fontFamily: 'Inter,sans-serif', outline: 'none', cursor: 'pointer' }}>
                {['Apply now', 'Register now', 'View details', 'Learn more', 'Apply here'].map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>

          {/* Pin options */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.65rem .85rem', background: form.pinned ? 'rgba(0,229,160,0.05)' : 'rgba(255,255,255,0.02)', border: `0.5px solid ${form.pinned ? 'rgba(0,229,160,0.2)' : 'var(--border)'}`, borderRadius: '9px', marginBottom: '.85rem', transition: 'all .2s' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: form.pinned ? '#00e5a0' : 'var(--text)' }}>Pin to top of chat</div>
              <div style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '1px' }}>Stays visible above messages for all users</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '.65rem' }}>
              {form.pinned && (
                <select value={form.pin_days} onChange={e => setForm(f => ({ ...f, pin_days: parseInt(e.target.value) }))}
                  style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '.3rem .6rem', color: 'var(--text)', fontSize: '12px', fontFamily: 'Inter,sans-serif', outline: 'none', cursor: 'pointer' }}>
                  <option value={1}>1 day</option>
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              )}
              <div onClick={() => setForm(f => ({ ...f, pinned: !f.pinned }))}
                style={{ width: '40px', height: '22px', borderRadius: '11px', background: form.pinned ? '#00e5a0' : 'rgba(255,255,255,0.1)', cursor: 'pointer', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
                <div style={{ position: 'absolute', top: '3px', left: form.pinned ? '21px' : '3px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left .2s' }}/>
              </div>
            </div>
          </div>

          {/* Preview */}
          {form.headline && (
            <div style={{ padding: '.75rem .85rem', background: 'rgba(255,255,255,0.02)', border: `0.5px solid ${meta.color}33`, borderRadius: '10px', marginBottom: '.85rem' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.5rem' }}>Preview</div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '.5rem' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: meta.color + '18', border: `0.5px solid ${meta.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`ti ${meta.icon}`} style={{ fontSize: '14px', color: meta.color }} aria-hidden="true"/>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', marginBottom: '2px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--text3)' }}>JobsQ</span>
                    <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '8px', background: meta.color + '18', color: meta.color, fontWeight: 700 }}>{form.type}</span>
                    {form.pinned && <i className="ti ti-pin" style={{ fontSize: '11px', color: 'var(--text3)' }} aria-hidden="true"/>}
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)', marginBottom: '2px' }}>{form.headline}</div>
                  {form.details && <div style={{ fontSize: '11px', color: 'var(--text2)', marginBottom: '3px' }}>{form.details}</div>}
                  {form.link && <span style={{ fontSize: '11px', fontWeight: 700, color: meta.color }}>{form.link_label} →</span>}
                </div>
              </div>
            </div>
          )}

          {error   && <div style={{ fontSize: '12px', color: '#ff6b6b', marginBottom: '.5rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}><i className="ti ti-alert-circle" style={{ fontSize: '14px' }} aria-hidden="true"/>{error}</div>}
          {success && <div style={{ fontSize: '12px', color: '#00e5a0', marginBottom: '.5rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}><i className="ti ti-circle-check" style={{ fontSize: '14px' }} aria-hidden="true"/>{success}</div>}

          <button onClick={send} disabled={loading || !form.headline.trim()}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '.4rem', padding: '.65rem', background: form.headline.trim() ? 'linear-gradient(135deg,#00e5a0,#00c484)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '10px', color: form.headline.trim() ? '#060d0a' : 'var(--text3)', fontSize: '13px', fontWeight: 700, cursor: form.headline.trim() ? 'pointer' : 'not-allowed', fontFamily: 'Inter,sans-serif', opacity: loading ? .7 : 1 }}>
            {loading
              ? <><i className="ti ti-loader" style={{ fontSize: '15px', animation: 'spin .8s linear infinite' }} aria-hidden="true"/> Sending...</>
              : <><i className="ti ti-speakerphone" style={{ fontSize: '15px' }} aria-hidden="true"/> Broadcast to {form.rooms.includes('all') ? 'all rooms' : `${form.rooms.length} room${form.rooms.length > 1 ? 's' : ''}`}</>
            }
          </button>
        </div>

        {/* Existing broadcasts */}
        {broadcasts.length > 0 && (
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1.25rem' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginBottom: '.85rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
              <i className="ti ti-history" style={{ fontSize: '15px', color: 'var(--text3)' }} aria-hidden="true"/>
              Recent broadcasts
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
              {broadcasts.map(b => {
                const m = TYPE_META[b.type] || TYPE_META['Announcement']
                return (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '.65rem', padding: '.65rem .75rem', background: 'rgba(255,255,255,0.02)', border: '0.5px solid var(--border)', borderRadius: '10px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: m.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={`ti ${m.icon}`} style={{ fontSize: '14px', color: m.color }} aria-hidden="true"/>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '.35rem', marginBottom: '2px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '8px', background: m.color + '18', color: m.color, fontWeight: 700 }}>{b.type}</span>
                        {b.pinned && <span style={{ fontSize: '9px', color: 'var(--text3)', display: 'flex', alignItems: 'center', gap: '2px' }}><i className="ti ti-pin" style={{ fontSize: '10px' }} aria-hidden="true"/> Pinned</span>}
                        <span style={{ fontSize: '10px', color: 'var(--text3)' }}>{timeAgo(b.created_at)}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text3)' }}>→ {(b.rooms || ['all']).join(', ')}</span>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.headline}</div>
                    </div>
                    <button onClick={() => deleteBroadcast(b.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', padding: '.25rem', display: 'flex', alignItems: 'center', flexShrink: 0, transition: 'color .15s' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#ff6b6b'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
                      aria-label="Delete broadcast">
                      <i className="ti ti-trash" style={{ fontSize: '14px' }} aria-hidden="true"/>
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}