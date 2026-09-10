import { useState, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function TailorModal({ job, user, onClose }) {
  const [step, setStep]         = useState('check')
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState('')
  const [resumeInfo, setResumeInfo] = useState(null)
  const [uploadFile, setUploadFile] = useState(null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`${API}/builder/resume-info/${user.id}`)
        const data = await res.json()
        setResumeInfo(data)
      } catch {}
    }
    check()
  }, [user.id])

  const tailorResume = async () => {
    setStep('loading')
    try {
      let response
      if (resumeInfo) {
        // Fetch resume text first
        let resumeText = ''
        try {
          const rtRes = await fetch(`${API}/builder/resume-text/${user.id}`)
          const rtData = await rtRes.json()
          resumeText = rtData.text || ''
        } catch {}

        const form = new FormData()
        if (uploadFile) {
          form.append('resume_file', uploadFile)
        } else if (resumeText) {
          // Convert text to blob so /tailor endpoint can read it
          const blob = new Blob([resumeText], { type: 'application/pdf' })
          form.append('resume_file', blob, 'resume.pdf')
        }
        form.append('job_title', job.title)
        form.append('job_description', job.description || job.title)
        form.append('company', job.company || 'Company')
        form.append('user_id', user.id)

        // Use tailor-saved (JSON) which reads from storage directly
        response = await fetch(`${API}/builder/tailor-saved`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            job_title: job.title,
            job_description: job.description || job.title,
            company: job.company || 'Company',
            resume_text: resumeText
          })
        })
      } else if (uploadFile) {
        const form = new FormData()
        form.append('resume_file', uploadFile)
        form.append('job_title', job.title)
        form.append('job_description', job.description || job.title)
        form.append('company', job.company || 'Company')
        form.append('user_id', user.id)
        response = await fetch(`${API}/builder/tailor`, { method: 'POST', body: form })
      } else {
        setError('No resume found. Upload your resume below or save it in Profile.')
        setStep('error')
        return
      }

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.detail || 'Tailoring failed')
      }

      let keywords = []
      let interviewKws = []
      try {
        const kwRaw = response.headers.get('x-keywords-added') || response.headers.get('X-Keywords-Added') || '[]'
        keywords = JSON.parse(kwRaw)
      } catch { keywords = [] }
      try {
        const ikRaw = response.headers.get('x-interview-keywords') || response.headers.get('X-Interview-Keywords') || '[]'
        interviewKws = JSON.parse(ikRaw)
      } catch { interviewKws = [] }

      const origScore = parseInt(response.headers.get('x-original-score') || response.headers.get('X-Original-Score') || '0')
      const newScore  = parseInt(response.headers.get('x-tailored-score') || response.headers.get('X-Tailored-Score') || '0')

      const blob = await response.blob()
      const url  = URL.createObjectURL(blob)
      const fileName = `tailored_${job.title.replace(/\s+/g,'_')}.pdf`

      setResult({ keywords, interviewKws, origScore, newScore, downloadUrl: url, fileName })
      setStep('result')
    } catch(e) {
      setError(e.message || 'Something went wrong. Please try again.')
      setStep('error')
    }
  }

  const downloadPDF = () => {
    const a = document.createElement('a')
    a.href = result.downloadUrl
    a.download = result.fileName
    a.click()
  }

  const downloadDOCX = async () => {
    try {
      setResult(r => ({ ...r, docxLoading: true }))
      // Use tailor-saved with output_format=docx — same AI call, no re-upload needed
      let resumeText = ''
      try {
        const rtRes = await fetch(`${API}/builder/resume-text/${user.id}`)
        const rtData = await rtRes.json()
        resumeText = rtData.text || ''
      } catch {}

      const res = await fetch(`${API}/builder/tailor-saved`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          job_title: job.title,
          job_description: job.description || job.title,
          company: job.company || 'Company',
          resume_text: resumeText,
          output_format: 'docx'
        })
      })
      if (!res.ok) throw new Error('DOCX generation failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tailored_${job.title.replace(/\s+/g,'_')}.docx`
      a.click()
    } catch(e) {
      alert('DOCX download failed: ' + e.message)
    } finally {
      setResult(r => ({ ...r, docxLoading: false }))
    }
  }

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"/>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .tailor-overlay{position:fixed;inset:0;background:rgba(6,9,20,0.78);z-index:2000;display:flex;align-items:center;justify-content:center;padding:1rem;overflow-y:auto;}
        .tailor-modal{background:var(--bg2,#0d1120);border:1px solid var(--border,rgba(255,255,255,0.1));border-radius:18px;width:100%;max-width:500px;overflow:hidden;animation:fadeIn .22s ease;margin:auto;}
        .tailor-hdr{padding:1rem 1.25rem;background:rgba(124,111,247,0.08);border-bottom:1px solid rgba(124,111,247,0.2);display:flex;align-items:center;gap:.65rem;}
        .tailor-body{padding:1.25rem;}
        .kw-chip{display:inline-flex;align-items:center;gap:3px;font-size:11px;padding:3px 9px;border-radius:20px;margin:2px;font-family:Inter,sans-serif;}
        .kw-added{background:rgba(124,111,247,0.1);border:0.5px solid rgba(124,111,247,0.3);color:#a89ef7;}
        .kw-interview{background:rgba(245,166,35,0.1);border:0.5px solid rgba(245,166,35,0.3);color:#f5a623;}
        .kw-section-label{font-size:10px;font-weight:700;color:var(--text3,#4a5168);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.4rem;margin-top:.65rem;display:block;}
      `}</style>

      <div className="tailor-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="tailor-modal">

          {/* Header */}
          <div className="tailor-hdr">
            <div style={{width:'34px',height:'34px',borderRadius:'9px',background:'rgba(124,111,247,0.15)',border:'0.5px solid rgba(124,111,247,0.3)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <i className="ti ti-file-text" style={{fontSize:'17px',color:'#7c6ff7'}}/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:'13px',fontWeight:700,color:'var(--text,#eef0ff)'}}>Tailor resume for this job</div>
              <div style={{fontSize:'11px',color:'var(--text2,#8b93b0)',marginTop:'1px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{job.title} · {job.company}</div>
            </div>
            <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text3,#4a5168)',cursor:'pointer',padding:'.15rem'}}>
              <i className="ti ti-x" style={{fontSize:'17px'}}/>
            </button>
          </div>

          <div className="tailor-body">

            {/* CHECK step */}
            {step === 'check' && (
              <div style={{animation:'fadeIn .2s ease'}}>
                {resumeInfo ? (
                  <div style={{background:'rgba(0,229,160,0.06)',border:'0.5px solid rgba(0,229,160,0.2)',borderRadius:'10px',padding:'.85rem',marginBottom:'1rem'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                      <i className="ti ti-circle-check" style={{fontSize:'18px',color:'#00e5a0'}}/>
                      <div>
                        <div style={{fontSize:'13px',fontWeight:600,color:'var(--text,#eef0ff)'}}>Resume ready</div>
                        <div style={{fontSize:'11px',color:'var(--text2,#8b93b0)'}}>{resumeInfo.file_name} · {resumeInfo.file_size ? Math.round(resumeInfo.file_size/1024)+'KB' : ''}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{background:'rgba(245,166,35,0.06)',border:'0.5px solid rgba(245,166,35,0.2)',borderRadius:'10px',padding:'.85rem',marginBottom:'1rem'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'.5rem',marginBottom:'.5rem'}}>
                      <i className="ti ti-alert-circle" style={{fontSize:'16px',color:'#f5a623'}}/>
                      <div style={{fontSize:'13px',fontWeight:600,color:'var(--text,#eef0ff)'}}>No saved resume</div>
                    </div>
                    <div style={{fontSize:'11px',color:'var(--text2,#8b93b0)',marginBottom:'.65rem'}}>Upload your resume below or save it in Profile for future use.</div>
                    <label style={{display:'flex',alignItems:'center',gap:'.4rem',padding:'.4rem .75rem',background:'rgba(255,255,255,0.04)',border:'0.5px solid var(--border,rgba(255,255,255,0.08))',borderRadius:'8px',cursor:'pointer',fontSize:'12px',color:'var(--text2,#8b93b0)',width:'fit-content'}}>
                      <i className="ti ti-upload" style={{fontSize:'13px'}}/>
                      {uploadFile ? uploadFile.name : 'Choose PDF'}
                      <input type="file" accept=".pdf" onChange={e => setUploadFile(e.target.files[0])} style={{display:'none'}}/>
                    </label>
                  </div>
                )}

                <div style={{fontSize:'12px',color:'var(--text2,#8b93b0)',marginBottom:'1rem',lineHeight:1.6}}>
                  AI will compare your resume with this job description, rewrite the summary, align skills, and extract the key interview keywords for this role.
                </div>

                <div style={{display:'flex',gap:'.5rem'}}>
                  <button onClick={tailorResume}
                    disabled={!resumeInfo && !uploadFile}
                    style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem',padding:'.6rem',background:(!resumeInfo&&!uploadFile)?'rgba(255,255,255,0.06)':'linear-gradient(135deg,#7c6ff7,#5a52d5)',border:'none',borderRadius:'9px',color:(!resumeInfo&&!uploadFile)?'var(--text3,#4a5168)':'white',fontSize:'13px',fontWeight:700,cursor:(!resumeInfo&&!uploadFile)?'not-allowed':'pointer',fontFamily:'Inter,sans-serif'}}>
                    <i className="ti ti-sparkles" style={{fontSize:'14px'}}/>
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
                <i className="ti ti-loader" style={{fontSize:'36px',color:'#7c6ff7',display:'block',marginBottom:'1rem',animation:'spin .8s linear infinite'}}/>
                <div style={{fontSize:'14px',fontWeight:600,color:'var(--text,#eef0ff)',marginBottom:'.4rem'}}>Tailoring your resume...</div>
                <div style={{fontSize:'12px',color:'var(--text2,#8b93b0)',lineHeight:1.6}}>
                  Comparing your resume with the job description,<br/>adding keywords and extracting interview tips.
                </div>
              </div>
            )}

            {/* RESULT step */}
            {step === 'result' && result && (
              <div style={{animation:'fadeIn .2s ease'}}>

                {/* ATS Score row */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.5rem',marginBottom:'1rem'}}>
                  <div style={{background:'rgba(255,255,255,0.04)',border:'0.5px solid var(--border,rgba(255,255,255,0.07))',borderRadius:'10px',padding:'.75rem',textAlign:'center'}}>
                    <div style={{fontSize:'11px',color:'var(--text3,#4a5168)',marginBottom:'3px'}}>Original ATS score</div>
                    <div style={{fontSize:'24px',fontWeight:900,color:'#f5a623'}}>{result.origScore}%</div>
                  </div>
                  <div style={{background:'rgba(0,229,160,0.06)',border:'0.5px solid rgba(0,229,160,0.2)',borderRadius:'10px',padding:'.75rem',textAlign:'center'}}>
                    <div style={{fontSize:'11px',color:'#00e5a0',marginBottom:'3px'}}>Tailored ATS score</div>
                    <div style={{fontSize:'24px',fontWeight:900,color:'#00e5a0'}}>{result.newScore}%</div>
                    <div style={{fontSize:'10px',color:'#00e5a0'}}>↑ +{Math.max(0, result.newScore - result.origScore)}%</div>
                  </div>
                </div>

                {/* Keywords section */}
                <div style={{background:'rgba(255,255,255,0.03)',border:'0.5px solid var(--border,rgba(255,255,255,0.07))',borderRadius:'12px',padding:'1rem',marginBottom:'1rem'}}>

                  {/* Interview keywords */}
                  {result.interviewKws && result.interviewKws.length > 0 && (
                    <>
                      <div style={{display:'flex',alignItems:'center',gap:'.4rem',marginBottom:'.5rem'}}>
                        <i className="ti ti-bulb" style={{fontSize:'14px',color:'#f5a623'}}/>
                        <span style={{fontSize:'12px',fontWeight:700,color:'var(--text,#eef0ff)'}}>Key interview keywords</span>
                        <span style={{fontSize:'10px',color:'var(--text3,#4a5168)',marginLeft:'auto'}}>Mention these in your interview</span>
                      </div>
                      <div style={{marginBottom:'.75rem'}}>
                        {result.interviewKws.map((k,i) => (
                          <span key={i} className="kw-chip kw-interview">
                            <i className="ti ti-star" style={{fontSize:'9px'}}/> {k}
                          </span>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Keywords added to resume */}
                  {result.keywords && result.keywords.length > 0 && (
                    <>
                      <div style={{display:'flex',alignItems:'center',gap:'.4rem',marginBottom:'.5rem',paddingTop: result.interviewKws?.length > 0 ? '.75rem' : '0',borderTop: result.interviewKws?.length > 0 ? '0.5px solid var(--border,rgba(255,255,255,0.06))' : 'none'}}>
                        <i className="ti ti-plus" style={{fontSize:'13px',color:'#7c6ff7'}}/>
                        <span style={{fontSize:'12px',fontWeight:700,color:'var(--text,#eef0ff)'}}>Added to your resume</span>
                        <span style={{fontSize:'10px',color:'var(--text3,#4a5168)',marginLeft:'auto'}}>New keywords injected</span>
                      </div>
                      <div>
                        {result.keywords.map((k,i) => (
                          <span key={i} className="kw-chip kw-added">
                            <i className="ti ti-check" style={{fontSize:'9px'}}/> {k}
                          </span>
                        ))}
                      </div>
                    </>
                  )}

                  {(!result.interviewKws?.length && !result.keywords?.length) && (
                    <div style={{fontSize:'12px',color:'var(--text3,#4a5168)',textAlign:'center',padding:'.5rem'}}>
                      Resume already well-matched with this job.
                    </div>
                  )}
                </div>

                {/* What changed */}
                <div style={{background:'rgba(255,255,255,0.02)',border:'0.5px solid var(--border,rgba(255,255,255,0.06))',borderRadius:'10px',padding:'.75rem',marginBottom:'1rem'}}>
                  <div style={{fontSize:'11px',fontWeight:700,color:'var(--text3,#4a5168)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.5rem'}}>What was updated</div>
                  {['Professional summary rewritten for this role','Skills section aligned with job requirements','Experience bullets highlight relevant achievements','Missing keywords added naturally'].map((item,i) => (
                    <div key={i} style={{display:'flex',alignItems:'center',gap:'.4rem',padding:'.2rem 0',fontSize:'12px',color:'var(--text2,#8b93b0)'}}>
                      <i className="ti ti-circle-check" style={{fontSize:'13px',color:'#00e5a0'}}/> {item}
                    </div>
                  ))}
                </div>

                {/* Preview toggle */}
                <button onClick={() => setShowPreview(p => !p)} style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem',padding:'.55rem',background:'rgba(124,111,247,0.1)',border:'0.5px solid rgba(124,111,247,0.3)',borderRadius:'10px',color:'#a89ef7',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif',marginBottom:'.5rem'}}>
                  <i className={`ti ${showPreview ? 'ti-eye-off' : 'ti-eye'}`} style={{fontSize:'14px'}}/>
                  {showPreview ? 'Hide preview' : 'Preview resume'}
                </button>

                {/* PDF iframe preview */}
                {showPreview && (
                  <div style={{marginBottom:'.75rem',borderRadius:'10px',overflow:'hidden',border:'0.5px solid rgba(124,111,247,0.2)',background:'#fff'}}>
                    <iframe
                      src={result.downloadUrl}
                      title="Tailored Resume Preview"
                      style={{width:'100%',height:'420px',border:'none',display:'block'}}
                    />
                  </div>
                )}

                {/* Download buttons */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.5rem',marginBottom:'.5rem'}}>
                  <button onClick={downloadPDF} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem',padding:'.6rem',background:'linear-gradient(135deg,#00e5a0,#00c484)',border:'none',borderRadius:'10px',color:'#060d0a',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
                    <i className="ti ti-file-type-pdf" style={{fontSize:'15px'}}/>
                    Download PDF
                  </button>
                  <button onClick={downloadDOCX} disabled={result.docxLoading} style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem',padding:'.6rem',background:'linear-gradient(135deg,#2563eb,#1d4ed8)',border:'none',borderRadius:'10px',color:'white',fontSize:'13px',fontWeight:700,cursor:result.docxLoading?'wait':'pointer',fontFamily:'Inter,sans-serif',opacity:result.docxLoading?0.7:1}}>
                    {result.docxLoading
                      ? <><i className="ti ti-loader" style={{fontSize:'14px',animation:'spin .8s linear infinite'}}/> Generating...</>
                      : <><i className="ti ti-file-type-doc" style={{fontSize:'15px'}}/> Download Word</>
                    }
                  </button>
                </div>
                <div style={{fontSize:'11px',color:'var(--text3,#4a5168)',textAlign:'center'}}>
                  Your original resume is unchanged · This is a tailored version
                </div>
              </div>
            )}

            {/* ERROR step */}
            {step === 'error' && (
              <div style={{textAlign:'center',padding:'1.5rem 1rem',animation:'fadeIn .2s ease'}}>
                <i className="ti ti-alert-circle" style={{fontSize:'32px',color:'#E24B4A',display:'block',marginBottom:'.75rem'}}/>
                <div style={{fontSize:'13px',fontWeight:600,color:'var(--text,#eef0ff)',marginBottom:'.4rem'}}>Tailoring failed</div>
                <div style={{fontSize:'12px',color:'var(--text2,#8b93b0)',marginBottom:'1rem'}}>{error}</div>
                {!resumeInfo && (
                  <label style={{display:'inline-flex',alignItems:'center',gap:'.4rem',padding:'.45rem 1rem',background:'rgba(255,255,255,0.05)',border:'0.5px solid var(--border)',borderRadius:'8px',cursor:'pointer',fontSize:'12px',color:'var(--text2,#8b93b0)',marginBottom:'.5rem',fontFamily:'Inter,sans-serif'}}>
                    <i className="ti ti-upload" style={{fontSize:'13px'}}/>
                    Upload PDF to try again
                    <input type="file" accept=".pdf" onChange={e => { setUploadFile(e.target.files[0]); setStep('check') }} style={{display:'none'}}/>
                  </label>
                )}
                <br/>
                <button onClick={() => setStep('check')} style={{padding:'.45rem 1.25rem',background:'rgba(255,255,255,0.06)',border:'0.5px solid var(--border,rgba(255,255,255,0.08))',borderRadius:'8px',color:'var(--text2,#8b93b0)',fontSize:'13px',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
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