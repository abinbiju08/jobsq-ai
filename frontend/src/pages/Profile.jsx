import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import FaceRegister from '../components/FaceRegister'

export default function Profile() {
  const [user, setUser] = useState(null)
  const [hasFace, setHasFace] = useState(false)
  const [showRegister, setShowRegister] = useState(false)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
    if (user) {
      const { data } = await supabase
        .from('face_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
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
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'calc(100vh - 52px)',background:'#080c18',color:'#00e5a0'}}>
      Loading...
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .prof-page{min-height:calc(100vh - 52px);background:#080c18;font-family:'Inter',sans-serif;display:flex;align-items:flex-start;justify-content:center;padding:2.5rem 1rem;}
        .prof-wrap{width:100%;max-width:560px;display:flex;flex-direction:column;gap:1rem;}
        .prof-card{background:#141828;border:1px solid rgba(255,255,255,0.07);border-radius:16px;padding:1.5rem;position:relative;overflow:hidden;}
        .prof-card::before{content:'';position:absolute;inset:0;border-radius:16px;background:linear-gradient(135deg,rgba(0,229,160,0.03),transparent);pointer-events:none;}
        .sec-title{font-size:11px;font-weight:700;color:#4a5168;text-transform:uppercase;letter-spacing:.08em;margin-bottom:1rem;}
        .info-row{display:flex;align-items:center;gap:.75rem;padding:.65rem 0;border-bottom:1px solid rgba(255,255,255,0.05);}
        .info-row:last-child{border-bottom:none;}
        .info-icon{width:34px;height:34px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;}
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
        .face-badge.on{background:rgba(0,229,160,0.1);border:1px solid rgba(0,229,160,0.25);color:#00e5a0;}
        .face-badge.off{background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);color:#8b93b0;}
        .msg{padding:.65rem 1rem;background:rgba(0,229,160,0.08);border:1px solid rgba(0,229,160,0.2);border-radius:9px;font-size:12.5px;color:#00e5a0;}
      `}</style>

      <div className="prof-page">
        <div className="prof-wrap">
          <div>
            <h1 style={{fontSize:'20px',fontWeight:800,color:'#eef0ff',marginBottom:'4px'}}>My Profile</h1>
            <p style={{fontSize:'13px',color:'#8b93b0'}}>Manage your account and security settings</p>
          </div>

          {msg && <div className="msg">✅ {msg}</div>}

          {/* ACCOUNT INFO */}
          <div className="prof-card">
            <div className="sec-title">Account Info</div>
            <div className="info-row">
              <div className="info-icon" style={{background:'rgba(0,229,160,0.1)'}}>👤</div>
              <div>
                <div className="info-label">Username</div>
                <div className="info-val">{user?.email?.split('@')[0]}</div>
              </div>
            </div>
            <div className="info-row">
              <div className="info-icon" style={{background:'rgba(124,111,247,0.1)'}}>✉</div>
              <div>
                <div className="info-label">Email</div>
                <div className="info-val">{user?.email}</div>
              </div>
            </div>
            <div className="info-row">
              <div className="info-icon" style={{background:'rgba(59,130,246,0.1)'}}>🗓</div>
              <div>
                <div className="info-label">Member since</div>
                <div className="info-val">{new Date(user?.created_at).toLocaleDateString('en-US',{month:'long',year:'numeric'})}</div>
              </div>
            </div>
          </div>

          {/* FACE ID SECTION */}
          <div className="prof-card">
            <div className="sec-title">Face ID Security</div>

            {!showRegister ? (
              <>
                <div style={{marginBottom:'1rem'}}>
                  <p style={{fontSize:'13px',color:'#8b93b0',lineHeight:1.6,marginBottom:'1rem'}}>
                    Register your face to enable quick and secure Face ID login. Your face data is encrypted and stored only in your account.
                  </p>
                  <div className="face-status">
                    <div>
                      <div style={{fontSize:'12px',color:'#4a5168',marginBottom:'.35rem'}}>Status</div>
                      {hasFace ? (
                        <span className="face-badge on">✅ Face ID Enabled</span>
                      ) : (
                        <span className="face-badge off">⚪ Not Registered</span>
                      )}
                    </div>
                    <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap'}}>
                      {!hasFace ? (
                        <button className="btn-purple" onClick={()=>setShowRegister(true)}>
                          📷 Register Face ID
                        </button>
                      ) : (
                        <>
                          <button className="btn-green" onClick={()=>setShowRegister(true)}>
                            🔄 Update Face ID
                          </button>
                          <button className="btn-red" onClick={removeFace}>
                            🗑 Remove
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Security info */}
                <div style={{display:'flex',gap:'.4rem',flexWrap:'wrap',marginTop:'.5rem'}}>
                  {['🔐 128-Point Encryption','🚫 Spoof Protected','🧠 AI Liveness','📡 Local Processing'].map(b=>(
                    <span key={b} style={{fontSize:'10px',fontWeight:600,padding:'3px 8px',borderRadius:'20px',background:'rgba(0,229,160,0.06)',border:'1px solid rgba(0,229,160,0.15)',color:'rgba(0,229,160,0.8)'}}>{b}</span>
                  ))}
                </div>
              </>
            ) : (
              /* FACE REGISTER INLINE */
              <FaceRegister
                onBack={() => setShowRegister(false)}
                onSuccess={() => {
                  setShowRegister(false)
                  setHasFace(true)
                  setMsg('Face ID registered successfully! You can now use Face Login.')
                }}
              />
            )}
          </div>

          {/* HOW TO USE */}
          {!showRegister && (
            <div className="prof-card">
              <div className="sec-title">How Face ID Works</div>
              {[
                {icon:'📷', title:'Register once', desc:'Your face is scanned and converted to a 128-point encrypted descriptor'},
                {icon:'👤', title:'Login instantly', desc:'On the login page click "Face Login" — look at camera and you\'re in'},
                {icon:'🛡️', title:'Spoof protected', desc:'Liveness detection blocks photos and videos from bypassing security'},
              ].map((s,i) => (
                <div key={i} style={{display:'flex',gap:'.75rem',padding:'.6rem 0',borderBottom:i<2?'1px solid rgba(255,255,255,0.05)':'none'}}>
                  <div style={{width:'32px',height:'32px',borderRadius:'8px',background:'rgba(124,111,247,0.1)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem',flexShrink:0}}>{s.icon}</div>
                  <div>
                    <div style={{fontSize:'13px',fontWeight:600,color:'#eef0ff',marginBottom:'2px'}}>{s.title}</div>
                    <div style={{fontSize:'12px',color:'#8b93b0',lineHeight:1.5}}>{s.desc}</div>
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
