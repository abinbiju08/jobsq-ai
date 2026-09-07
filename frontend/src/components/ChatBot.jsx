import { useState, useRef, useEffect } from 'react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/[ \t]+/g, ' ').trim()
}

function parseBold(text) {
  if (!text) return text
  if (!text.includes('**')) return text
  const parts = text.split(/\*\*/)
  return parts.map((p, i) =>
    i % 2 === 1
      ? <strong key={i} style={{color:'var(--text)',fontWeight:700}}>{p}</strong>
      : <span key={i}>{p}</span>
  )
}

function renderMarkdown(text) {
  if (!text) return []
  const lines = text.split(/\r?\n/).filter(l => l.trim())
  const els = []
  const tipCards = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line) { i++; continue }

    // Numbered tip card
    const numMatch = line.match(/^(\d+)\.\s+(.+)/)
    if (numMatch) {
      const num = numMatch[1]
      const content = numMatch[2]
      const splitMatch = content.match(/^(.+?)[:–\-]\s*(.+)/)
      const title = splitMatch ? splitMatch[1].trim() : content
      const body  = splitMatch ? splitMatch[2].trim() : ''
      tipCards.push({ num, title, body })
      i++; continue
    }

    // Flush collected tip cards as single column
    if (tipCards.length > 0) {
      tipCards.forEach((tip, ti) => {
        els.push(
          <div key={'tip-'+ti} style={{display:'flex',gap:'.6rem',marginBottom:'.5rem',alignItems:'flex-start',padding:'.6rem .75rem',background:'rgba(0,229,160,0.05)',border:'0.5px solid rgba(0,229,160,0.15)',borderRadius:'10px'}}>
            <div style={{width:'22px',height:'22px',borderRadius:'6px',background:'rgba(0,229,160,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:800,color:'#00e5a0',flexShrink:0,marginTop:'1px'}}>{tip.num}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:'12.5px',fontWeight:700,color:'var(--text,#eef0ff)',marginBottom:tip.body?'3px':0}}>{tip.title}</div>
              {tip.body && <div style={{fontSize:'12px',color:'var(--text2,#8b93b0)',lineHeight:1.5}}>{tip.body}</div>}
            </div>
          </div>
        )
      })
      tipCards.length = 0
    }

    // Bullet
    const bulletMatch = line.match(/^[-•*]\s+(.+)/)
    if (bulletMatch) {
      els.push(
        <div key={i} style={{display:'flex',gap:'.4rem',marginBottom:'.3rem',alignItems:'flex-start'}}>
          <div style={{width:'5px',height:'5px',borderRadius:'50%',background:'#00e5a0',flexShrink:0,marginTop:'7px'}}/>
          <div style={{fontSize:'12.5px',color:'var(--text2,#8b93b0)',lineHeight:1.5,flex:1}}>{parseBold(bulletMatch[1])}</div>
        </div>
      )
      i++; continue
    }

    // Regular line
    els.push(
      <div key={i} style={{fontSize:'12.5px',color:'var(--text,#eef0ff)',lineHeight:1.65,marginBottom:'.2rem'}}>{parseBold(line)}</div>
    )
    i++
  }

  // Flush any remaining tips
  if (tipCards.length > 0) {
    tipCards.forEach((tip, ti) => {
      els.push(
        <div key={'tip-end-'+ti} style={{display:'flex',gap:'.6rem',marginBottom:'.5rem',alignItems:'flex-start',padding:'.6rem .75rem',background:'rgba(0,229,160,0.05)',border:'0.5px solid rgba(0,229,160,0.15)',borderRadius:'10px'}}>
          <div style={{width:'22px',height:'22px',borderRadius:'6px',background:'rgba(0,229,160,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'11px',fontWeight:800,color:'#00e5a0',flexShrink:0,marginTop:'1px'}}>{tip.num}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:'12.5px',fontWeight:700,color:'var(--text,#eef0ff)',marginBottom:tip.body?'3px':0}}>{tip.title}</div>
            {tip.body && <div style={{fontSize:'12px',color:'var(--text2,#8b93b0)',lineHeight:1.5}}>{tip.body}</div>}
          </div>
        </div>
      )
    })
  }

  return els
}

function JobSearchForm({ onSubmit }) {
  const [vals, setVals] = useState({ location:'', role:'', level:'', type:'', skills:'' })
  const [active, setActive] = useState(null)

  const fields = [
    { id:'location', icon:'ti-map-pin',     label:'Location',         placeholder:'Bangalore, Mumbai, Remote...', color:'#00e5a0' },
    { id:'role',     icon:'ti-briefcase',   label:'Job role',         placeholder:'Software Engineer, Data Analyst...', color:'#3b82f6' },
    { id:'level',    icon:'ti-trending-up', label:'Experience level', placeholder:'Fresher, Mid-level, Senior...', color:'#f5a623' },
    { id:'type',     icon:'ti-clock',       label:'Job type',         placeholder:'Full-time, Remote, Contract...', color:'#7c6ff7' },
    { id:'skills',   icon:'ti-code',        label:'Skills / Stack',   placeholder:'React, Python, AWS...', color:'#ec4899' },
  ]

  const filled = Object.values(vals).filter(v => v.trim()).length

  const send = () => {
    const parts = []
    if (vals.location) parts.push(`Location: ${vals.location}`)
    if (vals.role)     parts.push(`Role: ${vals.role}`)
    if (vals.level)    parts.push(`Experience: ${vals.level}`)
    if (vals.type)     parts.push(`Job type: ${vals.type}`)
    if (vals.skills)   parts.push(`Skills: ${vals.skills}`)
    if (!parts.length) return
    onSubmit(`Find me jobs — ${parts.join(', ')}`)
  }

  return (
    <div style={{background:'rgba(0,229,160,0.04)',border:'1px solid rgba(0,229,160,0.15)',borderRadius:'14px',padding:'.85rem',width:'100%'}}>
      <div style={{fontSize:'11px',fontWeight:700,color:'#00e5a0',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.65rem',display:'flex',alignItems:'center',gap:'.35rem'}}>
        <i className="ti ti-search" style={{fontSize:'13px'}} aria-hidden="true"/> Fill your preferences
      </div>
      {fields.map(f => (
        <div key={f.id} style={{marginBottom:'.4rem'}}>
          {active !== f.id ? (
            <div onClick={()=>setActive(f.id)}
              style={{display:'flex',alignItems:'center',gap:'.5rem',padding:'.45rem .65rem',borderRadius:'8px',border:`0.5px solid ${vals[f.id]?f.color+'40':'var(--border)'}`,background:vals[f.id]?f.color+'0c':'rgba(255,255,255,0.02)',cursor:'pointer'}}>
              <i className={`ti ${f.icon}`} style={{fontSize:'13px',color:vals[f.id]?f.color:'var(--text3)',flexShrink:0}} aria-hidden="true"/>
              <span style={{fontSize:'12px',color:vals[f.id]?f.color:'var(--text3)',flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{vals[f.id]||f.label}</span>
              <i className={`ti ${vals[f.id]?'ti-circle-check':'ti-chevron-down'}`} style={{fontSize:'12px',color:vals[f.id]?f.color:'var(--text3)',flexShrink:0}} aria-hidden="true"/>
            </div>
          ) : (
            <div style={{border:`1px solid ${f.color}50`,borderRadius:'8px',background:`${f.color}08`,overflow:'hidden'}}>
              <div style={{display:'flex',alignItems:'center',gap:'.4rem',padding:'.35rem .6rem',borderBottom:`0.5px solid ${f.color}25`}}>
                <i className={`ti ${f.icon}`} style={{fontSize:'12px',color:f.color}} aria-hidden="true"/>
                <span style={{fontSize:'11px',fontWeight:700,color:f.color}}>{f.label}</span>
              </div>
              <div style={{display:'flex',gap:'.35rem',padding:'.35rem .5rem',alignItems:'center'}}>
                <input autoFocus value={vals[f.id]}
                  onChange={e=>setVals(v=>({...v,[f.id]:e.target.value}))}
                  onKeyDown={e=>{if(e.key==='Enter'||e.key==='Escape')setActive(null)}}
                  placeholder={f.placeholder}
                  style={{flex:1,background:'none',border:'none',color:'var(--text)',fontSize:'12px',fontFamily:'Inter,sans-serif',outline:'none'}}/>
                <button onClick={()=>setActive(null)}
                  style={{background:'#00c484',border:'none',borderRadius:'6px',padding:'.22rem .5rem',cursor:'pointer',fontSize:'11px',fontWeight:700,color:'#060d0a',fontFamily:'Inter,sans-serif'}}>
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
      <button onClick={send} disabled={filled===0}
        style={{width:'100%',marginTop:'.55rem',display:'flex',alignItems:'center',justifyContent:'center',gap:'.4rem',padding:'.5rem',background:filled>0?'linear-gradient(135deg,#00e5a0,#00c484)':'var(--border)',border:'none',borderRadius:'9px',color:filled>0?'#060d0a':'var(--text3)',fontSize:'12px',fontWeight:700,cursor:filled>0?'pointer':'not-allowed',fontFamily:'Inter,sans-serif'}}>
        <i className="ti ti-search" style={{fontSize:'13px'}} aria-hidden="true"/>
        {filled>0?`Find jobs (${filled} filters set)`:'Fill at least one field'}
      </button>
    </div>
  )
}

function JobCards({ jobs, total }) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:'.5rem',width:'100%'}}>
      <div style={{fontSize:'11px',color:'var(--text3)',display:'flex',alignItems:'center',gap:'.3rem',marginBottom:'.1rem'}}>
        <i className="ti ti-database" style={{fontSize:'12px',color:'#00e5a0'}} aria-hidden="true"/>
        {total} real jobs found — showing {jobs.length}
      </div>
      {jobs.map((job, i) => (
        <div key={i} style={{background:'rgba(255,255,255,0.04)',border:'0.5px solid var(--border)',borderRadius:'12px',padding:'.75rem'}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:'.5rem',marginBottom:'.35rem'}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:'13px',fontWeight:700,color:'var(--text)',marginBottom:'2px',lineHeight:1.3}}>{job.title}</div>
              <div style={{fontSize:'11px',color:'#00e5a0',fontWeight:600}}>{job.company}</div>
            </div>
            <span style={{fontSize:'10px',padding:'2px 7px',borderRadius:'20px',background:'rgba(59,130,246,0.1)',border:'0.5px solid rgba(59,130,246,0.2)',color:'#3b82f6',flexShrink:0,fontWeight:600,whiteSpace:'nowrap'}}>{job.type||'Full-time'}</span>
          </div>
          <div style={{display:'flex',gap:'.5rem',flexWrap:'wrap',marginBottom:'.4rem'}}>
            {job.location&&<span style={{display:'flex',alignItems:'center',gap:'.2rem',fontSize:'10px',color:'var(--text2)'}}><i className="ti ti-map-pin" style={{fontSize:'11px'}} aria-hidden="true"/>{job.location}</span>}
            {job.salary&&job.salary!=='Not disclosed'&&<span style={{display:'flex',alignItems:'center',gap:'.2rem',fontSize:'10px',color:'#00e5a0',fontWeight:600}}><i className="ti ti-currency-rupee" style={{fontSize:'11px'}} aria-hidden="true"/>{job.salary}</span>}
            {job.source&&<span style={{fontSize:'10px',color:'var(--text3)'}}>via {job.source}</span>}
          </div>
          {job.description&&<div style={{fontSize:'11px',color:'var(--text2)',lineHeight:1.5,marginBottom:'.5rem'}}>{job.description}</div>}
          <a href={job.apply_url} target="_blank" rel="noopener noreferrer"
            style={{display:'flex',alignItems:'center',justifyContent:'center',gap:'.35rem',padding:'.4rem .75rem',background:'linear-gradient(135deg,#00e5a0,#00c484)',borderRadius:'8px',color:'#060d0a',fontSize:'12px',fontWeight:700,textDecoration:'none'}}>
            <i className="ti ti-external-link" style={{fontSize:'13px'}} aria-hidden="true"/>
            Apply now — {job.company}
          </a>
        </div>
      ))}
    </div>
  )
}

function BotBubble({ msg, onFormSubmit }) {
  if (msg.jobs && msg.jobs.length > 0) {
    return (
      <div style={{display:'flex',flexDirection:'column',gap:'.5rem',alignSelf:'flex-start',maxWidth:'95%',animation:'fadeIn .2s ease'}}>
        {msg.text && <div style={{fontSize:'12.5px',color:'var(--text2)',marginBottom:'.25rem'}}>{msg.text}</div>}
        <JobCards jobs={msg.jobs} total={msg.total||msg.jobs.length}/>
      </div>
    )
  }
  if (msg.showForm) {
    return (
      <div style={{display:'flex',flexDirection:'column',gap:'.5rem',alignSelf:'flex-start',maxWidth:'95%',animation:'fadeIn .2s ease'}}>
        {msg.text && <div style={{background:'rgba(255,255,255,0.05)',border:'0.5px solid var(--border)',borderRadius:'14px 14px 14px 3px',padding:'.6rem .85rem',fontSize:'12.5px',color:'var(--text)',lineHeight:1.6}}>{msg.text}</div>}
        <JobSearchForm onSubmit={onFormSubmit}/>
      </div>
    )
  }
  const rendered = renderMarkdown(msg.text)
  const isStructured = msg.text.includes('\n') || /^\d+\.\s/.test(msg.text)
  return (
    <div style={{background:'rgba(255,255,255,0.05)',border:'0.5px solid var(--border)',borderRadius:'14px 14px 14px 3px',padding:isStructured?'.75rem .85rem':'.6rem .85rem',maxWidth:'88%',alignSelf:'flex-start',animation:'fadeIn .2s ease'}}>
      {isStructured ? rendered : <span style={{fontSize:'12.5px',color:'var(--text)',lineHeight:1.6}}>{parseBold(msg.text)}</span>}
    </div>
  )
}

export default function ChatBot() {
  const [open, setOpen]         = useState(false)
  const [messages, setMessages] = useState([
    { role:'bot', text:"Hi — I'm your JobsQ career assistant. I can help find real jobs from our database, resume tips, interview prep, and salary advice. What would you like help with?" }
  ])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [pulse, setPulse]       = useState(true)
  const bottomRef = useRef(null)
  const inputRef  = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages, loading])
  useEffect(() => { if (open) { setTimeout(()=>inputRef.current?.focus(),300); setPulse(false) } }, [open])

  const addBot = (props) => setMessages(prev => [...prev, { role:'bot', ...props }])

  const sendMessage = async (overrideText) => {
    const userMsg = (overrideText || input).trim()
    if (!userMsg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role:'user', text:userMsg }])
    setLoading(true)

    const isJobSearch = /find me jobs|location:|role:|job type:/i.test(userMsg)
    const hasDetails  = /location:|role:|experience:|skills:/i.test(userMsg)

    if (isJobSearch && !hasDetails) {
      addBot({ text:"Sure! Fill in your preferences and I'll search our real job database:", showForm:true })
      setLoading(false)
      return
    }

    if (isJobSearch && hasDetails) {
      const get = (key) => { const m = userMsg.match(new RegExp(`${key}:\\s*([^,]+)`, 'i')); return m ? m[1].trim() : '' }
      const role     = get('Role') || get('role')
      const location = get('Location') || get('location')
      const jobType  = get('Job type') || get('job type')
      const skills   = get('Skills') || get('skills')
      try {
        const params = new URLSearchParams()
        if (role)     params.set('search', role)
        if (location && !['india','all','anywhere'].includes(location.toLowerCase())) params.set('location', location)
        if (jobType && !['all','any'].includes(jobType.toLowerCase())) params.set('job_type', jobType)
        const res = await fetch(`${API}/jobs/?${params.toString()}`)
        if (!res.ok) throw new Error(`Server error ${res.status}`)
        const raw = await res.json()
        const all = Array.isArray(raw) ? raw : []
        if (all.length === 0) {
          const res2 = await fetch(`${API}/jobs/?search=${encodeURIComponent(role)}`)
          const raw2 = await res2.json()
          const all2 = Array.isArray(raw2) ? raw2 : []
          if (all2.length === 0) {
            addBot({ text: `No "${role}" jobs in our database right now. Our scrapers run every 2 hours — try again soon, or search directly on the Jobs page.` })
            setLoading(false); return
          }
          const jobs = all2.slice(0,5).map(j => ({
            title: j.title||'Job Opening', company: j.company||'Company',
            location: j.city||j.location||'India', salary: j.salary||'Not disclosed',
            type: j.job_type||'Full-time', source: j.source||'',
            description: stripHtml(j.description||'').slice(0,100)+'...',
            apply_url: j.url||j.apply_url||`${window.location.origin}/jobs`,
          }))
          addBot({ text:`No exact match for "${location}" — showing ${role} jobs:`, jobs, total: all2.length })
          setLoading(false); return
        }
        const skillList = skills ? skills.split(',').map(s=>s.trim().toLowerCase()).filter(Boolean) : []
        let filtered = all
        if (skillList.length > 0) {
          const sf = all.filter(j => {
            const txt = `${j.title||''} ${j.description||''} ${j.category||''}`.toLowerCase()
            return skillList.some(s => txt.includes(s))
          })
          if (sf.length > 0) filtered = sf
        }
        const jobs = filtered.slice(0,5).map(j => ({
          title: j.title||'Job Opening', company: j.company||'Company',
          location: j.city||j.location||location||'India', salary: j.salary||'Not disclosed',
          type: j.job_type||jobType||'Full-time', source: j.source||'',
          description: stripHtml(j.description||'').slice(0,100)+'...',
          apply_url: j.url||j.apply_url||`${window.location.origin}/jobs`,
        }))
        addBot({ text:`Found ${all.length} real jobs — showing top ${jobs.length}:`, jobs, total: all.length })
      } catch(err) {
        addBot({ text:`Database error: ${err.message}. Please check the backend is running.` })
      }
      setLoading(false); return
    }

    const isAck = /^(ok|okay|thanks|thank you|got it|great|nice|cool|good|sure|alright|noted|perfect|awesome|👍|🙏)[\s!.]*$/i.test(userMsg)
    if (isAck) {
      const lastBotMsg = [...messages].reverse().find(m => m.role === 'bot')
      const hadJobs = lastBotMsg && lastBotMsg.jobs && lastBotMsg.jobs.length > 0
      addBot({ text: hadJobs
        ? "Glad I could help! Want me to search for more jobs, or can I help with anything else — resume tips, interview prep, salary advice?"
        : "Sure! Let me know if you need anything else — job search, resume tips, interview prep, or salary advice." })
      setLoading(false); return
    }

    try {
      const history = messages.slice(-10).map(m => ({
        role: m.role==='bot' ? 'assistant' : 'user',
        content: m.text || ''
      })).filter(m => m.content)

      const SYSTEM = `You are JobsQ AI — a career assistant for job seekers in India.

RESPONSE FORMAT (strictly follow):
- Always use numbered list: 1. Title: explanation on same line.
- Each point on its own line. Max 5 points. No **, no ##, no ---, no tables.
- Each point max 2 sentences. Total under 200 words.

HANDLE THESE TOPICS:

Resume tips → Give 5 specific ATS resume tips. Cover: keywords, layout, skills section, achievements with numbers, file format.

Interview tips → Give 5 practical interview techniques. Cover: STAR method, research company, body language, common questions, follow-up.

Salary negotiation → Give 5 India-specific salary tactics. Cover: market research, timing, counter-offer, benefits, walking away.

Job search → Use the Find me jobs flow. Ask for location and role.

For anything unrelated to careers, politely decline.`

      const res  = await fetch(`${API}/ai/chat`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ message: userMsg, history, system: SYSTEM })
      })
      const data = await res.json()
      const reply = data.reply || "Sorry, couldn't process that. Please try again."
      const cleaned = reply
        .replace(/#{1,6}\s*/g, '')
        .replace(/^>\s*/gm, '')
        .replace(/\*{1,3}(.+?)\*{1,3}/g, '$1')
        .split('\n')
        .filter(l => {
          const t = l.trim()
          return t && !t.startsWith('|') && !t.match(/^-+\|/) && t !== '---'
        })
        .join('\n')
        .trim()
        .slice(0, 2000)
      const showForm = /what.*location|which.*city|what.*role|tell me.*detail|let me know.*prefer/i.test(cleaned)
      addBot({ text: cleaned, showForm })
    } catch(err) {
      addBot({ text: 'Connection error — please check the backend is running.' })
    }
    setLoading(false)
  }

  const quickReplies = [
    { icon:'ti-search',        label:'Find me jobs',     text:'Find me jobs' },
    { icon:'ti-file-check',    label:'Resume tips',      text:'Give me 5 resume tips to improve ATS score' },
    { icon:'ti-microphone',    label:'Interview tips',   text:'Give me top interview tips for freshers' },
    { icon:'ti-currency-rupee',label:'Salary advice',    text:'How do I negotiate salary effectively in India?' },
  ]

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"/>
      <style>{`
        @keyframes pulseRing{0%{transform:scale(1);opacity:.8}100%{transform:scale(1.5);opacity:0}}
        @keyframes chatOpen{from{transform:scale(0.9) translateY(8px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
        @keyframes typingDot{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        .cb-fab{width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#00e5a0,#00c484);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 20px rgba(0,229,160,0.4);transition:transform .2s;position:relative;flex-shrink:0;}
        .cb-fab:hover{transform:scale(1.07);}
        .cb-fab.open{background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.12);box-shadow:none;}
        .cb-pulse{position:absolute;inset:-4px;border-radius:50%;border:2px solid rgba(0,229,160,0.45);animation:pulseRing 2s ease-in-out infinite;}
        .cb-notif{position:absolute;top:1px;right:1px;width:12px;height:12px;border-radius:50%;background:#E24B4A;border:2px solid #080c18;}
        .cb-win{position:fixed;bottom:122px;right:24px;width:320px;background:rgba(10,14,28,0.99);border:1px solid rgba(255,255,255,0.09);border-radius:18px;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.6);overflow:hidden;transform-origin:bottom right;animation:chatOpen .22s ease;max-height:72vh;z-index:999;}
        .cb-msgs{flex:1;overflow-y:auto;padding:.85rem;display:flex;flex-direction:column;gap:.6rem;}
        .cb-msgs::-webkit-scrollbar{width:3px;}
        .cb-msgs::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px;}
        .cb-user{background:linear-gradient(135deg,#00e5a0,#00c484);color:#080c18;font-weight:600;border-radius:14px 14px 3px 14px;padding:.55rem .85rem;max-width:80%;align-self:flex-end;font-size:13px;line-height:1.5;animation:fadeIn .18s ease;}
        .cb-typing{display:flex;gap:4px;padding:.55rem .85rem;background:rgba(255,255,255,0.06);border-radius:14px 14px 14px 3px;width:fit-content;}
        .cb-typing span{width:6px;height:6px;border-radius:50%;background:#8b93b0;animation:typingDot 1.2s infinite;}
        .cb-typing span:nth-child(2){animation-delay:.2s}.cb-typing span:nth-child(3){animation-delay:.4s}
        .cb-qr{padding:.4rem .85rem .6rem;display:flex;flex-wrap:wrap;gap:.3rem;flex-shrink:0;}
        .cb-qr-btn{display:inline-flex;align-items:center;gap:.3rem;font-size:11px;padding:.3rem .65rem;border-radius:20px;border:0.5px solid rgba(255,255,255,0.09);background:rgba(255,255,255,0.03);color:#8b93b0;cursor:pointer;transition:all .15s;font-family:Inter,sans-serif;}
        .cb-qr-btn:hover{border-color:rgba(0,229,160,0.35);color:#00e5a0;background:rgba(0,229,160,0.07);}
        .cb-footer{padding:.65rem .75rem;border-top:1px solid rgba(255,255,255,0.07);display:flex;gap:.4rem;align-items:flex-end;flex-shrink:0;background:rgba(10,14,28,0.99);z-index:2;}
        .cb-input{flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:.55rem .75rem;color:#eef0ff;font-size:13px;font-family:Inter,sans-serif;outline:none;resize:none;line-height:1.4;max-height:72px;transition:border-color .2s;}
        .cb-input::placeholder{color:#4a5168;}
        .cb-input:focus{border-color:rgba(0,229,160,0.35);}
        .cb-send{width:36px;height:36px;border-radius:9px;background:linear-gradient(135deg,#00e5a0,#00c484);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(0,229,160,0.3);}
        .cb-send:disabled{opacity:.3;cursor:default;}
      `}</style>

      {open && (
        <div className="cb-win">
          <div style={{padding:'.75rem 1rem',background:'rgba(255,255,255,0.03)',borderBottom:'1px solid rgba(255,255,255,0.07)',display:'flex',alignItems:'center',gap:'.7rem',flexShrink:0}}>
            <div style={{width:'32px',height:'32px',borderRadius:'9px',background:'rgba(0,229,160,0.1)',border:'0.5px solid rgba(0,229,160,0.25)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <i className="ti ti-robot" style={{fontSize:'17px',color:'#00e5a0'}} aria-hidden="true"/>
            </div>
            <div style={{flex:1}}>
              <div style={{fontSize:'13px',fontWeight:700,color:'var(--text)'}}>JobsQ AI</div>
              <div style={{fontSize:'10px',color:'var(--text2)',display:'flex',alignItems:'center',gap:'4px',marginTop:'1px'}}>
                <div style={{width:'5px',height:'5px',borderRadius:'50%',background:'#00e5a0',animation:'blink 1.5s infinite'}}/>
                Online · Real job data
              </div>
            </div>
            <button onClick={()=>setOpen(false)} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',display:'flex',padding:'.15rem',transition:'color .15s'}}
              onMouseEnter={e=>e.currentTarget.style.color='var(--text)'}
              onMouseLeave={e=>e.currentTarget.style.color='var(--text3)'}>
              <i className="ti ti-x" style={{fontSize:'17px'}} aria-hidden="true"/>
            </button>
          </div>
          <div className="cb-msgs">
            {messages.map((m, i) => (
              <div key={i} style={{display:'flex',flexDirection:'column'}}>
                {m.role==='user'
                  ? <div className="cb-user">{m.text}</div>
                  : <BotBubble msg={m} onFormSubmit={sendMessage}/>
                }
              </div>
            ))}
            {loading && <div className="cb-typing"><span/><span/><span/></div>}
            <div ref={bottomRef}/>
          </div>
          {messages.length <= 1 && (
            <div className="cb-qr">
              {quickReplies.map((q,i) => (
                <button key={i} className="cb-qr-btn" onClick={()=>sendMessage(q.text)}>
                  <i className={`ti ${q.icon}`} style={{fontSize:'12px'}} aria-hidden="true"/>
                  {q.label}
                </button>
              ))}
            </div>
          )}
          <div className="cb-footer">
            <textarea ref={inputRef} className="cb-input"
              placeholder="Ask anything about your career..."
              value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()} }}
              rows={1}/>
            <button className="cb-send" onClick={()=>sendMessage()} disabled={!input.trim()||loading} aria-label="Send">
              <i className="ti ti-send" style={{fontSize:'15px',color:'#060d0a'}} aria-hidden="true"/>
            </button>
          </div>
        </div>
      )}
      <button className={`cb-fab ${open?'open':''}`} onClick={()=>setOpen(!open)} aria-label={open?'Close chat':'Open chat'}>
        {pulse && !open && <div className="cb-pulse"/>}
        {!open && messages.length>1 && <div className="cb-notif"/>}
        <i className={`ti ${open?'ti-x':'ti-message-circle'}`} style={{fontSize:'22px',color:open?'var(--text2)':'#060d0a'}} aria-hidden="true"/>
      </button>
    </>
  )
}