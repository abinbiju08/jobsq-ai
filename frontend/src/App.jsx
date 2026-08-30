import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Home from './pages/Home'
import Jobs from './pages/Jobs'
import Resume from './pages/Resume'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import ResetPassword from './pages/ResetPassword'
import Navbar from './components/Navbar'
import ChatBot from './components/ChatBot'

function AppContent({ session }) {
  const location = useLocation()
  const isResetPage = location.pathname === '/reset-password'
  return (
    <>
      {session && !isResetPage && <Navbar session={session} />}
      <Routes>
        <Route path="/" element={!session ? <Login /> : <Navigate to="/home" replace />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/home" element={session ? <Home /> : <Navigate to="/" replace />} />
        <Route path="/jobs" element={session ? <Jobs /> : <Navigate to="/" replace />} />
        <Route path="/resume" element={session ? <Resume /> : <Navigate to="/" replace />} />
        <Route path="/dashboard" element={session ? <Dashboard /> : <Navigate to="/" replace />} />
        <Route path="/profile" element={session ? <Profile /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to={session ? "/home" : "/"} replace />} />
      </Routes>
      {session && !isResetPage && <ChatBot />}
    </>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#080c18',color:'#00e5a0',fontSize:'16px',fontFamily:'Inter,sans-serif'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:'36px',height:'36px',border:'3px solid rgba(0,229,160,0.2)',borderTopColor:'#00e5a0',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto 1rem'}}/>
        Loading JobsQ AI...
      </div>
    </div>
  )

  return (
    <BrowserRouter>
      <AppContent session={session} />
    </BrowserRouter>
  )
}

export default App
