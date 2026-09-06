import { useState, useEffect, useRef, useCallback } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function speak(text, onEnd) {
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.rate = 1.05
  utter.pitch = 1.1
  utter.volume = 1
  const load = () => {
    const voices = window.speechSynthesis.getVoices()
    const preferred = ['Samantha','Karen','Moira','Tessa','Ava','Allison','Fiona','Victoria','Google US English','Microsoft Zira','Microsoft Aria']
    let picked = null
    for (const name of preferred) {
      picked = voices.find(v => v.name.includes(name) && v.lang.startsWith('en'))
      if (picked) break
    }
    if (!picked) picked = voices.find(v => v.lang.startsWith('en-') && v.name.toLowerCase().includes('female'))
    if (!picked) picked = voices.find(v => v.lang.startsWith('en'))
    if (picked) utter.voice = picked
    utter.onend = () => onEnd && onEnd()
    window.speechSynthesis.speak(utter)
  }
  if (window.speechSynthesis.getVoices().length) load()
  else { window.speechSynthesis.onvoiceschanged = load }
}

export default function VoiceAssistant() {
  const [open, setOpen]           = useState(false)
  const [state, setState]         = useState('idle') // idle | listening | thinking | speaking
  const [transcript, setTranscript] = useState('')
  const [response, setResponse]   = useState('')
  const [history, setHistory]     = useState([])
  const [error, setError]         = useState('')
  const recRef = useRef(null)

  // Preload voices on mount
  useEffect(() => {
    window.speechSynthesis.getVoices()
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices()
  }, [])

  // Cancel speech when closing
  const close = () => {
    window.speechSynthesis.cancel()
    try { recRef.current?.stop() } catch(e) {}
    setState('idle')
    setOpen(false)
  }

  const stopSpeaking = () => {
    window.speechSynthesis.cancel()
    setState('idle')
  }

  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition not supported. Please use Chrome.')
      return
    }
    window.speechSynthesis.cancel()
    setTranscript('')
    setError('')
    setState('listening')

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.lang = 'en-US'
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.continuous = false

    let finalText = ''

    rec.onresult = (e) => {
      let interim = '', final = ''
      for (let i = 0; i < e.results.length; i++) {
        if (e.results[i].isFinal) final += e.results[i][0].transcript
        else interim += e.results[i][0].transcript
      }
      finalText = final || interim
      setTranscript(finalText)
    }

    rec.onend = () => {
      if (finalText.trim()) sendToAI(finalText.trim())
      else { setState('idle'); setError('No speech detected. Try again.') }
    }

    rec.onerror = (e) => {
      if (e.error !== 'aborted') setError(`Mic error: ${e.error}. Make sure mic is allowed.`)
      setState('idle')
    }

    recRef.current = rec
    try { rec.start() } catch(e) { setError('Could not start mic.'); setState('idle') }
  }, [history])

  const sendToAI = useCallback(async (text) => {
    setState('thinking')
    try {
      const res = await fetch(`${API}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: history.slice(-4).map(h => ({
            role: h.role === 'user' ? 'user' : 'assistant',
            content: h.text
          }))
        })
      })
      const data = await res.json()
      const reply = data.reply || "Sorry, I couldn't process that. Please try again."
      setResponse(reply)
      setHistory(prev => [...prev, { role:'user', text }, { role:'ai', text: reply }])
      setState('speaking')
      speak(reply, () => setState('idle'))
    } catch(e) {
      const fallback = "I'm having trouble connecting right now. Please try again."
      setResponse(fallback)
      setState('speaking')
      speak(fallback, () => setState('idle'))
    }
  }, [history])

  const quickPrompts = [
    { icon:'ti-file-text',         text:'Resume tips' },
    { icon:'ti-users',             text:'Interview prep' },
    { icon:'ti-currency-dollar',   text:'Salary negotiation' },
    { icon:'ti-target',            text:'Job search strategy' },
  ]

  const orbConfig = {
    idle:      { bg:'rgba(255,255,255,0.05)', border:'rgba(255,255,255,0.12)', icon:'ti-microphone', color:'#8b93b0', spin:false, pulse:false },
    listening: { bg:'rgba(0,200,130,0.12)',   border:'rgba(0,200,130,0.5)',   icon:'ti-microphone', color:'#00c482', spin:false, pulse:true  },
    thinking:  { bg:'rgba(124,111,247,0.12)', border:'rgba(124,111,247,0.4)', icon:'ti-loader',     color:'#7c6ff7', spin:true,  pulse:false },
    speaking:  { bg:'rgba(0,200,130,0.12)',   border:'rgba(0,200,130,0.5)',   icon:'ti-volume',     color:'#00c482', spin:false, pulse:true  },
  }
  const orb = orbConfig[state]

  const statusLabel = { idle:'Tap mic to speak', listening:'Listening...', thinking:'Thinking...', speaking:'Speaking...' }

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"/>
      <style>{`
        @keyframes vaFadeUp { from{opacity:0;transform:translateY(12px) scale(.97)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes vaPulse  { 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.14);opacity:.15} }
        @keyframes vaPulse2 { 0%,100%{transform:scale(1);opacity:.3} 50%{transform:scale(1.22);opacity:.07} }
        @keyframes vaSpin   { to{transform:rotate(360deg)} }
        @keyframes vaWave1  { 0%,100%{height:6px}  50%{height:20px} }
        @keyframes vaWave2  { 0%,100%{height:14px} 50%{height:6px}  }
        @keyframes vaWave3  { 0%,100%{height:20px} 50%{height:8px}  }
        @keyframes vaFadeIn { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        .va-popup    { animation: vaFadeUp .22s ease; }
        .va-msg      { animation: vaFadeIn .18s ease; }
        .va-fab:hover { transform:scale(1.08); }
        .va-qbtn:hover { border-color:rgba(0,200,130,0.35)!important; color:#00c482!important; background:rgba(0,200,130,0.06)!important; }
      `}</style>

      {/* ── POPUP ── */}
      {open && (
        <div style={{position:'fixed',bottom:'84px',right:'24px',zIndex:2000,width:'320px',pointerEvents:'all'}}>
          <div className="va-popup" style={{background:'rgba(10,14,30,0.98)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:'22px',padding:'1.2rem',boxShadow:'0 20px 60px rgba(0,0,0,0.6)',backdropFilter:'blur(24px)',overflow:'hidden',position:'relative'}}>

            {/* Subtle glow */}
            <div style={{position:'absolute',top:0,left:0,right:0,height:'80px',background:'radial-gradient(ellipse at 50% 0%,rgba(0,200,130,0.07) 0%,transparent 70%)',pointerEvents:'none'}}/>

            {/* Header */}
            <div style={{display:'flex',alignItems:'center',gap:'.6rem',marginBottom:'1rem',position:'relative'}}>
              <div style={{width:'30px',height:'30px',borderRadius:'8px',background:'rgba(0,200,130,0.1)',border:'0.5px solid rgba(0,200,130,0.25)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                <i className="ti ti-microphone" style={{fontSize:'15px',color:'#00c482'}} aria-hidden="true"/>
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:'13px',fontWeight:700,color:'#eef0ff'}}>JobsQ Voice AI</div>
                <div style={{fontSize:'10px',color:'#4a5168',marginTop:'1px'}}>{statusLabel[state]}</div>
              </div>
              <button onClick={close} style={{background:'none',border:'none',color:'#4a5168',cursor:'pointer',display:'flex',alignItems:'center',padding:'.2rem',transition:'color .15s'}}
                onMouseEnter={e=>e.currentTarget.style.color='#8b93b0'}
                onMouseLeave={e=>e.currentTarget.style.color='#4a5168'}>
                <i className="ti ti-x" style={{fontSize:'17px'}} aria-hidden="true"/>
              </button>
            </div>

            {/* Orb */}
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',marginBottom:'1rem'}}>
              <div style={{position:'relative',width:'76px',height:'76px',marginBottom: state==='listening'?'6px':'1rem'}}>
                {orb.pulse && <>
                  <div style={{position:'absolute',inset:'-8px',borderRadius:'50%',border:`1.5px solid ${orb.border}`,animation:'vaPulse 2s ease-in-out infinite',pointerEvents:'none'}}/>
                  <div style={{position:'absolute',inset:'-16px',borderRadius:'50%',border:`1.5px solid ${orb.border}`,animation:'vaPulse2 2s ease-in-out infinite .6s',pointerEvents:'none'}}/>
                </>}
                <button
                  onClick={state==='listening' ? ()=>{ try{recRef.current?.stop()}catch(e){} } : state==='speaking' ? stopSpeaking : startListening}
                  style={{width:'76px',height:'76px',borderRadius:'50%',background:orb.bg,border:`2px solid ${orb.border}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all .3s',position:'relative',zIndex:1}}>
                  <i className={`ti ${orb.icon}`} style={{fontSize:'30px',color:orb.color,animation:orb.spin?'vaSpin 1s linear infinite':undefined}} aria-hidden="true"/>
                </button>
              </div>

              {/* Waveform */}
              {state==='listening' && (
                <div style={{display:'flex',alignItems:'center',gap:'3px',height:'26px',marginBottom:'.75rem'}}>
                  {[
                    ['6px','vaWave1','0s'],['14px','vaWave2','.1s'],['20px','vaWave3','.2s'],
                    ['14px','vaWave2','.3s'],['20px','vaWave1','.15s'],['8px','vaWave2','.25s'],['14px','vaWave3','.05s']
                  ].map(([h,a,d],i)=>(
                    <div key={i} style={{width:'3px',borderRadius:'2px',background:'#00c482',height:h,animation:`${a} .65s ease-in-out infinite ${d}`}}/>
                  ))}
                </div>
              )}
            </div>

            {/* Conversation */}
            {(transcript || response) && (
              <div style={{maxHeight:'180px',overflowY:'auto',display:'flex',flexDirection:'column',gap:'.5rem',marginBottom:'.75rem'}}>
                {/* Scroll to latest messages via history */}
                {history.slice(-4).map((msg, i) => (
                  <div key={i} className="va-msg" style={{
                    alignSelf: msg.role==='user'?'flex-end':'flex-start',
                    maxWidth:'88%',
                    padding:'.55rem .8rem',
                    borderRadius: msg.role==='user'?'14px 14px 3px 14px':'14px 14px 14px 3px',
                    background: msg.role==='user'?'linear-gradient(135deg,#00e5a0,#00c484)':'rgba(255,255,255,0.06)',
                    color: msg.role==='user'?'#060d0a':'rgba(255,255,255,0.85)',
                    fontSize:'12.5px',
                    lineHeight:1.5,
                    fontWeight: msg.role==='user'?600:400,
                  }}>
                    {msg.text}
                  </div>
                ))}
                {/* Show current transcript if speaking in progress */}
                {state==='listening' && transcript && (
                  <div className="va-msg" style={{alignSelf:'flex-end',maxWidth:'88%',padding:'.55rem .8rem',borderRadius:'14px 14px 3px 14px',background:'rgba(0,229,160,0.15)',border:'0.5px solid rgba(0,229,160,0.3)',color:'#00e5a0',fontSize:'12.5px',lineHeight:1.5,fontStyle:'italic'}}>
                    {transcript}...
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{display:'flex',alignItems:'center',gap:'.4rem',padding:'.5rem .7rem',background:'rgba(255,77,77,0.08)',border:'0.5px solid rgba(255,77,77,0.2)',borderRadius:'8px',marginBottom:'.65rem',fontSize:'11.5px',color:'#ff6b6b'}}>
                <i className="ti ti-alert-circle" style={{fontSize:'13px',flexShrink:0}} aria-hidden="true"/>
                {error}
              </div>
            )}

            {/* Quick prompts — only when idle and no conversation */}
            {state==='idle' && history.length===0 && (
              <div className="va-msg" style={{marginBottom:'.75rem'}}>
                <div style={{fontSize:'10px',color:'#4a5168',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.4rem'}}>Try asking</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:'.3rem'}}>
                  {quickPrompts.map(q=>(
                    <button key={q.text} className="va-qbtn" onClick={()=>{setTranscript(q.text);sendToAI(q.text)}}
                      style={{display:'inline-flex',alignItems:'center',gap:'.3rem',fontSize:'11px',padding:'.32rem .65rem',borderRadius:'20px',border:'0.5px solid rgba(255,255,255,0.08)',background:'rgba(255,255,255,0.03)',color:'#8b93b0',cursor:'pointer',fontFamily:'Inter,sans-serif',transition:'all .15s'}}>
                      <i className={`ti ${q.icon}`} style={{fontSize:'12px'}} aria-hidden="true"/>
                      {q.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom action */}
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{fontSize:'10px',color:'#2a2f45'}}>Powered by Groq AI</div>
              {history.length>0 && (
                <button onClick={()=>{setHistory([]);setTranscript('');setResponse('');setError('')}}
                  style={{display:'flex',alignItems:'center',gap:'.3rem',fontSize:'11px',color:'#4a5168',background:'none',border:'none',cursor:'pointer',fontFamily:'Inter,sans-serif',transition:'color .15s'}}
                  onMouseEnter={e=>e.currentTarget.style.color='#8b93b0'}
                  onMouseLeave={e=>e.currentTarget.style.color='#4a5168'}>
                  <i className="ti ti-trash" style={{fontSize:'13px'}} aria-hidden="true"/> Clear
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ── FAB ── */}
      <button
        className="va-fab"
        onClick={()=>{ if(open){ close() } else { setOpen(true); setTimeout(startListening, 350) } }}
        title="JobsQ Voice AI"
        style={{position:'fixed',bottom:'84px',right:'24px',zIndex:1000,width:'48px',height:'48px',borderRadius:'50%',background:open?'rgba(0,200,130,0.15)':'rgba(10,14,30,0.96)',border:`1px solid ${open?'rgba(0,200,130,0.4)':'rgba(255,255,255,0.1)'}`,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all .2s',boxShadow:'0 4px 16px rgba(0,0,0,0.4)'}}>
        <div style={{position:'absolute',inset:'-4px',borderRadius:'50%',border:'1.5px solid rgba(0,200,130,0.2)',animation:'vaPulse 2.5s ease-in-out infinite',pointerEvents:'none'}}/>
        <i className="ti ti-microphone" style={{fontSize:'20px',color:open?'#00c482':'#00c482'}} aria-hidden="true"/>
      </button>
    </>
  )
}