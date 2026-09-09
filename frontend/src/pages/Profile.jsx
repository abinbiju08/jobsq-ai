import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import FaceRegister from '../components/FaceRegister'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function Profile() {
  const [user, setUser] = useState(null)
  const [resumeInfo, setResumeInfo] = useState(null)
  const [resumeUploading, setResumeUploading] = useState(false)
  const [resumeMsg, setResumeMsg] = useState('')
  const [hasFace, setHasFace] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => { loadProfile() }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (user) {
      const { data } = await supabase.from('face_profiles').select('id').eq('user_id', user.id).single()
      setHasFace(!!data)
    }
    setLoading(false)
  }

  async function removeFace() {
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('face_profiles').delete().eq('user_id', user.id)
    setHasFace(false)
    setMsg('Face ID removed successfully.')
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'calc(100vh - 52px)',background:'var(--bg)',color:'#00e5a0',fontFamily:'Inter,sans-serif',gap:'.75rem'}}>
      <i className="ti ti-loader" style={{fontSize:'20px',animation:'spin .8s linear infinite'}} aria-hidden="true"/>
      Loading...
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const securityFeatures = [
    { icon:'ti-lock',       label:'128-point encryption' },
    { icon:'ti-shield-off', label:'Spoof protected' },
    { icon:'ti-brain',      label:'AI liveness' },
    { icon:'ti-cpu',        label:'Local processing' },
  ]

  const howItWorks = [
    { icon:'ti-camera',      title:'Register once',     desc:"Your face is scanned and converted to a 128-point encrypted descriptor" },
    { icon:'ti-user-check',  title:'Login instantly',   desc:"On the login page click Face Login — look at camera and you're in" },
    { icon:'ti-shield-check',title:'Spoof protected',   desc:'Liveness detection blocks photos and videos from bypassing security' },
  ]

  const uploadResume = async (file) => {
    if (!file || !user) return
    setResumeUploading(true)
    setResumeMsg('')
    try {
      const form = new FormData()
      form.append('resume_file', file)
      form.append('user_id', user.id)
      const res = await fetch(`${API}/builder/save-resume`, { method:'POST', body:form })
      const data = await res.json()
      if (data.success) {
        const info = { file_name: data.file_name, file_size: data.file_size }
        setResumeInfo(info)
        localStorage.setItem('jobsq_resume_info', JSON.stringify(info))
        setResumeMsg('Resume uploaded successfully!')
      } else {
        setResumeMsg('Upload failed — ' + (data.error || 'try again'))
      }
    } catch(e) {
      setResumeMsg('Upload failed — check your connection')
    }
    setResumeUploading(false)
    setTimeout(() => setResumeMsg(''), 4000)
  }

  const removeResume = async () => {
    setResumeInfo(null)
    setResumeMsg('Resume removed')
    setTimeout(() => setResumeMsg(''), 3000)
  }

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"/>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        .prof-page{min-height:calc(100vh - 52px);background:#080c18;font-family:'Inter',sans-serif;display:flex;align-items:flex-start;justify-content:center;padding:2.5rem 1rem;}
        .prof-wrap{width:100%;max-width:560px;display:flex;flex-direction:column;gap:1rem;}
        .prof-card{background:#141828;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:1.5rem;position:relative;overflow:hidden;}
        .prof-card::before{content:'';position:absolute;inset:0;border-radius:16px;background:linear-gradient(135deg,rgba(0,229,160,0.03),transparent);pointer-events:none;}
        .sec-title{display:flex;align-items:center;gap:.4rem;font-size:11px;font-weight:700;color:#4a5168;text-transform:uppercase;letter-spacing:.08em;margin-bottom:1rem;}
        .sec-title i{font-size:13px;}
        .info-row{display:flex;align-items:center;gap:.75rem;padding:.65rem 0;border-bottom:1px solid rgba(255,255,255,0.05);}
        .info-row:last-child{border-bottom:none;}
        .info-icon{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
        .info-icon i{font-size:17px;}
        .info-label{font-size:11px;color:#4a5168;margin-bottom:2px;}
        .info-val{font-size:13.5px;color:#eef0ff;font-weight:500;}
        .btn-green{padding:.65rem 1.25rem;border:none;border-radius:10px;background:linear-gradient(135deg,#00e5a0,#00c484);color:#060d0a;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 4px 20px rgba(0,229,160,0.28);transition:transform .15s,box-shadow .2s;display:inline-flex;align-items:center;gap:.4rem;}
        .btn-green:hover{transform:translateY(-1px);box-shadow:0 6px 28px rgba(0,229,160,0.42);}
        .btn-purple{padding:.65rem 1.25rem;border:none;border-radius:10px;background:linear-gradient(135deg,#7c6ff7,#5a52d5);color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 4px 20px rgba(124,111,247,0.28);transition:transform .15s,box-shadow .2s;display:inline-flex;align-items:center;gap:.4rem;}
        .btn-purple:hover{transform:translateY(-1px);box-shadow:0 6px 28px rgba(124,111,247,0.42);}
        .btn-red{padding:.65rem 1.25rem;border:1px solid rgba(255,77,77,0.3);border-radius:10px;background:rgba(255,77,77,0.06);color:#ff6b6b;font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:all .2s;display:inline-flex;align-items:center;gap:.4rem;}
        .btn-red:hover{background:rgba(255,77,77,0.12);border-color:rgba(255,77,77,0.5);}
        .face-status{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.75rem;}
        .face-badge{display:inline-flex;align-items:center;gap:.4rem;padding:.4rem .85rem;border-radius:20px;font-size:12px;font-weight:600;}
        .face-badge i{font-size:13px;}
        .face-badge.on{background:rgba(0,229,160,0.1);border:1px solid rgba(0,229,160,0.25);color:#00e5a0;}
        .face-badge.off{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:#8b93b0;}
        .msg{display:flex;align-items:center;gap:.5rem;padding:.65rem 1rem;background:rgba(0,229,160,0.08);border:1px solid rgba(0,229,160,0.2);border-radius:9px;font-size:12.5px;color:#00e5a0;}
        .msg i{font-size:16px;}
      `}</style>

      <div className="prof-page">
        <div className="prof-wrap">

          {/* Header */}
          <div>
            <div style={{display:'flex',alignItems:'center',gap:'.65rem',marginBottom:'4px'}}>
              <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'rgba(0,229,160,0.1)',border:'1px solid rgba(0,229,160,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="ti ti-user-circle" style={{fontSize:'19px',color:'#00e5a0'}} aria-hidden="true"/>
              </div>
              <h1 style={{fontSize:'20px',fontWeight:800,color:'var(--text)',margin:0}}>My profile</h1>
            </div>
            <p style={{fontSize:'13px',color:'var(--text2)',marginLeft:'52px'}}>Manage your account and security settings</p>
          </div>

          {/* Success message */}
          {msg && (
            <div className="msg">
              <i className="ti ti-circle-check" aria-hidden="true"/>
              {msg}
            </div>
          )}

          {/* Account Info */}
          <div className="prof-card">
            <div className="sec-title">
              <i className="ti ti-id-badge" aria-hidden="true"/>
              Account info
            </div>
            <div className="info-row">
              <div className="info-icon" style={{background:'rgba(0,229,160,0.1)'}}>
                <i className="ti ti-user" style={{color:'#00e5a0'}} aria-hidden="true"/>
              </div>
              <div>
                <div className="info-label">Username</div>
                <div className="info-val">{user?.email?.split('@')[0]}</div>
              </div>
            </div>
            <div className="info-row">
              <div className="info-icon" style={{background:'rgba(124,111,247,0.1)'}}>
                <i className="ti ti-mail" style={{color:'#7c6ff7'}} aria-hidden="true"/>
              </div>
              <div>
                <div className="info-label">Email</div>
                <div className="info-val">{user?.email}</div>
              </div>
            </div>
            <div className="info-row">
              <div className="info-icon" style={{background:'rgba(59,130,246,0.1)'}}>
                <i className="ti ti-calendar" style={{color:'#3b82f6'}} aria-hidden="true"/>
              </div>
              <div>
                <div className="info-label">Member since</div>
                <div className="info-val">{new Date(user?.created_at).toLocaleDateString('en-US',{month:'long',year:'numeric'})}</div>
              </div>
            </div>
          </div>


          {/* RESUME SECTION */}
          <div className="prof-card">
            <div className="sec-title">
              <i className="ti ti-file-cv" aria-hidden="true"/>
              My resume
              {resumeInfo
                ? <span style={{marginLeft:'auto',fontSize:'10px',padding:'2px 8px',borderRadius:'20px',background:'rgba(0,229,160,0.1)',border:'0.5px solid rgba(0,229,160,0.25)',color:'#00e5a0',display:'flex',alignItems:'center',gap:'3px'}}>
                    <i className="ti ti-circle-check" style={{fontSize:'11px'}} aria-hidden="true"/> Uploaded
                  </span>
                : <span style={{marginLeft:'auto',fontSize:'10px',padding:'2px 8px',borderRadius:'20px',background:'var(--bg2)',border:'0.5px solid var(--border)',color:'var(--text3)'}}>Not uploaded</span>
              }
            </div>

            {resumeMsg && (
              <div style={{padding:'.4rem .75rem',borderRadius:'8px',background:resumeMsg.includes('success')?'rgba(0,229,160,0.08)':'rgba(226,75,74,0.08)',border:`0.5px solid ${resumeMsg.includes('success')?'rgba(0,229,160,0.2)':'rgba(226,75,74,0.2)'}`,color:resumeMsg.includes('success')?'#00e5a0':'#E24B4A',fontSize:'12px',marginBottom:'.75rem',display:'flex',alignItems:'center',gap:'.35rem'}}>
                <i className={`ti ${resumeMsg.includes('success')?'ti-circle-check':'ti-alert-circle'}`} style={{fontSize:'13px'}} aria-hidden="true"/>
                {resumeMsg}
              </div>
            )}

            {resumeInfo ? (
              <>
                <div style={{display:'flex',alignItems:'center',gap:'.65rem',padding:'.55rem .75rem',background:'rgba(0,229,160,0.05)',border:'0.5px solid rgba(0,229,160,0.15)',borderRadius:'9px',marginBottom:'.75rem'}}>
                  <div style={{width:'34px',height:'34px',borderRadius:'8px',background:'rgba(0,229,160,0.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <i className="ti ti-file-type-pdf" style={{fontSize:'17px',color:'#00e5a0'}} aria-hidden="true"/>
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'13px',fontWeight:600,color:'var(--text)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{resumeInfo.file_name}</div>
                    <div style={{fontSize:'11px',color:'var(--text3)'}}>{resumeInfo.file_size ? Math.round(resumeInfo.file_size/1024)+'KB' : ''}</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:'.5rem',marginBottom:'.75rem'}}>
                  <label style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'.35rem',padding:'.45rem',background:'var(--bg2)',border:'0.5px solid var(--border)',borderRadius:'8px',cursor:'pointer',fontSize:'12px',color:'var(--text2)',fontFamily:'Inter,sans-serif'}}>
                    <i className="ti ti-refresh" style={{fontSize:'13px'}} aria-hidden="true"/>
                    {resumeUploading ? 'Uploading...' : 'Replace resume'}
                    <input type="file" accept=".pdf" onChange={e=>uploadResume(e.target.files[0])} style={{display:'none'}} disabled={resumeUploading}/>
                  </label>
                  <button onClick={removeResume} style={{padding:'.45rem .75rem',background:'rgba(226,75,74,0.08)',border:'0.5px solid rgba(226,75,74,0.2)',borderRadius:'8px',cursor:'pointer',color:'#E24B4A',fontSize:'12px',fontFamily:'Inter,sans-serif',display:'flex',alignItems:'center',gap:'.3rem'}}>
                    <i className="ti ti-trash" style={{fontSize:'13px'}} aria-hidden="true"/> Remove
                  </button>
                </div>
                <div style={{paddingTop:'.65rem',borderTop:'0.5px solid var(--border)'}}>
                  <div style={{fontSize:'11px',color:'var(--text3)',marginBottom:'.35rem'}}>Active features:</div>
                  {['Smart job match enabled','Tailor resume — click any job card','ATS score ready'].map((f,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:'.35rem',fontSize:'12px',color:'var(--text2)',padding:'.2rem 0'}}>
                      <i className="ti ti-circle-check" style={{fontSize:'13px',color:'#00e5a0'}} aria-hidden="true"/> {f}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <>
                <label style={{display:'block',border:'1.5px dashed var(--border)',borderRadius:'10px',padding:'1.5rem',textAlign:'center',cursor:'pointer',background:'var(--bg2)',marginBottom:'.65rem'}}>
                  <i className="ti ti-cloud-upload" style={{fontSize:'28px',color:'var(--text3)',display:'block',marginBottom:'.5rem'}} aria-hidden="true"/>
                  <div style={{fontSize:'13px',fontWeight:600,color:'var(--text)',marginBottom:'3px'}}>{resumeUploading?'Uploading...':'Upload your resume'}</div>
                  <div style={{fontSize:'11px',color:'var(--text3)',marginBottom:'.65rem'}}>PDF · Max 5MB</div>
                  <span style={{display:'inline-flex',alignItems:'center',gap:'.3rem',padding:'.35rem .85rem',background:'linear-gradient(135deg,#00e5a0,#00c484)',borderRadius:'7px',color:'#060d0a',fontSize:'12px',fontWeight:700}}>
                    <i className="ti ti-upload" style={{fontSize:'12px'}} aria-hidden="true"/> Choose file
                  </span>
                  <input type="file" accept=".pdf" onChange={e=>uploadResume(e.target.files[0])} style={{display:'none'}} disabled={resumeUploading}/>
                </label>
                <div style={{fontSize:'11px',color:'var(--text3)'}}>Upload once → enables Smart job match, Tailor resume, and ATS score.</div>
              </>
            )}
          </div>

          {/* Face ID */}
          <div className="prof-card">
            <div className="sec-title">
              <i className="ti ti-face-id" aria-hidden="true"/>
              Face ID security
            </div>

            {!showRegister ? (
              <>
                <p style={{fontSize:'13px',color:'var(--text2)',lineHeight:1.6,marginBottom:'1rem'}}>
                  Register your face to enable quick and secure Face ID login. Your face data is encrypted and stored only in your account.
                </p>
                <div className="face-status" style={{marginBottom:'1rem'}}>
                  <div>
                    <div style={{fontSize:'12px',color:'var(--text3)',marginBottom:'.35rem'}}>Status</div>
                    {hasFace ? (
                      <span className="face-badge on">
                        <i className="ti ti-circle-check" aria-hidden="true"/>
                        Face ID enabled
                      </span>
                    ) : (
                      <span className="face-badge off">
                        <i className="ti ti-circle-dashed" aria-hidden="true"/>
                        Not registered
                      </span>
                    )}
                  </div>
                  <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap'}}>
                    {!hasFace ? (
                      <button className="btn-purple" onClick={()=>setShowRegister(true)}>
                        <i className="ti ti-camera" aria-hidden="true"/>
                        Register Face ID
                      </button>
                    ) : (
                      <>
                        <button className="btn-green" onClick={()=>setShowRegister(true)}>
                          <i className="ti ti-refresh" aria-hidden="true"/>
                          Update Face ID
                        </button>
                        <button className="btn-red" onClick={removeFace}>
                          <i className="ti ti-trash" aria-hidden="true"/>
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Security badges */}
                <div style={{display:'flex',gap:'.4rem',flexWrap:'wrap'}}>
                  {securityFeatures.map(f=>(
                    <span key={f.label} style={{display:'inline-flex',alignItems:'center',gap:'.3rem',fontSize:'10px',fontWeight:600,padding:'3px 8px',borderRadius:'20px',background:'rgba(0,229,160,0.06)',border:'1px solid rgba(0,229,160,0.15)',color:'rgba(0,229,160,0.8)'}}>
                      <i className={`ti ${f.icon}`} style={{fontSize:'11px'}} aria-hidden="true"/>
                      {f.label}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <FaceRegister
                onBack={()=>setShowRegister(false)}
                onSuccess={()=>{
                  setShowRegister(false)
                  setHasFace(true)
                  setMsg('Face ID registered successfully! You can now use Face Login.')
                }}
              />
            )}
          </div>

          {/* How it works */}
          {!showRegister && (
            <div className="prof-card">
              <div className="sec-title">
                <i className="ti ti-info-circle" aria-hidden="true"/>
                How Face ID works
              </div>
              {howItWorks.map((s,i)=>(
                <div key={i} style={{display:'flex',gap:'.75rem',padding:'.6rem 0',borderBottom:i<howItWorks.length-1?'1px solid rgba(255,255,255,0.05)':'none'}}>
                  <div style={{width:'32px',height:'32px',borderRadius:'8px',background:'rgba(124,111,247,0.1)',border:'1px solid rgba(124,111,247,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <i className={`ti ${s.icon}`} style={{fontSize:'16px',color:'#7c6ff7'}} aria-hidden="true"/>
                  </div>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:600,color:'var(--text)',marginBottom:'2px'}}>{s.title}</div>
                    <div style={{fontSize:'12px',color:'var(--text2)',lineHeight:1.5}}>{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  )
}