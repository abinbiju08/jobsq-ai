import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// ── FIELD COMPONENTS ─────────────────────────────────────────────
const Field = ({ label, value, onChange, placeholder, type = 'text' }) => (
  <div style={{ marginBottom: '.75rem' }}>
    <label style={{ fontSize:'11px', fontWeight:700, color:'var(--text3,#4a5168)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'.35rem', display:'block' }}>{label}</label>
    <input style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'9px', padding:'.6rem .85rem', color:'var(--text,#eef0ff)', fontSize:'13px', fontFamily:'Inter,sans-serif', outline:'none', boxSizing:'border-box' }} type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}/>
  </div>
)

const DateField = ({ label, value, onChange }) => {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const years = Array.from({length:30},(_,i)=>(new Date().getFullYear()-i).toString())
  const isPresent = value === 'Present'
  const parts = value && !isPresent ? value.split(' ') : ['','']
  const month = parts[0]||'', year = parts[1]||''
  const sel = { background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'9px', padding:'.55rem .7rem', color:'var(--text,#eef0ff)', fontSize:'13px', fontFamily:'Inter,sans-serif', outline:'none', cursor:'pointer' }
  return (
    <div style={{ marginBottom:'.75rem' }}>
      <label style={{ fontSize:'11px', fontWeight:700, color:'var(--text3,#4a5168)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'.35rem', display:'block' }}>{label}</label>
      <div style={{ display:'flex', gap:'.5rem', alignItems:'center', flexWrap:'wrap' }}>
        {!isPresent && <>
          <select style={sel} value={month} onChange={e=>onChange(`${e.target.value} ${year}`.trim())}>
            <option value=''>Month</option>
            {months.map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <select style={sel} value={year} onChange={e=>onChange(`${month} ${e.target.value}`.trim())}>
            <option value=''>Year</option>
            {years.map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </>}
        <label style={{ display:'flex', alignItems:'center', gap:'.35rem', fontSize:'12px', color:'var(--text2,#8b93b0)', cursor:'pointer' }}>
          <input type='checkbox' checked={isPresent} onChange={e=>onChange(e.target.checked?'Present':'')} style={{accentColor:'#00e5a0'}}/>
          Present
        </label>
      </div>
    </div>
  )
}

// ── TEMPLATE PREVIEWS ─────────────────────────────────────────────
const ModernCleanPreview = () => (
  <div style={{fontFamily:'Arial,sans-serif',fontSize:'6px',lineHeight:1.4,color:'#1a1a1a',background:'#fff',height:'100%',overflow:'hidden'}}>
    <div style={{background:'#00c484',padding:'10px 12px',marginBottom:'6px'}}>
      <div style={{fontSize:'11px',fontWeight:900,color:'#fff',marginBottom:'1px'}}>JOHN SMITH</div>
      <div style={{fontSize:'7px',color:'rgba(255,255,255,0.9)',marginBottom:'3px'}}>Senior Software Engineer</div>
      <div style={{display:'flex',gap:'6px',fontSize:'5.5px',color:'rgba(255,255,255,0.8)'}}><span>john@email.com</span><span>|</span><span>Bangalore</span></div>
    </div>
    <div style={{padding:'0 12px'}}>
      <div style={{fontSize:'6.5px',fontWeight:800,color:'#00c484',textTransform:'uppercase',borderBottom:'1.5px solid #00c484',paddingBottom:'2px',marginBottom:'3px'}}>Summary</div>
      <div style={{fontSize:'5.5px',color:'#444',marginBottom:'4px',lineHeight:1.5}}>Results-driven engineer with 5+ years building scalable systems.</div>
      <div style={{fontSize:'6.5px',fontWeight:800,color:'#00c484',textTransform:'uppercase',borderBottom:'1.5px solid #00c484',paddingBottom:'2px',marginBottom:'3px'}}>Skills</div>
      <div style={{display:'flex',flexWrap:'wrap',gap:'2px'}}>{['Python','React','AWS','Docker'].map(s=><span key={s} style={{fontSize:'5px',padding:'1px 4px',background:'rgba(0,196,132,0.1)',border:'0.5px solid #00c484',borderRadius:'3px',color:'#00a572'}}>{s}</span>)}</div>
    </div>
  </div>
)
const ProfessionalClassicPreview = () => (
  <div style={{fontFamily:'Georgia,serif',fontSize:'6px',lineHeight:1.4,color:'#1a1a1a',background:'#fff',height:'100%',overflow:'hidden'}}>
    <div style={{borderBottom:'3px solid #1e3a5f',padding:'10px 12px 6px',textAlign:'center',marginBottom:'5px'}}>
      <div style={{fontSize:'12px',fontWeight:900,color:'#1e3a5f',marginBottom:'1px'}}>JOHN SMITH</div>
      <div style={{fontSize:'6.5px',color:'#2563eb',marginBottom:'3px',fontStyle:'italic'}}>Senior Financial Analyst</div>
    </div>
    <div style={{padding:'0 12px'}}>
      <div style={{fontSize:'7px',fontWeight:800,color:'#1e3a5f',textTransform:'uppercase',marginBottom:'2px'}}>Professional Summary</div>
      <div style={{height:'1px',background:'#1e3a5f',marginBottom:'3px'}}/>
      <div style={{fontSize:'5.5px',color:'#444',marginBottom:'4px',lineHeight:1.5}}>CFA-certified analyst with 8 years managing $500M+ portfolios.</div>
    </div>
  </div>
)
const ExecutiveBoldPreview = () => (
  <div style={{fontFamily:'Arial,sans-serif',fontSize:'6px',lineHeight:1.4,color:'#1a1a1a',background:'#fff',height:'100%',overflow:'hidden',display:'flex'}}>
    <div style={{width:'38%',background:'#1a1a2e',padding:'10px 8px',color:'#fff'}}>
      <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'linear-gradient(135deg,#7c6ff7,#5a52d5)',margin:'0 auto 4px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'10px',fontWeight:800}}>JS</div>
      <div style={{fontSize:'6px',fontWeight:700,color:'#7c6ff7',textTransform:'uppercase',marginBottom:'3px',borderBottom:'0.5px solid rgba(124,111,247,0.3)',paddingBottom:'2px'}}>Skills</div>
      {['Leadership','Strategy'].map(s=><div key={s} style={{fontSize:'5px',color:'rgba(255,255,255,0.8)',marginBottom:'2px'}}>- {s}</div>)}
    </div>
    <div style={{flex:1,padding:'10px 8px'}}>
      <div style={{borderBottom:'2px solid #7c6ff7',paddingBottom:'5px',marginBottom:'5px'}}><div style={{fontSize:'11px',fontWeight:900,color:'#1a1a2e'}}>JOHN SMITH</div><div style={{fontSize:'6.5px',color:'#7c6ff7',fontWeight:700}}>Chief Technology Officer</div></div>
    </div>
  </div>
)
const MinimalATSPreview = () => (
  <div style={{fontFamily:'Arial,sans-serif',fontSize:'6px',lineHeight:1.5,color:'#1a1a1a',background:'#fff',height:'100%',overflow:'hidden',padding:'10px 12px'}}>
    <div style={{borderBottom:'2px solid #2d3748',paddingBottom:'5px',marginBottom:'5px'}}><div style={{fontSize:'12px',fontWeight:900,color:'#2d3748',marginBottom:'1px'}}>JOHN SMITH</div><div style={{fontSize:'6.5px',color:'#4a5568'}}>Software Developer · john@email.com</div></div>
    <div style={{marginBottom:'3px'}}><div style={{fontSize:'7px',fontWeight:800,color:'#2d3748',marginBottom:'2px'}}>SKILLS</div><div style={{fontSize:'5.5px',color:'#4a5568'}}>Python · JavaScript · React · Node.js</div></div>
  </div>
)
const CreativeProPreview = () => (
  <div style={{fontFamily:'Arial,sans-serif',fontSize:'6px',lineHeight:1.4,color:'#1a1a1a',background:'#fff',height:'100%',overflow:'hidden',display:'flex'}}>
    <div style={{width:'40%',background:'linear-gradient(180deg,#7c3aed,#a855f7)',padding:'10px 8px',color:'#fff'}}>
      <div style={{fontSize:'7px',fontWeight:800,textAlign:'center',marginBottom:'1px'}}>JOHN SMITH</div>
      <div style={{fontSize:'5.5px',color:'rgba(255,255,255,0.85)',textAlign:'center',marginBottom:'5px'}}>Creative Director</div>
    </div>
    <div style={{flex:1,padding:'10px 8px'}}>
      <div style={{borderLeft:'3px solid #a855f7',paddingLeft:'6px',marginBottom:'4px'}}><div style={{fontSize:'6.5px',fontWeight:800,color:'#7c3aed',textTransform:'uppercase',marginBottom:'2px'}}>Experience</div><div style={{fontSize:'6px',fontWeight:700}}>Creative Director · Ogilvy</div></div>
    </div>
  </div>
)
const HealthcarePreview = () => (
  <div style={{fontFamily:'Arial,sans-serif',fontSize:'6px',lineHeight:1.4,color:'#1a1a1a',background:'#fff',height:'100%',overflow:'hidden'}}>
    <div style={{background:'linear-gradient(135deg,#0891b2,#06b6d4)',padding:'10px 12px',marginBottom:'5px'}}>
      <div style={{fontSize:'11px',fontWeight:900,color:'#fff',marginBottom:'1px'}}>DR. JOHN SMITH</div>
      <div style={{fontSize:'6.5px',color:'rgba(255,255,255,0.9)',marginBottom:'3px'}}>MBBS · MD Internal Medicine</div>
    </div>
    <div style={{padding:'0 12px'}}>
      <div style={{fontSize:'6.5px',fontWeight:800,color:'#0891b2',textTransform:'uppercase',borderBottom:'1.5px solid #0891b2',paddingBottom:'2px',marginBottom:'3px'}}>Clinical Experience</div>
      <div style={{fontSize:'6px',fontWeight:700}}>Senior Resident · AIIMS Delhi · 2020-Present</div>
    </div>
  </div>
)

const TEMPLATES = [
  { id:'modern',       name:'Modern clean',        desc:'Green accent. Perfect for Tech & IT.',        tags:['Tech','IT'],           ats:99,  Preview:ModernCleanPreview },
  { id:'professional', name:'Professional classic', desc:'Traditional layout. Best for Finance.',       tags:['Finance','Banking'],   ats:98,  Preview:ProfessionalClassicPreview },
  { id:'executive',    name:'Executive bold',       desc:'Sidebar layout for Senior & Leadership.',     tags:['Senior','Leadership'], ats:97,  Preview:ExecutiveBoldPreview },
  { id:'minimal',      name:'Minimal ATS',          desc:'Ultra-clean. Maximum ATS compatibility.',     tags:['All roles'],           ats:100, Preview:MinimalATSPreview },
  { id:'creative',     name:'Creative pro',         desc:'Gradient sidebar for Marketing & Design.',    tags:['Marketing','Design'],  ats:96,  Preview:CreativeProPreview },
  { id:'healthcare',   name:'Healthcare clean',     desc:'Structured for medical & healthcare roles.',  tags:['Healthcare','Medical'],ats:98,  Preview:HealthcarePreview },
]

const TONES = ['Professional','Enthusiastic','Creative','Concise']
const empty_exp  = () => ({ company:'', role:'', start:'', end:'', bullets:['','',''] })
const empty_edu  = () => ({ institution:'', degree:'', field:'', year:'', gpa:'' })
const empty_proj = () => ({ name:'', description:'', tech:'' })

const S = {
  page:     { background:'var(--bg,#080c18)', minHeight:'calc(100vh - 52px)', fontFamily:'Inter,sans-serif', overflowY:'auto' },
  wrap:     { maxWidth:'960px', margin:'0 auto', padding:'1.5rem 1rem' },
  card:     { background:'var(--bg3,#141828)', border:'1px solid var(--border,rgba(255,255,255,0.07))', borderRadius:'16px', padding:'1.5rem' },
  btn:      { display:'flex', alignItems:'center', justifyContent:'center', gap:'.4rem', padding:'.65rem 1.25rem', background:'linear-gradient(135deg,#00e5a0,#00c484)', border:'none', borderRadius:'10px', color:'#060d0a', fontSize:'13px', fontWeight:700, cursor:'pointer', fontFamily:'Inter,sans-serif' },
  btnGhost: { display:'flex', alignItems:'center', justifyContent:'center', gap:'.4rem', padding:'.65rem 1.25rem', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', color:'var(--text2,#8b93b0)', fontSize:'13px', fontWeight:600, cursor:'pointer', fontFamily:'Inter,sans-serif' },
  btnPurple:{ display:'flex', alignItems:'center', justifyContent:'center', gap:'.4rem', padding:'.65rem 1.25rem', background:'linear-gradient(135deg,#7c6ff7,#5a52d5)', border:'none', borderRadius:'10px', color:'#fff', fontSize:'13px', fontWeight:700, cursor:'pointer', fontFamily:'Inter,sans-serif' },
  row:      { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.75rem', marginBottom:'.75rem' },
  secTitle: { display:'flex', alignItems:'center', gap:'.4rem', fontSize:'13px', fontWeight:700, color:'#00e5a0', marginBottom:'.75rem', paddingBottom:'.5rem', borderBottom:'1px solid rgba(0,229,160,0.15)' },
  input:    { width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'9px', padding:'.6rem .85rem', color:'var(--text,#eef0ff)', fontSize:'13px', fontFamily:'Inter,sans-serif', outline:'none', boxSizing:'border-box' },
  label:    { fontSize:'11px', fontWeight:700, color:'var(--text3,#4a5168)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:'.35rem', display:'block' },
}

// ── LOADING OVERLAY ───────────────────────────────────────────────
function LoadingOverlay({text}) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(6,9,20,0.92)',zIndex:999,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(8px)'}}>
      <div style={{textAlign:'center'}}>
        <div style={{width:'52px',height:'52px',borderRadius:'14px',background:'rgba(0,229,160,0.1)',border:'1px solid rgba(0,229,160,0.25)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 1rem'}}>
          <i className="ti ti-robot" style={{fontSize:'26px',color:'#00e5a0'}} aria-hidden="true"/>
        </div>
        <div style={{fontSize:'18px',fontWeight:700,color:'#eef0ff',marginBottom:'.5rem'}}>Generating your resume</div>
        <div style={{fontSize:'13px',color:'#8b93b0',marginBottom:'1.5rem'}}>{text}</div>
        <div style={{width:'240px',height:'4px',background:'rgba(255,255,255,0.06)',borderRadius:'2px',overflow:'hidden',margin:'0 auto'}}>
          <div style={{height:'100%',background:'linear-gradient(90deg,#00e5a0,#7c6ff7)',borderRadius:'2px',animation:'slide 1.5s ease-in-out infinite'}}/>
        </div>
        <style>{`@keyframes slide{0%{width:0}50%{width:70%}100%{width:100%}} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  )
}

// ── TONE PICKER ───────────────────────────────────────────────────
function TonePicker({ tone, setTone }) {
  return (
    <div style={{marginBottom:'1rem'}}>
      <label style={S.label}>Tone</label>
      <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap'}}>
        {TONES.map(t=>(
          <button key={t} onClick={()=>setTone(t)}
            style={{padding:'.4rem .9rem',borderRadius:'20px',border:`1px solid ${tone===t?'rgba(124,111,247,0.5)':'rgba(255,255,255,0.1)'}`,background:tone===t?'rgba(124,111,247,0.15)':'rgba(255,255,255,0.03)',color:tone===t?'#7c6ff7':'var(--text2,#8b93b0)',fontSize:'12px',fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
            {t}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── RESUME UPLOAD BOX ─────────────────────────────────────────────
function ResumeUploadBox({ onExtracted, label = 'Upload your existing resume (optional)' }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const handleUpload = async (f) => {
    if (!f) return
    setUploading(true); setError('')
    try {
      const formData = new FormData()
      formData.append('file', f)
      const res = await fetch(`${API}/builder/extract-resume`, { method:'POST', body:formData })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Extraction failed')
      onExtracted(data.data)
      setDone(true)
    } catch(e) { setError('Could not read resume: ' + e.message) }
    setUploading(false)
  }

  return (
    <div style={{marginBottom:'1.25rem'}}>
      <div style={{fontSize:'13px',fontWeight:600,color:'#eef0ff',marginBottom:'.5rem',display:'flex',alignItems:'center',gap:'.4rem'}}>
        <i className="ti ti-upload" style={{fontSize:'15px',color:'#00e5a0'}} aria-hidden="true"/>
        {label}
      </div>
      {!done ? (
        <>
          <div onClick={()=>fileRef.current?.click()}
            style={{border:`2px dashed ${file?'rgba(0,229,160,0.5)':'rgba(255,255,255,0.1)'}`,borderRadius:'12px',padding:'1.25rem',textAlign:'center',cursor:'pointer',background:file?'rgba(0,229,160,0.03)':'transparent',transition:'all .2s',marginBottom:'.65rem'}}
            onMouseEnter={e=>{ if(!file) e.currentTarget.style.borderColor='rgba(255,255,255,0.2)' }}
            onMouseLeave={e=>{ if(!file) e.currentTarget.style.borderColor='rgba(255,255,255,0.1)' }}>
            <input ref={fileRef} type='file' accept='.pdf,.doc,.docx' style={{display:'none'}} onChange={e=>{const f=e.target.files[0]; if(f){setFile(f);handleUpload(f)}}}/>
            <div style={{width:'36px',height:'36px',borderRadius:'9px',background:file?'rgba(0,229,160,0.1)':'rgba(255,255,255,0.04)',border:`0.5px solid ${file?'rgba(0,229,160,0.3)':'rgba(255,255,255,0.08)'}`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto .5rem'}}>
              {uploading
                ? <i className="ti ti-loader" style={{fontSize:'18px',color:'#00e5a0',animation:'spin .8s linear infinite'}} aria-hidden="true"/>
                : <i className={`ti ${file?'ti-circle-check':'ti-file-upload'}`} style={{fontSize:'18px',color:file?'#00e5a0':'#4a5168'}} aria-hidden="true"/>
              }
            </div>
            {uploading
              ? <div style={{fontSize:'12px',color:'#00e5a0',fontWeight:600}}>Extracting your resume data...</div>
              : file
                ? <><div style={{fontSize:'12px',fontWeight:600,color:'#00e5a0'}}>{file.name}</div><div style={{fontSize:'10px',color:'#4a5168',marginTop:'2px'}}>{(file.size/1024).toFixed(0)} KB · Auto-extracting...</div></>
                : <><div style={{fontSize:'12px',fontWeight:600,color:'var(--text,#eef0ff)',marginBottom:'2px'}}>Drop resume here or click to browse</div><div style={{fontSize:'11px',color:'#4a5168'}}>PDF, DOC, DOCX · All fields will be auto-filled</div></>
            }
          </div>
          {error && <div style={{display:'flex',alignItems:'center',gap:'.4rem',padding:'.55rem .8rem',background:'rgba(255,77,77,0.08)',border:'0.5px solid rgba(255,77,77,0.2)',borderRadius:'8px',fontSize:'12px',color:'#ff6b6b'}}>
            <i className="ti ti-alert-circle" style={{fontSize:'13px',flexShrink:0}} aria-hidden="true"/>{error}
          </div>}
        </>
      ) : (
        <div style={{display:'flex',alignItems:'center',gap:'.6rem',padding:'.65rem 1rem',background:'rgba(0,229,160,0.06)',border:'0.5px solid rgba(0,229,160,0.2)',borderRadius:'10px'}}>
          <i className="ti ti-circle-check" style={{fontSize:'18px',color:'#00e5a0',flexShrink:0}} aria-hidden="true"/>
          <div style={{flex:1}}>
            <div style={{fontSize:'13px',fontWeight:600,color:'#00e5a0'}}>Resume data loaded</div>
            <div style={{fontSize:'11px',color:'#8b93b0',marginTop:'2px'}}>All fields pre-filled — review and edit below</div>
          </div>
          <button onClick={()=>{setFile(null);setDone(false);setError('')}} style={{background:'none',border:'none',color:'#4a5168',cursor:'pointer',fontSize:'12px',fontFamily:'Inter,sans-serif',display:'flex',alignItems:'center',gap:'.25rem'}}>
            <i className="ti ti-refresh" style={{fontSize:'13px'}} aria-hidden="true"/> Change
          </button>
        </div>
      )}
    </div>
  )
}

// ── COVER LETTER RESULT ───────────────────────────────────────────
function CoverLetterResult({ coverLetter, name, company, jobTitle, onBack, onRegenerate }) {
  const download = async (endpoint, filename) => {
    try {
      const res = await fetch(`${API}/builder/${endpoint}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cover_letter:coverLetter,name,company,job_title:jobTitle})})
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href=url; a.download=filename; a.click()
      URL.revokeObjectURL(url)
    } catch(e) { alert('Download failed: '+e.message) }
  }

  return (
    <div style={S.page}><div style={S.wrap}>
      <div style={{display:'flex',alignItems:'center',gap:'.6rem',padding:'1rem',background:'rgba(124,111,247,0.06)',border:'0.5px solid rgba(124,111,247,0.2)',borderRadius:'12px',marginBottom:'1.25rem',flexWrap:'wrap'}}>
        <div style={{width:'36px',height:'36px',borderRadius:'9px',background:'rgba(124,111,247,0.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <i className="ti ti-mail-check" style={{fontSize:'19px',color:'#7c6ff7'}} aria-hidden="true"/>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:'14px',fontWeight:700,color:'#eef0ff'}}>Cover letter ready</div>
          <div style={{fontSize:'12px',color:'#8b93b0'}}>{jobTitle&&company?`${jobTitle} at ${company}`:'Your cover letter'}</div>
        </div>
        <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap'}}>
          <button style={S.btnPurple} onClick={()=>download('download-cover-letter-pdf',`${(name||'Cover').replace(/\s+/g,'_')}_Cover_Letter.pdf`)}>
            <i className="ti ti-download" aria-hidden="true"/> PDF
          </button>
          <button style={S.btnGhost} onClick={()=>download('download-cover-letter-docx',`${(name||'Cover').replace(/\s+/g,'_')}_Cover_Letter.docx`)}>
            <i className="ti ti-download" aria-hidden="true"/> DOCX
          </button>
          <button style={S.btnGhost} onClick={()=>{navigator.clipboard.writeText(coverLetter);alert('Copied!')}}>
            <i className="ti ti-copy" aria-hidden="true"/> Copy
          </button>
        </div>
      </div>

      <div style={{background:'#fff',borderRadius:'16px',padding:'2rem',boxShadow:'0 8px 32px rgba(0,0,0,0.3)',fontFamily:'Arial,sans-serif',marginBottom:'1.25rem'}}>
        <div style={{borderBottom:'2px solid #7c6ff7',paddingBottom:'1rem',marginBottom:'1.25rem'}}>
          <div style={{fontSize:'20px',fontWeight:900,color:'#1a1a1a'}}>{name}</div>
          {company&&jobTitle&&<div style={{fontSize:'13px',color:'#7c6ff7',marginTop:'3px'}}>Application for {jobTitle} — {company}</div>}
        </div>
        {coverLetter.split('\n\n').map((para,i)=>(
          <p key={i} style={{fontSize:'13px',color:'#333',lineHeight:1.75,marginBottom:'1rem',whiteSpace:'pre-wrap'}}>{para}</p>
        ))}
      </div>

      <div style={{display:'flex',gap:'.75rem',flexWrap:'wrap'}}>
        <button style={S.btnGhost} onClick={onBack}><i className="ti ti-arrow-left" aria-hidden="true"/> Back</button>
        <button style={S.btnGhost} onClick={onRegenerate}><i className="ti ti-refresh" aria-hidden="true"/> Regenerate</button>
        <button style={S.btnPurple} onClick={()=>download('download-cover-letter-pdf',`${(name||'Cover').replace(/\s+/g,'_')}_Cover_Letter.pdf`)}>
          <i className="ti ti-download" aria-hidden="true"/> Download PDF
        </button>
      </div>
    </div></div>
  )
}

// ── COVER LETTER ONLY PAGE (upload resume only, no manual) ────────
function CoverLetterOnlyPage() {
  const [extractedData, setExtractedData] = useState(null)
  const [company, setCompany]   = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [jobDesc, setJobDesc]   = useState('')
  const [highlight, setHighlight] = useState('')
  const [tone, setTone]         = useState('Professional')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [coverLetter, setCoverLetter] = useState('')
  const [showResult, setShowResult] = useState(false)

  const generate = async () => {
    if (!extractedData) { setError('Please upload your resume first.'); return }
    if (!company || !jobTitle) { setError('Please enter company name and job title.'); return }
    setLoading(true); setError('')
    try {
      const skills = [...(extractedData.technical_skills||[]),...(extractedData.soft_skills||[])].slice(0,12).join(', ')
      const res = await fetch(`${API}/builder/generate-cover-letter-scratch`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ full_name:extractedData.full_name||'', role:extractedData.target_role||'', skills, company, job_title:jobTitle, job_description:jobDesc, highlight, tone })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Generation failed')
      setCoverLetter(data.cover_letter); setShowResult(true)
    } catch(e) { setError('Error: ' + e.message) }
    setLoading(false)
  }

  if (showResult) return (
    <CoverLetterResult
      coverLetter={coverLetter}
      name={extractedData?.full_name||''}
      company={company} jobTitle={jobTitle}
      onBack={()=>setShowResult(false)}
      onRegenerate={()=>{setShowResult(false);generate()}}
    />
  )

  return (
    <div style={S.page}><div style={S.wrap}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',gap:'.65rem',marginBottom:'1.5rem'}}>
        <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'rgba(124,111,247,0.1)',border:'1px solid rgba(124,111,247,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <i className="ti ti-mail" style={{fontSize:'18px',color:'#7c6ff7'}} aria-hidden="true"/>
        </div>
        <div>
          <div style={{fontSize:'18px',fontWeight:800,color:'var(--text,#eef0ff)'}}>Cover letter generator</div>
          <div style={{fontSize:'12px',color:'var(--text2,#8b93b0)',marginTop:'2px'}}>Upload your resume — AI writes a tailored cover letter instantly</div>
        </div>
      </div>

      {/* Step 1: Upload resume */}
      <div style={{...S.card,marginBottom:'1rem'}}>
        <div style={S.secTitle}><i className="ti ti-upload" aria-hidden="true"/> Step 1 — Upload your resume</div>
        <ResumeUploadBox
          label="Upload resume to extract your profile"
          onExtracted={(data)=>setExtractedData(data)}
        />
        {extractedData && (
          <div style={{padding:'.75rem 1rem',background:'rgba(0,229,160,0.04)',border:'0.5px solid rgba(0,229,160,0.15)',borderRadius:'10px',marginTop:'.5rem'}}>
            <div style={{fontSize:'14px',fontWeight:700,color:'#eef0ff',marginBottom:'3px'}}>{extractedData.full_name}</div>
            <div style={{fontSize:'12px',color:'#8b93b0',marginBottom:'.5rem'}}>{extractedData.target_role} · {extractedData.email}</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:'.3rem'}}>
              {(extractedData.technical_skills||[]).slice(0,8).map(s=>(
                <span key={s} style={{fontSize:'10px',padding:'2px 8px',borderRadius:'20px',background:'rgba(0,229,160,0.1)',border:'0.5px solid rgba(0,229,160,0.2)',color:'#00e5a0'}}>{s}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Step 2: Job details */}
      <div style={{...S.card,marginBottom:'1rem',opacity:extractedData?1:0.5,pointerEvents:extractedData?'all':'none'}}>
        <div style={S.secTitle}><i className="ti ti-target" aria-hidden="true"/> Step 2 — Job details</div>
        <TonePicker tone={tone} setTone={setTone}/>
        <div style={S.row}>
          <Field label='Company name *' value={company} onChange={setCompany} placeholder='Google, Infosys...'/>
          <Field label='Job title *' value={jobTitle} onChange={setJobTitle} placeholder='Software Engineer...'/>
        </div>
        <div style={{marginBottom:'1rem'}}>
          <label style={S.label}>Job description (paste for best results)</label>
          <textarea style={{...S.input,height:'100px',resize:'vertical'}} value={jobDesc} onChange={e=>setJobDesc(e.target.value)} placeholder='Paste the job description here — AI will tailor the letter to match requirements...'/>
        </div>
        <div>
          <label style={S.label}>Anything specific to highlight? (optional)</label>
          <textarea style={{...S.input,height:'60px',resize:'vertical'}} value={highlight} onChange={e=>setHighlight(e.target.value)} placeholder='e.g. Mention my project X, emphasize leadership experience...'/>
        </div>
      </div>

      {error && <div style={{display:'flex',alignItems:'center',gap:'.4rem',padding:'.65rem .85rem',background:'rgba(255,77,77,0.08)',border:'0.5px solid rgba(255,77,77,0.2)',borderRadius:'8px',marginBottom:'1rem',fontSize:'12px',color:'#ff6b6b'}}>
        <i className="ti ti-alert-circle" style={{fontSize:'14px',flexShrink:0}} aria-hidden="true"/>{error}
      </div>}

      <button onClick={generate} disabled={!extractedData||loading}
        style={{...S.btnPurple,width:'100%',opacity:(!extractedData||loading)?.5:1,cursor:(!extractedData||loading)?'not-allowed':'pointer'}}>
        {loading
          ? <><i className="ti ti-loader" style={{fontSize:'15px',animation:'spin .8s linear infinite'}} aria-hidden="true"/> Generating cover letter...</>
          : <><i className="ti ti-mail" style={{fontSize:'15px'}} aria-hidden="true"/> Generate cover letter</>
        }
      </button>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div></div>
  )
}

// ── MAIN RESUME BUILDER ───────────────────────────────────────────
export default function ResumeBuilder() {
  const navigate = useNavigate()
  const [tab, setTab]           = useState('resume')
  const [step, setStep]         = useState(0)
  const [template, setTemplate] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [loadingText, setLoadingText] = useState('')
  const [result, setResult]     = useState(null)
  const [error, setError]       = useState('')
  const [showCLForm, setShowCLForm]   = useState(false)
  const [coverLetter, setCoverLetter] = useState('')
  const [showCLResult, setShowCLResult] = useState(false)
  const [clCompany, setClCompany] = useState('')
  const [clJobTitle, setClJobTitle] = useState('')

  // Form state
  const [form, setForm] = useState({ full_name:'', email:'', phone:'', location:'', linkedin:'', github:'', portfolio:'', target_role:'', years_experience:'', summary:'' })
  const [experiences, setExperiences] = useState([empty_exp()])
  const [education, setEducation]     = useState([empty_edu()])
  const [techSkills, setTechSkills]   = useState('')
  const [softSkills, setSoftSkills]   = useState('')
  const [projects, setProjects]       = useState([empty_proj()])
  const [certifications, setCertifications] = useState('')
  const [languages, setLanguages]     = useState('')

  const upd = (k,v) => setForm(f=>({...f,[k]:v}))
  const updExp = (i,k,v) => setExperiences(ex=>ex.map((e,idx)=>idx===i?{...e,[k]:v}:e))
  const updExpBullet = (i,bi,v) => setExperiences(ex=>ex.map((e,idx)=>idx===i?{...e,bullets:e.bullets.map((b,bIdx)=>bIdx===bi?v:b)}:e))
  const updEdu = (i,k,v) => setEducation(ed=>ed.map((e,idx)=>idx===i?{...e,[k]:v}:e))
  const updProj = (i,k,v) => setProjects(ps=>ps.map((p,idx)=>idx===i?{...p,[k]:v}:p))

  // Pre-fill from uploaded resume
  const prefillFromResume = (data) => {
    if (!data) return
    setForm({
      full_name: data.full_name || '',
      email: data.email || '',
      phone: data.phone || '',
      location: data.location || '',
      linkedin: data.linkedin || '',
      github: data.github || '',
      portfolio: data.portfolio || '',
      target_role: data.target_role || '',
      years_experience: data.years_experience || '',
      summary: data.summary || '',
    })
    if (data.experiences?.length) {
      setExperiences(data.experiences.map(e=>({
        company: e.company||'', role: e.role||e.title||'',
        start: e.start||'', end: e.end||'Present',
        bullets: e.bullets?.length ? e.bullets : ['','','']
      })))
    }
    if (data.education?.length) {
      setEducation(data.education.map(e=>({
        institution: e.institution||'', degree: e.degree||'',
        field: e.field||'', year: e.year||'', gpa: e.gpa||''
      })))
    }
    if (data.technical_skills?.length) setTechSkills(data.technical_skills.join(', '))
    if (data.soft_skills?.length) setSoftSkills(data.soft_skills.join(', '))
    if (data.projects?.length) {
      setProjects(data.projects.map(p=>({ name:p.name||'', description:p.description||'', tech:p.tech||'' })))
    }
    if (data.certifications?.length) setCertifications(Array.isArray(data.certifications) ? data.certifications.join(', ') : data.certifications)
    if (data.languages?.length) setLanguages(Array.isArray(data.languages) ? data.languages.join(', ') : data.languages)
  }

  const STEPS = ['Template','Profile source','Personal','Experience','Education','Skills','Extras']

  const StepBar = () => (
    <div style={{display:'flex',alignItems:'center',gap:'.3rem',marginBottom:'1.5rem',flexWrap:'wrap'}}>
      {STEPS.map((st,i)=>(
        <div key={i} style={{display:'flex',alignItems:'center',gap:'.3rem'}}>
          <div style={{padding:'.3rem .7rem',borderRadius:'20px',fontSize:'11px',fontWeight:700,background:i===step?'rgba(0,229,160,0.15)':i<step?'rgba(0,229,160,0.08)':'rgba(255,255,255,0.04)',color:i===step?'#00e5a0':i<step?'#00c484':'var(--text3,#4a5168)',border:`1px solid ${i===step?'rgba(0,229,160,0.4)':i<step?'rgba(0,229,160,0.2)':'rgba(255,255,255,0.07)'}`}}>
            {i<step&&<i className="ti ti-check" style={{fontSize:'10px',marginRight:'3px'}} aria-hidden="true"/>}{st}
          </div>
          {i<STEPS.length-1&&<div style={{width:'12px',height:'1px',background:i<step?'#00e5a0':'rgba(255,255,255,0.1)'}}/>}
        </div>
      ))}
    </div>
  )

  const NavBtns = ({onNext,nextLabel,nextIcon='ti-arrow-right',onBack,disabled}) => (
    <div style={{display:'flex',gap:'.75rem',marginTop:'1.5rem'}}>
      {onBack&&<button style={S.btnGhost} onClick={onBack}><i className="ti ti-arrow-left" aria-hidden="true"/> Back</button>}
      <button style={{...S.btn,opacity:disabled?.5:1,cursor:disabled?'not-allowed':'pointer'}} onClick={onNext} disabled={disabled}>
        {nextLabel||'Next'} <i className={`ti ${nextIcon}`} aria-hidden="true"/>
      </button>
    </div>
  )

  async function generate() {
    setLoading(true); setError('')
    const texts = ['Analyzing your details...','AI optimizing for ATS...','Writing powerful bullets...','Finalizing your resume...']
    let ti=0; setLoadingText(texts[0])
    const iv = setInterval(()=>{ti=(ti+1)%texts.length;setLoadingText(texts[ti])},2500)
    try {
      const payload = {
        template:template.id,...form,
        experiences:experiences.filter(e=>e.company||e.role),
        education:education.filter(e=>e.institution||e.degree),
        technical_skills:techSkills.split(',').map(s=>s.trim()).filter(Boolean),
        soft_skills:softSkills.split(',').map(s=>s.trim()).filter(Boolean),
        projects:projects.filter(p=>p.name),
        certifications:certifications.split(',').map(s=>s.trim()).filter(Boolean),
        languages:languages.split(',').map(s=>s.trim()).filter(Boolean),
      }
      const res = await fetch(`${API}/builder/generate`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      const data = await res.json()
      if (!data.success) throw new Error(data.error||'Generation failed')
      setResult(data.resume); setStep(7)
    } catch(e) { setError('Error: '+e.message) }
    clearInterval(iv); setLoading(false)
  }

  async function downloadFile(endpoint, filename) {
    try {
      const res = await fetch(`${API}/builder/${endpoint}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({resume:result,template:template?.id||'modern'})})
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a'); a.href=url; a.download=filename; a.click()
      URL.revokeObjectURL(url)
    } catch(e) { alert(`Download failed: ${e.message}`) }
  }

  const TabBar = () => (
    <div style={{display:'flex',gap:'.5rem',marginBottom:'1.5rem'}}>
      {[
        {id:'resume', icon:'ti-file-text', label:'Resume builder'},
        {id:'cl-only',icon:'ti-mail',      label:'Cover letter only'},
      ].map(t=>(
        <button key={t.id} onClick={()=>{setTab(t.id);setStep(0);setResult(null);setShowCLForm(false);setShowCLResult(false)}}
          style={{display:'flex',alignItems:'center',gap:'.4rem',padding:'.5rem 1.1rem',borderRadius:'20px',border:`1px solid ${tab===t.id?'rgba(0,229,160,0.4)':'rgba(255,255,255,0.1)'}`,background:tab===t.id?'rgba(0,229,160,0.1)':'rgba(255,255,255,0.03)',color:tab===t.id?'#00e5a0':'var(--text2,#8b93b0)',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
          <i className={`ti ${t.icon}`} style={{fontSize:'15px'}} aria-hidden="true"/>
          {t.label}
        </button>
      ))}
    </div>
  )

  // Route: Cover letter only tab
  if (tab==='cl-only') return <div style={S.page}><div style={S.wrap}><TabBar/><CoverLetterOnlyPage/></div></div>

  // Route: Cover letter after resume generation
  if (showCLForm && result && !showCLResult) {
    const generateCL = async (company, jobTitle, jobDesc, highlight, tone) => {
      try {
        const res = await fetch(`${API}/builder/generate-cover-letter`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({resume:result,company,job_title:jobTitle,job_description:jobDesc,highlight,tone})})
        const data = await res.json()
        if (!data.success) throw new Error(data.error||'Failed')
        setCoverLetter(data.cover_letter); setClCompany(company); setClJobTitle(jobTitle); setShowCLForm(false); setShowCLResult(true)
      } catch(e) { alert('Error: '+e.message) }
    }
    return (
      <div style={S.page}><div style={S.wrap}>
        <TabBar/>
        <CLFormAfterResume onBack={()=>setShowCLForm(false)} onGenerate={generateCL} resumeName={result.full_name}/>
      </div></div>
    )
  }
  if (showCLResult && result) return (
    <div style={S.page}><div style={S.wrap}>
      <TabBar/>
      <CoverLetterResult coverLetter={coverLetter} name={result.full_name||''} company={clCompany} jobTitle={clJobTitle}
        onBack={()=>setShowCLResult(false)} onRegenerate={()=>{setShowCLResult(false);setShowCLForm(true)}}/>
    </div></div>
  )

  // Resume result page (step 7)
  if (step===7 && result) {
    const tColors={modern:[0,196,132],professional:[30,58,95],executive:[26,26,46],minimal:[45,55,72],creative:[124,58,237],healthcare:[8,145,178]}
    const [r,g,b]=tColors[template?.id]||[0,196,132]
    const accentHex=`rgb(${r},${g},${b})`
    const name=result.full_name?.replace(/\s+/g,'_')||'Resume'
    return (
      <div style={S.page}><div style={S.wrap}>
        <TabBar/><StepBar/>
        <div style={{display:'flex',alignItems:'center',gap:'1rem',padding:'1rem',background:'rgba(0,229,160,0.06)',border:'0.5px solid rgba(0,229,160,0.2)',borderRadius:'12px',marginBottom:'1.25rem',flexWrap:'wrap'}}>
          <div style={{width:'38px',height:'38px',borderRadius:'10px',background:'rgba(0,229,160,0.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <i className="ti ti-circle-check" style={{fontSize:'22px',color:'#00e5a0'}} aria-hidden="true"/>
          </div>
          <div style={{flex:1}}><div style={{fontSize:'15px',fontWeight:700,color:'#eef0ff'}}>Resume generated!</div><div style={{fontSize:'12px',color:'#8b93b0'}}>Template: {template?.name} · ATS score: {template?.ats}%</div></div>
          <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap'}}>
            <button style={S.btn} onClick={()=>downloadFile('download-pdf',`${name}_Resume.pdf`)}><i className="ti ti-download" aria-hidden="true"/> PDF</button>
            <button style={S.btnGhost} onClick={()=>downloadFile('download-docx',`${name}_Resume.docx`)}><i className="ti ti-download" aria-hidden="true"/> DOCX</button>
          </div>
        </div>
        {result.ats_keywords?.length>0 && (
          <div style={{...S.card,marginBottom:'1rem'}}>
            <div style={{display:'flex',alignItems:'center',gap:'.4rem',fontSize:'11px',fontWeight:700,color:'#4a5168',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.5rem'}}>
              <i className="ti ti-target" style={{fontSize:'13px',color:'#00e5a0'}} aria-hidden="true"/>ATS keywords
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:'.35rem'}}>
              {result.ats_keywords.map(k=><span key={k} style={{fontSize:'11px',padding:'3px 10px',borderRadius:'20px',background:'rgba(0,229,160,0.1)',border:'0.5px solid rgba(0,229,160,0.25)',color:'#00e5a0',fontWeight:600}}>{k}</span>)}
            </div>
          </div>
        )}
        <div style={{padding:'1rem',background:'rgba(124,111,247,0.06)',border:'0.5px solid rgba(124,111,247,0.25)',borderRadius:'14px',marginBottom:'1.25rem',display:'flex',alignItems:'center',gap:'1rem',flexWrap:'wrap'}}>
          <div style={{width:'38px',height:'38px',borderRadius:'10px',background:'rgba(124,111,247,0.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <i className="ti ti-mail" style={{fontSize:'20px',color:'#7c6ff7'}} aria-hidden="true"/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:'14px',fontWeight:700,color:'#eef0ff',marginBottom:'3px'}}>Create a cover letter for this resume?</div>
            <div style={{fontSize:'12px',color:'#8b93b0'}}>AI uses your resume details to write a tailored professional cover letter.</div>
          </div>
          <div style={{display:'flex',gap:'.5rem'}}>
            <button style={S.btnPurple} onClick={()=>setShowCLForm(true)}><i className="ti ti-mail" aria-hidden="true"/> Create cover letter</button>
          </div>
        </div>
        <div style={{background:'#fff',borderRadius:'16px',overflow:'hidden',boxShadow:'0 8px 32px rgba(0,0,0,0.3)',fontFamily:'Arial,sans-serif',marginBottom:'1.25rem'}}>
          <div style={{background:accentHex,padding:'1.5rem 2rem'}}>
            <div style={{fontSize:'24px',fontWeight:900,color:'#fff',marginBottom:'.25rem'}}>{result.full_name}</div>
            <div style={{fontSize:'14px',color:'rgba(255,255,255,0.85)',marginBottom:'.5rem'}}>{result.target_role}</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:'1rem',fontSize:'12px',color:'rgba(255,255,255,0.75)'}}>
              {[result.email,result.phone,result.location].filter(Boolean).map((c,i)=><span key={i}>{c}</span>)}
            </div>
          </div>
          <div style={{padding:'1.5rem 2rem'}}>
            {result.professional_summary&&<div style={{marginBottom:'1.25rem'}}><div style={{fontSize:'11px',fontWeight:800,color:accentHex,textTransform:'uppercase',letterSpacing:'.08em',borderBottom:`2px solid ${accentHex}`,paddingBottom:'.3rem',marginBottom:'.6rem'}}>Professional summary</div><div style={{fontSize:'13px',color:'#444',lineHeight:1.7}}>{result.professional_summary}</div></div>}
            {result.experience?.length>0&&<div style={{marginBottom:'1.25rem'}}><div style={{fontSize:'11px',fontWeight:800,color:accentHex,textTransform:'uppercase',letterSpacing:'.08em',borderBottom:`2px solid ${accentHex}`,paddingBottom:'.3rem',marginBottom:'.75rem'}}>Work experience</div>{result.experience.map((exp,i)=><div key={i} style={{marginBottom:'1rem'}}><div style={{display:'flex',justifyContent:'space-between'}}><div><div style={{fontSize:'14px',fontWeight:700,color:'#1a1a1a'}}>{exp.role}</div><div style={{fontSize:'12px',color:accentHex,fontWeight:600}}>{exp.company}</div></div><div style={{fontSize:'11px',color:'#888'}}>{exp.start} - {exp.end}</div></div><ul style={{margin:'.4rem 0 0 1.25rem',padding:0}}>{exp.bullets?.filter(Boolean).map((b,bi)=><li key={bi} style={{fontSize:'12px',color:'#555',marginBottom:'.2rem',lineHeight:1.5}}>{b}</li>)}</ul></div>)}</div>}
            {result.technical_skills?.length>0&&<div style={{marginBottom:'1.25rem'}}><div style={{fontSize:'11px',fontWeight:800,color:accentHex,textTransform:'uppercase',letterSpacing:'.08em',borderBottom:`2px solid ${accentHex}`,paddingBottom:'.3rem',marginBottom:'.6rem'}}>Technical skills</div><div style={{fontSize:'13px',color:'#555',lineHeight:1.8}}>{result.technical_skills.join('  ·  ')}</div></div>}
            {result.education?.length>0&&<div style={{marginBottom:'1.25rem'}}><div style={{fontSize:'11px',fontWeight:800,color:accentHex,textTransform:'uppercase',letterSpacing:'.08em',borderBottom:`2px solid ${accentHex}`,paddingBottom:'.3rem',marginBottom:'.75rem'}}>Education</div>{result.education.map((edu,i)=><div key={i} style={{display:'flex',justifyContent:'space-between',marginBottom:'.5rem'}}><div><div style={{fontSize:'14px',fontWeight:700,color:'#1a1a1a'}}>{edu.degree} in {edu.field}</div><div style={{fontSize:'12px',color:'#666'}}>{edu.institution}</div></div><div style={{fontSize:'11px',color:'#888'}}>{edu.year}</div></div>)}</div>}
          </div>
        </div>
        <div style={{display:'flex',gap:'.75rem',flexWrap:'wrap'}}>
          <button style={S.btnGhost} onClick={()=>{setStep(0);setResult(null);setTemplate(null)}}><i className="ti ti-refresh" aria-hidden="true"/> Start over</button>
          <button style={S.btnGhost} onClick={()=>setStep(6)}><i className="ti ti-arrow-left" aria-hidden="true"/> Edit</button>
          <button style={S.btn} onClick={()=>downloadFile('download-pdf',`${name}_Resume.pdf`)}><i className="ti ti-download" aria-hidden="true"/> Download PDF</button>
          <button style={S.btnGhost} onClick={()=>downloadFile('download-docx',`${name}_Resume.docx`)}><i className="ti ti-download" aria-hidden="true"/> Download DOCX</button>
        </div>
      </div></div>
    )
  }

  return (
    <div style={S.page}><div style={S.wrap}>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <TabBar/><StepBar/>

      {/* STEP 0: Choose template */}
      {step===0 && <>
        <div style={{display:'flex',alignItems:'center',gap:'.65rem',marginBottom:'1.25rem'}}>
          <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'rgba(0,229,160,0.1)',border:'1px solid rgba(0,229,160,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <i className="ti ti-layout-2" style={{fontSize:'18px',color:'#00e5a0'}} aria-hidden="true"/>
          </div>
          <div>
            <div style={{fontSize:'20px',fontWeight:800,color:'var(--text,#eef0ff)'}}>Choose your ATS template</div>
            <div style={{fontSize:'13px',color:'var(--text2,#8b93b0)'}}>All templates are 100% ATS-friendly</div>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'1.25rem',marginBottom:'1.5rem'}}>
          {TEMPLATES.map(t=>{
            const selected=template?.id===t.id
            return (
              <div key={t.id} onClick={()=>setTemplate(t)} style={{border:`2px solid ${selected?'#00e5a0':'rgba(255,255,255,0.07)'}`,borderRadius:'14px',cursor:'pointer',transition:'all .2s',transform:selected?'translateY(-4px)':'none',boxShadow:selected?'0 12px 32px rgba(0,229,160,0.2)':'none',overflow:'hidden',background:'var(--bg3,#141828)'}}>
                <div style={{height:'200px',overflow:'hidden',position:'relative',borderBottom:`2px solid ${selected?'#00e5a0':'rgba(255,255,255,0.07)'}`,background:'#fff'}}>
                  <t.Preview/>
                  {selected&&<div style={{position:'absolute',top:'8px',right:'8px',display:'flex',alignItems:'center',gap:'.3rem',background:'#00e5a0',borderRadius:'20px',padding:'2px 10px',fontSize:'10px',fontWeight:700,color:'#080c18'}}><i className="ti ti-check" style={{fontSize:'11px'}} aria-hidden="true"/> Selected</div>}
                </div>
                <div style={{padding:'1rem'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'.35rem'}}>
                    <div style={{fontSize:'13px',fontWeight:700,color:'var(--text,#eef0ff)'}}>{t.name}</div>
                    <div style={{fontSize:'10px',fontWeight:700,color:'#00e5a0',background:'rgba(0,229,160,0.1)',border:'1px solid rgba(0,229,160,0.25)',borderRadius:'20px',padding:'1px 7px'}}>{t.ats}% ATS</div>
                  </div>
                  <div style={{fontSize:'11px',color:'var(--text2,#8b93b0)',marginBottom:'.5rem',lineHeight:1.4}}>{t.desc}</div>
                  <div style={{display:'flex',gap:'.25rem',flexWrap:'wrap'}}>{t.tags.map(tag=><span key={tag} style={{fontSize:'9px',padding:'2px 6px',borderRadius:'10px',background:'rgba(0,229,160,0.06)',border:'1px solid rgba(0,229,160,0.15)',color:'#00e5a0'}}>{tag}</span>)}</div>
                </div>
              </div>
            )
          })}
        </div>
        <NavBtns onNext={()=>setStep(1)} nextLabel='Use this template' disabled={!template}/>
      </>}

      {/* STEP 1: Profile source — Upload OR fill manually */}
      {step===1 && <>
        <div style={{...S.card}}>
          <div style={S.secTitle}><i className="ti ti-user" aria-hidden="true"/> How do you want to fill your profile?</div>
          <p style={{fontSize:'13px',color:'#8b93b0',marginBottom:'1.25rem',lineHeight:1.6}}>
            Upload an existing resume to auto-fill all fields, or start fresh and fill everything manually.
          </p>

          {/* Upload option */}
          <ResumeUploadBox
            label="Upload existing resume — auto-fill all fields"
            onExtracted={(data)=>{ prefillFromResume(data); setStep(2) }}
          />

          {/* Divider */}
          <div style={{display:'flex',alignItems:'center',gap:'.75rem',margin:'1rem 0'}}>
            <div style={{flex:1,height:'0.5px',background:'rgba(255,255,255,0.07)'}}/>
            <span style={{fontSize:'11px',color:'#4a5168',flexShrink:0}}>or start from scratch</span>
            <div style={{flex:1,height:'0.5px',background:'rgba(255,255,255,0.07)'}}/>
          </div>

          <button onClick={()=>setStep(2)} style={{...S.btnGhost,width:'100%'}}>
            <i className="ti ti-pencil" aria-hidden="true"/> Fill manually
          </button>
        </div>
        <NavBtns onBack={()=>setStep(0)} onNext={()=>setStep(2)} nextLabel='Skip & fill manually'/>
      </>}

      {/* STEP 2: Personal */}
      {step===2 && <>
        <div style={S.card}>
          <div style={S.secTitle}><i className="ti ti-user" aria-hidden="true"/> Personal information</div>
          <div style={S.row}><Field label='Full name *' value={form.full_name} onChange={v=>upd('full_name',v)} placeholder='John Smith'/><Field label='Target role *' value={form.target_role} onChange={v=>upd('target_role',v)} placeholder='Software Engineer'/></div>
          <div style={S.row}><Field label='Email *' value={form.email} onChange={v=>upd('email',v)} placeholder='john@email.com' type='email'/><Field label='Phone *' value={form.phone} onChange={v=>upd('phone',v)} placeholder='+91 98765 43210'/></div>
          <div style={S.row}><Field label='Location *' value={form.location} onChange={v=>upd('location',v)} placeholder='Bangalore, India'/><Field label='Years of experience' value={form.years_experience} onChange={v=>upd('years_experience',v)} placeholder='3'/></div>
          <div style={S.row}><Field label='LinkedIn URL' value={form.linkedin} onChange={v=>upd('linkedin',v)} placeholder='linkedin.com/in/yourname'/><Field label='GitHub URL' value={form.github} onChange={v=>upd('github',v)} placeholder='github.com/yourname'/></div>
          <Field label='Portfolio / website' value={form.portfolio} onChange={v=>upd('portfolio',v)} placeholder='yoursite.dev'/>
          <div><label style={S.label}>Brief summary (AI will enhance)</label><textarea style={{...S.input,height:'80px',resize:'vertical'}} value={form.summary} onChange={e=>upd('summary',e.target.value)} placeholder='Passionate software engineer...'/></div>
        </div>
        <NavBtns onBack={()=>setStep(1)} onNext={()=>setStep(3)} disabled={!form.full_name||!form.email||!form.phone||!form.target_role}/>
      </>}

      {/* STEP 3: Experience */}
      {step===3 && <>
        <div style={S.card}>
          <div style={S.secTitle}><i className="ti ti-briefcase" aria-hidden="true"/> Work experience</div>
          <div style={{display:'flex',alignItems:'center',gap:'.4rem',fontSize:'11px',color:'var(--text2,#8b93b0)',marginBottom:'1rem',padding:'.6rem .85rem',background:'rgba(0,229,160,0.05)',border:'0.5px solid rgba(0,229,160,0.15)',borderRadius:'8px'}}>
            <i className="ti ti-bulb" style={{fontSize:'14px',color:'#00e5a0',flexShrink:0}} aria-hidden="true"/>
            Add specific numbers and metrics — AI will enhance them for maximum ATS impact.
          </div>
          {experiences.map((exp,i)=>(
            <div key={i} style={{marginBottom:'1.25rem',padding:'1rem',background:'rgba(255,255,255,0.02)',border:'0.5px solid rgba(255,255,255,0.06)',borderRadius:'10px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'.75rem'}}>
                <div style={{fontSize:'12px',fontWeight:700,color:'#00e5a0'}}>Experience {i+1}</div>
                {experiences.length>1&&<button onClick={()=>setExperiences(ex=>ex.filter((_,idx)=>idx!==i))} style={{display:'flex',alignItems:'center',gap:'.25rem',background:'none',border:'none',color:'#ff4d6d',cursor:'pointer',fontSize:'12px',fontFamily:'Inter,sans-serif'}}><i className="ti ti-trash" style={{fontSize:'13px'}} aria-hidden="true"/> Remove</button>}
              </div>
              <div style={S.row}><Field label='Job title *' value={exp.role} onChange={v=>updExp(i,'role',v)} placeholder='Software Engineer'/><Field label='Company *' value={exp.company} onChange={v=>updExp(i,'company',v)} placeholder='Google'/></div>
              <div style={S.row}><DateField label='Start date' value={exp.start} onChange={v=>updExp(i,'start',v)}/><DateField label='End date' value={exp.end} onChange={v=>updExp(i,'end',v)}/></div>
              <label style={S.label}>Key achievements</label>
              {exp.bullets.map((b,bi)=>(
                <div key={bi} style={{display:'flex',gap:'.5rem',marginBottom:'.4rem',alignItems:'center'}}>
                  <i className="ti ti-point-filled" style={{fontSize:'10px',color:'#00e5a0',flexShrink:0}} aria-hidden="true"/>
                  <input style={{...S.input,marginBottom:0}} value={b} onChange={e=>updExpBullet(i,bi,e.target.value)} placeholder={`Achievement ${bi+1} with metrics`}/>
                </div>
              ))}
              <button onClick={()=>updExp(i,'bullets',[...exp.bullets,''])} style={{display:'flex',alignItems:'center',gap:'.3rem',fontSize:'11px',color:'#00e5a0',background:'none',border:'none',cursor:'pointer',marginTop:'.25rem',fontFamily:'Inter,sans-serif'}}><i className="ti ti-plus" style={{fontSize:'13px'}} aria-hidden="true"/> Add bullet</button>
            </div>
          ))}
          <button onClick={()=>setExperiences(ex=>[...ex,empty_exp()])} style={{...S.btnGhost,width:'100%'}}><i className="ti ti-plus" aria-hidden="true"/> Add another experience</button>
        </div>
        <NavBtns onBack={()=>setStep(2)} onNext={()=>setStep(4)}/>
      </>}

      {/* STEP 4: Education */}
      {step===4 && <>
        <div style={S.card}>
          <div style={S.secTitle}><i className="ti ti-school" aria-hidden="true"/> Education</div>
          {education.map((edu,i)=>(
            <div key={i} style={{marginBottom:'1.25rem',padding:'1rem',background:'rgba(255,255,255,0.02)',border:'0.5px solid rgba(255,255,255,0.06)',borderRadius:'10px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'.75rem'}}>
                <div style={{fontSize:'12px',fontWeight:700,color:'#00e5a0'}}>Education {i+1}</div>
                {education.length>1&&<button onClick={()=>setEducation(ed=>ed.filter((_,idx)=>idx!==i))} style={{display:'flex',alignItems:'center',gap:'.25rem',background:'none',border:'none',color:'#ff4d6d',cursor:'pointer',fontSize:'12px',fontFamily:'Inter,sans-serif'}}><i className="ti ti-trash" style={{fontSize:'13px'}} aria-hidden="true"/> Remove</button>}
              </div>
              <div style={S.row}><Field label='Institution *' value={edu.institution} onChange={v=>updEdu(i,'institution',v)} placeholder='IIT Bombay'/><Field label='Degree *' value={edu.degree} onChange={v=>updEdu(i,'degree',v)} placeholder="Bachelor's"/></div>
              <div style={S.row}>
                <Field label='Field of study *' value={edu.field} onChange={v=>updEdu(i,'field',v)} placeholder='Computer Science'/>
                <div><label style={S.label}>Graduation year</label><select style={{...S.input,cursor:'pointer'}} value={edu.year} onChange={e=>updEdu(i,'year',e.target.value)}><option value=''>Select year</option>{Array.from({length:30},(_,idx)=>(new Date().getFullYear()-idx).toString()).map(y=><option key={y} value={y}>{y}</option>)}</select></div>
              </div>
              <Field label='GPA / percentage (optional)' value={edu.gpa} onChange={v=>updEdu(i,'gpa',v)} placeholder='8.5 / 10 or 85%'/>
            </div>
          ))}
          <button onClick={()=>setEducation(ed=>[...ed,empty_edu()])} style={{...S.btnGhost,width:'100%'}}><i className="ti ti-plus" aria-hidden="true"/> Add another education</button>
        </div>
        <NavBtns onBack={()=>setStep(3)} onNext={()=>setStep(5)}/>
      </>}

      {/* STEP 5: Skills */}
      {step===5 && <>
        <div style={S.card}>
          <div style={S.secTitle}><i className="ti ti-tools" aria-hidden="true"/> Skills</div>
          <div style={{display:'flex',alignItems:'center',gap:'.4rem',fontSize:'11px',color:'var(--text2,#8b93b0)',marginBottom:'1rem',padding:'.6rem .85rem',background:'rgba(124,111,247,0.05)',border:'0.5px solid rgba(124,111,247,0.15)',borderRadius:'8px'}}>
            <i className="ti ti-bulb" style={{fontSize:'14px',color:'#7c6ff7',flexShrink:0}} aria-hidden="true"/>
            Separate each skill with a comma. Use exact tool names for better ATS matching.
          </div>
          <div style={{marginBottom:'1rem'}}>
            <label style={S.label}>Technical skills * (comma separated)</label>
            <textarea style={{...S.input,height:'90px',resize:'vertical'}} value={techSkills} onChange={e=>setTechSkills(e.target.value)} placeholder='Python, React, Node.js, PostgreSQL, Docker, AWS...'/>
          </div>
          <div style={{marginBottom:'1rem'}}>
            <label style={S.label}>Soft skills (comma separated)</label>
            <textarea style={{...S.input,height:'70px',resize:'vertical'}} value={softSkills} onChange={e=>setSoftSkills(e.target.value)} placeholder='Leadership, Communication, Problem Solving...'/>
          </div>
          <div style={{display:'flex',alignItems:'flex-start',gap:'.5rem',padding:'.75rem',background:'rgba(0,229,160,0.04)',border:'0.5px solid rgba(0,229,160,0.12)',borderRadius:'10px'}}>
            <i className="ti ti-target" style={{fontSize:'16px',color:'#00e5a0',flexShrink:0,marginTop:'1px'}} aria-hidden="true"/>
            <div><div style={{fontSize:'11px',fontWeight:700,color:'#00e5a0',marginBottom:'.25rem'}}>ATS tip</div><div style={{fontSize:'11px',color:'var(--text2,#8b93b0)'}}>Include skills from the job description you're targeting. ATS systems match exact keywords.</div></div>
          </div>
        </div>
        <NavBtns onBack={()=>setStep(4)} onNext={()=>setStep(6)} disabled={!techSkills.trim()}/>
      </>}

      {/* STEP 6: Extras */}
      {step===6 && <>
        <div style={S.card}>
          <div style={S.secTitle}><i className="ti ti-rocket" aria-hidden="true"/> Projects, certifications & more</div>
          <div style={{marginBottom:'1.25rem'}}>
            <div style={{fontSize:'13px',fontWeight:600,color:'var(--text,#eef0ff)',marginBottom:'.75rem',display:'flex',alignItems:'center',gap:'.4rem'}}>
              <i className="ti ti-code" style={{fontSize:'15px',color:'#7c6ff7'}} aria-hidden="true"/>Projects
            </div>
            {projects.map((proj,i)=>(
              <div key={i} style={{marginBottom:'1rem',padding:'1rem',background:'rgba(255,255,255,0.02)',border:'0.5px solid rgba(255,255,255,0.06)',borderRadius:'10px'}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'.5rem'}}>
                  <div style={{fontSize:'11px',fontWeight:700,color:'#7c6ff7'}}>Project {i+1}</div>
                  {projects.length>1&&<button onClick={()=>setProjects(ps=>ps.filter((_,idx)=>idx!==i))} style={{display:'flex',alignItems:'center',gap:'.25rem',background:'none',border:'none',color:'#ff4d6d',cursor:'pointer',fontSize:'12px',fontFamily:'Inter,sans-serif'}}><i className="ti ti-trash" style={{fontSize:'13px'}} aria-hidden="true"/> Remove</button>}
                </div>
                <Field label='Project name' value={proj.name} onChange={v=>updProj(i,'name',v)} placeholder='E-Commerce Platform'/>
                <Field label='Description' value={proj.description} onChange={v=>updProj(i,'description',v)} placeholder='Built a full-stack platform...'/>
                <Field label='Technologies used' value={proj.tech} onChange={v=>updProj(i,'tech',v)} placeholder='React, Node.js, MongoDB, AWS'/>
              </div>
            ))}
            <button onClick={()=>setProjects(ps=>[...ps,empty_proj()])} style={{...S.btnGhost,width:'100%',marginBottom:'1.25rem'}}><i className="ti ti-plus" aria-hidden="true"/> Add project</button>
          </div>
          <div style={{marginBottom:'1rem'}}>
            <label style={S.label}><i className="ti ti-certificate" style={{fontSize:'12px',marginRight:'.3rem'}} aria-hidden="true"/>Certifications (comma separated)</label>
            <textarea style={{...S.input,height:'60px',resize:'vertical'}} value={certifications} onChange={e=>setCertifications(e.target.value)} placeholder='AWS Solutions Architect, Google Cloud...'/>
          </div>
          <div>
            <label style={S.label}><i className="ti ti-language" style={{fontSize:'12px',marginRight:'.3rem'}} aria-hidden="true"/>Languages (comma separated)</label>
            <input style={S.input} value={languages} onChange={e=>setLanguages(e.target.value)} placeholder='English (Fluent), Hindi (Native)...'/>
          </div>
        </div>
        {error&&<div style={{marginTop:'1rem',padding:'.75rem',background:'rgba(255,77,77,0.08)',border:'0.5px solid rgba(255,77,77,0.2)',borderRadius:'8px',color:'#ff6b6b',fontSize:'12px',display:'flex',alignItems:'center',gap:'.5rem'}}><i className="ti ti-alert-circle" style={{fontSize:'15px'}} aria-hidden="true"/>{error}</div>}
        <NavBtns onBack={()=>setStep(5)} onNext={generate} nextLabel='Generate resume' nextIcon='ti-wand'/>
        {loading&&<LoadingOverlay text={loadingText}/>}
      </>}
    </div></div>
  )
}

// ── COVER LETTER FORM (after resume generation) ───────────────────
function CLFormAfterResume({ onBack, onGenerate, resumeName }) {
  const [company, setCompany]   = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [jobDesc, setJobDesc]   = useState('')
  const [highlight, setHighlight] = useState('')
  const [tone, setTone]         = useState('Professional')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handle = async () => {
    if (!company||!jobTitle) { setError('Please enter company name and job title.'); return }
    setLoading(true); setError('')
    await onGenerate(company, jobTitle, jobDesc, highlight, tone)
    setLoading(false)
  }

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:'.65rem',marginBottom:'1.25rem'}}>
        <div style={{width:'36px',height:'36px',borderRadius:'10px',background:'rgba(124,111,247,0.1)',border:'1px solid rgba(124,111,247,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <i className="ti ti-mail" style={{fontSize:'18px',color:'#7c6ff7'}} aria-hidden="true"/>
        </div>
        <div>
          <div style={{fontSize:'18px',fontWeight:800,color:'var(--text,#eef0ff)'}}>Create cover letter</div>
          <div style={{fontSize:'12px',color:'var(--text2,#8b93b0)',marginTop:'2px'}}>Using resume: <span style={{color:'#00e5a0'}}>{resumeName}</span></div>
        </div>
      </div>
      <div style={S.card}>
        <TonePicker tone={tone} setTone={setTone}/>
        <div style={S.row}>
          <Field label='Company name *' value={company} onChange={setCompany} placeholder='Google, Infosys...'/>
          <Field label='Job title *' value={jobTitle} onChange={setJobTitle} placeholder='Software Engineer...'/>
        </div>
        <div style={{marginBottom:'1rem'}}>
          <label style={S.label}>Job description (paste for best results)</label>
          <textarea style={{...S.input,height:'120px',resize:'vertical'}} value={jobDesc} onChange={e=>setJobDesc(e.target.value)} placeholder='Paste the job description here — AI will tailor the letter to match requirements...'/>
        </div>
        <div>
          <label style={S.label}>Anything specific to highlight? (optional)</label>
          <textarea style={{...S.input,height:'65px',resize:'vertical'}} value={highlight} onChange={e=>setHighlight(e.target.value)} placeholder='e.g. Mention my project X...'/>
        </div>
        {error&&<div style={{marginTop:'.75rem',display:'flex',alignItems:'center',gap:'.4rem',padding:'.6rem .85rem',background:'rgba(255,77,77,0.08)',border:'0.5px solid rgba(255,77,77,0.2)',borderRadius:'8px',fontSize:'12px',color:'#ff6b6b'}}><i className="ti ti-alert-circle" style={{fontSize:'14px'}} aria-hidden="true"/>{error}</div>}
      </div>
      <div style={{display:'flex',gap:'.75rem',marginTop:'1.25rem'}}>
        <button style={S.btnGhost} onClick={onBack}><i className="ti ti-arrow-left" aria-hidden="true"/> Back</button>
        <button style={{...S.btnPurple,flex:1,opacity:loading?.6:1}} onClick={handle} disabled={loading}>
          {loading?<><i className="ti ti-loader" style={{fontSize:'15px',animation:'spin .8s linear infinite'}} aria-hidden="true"/> Generating...</>:<><i className="ti ti-mail" style={{fontSize:'15px'}} aria-hidden="true"/> Generate cover letter</>}
        </button>
      </div>
    </div>
  )
}