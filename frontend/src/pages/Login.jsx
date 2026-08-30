import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import FaceLogin from '../components/FaceLogin'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('email') // email | face
  const [mode, setMode] = useState('login') // login | forgot | forgot_sent
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)
    const C = [{r:0,g:229,b:160},{r:124,g:111,b:247},{r:59,g:130,b:246}]
    const nodes = Array.from({length:88}, () => ({x:Math.random()*canvas.width,y:Math.random()*canvas.height,vx:(Math.random()-.5)*.38,vy:(Math.random()-.5)*.38,r:Math.random()*1.6+.5,c:C[Math.floor(Math.random()*C.length)]}))
    const stars = Array.from({length:55}, () => ({x:Math.random()*canvas.width,y:Math.random()*canvas.height,r:Math.random()*1.2+.3,phase:Math.random()*Math.PI*2,speed:Math.random()*.004+.002,c:C[Math.floor(Math.random()*C.length)]}))
    let animId
    function draw() {
      ctx.clearRect(0,0,canvas.width,canvas.height)
      for(const n of nodes){n.x+=n.vx;n.y+=n.vy;if(n.x<0||n.x>canvas.width)n.vx*=-1;if(n.y<0||n.y>canvas.height)n.vy*=-1}
      for(let i=0;i<nodes.length;i++)for(let j=i+1;j<nodes.length;j++){const dx=nodes[i].x-nodes[j].x,dy=nodes[i].y-nodes[j].y,d=Math.sqrt(dx*dx+dy*dy);if(d<135){ctx.beginPath();ctx.moveTo(nodes[i].x,nodes[i].y);ctx.lineTo(nodes[j].x,nodes[j].y);ctx.strokeStyle=`rgba(0,229,160,${(1-d/135)*0.17})`;ctx.lineWidth=0.65;ctx.stroke()}}
      for(const n of nodes){ctx.beginPath();ctx.arc(n.x,n.y,n.r,0,Math.PI*2);ctx.fillStyle=`rgba(${n.c.r},${n.c.g},${n.c.b},0.65)`;ctx.fill();const g=ctx.createRadialGradient(n.x,n.y,0,n.x,n.y,n.r*5);g.addColorStop(0,`rgba(${n.c.r},${n.c.g},${n.c.b},0.07)`);g.addColorStop(1,'transparent');ctx.beginPath();ctx.arc(n.x,n.y,n.r*5,0,Math.PI*2);ctx.fillStyle=g;ctx.fill()}
      for(const s of stars){s.phase+=s.speed;const a=(Math.sin(s.phase)*.5+.5)*.45+.05;const g=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,s.r*2.5);g.addColorStop(0,`rgba(${s.c.r},${s.c.g},${s.c.b},${a})`);g.addColorStop(1,'transparent');ctx.beginPath();ctx.arc(s.x,s.y,s.r*2.5,0,Math.PI*2);ctx.fillStyle=g;ctx.fill()}
      animId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', resize) }
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    setLoading(false)
  }

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  }

  const handleSignup = async () => {
    if (!email || !password) { setError('Please enter email and password first'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else setError('✅ Check your email to confirm signup!')
    setLoading(false)
  }

  const handleForgot = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    if (!email) { setError('Please enter your email address'); setLoading(false); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` })
    if (error) setError(error.message)
    else setMode('forgot_sent')
    setLoading(false)
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .ls{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#080c18;overflow:hidden;font-family:'Inter',system-ui,sans-serif;}
        .lc{position:fixed;inset:0;z-index:0;}
        .o1{position:fixed;top:-180px;left:-180px;width:480px;height:480px;border-radius:50%;background:radial-gradient(circle,rgba(0,229,160,0.28) 0%,rgba(0,229,160,0.1) 40%,transparent 68%);filter:blur(45px);z-index:1;pointer-events:none;animation:o1a 16s ease-in-out infinite;}
        .o2{position:fixed;top:-180px;right:-180px;width:460px;height:460px;border-radius:50%;background:radial-gradient(circle,rgba(124,111,247,0.28) 0%,rgba(124,111,247,0.1) 40%,transparent 68%);filter:blur(45px);z-index:1;pointer-events:none;animation:o2a 20s ease-in-out infinite;}
        .o3{position:fixed;bottom:-180px;left:-140px;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,rgba(59,130,246,0.2) 0%,transparent 68%);filter:blur(50px);z-index:1;pointer-events:none;animation:o3a 18s ease-in-out infinite;}
        .o4{position:fixed;bottom:-160px;right:-140px;width:400px;height:400px;border-radius:50%;background:radial-gradient(circle,rgba(0,229,160,0.18) 0%,transparent 68%);filter:blur(50px);z-index:1;pointer-events:none;animation:o4a 22s ease-in-out infinite;}
        @keyframes o1a{0%,100%{transform:translate(0,0)}40%{transform:translate(50px,60px)}70%{transform:translate(20px,100px)}}
        @keyframes o2a{0%,100%{transform:translate(0,0)}35%{transform:translate(-60px,55px)}70%{transform:translate(-25px,90px)}}
        @keyframes o3a{0%,100%{transform:translate(0,0)}50%{transform:translate(65px,-50px)}}
        @keyframes o4a{0%,100%{transform:translate(0,0)}40%{transform:translate(-50px,-40px)}75%{transform:translate(-80px,-15px)}}
        .lg{position:fixed;inset:0;z-index:2;pointer-events:none;background-image:linear-gradient(rgba(255,255,255,.014) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.014) 1px,transparent 1px);background-size:54px 54px;}
        .lw{position:relative;z-index:5;width:390px;display:flex;flex-direction:column;align-items:center;}
        .tabs{display:flex;gap:.4rem;width:100%;margin-bottom:1rem;}
        .tab-btn{flex:1;padding:.55rem .4rem;border-radius:10px;border:1px solid rgba(255,255,255,0.07);background:rgba(255,255,255,0.03);color:#4a5168;font-size:12px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:all .2s;text-align:center;}
        .tab-btn.active{background:rgba(0,229,160,0.08);border-color:rgba(0,229,160,0.3);color:#00e5a0;}
        .tab-btn:hover:not(.active){background:rgba(255,255,255,0.04);color:#8b93b0;}
        .card{width:100%;background:rgba(6,9,20,0.85);border:1px solid rgba(255,255,255,0.13);border-radius:24px;padding:2.5rem 2.25rem 2.25rem;position:relative;backdrop-filter:blur(48px);box-shadow:0 0 0 1px rgba(255,255,255,0.03),0 24px 80px rgba(0,0,0,0.6);}
        .card-glow{position:absolute;inset:-1px;border-radius:25px;background:conic-gradient(from var(--a,0deg),transparent 65%,rgba(0,229,160,0.5),rgba(124,111,247,0.4),transparent);-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;animation:spinB 5s linear infinite;z-index:-1;padding:1px;}
        @property --a{syntax:'<angle>';initial-value:0deg;inherits:false;}
        @keyframes spinB{to{--a:360deg;}}
        .shimmer{position:absolute;bottom:0;left:0;right:0;height:2px;border-radius:0 0 24px 24px;background:linear-gradient(90deg,transparent,#00e5a0,#7c6ff7,transparent);background-size:200% 100%;animation:sh 3s linear infinite;}
        @keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
        .brand-row{display:flex;align-items:center;gap:12px;margin-bottom:1.8rem;}
        .brand-icon{width:42px;height:42px;border-radius:11px;background:linear-gradient(135deg,#00e5a0,#00c484);display:flex;align-items:center;justify-content:center;box-shadow:0 0 22px rgba(0,229,160,0.45);flex-shrink:0;}
        .brand-name{font-size:17px;font-weight:800;line-height:1.15;color:#eef0ff;}
        .brand-name span{color:#00e5a0;}
        .brand-sub{font-size:10.5px;color:#4a5168;margin-top:2px;}
        .fw{position:relative;margin-bottom:.8rem;}
        .fw .ico{position:absolute;left:14px;top:50%;transform:translateY(-50%);width:16px;height:16px;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:2;opacity:.45;transition:opacity .2s;}
        .fw .ico svg{width:15px;height:15px;stroke:#8b93b0;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}
        .fw input{display:block;width:100%;background:rgba(255,255,255,0.035);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:.78rem 1rem .78rem 44px;color:#eef0ff;font-size:13.5px;font-family:'Inter',sans-serif;outline:none;transition:border-color .22s,background .22s,box-shadow .22s;}
        .fw input::placeholder{color:#4a5168;font-size:13px;}
        .fw input:focus{border-color:rgba(0,229,160,0.5);background:rgba(0,229,160,0.04);box-shadow:0 0 0 3px rgba(0,229,160,0.09);}
        .fw:focus-within .ico{opacity:1;}
        .fw:focus-within .ico svg{stroke:#00e5a0;}
        .forgot-btn{display:block;font-size:11.5px;color:#4a5168;text-align:right;margin-bottom:1.1rem;cursor:pointer;transition:color .15s;background:none;border:none;font-family:'Inter',sans-serif;width:100%;}
        .forgot-btn:hover{color:#00e5a0;}
        .btn-main{width:100%;padding:.82rem;border:none;border-radius:12px;background:linear-gradient(135deg,#00e5a0,#00c484);color:#060d0a;font-size:14px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;margin-bottom:.95rem;letter-spacing:.01em;box-shadow:0 4px 24px rgba(0,229,160,0.32);transition:transform .15s,box-shadow .2s;display:flex;align-items:center;justify-content:center;gap:.5rem;}
        .btn-main:hover{box-shadow:0 6px 32px rgba(0,229,160,0.52);transform:translateY(-2px);}
        .btn-main:active{transform:scale(.97);}
        .btn-main:disabled{opacity:.6;cursor:default;transform:none;}
        .btn-face{width:100%;padding:.82rem;border:none;border-radius:12px;background:linear-gradient(135deg,#7c6ff7,#5a52d5);color:#fff;font-size:14px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;margin-bottom:.95rem;box-shadow:0 4px 24px rgba(124,111,247,0.32);transition:transform .15s,box-shadow .2s;display:flex;align-items:center;justify-content:center;gap:.5rem;}
        .btn-face:hover{box-shadow:0 6px 32px rgba(124,111,247,0.5);transform:translateY(-2px);}
        .btn-google{width:100%;padding:.74rem;border:1px solid rgba(255,255,255,0.13);border-radius:12px;background:rgba(255,255,255,0.03);color:#eef0ff;font-size:13px;font-weight:500;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:9px;font-family:'Inter',sans-serif;transition:border-color .2s,background .2s;}
        .btn-google:hover{border-color:rgba(0,229,160,.35);background:rgba(0,229,160,0.06);}
        .btn-secondary{width:100%;padding:.82rem;border:1px solid rgba(255,255,255,0.12);border-radius:12px;background:rgba(255,255,255,0.04);color:#eef0ff;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;margin-bottom:.95rem;transition:border-color .2s,background .2s;}
        .btn-secondary:hover{border-color:rgba(0,229,160,0.4);background:rgba(0,229,160,0.06);}
        .or{display:flex;align-items:center;gap:10px;color:#4a5168;font-size:11px;margin-bottom:.95rem;}
        .or::before,.or::after{content:'';flex:1;height:1px;background:rgba(255,255,255,0.07);}
        .ft{font-size:11.5px;color:#4a5168;text-align:center;margin-top:.95rem;}
        .ft span{color:#00e5a0;cursor:pointer;font-weight:600;}
        .ft span:hover{text-decoration:underline;}
        .err{background:rgba(255,77,77,0.1);border:1px solid rgba(255,77,77,0.3);border-radius:8px;padding:10px 14px;font-size:13px;color:#ff6b6b;margin-bottom:1rem;}
        .suc{background:rgba(0,229,160,0.08);border:1px solid rgba(0,229,160,0.25);border-radius:8px;padding:10px 14px;font-size:13px;color:#00e5a0;margin-bottom:1rem;}
        .back-btn{background:none;border:none;color:#8b93b0;font-size:12px;cursor:pointer;font-family:'Inter',sans-serif;display:flex;align-items:center;gap:4px;margin-bottom:1rem;padding:0;transition:color .15s;}
        .back-btn:hover{color:#00e5a0;}
      `}</style>

      <div className="ls">
        <canvas ref={canvasRef} className="lc"/>
        <div className="o1"/><div className="o2"/>
        <div className="o3"/><div className="o4"/>
        <div className="lg"/>

        <div className="lw">
          {/* TABS — only 2 now */}
          <div className="tabs">
            <button className={`tab-btn ${tab==='email'?'active':''}`} onClick={()=>{setTab('email');setMode('login');setError('')}}>✉ Email Login</button>
            <button className={`tab-btn ${tab==='face'?'active':''}`} onClick={()=>{setTab('face');setError('')}}>👤 Face Login</button>
          </div>

          <div className="card">
            <div className="card-glow"/>
            <div className="shimmer"/>

            {/* BRAND */}
            <div className="brand-row">
              <div className="brand-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#080c18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div>
                <div className="brand-name">JobsQ<span> AI</span></div>
                <div className="brand-sub">The World's Smartest Job Platform</div>
              </div>
            </div>

            {/* EMAIL LOGIN */}
            {tab === 'email' && mode === 'login' && (
              <>
                <h2 style={{fontSize:'22px',fontWeight:800,marginBottom:'5px',color:'#eef0ff'}}>Welcome back</h2>
                <p style={{fontSize:'12.5px',color:'#8b93b0',marginBottom:'1.5rem',lineHeight:1.55}}>Sign in to find your perfect job</p>
                {error && <div className={error.startsWith('✅')?'suc':'err'}>{error}</div>}
                <form onSubmit={handleLogin}>
                  <div className="fw">
                    <input type="email" placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="off"/>
                    <span className="ico"><svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg></span>
                  </div>
                  <div className="fw">
                    <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="new-password"/>
                    <span className="ico"><svg viewBox="0 0 24 24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg></span>
                  </div>
                  <button type="button" className="forgot-btn" onClick={()=>{setMode('forgot');setError('')}}>Forgot password?</button>
                  <button className="btn-main" type="submit" disabled={loading}>{loading?'Signing in...':'Sign in'}</button>
                </form>
                <div className="or">or continue with</div>
                <button className="btn-face" onClick={()=>setTab('face')}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M5 20a7 7 0 0114 0"/></svg>
                  Sign in with Face ID
                </button>
                <button className="btn-google" onClick={handleGoogle}>
                  <svg width="15" height="15" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Continue with Google
                </button>
                <p className="ft">No account? <span onClick={handleSignup}>Sign up free</span></p>
              </>
            )}

            {/* FORGOT PASSWORD */}
            {tab === 'email' && mode === 'forgot' && (
              <>
                <button className="back-btn" onClick={()=>{setMode('login');setError('')}}>← Back to sign in</button>
                <h2 style={{fontSize:'21px',fontWeight:800,marginBottom:'6px',color:'#eef0ff'}}>Reset password</h2>
                <p style={{fontSize:'12.5px',color:'#8b93b0',marginBottom:'1.5rem',lineHeight:1.55}}>Enter your email and we'll send you a reset link</p>
                {error && <div className="err">{error}</div>}
                <form onSubmit={handleForgot}>
                  <div className="fw">
                    <input type="email" placeholder="your@email.com" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="off"/>
                    <span className="ico"><svg viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 7l10 7 10-7"/></svg></span>
                  </div>
                  <button className="btn-main" type="submit" disabled={loading}>{loading?'Sending...':'Send reset link'}</button>
                </form>
                <button className="btn-secondary" onClick={()=>{setMode('login');setError('')}}>Back to sign in</button>
              </>
            )}

            {/* FORGOT SENT */}
            {tab === 'email' && mode === 'forgot_sent' && (
              <>
                <div style={{fontSize:'3rem',textAlign:'center',marginBottom:'1rem'}}>📬</div>
                <h2 style={{fontSize:'21px',fontWeight:800,marginBottom:'6px',color:'#eef0ff',textAlign:'center'}}>Check your email</h2>
                <p style={{fontSize:'12.5px',color:'#8b93b0',marginBottom:'1.5rem',lineHeight:1.6,textAlign:'center'}}>
                  Reset link sent to <strong style={{color:'#00e5a0'}}>{email}</strong>
                </p>
                <div className="suc" style={{textAlign:'center'}}>✅ Reset email sent!</div>
                <button className="btn-main" onClick={()=>{setMode('login');setError('');setEmail('');setPassword('')}}>Back to sign in</button>
              </>
            )}

            {/* FACE LOGIN */}
            {tab === 'face' && (
              <FaceLogin onBack={()=>setTab('email')} />
            )}
          </div>
        </div>
      </div>
    </>
  )
}
