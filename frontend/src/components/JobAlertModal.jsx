import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const S = {
  overlay: { position:'fixed',inset:0,background:'rgba(6,9,20,0.85)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)',padding:'1rem' },
  modal:   { background:'#0d1120',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',padding:'1.75rem',width:'100%',maxWidth:'520px',maxHeight:'90vh',overflowY:'auto' },
  label:   { fontSize:'11px',fontWeight:700,color:'#4a5168',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.35rem',display:'block' },
  input:   { width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'9px',padding:'.6rem .85rem',color:'#eef0ff',fontSize:'13px',fontFamily:'Inter,sans-serif',outline:'none',boxSizing:'border-box' },
  btn:     { display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem',padding:'.65rem 1.25rem',background:'linear-gradient(135deg,#00e5a0,#00c484)',border:'none',borderRadius:'10px',color:'#060d0a',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'Inter,sans-serif' },
  btnG:    { display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem',padding:'.65rem 1.25rem',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',color:'#8b93b0',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif' },
}

const COMMON_ROLES = ['Software Engineer','Data Analyst','Product Manager','UI/UX Designer','DevOps Engineer','Data Scientist','Full Stack Developer','Backend Developer','Frontend Developer','Machine Learning Engineer']
const COMMON_LOCS  = ['Remote','Bangalore','Mumbai','Delhi','Hyderabad','Chennai','Pune','Kochi','Kolkata']
const JOB_TYPES    = ['Full-time','Part-time','Remote','Contract','Internship','Freelance']

export default function JobAlertModal({ onClose }) {
  const [roles, setRoles]         = useState([])
  const [locations, setLocations] = useState([])
  const [jobTypes, setJobTypes]   = useState([])
  const [customRole, setCustomRole] = useState('')
  const [loading, setLoading]     = useState(false)
  const [saved, setSaved]         = useState(false)
  const [existing, setExisting]   = useState(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const res = await fetch(`${API}/alerts/?user_id=${user.id}`)
      const data = await res.json()
      if (data && data.roles) {
        setRoles(data.roles || [])
        setLocations(data.locations || [])
        setJobTypes(data.job_types || [])
        setExisting(data)
      }
    }
    load()
  }, [])

  const toggle = (arr, setArr, val) =>
    setArr(prev => prev.includes(val) ? prev.filter(x=>x!==val) : [...prev, val])

  const addCustomRole = () => {
    if (customRole.trim() && !roles.includes(customRole.trim())) {
      setRoles(prev => [...prev, customRole.trim()])
      setCustomRole('')
    }
  }

  const save = async () => {
    if (roles.length === 0) { alert('Please select at least one role'); return }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const profile = await supabase.auth.getUser()
    const name = profile.data.user?.user_metadata?.full_name || profile.data.user?.email || ''
    await fetch(`${API}/alerts/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id:user.id, user_email:user.email, user_name:name, roles, locations, job_types:jobTypes, active:true })
    })
    setSaved(true); setLoading(false)
    setTimeout(onClose, 1500)
  }

  const deleteAlert = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await fetch(`${API}/alerts/?user_id=${user.id}`, { method:'DELETE' })
    setExisting(null); setRoles([]); setLocations([]); setJobTypes([])
  }

  const Pill = ({ label, active, onClick }) => (
    <button onClick={onClick} style={{display:'inline-flex',alignItems:'center',gap:'.3rem',padding:'.35rem .85rem',borderRadius:'20px',border:`1px solid ${active?'rgba(0,229,160,0.5)':'rgba(255,255,255,0.1)'}`,background:active?'rgba(0,229,160,0.12)':'rgba(255,255,255,0.03)',color:active?'#00e5a0':'#8b93b0',fontSize:'12px',fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif',margin:'3px'}}>
      {active && <i className="ti ti-check" style={{fontSize:'11px'}} aria-hidden="true"/>}
      {label}
    </button>
  )

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"/>
      <div style={S.overlay} onClick={e=>e.target===e.currentTarget&&onClose()}>
        <div style={S.modal}>

          {/* Header */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'1.25rem'}}>
            <div style={{display:'flex',alignItems:'center',gap:'.65rem'}}>
              <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'rgba(0,229,160,0.1)',border:'1px solid rgba(0,229,160,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <i className="ti ti-bell" style={{fontSize:'18px',color:'#00e5a0'}} aria-hidden="true"/>
              </div>
              <div>
                <div style={{fontSize:'16px',fontWeight:800,color:'#eef0ff'}}>Job alert setup</div>
                <div style={{fontSize:'12px',color:'#8b93b0',marginTop:'2px'}}>Get notified by email + in-app when matching jobs arrive</div>
              </div>
            </div>
            <button onClick={onClose} style={{background:'none',border:'none',color:'#8b93b0',cursor:'pointer',display:'flex',alignItems:'center',padding:'.25rem'}}>
              <i className="ti ti-x" style={{fontSize:'18px'}} aria-hidden="true"/>
            </button>
          </div>

          {/* Saved confirmation */}
          {saved && (
            <div style={{display:'flex',alignItems:'center',gap:'.6rem',padding:'.75rem 1rem',background:'rgba(0,229,160,0.1)',border:'1px solid rgba(0,229,160,0.3)',borderRadius:'10px',color:'#00e5a0',fontSize:'13px',fontWeight:700,marginBottom:'1rem'}}>
              <i className="ti ti-circle-check" style={{fontSize:'18px'}} aria-hidden="true"/>
              Alert saved! You'll be notified when new jobs match.
            </div>
          )}

          {/* Existing alert status */}
          {existing && (
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'.6rem 1rem',background:'rgba(0,229,160,0.05)',border:'1px solid rgba(0,229,160,0.2)',borderRadius:'10px',marginBottom:'1rem'}}>
              <div style={{display:'flex',alignItems:'center',gap:'.4rem',fontSize:'12px',color:'#00e5a0'}}>
                <i className="ti ti-circle-check" style={{fontSize:'14px'}} aria-hidden="true"/>
                Alert active: {existing.roles?.slice(0,2).join(', ')}{existing.roles?.length>2?'...':''}
              </div>
              <button onClick={deleteAlert} style={{display:'flex',alignItems:'center',gap:'.3rem',fontSize:'11px',color:'#ff4d6d',background:'none',border:'none',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
                <i className="ti ti-trash" style={{fontSize:'13px'}} aria-hidden="true"/>
                Delete
              </button>
            </div>
          )}

          {/* Roles */}
          <div style={{marginBottom:'1.25rem'}}>
            <label style={S.label}>
              <i className="ti ti-briefcase" style={{fontSize:'12px',marginRight:'.3rem'}} aria-hidden="true"/>
              Job roles * (pick all that apply)
            </label>
            <div style={{display:'flex',flexWrap:'wrap'}}>
              {COMMON_ROLES.map(r=><Pill key={r} label={r} active={roles.includes(r)} onClick={()=>toggle(roles,setRoles,r)}/>)}
              {roles.filter(r=>!COMMON_ROLES.includes(r)).map(r=><Pill key={r} label={r} active={true} onClick={()=>setRoles(prev=>prev.filter(x=>x!==r))}/>)}
            </div>
            <div style={{display:'flex',gap:'.5rem',marginTop:'.5rem'}}>
              <input style={{...S.input,flex:1}} value={customRole} onChange={e=>setCustomRole(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addCustomRole()} placeholder='Add custom role...'/>
              <button onClick={addCustomRole} style={{...S.btn,padding:'.55rem 1rem',flexShrink:0}}>
                <i className="ti ti-plus" style={{fontSize:'14px'}} aria-hidden="true"/>
                Add
              </button>
            </div>
          </div>

          {/* Locations */}
          <div style={{marginBottom:'1.25rem'}}>
            <label style={S.label}>
              <i className="ti ti-map-pin" style={{fontSize:'12px',marginRight:'.3rem'}} aria-hidden="true"/>
              Preferred locations (optional)
            </label>
            <div style={{display:'flex',flexWrap:'wrap'}}>
              {COMMON_LOCS.map(l=><Pill key={l} label={l} active={locations.includes(l)} onClick={()=>toggle(locations,setLocations,l)}/>)}
            </div>
          </div>

          {/* Job Types */}
          <div style={{marginBottom:'1.5rem'}}>
            <label style={S.label}>
              <i className="ti ti-clock" style={{fontSize:'12px',marginRight:'.3rem'}} aria-hidden="true"/>
              Job types (optional)
            </label>
            <div style={{display:'flex',flexWrap:'wrap'}}>
              {JOB_TYPES.map(t=><Pill key={t} label={t} active={jobTypes.includes(t)} onClick={()=>toggle(jobTypes,setJobTypes,t)}/>)}
            </div>
          </div>

          <div style={{display:'flex',gap:'.75rem'}}>
            <button style={S.btnG} onClick={onClose}>
              <i className="ti ti-x" style={{fontSize:'14px'}} aria-hidden="true"/>
              Cancel
            </button>
            <button style={{...S.btn,flex:1,opacity:loading?.6:1}} onClick={save} disabled={loading}>
              {loading
                ? <><i className="ti ti-loader" style={{fontSize:'15px',animation:'spin .8s linear infinite'}} aria-hidden="true"/> Saving...</>
                : <><i className="ti ti-bell" style={{fontSize:'15px'}} aria-hidden="true"/> Save alert</>
              }
            </button>
          </div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    </>
  )
}