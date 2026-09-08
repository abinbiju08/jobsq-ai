import { useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

export default function Resume() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [loadingText, setLoadingText] = useState('')

  const handleUpload = async () => {
    if (!file) return
    setLoading(true); setResult(null)
    const steps = [
      { text: 'Reading your resume...', delay: 0 },
      { text: 'AI analyzing skills...', delay: 2000 },
      { text: 'Calculating ATS score...', delay: 4000 },
      { text: 'Finding matching jobs...', delay: 6000 },
    ]
    steps.forEach(s => setTimeout(() => setLoadingText(s.text), s.delay))
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await axios.post(`${API}/resume/analyze`, formData)
      setResult(res.data)
    } catch(e) { console.error(e) }
    setLoading(false); setLoadingText('')
  }

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"/>
      <style>{`
        .resume-page{background:var(--bg);min-height:calc(100vh - 52px);overflow-y:auto;}
        .resume-wrap{max-width:800px;margin:0 auto;padding:1.5rem 1rem;}
        .resume-h1{font-size:22px;font-weight:800;margin-bottom:.35rem;color:var(--text);}
        .resume-sub{font-size:13px;color:var(--text2);margin-bottom:1.5rem;}
        .resume-upload-card{background:var(--bg3);border:1px solid var(--border);border-radius:16px;padding:1.5rem;margin-bottom:1.25rem;}
        .resume-dropzone{border:2px dashed var(--border,rgba(255,255,255,0.1));border-radius:12px;padding:2rem;text-align:center;cursor:pointer;margin-bottom:1rem;transition:border-color .2s;}
        .resume-dropzone:hover{border-color:rgba(0,229,160,0.4);}
        .resume-dropzone-icon{width:52px;height:52px;border-radius:14px;background:rgba(0,229,160,0.08);border:1px solid rgba(0,229,160,0.2);display:flex;align-items:center;justify-content:center;margin:0 auto .75rem;}
        .resume-dropzone-icon i{font-size:24px;color:#00e5a0;}
        .resume-dropzone-title{font-weight:600;margin-bottom:.25rem;color:var(--text);}
        .resume-dropzone-sub{font-size:12px;color:var(--text2);}
        .resume-score-hero{background:var(--bg3);border:1px solid var(--border);border-radius:16px;padding:1.4rem;display:flex;gap:1.5rem;align-items:center;margin-bottom:1rem;}
        .resume-score-text{font-size:13px;color:var(--text2);}
        .resume-score-title{font-size:18px;font-weight:700;margin-bottom:.35rem;color:var(--text);}
        .resume-grid{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:1rem;}
        .resume-card{background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:1rem;}
        .resume-card-title{display:flex;align-items:center;gap:.4rem;font-size:11px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.65rem;}
        .resume-card-title i{font-size:14px;}
        .resume-bar-bg{height:5px;background:var(--border,rgba(255,255,255,0.06));border-radius:3px;overflow:hidden;}
        .resume-section-label{font-size:12px;color:var(--text);}
        .resume-match-card{background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:1rem;margin-bottom:1rem;}
        .resume-match-title{display:flex;align-items:center;gap:.5rem;font-size:14px;font-weight:600;margin-bottom:.75rem;color:var(--text);}
        .resume-match-title i{font-size:16px;color:#00e5a0;}
        .resume-match-row{display:flex;align-items:center;gap:.75rem;padding:.55rem 0;border-bottom:1px solid var(--border,rgba(255,255,255,0.06));}
        .resume-job-title{font-size:13px;font-weight:600;color:var(--text);}
        .resume-job-sub{font-size:11px;color:var(--text2);}
        @keyframes spin{to{transform:rotate(360deg)}}
        @media(max-width:600px){.resume-grid{grid-template-columns:1fr;}}
      `}</style>

      <div className="resume-page">
        <div className="resume-wrap">
          <div style={{display:'flex',alignItems:'center',gap:'.75rem',marginBottom:'.35rem'}}>
            <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'rgba(0,229,160,0.1)',border:'1px solid rgba(0,229,160,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <i className="ti ti-file-check" style={{fontSize:'18px',color:'#00e5a0'}} aria-hidden="true"/>
            </div>
            <h1 className="resume-h1" style={{margin:0}}>Resume score & AI analysis</h1>
          </div>
          <p className="resume-sub">Upload your resume to get ATS score, keyword analysis and job matches</p>

          <div className="resume-upload-card">
            <div className="resume-dropzone" onClick={()=>document.getElementById('fileInput').click()}>
              <div className="resume-dropzone-icon">
                {file
                  ? <i className="ti ti-circle-check" aria-hidden="true"/>
                  : <i className="ti ti-upload" aria-hidden="true"/>
                }
              </div>
              <div className="resume-dropzone-title">
                {file ? file.name : 'Drop your resume here or click to browse'}
              </div>
              <div className="resume-dropzone-sub">PDF or DOCX · max 5MB</div>
              <input id="fileInput" type="file" accept=".pdf,.doc,.docx" style={{display:'none'}} onChange={e=>setFile(e.target.files[0])}/>
            </div>

            <div style={{display:'flex',flexWrap:'wrap',gap:'.4rem',marginBottom:'1rem'}}>
              {[
                {icon:'ti-key',label:'Keyword match'},
                {icon:'ti-chart-bar',label:'ATS score'},
                {icon:'ti-target',label:'Job fit %'},
                {icon:'ti-zoom-code',label:'Skill gap'},
              ].map(f=>(
                <span key={f.label} style={{display:'inline-flex',alignItems:'center',gap:'.3rem',fontSize:'11px',padding:'3px 10px',borderRadius:'20px',background:'rgba(124,111,247,0.1)',color:'#7c6ff7',border:'1px solid rgba(124,111,247,0.2)'}}>
                  <i className={`ti ${f.icon}`} style={{fontSize:'12px'}} aria-hidden="true"/>
                  {f.label}
                </span>
              ))}
            </div>

            <button
              style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem',padding:'.78rem',background:'linear-gradient(135deg,#00e5a0,#00c484)',color:'var(--bg)',border:'none',borderRadius:'10px',fontSize:'14px',fontWeight:700,cursor:'pointer',opacity:(!file||loading)?0.5:1,fontFamily:'Inter,sans-serif'}}
              onClick={handleUpload} disabled={!file||loading}>
              {loading ? (
                <><i className="ti ti-loader" style={{fontSize:'16px',animation:'spin .8s linear infinite'}} aria-hidden="true"/>{loadingText||'Analysing...'}</>
              ) : (
                <><i className="ti ti-robot" style={{fontSize:'16px'}} aria-hidden="true"/>Analyse with AI</>
              )}
            </button>
          </div>

          {result && (
            <div>
              <div className="resume-score-hero">
                <div style={{width:'84px',height:'84px',borderRadius:'50%',border:'3px solid #00e5a0',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  <span style={{fontSize:'28px',fontWeight:800,color:'#00e5a0'}}>{result.ats_score}</span>
                  <span style={{fontSize:'10px',color:'var(--text2)',textTransform:'uppercase'}}>ATS</span>
                </div>
                <div>
                  <div style={{display:'flex',alignItems:'center',gap:'.5rem',marginBottom:'.35rem'}}>
                    <i className={`ti ${result.ats_score>=80?'ti-mood-happy':result.ats_score>=60?'ti-mood-smile':'ti-mood-sad'}`} style={{fontSize:'18px',color:result.ats_score>=80?'#00e5a0':result.ats_score>=60?'#f5a623':'#ff4d6d'}} aria-hidden="true"/>
                    <h2 className="resume-score-title" style={{margin:0}}>
                      {result.ats_score>=80?'Excellent!':result.ats_score>=60?'Good — room to improve':'Needs improvement'}
                    </h2>
                  </div>
                  <p className="resume-score-text">{result.suggestions}</p>
                </div>
              </div>

              <div className="resume-grid">
                <div className="resume-card">
                  <h4 className="resume-card-title">
                    <i className="ti ti-tags" aria-hidden="true"/>
                    Keywords
                  </h4>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'.35rem'}}>
                    {result.matched_keywords?.map(k=>(
                      <span key={k} style={{display:'inline-flex',alignItems:'center',gap:'.2rem',fontSize:'11px',padding:'2px 9px',borderRadius:'20px',background:'rgba(0,229,160,0.1)',color:'#00e5a0',border:'1px solid rgba(0,229,160,0.25)'}}>
                        <i className="ti ti-check" style={{fontSize:'10px'}} aria-hidden="true"/>{k}
                      </span>
                    ))}
                    {result.missing_keywords?.map(k=>(
                      <span key={k} style={{display:'inline-flex',alignItems:'center',gap:'.2rem',fontSize:'11px',padding:'2px 9px',borderRadius:'20px',background:'rgba(255,77,109,0.1)',color:'#ff4d6d',border:'1px solid rgba(255,77,109,0.2)'}}>
                        <i className="ti ti-x" style={{fontSize:'10px'}} aria-hidden="true"/>{k}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="resume-card">
                  <h4 className="resume-card-title">
                    <i className="ti ti-layout-list" aria-hidden="true"/>
                    Section scores
                  </h4>
                  {Object.entries(result.sections||{}).map(([k,v])=>(
                    <div key={k} style={{marginBottom:'.55rem'}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'.25rem'}}>
                        <span className="resume-section-label" style={{textTransform:'capitalize'}}>{k}</span>
                        <span style={{color:'#00e5a0',fontWeight:600,fontSize:'12px'}}>{v}%</span>
                      </div>
                      <div className="resume-bar-bg">
                        <div style={{height:'100%',width:`${v}%`,background:'#00e5a0',borderRadius:'3px'}}/>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="resume-match-card">
                <h4 className="resume-match-title">
                  <i className="ti ti-target" aria-hidden="true"/>
                  Top matching jobs — real data
                </h4>
                {result.top_matches?.map((j,i)=>(
                    <div key={i} className="resume-match-row">
                      <div style={{flex:1,minWidth:0}}>
                        <div className="resume-job-title">{j.title} — {j.company}</div>
                        <div className="resume-job-sub">{j.location} · {j.salary}</div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0,gap:"2px"}}>
                        <span style={{fontSize:"13px",fontWeight:800,color:"#7c6ff7"}}>{j.match}%</span>
                        <span style={{fontSize:"10px",color:"var(--text3)",whiteSpace:"nowrap"}}>View details</span>
                      </div>
                    </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}