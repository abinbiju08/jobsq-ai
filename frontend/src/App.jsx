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
import ResumeBuilder from './pages/ResumeBuilder'
import Tracker from './pages/Tracker'
import Navbar from './components/Navbar'
import ChatBot from './components/ChatBot'
import VoiceAssistant from './components/VoiceAssistant'
import InterviewPrep from './pages/InterviewPrep'
import LetsConnect from './pages/LetsConnect'

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
        <Route path="/resume-builder" element={session ? <ResumeBuilder /> : <Navigate to="/" replace />} />
        <Route path="/dashboard" element={session ? <Dashboard /> : <Navigate to="/" replace />} />
        <Route path="/tracker" element={session ? <Tracker /> : <Navigate to="/" replace />} />
        <Route path="/profile" element={session ? <Profile /> : <Navigate to="/" replace />} />
        <Route path="/interview" element={session ? <InterviewPrep /> : <Navigate to="/" replace />} />
        <Route path="/connect" element={session ? <LetsConnect /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to={session ? "/home" : "/"} replace />} />
      </Routes>
      {session && !isResetPage && (
        <div style={{position:'fixed',bottom:'24px',right:'24px',zIndex:1000,display:'flex',flexDirection:'column',alignItems:'center',gap:'10px'}}>
          <ChatBot />
          <VoiceAssistant />
        </div>
      )}
    </>
  )
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    fetch(`${API}/health`).catch(() => {})
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100vh',background:'#080c18',color:'#00e5a0',fontSize:'16px',fontFamily:'Inter,sans-serif',gap:'.75rem'}}>
      <div style={{width:'28px',height:'28px',border:'2.5px solid rgba(0,229,160,0.2)',borderTopColor:'#00e5a0',borderRadius:'50%',animation:'spin .8s linear infinite'}}/>
      Loading JobsQ AI...
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <BrowserRouter>
      <AppContent session={session} />
    </BrowserRouter>
  )
}

export default App