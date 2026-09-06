import { useState, useRef, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const ROLES = [
  'Software Engineer','Frontend Developer','Backend Developer','Full Stack Developer',
  'Data Scientist','Data Analyst','Machine Learning Engineer','DevOps Engineer',
  'Product Manager','UI/UX Designer','Business Analyst','Cloud Architect',
  'Cybersecurity Analyst','Mobile Developer','QA Engineer',
  'Marketing Manager','Sales Executive','HR Manager','Finance Analyst',
  'Operations Manager','Healthcare Professional','Mechanical Engineer',
]

const COMPANIES = [
  'Google','Microsoft','Amazon','Meta','Apple','Netflix',
  'TCS','Infosys','Wipro','HCL','Tech Mahindra','Accenture',
  'Flipkart','Swiggy','Zomato','Razorpay','CRED','Zepto',
  'Startup (General)','MNC (General)','Any Company',
]

const INTERVIEW_MODES = [
  { id:'hr',        icon:'ti-user-heart',     label:'HR Round',            color:'#00e5a0', desc:'Behavioral, culture fit, tell me about yourself' },
  { id:'technical', icon:'ti-code',            label:'Technical',           color:'#3b82f6', desc:'Role-specific technical questions & deep dives' },
  { id:'salary',    icon:'ti-currency-rupee',  label:'Salary Negotiation',  color:'#f5a623', desc:'Offer discussion, counter-offers, market rates' },
  { id:'case',      icon:'ti-chart-dots',      label:'Case Study',          color:'#7c6ff7', desc:'Problem solving, frameworks, consulting style' },
  { id:'resume',    icon:'ti-file-text',       label:'Resume Walkthrough',  color:'#ec4899', desc:'Defend your CV, explain gaps, project deep dives' },
  { id:'stress',    icon:'ti-flame',           label:'Stress Interview',    color:'#ff4d6d', desc:'Pressure questions, tight timers, curveball traps' },
]

const LEVELS = ['Fresher (0-1 yr)','Junior (1-3 yrs)','Mid (3-6 yrs)','Senior (6-10 yrs)','Lead / Manager']

// ── RISK METER ────────────────────────────────────────────────────
function RiskMeter({ pct, color }) {
  const r = 54, cx = 64, cy = 64
  const circ = Math.PI * r  // half circle
  const dash = (pct / 100) * circ
  return (
    <svg width="128" height="72" viewBox="0 0 128 80">
      <path d={`M 10 70 A ${r} ${r} 0 0 1 118 70`} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="12" strokeLinecap="round"/>
      <path d={`M 10 70 A ${r} ${r} 0 0 1 118 70`} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`} style={{transition:'stroke-dasharray .8s cubic-bezier(.16,1,.3,1)'}}/>
      <text x="64" y="68" textAnchor="middle" fill={color} fontSize="18" fontWeight="800" fontFamily="Inter,sans-serif">{pct}%</text>
    </svg>
  )
}

// ── MAIN COMPONENT ────────────────────────────────────────────────
export default function InterviewPrep() {
  const [tab, setTab]           = useState('prep')   // prep | intelligence
  const [step, setStep]         = useState('setup')  // setup | session | report
  const [role, setRole]         = useState('')
  const [company, setCompany]   = useState('')
  const [level, setLevel]       = useState('')
  const [mode, setMode]         = useState(null)
  const [roleInput, setRoleInput] = useState('')
  const [showRoleDrop, setShowRoleDrop] = useState(false)

  // Session state
  const [questions, setQuestions]   = useState([])
  const [currentQ, setCurrentQ]     = useState(0)
  const [answers, setAnswers]       = useState([])
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [feedback, setFeedback]     = useState(null)
  const [loading, setLoading]       = useState(false)
  const [sessionDone, setSessionDone] = useState(false)
  const [report, setReport]         = useState(null)

  // Voice
  const [listening, setListening]   = useState(false)
  const [speaking, setSpeaking]     = useState(false)
  const recRef = useRef(null)
  const listeningRef = useRef(false)

  // Career Intelligence state
  const [ciRole, setCiRole]         = useState('')
  const [ciLoading, setCiLoading]   = useState(false)
  const [ciData, setCiData]         = useState(null)
  const [ciError, setCiError]       = useState('')

  const filteredRoles = ROLES.filter(r => r.toLowerCase().includes(roleInput.toLowerCase()))

  // ── VOICE ─────────────────────────────────────────────────────
  function speak(text, onEnd) {
    if (!text) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.rate = 1.0; utter.pitch = 1.05; utter.volume = 1; utter.lang = 'en-US'

    const doSpeak = () => {
      const voices = window.speechSynthesis.getVoices()
      const preferred = ['Samantha','Karen','Moira','Tessa','Ava','Allison',
        'Google US English','Microsoft Zira Desktop','Microsoft Aria Online']
      let picked = null
      for (const n of preferred) {
        picked = voices.find(v => v.name.includes(n) && v.lang.startsWith('en'))
        if (picked) break
      }
      if (!picked) picked = voices.find(v => v.lang.startsWith('en-'))
      if (picked) utter.voice = picked
      utter.onstart = () => setSpeaking(true)
      utter.onend = () => { setSpeaking(false); onEnd && onEnd() }
      utter.onerror = () => { setSpeaking(false); onEnd && onEnd() }
      window.speechSynthesis.speak(utter)
    }

    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      doSpeak()
    } else {
      window.speechSynthesis.onvoiceschanged = () => { doSpeak(); window.speechSynthesis.onvoiceschanged = null }
    }
  }

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      alert('Speech recognition requires Chrome. Please use Chrome browser.')
      return
    }
    // Cancel any ongoing speech
    window.speechSynthesis.cancel()
    setSpeaking(false)

    // Stop existing recognition if any
    try { recRef.current?.stop() } catch(e) {}

    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.continuous = true   // ← KEY: keeps listening until user stops manually

    let accumulated = ''   // builds full answer across pauses

    rec.onstart = () => setListening(true)

    rec.onresult = (e) => {
      let interimChunk = ''
      // Only process new results from resultIndex onward
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript
        if (e.results[i].isFinal) {
          accumulated += transcript + ' '
        } else {
          interimChunk += transcript
        }
      }
      // Show accumulated final + current interim chunk live
      setCurrentAnswer((accumulated + interimChunk).trim())
    }

    rec.onerror = (e) => {
      if (e.error === 'not-allowed') {
        alert('Microphone blocked. Click the lock icon in Chrome address bar and allow mic.')
        setListening(false)
      } else if (e.error === 'aborted') {
        // user manually stopped — normal
        setListening(false)
      } else if (e.error === 'no-speech') {
        // silence detected — keep going, don't stop
      } else {
        console.warn('Speech error:', e.error)
      }
    }

    rec.onend = () => {
      // If still supposed to be listening (e.g. browser auto-stopped after silence),
      // restart automatically to keep it continuous
      if (recRef.current === rec && listeningRef.current) {
        try { rec.start() } catch(e) {}
      } else {
        setListening(false)
      }
    }

    recRef.current = rec
    listeningRef.current = true
    try {
      rec.start()
    } catch(e) {
      setListening(false)
      listeningRef.current = false
      alert('Could not start mic. Check browser permissions.')
    }
  }

  function stopListening() {
    listeningRef.current = false
    try { recRef.current?.stop() } catch(e) {}
    setListening(false)
  }

  // ── GENERATE QUESTIONS ─────────────────────────────────────────
  const startSession = async () => {
    if (!role || !mode) return
    setLoading(true); setStep('session')
    setQuestions([]); setAnswers([]); setCurrentQ(0); setCurrentAnswer('')
    setFeedback(null); setSessionDone(false); setReport(null)
    try {
      const res = await fetch(`${API}/interview/questions`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ role, company, level, mode: mode.label })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      const { questions: qs, opening } = data.data
      setQuestions(qs)
      if (opening) speak(opening, ()=>{ setTimeout(()=>speak(qs[0]), 600) })
      else speak(qs[0])
    } catch(err) {
      console.error('Questions error:', err)
      // Fallback questions based on mode
      const fallback = {
        'HR Round': ['Tell me about yourself.','Why do you want this role?','What is your greatest strength?','Describe a challenge you overcame.','Where do you see yourself in 5 years?'],
        'Technical': [`Explain a technical project you built as a ${role}.`,'What is your approach to debugging?','Describe your experience with version control.','How do you stay updated with new technologies?','What is your greatest technical achievement?'],
        'Salary Negotiation': ['What are your salary expectations?','What is your current CTC?','Why do you think you deserve this salary?','Are you open to a performance-based bonus structure?','What benefits matter most to you beyond salary?'],
      }
      const qs = fallback[mode.label] || fallback['HR Round']
      setQuestions(qs)
      speak(qs[0])
    }
    setLoading(false)
  }

  // ── SUBMIT ANSWER ──────────────────────────────────────────────
  const submitAnswer = async (ans) => {
    const answer = ans || currentAnswer
    if (!answer.trim()) return
    setLoading(true)
    setAnswers(prev => [...prev, { q: questions[currentQ], a: answer }])
    setCurrentAnswer('')
    try {
      const res = await fetch(`${API}/interview/evaluate`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ role, mode: mode.label, question: questions[currentQ], answer })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      const fb = data.data
      setFeedback(fb)
      speak(`Score ${fb.score} out of 100. ${fb.strengths}. ${fb.weaknesses}`)
    } catch(err) {
      console.error('Evaluate error:', err)
      setFeedback({
        score: 0,
        star_s: false, star_t: false, star_a: false, star_r: false,
        strengths: 'Could not evaluate — check backend connection',
        weaknesses: 'Please ensure the backend is running',
        ideal: 'Try again',
        followup: 'N/A'
      })
    }
    setLoading(false)
  }

  // ── NEXT QUESTION ──────────────────────────────────────────────
  const nextQuestion = () => {
    setFeedback(null)
    if (currentQ + 1 >= questions.length) {
      finishSession()
    } else {
      setCurrentQ(currentQ + 1)
      speak(questions[currentQ + 1])
    }
  }

  // ── FINISH & REPORT ────────────────────────────────────────────
  const finishSession = async () => {
    setSessionDone(true); setLoading(true); setStep('report')
    try {
      // Get scores from feedback — use answers length as proxy
      const scores = answers.map(() => 70) // placeholder, real scores tracked in feedback
      const res = await fetch(`${API}/interview/report`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ role, mode: mode.label, company: company||'General', level, answers, scores })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setReport(data.data)
    } catch(err) {
      console.error('Report error:', err)
      setReport({
        overall_score: 0,
        readiness: 'Unable to generate report',
        confidence_level: 'Unknown',
        verdict: 'Could not connect to backend. Please check your connection.',
        strengths: ['Check backend connection'],
        improvements: ['Retry the session'],
        practice_areas: [],
        recommendation: 'Ensure backend is running and try again.'
      })
    }
    setLoading(false)
  }

  // ── CAREER INTELLIGENCE ────────────────────────────────────────
  const fetchCareerIntelligence = async (overrideRole) => {
    const searchRole = overrideRole || ciRole
    if (!searchRole.trim()) return
    setCiRole(searchRole)
    setCiLoading(true); setCiError(''); setCiData(null)
    try {
      const res = await fetch(`${API}/interview/career-intelligence`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ role: searchRole })
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      setCiData(data.data)
    } catch(err) {
      console.error('CI error:', err)
      setCiError(`Failed to analyse "${searchRole}". Error: ${err.message}. Check backend is running.`)
    }
    setCiLoading(false)
  }

  const scoreColor = (s) => s>=80?'#00e5a0':s>=60?'#f5a623':'#ff4d6d'

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"/>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.05)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes wave1{0%,100%{height:8px}50%{height:24px}}
        @keyframes wave2{0%,100%{height:16px}50%{height:6px}}
        @keyframes wave3{0%,100%{height:20px}50%{height:10px}}
        .ip-card{background:var(--bg3,#141828);border:1px solid var(--border,rgba(255,255,255,0.07));border-radius:14px;padding:1.25rem;cursor:pointer;transition:all .2s;}
        .ip-card:hover{transform:translateY(-2px);}
        .ip-card.selected{transform:translateY(-2px);}
        .ip-scroll::-webkit-scrollbar{width:3px;}
        .ip-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px;}
        .fade-in{animation:fadeUp .25s ease;}
        .tool-card{background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.07);border-radius:12px;padding:.85rem 1rem;transition:all .2s;}
        .tool-card:hover{background:rgba(255,255,255,0.05);border-color:rgba(255,255,255,0.12);}
      `}</style>

      <div style={{minHeight:'calc(100vh - 52px)',background:'var(--bg,#080c18)',fontFamily:'Inter,sans-serif'}}>

        {/* Tab bar */}
        <div style={{borderBottom:'1px solid rgba(255,255,255,0.07)',padding:'.75rem 1.5rem',display:'flex',gap:'.5rem',background:'var(--bg2,#0d1120)'}}>
          {[
            {id:'prep',         icon:'ti-microphone',  label:'Mock interview'},
            {id:'intelligence', icon:'ti-brain',        label:'Career intelligence'},
          ].map(t=>(
            <button key={t.id} onClick={()=>{setTab(t.id);if(t.id==='prep'){setStep('setup')}}}
              style={{display:'flex',alignItems:'center',gap:'.4rem',padding:'.45rem 1rem',borderRadius:'20px',border:`1px solid ${tab===t.id?'rgba(0,229,160,0.4)':'rgba(255,255,255,0.1)'}`,background:tab===t.id?'rgba(0,229,160,0.1)':'transparent',color:tab===t.id?'#00e5a0':'#8b93b0',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
              <i className={`ti ${t.icon}`} style={{fontSize:'14px'}} aria-hidden="true"/>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ MOCK INTERVIEW TAB ══════════════════════════════════ */}
        {tab==='prep' && (
          <div style={{maxWidth:'860px',margin:'0 auto',padding:'1.5rem 1rem'}}>

            {/* SETUP STEP */}
            {step==='setup' && (
              <div className="fade-in">
                <div style={{display:'flex',alignItems:'center',gap:'.75rem',marginBottom:'1.5rem'}}>
                  <div style={{width:'40px',height:'40px',borderRadius:'12px',background:'rgba(0,229,160,0.1)',border:'1px solid rgba(0,229,160,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <i className="ti ti-microphone" style={{fontSize:'20px',color:'#00e5a0'}} aria-hidden="true"/>
                  </div>
                  <div>
                    <div style={{fontSize:'20px',fontWeight:800,color:'#eef0ff'}}>AI mock interview</div>
                    <div style={{fontSize:'12px',color:'#8b93b0'}}>AI plays your interviewer — voice questions, real-time STAR feedback</div>
                  </div>
                </div>

                {/* Role picker */}
                <div style={{background:'var(--bg3,#141828)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',padding:'1.25rem',marginBottom:'1rem'}}>
                  <div style={{fontSize:'13px',fontWeight:700,color:'#00e5a0',marginBottom:'.75rem',display:'flex',alignItems:'center',gap:'.4rem'}}>
                    <i className="ti ti-briefcase" style={{fontSize:'15px'}} aria-hidden="true"/> Step 1 — Your role
                  </div>
                  <div style={{position:'relative',marginBottom:'.75rem'}}>
                    <input value={roleInput} onChange={e=>{setRoleInput(e.target.value);setRole(e.target.value);setShowRoleDrop(true)}}
                      onFocus={()=>setShowRoleDrop(true)}
                      placeholder='Type your job role e.g. Software Engineer...'
                      style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'9px',padding:'.6rem .85rem',color:'#eef0ff',fontSize:'13px',fontFamily:'Inter,sans-serif',outline:'none',boxSizing:'border-box'}}/>
                    {showRoleDrop && roleInput && filteredRoles.length>0 && (
                      <div style={{position:'absolute',top:'calc(100% + 4px)',left:0,right:0,background:'#0d1120',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'10px',zIndex:100,maxHeight:'180px',overflowY:'auto'}}>
                        {filteredRoles.slice(0,8).map(r=>(
                          <div key={r} onClick={()=>{setRole(r);setRoleInput(r);setShowRoleDrop(false)}}
                            style={{padding:'.5rem .85rem',fontSize:'13px',color:'#8b93b0',cursor:'pointer',transition:'all .15s'}}
                            onMouseEnter={e=>e.currentTarget.style.color='#eef0ff'}
                            onMouseLeave={e=>e.currentTarget.style.color='#8b93b0'}>
                            {r}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{display:'flex',gap:'.5rem',marginBottom:'.75rem'}}>
                    <div style={{flex:1}}>
                      <label style={{fontSize:'11px',fontWeight:700,color:'#4a5168',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:'.35rem'}}>Company (optional)</label>
                      <select value={company} onChange={e=>setCompany(e.target.value)} style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'9px',padding:'.55rem .8rem',color:company?'#eef0ff':'#4a5168',fontSize:'13px',fontFamily:'Inter,sans-serif',outline:'none',cursor:'pointer'}}>
                        <option value=''>Select company</option>
                        {COMPANIES.map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div style={{flex:1}}>
                      <label style={{fontSize:'11px',fontWeight:700,color:'#4a5168',textTransform:'uppercase',letterSpacing:'.06em',display:'block',marginBottom:'.35rem'}}>Experience level</label>
                      <select value={level} onChange={e=>setLevel(e.target.value)} style={{width:'100%',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'9px',padding:'.55rem .8rem',color:level?'#eef0ff':'#4a5168',fontSize:'13px',fontFamily:'Inter,sans-serif',outline:'none',cursor:'pointer'}}>
                        <option value=''>Select level</option>
                        {LEVELS.map(l=><option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Mode picker */}
                <div style={{background:'var(--bg3,#141828)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',padding:'1.25rem',marginBottom:'1.5rem'}}>
                  <div style={{fontSize:'13px',fontWeight:700,color:'#00e5a0',marginBottom:'.75rem',display:'flex',alignItems:'center',gap:'.4rem'}}>
                    <i className="ti ti-layout-grid" style={{fontSize:'15px'}} aria-hidden="true"/> Step 2 — Interview mode
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'.65rem'}}>
                    {INTERVIEW_MODES.map(m=>(
                      <div key={m.id} className={`ip-card ${mode?.id===m.id?'selected':''}`}
                        style={{borderColor:mode?.id===m.id?m.color+'55':'rgba(255,255,255,0.07)',background:mode?.id===m.id?m.color+'0e':'var(--bg3,#141828)',boxShadow:mode?.id===m.id?`0 4px 20px ${m.color}18`:undefined}}
                        onClick={()=>setMode(m)}>
                        <div style={{width:'36px',height:'36px',borderRadius:'9px',background:m.color+'14',border:`1px solid ${m.color}25`,display:'flex',alignItems:'center',justifyContent:'center',marginBottom:'.65rem'}}>
                          <i className={`ti ${m.icon}`} style={{fontSize:'18px',color:m.color}} aria-hidden="true"/>
                        </div>
                        <div style={{fontSize:'12px',fontWeight:700,color:'#eef0ff',marginBottom:'3px'}}>{m.label}</div>
                        <div style={{fontSize:'10px',color:'#8b93b0',lineHeight:1.4}}>{m.desc}</div>
                        {mode?.id===m.id && <div style={{marginTop:'.5rem',display:'flex',alignItems:'center',gap:'.3rem',fontSize:'10px',color:m.color,fontWeight:700}}>
                          <i className="ti ti-circle-check" style={{fontSize:'12px'}} aria-hidden="true"/> Selected
                        </div>}
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={startSession} disabled={!role||!mode}
                  style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:'.5rem',padding:'.8rem',background:'linear-gradient(135deg,#00e5a0,#00c484)',border:'none',borderRadius:'12px',color:'#060d0a',fontSize:'14px',fontWeight:700,cursor:(!role||!mode)?'not-allowed':'pointer',fontFamily:'Inter,sans-serif',opacity:(!role||!mode)?.4:1}}>
                  <i className="ti ti-microphone" style={{fontSize:'18px'}} aria-hidden="true"/>
                  Start {mode?.label||'interview'} session{role?` for ${role}`:''}
                </button>
              </div>
            )}

            {/* SESSION STEP */}
            {step==='session' && (
              <div className="fade-in">
                {/* Session header */}
                <div style={{display:'flex',alignItems:'center',gap:'1rem',padding:'.85rem 1.25rem',background:'var(--bg3,#141828)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',marginBottom:'1.25rem',flexWrap:'wrap'}}>
                  <div style={{width:'36px',height:'36px',borderRadius:'9px',background:mode?.color+'14',border:`1px solid ${mode?.color}25`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                    <i className={`ti ${mode?.icon}`} style={{fontSize:'18px',color:mode?.color}} aria-hidden="true"/>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'13px',fontWeight:700,color:'#eef0ff'}}>{mode?.label} — {role}{company?` @ ${company}`:''}</div>
                    <div style={{fontSize:'11px',color:'#8b93b0'}}>{level} · Question {Math.min(currentQ+1,questions.length)} of {questions.length}</div>
                  </div>
                  {/* Progress */}
                  <div style={{display:'flex',gap:'4px'}}>
                    {questions.map((_,i)=>(
                      <div key={i} style={{width:'24px',height:'4px',borderRadius:'2px',background:i<currentQ?'#00e5a0':i===currentQ?mode?.color:'rgba(255,255,255,0.1)',transition:'background .3s'}}/>
                    ))}
                  </div>
                  <button onClick={()=>setStep('setup')} style={{background:'none',border:'none',color:'#4a5168',cursor:'pointer',display:'flex',alignItems:'center',fontSize:'12px',gap:'.25rem',fontFamily:'Inter,sans-serif'}}>
                    <i className="ti ti-x" style={{fontSize:'15px'}} aria-hidden="true"/> End
                  </button>
                </div>

                {loading && questions.length===0 ? (
                  <div style={{textAlign:'center',padding:'3rem',color:'#8b93b0'}}>
                    <i className="ti ti-loader" style={{fontSize:'32px',display:'block',marginBottom:'1rem',color:'#00e5a0',animation:'spin .8s linear infinite'}} aria-hidden="true"/>
                    AI is preparing your interview...
                  </div>
                ) : (
                  <>
                    {/* Current question */}
                    <div style={{background:'var(--bg3,#141828)',border:`1px solid ${mode?.color}30`,borderRadius:'14px',padding:'1.25rem',marginBottom:'1rem'}}>
                      <div style={{display:'flex',alignItems:'flex-start',gap:'.75rem'}}>
                        <div style={{width:'36px',height:'36px',borderRadius:'50%',background:mode?.color+'18',border:`1px solid ${mode?.color}30`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:'12px',fontWeight:800,color:mode?.color}}>AI</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:'11px',color:'#4a5168',marginBottom:'.4rem',display:'flex',alignItems:'center',gap:'.3rem'}}>
                            {speaking && <><i className="ti ti-volume" style={{fontSize:'12px',color:mode?.color}} aria-hidden="true"/> Speaking...</>}
                            {!speaking && <><i className="ti ti-message-circle" style={{fontSize:'12px'}} aria-hidden="true"/> Interviewer</>}
                          </div>
                          <div style={{fontSize:'15px',color:'#eef0ff',lineHeight:1.6,fontWeight:500}}>
                            {questions[currentQ] || 'Loading question...'}
                          </div>
                        </div>
                        <button onClick={()=>speak(questions[currentQ])} title="Replay question"
                          style={{background:'rgba(255,255,255,0.04)',border:'0.5px solid rgba(255,255,255,0.08)',borderRadius:'8px',padding:'.35rem .6rem',color:'#4a5168',cursor:'pointer',display:'flex',alignItems:'center'}}>
                          <i className="ti ti-volume" style={{fontSize:'14px'}} aria-hidden="true"/>
                        </button>
                      </div>
                    </div>

                    {/* Answer area */}
                    {!feedback && (
                      <div style={{background:'var(--bg3,#141828)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',padding:'1.25rem',marginBottom:'1rem'}}>
                        <div style={{fontSize:'12px',color:'#4a5168',marginBottom:'.65rem',display:'flex',alignItems:'center',gap:'.4rem'}}>
                          <i className="ti ti-user" style={{fontSize:'13px'}} aria-hidden="true"/> Your answer
                        </div>
                        <textarea value={currentAnswer} onChange={e=>setCurrentAnswer(e.target.value)}
                          placeholder='Type your answer here or use the mic button to speak...'
                          style={{width:'100%',background:'rgba(255,255,255,0.03)',border:'0.5px solid rgba(255,255,255,0.08)',borderRadius:'10px',padding:'.75rem .85rem',color:'#eef0ff',fontSize:'13px',fontFamily:'Inter,sans-serif',outline:'none',resize:'vertical',minHeight:'100px',lineHeight:1.6,boxSizing:'border-box'}}/>
                        <div style={{display:'flex',gap:'.5rem',marginTop:'.75rem'}}>
                          <button onClick={()=>{ if(listening){ stopListening() } else { startListening() } }}
                            style={{display:'flex',alignItems:'center',gap:'.4rem',padding:'.55rem 1rem',borderRadius:'9px',border:`1px solid ${listening?'rgba(255,77,109,0.4)':'rgba(255,255,255,0.1)'}`,background:listening?'rgba(255,77,109,0.1)':'rgba(255,255,255,0.04)',color:listening?'#ff4d6d':'#8b93b0',fontSize:'12px',fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
                            {listening ? (
                              <><div style={{display:'flex',gap:'2px',alignItems:'center',height:'16px'}}>
                                <div style={{width:'3px',borderRadius:'2px',background:'#ff4d6d',height:'8px',animation:'wave1 .6s infinite'}}/>
                                <div style={{width:'3px',borderRadius:'2px',background:'#ff4d6d',height:'14px',animation:'wave2 .6s infinite'}}/>
                                <div style={{width:'3px',borderRadius:'2px',background:'#ff4d6d',height:'10px',animation:'wave3 .6s infinite'}}/>
                              </div> Stop mic</>
                            ) : (
                              <><i className="ti ti-microphone" style={{fontSize:'14px'}} aria-hidden="true"/> Speak answer</>
                            )}
                          </button>
                          <button onClick={()=>submitAnswer()} disabled={!currentAnswer.trim()||loading}
                            style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem',padding:'.55rem 1rem',background:'linear-gradient(135deg,#00e5a0,#00c484)',border:'none',borderRadius:'9px',color:'#060d0a',fontSize:'13px',fontWeight:700,cursor:(!currentAnswer.trim()||loading)?'not-allowed':'pointer',fontFamily:'Inter,sans-serif',opacity:(!currentAnswer.trim()||loading)?.5:1}}>
                            {loading?<><i className="ti ti-loader" style={{fontSize:'14px',animation:'spin .8s linear infinite'}} aria-hidden="true"/> Analysing...</>:<><i className="ti ti-send" style={{fontSize:'14px'}} aria-hidden="true"/> Submit answer</>}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Feedback */}
                    {feedback && (
                      <div className="fade-in" style={{background:'var(--bg3,#141828)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'14px',padding:'1.25rem',marginBottom:'1rem'}}>
                        {/* Score */}
                        <div style={{display:'flex',alignItems:'center',gap:'1rem',marginBottom:'1rem',padding:'.75rem',background:'rgba(255,255,255,0.02)',borderRadius:'10px'}}>
                          <div style={{width:'60px',height:'60px',borderRadius:'50%',border:`3px solid ${scoreColor(feedback.score)}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                            <div style={{fontSize:'18px',fontWeight:900,color:scoreColor(feedback.score)}}>{feedback.score}</div>
                            <div style={{fontSize:'8px',color:'#4a5168',textTransform:'uppercase'}}>score</div>
                          </div>
                          <div style={{flex:1}}>
                            {/* STAR breakdown */}
                            <div style={{display:'flex',gap:'.4rem',marginBottom:'.4rem'}}>
                              {[['S','Situation',feedback.star_s],['T','Task',feedback.star_t],['A','Action',feedback.star_a],['R','Result',feedback.star_r]].map(([l,full,ok])=>(
                                <div key={l} title={full} style={{display:'flex',alignItems:'center',gap:'.2rem',fontSize:'10px',fontWeight:700,padding:'2px 7px',borderRadius:'6px',background:ok?'rgba(0,229,160,0.1)':'rgba(255,77,109,0.08)',color:ok?'#00e5a0':'#ff4d6d',border:`0.5px solid ${ok?'rgba(0,229,160,0.25)':'rgba(255,77,109,0.2)'}`}}>
                                  <i className={`ti ${ok?'ti-check':'ti-x'}`} style={{fontSize:'9px'}} aria-hidden="true"/>{l}
                                </div>
                              ))}
                              <span style={{fontSize:'10px',color:'#4a5168',alignSelf:'center'}}>STAR framework</span>
                            </div>
                          </div>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.65rem',marginBottom:'.75rem'}}>
                          <div style={{padding:'.65rem',background:'rgba(0,229,160,0.05)',border:'0.5px solid rgba(0,229,160,0.15)',borderRadius:'9px'}}>
                            <div style={{fontSize:'10px',fontWeight:700,color:'#00e5a0',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.3rem',display:'flex',alignItems:'center',gap:'.3rem'}}>
                              <i className="ti ti-thumb-up" style={{fontSize:'11px'}} aria-hidden="true"/> Strengths
                            </div>
                            <div style={{fontSize:'12px',color:'#8b93b0',lineHeight:1.5}}>{feedback.strengths}</div>
                          </div>
                          <div style={{padding:'.65rem',background:'rgba(255,77,109,0.05)',border:'0.5px solid rgba(255,77,109,0.15)',borderRadius:'9px'}}>
                            <div style={{fontSize:'10px',fontWeight:700,color:'#ff4d6d',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.3rem',display:'flex',alignItems:'center',gap:'.3rem'}}>
                              <i className="ti ti-arrow-up-circle" style={{fontSize:'11px'}} aria-hidden="true"/> Improve
                            </div>
                            <div style={{fontSize:'12px',color:'#8b93b0',lineHeight:1.5}}>{feedback.weaknesses}</div>
                          </div>
                        </div>
                        <div style={{padding:'.65rem',background:'rgba(124,111,247,0.05)',border:'0.5px solid rgba(124,111,247,0.15)',borderRadius:'9px',marginBottom:'.75rem'}}>
                          <div style={{fontSize:'10px',fontWeight:700,color:'#7c6ff7',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.3rem',display:'flex',alignItems:'center',gap:'.3rem'}}>
                            <i className="ti ti-bulb" style={{fontSize:'11px'}} aria-hidden="true"/> Ideal addition
                          </div>
                          <div style={{fontSize:'12px',color:'#8b93b0',lineHeight:1.5}}>{feedback.ideal}</div>
                        </div>
                        {feedback.followup && (
                          <div style={{padding:'.65rem',background:'rgba(245,166,35,0.05)',border:'0.5px solid rgba(245,166,35,0.2)',borderRadius:'9px',marginBottom:'.75rem'}}>
                            <div style={{fontSize:'10px',fontWeight:700,color:'#f5a623',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.3rem',display:'flex',alignItems:'center',gap:'.3rem'}}>
                              <i className="ti ti-flame" style={{fontSize:'11px'}} aria-hidden="true"/> Follow-up pressure
                            </div>
                            <div style={{fontSize:'12px',color:'#eef0ff',lineHeight:1.5,fontStyle:'italic'}}>"{feedback.followup}"</div>
                          </div>
                        )}
                        <button onClick={nextQuestion}
                          style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem',padding:'.6rem',background:'linear-gradient(135deg,#00e5a0,#00c484)',border:'none',borderRadius:'10px',color:'#060d0a',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
                          {currentQ+1>=questions.length ? <><i className="ti ti-chart-bar" style={{fontSize:'15px'}} aria-hidden="true"/> View full report</> : <><i className="ti ti-arrow-right" style={{fontSize:'15px'}} aria-hidden="true"/> Next question</>}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* REPORT STEP */}
            {step==='report' && report && (
              <div className="fade-in">
                <div style={{textAlign:'center',marginBottom:'1.5rem'}}>
                  <div style={{fontSize:'13px',color:'#8b93b0',marginBottom:'.5rem'}}>Interview complete — {role} {mode?.label}</div>
                  <div style={{fontSize:'22px',fontWeight:800,color:'#eef0ff',marginBottom:'.35rem'}}>Your performance report</div>
                </div>

                {/* Overall score */}
                <div style={{display:'flex',alignItems:'center',gap:'1.5rem',padding:'1.25rem',background:'var(--bg3,#141828)',border:`1px solid ${scoreColor(report.overall_score)}30`,borderRadius:'16px',marginBottom:'1rem',flexWrap:'wrap'}}>
                  <div style={{textAlign:'center',flexShrink:0}}>
                    <div style={{width:'80px',height:'80px',borderRadius:'50%',border:`4px solid ${scoreColor(report.overall_score)}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',margin:'0 auto'}}>
                      <div style={{fontSize:'24px',fontWeight:900,color:scoreColor(report.overall_score)}}>{report.overall_score}</div>
                      <div style={{fontSize:'9px',color:'#4a5168',textTransform:'uppercase'}}>score</div>
                    </div>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:'flex',alignItems:'center',gap:'.5rem',marginBottom:'.35rem'}}>
                      <span style={{fontSize:'16px',fontWeight:800,color:'#eef0ff'}}>{report.readiness}</span>
                      <span style={{fontSize:'11px',padding:'2px 9px',borderRadius:'20px',background:`${scoreColor(report.overall_score)}18`,color:scoreColor(report.overall_score),border:`0.5px solid ${scoreColor(report.overall_score)}30`,fontWeight:700}}>{report.confidence_level} confidence</span>
                    </div>
                    <div style={{fontSize:'13px',color:'#8b93b0',lineHeight:1.6,marginBottom:'.5rem'}}>{report.verdict}</div>
                    <div style={{fontSize:'12px',color:'#00e5a0',fontWeight:600,display:'flex',alignItems:'center',gap:'.3rem'}}>
                      <i className="ti ti-bulb" style={{fontSize:'13px'}} aria-hidden="true"/> {report.recommendation}
                    </div>
                  </div>
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'1rem',marginBottom:'1rem'}}>
                  <div style={{background:'var(--bg3,#141828)',border:'0.5px solid rgba(0,229,160,0.2)',borderRadius:'12px',padding:'1rem'}}>
                    <div style={{fontSize:'11px',fontWeight:700,color:'#00e5a0',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.65rem',display:'flex',alignItems:'center',gap:'.35rem'}}>
                      <i className="ti ti-star" style={{fontSize:'13px'}} aria-hidden="true"/> Your strengths
                    </div>
                    {report.strengths?.map((s,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'.4rem',marginBottom:'.4rem',fontSize:'12px',color:'#8b93b0'}}>
                        <i className="ti ti-check" style={{fontSize:'13px',color:'#00e5a0',flexShrink:0,marginTop:'1px'}} aria-hidden="true"/>{s}
                      </div>
                    ))}
                  </div>
                  <div style={{background:'var(--bg3,#141828)',border:'0.5px solid rgba(255,77,109,0.2)',borderRadius:'12px',padding:'1rem'}}>
                    <div style={{fontSize:'11px',fontWeight:700,color:'#ff4d6d',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.65rem',display:'flex',alignItems:'center',gap:'.35rem'}}>
                      <i className="ti ti-target" style={{fontSize:'13px'}} aria-hidden="true"/> Improve next
                    </div>
                    {report.improvements?.map((s,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'.4rem',marginBottom:'.4rem',fontSize:'12px',color:'#8b93b0'}}>
                        <i className="ti ti-arrow-up" style={{fontSize:'13px',color:'#ff4d6d',flexShrink:0,marginTop:'1px'}} aria-hidden="true"/>{s}
                      </div>
                    ))}
                  </div>
                </div>

                {report.practice_areas?.length>0 && (
                  <div style={{background:'var(--bg3,#141828)',border:'0.5px solid rgba(124,111,247,0.2)',borderRadius:'12px',padding:'1rem',marginBottom:'1rem'}}>
                    <div style={{fontSize:'11px',fontWeight:700,color:'#7c6ff7',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.65rem',display:'flex',alignItems:'center',gap:'.35rem'}}>
                      <i className="ti ti-book" style={{fontSize:'13px'}} aria-hidden="true"/> Practice these areas next
                    </div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:'.4rem'}}>
                      {report.practice_areas.map((a,i)=>(
                        <span key={i} style={{fontSize:'12px',padding:'4px 12px',borderRadius:'20px',background:'rgba(124,111,247,0.1)',border:'0.5px solid rgba(124,111,247,0.25)',color:'#7c6ff7',fontWeight:600}}>{a}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{display:'flex',gap:'.75rem',flexWrap:'wrap'}}>
                  <button onClick={()=>{setStep('setup');setQuestions([]);setAnswers([]);setCurrentQ(0);setFeedback(null);setReport(null)}}
                    style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem',padding:'.65rem',background:'linear-gradient(135deg,#00e5a0,#00c484)',border:'none',borderRadius:'10px',color:'#060d0a',fontSize:'13px',fontWeight:700,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
                    <i className="ti ti-refresh" style={{fontSize:'15px'}} aria-hidden="true"/> Practice again
                  </button>
                  <button onClick={()=>{setTab('intelligence');setCiRole(role);setTimeout(()=>fetchCareerIntelligence(role),100)}}
                    style={{display:'flex',alignItems:'center',gap:'.4rem',padding:'.65rem 1.25rem',background:'rgba(124,111,247,0.1)',border:'1px solid rgba(124,111,247,0.3)',borderRadius:'10px',color:'#7c6ff7',fontSize:'13px',fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
                    <i className="ti ti-brain" style={{fontSize:'15px'}} aria-hidden="true"/> Career intelligence for {role}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ CAREER INTELLIGENCE TAB ═════════════════════════════ */}
        {tab==='intelligence' && (
          <div style={{maxWidth:'860px',margin:'0 auto',padding:'1.5rem 1rem'}}>
            <div className="fade-in">
              <div style={{display:'flex',alignItems:'center',gap:'.75rem',marginBottom:'1.5rem'}}>
                <div style={{width:'40px',height:'40px',borderRadius:'12px',background:'rgba(124,111,247,0.1)',border:'1px solid rgba(124,111,247,0.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <i className="ti ti-brain" style={{fontSize:'20px',color:'#7c6ff7'}} aria-hidden="true"/>
                </div>
                <div>
                  <div style={{fontSize:'20px',fontWeight:800,color:'#eef0ff'}}>Career intelligence</div>
                  <div style={{fontSize:'12px',color:'#8b93b0'}}>AI replacement risk · future outlook · tools to master — for any role</div>
                </div>
              </div>

              {/* Search */}
              <div style={{display:'flex',gap:'.5rem',marginBottom:'1.5rem'}}>
                <input value={ciRole} onChange={e=>setCiRole(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchCareerIntelligence()}
                  placeholder='Enter any job role e.g. Data Scientist, CA, Doctor, Mechanical Engineer...'
                  style={{flex:1,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'10px',padding:'.65rem 1rem',color:'#eef0ff',fontSize:'13px',fontFamily:'Inter,sans-serif',outline:'none'}}/>
                <button onClick={fetchCareerIntelligence} disabled={!ciRole.trim()||ciLoading}
                  style={{display:'flex',alignItems:'center',gap:'.4rem',padding:'.65rem 1.25rem',background:'linear-gradient(135deg,#7c6ff7,#5a52d5)',border:'none',borderRadius:'10px',color:'#fff',fontSize:'13px',fontWeight:700,cursor:(!ciRole.trim()||ciLoading)?'not-allowed':'pointer',fontFamily:'Inter,sans-serif',opacity:(!ciRole.trim()||ciLoading)?.5:1}}>
                  {ciLoading?<><i className="ti ti-loader" style={{fontSize:'15px',animation:'spin .8s linear infinite'}} aria-hidden="true"/> Analysing...</>:<><i className="ti ti-search" style={{fontSize:'15px'}} aria-hidden="true"/> Analyse</>}
                </button>
              </div>

              {/* Quick role buttons */}
              {!ciData && !ciLoading && (
                <div style={{marginBottom:'1.5rem'}}>
                  <div style={{fontSize:'11px',color:'#4a5168',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.5rem'}}>Popular searches</div>
                  <div style={{display:'flex',flexWrap:'wrap',gap:'.35rem'}}>
                    {['Software Engineer','Data Scientist','Product Manager','UX Designer','Finance Analyst','Marketing Manager','CA / CPA','Doctor / MBBS'].map(r=>(
                      <button key={r} onClick={()=>fetchCareerIntelligence(r)}
                        style={{fontSize:'12px',padding:'.35rem .85rem',borderRadius:'20px',border:'0.5px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'#8b93b0',cursor:'pointer',fontFamily:'Inter,sans-serif',transition:'all .15s'}}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(124,111,247,0.4)';e.currentTarget.style.color='#7c6ff7'}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.1)';e.currentTarget.style.color='#8b93b0'}}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {ciLoading && (
                <div style={{textAlign:'center',padding:'3rem',color:'#8b93b0'}}>
                  <i className="ti ti-brain" style={{fontSize:'36px',display:'block',marginBottom:'1rem',color:'#7c6ff7',animation:'pulse 1.5s infinite'}} aria-hidden="true"/>
                  <div style={{fontSize:'14px',fontWeight:600,color:'#eef0ff',marginBottom:'.35rem'}}>Analysing {ciRole}...</div>
                  <div style={{fontSize:'12px'}}>AI replacement risk · future demand · tools to learn</div>
                </div>
              )}

              {ciError && <div style={{padding:'.75rem 1rem',background:'rgba(255,77,77,0.08)',border:'0.5px solid rgba(255,77,77,0.2)',borderRadius:'10px',color:'#ff6b6b',fontSize:'13px',display:'flex',alignItems:'center',gap:'.5rem'}}><i className="ti ti-alert-circle" aria-hidden="true"/>{ciError}</div>}

              {ciData && !ciLoading && (
                <div className="fade-in">
                  {/* ── SECTION 1: AI Replacement Risk ── */}
                  <div style={{background:'var(--bg3,#141828)',border:`1px solid ${ciData.risk_color}30`,borderRadius:'16px',padding:'1.25rem',marginBottom:'1rem'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'.4rem',fontSize:'11px',fontWeight:700,color:ciData.risk_color,textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'1rem'}}>
                      <i className="ti ti-robot" style={{fontSize:'13px'}} aria-hidden="true"/> AI replacement risk
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'2rem',flexWrap:'wrap'}}>
                      <div style={{textAlign:'center',flexShrink:0}}>
                        <RiskMeter pct={ciData.ai_replacement_risk} color={ciData.risk_color}/>
                        <div style={{fontSize:'12px',fontWeight:700,color:ciData.risk_color,marginTop:'.25rem'}}>{ciData.risk_level} risk</div>
                        <div style={{fontSize:'10px',color:'#4a5168',marginTop:'2px'}}>{ciData.risk_timeline}</div>
                      </div>
                      <div style={{flex:1,display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.65rem'}}>
                        <div style={{padding:'.65rem',background:'rgba(255,77,109,0.05)',border:'0.5px solid rgba(255,77,109,0.15)',borderRadius:'9px'}}>
                          <div style={{fontSize:'10px',fontWeight:700,color:'#ff4d6d',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.4rem',display:'flex',alignItems:'center',gap:'.3rem'}}>
                            <i className="ti ti-robot" style={{fontSize:'11px'}} aria-hidden="true"/> AI will take
                          </div>
                          {ciData.what_ai_takes?.map((t,i)=><div key={i} style={{fontSize:'11px',color:'#8b93b0',marginBottom:'2px',display:'flex',alignItems:'flex-start',gap:'.3rem'}}><i className="ti ti-minus" style={{fontSize:'11px',color:'#ff4d6d',flexShrink:0,marginTop:'1px'}} aria-hidden="true"/>{t}</div>)}
                        </div>
                        <div style={{padding:'.65rem',background:'rgba(0,229,160,0.05)',border:'0.5px solid rgba(0,229,160,0.15)',borderRadius:'9px'}}>
                          <div style={{fontSize:'10px',fontWeight:700,color:'#00e5a0',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.4rem',display:'flex',alignItems:'center',gap:'.3rem'}}>
                            <i className="ti ti-user-check" style={{fontSize:'11px'}} aria-hidden="true"/> Stays human
                          </div>
                          {ciData.what_stays_human?.map((t,i)=><div key={i} style={{fontSize:'11px',color:'#8b93b0',marginBottom:'2px',display:'flex',alignItems:'flex-start',gap:'.3rem'}}><i className="ti ti-check" style={{fontSize:'11px',color:'#00e5a0',flexShrink:0,marginTop:'1px'}} aria-hidden="true"/>{t}</div>)}
                        </div>
                      </div>
                    </div>
                    {ciData.safer_pivot_roles?.length>0 && (
                      <div style={{marginTop:'.85rem',paddingTop:'.85rem',borderTop:'0.5px solid rgba(255,255,255,0.06)'}}>
                        <div style={{fontSize:'10px',color:'#4a5168',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.4rem'}}>Safer pivot roles</div>
                        <div style={{display:'flex',flexWrap:'wrap',gap:'.35rem'}}>
                          {ciData.safer_pivot_roles.map((r,i)=><span key={i} style={{fontSize:'11px',padding:'3px 10px',borderRadius:'20px',background:'rgba(0,229,160,0.08)',border:'0.5px solid rgba(0,229,160,0.2)',color:'#00e5a0',fontWeight:600}}>{r}</span>)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── SECTION 2: Future Outlook ── */}
                  <div style={{background:'var(--bg3,#141828)',border:'0.5px solid rgba(59,130,246,0.2)',borderRadius:'16px',padding:'1.25rem',marginBottom:'1rem'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'.4rem',fontSize:'11px',fontWeight:700,color:'#3b82f6',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'1rem'}}>
                      <i className="ti ti-rocket" style={{fontSize:'13px'}} aria-hidden="true"/> Future outlook — {ciData.role}
                    </div>
                    {/* Demand timeline */}
                    <div style={{display:'flex',gap:'.5rem',marginBottom:'1rem'}}>
                      {[['2025',ciData.future_outlook?.demand_2025],['2027',ciData.future_outlook?.demand_2027],['2030',ciData.future_outlook?.demand_2030]].map(([yr,val])=>{
                        const c = val==='High'?'#00e5a0':val==='Medium'?'#f5a623':val==='Low'?'#ff4d6d':'#7c6ff7'
                        return (
                          <div key={yr} style={{flex:1,padding:'.75rem',background:`${c}0e`,border:`0.5px solid ${c}30`,borderRadius:'10px',textAlign:'center'}}>
                            <div style={{fontSize:'11px',color:'#4a5168',marginBottom:'.25rem'}}>{yr}</div>
                            <div style={{fontSize:'13px',fontWeight:700,color:c}}>{val||'—'}</div>
                          </div>
                        )
                      })}
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.65rem'}}>
                      <div>
                        <div style={{fontSize:'10px',color:'#4a5168',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.4rem'}}>Salary trend</div>
                        <div style={{fontSize:'13px',color:'#00e5a0',fontWeight:600,display:'flex',alignItems:'center',gap:'.3rem'}}>
                          <i className="ti ti-trending-up" style={{fontSize:'14px'}} aria-hidden="true"/>{ciData.future_outlook?.salary_trend}
                        </div>
                      </div>
                      <div>
                        <div style={{fontSize:'10px',color:'#4a5168',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.4rem'}}>Top industries hiring</div>
                        <div style={{display:'flex',flexWrap:'wrap',gap:'.3rem'}}>
                          {ciData.future_outlook?.top_industries?.map((ind,i)=><span key={i} style={{fontSize:'10px',padding:'2px 7px',borderRadius:'20px',background:'rgba(59,130,246,0.08)',border:'0.5px solid rgba(59,130,246,0.2)',color:'#3b82f6'}}>{ind}</span>)}
                        </div>
                      </div>
                    </div>
                    {ciData.future_outlook?.emerging_subroles?.length>0 && (
                      <div style={{marginTop:'.85rem',paddingTop:'.85rem',borderTop:'0.5px solid rgba(255,255,255,0.06)'}}>
                        <div style={{fontSize:'10px',color:'#4a5168',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.4rem'}}>Emerging sub-roles</div>
                        <div style={{display:'flex',flexWrap:'wrap',gap:'.35rem'}}>
                          {ciData.future_outlook.emerging_subroles.map((r,i)=><span key={i} style={{fontSize:'11px',padding:'3px 10px',borderRadius:'20px',background:'rgba(124,111,247,0.08)',border:'0.5px solid rgba(124,111,247,0.2)',color:'#7c6ff7',fontWeight:600}}>{r}</span>)}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── SECTION 3: AI Tools to Master ── */}
                  <div style={{background:'var(--bg3,#141828)',border:'0.5px solid rgba(245,166,35,0.2)',borderRadius:'16px',padding:'1.25rem',marginBottom:'1rem'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'.4rem',fontSize:'11px',fontWeight:700,color:'#f5a623',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'1rem'}}>
                      <i className="ti ti-tools" style={{fontSize:'13px'}} aria-hidden="true"/> AI tools to master
                    </div>
                    <div style={{display:'flex',flexDirection:'column',gap:'.5rem'}}>
                      {ciData.ai_tools?.map((tool,i)=>{
                        const priorityColor = tool.priority==='Must learn'?'#ff4d6d':tool.priority==='Good to know'?'#f5a623':'#8b93b0'
                        return (
                          <div key={i} className="tool-card">
                            <div style={{display:'flex',alignItems:'flex-start',gap:'.75rem'}}>
                              <div style={{width:'34px',height:'34px',borderRadius:'8px',background:'rgba(245,166,35,0.1)',border:'0.5px solid rgba(245,166,35,0.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:'16px',fontWeight:800,color:'#f5a623',fontFamily:'Inter,sans-serif'}}>
                                {tool.name.charAt(0)}
                              </div>
                              <div style={{flex:1}}>
                                <div style={{display:'flex',alignItems:'center',gap:'.5rem',marginBottom:'3px',flexWrap:'wrap'}}>
                                  <span style={{fontSize:'13px',fontWeight:700,color:'#eef0ff'}}>{tool.name}</span>
                                  <span style={{fontSize:'9px',padding:'1px 7px',borderRadius:'10px',background:`${priorityColor}14`,border:`0.5px solid ${priorityColor}30`,color:priorityColor,fontWeight:700}}>{tool.priority}</span>
                                  <span style={{fontSize:'10px',color:'#4a5168',display:'flex',alignItems:'center',gap:'.2rem'}}>
                                    <i className="ti ti-clock" style={{fontSize:'11px'}} aria-hidden="true"/>{tool.time}
                                  </span>
                                  <span style={{fontSize:'10px',color:tool.free?'#00e5a0':'#f5a623',display:'flex',alignItems:'center',gap:'.2rem'}}>
                                    <i className={`ti ${tool.free?'ti-gift':'ti-currency-rupee'}`} style={{fontSize:'11px'}} aria-hidden="true"/>
                                    {tool.free?'Free':'Paid'}
                                  </span>
                                </div>
                                <div style={{fontSize:'12px',color:'#8b93b0',lineHeight:1.4}}>{tool.purpose}</div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Verdict + survival tips */}
                  <div style={{background:'var(--bg3,#141828)',border:'0.5px solid rgba(255,255,255,0.07)',borderRadius:'16px',padding:'1.25rem',marginBottom:'1.25rem'}}>
                    <div style={{display:'flex',alignItems:'flex-start',gap:'.5rem',marginBottom:'.85rem',padding:'.75rem',background:'rgba(124,111,247,0.06)',border:'0.5px solid rgba(124,111,247,0.2)',borderRadius:'10px'}}>
                      <i className="ti ti-bulb" style={{fontSize:'16px',color:'#7c6ff7',flexShrink:0,marginTop:'1px'}} aria-hidden="true"/>
                      <div style={{fontSize:'13px',color:'#8b93b0',lineHeight:1.6}}>{ciData.verdict}</div>
                    </div>
                    {ciData.survival_tips?.length>0 && (
                      <>
                        <div style={{fontSize:'11px',fontWeight:700,color:'#00e5a0',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.5rem',display:'flex',alignItems:'center',gap:'.35rem'}}>
                          <i className="ti ti-shield-check" style={{fontSize:'13px'}} aria-hidden="true"/> Survival tips
                        </div>
                        {ciData.survival_tips.map((t,i)=>(
                          <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'.5rem',marginBottom:'.4rem',fontSize:'12px',color:'#8b93b0'}}>
                            <i className="ti ti-chevron-right" style={{fontSize:'13px',color:'#00e5a0',flexShrink:0,marginTop:'1px'}} aria-hidden="true"/>{t}
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  <button onClick={()=>{setCiData(null);setCiRole('');setCiError('')}}
                    style={{display:'flex',alignItems:'center',gap:'.4rem',padding:'.55rem 1rem',background:'none',border:'0.5px solid rgba(255,255,255,0.1)',borderRadius:'9px',color:'#8b93b0',fontSize:'12px',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
                    <i className="ti ti-search" style={{fontSize:'13px'}} aria-hidden="true"/> Search another role
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}