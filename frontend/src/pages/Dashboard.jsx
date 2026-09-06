import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Parse any date format to JS Date
function parseDate(str) {
  if (!str) return null
  try {
    // Handles "2024-01-15", "2024-01-15T10:30:00+00:00", "Jan 15", etc.
    const d = new Date(str)
    return isNaN(d.getTime()) ? null : d
  } catch { return null }
}

function daysAgo(dateStr) {
  const d = parseDate(dateStr)
  if (!d) return 999
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

function toDateKey(dateStr) {
  const d = parseDate(dateStr)
  if (!d) return null
  return d.toISOString().slice(0, 10)
}

// Mini bar chart
function BarChart({ data, color }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:'6px',height:'60px'}}>
      {data.map((d, i) => (
        <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'3px'}}>
          <div style={{
            width:'100%', borderRadius:'3px 3px 0 0',
            background: d.count > 0 ? color : 'rgba(255,255,255,0.06)',
            height: `${Math.max((d.count / max) * 48, d.count > 0 ? 8 : 3)}px`,
            transition: 'height .7s cubic-bezier(.16,1,.3,1)',
            position:'relative'
          }}>
            {d.count > 0 && (
              <div style={{position:'absolute',top:'-16px',left:'50%',transform:'translateX(-50%)',fontSize:'9px',color,fontWeight:700}}>{d.count}</div>
            )}
          </div>
          <div style={{fontSize:'9px',color:'#4a5168',whiteSpace:'nowrap'}}>{d.label}</div>
        </div>
      ))}
    </div>
  )
}

// Radial progress ring
function RadialProgress({ pct, color, size=72, stroke=7 }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (Math.min(pct, 100) / 100) * circ
  return (
    <svg width={size} height={size} style={{overflow:'visible'}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{transition:'stroke-dasharray .8s cubic-bezier(.16,1,.3,1)'}}/>
      <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={size*0.2} fontWeight="800" fontFamily="Inter,sans-serif">{pct}%</text>
    </svg>
  )
}

