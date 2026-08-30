import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import * as faceapi from 'face-api.js'

const MODELS_URL = '/models'
// Backend API URL
const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function FaceLogin({ onBack }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [status, setStatus] = useState('loading')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const detRef = useRef(null)
  const blinkRef = useRef(0)
  const prevEyeRef = useRef(true)
  const passedRef = useRef(false)

  useEffect(() => { loadAndStart(); return () => stopCamera() }, [])

  async function loadAndStart() {
    setStatus('loading'); setProgress(5); setErrorMsg('')
    blinkRef.current = 0; passedRef.current = false
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODELS_URL),
      ])
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width:320, height:320, facingMode:'user' }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          setStatus('scanning'); setProgress(20)
          setTimeout(() => startLiveness(), 800)
        }
      }
    } catch(e) {
      setStatus('error'); setErrorMsg('Camera error. Please allow camera access.')
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    if (detRef.current) clearInterval(detRef.current)
  }

  function eyeAR(eye) {
    const A = d(eye[1],eye[5]), B = d(eye[2],eye[4]), C = d(eye[0],eye[3])
    return (A+B)/(2.0*C)
  }
  function d(p1,p2){ return Math.sqrt((p1.x-p2.x)**2+(p1.y-p2.y)**2) }

  async function startLiveness() {
    setStatus('challenge'); setProgress(30)
    let attempts = 0

    detRef.current = setInterval(async () => {
      if (!videoRef.current || passedRef.current) return
      attempts++
      try {
        const det = await faceapi
          .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize:224, scoreThreshold:0.3 }))
          .withFaceLandmarks()
        if (!det) return

        const ear = (eyeAR(det.landmarks.getLeftEye()) + eyeAR(det.landmarks.getRightEye())) / 2
        const closed = ear < 0.25

        if (closed && prevEyeRef.current) {
          blinkRef.current++; prevEyeRef.current = false; setProgress(55)
        } else if (!closed) { prevEyeRef.current = true }

        if (blinkRef.current >= 1 && !passedRef.current) {
          passedRef.current = true
          clearInterval(detRef.current)
          setStatus('matching'); setProgress(70)
          await matchAndLogin()
        }
      } catch(e) {}

      if (attempts > 100 && !passedRef.current) {
        clearInterval(detRef.current)
        setStatus('error'); setErrorMsg('Timed out. Please blink naturally and try again.')
      }
    }, 200)
  }

  async function matchAndLogin() {
    try {
      // Get face descriptor
      const det = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize:224, scoreThreshold:0.3 }))
        .withFaceLandmarks().withFaceDescriptor()

      if (!det) {
        setStatus('error'); setErrorMsg('Could not read face. Try again.')
        return
      }

      setProgress(80)

      // Get all face profiles from Supabase
      const { data: profiles, error } = await supabase
        .from('face_profiles')
        .select('descriptor, user_id, email')

      if (error || !profiles?.length) {
        setStatus('error')
        setErrorMsg('No registered faces found. Please register your face from Profile settings first.')
        return
      }

      setProgress(88)

      // Find best match
      let bestMatch = null
      let bestDist = Infinity

      for (const profile of profiles) {
        const saved = new Float32Array(Object.values(profile.descriptor))
        const dist = faceapi.euclideanDistance(det.descriptor, saved)
        if (dist < bestDist) { bestDist = dist; bestMatch = profile }
      }

      if (bestDist < 0.5 && bestMatch) {
        setProgress(95)

        // Call our backend to get a session token for this user
        const res = await fetch(`${API}/auth/face-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: bestMatch.user_id })
        })

        const data = await res.json()

        if (!res.ok || data.error) {
          setStatus('error')
          setErrorMsg(data.error || 'Login failed. Try again.')
          return
        }

        // Set the session from backend tokens
        const { error: sessionErr } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token
        })

        if (sessionErr) {
          setStatus('error'); setErrorMsg('Session error: ' + sessionErr.message)
          return
        }

        setProgress(100); setStatus('success'); stopCamera()
        // Redirect to home after brief success screen
        setTimeout(() => window.location.reload(), 1500)

      } else {
        setStatus('error')
        setErrorMsg(`Face not recognised (score: ${bestDist.toFixed(2)}). Please try again or use email login.`)
      }
    } catch(e) {
      setStatus('error'); setErrorMsg('Error: ' + e.message)
    }
  }

  const statusColors = {
    loading: '#00e5a0', scanning: '#00e5a0', challenge: '#7c6ff7',
    matching: '#00e5a0', success: '#00e5a0', error: '#ff6b6b'
  }
  const statusMsg = {
    loading: 'Loading AI models...',
    scanning: 'Camera ready — position your face...',
    challenge: 'Face detected ✓ — Please blink once',
    matching: 'Liveness confirmed ✓ Matching identity...',
    success: '✅ Identity matched — Logging you in...',
    error: errorMsg,
  }

  return (
    <>
      <style>{`
        @property --fls{syntax:'<angle>';initial-value:0deg;inherits:false;}
        @keyframes flspin{to{--fls:360deg;}}
        .fl-ring{position:absolute;inset:-4px;border-radius:50%;background:conic-gradient(from var(--fls,0deg),transparent 70%,rgba(0,229,160,0.7) 85%,rgba(124,111,247,0.6) 100%,transparent);animation:flspin 2s linear infinite;z-index:10;pointer-events:none;}
        .fl-scan{position:absolute;left:0;right:0;height:1.5px;background:linear-gradient(90deg,transparent,rgba(0,229,160,0.6),transparent);animation:flsc 2.5s ease-in-out infinite;z-index:12;box-shadow:0 0 6px rgba(0,229,160,0.4);}
        @keyframes flsc{0%{top:10%;opacity:0}10%{opacity:1}90%{opacity:1}100%{top:90%;opacity:0}}
        .fl-br{position:absolute;width:20px;height:20px;z-index:11;}
        .fl-br.tl{top:8px;left:8px;border-top:2.5px solid #00e5a0;border-left:2.5px solid #00e5a0;border-radius:3px 0 0 0;}
        .fl-br.tr{top:8px;right:8px;border-top:2.5px solid #00e5a0;border-right:2.5px solid #00e5a0;border-radius:0 3px 0 0;}
        .fl-br.bl{bottom:8px;left:8px;border-bottom:2.5px solid #00e5a0;border-left:2.5px solid #00e5a0;border-radius:0 0 0 3px;}
        .fl-br.br{bottom:8px;right:8px;border-bottom:2.5px solid #00e5a0;border-right:2.5px solid #00e5a0;border-radius:0 0 3px 0;}
        @keyframes dp{0%,100%{opacity:.4;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}
      `}</style>

      <div style={{display:'flex',flexDirection:'column',gap:'.85rem'}}>
        <div>
          <h2 style={{fontSize:'22px',fontWeight:800,marginBottom:'5px',color:'#eef0ff'}}>Face Recognition</h2>
          <p style={{fontSize:'12.5px',color:'#8b93b0',lineHeight:1.55}}>Look at the camera and blink once to sign in</p>
        </div>

        <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'.85rem'}}>

          {/* CAMERA */}
          <div style={{position:'relative',width:'200px',height:'200px',borderRadius:'50%',overflow:'hidden',background:'rgba(6,9,20,0.8)',border:'1.5px solid rgba(0,229,160,0.2)'}}>
            {!['success','error'].includes(status) && <div className="fl-ring"/>}
            {status==='challenge' && <div className="fl-scan"/>}
            <div className="fl-br tl"/><div className="fl-br tr"/>
            <div className="fl-br bl"/><div className="fl-br br"/>
            <video ref={videoRef} autoPlay muted playsInline
              style={{width:'100%',height:'100%',objectFit:'cover',transform:'scaleX(-1)',display:status==='success'?'none':'block'}}/>
            {status==='success' && (
              <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'3.5rem',background:'radial-gradient(circle,rgba(0,229,160,0.15) 0%,transparent 70%)'}}>✅</div>
            )}
          </div>

          {/* STATUS BAR */}
          <div style={{width:'100%',padding:'.65rem 1rem',background:status==='error'?'rgba(255,77,77,0.06)':'rgba(0,229,160,0.06)',border:`1px solid ${status==='error'?'rgba(255,77,77,0.2)':'rgba(0,229,160,0.15)'}`,borderRadius:'11px',display:'flex',alignItems:'center',gap:'.6rem',fontSize:'12.5px',fontWeight:500,color:statusColors[status]||'#00e5a0'}}>
            <div style={{width:'7px',height:'7px',borderRadius:'50%',background:statusColors[status]||'#00e5a0',flexShrink:0,animation:['success','error'].includes(status)?'none':'dp 1s ease-in-out infinite'}}/>
            <span>{statusMsg[status]}</span>
          </div>

          {/* LIVENESS CHALLENGE */}
          {status==='challenge' && (
            <div style={{width:'100%',padding:'.75rem 1rem',background:'rgba(124,111,247,0.06)',border:'1px solid rgba(124,111,247,0.2)',borderRadius:'11px',textAlign:'center'}}>
              <div style={{fontSize:'9.5px',color:'#7c6ff7',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:600,marginBottom:'.2rem'}}>🛡️ Liveness Check — Anti Spoofing</div>
              <div style={{fontSize:'1.3rem',marginBottom:'.2rem'}}>😉</div>
              <div style={{fontSize:'13px',fontWeight:700,color:'#eef0ff'}}>Please blink once</div>
            </div>
          )}

          {/* PROGRESS BAR */}
          <div style={{height:'3px',background:'rgba(255,255,255,0.06)',borderRadius:'2px',overflow:'hidden',width:'100%'}}>
            <div style={{height:'100%',background:'linear-gradient(90deg,#00e5a0,#7c6ff7)',borderRadius:'2px',transition:'width .5s ease',width:`${progress}%`}}/>
          </div>

          {/* PROGRESS DOTS */}
          <div>
            <div style={{fontSize:'9.5px',color:'#4a5168',textAlign:'center',marginBottom:'.4rem',letterSpacing:'.06em',textTransform:'uppercase'}}>Verification Progress</div>
            <div style={{display:'flex',gap:'.5rem',justifyContent:'center'}}>
              {[25,50,75,100].map((threshold,i)=>(
                <div key={i} style={{width:'9px',height:'9px',borderRadius:'50%',background:progress>=threshold?'#00e5a0':'rgba(255,255,255,0.08)',boxShadow:progress>=threshold?'0 0 7px rgba(0,229,160,0.5)':'none',transition:'all .3s'}}/>
              ))}
            </div>
          </div>

          {/* SECURITY BADGES */}
          <div style={{display:'flex',gap:'.4rem',justifyContent:'center',flexWrap:'wrap'}}>
            {['✅ Anti-Spoofing','🔒 Encrypted','🚫 No Photo Stored','📡 Local Only'].map(b=>(
              <span key={b} style={{fontSize:'9.5px',fontWeight:600,padding:'3px 8px',borderRadius:'20px',background:'rgba(0,229,160,0.06)',border:'1px solid rgba(0,229,160,0.15)',color:'rgba(0,229,160,0.8)'}}>{b}</span>
            ))}
          </div>

          {/* RETRY */}
          {status==='error' && (
            <button onClick={loadAndStart} style={{width:'100%',padding:'.72rem',border:'1px solid rgba(255,77,77,0.3)',borderRadius:'12px',background:'rgba(255,77,77,0.06)',color:'#ff6b6b',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
              🔄 Try Again
            </button>
          )}
        </div>

        <div style={{display:'flex',alignItems:'center',gap:'10px',color:'#4a5168',fontSize:'11px'}}>
          <div style={{flex:1,height:'1px',background:'rgba(255,255,255,0.07)'}}/>or<div style={{flex:1,height:'1px',background:'rgba(255,255,255,0.07)'}}/>
        </div>
        <button onClick={onBack} style={{width:'100%',padding:'.74rem',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'12px',background:'rgba(255,255,255,0.03)',color:'#8b93b0',fontSize:'13px',fontWeight:500,cursor:'pointer',fontFamily:'Inter,sans-serif',display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem'}}>
          ✉ Use Email Login instead
        </button>
      </div>
    </>
  )
}
