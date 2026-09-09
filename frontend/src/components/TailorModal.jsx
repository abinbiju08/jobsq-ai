import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function TailorModal({ job, user, onClose }) {
  const [step, setStep]           = useState('check')
  const [result, setResult]       = useState(null)
  const [error, setError]         = useState('')
  const [resumeInfo, setResumeInfo] = useState(null)
  const [uploadFile, setUploadFile] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)

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

      if (!uploadFile) {
        setError('Please upload your resume PDF using the upload button above.')
        setStep('error')
        return
      }

      // Send file directly to /tailor endpoint
      const form = new FormData()
      form.append('resume_file', uploadFile)
      form.append('job_title', job.title || '')
      form.append('job_description', job.description || job.title || '')
      form.append('company', job.company || 'Company')
      form.append('user_id', currentUser.id)

      const response = await fetch(`${API}/builder/tailor`, {
        method: 'POST',
        body: form
      })

      if (!response.ok) {
        let errMsg = `Server error ${response.status}`
        try {
          const errData = await response.json()
          errMsg = errData.detail || errMsg
        } catch {}
        throw new Error(errMsg)
      }

      let keywords = []
      try {
        const kwRaw = response.headers.get('x-keywords-added') || response.headers.get('X-Keywords-Added') || '[]'
        keywords = JSON.parse(kwRaw)
      } catch { keywords = [] }
      const origScore = parseInt(response.headers.get('x-original-score') || response.headers.get('X-Original-Score') || '0')
      const newScore  = parseInt(response.headers.get('x-tailored-score') || response.headers.get('X-Tailored-Score') || '0')
      const blob       = await response.blob()
      const url        = URL.createObjectURL(blob)
      const fileName   = `tailored_${(job.title || 'resume').replace(/\s+/g,'_')}.pdf`

      setResult({ keywords, origScore, newScore, downloadUrl: url, fileName, pdfBlob: blob })
      setPreviewUrl(url)
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

  const downloadDOC = async () => {
    if (!uploadFile) return
    try {
      const form = new FormData()
      form.append('resume_file', uploadFile)
      form.append('job_title', job.title || '')
      form.append('job_description', job.description || job.title || '')
      form.append('company', job.company || 'Company')
      form.append('user_id', user?.id || 'user')

      const response = await fetch(`${API}/builder/tailor-docx`, {
        method: 'POST',
        body: form
      })
      if (!response.ok) throw new Error('DOCX generation failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result.fileName.replace('.pdf', '.docx')
      a.click()
    } catch(e) {
      alert('DOC download failed: ' + e.message)
    }
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
                {/* Upload zone */}
                <label style={{display:'block',border:`1.5px dashed ${uploadFile?'rgba(0,229,160,0.4)':'rgba(124,111,247,0.3)'}`,borderRadius:'12px',padding:'1.25rem',textAlign:'center',background:uploadFile?'rgba(0,229,160,0.04)':'rgba(124,111,247,0.04)',marginBottom:'1rem',cursor:'pointer'}}>
                  <i className={`ti ${uploadFile?'ti-circle-check':'ti-cloud-upload'}`} style={{fontSize:'28px',color:uploadFile?'#00e5a0':'#7c6ff7',display:'block',marginBottom:'.5rem'}} aria-hidden="true"/>
                  {uploadFile ? (
                    <>
                      <div style={{fontSize:'13px',fontWeight:600,color:'#00e5a0',marginBottom:'2px'}}>{uploadFile.name}</div>
                      <div style={{fontSize:'11px',color:'var(--text2,#8b93b0)'}}>✓ Ready to tailor — click to change</div>
                    </>
                  ) : (
                    <>
                      <div style={{fontSize:'13px',fontWeight:600,color:'var(--text,#eef0ff)',marginBottom:'2px'}}>Upload your resume PDF</div>
                      <div style={{fontSize:'11px',color:'var(--text3,#4a5168)'}}>Click to choose file · PDF only</div>
                    </>
                  )}
                  <input type="file" accept=".pdf" onChange={e=>setUploadFile(e.target.files[0])} style={{display:'none'}}/>
                </label>

                <div style={{fontSize:'12px',color:'var(--text2,#8b93b0)',marginBottom:'1rem',lineHeight:1.6}}>
                  AI will compare your resume with this job and add missing keywords, rewrite your summary, and align experience bullets — without changing your actual facts.
                </div>

                <div style={{display:'flex',gap:'.5rem'}}>
                  <button onClick={tailorResume}
                    disabled={!uploadFile}
                    style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem',padding:'.6rem',background:!uploadFile?'rgba(255,255,255,0.06)':'linear-gradient(135deg,#7c6ff7,#5a52d5)',border:'none',borderRadius:'9px',color:!uploadFile?'var(--text3,#4a5168)':'white',fontSize:'13px',fontWeight:700,cursor:!uploadFile?'not-allowed':'pointer',fontFamily:'Inter,sans-serif'}}>
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

                {/* Preview */}
                <button onClick={()=>setShowPreview(true)}
                  style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem',padding:'.55rem',background:'rgba(255,255,255,0.06)',border:'0.5px solid var(--border,rgba(255,255,255,0.1))',borderRadius:'10px',color:'var(--text,#eef0ff)',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif',marginBottom:'.5rem'}}>
                  <i className="ti ti-eye" style={{fontSize:'15px'}} aria-hidden="true"/>
                  Preview tailored resume
                </button>

                {/* Download options */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.5rem',marginBottom:'.5rem'}}>
                  <button onClick={downloadPDF}
                    style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem',padding:'.55rem',background:'linear-gradient(135deg,#00e5a0,#00c484)',border:'none',borderRadius:'10px',color:'#060d0a',fontSize:'12px',fontWeight:700,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
                    <i className="ti ti-file-type-pdf" style={{fontSize:'14px'}} aria-hidden="true"/>
                    Download PDF
                  </button>
                  <button onClick={downloadDOC}
                    style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem',padding:'.55rem',background:'rgba(59,130,246,0.12)',border:'0.5px solid rgba(59,130,246,0.3)',borderRadius:'10px',color:'#3b82f6',fontSize:'12px',fontWeight:700,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
                    <i className="ti ti-file-type-doc" style={{fontSize:'14px'}} aria-hidden="true"/>
                    Download DOC
                  </button>
                </div>
                <div style={{fontSize:'11px',color:'var(--text3,#4a5168)',textAlign:'center'}}>
                  Your original resume is unchanged · This is a new tailored version
                </div>

                {/* PDF Preview Modal */}
                {showPreview && previewUrl && (
                  <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:3000,display:'flex',flexDirection:'column'}}
                    onClick={e=>e.target===e.currentTarget&&setShowPreview(false)}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'.75rem 1rem',background:'#1a1a2e',borderBottom:'1px solid rgba(255,255,255,0.1)'}}>
                      <span style={{color:'#eef0ff',fontSize:'13px',fontWeight:600}}>Preview — {job.title} tailored resume</span>
                      <div style={{display:'flex',gap:'.5rem'}}>
                        <button onClick={downloadPDF}
                          style={{display:'inline-flex',alignItems:'center',gap:'.3rem',padding:'.35rem .75rem',background:'#00e5a0',border:'none',borderRadius:'7px',color:'#060d0a',fontSize:'12px',fontWeight:700,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
                          <i className="ti ti-download" style={{fontSize:'13px'}} aria-hidden="true"/> Download PDF
                        </button>
                        <button onClick={()=>setShowPreview(false)}
                          style={{background:'rgba(255,255,255,0.08)',border:'none',borderRadius:'7px',padding:'.35rem .6rem',cursor:'pointer',color:'#eef0ff',display:'flex',alignItems:'center'}}>
                          <i className="ti ti-x" style={{fontSize:'16px'}} aria-hidden="true"/>
                        </button>
                      </div>
                    </div>
                    <iframe src={previewUrl} style={{flex:1,border:'none',width:'100%'}} title="Resume preview"/>
                  </div>
                )}
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