export default function Dashboard() {
  const [user, setUser]             = useState(null)
  const [stats, setStats]           = useState({total:0,Applied:0,Interview:0,Offer:0,Rejected:0})
  const [apps, setApps]             = useState([])
  const [notifications, setNotifs]  = useState([])
  const [alerts, setAlerts]         = useState(null)
  const [aiTip, setAiTip]           = useState('')
  const [tipLoading, setTipLoading] = useState(false)
  const [loading, setLoading]       = useState(true)
  const [errors, setErrors]         = useState({})
  const navigate = useNavigate()

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    setUser(user)
    const errs = {}

    // Load all in parallel, track errors individually
    const results = await Promise.allSettled([
      fetch(`${API}/tracker/stats?user_id=${user.id}`).then(r=>r.json()),
      fetch(`${API}/tracker/?user_id=${user.id}`).then(r=>r.json()),
      fetch(`${API}/alerts/notifications?user_id=${user.id}`).then(r=>r.json()),
      fetch(`${API}/alerts/?user_id=${user.id}`).then(r=>r.json()),
    ])

    // Stats
    if (results[0].status === 'fulfilled' && results[0].value) {
      setStats(results[0].value)
    } else { errs.stats = true }

    // Apps
    if (results[1].status === 'fulfilled' && Array.isArray(results[1].value)) {
      setApps(results[1].value)
    } else { errs.apps = true }

    // Notifications
    if (results[2].status === 'fulfilled' && Array.isArray(results[2].value)) {
      setNotifs(results[2].value.slice(0, 6))
    } else { errs.notifs = true }

    // Alerts
    if (results[3].status === 'fulfilled' && results[3].value?.roles) {
      setAlerts(results[3].value)
    }

    setErrors(errs)
    setLoading(false)
    loadTip()
  }

  const loadTip = async () => {
    setTipLoading(true)
    try {
      const res = await fetch(`${API}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Give one specific, actionable job search tip for today. Max 2 sentences. Be direct. No greetings.',
          history: []
        })
      })
      const d = await res.json()
      setAiTip(d.reply || '')
    } catch(e) { setAiTip('') }
    setTipLoading(false)
  }

  // ── COMPUTED DATA (all from real apps array) ──────────────────
  // Weekly bar chart — last 7 days using real applied_date or created_at
  const chartData = (() => {
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateKey = d.toISOString().slice(0, 10)
      const label = d.toLocaleDateString('en', { weekday: 'short' })
      const count = apps.filter(a => {
        const appDate = toDateKey(a.applied_date) || toDateKey(a.created_at)
        return appDate === dateKey
      }).length
      days.push({ label, count, dateKey })
    }
    return days
  })()

  // Interviews — real status from tracker
  const interviews = apps.filter(a => a.status === 'Interview')

  // Follow-ups — applied 7+ days ago, still in Applied status, real date calc
  const followUps = apps.filter(a => {
    if (a.status !== 'Applied') return false
    const dateStr = a.applied_date || a.created_at
    const days = daysAgo(dateStr)
    return days >= 7 && days < 999
  }).slice(0, 3)

  // Real success metrics
  const total = stats.total || 0
  const interviewRate = total > 0 ? Math.round(((stats.Interview || 0) + (stats.Offer || 0)) / total * 100) : 0
  const offerRate     = total > 0 ? Math.round((stats.Offer || 0) / total * 100) : 0
  const weekTotal     = chartData.reduce((a, d) => a + d.count, 0)

  const hour = new Date().getHours()
  const greeting  = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const greetIcon = hour < 12 ? 'ti-sun-high' : hour < 17 ? 'ti-sun' : 'ti-moon'
  const greetColor= hour < 12 ? '#f5a623' : hour < 17 ? '#3b82f6' : '#7c6ff7'
  const name = user?.email?.split('@')[0] || 'there'

  const S = {
    card: { background:'var(--bg3,#141828)', border:'1px solid var(--border,rgba(255,255,255,0.07))', borderRadius:'14px', padding:'1.1rem 1.25rem' },
    secTitle: { display:'flex', alignItems:'center', gap:'.4rem', fontSize:'11px', fontWeight:700, color:'#4a5168', textTransform:'uppercase', letterSpacing:'.07em', marginBottom:'.85rem' },
    focusRow: { display:'flex', alignItems:'center', gap:'.65rem', padding:'.55rem 0', borderBottom:'0.5px solid rgba(255,255,255,0.05)' },
  }

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"/>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .dash{background:var(--bg,#080c18);min-height:calc(100vh - 52px);font-family:Inter,sans-serif;overflow-y:auto;}
        .dash-wrap{max-width:960px;margin:0 auto;padding:1.5rem 1rem;}
        .grid2{display:grid;grid-template-columns:1fr 1fr;gap:1rem;}
        .qa-btn{display:flex;flex-direction:column;align-items:center;gap:.4rem;padding:.75rem .4rem;background:rgba(255,255,255,0.02);border:0.5px solid rgba(255,255,255,0.07);border-radius:10px;cursor:pointer;font-family:Inter,sans-serif;transition:all .15s;}
        .qa-btn:hover{transform:translateY(-2px);}
        .stat-cell{text-align:center;padding:.85rem .5rem;background:rgba(255,255,255,0.02);border-radius:10px;cursor:pointer;transition:all .15s;}
        @media(max-width:640px){.grid2{grid-template-columns:1fr;}}
      `}</style>

      <div className="dash">
        <div className="dash-wrap">

          {/* Hero greeting */}
          <div style={{background:'linear-gradient(135deg,rgba(0,229,160,0.06),rgba(124,111,247,0.04))',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'16px',padding:'1.25rem 1.5rem',marginBottom:'1.25rem',display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap'}}>
            <div style={{width:'46px',height:'46px',borderRadius:'12px',background:`${greetColor}14`,border:`1px solid ${greetColor}25`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <i className={`ti ${greetIcon}`} style={{fontSize:'22px',color:greetColor}} aria-hidden="true"/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:'18px',fontWeight:800,color:'#eef0ff',marginBottom:'2px'}}>
                {greeting}, <span style={{color:'#00e5a0'}}>{name}</span>
              </div>
              <div style={{fontSize:'12px',color:'#8b93b0'}}>
                {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
                {total > 0 && <> · <span style={{color:'#00e5a0',fontWeight:600}}>{total} applications tracked</span></>}
              </div>
            </div>
            <div style={{display:'flex',alignItems:'center',gap:'.4rem',padding:'.3rem .75rem',borderRadius:'20px',background:'rgba(0,229,160,0.08)',border:'0.5px solid rgba(0,229,160,0.2)',flexShrink:0}}>
              <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#00e5a0',animation:'blink 1.5s infinite'}}/>
              <span style={{fontSize:'11px',color:'#00e5a0',fontWeight:600}}>Live data</span>
            </div>
          </div>

          {loading ? (
            <div style={{textAlign:'center',padding:'4rem',color:'#8b93b0'}}>
              <i className="ti ti-loader" style={{fontSize:'32px',display:'block',marginBottom:'1rem',color:'#00e5a0',animation:'spin .8s linear infinite'}} aria-hidden="true"/>
              Loading your real data...
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'1rem'}}>

              {/* ROW 1 — Stats + Rates */}
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:'1rem'}}>
                <div style={S.card}>
                  <div style={S.secTitle}><i className="ti ti-chart-bar" aria-hidden="true"/> Application stats — live from tracker</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'.45rem'}}>
                    {[
                      {label:'Total',     val:stats.total||0,     color:'#eef0ff', icon:'ti-list'},
                      {label:'Applied',   val:stats.Applied||0,   color:'#3b82f6', icon:'ti-send'},
                      {label:'Interview', val:stats.Interview||0, color:'#f5a623', icon:'ti-users'},
                      {label:'Offer',     val:stats.Offer||0,     color:'#00e5a0', icon:'ti-check'},
                      {label:'Rejected',  val:stats.Rejected||0,  color:'#ff4d6d', icon:'ti-x'},
                    ].map(s=>(
                      <div key={s.label} className="stat-cell"
                        style={{border:`0.5px solid ${s.color}20`}}
                        onClick={()=>navigate('/tracker')}
                        onMouseEnter={e=>e.currentTarget.style.background=s.color+'12'}
                        onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.02)'}>
                        <i className={`ti ${s.icon}`} style={{fontSize:'16px',color:s.color,display:'block',marginBottom:'.3rem'}} aria-hidden="true"/>
                        <div style={{fontSize:'24px',fontWeight:900,color:s.color,lineHeight:1}}>{s.val}</div>
                        <div style={{fontSize:'9px',color:'#4a5168',marginTop:'3px',textTransform:'uppercase',letterSpacing:'.04em'}}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {errors.stats && <div style={{marginTop:'.5rem',fontSize:'11px',color:'#ff4d6d',display:'flex',alignItems:'center',gap:'.3rem'}}><i className="ti ti-alert-circle" style={{fontSize:'12px'}} aria-hidden="true"/> Could not load stats — check backend</div>}
                </div>

                <div style={S.card}>
                  <div style={S.secTitle}><i className="ti ti-target" aria-hidden="true"/> Your success rates</div>
                  {total === 0 ? (
                    <div style={{textAlign:'center',padding:'.75rem 0',fontSize:'12px',color:'#4a5168'}}>
                      <i className="ti ti-chart-pie" style={{fontSize:'24px',display:'block',marginBottom:'.5rem'}} aria-hidden="true"/>
                      Track applications to see rates
                    </div>
                  ) : (
                    <div style={{display:'flex',gap:'1rem',justifyContent:'center',alignItems:'center'}}>
                      <div style={{textAlign:'center'}}>
                        <RadialProgress pct={interviewRate} color="#f5a623" size={68} stroke={7}/>
                        <div style={{fontSize:'10px',color:'#4a5168',marginTop:'4px'}}>Interview rate</div>
                      </div>
                      <div style={{textAlign:'center'}}>
                        <RadialProgress pct={offerRate} color="#00e5a0" size={68} stroke={7}/>
                        <div style={{fontSize:'10px',color:'#4a5168',marginTop:'4px'}}>Offer rate</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ROW 2 — Chart + Focus */}
              <div className="grid2">
                <div style={S.card}>
                  <div style={S.secTitle}>
                    <i className="ti ti-activity" aria-hidden="true"/> Activity — last 7 days
                    <span style={{marginLeft:'auto',fontSize:'11px',color:'#00e5a0',fontWeight:600}}>{weekTotal} this week</span>
                  </div>
                  {weekTotal === 0 ? (
                    <div style={{textAlign:'center',padding:'1rem 0',fontSize:'12px',color:'#4a5168'}}>
                      <i className="ti ti-chart-bar" style={{fontSize:'22px',display:'block',marginBottom:'.4rem'}} aria-hidden="true"/>
                      No applications this week — start applying!
                      <div style={{marginTop:'.5rem'}}>
                        <button onClick={()=>navigate('/jobs')} style={{fontSize:'11px',padding:'.35rem .8rem',borderRadius:'8px',border:'0.5px solid rgba(0,229,160,0.3)',background:'rgba(0,229,160,0.08)',color:'#00e5a0',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
                          Find jobs
                        </button>
                      </div>
                    </div>
                  ) : (
                    <BarChart data={chartData} color="#00e5a0"/>
                  )}
                </div>

                <div style={S.card}>
                  <div style={S.secTitle}><i className="ti ti-focus-2" aria-hidden="true"/> Today's focus</div>
                  {interviews.length === 0 && followUps.length === 0 ? (
                    <div style={{textAlign:'center',padding:'1rem 0',fontSize:'12px',color:'#4a5168'}}>
                      <i className="ti ti-circle-check" style={{fontSize:'24px',display:'block',marginBottom:'.4rem',color:'#00e5a0'}} aria-hidden="true"/>
                      <span style={{color:'#00e5a0',fontWeight:600}}>All clear!</span><br/>
                      No pending interviews or overdue follow-ups
                    </div>
                  ) : (
                    <>
                      {interviews.length > 0 && (
                        <>
                          <div style={{fontSize:'10px',fontWeight:700,color:'#f5a623',display:'flex',alignItems:'center',gap:'.3rem',marginBottom:'.4rem'}}>
                            <i className="ti ti-users" style={{fontSize:'12px'}} aria-hidden="true"/> Interviews ({interviews.length})
                          </div>
                          {interviews.slice(0, 2).map((a, i) => (
                            <div key={i} style={{...S.focusRow, borderBottom: i===Math.min(interviews.length,2)-1&&followUps.length===0?'none':undefined}}>
                              <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#f5a623',flexShrink:0}}/>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:'12px',fontWeight:600,color:'#eef0ff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.job_title}</div>
                                <div style={{fontSize:'11px',color:'#8b93b0'}}>{a.company}</div>
                              </div>
                              <span style={{fontSize:'10px',padding:'2px 7px',borderRadius:'10px',background:'rgba(245,166,35,0.1)',color:'#f5a623',border:'0.5px solid rgba(245,166,35,0.25)',flexShrink:0}}>Interview</span>
                            </div>
                          ))}
                        </>
                      )}
                      {followUps.length > 0 && (
                        <>
                          <div style={{fontSize:'10px',fontWeight:700,color:'#7c6ff7',display:'flex',alignItems:'center',gap:'.3rem',margin:'.5rem 0 .4rem'}}>
                            <i className="ti ti-clock" style={{fontSize:'12px'}} aria-hidden="true"/> Follow up needed
                          </div>
                          {followUps.map((a, i) => (
                            <div key={i} style={{...S.focusRow,borderBottom:i===followUps.length-1?'none':undefined}}>
                              <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#7c6ff7',flexShrink:0}}/>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:'12px',fontWeight:600,color:'#eef0ff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.job_title}</div>
                                <div style={{fontSize:'11px',color:'#8b93b0'}}>{a.company} · {daysAgo(a.applied_date||a.created_at)}d ago</div>
                              </div>
                              <span style={{fontSize:'10px',padding:'2px 7px',borderRadius:'10px',background:'rgba(124,111,247,0.1)',color:'#7c6ff7',border:'0.5px solid rgba(124,111,247,0.25)',flexShrink:0}}>Follow up</span>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* ROW 3 — AI Tip + Notifications */}
              <div className="grid2">
                <div style={{...S.card,background:'linear-gradient(135deg,rgba(0,229,160,0.06),rgba(124,111,247,0.03))',border:'1px solid rgba(0,229,160,0.18)'}}>
                  <div style={{...S.secTitle,color:'#00e5a0'}}>
                    <i className="ti ti-bulb" aria-hidden="true"/> AI tip of the day
                    <button onClick={loadTip} disabled={tipLoading}
                      style={{marginLeft:'auto',background:'none',border:'none',color:'#00e5a0',cursor:tipLoading?'not-allowed':'pointer',display:'flex',alignItems:'center',gap:'.25rem',fontSize:'11px',fontFamily:'Inter,sans-serif',opacity:tipLoading?.5:1}}>
                      <i className={`ti ti-refresh`} style={{fontSize:'13px',animation:tipLoading?'spin .8s linear infinite':undefined}} aria-hidden="true"/>
                      {tipLoading?'Loading...':'New tip'}
                    </button>
                  </div>
                  {tipLoading ? (
                    <div style={{display:'flex',alignItems:'center',gap:'.5rem',fontSize:'13px',color:'#4a5168'}}>
                      <i className="ti ti-loader" style={{fontSize:'16px',animation:'spin .8s linear infinite'}} aria-hidden="true"/>
                      Getting today's tip from AI...
                    </div>
                  ) : aiTip ? (
                    <div style={{display:'flex',gap:'.65rem',alignItems:'flex-start'}}>
                      <i className="ti ti-robot" style={{fontSize:'18px',color:'#00e5a0',flexShrink:0,marginTop:'2px'}} aria-hidden="true"/>
                      <span style={{fontSize:'13px',color:'#8b93b0',lineHeight:1.7}}>{aiTip}</span>
                    </div>
                  ) : (
                    <div style={{fontSize:'12px',color:'#4a5168',display:'flex',alignItems:'center',gap:'.4rem'}}>
                      <i className="ti ti-wifi-off" style={{fontSize:'14px'}} aria-hidden="true"/>
                      Could not load tip — check backend connection
                    </div>
                  )}
                </div>

                <div style={S.card}>
                  <div style={S.secTitle}>
                    <i className="ti ti-bell" aria-hidden="true"/> Notifications
                    {notifications.filter(n=>!n.read).length > 0 && (
                      <span style={{fontSize:'9px',padding:'1px 6px',borderRadius:'10px',background:'rgba(255,77,109,0.15)',color:'#ff4d6d',border:'0.5px solid rgba(255,77,109,0.3)',fontWeight:700}}>
                        {notifications.filter(n=>!n.read).length} new
                      </span>
                    )}
                  </div>
                  {errors.notifs ? (
                    <div style={{fontSize:'12px',color:'#4a5168',display:'flex',alignItems:'center',gap:'.4rem'}}>
                      <i className="ti ti-alert-circle" style={{fontSize:'14px',color:'#ff4d6d'}} aria-hidden="true"/>
                      Could not load notifications
                    </div>
                  ) : notifications.length === 0 ? (
                    <div style={{textAlign:'center',padding:'.75rem 0',fontSize:'12px',color:'#4a5168'}}>
                      <i className="ti ti-bell-off" style={{fontSize:'22px',display:'block',marginBottom:'.4rem'}} aria-hidden="true"/>
                      No notifications yet — set a job alert to get notified
                    </div>
                  ) : notifications.map((n, i) => (
                    <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'.6rem',padding:'.55rem 0',borderBottom:i===notifications.length-1?'none':'0.5px solid rgba(255,255,255,0.05)'}}>
                      <div style={{width:'7px',height:'7px',borderRadius:'50%',background:n.read?'rgba(255,255,255,0.1)':'#00e5a0',flexShrink:0,marginTop:'5px'}}/>
                      <div style={{flex:1}}>
                        <div style={{fontSize:'12px',color:n.read?'#8b93b0':'#eef0ff',lineHeight:1.5}}>{n.message}</div>
                        <div style={{fontSize:'10px',color:'#4a5168',marginTop:'1px'}}>
                          {new Date(n.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* ROW 4 — Alert banner */}
              {alerts ? (
                <div style={{...S.card,display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap'}}>
                  <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'rgba(0,229,160,0.08)',border:'0.5px solid rgba(0,229,160,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <i className="ti ti-bell-ringing" style={{fontSize:'18px',color:'#00e5a0'}} aria-hidden="true"/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'13px',fontWeight:700,color:'#eef0ff',marginBottom:'2px'}}>
                      Job alert active — {alerts.roles?.slice(0,3).join(', ')}{alerts.roles?.length>3?` +${alerts.roles.length-3} more`:''}
                    </div>
                    <div style={{fontSize:'11px',color:'#8b93b0'}}>
                      {alerts.locations?.length>0?alerts.locations.join(', '):'All locations'}
                      {alerts.job_types?.length>0 && ` · ${alerts.job_types.join(', ')}`}
                    </div>
                  </div>
                  <span style={{fontSize:'11px',padding:'3px 10px',borderRadius:'20px',background:'rgba(0,229,160,0.08)',border:'0.5px solid rgba(0,229,160,0.25)',color:'#00e5a0',fontWeight:700,flexShrink:0,display:'flex',alignItems:'center',gap:'.3rem'}}>
                    <i className="ti ti-circle-check" style={{fontSize:'12px'}} aria-hidden="true"/> Active
                  </span>
                </div>
              ) : (
                <div style={{...S.card,display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap',borderColor:'rgba(245,166,35,0.15)'}}>
                  <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'rgba(245,166,35,0.08)',border:'0.5px solid rgba(245,166,35,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <i className="ti ti-bell-off" style={{fontSize:'18px',color:'#f5a623'}} aria-hidden="true"/>
                  </div>
                  <div style={{flex:1,fontSize:'13px',color:'#8b93b0'}}>No job alert set — get notified when new jobs match your profile</div>
                  <button onClick={()=>navigate('/jobs')}
                    style={{fontSize:'12px',padding:'.45rem 1rem',borderRadius:'9px',background:'rgba(245,166,35,0.1)',border:'0.5px solid rgba(245,166,35,0.3)',color:'#f5a623',cursor:'pointer',fontFamily:'Inter,sans-serif',fontWeight:600,flexShrink:0,display:'flex',alignItems:'center',gap:'.35rem'}}>
                    <i className="ti ti-bell" style={{fontSize:'13px'}} aria-hidden="true"/> Set alert
                  </button>
                </div>
              )}

              {/* ROW 5 — Quick actions */}
              <div style={S.card}>
                <div style={S.secTitle}><i className="ti ti-rocket" aria-hidden="true"/> Quick actions</div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:'.5rem'}}>
                  {[
                    {icon:'ti-search',        label:'Find jobs',   path:'/jobs',           color:'#00e5a0'},
                    {icon:'ti-file-check',    label:'ATS score',   path:'/resume',         color:'#7c6ff7'},
                    {icon:'ti-pencil',        label:'Builder',     path:'/resume-builder', color:'#3b82f6'},
                    {icon:'ti-microphone',    label:'Interview',   path:'/interview',      color:'#f5a623'},
                    {icon:'ti-layout-kanban', label:'Tracker',     path:'/tracker',        color:'#14b8a6'},
                    {icon:'ti-users',         label:'Connect',     path:'/connect',        color:'#ec4899'},
                    {icon:'ti-brain',         label:'Career AI',   path:'/interview',      color:'#a855f7'},
                    {icon:'ti-user-circle',   label:'Profile',     path:'/profile',        color:'#94a3b8'},
                  ].map(a=>(
                    <button key={a.label} onClick={()=>navigate(a.path)} className="qa-btn"
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=a.color+'55';e.currentTarget.style.background=a.color+'0e'}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.07)';e.currentTarget.style.background='rgba(255,255,255,0.02)'}}>
                      <i className={`ti ${a.icon}`} style={{fontSize:'20px',color:a.color}} aria-hidden="true"/>
                      <span style={{fontSize:'9px',color:'#8b93b0',textAlign:'center',lineHeight:1.3}}>{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </>
  )
}