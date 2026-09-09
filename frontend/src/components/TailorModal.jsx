import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function TailorModal({ job, user, onClose }) {
  const [step, setStep]         = useState('check') // check | loading | result | error
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState('')
  const [resumeInfo, setResumeInfo] = useState(null)
  const [uploadFile, setUploadFile] = useState(null)

  // Check if user has saved resume on mount
  useEffect(() => {
    // Check localStorage first (instant)
    const cached = localStorage.getItem('jobsq_resume_info')
    if (cached) {
      try { setResumeInfo(JSON.parse(cached)) } catch {}
    }
    // Then verify with backend
    if (!user?.id) return
    const check = async () => {
      try {
        const res = await fetch(`${API}/builder/resume-info/${user.id}`)
        if (res.ok) {
          const data = await res.json()
          if (data && data.file_name) {
            setResumeInfo(data)
            localStorage.setItem('jobsq_resume_info', JSON.stringify(data))
          }
        }
      } catch {}
    }
    check()
  }, [user?.id])

  const tailorResume = async () => {
    if (!user?.id) {
      setError('Please log in to use this feature.')
      setStep('error')
      return
    }
    setStep('loading')
    try {
      let response
      if (resumeInfo) {
        // Use saved resume
        response = await fetch(`${API}/builder/tailor-saved`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user?.id,
            job_title: job.title,
            job_description: job.description || job.title,
            company: job.company
          })
        })
      } else if (uploadFile) {
        // Use uploaded file
        const form = new FormData()
        form.append('resume_file', uploadFile)
        form.append('job_title', job.title)
        form.append('job_description', job.description || job.title)
        form.append('company', job.company)
        form.append('user_id', user.id)
        response = await fetch(`${API}/builder/tailor`, { method: 'POST', body: form })
      } else {
        setError('No resume found. Please upload your resume in Profile first.')
        setStep('error')
        return
      }

      if (!response.ok) throw new Error('Tailoring failed')

      const keywords = JSON.parse(response.headers.get('X-Keywords-Added') || '[]')
      const origScore = parseInt(response.headers.get('X-Original-Score') || '0')
      const newScore  = parseInt(response.headers.get('X-Tailored-Score') || '0')
      const blob = await response.blob()
      const url  = URL.createObjectURL(blob)

      setResult({ keywords, origScore, newScore, downloadUrl: url, fileName: `tailored_${job.title.replace(/\s+/g,'_')}.pdf` })
      setStep('result')
    } catch(e) {
      setError(e.message || 'Something went wrong. Please try again.')
      setStep('error')
    }
  }

  const download = () => {
    const a = document.createElement('a')
    a.href = result.downloadUrl
    a.download = result.fileName
    a.click()
  }

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"/>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .tailor-overlay{position:fixed;inset:0;background:rgba(6,9,20,0.75);z-index:2000;display:flex;align-items:center;justify-content:center;padding:1rem;}
        .tailor-modal{background:var(--bg2,#0d1120);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:18px;width:100%;max-width:480px;overflow:hidden;animation:fadeIn .22s ease;}
        .tailor-hdr{padding:1rem 1.25rem;background:rgba(124,111,247,0.08);border-bottom:1px solid rgba(124,111,247,0.2);display:flex;align-items:center;gap:.65rem;}
        .tailor-body{padding:1.25rem;}
        .kw-chip{display:inline-flex;align-items:center;gap:3px;font-size:11px;padding:3px 9px;border-radius:20px;background:rgba(59,130,246,0.1);border:0.5px solid rgba(59,130,246,0.25);color:#3b82f6;margin:2px;}
      `}</style>

      <div className="tailor-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
        <div className="tailor-modal">

          {/* Header */}
          <div className="tailor-hdr">
            <div style={{width:'34px',height:'34px',borderRadius:'9px',background:'rgba(124,111,247,0.15)',border:'0.5px solid rgba(124,111,247,0.3)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <i className="ti ti-file-text" style={{fontSize:'17px',color:'#7c6ff7'}} aria-hidden="true"/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:'13px',fontWeight:700,color:'var(--text,#eef0ff)'}}>Tailor resume for this job</div>
              <div style={{fontSize:'11px',color:'var(--text2,#8b93b0)',marginTop:'1px'}}>{job.title} · {job.company}</div>
            </div>
            <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text3,#4a5168)',cursor:'pointer',display:'flex',padding:'.15rem'}}>
              <i className="ti ti-x" style={{fontSize:'17px'}} aria-hidden="true"/>
            </button>
          </div>

          <div className="tailor-body">

            {/* CHECK step */}
            {step === 'check' && (
              <div style={{animation:'fadeIn .2s ease'}}>
                {resumeInfo ? (
                  <div style={{background:'rgba(0,229,160,0.06)',border:'0.5px solid rgba(0,229,160,0.2)',borderRadius:'10px',padding:'.85rem',marginBottom:'1rem'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                      <i className="ti ti-circle-check" style={{fontSize:'18px',color:'#00e5a0'}} aria-hidden="true"/>
                      <div>
                        <div style={{fontSize:'13px',fontWeight:600,color:'var(--text,#eef0ff)'}}>Resume ready</div>
                        <div style={{fontSize:'11px',color:'var(--text2,#8b93b0)'}}>{resumeInfo.file_name} · {Math.round(resumeInfo.file_size/1024)}KB</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{background:'rgba(245,166,35,0.06)',border:'0.5px solid rgba(245,166,35,0.2)',borderRadius:'10px',padding:'.85rem',marginBottom:'1rem'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'.5rem',marginBottom:'.5rem'}}>
                      <i className="ti ti-alert-circle" style={{fontSize:'16px',color:'#f5a623'}} aria-hidden="true"/>
                      <div style={{fontSize:'13px',fontWeight:600,color:'var(--text,#eef0ff)'}}>No saved resume</div>
                    </div>
                    <div style={{fontSize:'11px',color:'var(--text2,#8b93b0)',marginBottom:'.65rem'}}>Upload your resume below or save it in Profile for future use.</div>
                    <label style={{display:'flex',alignItems:'center',gap:'.4rem',padding:'.4rem .75rem',background:'rgba(255,255,255,0.04)',border:'0.5px solid var(--border,rgba(255,255,255,0.08))',borderRadius:'8px',cursor:'pointer',fontSize:'12px',color:'var(--text2,#8b93b0)',width:'fit-content'}}>
                      <i className="ti ti-upload" style={{fontSize:'13px'}} aria-hidden="true"/>
                      {uploadFile ? uploadFile.name : 'Choose PDF'}
                      <input type="file" accept=".pdf" onChange={e=>setUploadFile(e.target.files[0])} style={{display:'none'}}/>
                    </label>
                  </div>
                )}

                <div style={{fontSize:'12px',color:'var(--text2,#8b93b0)',marginBottom:'1rem',lineHeight:1.6}}>
                  AI will compare your resume with this job description and generate a tailored version with matching keywords, rewritten summary, and aligned experience bullets.
                </div>

                <div style={{display:'flex',gap:'.5rem'}}>
                  <button onClick={tailorResume}
                    disabled={!resumeInfo && !uploadFile}
                    style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem',padding:'.6rem',background:(!resumeInfo&&!uploadFile)?'rgba(255,255,255,0.06)':'linear-gradient(135deg,#7c6ff7,#5a52d5)',border:'none',borderRadius:'9px',color:(!resumeInfo&&!uploadFile)?'var(--text3,#4a5168)':'white',fontSize:'13px',fontWeight:700,cursor:(!resumeInfo&&!uploadFile)?'not-allowed':'pointer',fontFamily:'Inter,sans-serif'}}>
                    <i className="ti ti-sparkles" style={{fontSize:'14px'}} aria-hidden="true"/>
                    Generate tailored resume
                  </button>
                  <button onClick={onClose} style={{padding:'.6rem 1rem',background:'none',border:'0.5px solid var(--border,rgba(255,255,255,0.08))',borderRadius:'9px',color:'var(--text2,#8b93b0)',fontSize:'13px',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* LOADING step */}
            {step === 'loading' && (
              <div style={{textAlign:'center',padding:'2rem 1rem',animation:'fadeIn .2s ease'}}>
                <i className="ti ti-loader" style={{fontSize:'36px',color:'#7c6ff7',display:'block',marginBottom:'1rem',animation:'spin .8s linear infinite'}} aria-hidden="true"/>
                <div style={{fontSize:'14px',fontWeight:600,color:'var(--text,#eef0ff)',marginBottom:'.4rem'}}>Tailoring your resume...</div>
                <div style={{fontSize:'12px',color:'var(--text2,#8b93b0)',lineHeight:1.6}}>
                  AI is comparing your resume with the job description,<br/>adding keywords and aligning your experience.
                </div>
              </div>
            )}

            {/* RESULT step */}
            {step === 'result' && result && (
              <div style={{animation:'fadeIn .2s ease'}}>
                {/* Score improvement */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.5rem',marginBottom:'1rem'}}>
                  <div style={{background:'rgba(255,255,255,0.04)',border:'0.5px solid var(--border,rgba(255,255,255,0.07))',borderRadius:'10px',padding:'.75rem',textAlign:'center'}}>
                    <div style={{fontSize:'11px',color:'var(--text3,#4a5168)',marginBottom:'3px'}}>Original ATS score</div>
                    <div style={{fontSize:'24px',fontWeight:900,color:'#f5a623'}}>{result.origScore}%</div>
                  </div>
                  <div style={{background:'rgba(0,229,160,0.06)',border:'0.5px solid rgba(0,229,160,0.2)',borderRadius:'10px',padding:'.75rem',textAlign:'center'}}>
                    <div style={{fontSize:'11px',color:'#00e5a0',marginBottom:'3px'}}>Tailored ATS score</div>
                    <div style={{fontSize:'24px',fontWeight:900,color:'#00e5a0'}}>{result.newScore}%</div>
                    <div style={{fontSize:'10px',color:'#00e5a0'}}>↑ +{result.newScore - result.origScore}%</div>
                  </div>
                </div>

                {/* Keywords added */}
                {result.keywords.length > 0 && (
                  <div style={{marginBottom:'1rem'}}>
                    <div style={{fontSize:'11px',fontWeight:700,color:'var(--text3,#4a5168)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.4rem'}}>Keywords added</div>
                    <div>{result.keywords.map((k,i)=><span key={i} className="kw-chip">{k}</span>)}</div>
                  </div>
                )}

                {/* What changed */}
                <div style={{background:'rgba(255,255,255,0.03)',border:'0.5px solid var(--border,rgba(255,255,255,0.07))',borderRadius:'10px',padding:'.75rem',marginBottom:'1rem'}}>
                  <div style={{fontSize:'11px',fontWeight:700,color:'var(--text3,#4a5168)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.5rem'}}>What was updated</div>
                  {['Professional summary rewritten for this role','Skills section aligned with job requirements','Experience bullets highlight relevant achievements','Missing keywords added naturally'].map((item,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:'.4rem',padding:'.25rem 0',fontSize:'12px',color:'var(--text2,#8b93b0)'}}>
                      <i className="ti ti-circle-check" style={{fontSize:'13px',color:'#00e5a0'}} aria-hidden="true"/>
                      {item}
                    </div>
                  ))}
                </div>

                {/* Download */}
                <button onClick={download} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem',padding:'.65rem',background:'linear-gradient(135deg,#00e5a0,#00c484)',border:'none',borderRadius:'10px',color:'#060d0a',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'Inter,sans-serif',marginBottom:'.5rem'}}>
                  <i className="ti ti-download" style={{fontSize:'15px'}} aria-hidden="true"/>
                  Download tailored resume PDF
                </button>
                <div style={{fontSize:'11px',color:'var(--text3,#4a5168)',textAlign:'center'}}>
                  Your original resume is unchanged · This is a new tailored version
                </div>
              </div>
            )}

            {/* ERROR step */}
            {step === 'error' && (
              <div style={{textAlign:'center',padding:'1.5rem 1rem',animation:'fadeIn .2s ease'}}>
                <i className="ti ti-alert-circle" style={{fontSize:'32px',color:'#E24B4A',display:'block',marginBottom:'.75rem'}} aria-hidden="true"/>
                <div style={{fontSize:'13px',fontWeight:600,color:'var(--text,#eef0ff)',marginBottom:'.4rem'}}>Tailoring failed</div>
                <div style={{fontSize:'12px',color:'var(--text2,#8b93b0)',marginBottom:'1rem'}}>{error}</div>
                <button onClick={()=>setStep('check')} style={{padding:'.45rem 1.25rem',background:'rgba(255,255,255,0.06)',border:'0.5px solid var(--border,rgba(255,255,255,0.08))',borderRadius:'8px',color:'var(--text2,#8b93b0)',fontSize:'13px',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
                  Try again
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  )
}