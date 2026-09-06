import { useState, useRef } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function stripHtml(html) {
  if (!html) return ''
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n').trim()
}

function DonutChart({ pct, color }) {
  const r = 36, cx = 44, cy = 44, circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10"/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{transition:'stroke-dasharray .8s cubic-bezier(.16,1,.3,1)'}}/>
      <text x={cx} y={cy+1} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize="14" fontWeight="800" fontFamily="Inter,sans-serif">{pct}%</text>
    </svg>
  )
}

function Bar({ pct, color }) {
  return (
    <div style={{height:'5px',background:'rgba(255,255,255,0.06)',borderRadius:'3px',overflow:'hidden',flex:1}}>
      <div style={{height:'100%',width:`${pct}%`,background:color,borderRadius:'3px',transition:'width .7s cubic-bezier(.16,1,.3,1)'}}/>
    </div>
  )
}

export default function SkillGapModal({ job, userSkills, onClose, onTrack }) {
  const [tab, setTab]           = useState('overview')
  const [tracked, setTracked]   = useState(false)
  const [resumeFile, setResumeFile] = useState(null)
  const [uploading, setUploading]   = useState(false)
  const [analysis, setAnalysis]     = useState(null)
  const [salaryData, setSalaryData] = useState(null)
  const [usedSkills, setUsedSkills] = useState([])
  const [analysisError, setAnalysisError] = useState('')
  const fileRef = useRef(null)

  const cleanDesc = stripHtml(job.description || '')

  const runAnalysis = async (skills) => {
    setUploading(true); setAnalysisError('')
    try {
      const [gapRes, salRes] = await Promise.all([
        fetch(`${API}/alerts/skill-gap`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ user_skills:skills, job_title:job.title, job_description:job.description||'' })
        }),
        fetch(`${API}/alerts/salary-predict`, {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ job_title:job.title, skills, location:job.location||'India', experience_years:'1-3' })
        })
      ])
      const gapData = await gapRes.json()
      const salData = await salRes.json()
      if (gapData.success) setAnalysis(gapData.analysis)
      if (salData.success) setSalaryData(salData.salary)
    } catch(e) { setAnalysisError('Error: ' + e.message) }
    setUploading(false)
  }

  const handleUploadAndAnalyse = async () => {
    if (!resumeFile) return
    setUploading(true); setAnalysisError('')
    try {
      const formData = new FormData()
      formData.append('file', resumeFile)
      const res = await fetch(`${API}/builder/extract-resume`, { method:'POST', body:formData })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Extraction failed')
      const skills = [
        ...(data.data?.technical_skills || []),
        ...(data.data?.soft_skills || []),
      ]
      setUsedSkills(skills)
      await runAnalysis(skills)
    } catch(e) { setAnalysisError('Error: ' + e.message); setUploading(false) }
  }

  const handleUseExisting = async () => {
    if (!userSkills?.length) return
    setUsedSkills(userSkills)
    await runAnalysis(userSkills)
  }

  const pct = analysis?.match_percentage || 0
  const pctColor = pct >= 70 ? '#00e5a0' : pct >= 40 ? '#f5a623' : '#ff4d6d'

  // Only 2 tabs: Overview and Skills match (which contains everything)
  const TABS = [
    { id:'overview', icon:'ti-info-circle', label:'Overview' },
    { id:'skills',   icon:'ti-brain',       label:'Skills match' },
  ]

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"/>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
        .sgm-tab:hover{border-color:rgba(0,229,160,0.25)!important;color:rgba(255,255,255,0.6)!important;}
        .sgm-in{animation:fadeIn .2s ease;}
        .sgm-sc::-webkit-scrollbar{width:3px;}
        .sgm-sc::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px;}
      `}</style>

      <div style={{position:'fixed',inset:0,background:'rgba(6,9,20,0.88)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)',padding:'1rem'}}
        onClick={e=>e.target===e.currentTarget&&onClose()}>
        <div style={{background:'#0d1120',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'20px',width:'100%',maxWidth:'580px',maxHeight:'90vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>

          {/* HEADER */}
          <div style={{padding:'1.25rem 1.25rem .75rem',borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'.6rem'}}>
              <div style={{flex:1,paddingRight:'1rem'}}>
                <div style={{fontSize:'16px',fontWeight:800,color:'#eef0ff',marginBottom:'4px'}}>{job.title}</div>
                <div style={{display:'flex',alignItems:'center',gap:'.5rem',flexWrap:'wrap',fontSize:'12px',color:'#8b93b0'}}>
                  <span style={{display:'flex',alignItems:'center',gap:'.25rem'}}><i className="ti ti-building" style={{fontSize:'13px'}} aria-hidden="true"/>{job.company}</span>
                  {job.location && <><span style={{opacity:.3}}>·</span><span style={{display:'flex',alignItems:'center',gap:'.25rem'}}><i className="ti ti-map-pin" style={{fontSize:'13px'}} aria-hidden="true"/>{job.location}</span></>}
                </div>
              </div>
              <button onClick={onClose} style={{background:'none',border:'none',color:'#4a5168',cursor:'pointer',display:'flex',padding:'.2rem',transition:'color .15s'}}
                onMouseEnter={e=>e.currentTarget.style.color='#8b93b0'}
                onMouseLeave={e=>e.currentTarget.style.color='#4a5168'}>
                <i className="ti ti-x" style={{fontSize:'20px'}} aria-hidden="true"/>
              </button>
            </div>

            {/* Tags */}
            <div style={{display:'flex',gap:'.3rem',flexWrap:'wrap',marginBottom:'.85rem'}}>
              {job.job_type && <span style={{display:'inline-flex',alignItems:'center',gap:'.25rem',fontSize:'11px',padding:'3px 8px',borderRadius:'20px',background:'rgba(255,255,255,0.05)',border:'0.5px solid rgba(255,255,255,0.08)',color:'#8b93b0'}}><i className="ti ti-clock" style={{fontSize:'11px'}} aria-hidden="true"/>{job.job_type}</span>}
              {job.salary && <span style={{display:'inline-flex',alignItems:'center',gap:'.25rem',fontSize:'11px',padding:'3px 8px',borderRadius:'20px',background:'rgba(255,255,255,0.05)',border:'0.5px solid rgba(255,255,255,0.08)',color:'#8b93b0'}}><i className="ti ti-currency-rupee" style={{fontSize:'11px'}} aria-hidden="true"/>{job.salary}</span>}
              {job.category && <span style={{display:'inline-flex',alignItems:'center',gap:'.25rem',fontSize:'11px',padding:'3px 8px',borderRadius:'20px',background:'rgba(0,229,160,0.08)',border:'0.5px solid rgba(0,229,160,0.2)',color:'#00e5a0'}}><i className="ti ti-tag" style={{fontSize:'11px'}} aria-hidden="true"/>{job.category}</span>}
              {analysis && <span style={{display:'inline-flex',alignItems:'center',gap:'.25rem',fontSize:'11px',padding:'3px 8px',borderRadius:'20px',background:`${pctColor}18`,border:`0.5px solid ${pctColor}40`,color:pctColor,fontWeight:700}}><i className="ti ti-target" style={{fontSize:'11px'}} aria-hidden="true"/>{pct}% match</span>}
            </div>

            {/* Actions */}
            <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap'}}>
              {job.url && <a href={job.url} target='_blank' rel='noopener noreferrer'
                style={{display:'inline-flex',alignItems:'center',gap:'.4rem',padding:'.5rem 1rem',background:'linear-gradient(135deg,#00e5a0,#00c484)',borderRadius:'9px',color:'#060d0a',fontSize:'12px',fontWeight:700,textDecoration:'none'}}>
                Apply now <i className="ti ti-arrow-right" style={{fontSize:'13px'}} aria-hidden="true"/>
              </a>}
              <button onClick={()=>{setTracked(true);onTrack&&onTrack(job)}}
                style={{display:'inline-flex',alignItems:'center',gap:'.4rem',padding:'.5rem 1rem',background:tracked?'rgba(0,229,160,0.1)':'rgba(255,255,255,0.04)',border:`0.5px solid ${tracked?'rgba(0,229,160,0.4)':'rgba(255,255,255,0.1)'}`,borderRadius:'9px',color:tracked?'#00e5a0':'#8b93b0',fontSize:'12px',fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
                <i className={`ti ${tracked?'ti-circle-check':'ti-plus'}`} style={{fontSize:'13px'}} aria-hidden="true"/>
                {tracked ? 'Tracking' : 'Track application'}
              </button>
            </div>
          </div>

          {/* TABS */}
          <div style={{display:'flex',gap:'.35rem',padding:'.6rem 1.25rem',borderBottom:'1px solid rgba(255,255,255,0.07)',flexShrink:0}}>
            {TABS.map(t=>(
              <button key={t.id} className="sgm-tab" onClick={()=>setTab(t.id)}
                style={{display:'inline-flex',alignItems:'center',gap:'.35rem',padding:'.38rem .9rem',borderRadius:'20px',border:`0.5px solid ${tab===t.id?'rgba(0,229,160,0.4)':'rgba(255,255,255,0.08)'}`,background:tab===t.id?'rgba(0,229,160,0.1)':'transparent',color:tab===t.id?'#00e5a0':'#4a5168',fontSize:'12px',fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif',transition:'all .15s'}}>
                <i className={`ti ${t.icon}`} style={{fontSize:'13px'}} aria-hidden="true"/>{t.label}
              </button>
            ))}
          </div>

          {/* BODY */}
          <div className="sgm-sc" style={{flex:1,overflowY:'auto',padding:'1.25rem'}}>

            {/* ── OVERVIEW TAB ── */}
            {tab==='overview' && (
              <div className="sgm-in">
                {cleanDesc
                  ? <div style={{fontSize:'13px',color:'#8b93b0',lineHeight:1.8,whiteSpace:'pre-wrap'}}>{cleanDesc}</div>
                  : <div style={{textAlign:'center',padding:'2rem',color:'#4a5168',fontSize:'13px'}}>
                      <i className="ti ti-file-off" style={{fontSize:'28px',display:'block',marginBottom:'.75rem'}} aria-hidden="true"/>
                      No job description available
                    </div>
                }
              </div>
            )}

            {/* ── SKILLS MATCH TAB ── */}
            {tab==='skills' && (
              <div className="sgm-in">

                {/* STATE 1: No analysis yet — show upload + optional use existing */}
                {!analysis && !uploading && (
                  <>
                    {/* Resume upload dropzone */}
                    <div style={{marginBottom:'1rem'}}>
                      <div style={{fontSize:'13px',fontWeight:700,color:'#eef0ff',marginBottom:'.35rem'}}>Upload your resume</div>
                      <div style={{fontSize:'12px',color:'#8b93b0',lineHeight:1.6,marginBottom:'1rem'}}>
                        We'll extract your skills and compare them against this job's requirements — showing match score, skill gaps, and salary insight.
                      </div>
                      <div onClick={()=>fileRef.current?.click()}
                        style={{border:`2px dashed ${resumeFile?'rgba(0,229,160,0.5)':'rgba(255,255,255,0.1)'}`,borderRadius:'14px',padding:'1.5rem',textAlign:'center',cursor:'pointer',background:resumeFile?'rgba(0,229,160,0.03)':'transparent',marginBottom:'.75rem',transition:'all .2s'}}
                        onMouseEnter={e=>{ if(!resumeFile) e.currentTarget.style.borderColor='rgba(255,255,255,0.2)' }}
                        onMouseLeave={e=>{ if(!resumeFile) e.currentTarget.style.borderColor='rgba(255,255,255,0.1)' }}>
                        <input ref={fileRef} type='file' accept='.pdf,.doc,.docx' style={{display:'none'}} onChange={e=>{setResumeFile(e.target.files[0]);setAnalysisError('')}}/>
                        <div style={{width:'40px',height:'40px',borderRadius:'10px',background:resumeFile?'rgba(0,229,160,0.1)':'rgba(255,255,255,0.04)',border:`0.5px solid ${resumeFile?'rgba(0,229,160,0.3)':'rgba(255,255,255,0.08)'}`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto .6rem'}}>
                          <i className={`ti ${resumeFile?'ti-circle-check':'ti-file-upload'}`} style={{fontSize:'20px',color:resumeFile?'#00e5a0':'#4a5168'}} aria-hidden="true"/>
                        </div>
                        {resumeFile
                          ? <><div style={{fontSize:'13px',fontWeight:600,color:'#00e5a0'}}>{resumeFile.name}</div><div style={{fontSize:'11px',color:'#4a5168',marginTop:'2px'}}>{(resumeFile.size/1024).toFixed(0)} KB · Click to change</div></>
                          : <><div style={{fontSize:'13px',fontWeight:600,color:'#eef0ff',marginBottom:'.25rem'}}>Drop resume here or click to browse</div><div style={{fontSize:'11px',color:'#4a5168'}}>PDF, DOC, DOCX · max 5MB</div></>
                        }
                      </div>

                      {/* What you'll get */}
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.4rem',marginBottom:'1rem'}}>
                        {[
                          {icon:'ti-target',        color:'#00e5a0', label:'Match score'},
                          {icon:'ti-tools',         color:'#7c6ff7', label:'Skill comparison'},
                          {icon:'ti-trending-up',   color:'#f5a623', label:'Career gap'},
                          {icon:'ti-currency-rupee',color:'#3b82f6', label:'Salary insight'},
                        ].map(f=>(
                          <div key={f.label} style={{display:'flex',alignItems:'center',gap:'.5rem',padding:'.5rem .7rem',background:'rgba(255,255,255,0.02)',border:'0.5px solid rgba(255,255,255,0.06)',borderRadius:'8px'}}>
                            <i className={`ti ${f.icon}`} style={{fontSize:'15px',color:f.color,flexShrink:0}} aria-hidden="true"/>
                            <div style={{fontSize:'12px',color:'#8b93b0'}}>{f.label}</div>
                          </div>
                        ))}
                      </div>

                      {analysisError && (
                        <div style={{display:'flex',alignItems:'center',gap:'.4rem',padding:'.55rem .8rem',background:'rgba(255,77,77,0.08)',border:'0.5px solid rgba(255,77,77,0.2)',borderRadius:'8px',marginBottom:'.75rem',fontSize:'12px',color:'#ff6b6b'}}>
                          <i className="ti ti-alert-circle" style={{fontSize:'14px',flexShrink:0}} aria-hidden="true"/>{analysisError}
                        </div>
                      )}

                      <button onClick={handleUploadAndAnalyse} disabled={!resumeFile}
                        style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem',padding:'.65rem',background:'linear-gradient(135deg,#00e5a0,#00c484)',border:'none',borderRadius:'10px',color:'#060d0a',fontSize:'13px',fontWeight:700,cursor:!resumeFile?'not-allowed':'pointer',fontFamily:'Inter,sans-serif',opacity:!resumeFile?.5:1}}>
                        <i className="ti ti-brain" style={{fontSize:'15px'}} aria-hidden="true"/>
                        Analyse my resume for this job
                      </button>
                    </div>

                    {/* Divider — only if existing skills available */}
                    {userSkills?.length > 0 && (
                      <>
                        <div style={{display:'flex',alignItems:'center',gap:'.75rem',margin:'1rem 0'}}>
                          <div style={{flex:1,height:'0.5px',background:'rgba(255,255,255,0.07)'}}/>
                          <span style={{fontSize:'11px',color:'#4a5168',flexShrink:0}}>or use skills from AI match</span>
                          <div style={{flex:1,height:'0.5px',background:'rgba(255,255,255,0.07)'}}/>
                        </div>
                        <button onClick={handleUseExisting}
                          style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem',padding:'.6rem',background:'rgba(124,111,247,0.1)',border:'0.5px solid rgba(124,111,247,0.3)',borderRadius:'10px',color:'#7c6ff7',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
                          <i className="ti ti-sparkles" style={{fontSize:'14px'}} aria-hidden="true"/>
                          Use my {userSkills.length} skills from AI match
                        </button>
                      </>
                    )}
                  </>
                )}

                {/* STATE 2: Loading */}
                {uploading && (
                  <div style={{textAlign:'center',padding:'3rem 1rem'}}>
                    <div style={{width:'52px',height:'52px',borderRadius:'14px',background:'rgba(0,229,160,0.1)',border:'0.5px solid rgba(0,229,160,0.2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 1rem'}}>
                      <i className="ti ti-loader" style={{fontSize:'26px',color:'#00e5a0',animation:'spin .9s linear infinite'}} aria-hidden="true"/>
                    </div>
                    <div style={{fontSize:'14px',fontWeight:600,color:'#eef0ff',marginBottom:'.35rem'}}>Analysing your resume...</div>
                    <div style={{fontSize:'12px',color:'#4a5168'}}>Extracting skills · comparing to job · predicting salary</div>
                  </div>
                )}

                {/* STATE 3: Analysis results */}
                {analysis && !uploading && (
                  <>
                    {/* Match donut + summary */}
                    <div style={{display:'flex',alignItems:'center',gap:'1.25rem',padding:'1rem',background:'rgba(255,255,255,0.02)',border:'0.5px solid rgba(255,255,255,0.06)',borderRadius:'14px',marginBottom:'1rem'}}>
                      <DonutChart pct={pct} color={pctColor}/>
                      <div style={{flex:1}}>
                        <div style={{display:'flex',alignItems:'center',gap:'.4rem',fontSize:'15px',fontWeight:800,color:'#eef0ff',marginBottom:'4px'}}>
                          <i className={`ti ${pct>=70?'ti-mood-happy':pct>=40?'ti-mood-smile':'ti-mood-sad'}`} style={{fontSize:'17px',color:pctColor}} aria-hidden="true"/>
                          {pct>=70?'Strong match!':pct>=40?'Partial match':'Skill gap found'}
                        </div>
                        <div style={{fontSize:'12px',color:'#8b93b0',lineHeight:1.5,marginBottom:'.35rem'}}>{analysis.overall_assessment}</div>
                        <div style={{fontSize:'11px',color:pctColor,fontWeight:600}}>
                          {usedSkills.length} skills · {analysis.matched_skills?.length||0} matched · {analysis.missing_skills?.length||0} gaps
                        </div>
                      </div>
                    </div>

                    {/* Matched skills bars */}
                    {analysis.matched_skills?.length > 0 && (
                      <div style={{marginBottom:'1rem'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'.35rem',fontSize:'11px',fontWeight:700,color:'#00e5a0',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.6rem'}}>
                          <i className="ti ti-circle-check" style={{fontSize:'13px'}} aria-hidden="true"/>
                          Skills you have ({analysis.matched_skills.length})
                        </div>
                        <div style={{display:'flex',flexDirection:'column',gap:'.45rem'}}>
                          {analysis.matched_skills.map((s,i)=>{
                            const p = Math.max(60, 100 - i * 5)
                            return (
                              <div key={s} style={{display:'flex',alignItems:'center',gap:'.75rem'}}>
                                <div style={{fontSize:'12px',color:'#eef0ff',width:'120px',flexShrink:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s}</div>
                                <Bar pct={p} color="#00e5a0"/>
                                <div style={{fontSize:'11px',color:'#00e5a0',fontWeight:600,width:'32px',textAlign:'right',flexShrink:0}}>{p}%</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Missing skills bars */}
                    {analysis.missing_skills?.length > 0 && (
                      <div style={{marginBottom:'1rem'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'.35rem',fontSize:'11px',fontWeight:700,color:'#ff4d6d',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.6rem'}}>
                          <i className="ti ti-circle-x" style={{fontSize:'13px'}} aria-hidden="true"/>
                          Skills to learn ({analysis.missing_skills.length})
                        </div>
                        <div style={{display:'flex',flexDirection:'column',gap:'.45rem'}}>
                          {analysis.missing_skills.map((s,i)=>{
                            const p = Math.max(10, 40 - i * 5)
                            return (
                              <div key={s} style={{display:'flex',alignItems:'center',gap:'.75rem'}}>
                                <div style={{fontSize:'12px',color:'#8b93b0',width:'120px',flexShrink:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s}</div>
                                <Bar pct={p} color="#ff4d6d"/>
                                <div style={{fontSize:'11px',color:'#ff4d6d',fontWeight:600,width:'32px',textAlign:'right',flexShrink:0}}>{p}%</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Career gap — priority skills */}
                    {analysis.priority_skills?.length > 0 && (
                      <div style={{marginBottom:'1rem'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'.35rem',fontSize:'11px',fontWeight:700,color:'#f5a623',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.6rem'}}>
                          <i className="ti ti-rocket" style={{fontSize:'13px'}} aria-hidden="true"/>
                          Career gap — priority learning
                        </div>
                        {analysis.priority_skills.map((ps,i)=>(
                          <div key={i} style={{padding:'.7rem .85rem',background:'rgba(245,166,35,0.05)',border:'0.5px solid rgba(245,166,35,0.15)',borderRadius:'10px',marginBottom:'.5rem'}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'3px'}}>
                              <div style={{fontSize:'13px',fontWeight:700,color:'#eef0ff'}}>{ps.skill}</div>
                              <span style={{display:'inline-flex',alignItems:'center',gap:'.25rem',fontSize:'10px',color:'#f5a623',background:'rgba(245,166,35,0.1)',padding:'2px 7px',borderRadius:'10px'}}>
                                <i className="ti ti-clock" style={{fontSize:'10px'}} aria-hidden="true"/>{ps.time_to_learn}
                              </span>
                            </div>
                            <div style={{fontSize:'11px',color:'#8b93b0',lineHeight:1.5,marginBottom:'5px'}}>{ps.reason}</div>
                            {ps.learn_url && <a href={ps.learn_url} target='_blank' rel='noopener noreferrer'
                              style={{display:'inline-flex',alignItems:'center',gap:'.3rem',fontSize:'11px',color:'#7c6ff7',textDecoration:'none',fontWeight:600}}>
                              <i className="ti ti-book" style={{fontSize:'12px'}} aria-hidden="true"/>
                              Learn on {ps.learn_url.includes('coursera')?'Coursera':ps.learn_url.includes('udemy')?'Udemy':'Course site'}
                            </a>}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Salary */}
                    {salaryData && (
                      <div style={{marginBottom:'1rem'}}>
                        <div style={{display:'flex',alignItems:'center',gap:'.35rem',fontSize:'11px',fontWeight:700,color:'#3b82f6',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.6rem'}}>
                          <i className="ti ti-currency-rupee" style={{fontSize:'13px'}} aria-hidden="true"/> Salary insight
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'.5rem',marginBottom:'.65rem'}}>
                          {[
                            {label:'Min',  value:salaryData.min_salary, color:'#8b93b0', icon:'ti-trending-down'},
                            {label:'Avg',  value:salaryData.avg_salary, color:'#00e5a0', icon:'ti-chart-bar'},
                            {label:'Max',  value:salaryData.max_salary, color:'#7c6ff7', icon:'ti-trending-up'},
                          ].map(({label,value,color,icon})=>(
                            <div key={label} style={{padding:'.7rem',background:'rgba(255,255,255,0.03)',border:'0.5px solid rgba(255,255,255,0.07)',borderRadius:'10px',textAlign:'center'}}>
                              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'.25rem',fontSize:'9px',color:'#4a5168',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.3rem'}}>
                                <i className={`ti ${icon}`} style={{fontSize:'11px',color}} aria-hidden="true"/>{label}
                              </div>
                              <div style={{fontSize:'15px',fontWeight:800,color}}>{value}</div>
                            </div>
                          ))}
                        </div>
                        {salaryData.market_insight && (
                          <div style={{display:'flex',alignItems:'flex-start',gap:'.5rem',padding:'.6rem .85rem',background:'rgba(59,130,246,0.06)',border:'0.5px solid rgba(59,130,246,0.15)',borderRadius:'9px',fontSize:'12px',color:'#8b93b0',lineHeight:1.5}}>
                            <i className="ti ti-chart-line" style={{fontSize:'14px',color:'#3b82f6',flexShrink:0,marginTop:'1px'}} aria-hidden="true"/>
                            {salaryData.market_insight}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Recommendation */}
                    {analysis.recommendation && (
                      <div style={{display:'flex',alignItems:'flex-start',gap:'.5rem',padding:'.7rem .85rem',background:'rgba(124,111,247,0.06)',border:'0.5px solid rgba(124,111,247,0.2)',borderRadius:'10px',fontSize:'12px',color:'#8b93b0',lineHeight:1.5,marginBottom:'1rem'}}>
                        <i className="ti ti-bulb" style={{fontSize:'15px',color:'#7c6ff7',flexShrink:0,marginTop:'1px'}} aria-hidden="true"/>
                        {analysis.recommendation}
                      </div>
                    )}

                    {/* Re-analyse with different resume */}
                    <button onClick={()=>{setAnalysis(null);setSalaryData(null);setResumeFile(null);setUsedSkills([]);setAnalysisError('')}}
                      style={{display:'inline-flex',alignItems:'center',gap:'.35rem',fontSize:'12px',color:'#4a5168',background:'none',border:'0.5px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'.4rem .85rem',cursor:'pointer',fontFamily:'Inter,sans-serif',transition:'all .15s'}}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.15)';e.currentTarget.style.color='#8b93b0'}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.08)';e.currentTarget.style.color='#4a5168'}}>
                      <i className="ti ti-refresh" style={{fontSize:'13px'}} aria-hidden="true"/> Analyse with different resume
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}