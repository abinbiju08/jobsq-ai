import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useEffect, useState } from 'react'

export default function Navbar({ session }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [dark, setDark] = useState(true)

  const showToggle = ['/jobs', '/resume', '/dashboard', '/profile', '/tracker', '/resume-builder', '/interview', '/connect'].includes(location.pathname)

  useEffect(() => {
    const saved = localStorage.getItem('jobsq-theme')
    if (saved === 'light') {
      setDark(false)
      document.body.classList.add('light')
    } else {
      document.body.classList.remove('light')
    }
  }, [])

  useEffect(() => {
    if (location.pathname === '/home') {
      document.body.classList.remove('light')
    } else {
      const saved = localStorage.getItem('jobsq-theme')
      if (saved === 'light') {
        setDark(false)
        document.body.classList.add('light')
      }
    }
  }, [location.pathname])

  function toggleTheme() {
    const newDark = !dark
    setDark(newDark)
    if (newDark) {
      document.body.classList.remove('light')
      localStorage.setItem('jobsq-theme', 'dark')
    } else {
      document.body.classList.add('light')
      localStorage.setItem('jobsq-theme', 'light')
    }
  }

  const logout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const links = [
    { path: '/home',           label: 'Home',          icon: 'ti-home' },
    { path: '/jobs',           label: 'Jobs',          icon: 'ti-briefcase' },
    { path: '/resume',         label: 'Resume score',  icon: 'ti-file-check' },
    { path: '/resume-builder', label: 'Builder',       icon: 'ti-pencil' },
    { path: '/tracker',        label: 'Tracker',       icon: 'ti-layout-kanban' },
    { path: '/dashboard',      label: 'Dashboard',     icon: 'ti-chart-bar' },
  ]

  const initials = session?.user?.email?.[0]?.toUpperCase() || 'U'

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"/>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .navbar{display:flex;align-items:center;padding:0 1.25rem;height:52px;background:var(--nav-bg,rgba(6,9,20,0.97));border-bottom:1px solid var(--border,rgba(255,255,255,0.07));position:sticky;top:0;z-index:100;backdrop-filter:blur(20px);font-family:'Inter',sans-serif;gap:.5rem;}
        .nav-logo{display:flex;align-items:center;gap:8px;margin-right:.75rem;cursor:pointer;flex-shrink:0;}
        .nav-logo-icon{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#00e5a0,#00c484);display:flex;align-items:center;justify-content:center;}
        .nav-logo-text{font-size:15px;font-weight:800;color:var(--text,#eef0ff);}
        .nav-logo-text span{color:#00e5a0;}
        .nav-links{display:flex;gap:2px;flex:1;}
        .nav-link{display:flex;align-items:center;gap:6px;padding:.38rem .8rem;border-radius:8px;font-size:12.5px;font-weight:500;color:var(--text2,#8b93b0);cursor:pointer;border:none;background:none;font-family:'Inter',sans-serif;transition:all .15s;white-space:nowrap;}
        .nav-link i{font-size:15px;line-height:1;}
        .nav-link:hover{background:rgba(0,229,160,0.07);color:var(--text,#eef0ff);}
        .nav-link.active{background:rgba(0,229,160,0.1);color:#00e5a0;}
        .nav-right{margin-left:auto;display:flex;align-items:center;gap:.5rem;flex-shrink:0;}
        .live-pill{display:flex;align-items:center;gap:5px;background:rgba(255,77,109,0.08);border:1px solid rgba(255,77,109,0.2);border-radius:20px;padding:3px 9px;font-size:11px;font-weight:600;color:#ff4d6d;white-space:nowrap;}
        .live-dot{width:5px;height:5px;border-radius:50%;background:#ff4d6d;animation:blink 1.4s infinite;flex-shrink:0;}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        .nav-avatar{width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#00e5a0,#00c484);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#080c18;cursor:pointer;transition:transform .15s;flex-shrink:0;}
        .nav-avatar:hover{transform:scale(1.08);}
        .nav-btn{display:flex;align-items:center;gap:5px;padding:.35rem .75rem;border:1px solid var(--border,rgba(255,255,255,0.08));border-radius:8px;background:none;color:var(--text2,#8b93b0);font-size:12px;font-weight:500;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;white-space:nowrap;}
        .nav-btn i{font-size:14px;}
        .nav-btn:hover{border-color:rgba(255,77,109,0.35);color:#ff6b6b;}
        .theme-btn{display:flex;align-items:center;gap:5px;padding:.32rem .75rem;border-radius:8px;border:1px solid var(--border,rgba(255,255,255,0.08));cursor:pointer;font-family:'Inter',sans-serif;font-size:12px;font-weight:500;transition:all .2s;background:none;color:var(--text2,#8b93b0);}
        .theme-btn i{font-size:14px;}
        .theme-btn:hover{background:rgba(255,255,255,0.04);}
        .theme-btn.dark-mode{color:#f5a623;border-color:rgba(245,166,35,0.25);background:rgba(245,166,35,0.06);}
        .theme-btn.light-mode{color:#00e5a0;border-color:rgba(0,229,160,0.25);background:rgba(0,229,160,0.06);}
      `}</style>

      <nav className="navbar">
        <div className="nav-logo" onClick={()=>navigate('/home')}>
          <div className="nav-logo-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#080c18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <span className="nav-logo-text">JobsQ<span> AI</span></span>
        </div>

        <div className="nav-links">
          {links.map(l => (
            <button
              key={l.path}
              onClick={() => navigate(l.path)}
              className={`nav-link ${location.pathname === l.path ? 'active' : ''}`}
            >
              <i className={`ti ${l.icon}`} aria-hidden="true"/>
              {l.label}
            </button>
          ))}
        </div>

        <div className="nav-right">
          <div className="live-pill">
            <span className="live-dot"/>
            Live
          </div>

          {showToggle && (
            <button
              className={`theme-btn ${dark ? 'dark-mode' : 'light-mode'}`}
              onClick={toggleTheme}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <i className={`ti ${dark ? 'ti-sun' : 'ti-moon'}`} aria-hidden="true"/>
              {dark ? 'Light' : 'Dark'}
            </button>
          )}

          <div
            className="nav-avatar"
            onClick={() => navigate('/profile')}
            title="My profile"
          >
            {initials}
          </div>

          <button className="nav-btn" onClick={logout}>
            <i className="ti ti-logout" aria-hidden="true"/>
            Logout
          </button>
        </div>
      </nav>
    </>
  )
}