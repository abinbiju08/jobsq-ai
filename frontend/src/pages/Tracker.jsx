import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const STATUSES = ['Applied','Interview','Offer','Rejected']
const STATUS_COLORS = {
  Applied:   { bg:'rgba(59,130,246,0.12)',  border:'rgba(59,130,246,0.3)',  color:'#3b82f6' },
  Interview: { bg:'rgba(245,166,35,0.12)',  border:'rgba(245,166,35,0.3)',  color:'#f5a623' },
  Offer:     { bg:'rgba(0,229,160,0.12)',   border:'rgba(0,229,160,0.3)',   color:'#00e5a0' },
  Rejected:  { bg:'rgba(255,77,109,0.12)',  border:'rgba(255,77,109,0.3)',  color:'#ff4d6d' },
}
const STATUS_ICONS = {
  Applied:   'ti-send',
  Interview: 'ti-users',
  Offer:     'ti-check',
  Rejected:  'ti-x',
}

const S = {
  page:  { background:'var(--bg)', minHeight:'calc(100vh - 52px)', fontFamily:'Inter,sans-serif', padding:'1.5rem 1rem' },
  wrap:  { maxWidth:'1100px', margin:'0 auto' },
  card:  { background:'var(--bg3)', border:'1px solid var(--border,rgba(255,255,255,0.07))', borderRadius:'14px', padding:'1.25rem' },
  btn:   { display:'flex', alignItems:'center', gap:'.4rem', padding:'.6rem 1.1rem', background:'linear-gradient(135deg,#00e5a0,#00c484)', border:'none', borderRadius:'9px', color:'#060d0a', fontSize:'13px', fontWeight:700, cursor:'pointer', fontFamily:'Inter,sans-serif' },
  btnG:  { display:'flex', alignItems:'center', gap:'.4rem', padding:'.6rem 1.1rem', background:'rgba(var(--input-bg,255,255,255),0.04)', border:'1px solid var(--border2)', borderRadius:'9px', color:'var(--text2)', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'Inter,sans-serif' },
  input: { width:'100%', background:'rgba(var(--input-bg,255,255,255),0.04)', border:'1px solid var(--border)', borderRadius:'9px', padding:'.55rem .85rem', color:'var(--text)', fontSize:'13px', fontFamily:'Inter,sans-serif', outline:'none', boxSizing:'border-box' },
  label: { fontSize:'11px', fontWeight:700, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'.3rem', display:'block' },
}

function AddApplicationModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ job_title:'', company:'', location:'', job_url:'', salary:'', job_type:'', status:'Applied', notes:'', applied_date: new Date().toISOString().slice(0,10) })
  const upd = (k,v) => setForm(f=>({...f,[k]:v}))

  const submit = async () => {
    if (!form.job_title || !form.company) { alert('Please enter job title and company'); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const res = await fetch(`${API}/tracker/`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id: user.id, ...form }) })
    const data = await res.json()
    if (data.success) { onAdd(data.data[0]); onClose() }
  }

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(6,9,20,0.88)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)',padding:'1rem'}}>
      <div style={{background:'var(--bg2)',border:'1px solid var(--border2)',borderRadius:'20px',padding:'1.75rem',width:'100%',maxWidth:'480px',maxHeight:'90vh',overflowY:'auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
          <div style={{display:'flex',alignItems:'center',gap:'.6rem'}}>
            <div style={{width:'32px',height:'32px',borderRadius:'8px',background:'rgba(0,229,160,0.1)',border:'1px solid rgba(0,229,160,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <i className="ti ti-layout-kanban" style={{fontSize:'16px',color:'#00e5a0'}} aria-hidden="true"/>
            </div>
            <span style={{fontSize:'15px',fontWeight:700,color:'var(--text)'}}>Track application</span>
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text2)',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <i className="ti ti-x" style={{fontSize:'18px'}} aria-hidden="true"/>
          </button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.75rem',marginBottom:'.75rem'}}>
          <div><label style={S.label}>Job title *</label><input style={S.input} value={form.job_title} onChange={e=>upd('job_title',e.target.value)} placeholder='Software Engineer'/></div>
          <div><label style={S.label}>Company *</label><input style={S.input} value={form.company} onChange={e=>upd('company',e.target.value)} placeholder='Google'/></div>
          <div><label style={S.label}>Location</label><input style={S.input} value={form.location} onChange={e=>upd('location',e.target.value)} placeholder='Bangalore'/></div>
          <div><label style={S.label}>Salary</label><input style={S.input} value={form.salary} onChange={e=>upd('salary',e.target.value)} placeholder='10-15 LPA'/></div>
          <div><label style={S.label}>Applied date</label><input style={S.input} type='date' value={form.applied_date} onChange={e=>upd('applied_date',e.target.value)}/></div>
          <div>
            <label style={S.label}>Status</label>
            <select style={{...S.input,cursor:'pointer'}} value={form.status} onChange={e=>upd('status',e.target.value)}>
              {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div style={{marginBottom:'.75rem'}}>
          <label style={S.label}>Job URL</label>
          <input style={S.input} value={form.job_url} onChange={e=>upd('job_url',e.target.value)} placeholder='https://...'/>
        </div>
        <div style={{marginBottom:'1.25rem'}}>
          <label style={S.label}>Notes</label>
          <textarea style={{...S.input,height:'70px',resize:'vertical'}} value={form.notes} onChange={e=>upd('notes',e.target.value)} placeholder='Interview scheduled for..., HR contact...'/>
        </div>
        <div style={{display:'flex',gap:'.75rem'}}>
          <button style={S.btnG} onClick={onClose}>Cancel</button>
          <button style={{...S.btn,flex:1,justifyContent:'center'}} onClick={submit}>
            <i className="ti ti-plus" aria-hidden="true"/>
            Add application
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Tracker() {
  const [apps, setApps]           = useState([])
  const [loading, setLoading]     = useState(true)
  const [showAdd, setShowAdd]     = useState(false)
  const [stats, setStats]         = useState({})
  const [filterStatus, setFilter] = useState('All')
  const [search, setSearch]       = useState('')
  const [editNotes, setEditNotes] = useState(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const [appsRes, statsRes] = await Promise.all([
      fetch(`${API}/tracker/?user_id=${user.id}`),
      fetch(`${API}/tracker/stats?user_id=${user.id}`)
    ])
    setApps(await appsRes.json())
    setStats(await statsRes.json())
    setLoading(false)
  }

  const updateStatus = async (id, status) => {
    await fetch(`${API}/tracker/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ status }) })
    setApps(prev => prev.map(a => a.id===id ? {...a, status} : a))
    loadData()
  }

  const saveNotes = async (id, notes) => {
    await fetch(`${API}/tracker/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ notes }) })
    setApps(prev => prev.map(a => a.id===id ? {...a, notes} : a))
    setEditNotes(null)
  }

  const deleteApp = async (id) => {
    if (!confirm('Delete this application?')) return
    await fetch(`${API}/tracker/${id}`, { method:'DELETE' })
    setApps(prev => prev.filter(a => a.id!==id))
    loadData()
  }

  const filtered = apps.filter(a => {
    const matchStatus = filterStatus==='All' || a.status===filterStatus
    const matchSearch = !search || a.job_title.toLowerCase().includes(search.toLowerCase()) || a.company.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  const statCards = [
    { label:'Total',     value:stats.total||0,     color:'var(--text)', icon:'ti-chart-bar' },
    { label:'Applied',   value:stats.Applied||0,   color:'#3b82f6', icon:'ti-send' },
    { label:'Interview', value:stats.Interview||0, color:'#f5a623', icon:'ti-users' },
    { label:'Offer',     value:stats.Offer||0,     color:'#00e5a0', icon:'ti-check' },
    { label:'Rejected',  value:stats.Rejected||0,  color:'#ff4d6d', icon:'ti-x' },
  ]

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"/>
      <div style={S.page}>
        <div style={S.wrap}>

          {/* Header */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.5rem',flexWrap:'wrap',gap:'1rem'}}>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:'.65rem',marginBottom:'.3rem'}}>
                <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'rgba(0,229,160,0.1)',border:'1px solid rgba(0,229,160,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <i className="ti ti-layout-kanban" style={{fontSize:'18px',color:'#00e5a0'}} aria-hidden="true"/>
                </div>
                <h1 style={{fontSize:'22px',fontWeight:800,color:'var(--text)',margin:0}}>Application tracker</h1>
              </div>
              <p style={{fontSize:'13px',color:'var(--text2)',marginLeft:'52px'}}>Track your job applications, interviews, and offers all in one place</p>
            </div>
            <button style={S.btn} onClick={()=>setShowAdd(true)}>
              <i className="ti ti-plus" aria-hidden="true"/>
              Add application
            </button>
          </div>

          {/* Stats */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'.75rem',marginBottom:'1.5rem'}}>
            {statCards.map(({label,value,color,icon})=>(
              <div key={label}
                style={{...S.card,textAlign:'center',cursor:'pointer',border:`1px solid ${filterStatus===label||filterStatus==='All'&&label==='Total'?'rgba(0,229,160,0.25)':'rgba(255,255,255,0.07)'}`,transition:'border-color .15s'}}
                onClick={()=>setFilter(label==='Total'?'All':label)}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'.35rem',fontSize:'11px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.4rem'}}>
                  <i className={`ti ${icon}`} style={{fontSize:'13px',color}} aria-hidden="true"/>
                  {label}
                </div>
                <div style={{fontSize:'24px',fontWeight:900,color}}>{value}</div>
              </div>
            ))}
          </div>

          {/* Search + Filter */}
          <div style={{display:'flex',gap:'.75rem',marginBottom:'1.25rem',flexWrap:'wrap'}}>
            <div style={{flex:1,minWidth:'200px',position:'relative'}}>
              <i className="ti ti-search" style={{position:'absolute',left:'.75rem',top:'50%',transform:'translateY(-50%)',fontSize:'14px',color:'var(--text3)'}} aria-hidden="true"/>
              <input style={{...S.input,paddingLeft:'2.25rem'}} value={search} onChange={e=>setSearch(e.target.value)} placeholder='Search by job title or company...'/>
            </div>
            <div style={{display:'flex',gap:'.35rem',flexWrap:'wrap'}}>
              {['All',...STATUSES].map(s=>{
                const sc = STATUS_COLORS[s]
                const isActive = filterStatus===s
                return (
                  <button key={s} onClick={()=>setFilter(s)}
                    style={{display:'flex',alignItems:'center',gap:'.35rem',padding:'.4rem .8rem',borderRadius:'20px',border:`1px solid ${isActive?sc?.border||'rgba(0,229,160,0.4)':'rgba(255,255,255,0.08)'}`,background:isActive?sc?.bg||'rgba(0,229,160,0.08)':'transparent',color:isActive?sc?.color||'#00e5a0':'#8b93b0',fontSize:'11px',fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif',whiteSpace:'nowrap',transition:'all .15s'}}>
                    {s!=='All' && <i className={`ti ${STATUS_ICONS[s]}`} style={{fontSize:'12px'}} aria-hidden="true"/>}
                    {s}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Applications List */}
          {loading ? (
            <div style={{textAlign:'center',padding:'3rem',color:'var(--text2)',fontSize:'13px'}}>
              <i className="ti ti-loader" style={{fontSize:'24px',display:'block',marginBottom:'.75rem',animation:'spin 1s linear infinite'}} aria-hidden="true"/>
              Loading applications...
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{...S.card,textAlign:'center',padding:'3rem'}}>
              <div style={{width:'56px',height:'56px',borderRadius:'16px',background:'rgba(var(--input-bg,255,255,255),0.04)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 1rem'}}>
                <i className="ti ti-inbox" style={{fontSize:'26px',color:'var(--text3)'}} aria-hidden="true"/>
              </div>
              <div style={{fontSize:'15px',fontWeight:700,color:'var(--text)',marginBottom:'.35rem'}}>
                {apps.length===0 ? 'No applications yet' : 'No results found'}
              </div>
              <div style={{fontSize:'13px',color:'var(--text2)',marginBottom:'1.25rem'}}>
                {apps.length===0 ? 'Start tracking your job applications — applied, interviews, offers and more!' : 'Try a different search or filter'}
              </div>
              {apps.length===0 && (
                <button style={{...S.btn,margin:'0 auto',justifyContent:'center'}} onClick={()=>setShowAdd(true)}>
                  <i className="ti ti-plus" aria-hidden="true"/>
                  Add your first application
                </button>
              )}
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:'.75rem'}}>
              {filtered.map(app=>{
                const sc = STATUS_COLORS[app.status] || STATUS_COLORS['Applied']
                return (
                  <div key={app.id} style={{...S.card,display:'flex',gap:'1rem',alignItems:'flex-start',flexWrap:'wrap'}}>
                    <div style={{width:'4px',borderRadius:'4px',background:sc.color,alignSelf:'stretch',flexShrink:0}}/>
                    <div style={{flex:1,minWidth:'200px'}}>
                      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'.5rem',flexWrap:'wrap'}}>
                        <div>
                          <div style={{fontSize:'14px',fontWeight:700,color:'var(--text)',marginBottom:'2px'}}>{app.job_title}</div>
                          <div style={{fontSize:'12px',color:'var(--text2)'}}>{app.company}{app.location?` · ${app.location}`:''}</div>
                        </div>
                        <div style={{display:'flex',gap:'.35rem',alignItems:'center',flexShrink:0}}>
                          <select
                            value={app.status}
                            onChange={e=>updateStatus(app.id,e.target.value)}
                            style={{padding:'.3rem .7rem',borderRadius:'20px',border:`1px solid ${sc.border}`,background:sc.bg,color:sc.color,fontSize:'11px',fontWeight:700,cursor:'pointer',fontFamily:'Inter,sans-serif',outline:'none'}}>
                            {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
                          </select>
                          <button onClick={()=>deleteApp(app.id)}
                            style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',padding:'.2rem .4rem',display:'flex',alignItems:'center',transition:'color .15s'}}
                            onMouseEnter={e=>e.currentTarget.style.color='#ff4d6d'}
                            onMouseLeave={e=>e.currentTarget.style.color='#4a5168'}>
                            <i className="ti ti-trash" style={{fontSize:'15px'}} aria-hidden="true"/>
                          </button>
                        </div>
                      </div>

                      {/* Tags */}
                      <div style={{display:'flex',gap:'.4rem',flexWrap:'wrap',marginTop:'.5rem',alignItems:'center'}}>
                        {app.applied_date && (
                          <span style={{display:'flex',alignItems:'center',gap:'.25rem',fontSize:'11px',color:'var(--text3)'}}>
                            <i className="ti ti-calendar" style={{fontSize:'12px'}} aria-hidden="true"/>
                            {app.applied_date}
                          </span>
                        )}
                        {app.salary && (
                          <span style={{display:'flex',alignItems:'center',gap:'.25rem',fontSize:'11px',padding:'2px 8px',borderRadius:'20px',background:'rgba(var(--input-bg,255,255,255),0.04)',border:'1px solid var(--border)',color:'var(--text2)'}}>
                            <i className="ti ti-currency-rupee" style={{fontSize:'11px'}} aria-hidden="true"/>
                            {app.salary}
                          </span>
                        )}
                        {app.job_type && (
                          <span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'20px',background:'rgba(var(--input-bg,255,255,255),0.04)',border:'1px solid var(--border)',color:'var(--text2)'}}>
                            {app.job_type}
                          </span>
                        )}
                        {app.job_url && (
                          <a href={app.job_url} target='_blank' rel='noopener noreferrer'
                            style={{display:'flex',alignItems:'center',gap:'.25rem',fontSize:'11px',color:'#7c6ff7',textDecoration:'none',fontWeight:600}}>
                            <i className="ti ti-external-link" style={{fontSize:'12px'}} aria-hidden="true"/>
                            View job
                          </a>
                        )}
                      </div>

                      {/* Notes */}
                      {editNotes===app.id ? (
                        <div style={{marginTop:'.5rem',display:'flex',gap:'.5rem'}}>
                          <textarea
                            defaultValue={app.notes}
                            id={`notes-${app.id}`}
                            style={{...S.input,height:'60px',resize:'vertical',flex:1}}
                            placeholder='Add notes...'
                          />
                          <div style={{display:'flex',flexDirection:'column',gap:'.35rem'}}>
                            <button style={{...S.btn,padding:'.4rem .75rem',fontSize:'11px'}} onClick={()=>saveNotes(app.id,document.getElementById(`notes-${app.id}`).value)}>Save</button>
                            <button style={{...S.btnG,padding:'.4rem .75rem',fontSize:'11px'}} onClick={()=>setEditNotes(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{marginTop:'.5rem',display:'flex',alignItems:'flex-start',gap:'.5rem'}}>
                          {app.notes ? (
                            <div style={{fontSize:'12px',color:'var(--text2)',flex:1,lineHeight:1.5,padding:'.5rem .75rem',background:'rgba(255,255,255,0.02)',borderRadius:'7px',border:'1px solid rgba(255,255,255,0.05)'}}>{app.notes}</div>
                          ) : (
                            <div style={{fontSize:'11px',color:'var(--text3)',flex:1}}>No notes</div>
                          )}
                          <button onClick={()=>setEditNotes(app.id)}
                            style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',padding:'.2rem .4rem',display:'flex',alignItems:'center',transition:'color .15s',flexShrink:0}}
                            onMouseEnter={e=>e.currentTarget.style.color='#8b93b0'}
                            onMouseLeave={e=>e.currentTarget.style.color='#4a5168'}>
                            <i className="ti ti-pencil" style={{fontSize:'14px'}} aria-hidden="true"/>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        {showAdd && <AddApplicationModal onClose={()=>setShowAdd(false)} onAdd={app=>{setApps(prev=>[app,...prev]);loadData()}}/>}
      </div>
    </>
  )
}