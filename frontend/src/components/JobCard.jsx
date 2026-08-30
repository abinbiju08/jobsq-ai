import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function JobCard({ job }) {
  const [saved, setSaved] = useState(false)

  const saveJob = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('saved_jobs').upsert({ user_id: user.id, job_id: job.id, job_data: job })
    setSaved(true)
  }

  const colors = {
    'IT & Software': { bg: 'rgba(0,229,160,0.1)', color: '#00e5a0' },
    'Healthcare': { bg: 'rgba(124,111,247,0.1)', color: '#7c6ff7' },
    'Finance': { bg: 'rgba(245,166,35,0.1)', color: '#f5a623' },
    'Engineering': { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
    'Marketing': { bg: 'rgba(255,77,109,0.1)', color: '#ff4d6d' },
    'Education': { bg: 'rgba(124,111,247,0.1)', color: '#7c6ff7' },
  }
  const col = colors[job.category] || { bg: 'rgba(255,255,255,0.05)', color: '#8b93b0' }

  return (
    <div style={styles.card}>
      <div style={styles.top}>
        <div style={{...styles.logo, background: col.bg, color: col.color}}>
          {job.company?.[0] || 'J'}
        </div>
        <div style={styles.info}>
          <div style={styles.title}>{job.title}</div>
          <div style={styles.company}>{job.company} · {job.location}</div>
          <div style={styles.tags}>
            <span style={styles.tag}>{job.job_type}</span>
            <span style={styles.tag}>{job.salary}</span>
            {job.match > 0 && <span style={styles.matchTag}>{job.match}% AI match</span>}
          </div>
        </div>
        <div style={styles.right}>
          <button style={{...styles.saveBtn, ...(saved?styles.saveBtnActive:{})}} onClick={saveJob}>
            {saved ? '★' : '☆'}
          </button>
          <span style={styles.time}>{job.posted_at}</span>
        </div>
      </div>
    </div>
  )
}

const styles = {
  card:{background:'#141828',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'12px',padding:'1rem 1.1rem',cursor:'pointer',transition:'all .15s'},
  top:{display:'flex',gap:'.85rem',alignItems:'flex-start'},
  logo:{width:'40px',height:'40px',borderRadius:'9px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'14px',fontWeight:700,flexShrink:0,border:'1px solid rgba(255,255,255,0.07)'},
  info:{flex:1},
  title:{fontSize:'14px',fontWeight:600,color:'#eef0ff',marginBottom:'2px'},
  company:{fontSize:'12px',color:'#8b93b0'},
  tags:{display:'flex',flexWrap:'wrap',gap:'.35rem',marginTop:'.55rem'},
  tag:{fontSize:'11px',padding:'2px 9px',borderRadius:'20px',background:'rgba(255,255,255,0.05)',color:'#8b93b0',border:'1px solid rgba(255,255,255,0.08)'},
  matchTag:{fontSize:'11px',padding:'2px 9px',borderRadius:'20px',background:'rgba(0,229,160,0.1)',color:'#00e5a0',border:'1px solid rgba(0,229,160,0.2)',fontWeight:600},
  right:{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'.4rem',flexShrink:0},
  saveBtn:{width:'28px',height:'28px',borderRadius:'7px',border:'1px solid rgba(255,255,255,0.1)',background:'none',color:'#8b93b0',cursor:'pointer',fontSize:'15px'},
  saveBtnActive:{borderColor:'rgba(0,229,160,0.4)',color:'#00e5a0',background:'rgba(0,229,160,0.1)'},
  time:{fontSize:'11px',color:'#4a5168'},
}
