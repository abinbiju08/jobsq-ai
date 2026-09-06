import { useState, useRef } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function SmartJobMatch({ onMatched, onClose }) {
  const [step, setStep] = useState('upload')
  const [file, setFile] = useState(null)
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [matchedJobs, setMatchedJobs] = useState([])
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  function handleDrop(e) {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.type === 'application/pdf') { setFile(f); setError('') }
    else setError('Please upload a PDF file')
  }

  async function analyzeResume() {
    if (!file) return
    setStep('analyzing'); setProgress(5); setError('')
    setProgressText('Reading your resume...')

    // Animate progress while waiting
    const progressInterval = setInterval(() => {
      setProgress(p => {
        if (p < 30) { setProgressText('Uploading resume...'); return p + 2 }
        if (p < 60) { setProgressText('Gemini AI analyzing skills...'); return p + 1 }
        if (p < 80) { setProgressText('Finding matching jobs...'); return p + 0.5 }
        return p
      })
    }, 200)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`${API}/match/match-jobs`, {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setProgress(90); setProgressText('Calculating match scores...')

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `Server error: ${res.status}`)
      }

      const data = await res.json()

      if (data.error) throw new Error(data.error)

      setProgress(100); setProgressText('Done!')
      setAnalysis(data.analysis)
      setMatchedJobs(data.jobs || [])
      setStep('results')
      onMatched?.(data.jobs || [], data.analysis)

    } catch(e) {
      clearInterval(progressInterval)
      console.error('Resume match error:', e)
      setError('Error: ' + e.message)
      setStep('upload')
    }
  }

  // ANALYZING
  if (step === 'analyzing') return (
    <div style={{position:'fixed',inset:0,background:'rgba(6,9,20,0.88)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)'}}>
      <div style={{background:'#0d1120',border:'1px solid rgba(0,229,160,0.2)',borderRadius:'20px',padding:'2.5rem',width:'360px',textAlign:'center'}}>
        <div style={{fontSize:'3rem',marginBottom:'1rem'}}>🤖</div>
        <div style={{fontSize:'17px',fontWeight:700,color:'#eef0ff',marginBottom:'.5rem'}}>Analyzing Resume</div>
        <div style={{fontSize:'12px',color:'#8b93b0',marginBottom:'1.5rem',minHeight:'18px'}}>{progressText}</div>
        <div style={{height:'6px',background:'rgba(255,255,255,0.06)',borderRadius:'3px',overflow:'hidden',marginBottom:'.6rem'}}>
          <div style={{height:'100%',width:`${progress}%`,background:'linear-gradient(90deg,#00e5a0,#00c484)',borderRadius:'3px',transition:'width .5s ease'}}/>
        </div>
        <div style={{fontSize:'12px',color:'#00e5a0',fontWeight:600}}>{progress}%</div>
      </div>
    </div>
  )

  // RESULTS
  if (step === 'results' && analysis) return (
    <div style={{position:'fixed',inset:0,background:'rgba(6,9,20,0.9)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)',padding:'1rem'}}>
      <div style={{background:'#0d1120',border:'1px solid rgba(0,229,160,0.2)',borderRadius:'20px',width:'100%',maxWidth:'480px',maxHeight:'85vh',overflow:'hidden',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'1.25rem 1.5rem',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:'16px',fontWeight:800,color:'#eef0ff'}}>✅ Resume Analyzed!</div>
            <div style={{fontSize:'12px',color:'#8b93b0',marginTop:'2px'}}>{matchedJobs.length} matching jobs found</div>
          </div>
          <button onClick={onClose} style={{width:'30px',height:'30px',borderRadius:'50%',border:'1px solid rgba(255,255,255,0.1)',background:'none',color:'#8b93b0',cursor:'pointer',fontSize:'16px'}}>✕</button>
        </div>
        <div style={{overflow:'auto',padding:'1.25rem 1.5rem',display:'flex',flexDirection:'column',gap:'1rem'}}>
          <div>
            <div style={{fontSize:'10px',fontWeight:700,color:'#4a5168',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.5rem'}}>🎯 Skills Detected</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:'.3rem'}}>
              {(analysis.skills||[]).map(s=>(
                <span key={s} style={{fontSize:'11px',padding:'3px 10px',borderRadius:'20px',background:'rgba(0,229,160,0.1)',border:'1px solid rgba(0,229,160,0.25)',color:'#00e5a0',fontWeight:600}}>{s}</span>
              ))}
            </div>
          </div>
          <div>
            <div style={{fontSize:'10px',fontWeight:700,color:'#4a5168',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.5rem'}}>💼 Suitable Roles</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:'.3rem'}}>
              {(analysis.suitable_roles||[]).map(r=>(
                <span key={r} style={{fontSize:'11px',padding:'3px 10px',borderRadius:'20px',background:'rgba(124,111,247,0.1)',border:'1px solid rgba(124,111,247,0.25)',color:'#7c6ff7',fontWeight:600}}>{r}</span>
              ))}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.6rem'}}>
            <div style={{padding:'.75rem',background:'rgba(255,255,255,0.03)',borderRadius:'10px',border:'1px solid rgba(255,255,255,0.06)'}}>
              <div style={{fontSize:'10px',color:'#4a5168',marginBottom:'.3rem',fontWeight:600}}>EXPERIENCE</div>
              <div style={{fontSize:'22px',fontWeight:800,color:'#00e5a0'}}>{analysis.experience_years||'?'}</div>
              <div style={{fontSize:'11px',color:'#8b93b0'}}>years</div>
            </div>
            <div style={{padding:'.75rem',background:'rgba(255,255,255,0.03)',borderRadius:'10px',border:'1px solid rgba(255,255,255,0.06)'}}>
              <div style={{fontSize:'10px',color:'#4a5168',marginBottom:'.3rem',fontWeight:600}}>TOP STRENGTH</div>
              <div style={{fontSize:'12px',fontWeight:700,color:'#7c6ff7',lineHeight:1.3}}>{(analysis.strengths||[''])[0]}</div>
            </div>
          </div>
          <button onClick={onClose}
            style={{width:'100%',padding:'.75rem',background:'linear-gradient(135deg,#00e5a0,#00c484)',border:'none',borderRadius:'12px',color:'#060d0a',fontSize:'14px',fontWeight:700,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
            🔍 Show {matchedJobs.length} Matching Jobs
          </button>
        </div>
      </div>
    </div>
  )

  // UPLOAD
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(6,9,20,0.88)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)'}}>
      <div style={{background:'#0d1120',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',padding:'2rem',width:'400px'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
          <div>
            <div style={{fontSize:'17px',fontWeight:800,color:'#eef0ff'}}>🤖 Smart Job Match</div>
            <div style={{fontSize:'12px',color:'#8b93b0',marginTop:'3px'}}>Upload resume → AI finds your best jobs</div>
          </div>
          <button onClick={onClose} style={{width:'30px',height:'30px',borderRadius:'50%',border:'1px solid rgba(255,255,255,0.1)',background:'none',color:'#8b93b0',cursor:'pointer',fontSize:'16px'}}>✕</button>
        </div>
        <div
          onDragOver={e=>{e.preventDefault();setDragging(true)}}
          onDragLeave={()=>setDragging(false)}
          onDrop={handleDrop}
          onClick={()=>fileRef.current?.click()}
          style={{border:`2px dashed ${dragging?'#00e5a0':file?'rgba(0,229,160,0.5)':'rgba(255,255,255,0.12)'}`,borderRadius:'14px',padding:'2rem',textAlign:'center',cursor:'pointer',transition:'all .2s',background:dragging?'rgba(0,229,160,0.05)':file?'rgba(0,229,160,0.03)':'rgba(255,255,255,0.02)',marginBottom:'1rem'}}>
          <input ref={fileRef} type="file" accept=".pdf" style={{display:'none'}} onChange={e=>{setFile(e.target.files[0]);setError('')}}/>
          <div style={{fontSize:'2.5rem',marginBottom:'.75rem'}}>{file?'📄':'📤'}</div>
          {file ? (
            <>
              <div style={{fontSize:'14px',fontWeight:700,color:'#00e5a0',marginBottom:'.25rem'}}>{file.name}</div>
              <div style={{fontSize:'12px',color:'#8b93b0'}}>{(file.size/1024).toFixed(0)} KB · Click to change</div>
            </>
          ) : (
            <>
              <div style={{fontSize:'14px',fontWeight:600,color:'#eef0ff',marginBottom:'.35rem'}}>Drop your resume here</div>
              <div style={{fontSize:'12px',color:'#8b93b0'}}>or click to browse · PDF only</div>
            </>
          )}
        </div>
        {error && <div style={{fontSize:'12px',color:'#ff6b6b',marginBottom:'.75rem',padding:'.5rem .75rem',background:'rgba(255,77,77,0.08)',borderRadius:'8px',border:'1px solid rgba(255,77,77,0.2)'}}>{error}</div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.5rem',marginBottom:'1.25rem'}}>
          {[{icon:'🎯',label:'Skill Extraction'},{icon:'💼',label:'Role Matching'},{icon:'📊',label:'Match Score %'},{icon:'⚡',label:'Instant Results'}].map(f=>(
            <div key={f.label} style={{display:'flex',alignItems:'center',gap:'.5rem',padding:'.5rem .65rem',background:'rgba(255,255,255,0.03)',borderRadius:'9px',border:'1px solid rgba(255,255,255,0.06)'}}>
              <span>{f.icon}</span>
              <span style={{fontSize:'11.5px',color:'#8b93b0',fontWeight:500}}>{f.label}</span>
            </div>
          ))}
        </div>
        <button onClick={analyzeResume} disabled={!file}
          style={{width:'100%',padding:'.8rem',background:file?'linear-gradient(135deg,#00e5a0,#00c484)':'rgba(255,255,255,0.05)',border:'none',borderRadius:'12px',color:file?'#060d0a':'#4a5168',fontSize:'14px',fontWeight:700,cursor:file?'pointer':'not-allowed',fontFamily:'Inter,sans-serif',transition:'all .2s'}}>
          {file?'🚀 Analyze & Find Matching Jobs':'Upload a PDF to continue'}
        </button>
      </div>
    </div>
  )
}