import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Navbar({ session }) {
  const navigate = useNavigate()
  const location = useLocation()

  const logout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const links = [
    { path: '/home', label: 'Home' },
    { path: '/jobs', label: 'Jobs' },
    { path: '/resume', label: 'Resume Score' },
    { path: '/dashboard', label: 'Dashboard' },
  ]

  return (
    <>
      <style>{`
        .navbar{display:flex;align-items:center;padding:0 1.5rem;height:52px;background:rgba(6,9,20,0.95);border-bottom:1px solid rgba(255,255,255,0.07);position:sticky;top:0;z-index:100;backdrop-filter:blur(20px);font-family:'Inter',sans-serif;}
        .nav-logo{display:flex;align-items:center;gap:9px;margin-right:1rem;cursor:pointer;}
        .nav-logo-icon{width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#00e5a0,#00c484);display:flex;align-items:center;justify-content:center;}
        .nav-logo-text{font-size:15px;font-weight:800;color:#eef0ff;}
        .nav-logo-text span{color:#00e5a0;}
        .nav-links{display:flex;gap:4px;flex:1;}
        .nav-link{padding:.4rem .85rem;border-radius:8px;font-size:13px;font-weight:500;color:#8b93b0;cursor:pointer;border:none;background:none;font-family:'Inter',sans-serif;transition:all .15s;}
        .nav-link:hover{background:rgba(255,255,255,0.05);color:#eef0ff;}
        .nav-link.active{background:rgba(0,229,160,0.1);color:#00e5a0;}
        .nav-right{margin-left:auto;display:flex;align-items:center;gap:.75rem;}
        .live-pill{display:flex;align-items:center;gap:5px;background:rgba(255,77,109,0.1);border:1px solid rgba(255,77,109,0.25);border-radius:20px;padding:3px 10px;font-size:11px;font-weight:600;color:#ff4d6d;}
        .live-dot{width:6px;height:6px;border-radius:50%;background:#ff4d6d;animation:blink 1.4s infinite;}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        .nav-avatar{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#00e5a0,#00c484);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#080c18;cursor:pointer;transition:transform .15s,box-shadow .15s;}
        .nav-avatar:hover{transform:scale(1.1);box-shadow:0 0 12px rgba(0,229,160,0.4);}
        .nav-logout{padding:.35rem .85rem;border:1px solid rgba(255,255,255,0.08);border-radius:8px;background:none;color:#8b93b0;font-size:12px;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;}
        .nav-logout:hover{border-color:rgba(255,77,109,0.4);color:#ff4d6d;}
      `}</style>
      <nav className="navbar">
        <div className="nav-logo" onClick={()=>navigate('/home')}>
          <div className="nav-logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#080c18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="nav-logo-text">JobsQ<span> AI</span></span>
        </div>
        <div className="nav-links">
          {links.map(l=>(
            <button key={l.path} onClick={()=>navigate(l.path)} className={`nav-link ${location.pathname===l.path?'active':''}`}>
              {l.label}
            </button>
          ))}
        </div>
        <div className="nav-right">
          <div className="live-pill"><span className="live-dot"/>Live</div>
          {/* Avatar links to profile */}
          <div className="nav-avatar" onClick={()=>navigate('/profile')} title="My Profile">
            {session?.user?.email?.[0]?.toUpperCase()||'U'}
          </div>
          <button className="nav-logout" onClick={logout}>Logout</button>
        </div>
      </nav>
    </>
  )
}
