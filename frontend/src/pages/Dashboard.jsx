import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [savedJobs, setSavedJobs] = useState([])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    loadSavedJobs()
  }, [])

  const loadSavedJobs = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('saved_jobs').select('*').eq('user_id', user.id)
    setSavedJobs(data || [])
  }

  const stats = [
    { num: '12', label: 'Applications' },
    { num: savedJobs.length || '0', label: 'Saved Jobs' },
    { num: '3', label: 'Interviews' },
    { num: '72', label: 'ATS Score' },
  ]

  const applications = [
    { title: 'Full Stack Developer', company: 'TCS', date: '2 days ago', status: 'Interview', color: '#7c6ff7', bg: 'rgba(124,111,247,0.12)' },
    { title: 'Software Engineer', company: 'Infosys', date: '4 days ago', status: 'Reviewing', color: '#00e5a0', bg: 'rgba(0,229,160,0.1)' },
    { title: 'React Developer', company: 'Wipro', date: '1 week ago', status: 'Rejected', color: '#ff4d6d', bg: 'rgba(255,77,109,0.1)' },
  ]

  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <div style={styles.greeting}>
          Good morning, <span style={{color:'#00e5a0'}}>{user?.email?.split('@')[0] || 'User'}</span> — here's your job hunt overview
        </div>

        <div style={styles.statsGrid}>
          {stats.map(s => (
            <div key={s.label} style={styles.statCard}>
              <div style={styles.statNum}>{s.num}</div>
              <div style={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={styles.secTitle}>Recent Applications</div>
        <div style={styles.appList}>
          {applications.map((a, i) => (
            <div key={i} style={styles.appRow}>
              <div style={{flex:1}}>
                <div style={{fontSize:'13px',fontWeight:600}}>{a.title} — {a.company}</div>
                <div style={{fontSize:'11px',color:'#8b93b0',marginTop:'2px'}}>Applied {a.date}</div>
              </div>
              <span style={{...styles.statusPill, background: a.bg, color: a.color}}>{a.status}</span>
            </div>
          ))}
        </div>

        <div style={styles.secTitle}>Saved Jobs</div>
        {savedJobs.length === 0 ? (
          <div style={{color:'#8b93b0',fontSize:'13px',padding:'1rem',background:'#141828',borderRadius:'12px',border:'1px solid rgba(255,255,255,0.07)'}}>
            No saved jobs yet — go to Jobs and click ☆ to save
          </div>
        ) : (
          <div style={styles.appList}>
            {savedJobs.map((j, i) => (
              <div key={i} style={styles.appRow}>
                <div style={{flex:1}}>
                  <div style={{fontSize:'13px',fontWeight:600}}>{j.job_data?.title} — {j.job_data?.company}</div>
                  <div style={{fontSize:'11px',color:'#8b93b0',marginTop:'2px'}}>{j.job_data?.location}</div>
                </div>
                <span style={{fontSize:'11px',color:'#00e5a0'}}>{j.job_data?.salary}</span>
              </div>
            ))}
          </div>
        )}

        <div style={styles.secTitle}>Job Alerts</div>
        {[{icon:'🔔',title:'Full Stack Developer — Remote',desc:'3 new matches today'},{icon:'🔔',title:'React + Node.js — India',desc:'1 new match today'}].map((a,i)=>(
          <div key={i} style={styles.alertCard}>
            <div style={styles.alertIcon}>{a.icon}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:'13px',fontWeight:600}}>{a.title}</div>
              <div style={{fontSize:'11px',color:'#8b93b0'}}>{a.desc}</div>
            </div>
            <button style={styles.viewBtn}>View</button>
          </div>
        ))}
      </div>
    </div>
  )
}

const styles = {
  page:{background:'#080c18',minHeight:'calc(100vh - 52px)',overflowY:'auto'},
  wrap:{maxWidth:'800px',margin:'0 auto',padding:'1.5rem 1rem'},
  greeting:{fontSize:'14px',marginBottom:'1rem',color:'#eef0ff'},
  statsGrid:{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'.65rem',marginBottom:'1.25rem'},
  statCard:{background:'#141828',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'1rem',textAlign:'center'},
  statNum:{fontSize:'26px',fontWeight:800,color:'#00e5a0'},
  statLabel:{fontSize:'11px',color:'#8b93b0',marginTop:'2px'},
  secTitle:{fontSize:'14px',fontWeight:600,marginBottom:'.6rem',color:'#eef0ff'},
  appList:{background:'#141828',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',overflow:'hidden',marginBottom:'1.25rem'},
  appRow:{display:'flex',alignItems:'center',gap:'.75rem',padding:'.75rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.05)'},
  statusPill:{fontSize:'11px',padding:'3px 9px',borderRadius:'20px',fontWeight:600},
  alertCard:{display:'flex',alignItems:'center',gap:'.75rem',background:'#141828',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'.85rem',marginBottom:'.6rem'},
  alertIcon:{width:'36px',height:'36px',borderRadius:'8px',background:'rgba(245,166,35,0.12)',border:'1px solid rgba(245,166,35,0.2)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'16px',flexShrink:0},
  viewBtn:{fontSize:'11px',padding:'.3rem .7rem',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'7px',background:'none',color:'#8b93b0',cursor:'pointer'},
}
