import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const ADMIN_EMAILS = ['abinbiju08@gmail.com'] // Add admin emails here

export default function AdminPanel() {
  const [user, setUser]         = useState(null)
  const [allowed, setAllowed]   = useState(false)
  const [tab, setTab]           = useState('overview')
  const [stats, setStats]       = useState(null)
  const [messages, setMessages] = useState([])
  const [blocked, setBlocked]   = useState([])
  const [banned, setBanned]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [room, setRoom]         = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/'); return }
      setUser(user)
      if (!ADMIN_EMAILS.includes(user.email)) {
        setAllowed(false); setLoading(false); return
      }
      setAllowed(true)
      loadAll()
    }
    init()
  }, [])

  const loadAll = async () => {
    setLoading(true)
    const [s, m, b, ban] = await Promise.allSettled([
      fetch(`${API}/moderation/stats`).then(r=>r.json()),
      fetch(`${API}/moderation/messages?limit=50`).then(r=>r.json()),
      fetch(`${API}/moderation/blocked?limit=50`).then(r=>r.json()),
      fetch(`${API}/moderation/banned`).then(r=>r.json()),
    ])
    if (s.status==='fulfilled') setStats(s.value)
    if (m.status==='fulfilled') setMessages(Array.isArray(m.value)?m.value:[])
    if (b.status==='fulfilled') setBlocked(Array.isArray(b.value)?b.value:[])
    if (ban.status==='fulfilled') setBanned(Array.isArray(ban.value)?ban.value:[])
    setLoading(false)
  }

  const deleteMsg = async (id) => {
    await fetch(`${API}/moderation/message/${id}`, { method: 'DELETE' })
    setMessages(prev => prev.filter(m => m.id !== id))
  }

  const banUser = async (userId) => {
    await fetch(`${API}/moderation/ban`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, banned_by: user?.id })
    })
    loadAll()
  }

  const unbanUser = async (userId) => {
    await fetch(`${API}/moderation/ban/${userId}`, { method: 'DELETE' })
    setBanned(prev => prev.filter(b => b.user_id !== userId))
  }

  const timeAgo = (str) => {
    if (!str) return ''
    const diff = Date.now() - new Date(str).getTime()
    const m = Math.floor(diff/60000)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m/60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h/24)}d ago`
  }

  const S = {
    page: { background:'var(--bg)', minHeight:'calc(100vh - 52px)', fontFamily:'Inter,sans-serif', padding:'1.5rem 1rem' },
    card: { background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'14px', padding:'1.25rem', marginBottom:'1rem' },
    tab: (active) => ({ padding:'.45rem 1rem', borderRadius:'8px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight:600, fontFamily:'Inter,sans-serif', background: active ? 'rgba(0,229,160,0.12)' : 'transparent', color: active ? '#00e5a0' : 'var(--text2)' }),
    statCard: { background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'10px', padding:'.85rem 1rem', textAlign:'center' },
  }

  if (!allowed && !loading) return (
    <div style={{...S.page, display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div style={{textAlign:'center'}}>
        <i className="ti ti-shield-x" style={{fontSize:'48px', color:'#E24B4A', display:'block', marginBottom:'1rem'}} aria-hidden="true"/>
        <div style={{fontSize:'18px', fontWeight:700, color:'var(--text)', marginBottom:'.5rem'}}>Access Denied</div>
        <div style={{fontSize:'13px', color:'var(--text2)'}}>You don't have admin access.</div>
      </div>
    </div>
  )

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"/>
      <div style={S.page}>
        <div style={{maxWidth:'1000px', margin:'0 auto'}}>

          {/* Header */}
          <div style={{display:'flex', alignItems:'center', gap:'.75rem', marginBottom:'1.5rem'}}>
            <div style={{width:'40px', height:'40px', borderRadius:'10px', background:'rgba(226,75,74,0.1)', border:'1px solid rgba(226,75,74,0.25)', display:'flex', alignItems:'center', justifyContent:'center'}}>
              <i className="ti ti-shield" style={{fontSize:'20px', color:'#E24B4A'}} aria-hidden="true"/>
            </div>
            <div>
              <div style={{fontSize:'18px', fontWeight:800, color:'var(--text)'}}>Admin Panel</div>
              <div style={{fontSize:'12px', color:'var(--text2)'}}>Let's Connect moderation dashboard</div>
            </div>
            <button onClick={loadAll} style={{marginLeft:'auto', background:'none', border:'0.5px solid var(--border)', borderRadius:'8px', padding:'.35rem .75rem', color:'var(--text2)', cursor:'pointer', display:'flex', alignItems:'center', gap:'.3rem', fontSize:'12px', fontFamily:'Inter,sans-serif'}}>
              <i className="ti ti-refresh" style={{fontSize:'13px'}} aria-hidden="true"/> Refresh
            </button>
          </div>

          {/* Tabs */}
          <div style={{display:'flex', gap:'.35rem', marginBottom:'1rem', flexWrap:'wrap'}}>
            {[
              {id:'overview', icon:'ti-chart-bar', label:'Overview'},
              {id:'messages', icon:'ti-messages', label:'All messages'},
              {id:'blocked',  icon:'ti-shield-x',  label:'Blocked'},
              {id:'banned',   icon:'ti-user-x',    label:'Banned users'},
            ].map(t => (
              <button key={t.id} style={S.tab(tab===t.id)} onClick={()=>setTab(t.id)}>
                <i className={`ti ${t.icon}`} style={{fontSize:'13px', marginRight:'4px'}} aria-hidden="true"/>
                {t.label}
                {t.id==='blocked' && blocked.length>0 && <span style={{marginLeft:'4px', background:'#E24B4A', color:'white', fontSize:'10px', padding:'1px 5px', borderRadius:'10px'}}>{blocked.length}</span>}
                {t.id==='banned' && banned.length>0 && <span style={{marginLeft:'4px', background:'#f5a623', color:'#060d0a', fontSize:'10px', padding:'1px 5px', borderRadius:'10px'}}>{banned.length}</span>}
              </button>
            ))}
          </div>

          {loading ? (
            <div style={{textAlign:'center', padding:'3rem', color:'var(--text2)'}}>Loading...</div>
          ) : (
            <>
              {/* OVERVIEW TAB */}
              {tab === 'overview' && (
                <>
                  <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'1rem', marginBottom:'1rem'}}>
                    {[
                      {label:'Total messages', val: stats?.total_messages||0, color:'#00e5a0', icon:'ti-messages'},
                      {label:'Blocked messages', val: stats?.blocked_messages||0, color:'#E24B4A', icon:'ti-shield-x'},
                      {label:'Banned users', val: banned.length, color:'#f5a623', icon:'ti-user-x'},
                    ].map((s,i) => (
                      <div key={i} style={S.statCard}>
                        <i className={`ti ${s.icon}`} style={{fontSize:'22px', color:s.color, display:'block', marginBottom:'.4rem'}} aria-hidden="true"/>
                        <div style={{fontSize:'28px', fontWeight:900, color:s.color}}>{s.val}</div>
                        <div style={{fontSize:'11px', color:'var(--text3)', marginTop:'2px'}}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  <div style={S.card}>
                    <div style={{fontSize:'12px', fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'.85rem'}}>Messages by room</div>
                    {Object.entries(stats?.messages_by_room||{}).sort((a,b)=>b[1]-a[1]).map(([room,count]) => (
                      <div key={room} style={{display:'flex', alignItems:'center', gap:'.75rem', padding:'.45rem 0', borderBottom:'0.5px solid var(--border)'}}>
                        <div style={{flex:1, fontSize:'13px', color:'var(--text)'}}>{room}</div>
                        <div style={{fontSize:'13px', fontWeight:700, color:'#00e5a0'}}>{count}</div>
                        <div style={{width:'120px', height:'4px', borderRadius:'2px', background:'var(--border)', overflow:'hidden'}}>
                          <div style={{height:'100%', background:'#00e5a0', width:`${Math.min((count/(stats?.total_messages||1))*100*3, 100)}%`, borderRadius:'2px'}}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* MESSAGES TAB */}
              {tab === 'messages' && (
                <div style={S.card}>
                  <div style={{display:'flex', alignItems:'center', gap:'.5rem', marginBottom:'.85rem'}}>
                    <div style={{fontSize:'12px', fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em', flex:1}}>All messages</div>
                    <select value={room} onChange={e=>{ setRoom(e.target.value); fetch(`${API}/moderation/messages?limit=50${e.target.value?'&room='+encodeURIComponent(e.target.value):''}`).then(r=>r.json()).then(d=>setMessages(Array.isArray(d)?d:[])) }}
                      style={{background:'var(--bg2)', border:'0.5px solid var(--border)', borderRadius:'7px', padding:'.3rem .6rem', color:'var(--text)', fontSize:'12px', fontFamily:'Inter,sans-serif'}}>
                      <option value="">All rooms</option>
                      {Object.keys(stats?.messages_by_room||{}).map(r=><option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  {messages.map(msg => (
                    <div key={msg.id} style={{display:'flex', alignItems:'flex-start', gap:'.65rem', padding:'.55rem 0', borderBottom:'0.5px solid var(--border)'}}>
                      <div style={{width:'32px', height:'32px', borderRadius:'50%', background:'rgba(0,229,160,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, color:'#00e5a0', flexShrink:0}}>
                        {(msg.user_name||'?').slice(0,2).toUpperCase()}
                      </div>
                      <div style={{flex:1, minWidth:0}}>
                        <div style={{display:'flex', alignItems:'center', gap:'.4rem', marginBottom:'2px'}}>
                          <span style={{fontSize:'12px', fontWeight:600, color:'var(--text)'}}>{msg.user_name}</span>
                          <span style={{fontSize:'10px', color:'var(--text3)'}}>{timeAgo(msg.created_at)}</span>
                          <span style={{fontSize:'10px', padding:'1px 6px', borderRadius:'10px', background:'rgba(0,229,160,0.1)', color:'#00e5a0'}}>{msg.room}</span>
                        </div>
                        <div style={{fontSize:'12px', color:'var(--text2)', lineHeight:1.5, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{msg.message}</div>
                      </div>
                      <div style={{display:'flex', gap:'.3rem', flexShrink:0}}>
                        <button onClick={()=>deleteMsg(msg.id)} style={{background:'rgba(226,75,74,0.1)', border:'0.5px solid rgba(226,75,74,0.25)', borderRadius:'6px', padding:'.25rem .5rem', cursor:'pointer', color:'#E24B4A', fontSize:'11px', fontFamily:'Inter,sans-serif'}}>
                          <i className="ti ti-trash" style={{fontSize:'12px'}} aria-hidden="true"/>
                        </button>
                        <button onClick={()=>banUser(msg.user_id)} style={{background:'rgba(245,166,35,0.1)', border:'0.5px solid rgba(245,166,35,0.25)', borderRadius:'6px', padding:'.25rem .5rem', cursor:'pointer', color:'#f5a623', fontSize:'11px', fontFamily:'Inter,sans-serif'}}>
                          <i className="ti ti-user-x" style={{fontSize:'12px'}} aria-hidden="true"/>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* BLOCKED TAB */}
              {tab === 'blocked' && (
                <div style={S.card}>
                  <div style={{fontSize:'12px', fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'.85rem'}}>Blocked messages</div>
                  {blocked.length === 0 ? (
                    <div style={{textAlign:'center', padding:'2rem', color:'var(--text3)'}}>No blocked messages</div>
                  ) : blocked.map(msg => (
                    <div key={msg.id} style={{padding:'.55rem 0', borderBottom:'0.5px solid var(--border)'}}>
                      <div style={{display:'flex', alignItems:'center', gap:'.4rem', marginBottom:'3px'}}>
                        <span style={{fontSize:'12px', fontWeight:600, color:'var(--text)'}}>{msg.user_id?.slice(0,8)}...</span>
                        <span style={{fontSize:'10px', color:'var(--text3)'}}>{timeAgo(msg.created_at)}</span>
                        <span style={{fontSize:'10px', padding:'1px 6px', borderRadius:'10px', background:'rgba(226,75,74,0.1)', color:'#E24B4A', border:'0.5px solid rgba(226,75,74,0.25)'}}>{msg.blocked_by}</span>
                        <span style={{fontSize:'10px', padding:'1px 6px', borderRadius:'10px', background:'rgba(0,229,160,0.1)', color:'#00e5a0'}}>{msg.room}</span>
                      </div>
                      <div style={{fontSize:'12px', color:'#E24B4A', marginBottom:'2px', fontStyle:'italic'}}>"{msg.message}"</div>
                      <div style={{fontSize:'11px', color:'var(--text3)'}}>Reason: {msg.reason}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* BANNED TAB */}
              {tab === 'banned' && (
                <div style={S.card}>
                  <div style={{fontSize:'12px', fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'.85rem'}}>Banned users</div>
                  {banned.length === 0 ? (
                    <div style={{textAlign:'center', padding:'2rem', color:'var(--text3)'}}>No banned users</div>
                  ) : banned.map(b => (
                    <div key={b.id} style={{display:'flex', alignItems:'center', gap:'.65rem', padding:'.55rem 0', borderBottom:'0.5px solid var(--border)'}}>
                      <div style={{width:'32px', height:'32px', borderRadius:'50%', background:'rgba(226,75,74,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                        <i className="ti ti-user-x" style={{fontSize:'15px', color:'#E24B4A'}} aria-hidden="true"/>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:'12px', fontWeight:600, color:'var(--text)'}}>{b.user_id}</div>
                        <div style={{fontSize:'11px', color:'var(--text3)'}}>Banned {timeAgo(b.created_at)}</div>
                      </div>
                      <button onClick={()=>unbanUser(b.user_id)} style={{background:'rgba(0,229,160,0.1)', border:'0.5px solid rgba(0,229,160,0.25)', borderRadius:'7px', padding:'.3rem .75rem', cursor:'pointer', color:'#00e5a0', fontSize:'12px', fontFamily:'Inter,sans-serif', fontWeight:600}}>
                        Unban
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}