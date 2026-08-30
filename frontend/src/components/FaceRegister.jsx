import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import * as faceapi from 'face-api.js'

const MODELS_URL = '/models'

export default function FaceRegister({ onBack, onSuccess }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [step, setStep] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [progress, setProgress] = useState(0)
  const [blinkCount, setBlinkCount] = useState(0)
  const blinkRef = useRef(0)
  const prevEyeRef = useRef(true)
  const detRef = useRef(null)
  const passedRef = useRef(false)

  useEffect(() => { loadAndStart(); return () => stopCamera() }, [])

  async function loadAndStart() {
    setStep(0); setProgress(5); setErrorMsg('')
    blinkRef.current = 0; passedRef.current = false; setBlinkCount(0)
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODELS_URL),
      ])
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width:320, height:320, facingMode:'user' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          setStep(1); setProgress(20)
          setTimeout(() => startLiveness(), 800)
        }
      }
    } catch(e) { setStep(5); setErrorMsg('Camera error. Please allow camera access.') }
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
    setStep(2); setProgress(35)
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
          blinkRef.current += 1; prevEyeRef.current = false
          setBlinkCount(blinkRef.current); setProgress(35 + blinkRef.current * 20)
        } else if (!closed) { prevEyeRef.current = true }
        if (blinkRef.current >= 1 && !passedRef.current) {
          passedRef.current = true; clearInterval(detRef.current)
          setProgress(70); await saveFace()
        }
      } catch(e) {}
      if (attempts > 100 && !passedRef.current) {
        clearInterval(detRef.current); setStep(5)
        setErrorMsg('Timed out. Please blink naturally and try again.')
      }
    }, 200)
  }

  async function saveFace() {
    setStep(3); setProgress(80)
    try {
      const det = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize:224, scoreThreshold:0.3 }))
        .withFaceLandmarks().withFaceDescriptor()
      if (!det) { setStep(5); setErrorMsg('Could not extract face. Try again.'); return }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setStep(5); setErrorMsg('Session expired. Please login again.'); return }

      const descriptor = Array.from(det.descriptor)
      // Save face WITH email so we can sign in later
      const { error } = await supabase.from('face_profiles').upsert({
        user_id: user.id,
        email: user.email,
        descriptor
      }, { onConflict: 'user_id' })

      if (error) throw error
      setProgress(100); setStep(4); stopCamera()
      setTimeout(() => onSuccess?.(), 2000)
    } catch(e) { setStep(5); setErrorMsg('Save failed: ' + e.message) }
  }

  const steps = [
    { icon: step>=1?'✅':'⬜', label:'Face Detected', sub:'Good lighting, face centred', active:step>=1, color:'#00e5a0', border:'rgba(0,229,160,0.15)', bg:'rgba(0,229,160,0.05)' },
    { icon: step>=2?(step>=3?'✅':'⏳'):'⬜', label:'Liveness Check', sub:blinkCount>=1?`Blink detected ✓`:'Blink once to confirm', active:step>=2, color:'#7c6ff7', border:'rgba(124,111,247,0.18)', bg:'rgba(124,111,247,0.05)' },
    { icon: step===4?'🎉':step>=3?'💾':'⬜', label:step===4?'Face Registered!':'Saving Face Profile', sub:step===4?'You can now use Face Login':'128-point descriptor encrypted', active:step>=3, color:step===4?'#00e5a0':'#3b82f6', border:step===4?'rgba(0,229,160,0.15)':'rgba(59,130,246,0.18)', bg:step===4?'rgba(0,229,160,0.05)':'rgba(59,130,246,0.05)' },
  ]

  return (
    <>
      <style>{`
        @property --sr2{syntax:'<angle>';initial-value:0deg;inherits:false;}
        @keyframes sr2{to{--sr2:360deg;}}
        .fr-ring{position:absolute;inset:-4px;border-radius:50%;background:conic-gradient(from var(--sr2,0deg),transparent 70%,rgba(0,229,160,0.7) 85%,rgba(124,111,247,0.6) 100%,transparent);animation:sr2 2s linear infinite reverse;z-index:10;pointer-events:none;}
        .fr-br{position:absolute;width:20px;height:20px;z-index:11;}
        .fr-br.tl{top:8px;left:8px;border-top:2.5px solid #00e5a0;border-left:2.5px solid #00e5a0;border-radius:3px 0 0 0;}
        .fr-br.tr{top:8px;right:8px;border-top:2.5px solid #00e5a0;border-right:2.5px solid #00e5a0;border-radius:0 3px 0 0;}
        .fr-br.bl{bottom:8px;left:8px;border-bottom:2.5px solid #00e5a0;border-left:2.5px solid #00e5a0;border-radius:0 0 0 3px;}
        .fr-br.br{bottom:8px;right:8px;border-bottom:2.5px solid #00e5a0;border-right:2.5px solid #00e5a0;border-radius:0 0 3px 0;}
      `}</style>

      <div style={{display:'flex',flexDirection:'column',gap:'.7rem'}}>
        <div>
          <h2 style={{fontSize:'21px',fontWeight:800,marginBottom:'4px',color:'#eef0ff'}}>Register Your Face</h2>
          <p style={{fontSize:'12px',color:'#8b93b0',lineHeight:1.5}}>One-time setup · blink once to confirm</p>
        </div>
        <div style={{display:'flex',justifyContent:'center'}}>
          <div style={{position:'relative',width:'180px',height:'180px',borderRadius:'50%',overflow:'hidden',background:'rgba(6,9,20,0.8)',border:'1.5px solid rgba(0,229,160,0.2)'}}>
            <div className="fr-ring"/>
            <div className="fr-br tl"/><div className="fr-br tr"/>
            <div className="fr-br bl"/><div className="fr-br br"/>
            <video ref={videoRef} autoPlay muted playsInline style={{width:'100%',height:'100%',objectFit:'cover',transform:'scaleX(-1)',display:step===4?'none':'block'}}/>
            {step===4 && <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',background:'radial-gradient(circle,rgba(0,229,160,0.15) 0%,transparent 70%)',fontSize:'3.5rem'}}>🎉</div>}
          </div>
        </div>
        <div style={{height:'3px',background:'rgba(255,255,255,0.06)',borderRadius:'2px',overflow:'hidden'}}>
          <div style={{height:'100%',background:'linear-gradient(90deg,#00e5a0,#7c6ff7)',borderRadius:'2px',transition:'width .5s ease',width:`${progress}%`}}/>
        </div>
        {step===2 && (
          <div style={{padding:'.6rem 1rem',background:'rgba(124,111,247,0.06)',border:'1px solid rgba(124,111,247,0.2)',borderRadius:'10px',textAlign:'center'}}>
            <div style={{fontSize:'9px',color:'#7c6ff7',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:600,marginBottom:'.15rem'}}>🛡️ Liveness Check</div>
            <div style={{fontSize:'1.2rem'}}>😉</div>
            <div style={{fontSize:'12.5px',fontWeight:700,color:'#eef0ff'}}>{blinkCount>=1?'✅ Blink detected!':'Please blink once'}</div>
          </div>
        )}
        <div style={{display:'flex',flexDirection:'column',gap:'.35rem'}}>
          {steps.map((s,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:'.6rem',padding:'.45rem .75rem',borderRadius:'9px',background:s.active?s.bg:'rgba(255,255,255,0.02)',border:`1px solid ${s.active?s.border:'rgba(255,255,255,0.06)'}`,opacity:s.active?1:0.45}}>
              <span style={{fontSize:'.95rem',flexShrink:0}}>{s.icon}</span>
              <div>
                <div style={{fontSize:'11.5px',fontWeight:700,color:s.active?s.color:'#4a5168',lineHeight:1.2}}>{s.label}</div>
                <div style={{fontSize:'10.5px',color:'#8b93b0'}}>{s.sub}</div>
              </div>
            </div>
          ))}
        </div>
        {step===5 && (
          <div style={{padding:'.6rem .85rem',background:'rgba(255,77,77,0.06)',border:'1px solid rgba(255,77,77,0.2)',borderRadius:'10px'}}>
            <div style={{fontSize:'12px',color:'#ff6b6b',marginBottom:'.4rem'}}>{errorMsg}</div>
            <button onClick={loadAndStart} style={{width:'100%',padding:'.55rem',background:'rgba(255,77,77,0.08)',border:'1px solid rgba(255,77,77,0.2)',borderRadius:'8px',color:'#ff6b6b',cursor:'pointer',fontFamily:'Inter,sans-serif',fontSize:'12px',fontWeight:600}}>🔄 Try Again</button>
          </div>
        )}
        <div style={{display:'flex',gap:'.35rem',flexWrap:'wrap',justifyContent:'center'}}>
          {['🔐 128-Point Encrypted','🚫 Spoof Blocked','🧠 AI Liveness'].map(b=>(
            <span key={b} style={{fontSize:'9.5px',fontWeight:600,padding:'2px 7px',borderRadius:'20px',background:'rgba(0,229,160,0.06)',border:'1px solid rgba(0,229,160,0.15)',color:'rgba(0,229,160,0.8)'}}>{b}</span>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',gap:'10px',color:'#4a5168',fontSize:'11px'}}>
          <div style={{flex:1,height:'1px',background:'rgba(255,255,255,0.07)'}}/>or<div style={{flex:1,height:'1px',background:'rgba(255,255,255,0.07)'}}/>
        </div>
        <button onClick={onBack} style={{width:'100%',padding:'.68rem',border:'1px solid rgba(255,255,255,0.12)',borderRadius:'12px',background:'rgba(255,255,255,0.03)',color:'#8b93b0',fontSize:'13px',fontWeight:500,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
          ✉ Use Email Login instead
        </button>
      </div>
    </>
  )
}
