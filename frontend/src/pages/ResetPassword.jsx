import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const canvasRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    // Handle the token from the email reset link
    // Supabase puts the token in the URL hash or query params
    const handleSession = async () => {
      try {
        // Get hash from URL — Supabase puts access_token here
        const hash = window.location.hash
        const query = new URLSearchParams(window.location.search)

        // Try to get session from URL hash (older Supabase)
        if (hash && hash.includes('access_token')) {
          const params = new URLSearchParams(hash.substring(1))
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')
          if (accessToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            })
            if (!error) { setSessionReady(true); setCheckingSession(false); return }
          }
        }

        // Try query params (newer Supabase PKCE flow)
        const code = query.get('code')
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (!error) { setSessionReady(true); setCheckingSession(false); return }
        }

        // Try existing session
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setSessionReady(true)
        } else {
          setError('Reset link expired or invalid. Please request a new one.')
        }
      } catch (err) {
        setError('Something went wrong. Please request a new reset link.')
      }
      setCheckingSession(false)
    }

    handleSession()

    // Listen for auth state change (Supabase fires PASSWORD_RECOVERY event)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        if (session) { setSessionReady(true); setCheckingSession(false) }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)
    const C = [{r:0,g:229,b:160},{r:124,g:111,b:247},{r:59,g:130,b:246}]
    const nodes = Array.from({length:60}, () => ({
      x:Math.random()*canvas.width, y:Math.random()*canvas.height,
      vx:(Math.random()-.5)*.3, vy:(Math.random()-.5)*.3,
      r:Math.random()*1.4+.4, c:C[Math.floor(Math.random()*C.length)]
    }))
    let animId
    function draw() {
      ctx.clearRect(0,0,canvas.width,canvas.height)
      for(const n of nodes){n.x+=n.vx;n.y+=n.vy;if(n.x<0||n.x>canvas.width)n.vx*=-1;if(n.y<0||n.y>canvas.height)n.vy*=-1}
      for(let i=0;i<nodes.length;i++) for(let j=i+1;j<nodes.length;j++){
        const dx=nodes[i].x-nodes[j].x,dy=nodes[i].y-nodes[j].y,d=Math.sqrt(dx*dx+dy*dy)
        if(d<120){ctx.beginPath();ctx.moveTo(nodes[i].x,nodes[i].y);ctx.lineTo(nodes[j].x,nodes[j].y);ctx.strokeStyle=`rgba(0,229,160,${(1-d/120)*0.15})`;ctx.lineWidth=0.6;ctx.stroke()}}
      for(const n of nodes){ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,Math.PI*2);ctx.fillStyle=`rgba(${n.c.r},${n.c.g},${n.c.b},0.55)`;ctx.fill()}
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  const handleReset = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setError(error.message)
    else { setDone(true); await supabase.auth.signOut() }
    setLoading(false)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .rp-scene{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#080c18;overflow:hidden;font-family:'Inter',system-ui,sans-serif;}
        .rp-canvas{position:fixed;inset:0;z-index:0;}
        .orb-tl{position:fixed;top:-180px;left:-180px;width:480px;height:480px;border-radius:50%;background:radial-gradient(circle,rgba(0,229,160,0.25) 0%,transparent 68%);filter:blur(50px);z-index:1;pointer-events:none;animation:orbTL 16s ease-in-out infinite;}
        .orb-tr{position:fixed;top:-180px;right:-180px;width:440px;height:440px;border-radius:50%;background:radial-gradient(circle,rgba(124,111,247,0.25) 0%,transparent 68%);filter:blur(50px);z-index:1;pointer-events:none;animation:orbTR 20s ease-in-out infinite;}
        @keyframes orbTL{0%,100%{transform:translate(0,0)}40%{transform:translate(50px,60px)}70%{transform:translate(20px,100px)}}
        @keyframes orbTR{0%,100%{transform:translate(0,0)}35%{transform:translate(-60px,55px)}70%{transform:translate(-25px,90px)}}
        .rp-card{position:relative;z-index:5;background:rgba(6,9,20,0.88);border:1px solid rgba(255,255,255,0.12);border-radius:24px;padding:2.5rem 2.25rem;width:380px;backdrop-filter:blur(48px);-webkit-backdrop-filter:blur(48px);box-shadow:0 24px 80px rgba(0,0,0,0.6);}
        .rp-glow{position:absolute;inset:-1px;border-radius:25px;background:conic-gradient(from var(--angle,0deg),transparent 65%,rgba(0,229,160,0.6),rgba(124,111,247,0.5),transparent);-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:rotateBorder 4s linear infinite;z-index:-1;padding:1px;}
        @property --angle{syntax:'<angle>';initial-value:0deg;inherits:false;}
        @keyframes rotateBorder{to{--angle:360deg;}}
        .rp-shimmer{position:absolute;bottom:0;left:0;right:0;height:2px;border-radius:0 0 24px 24px;background:linear-gradient(90deg,transparent,#00e5a0,#7c6ff7,transparent);background-size:200% 100%;animation:sh 3s linear infinite;}
        @keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .brand-row{display:flex;align-items:center;gap:12px;margin-bottom:1.8rem;}
        .brand-icon{width:42px;height:42px;border-radius:11px;background:linear-gradient(135deg,#00e5a0,#00c484);display:flex;align-items:center;justify-content:center;box-shadow:0 0 22px rgba(0,229,160,0.45);flex-shrink:0;}
        .brand-name{font-size:17px;font-weight:800;color:#eef0ff;}
        .brand-name span{color:#00e5a0;}
        .brand-sub{font-size:10.5px;color:#4a5168;margin-top:2px;}
        .fw{position:relative;margin-bottom:.8rem;}
        .fw .ico{position:absolute;left:14px;top:50%;transform:translateY(-50%);pointer-events:none;z-index:2;opacity:.5;}
        .fw input{display:block;width:100%;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:.78rem 1rem .78rem 44px;color:#eef0ff;font-size:13.5px;font-family:'Inter',sans-serif;outline:none;transition:border-color .22s,background .22s,box-shadow .22s;}
        .fw input::placeholder{color:#4a5168;font-size:13px;}
        .fw input:focus{border-color:rgba(0,229,160,0.55);background:rgba(0,229,160,0.04);box-shadow:0 0 0 3px rgba(0,229,160,0.12);}
        .btn-main{width:100%;padding:.82rem;border:none;border-radius:12px;background:linear-gradient(135deg,#00e5a0,#00c484);color:#060d0a;font-size:14px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;margin-top:.5rem;box-shadow:0 4px 24px rgba(0,229,160,0.35);transition:transform .15s,box-shadow .2s;}
        .btn-main:hover{box-shadow:0 6px 32px rgba(0,229,160,0.6);transform:translateY(-2px);}
        .btn-main:disabled{opacity:.6;cursor:default;transform:none;}
        .err-box{background:rgba(255,77,77,0.1);border:1px solid rgba(255,77,77,0.3);border-radius:10px;padding:12px 14px;font-size:13px;color:#ff6b6b;margin-bottom:1rem;}
        .success-box{background:rgba(0,229,160,0.08);border:1px solid rgba(0,229,160,0.25);border-radius:10px;padding:12px 14px;font-size:13px;color:#00e5a0;margin-bottom:1rem;}
        .strength-wrap{margin-top:6px;padding:0 2px;}
        .strength-bar{height:3px;border-radius:2px;transition:width .3s,background .3s;background:#e2e8f0;}
        .hint{font-size:11px;color:#4a5168;margin-top:4px;}
        .spinner{width:40px;height:40px;border:3px solid rgba(0,229,160,0.2);border-top-color:#00e5a0;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 1rem;}
        @keyframes spin{to{transform:rotate(360deg)}}
        .link-btn{background:none;border:none;color:#00e5a0;cursor:pointer;font-size:12px;font-family:'Inter',sans-serif;text-decoration:underline;}
      `}</style>

      <div className="rp-scene">
        <canvas ref={canvasRef} className="rp-canvas"/>
        <div className="orb-tl"/><div className="orb-tr"/>

        <div className="rp-card">
          <div className="rp-glow"/>
          <div className="rp-shimmer"/>

          <div className="brand-row">
            <div className="brand-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#080c18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <div className="brand-name">JobsQ<span> AI</span></div>
              <div className="brand-sub">The World's Smartest Job Platform</div>
            </div>
          </div>

          {/* CHECKING SESSION */}
          {checkingSession && (
            <div style={{textAlign:'center',padding:'1rem 0'}}>
              <div className="spinner"/>
              <p style={{color:'#8b93b0',fontSize:'13px'}}>Verifying reset link...</p>
            </div>
          )}

          {/* INVALID LINK */}
          {!checkingSession && !sessionReady && !done && (
            <>
              <div style={{fontSize:'2.5rem',textAlign:'center',marginBottom:'1rem'}}>⚠️</div>
              <h2 style={{fontSize:'20px',fontWeight:800,marginBottom:'6px',color:'#eef0ff',textAlign:'center'}}>Link expired</h2>
              <p style={{fontSize:'12.5px',color:'#8b93b0',marginBottom:'1.5rem',lineHeight:1.6,textAlign:'center'}}>
                This reset link has expired or already been used. Please request a new one.
              </p>
              {error && <div className="err-box">{error}</div>}
              <button className="btn-main" onClick={() => navigate('/')}>
                Back to Sign in
              </button>
            </>
          )}

          {/* RESET FORM */}
          {!checkingSession && sessionReady && !done && (
            <>
              <div style={{fontSize:'2rem',textAlign:'center',marginBottom:'1rem'}}>🔐</div>
              <h2 style={{fontSize:'21px',fontWeight:800,marginBottom:'6px',color:'#eef0ff',textAlign:'center'}}>Set new password</h2>
              <p style={{fontSize:'12.5px',color:'#8b93b0',marginBottom:'1.5rem',lineHeight:1.55,textAlign:'center'}}>
                Choose a strong password for your account
              </p>
              {error && <div className="err-box">{error}</div>}
              <form onSubmit={handleReset}>
                <div className="fw">
                  <input type="password" placeholder="New password (min 6 chars)" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="new-password"/>
                  <span className="ico">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b93b0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
                  </span>
                  {password && (
                    <div className="strength-wrap">
                      <div className="strength-bar" style={{
                        width: password.length < 6 ? '30%' : password.length < 10 ? '65%' : '100%',
                        background: password.length < 6 ? '#ff4d6d' : password.length < 10 ? '#f5a623' : '#00e5a0'
                      }}/>
                      <div className="hint">{password.length < 6 ? '⚠️ Too short' : password.length < 10 ? '👍 Good' : '✅ Strong password'}</div>
                    </div>
                  )}
                </div>
                <div className="fw">
                  <input type="password" placeholder="Confirm new password" value={confirm} onChange={e=>setConfirm(e.target.value)} required autoComplete="new-password"/>
                  <span className="ico">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b93b0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>
                  </span>
                  {confirm && (
                    <div className="hint" style={{color: password===confirm ? '#00e5a0' : '#ff4d6d'}}>
                      {password===confirm ? '✅ Passwords match' : '❌ Passwords do not match'}
                    </div>
                  )}
                </div>
                <button className="btn-main" type="submit" disabled={loading}>
                  {loading ? 'Updating password...' : 'Update password'}
                </button>
              </form>
            </>
          )}

          {/* SUCCESS */}
          {done && (
            <>
              <div style={{fontSize:'3rem',textAlign:'center',marginBottom:'1rem'}}>🎉</div>
              <h2 style={{fontSize:'21px',fontWeight:800,marginBottom:'6px',color:'#eef0ff',textAlign:'center'}}>Password updated!</h2>
              <p style={{fontSize:'12.5px',color:'#8b93b0',marginBottom:'1.5rem',lineHeight:1.6,textAlign:'center'}}>
                Your password has been successfully reset. Sign in with your new password.
              </p>
              <div className="success-box" style={{textAlign:'center'}}>✅ Password changed successfully!</div>
              <button className="btn-main" onClick={() => navigate('/')}>
                Go to Sign in →
              </button>
            </>
          )}

        </div>
      </div>
    </>
  )
}
