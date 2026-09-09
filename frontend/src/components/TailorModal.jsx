import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function TailorModal({ job, user, onClose }) {
  const [step, setStep]           = useState('check')
  const [result, setResult]       = useState(null)
  const [error, setError]         = useState('')
  const [resumeInfo, setResumeInfo] = useState(null)
  const [uploadFile, setUploadFile] = useState(null)

  useEffect(() => {
    // Check localStorage for saved resume info
    const cached = localStorage.getItem('jobsq_resume_info')
    if (cached) {
      try { setResumeInfo(JSON.parse(cached)) } catch {}
    }
  }, [])

  const tailorResume = async () => {
    setStep('loading')
    try {
      // Get current user
      let currentUser = user
      if (!currentUser?.id) {
        const { data } = await supabase.auth.getUser()
        currentUser = data?.user
      }
      if (!currentUser?.id) {
        setError('Session expired. Please refresh and try again.')
        setStep('error')
        return
      }

      // Get resume text from backend (downloads from storage)
      let resumeText = ''
      if (resumeInfo && !uploadFile) {
        try {
          const textRes = await fetch(`${API}/builder/resume-text/${currentUser.id}`)
          if (textRes.ok) {
            const textData = await textRes.json()
            resumeText = textData.text || ''
          }
        } catch {}
      }

      let response
      if (uploadFile || resumeText) {
        // Build form data with file OR text
        const form = new FormData()
        if (uploadFile) {
          form.append('resume_file', uploadFile)
        } else {
          // Create a blob from resume text to send as file
          const blob = new Blob([resumeText], { type: 'text/plain' })
          form.append('resume_file', blob, 'resume.txt')
        }
        form.append('job_title', job.title || '')
        form.append('job_description', job.description || job.title || '')
        form.append('company', job.company || 'Company')
        form.append('user_id', currentUser.id)

        response = await fetch(`${API}/builder/tailor`, {
          method: 'POST',
          body: form
        })
      } else {
        setError('No resume found. Please upload your resume in Profile first, or upload one below.')
        setStep('error')
        return
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || `Server error ${response.status}`)
      }

      const keywords   = JSON.parse(response.headers.get('X-Keywords-Added') || '[]')
      const origScore  = parseInt(response.headers.get('X-Original-Score') || '0')
      const newScore   = parseInt(response.headers.get('X-Tailored-Score') || '0')
      const blob       = await response.blob()
      const url        = URL.createObjectURL(blob)
      const fileName   = `tailored_${(job.title || 'resume').replace(/\s+/g,'_')}.pdf`

      setResult({ keywords, origScore, newScore, downloadUrl: url, fileName })
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
                        <div style={{fontSize:'11px',color:'var(--text2,#8b93b0)'}}>{resumeInfo.file_name}</div>
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
                    <label style={{display:'inline-flex',alignItems:'center',gap:'.4rem',padding:'.4rem .75rem',background:'rgba(255,255,255,0.04)',border:'0.5px solid var(--border,rgba(255,255,255,0.08))',borderRadius:'8px',cursor:'pointer',fontSize:'12px',color:'var(--text2,#8b93b0)'}}>
                      <i className="ti ti-upload" style={{fontSize:'13px'}} aria-hidden="true"/>
                      {uploadFile ? uploadFile.name : 'Choose PDF'}
                      <input type="file" accept=".pdf" onChange={e=>setUploadFile(e.target.files[0])} style={{display:'none'}}/>
                    </label>
                  </div>
                )}

                {/* Option to replace with different file */}
                {resumeInfo && (
                  <div style={{marginBottom:'1rem'}}>
                    <label style={{display:'inline-flex',alignItems:'center',gap:'.4rem',fontSize:'11px',color:'var(--text3,#4a5168)',cursor:'pointer'}}>
                      <i className="ti ti-refresh" style={{fontSize:'12px'}} aria-hidden="true"/>
                      Use a different resume for this job
                      <input type="file" accept=".pdf" onChange={e=>setUploadFile(e.target.files[0])} style={{display:'none'}}/>
                    </label>
                    {uploadFile && <span style={{fontSize:'11px',color:'#00e5a0',marginLeft:'.5rem'}}>✓ {uploadFile.name}</span>}
                  </div>
                )}

                <div style={{fontSize:'12px',color:'var(--text2,#8b93b0)',marginBottom:'1rem',lineHeight:1.6}}>
                  AI will compare your resume with this job and add missing keywords, rewrite your summary, and align experience bullets — without changing your actual facts.
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

                {result.keywords.length > 0 && (
                  <div style={{marginBottom:'1rem'}}>
                    <div style={{fontSize:'11px',fontWeight:700,color:'var(--text3,#4a5168)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.4rem'}}>Keywords added</div>
                    <div>{result.keywords.map((k,i)=><span key={i} className="kw-chip">{k}</span>)}</div>
                  </div>
                )}

                <div style={{background:'rgba(255,255,255,0.03)',border:'0.5px solid var(--border,rgba(255,255,255,0.07))',borderRadius:'10px',padding:'.75rem',marginBottom:'1rem'}}>
                  <div style={{fontSize:'11px',fontWeight:700,color:'var(--text3,#4a5168)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.5rem'}}>What was updated</div>
                  {['Professional summary rewritten for this role','Skills section aligned with job requirements','Experience bullets highlight relevant achievements','Missing keywords added naturally'].map((item,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:'.4rem',padding:'.25rem 0',fontSize:'12px',color:'var(--text2,#8b93b0)'}}>
                      <i className="ti ti-circle-check" style={{fontSize:'13px',color:'#00e5a0'}} aria-hidden="true"/> {item}
                    </div>
                  ))}
                </div>

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