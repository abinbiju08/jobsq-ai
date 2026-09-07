import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const ROOMS = [
  { id:'IT & Software',    icon:'ti-code',            color:'#00e5a0', desc:'Dev, AI, Cloud, Cybersecurity' },
  { id:'Healthcare',       icon:'ti-heart-rate-monitor', color:'#ec4899', desc:'Doctors, Nurses, Pharma, Med tech' },
  { id:'Finance',          icon:'ti-chart-bar',       color:'#f5a623', desc:'Banking, Investment, CA, Fintech' },
  { id:'Engineering',      icon:'ti-settings-2',      color:'#3b82f6', desc:'Mechanical, Civil, Electrical, Auto' },
  { id:'Marketing',        icon:'ti-speakerphone',    color:'#a855f7', desc:'Digital, Brand, SEO, Content' },
  { id:'Education',        icon:'ti-school',          color:'#14b8a6', desc:'Teachers, EdTech, Research' },
  { id:'Sales',            icon:'ti-trending-up',     color:'#f97316', desc:'B2B, Retail, CRM, Business Dev' },
  { id:'Design',           icon:'ti-palette',         color:'#e879f9', desc:'UI/UX, Graphic, Product Design' },
  { id:'Operations',       icon:'ti-truck',           color:'#94a3b8', desc:'Supply chain, Logistics, HR, Admin' },
  { id:'General',          icon:'ti-messages',        color:'#7c6ff7', desc:'Career advice, Company reviews, AI doubts' },
]

const TAGS = ['Question','Company review','Interview exp','Salary talk','AI help','Off topic']
const TAG_COLORS = {
  'Question':        { bg:'rgba(0,229,160,0.1)',   color:'#00e5a0',  border:'rgba(0,229,160,0.25)' },
  'Company review':  { bg:'rgba(245,166,35,0.1)',  color:'#f5a623',  border:'rgba(245,166,35,0.25)' },
  'Interview exp':   { bg:'rgba(124,111,247,0.1)', color:'#7c6ff7',  border:'rgba(124,111,247,0.25)' },
  'Salary talk':     { bg:'rgba(59,130,246,0.1)',  color:'#3b82f6',  border:'rgba(59,130,246,0.25)' },
  'AI help':         { bg:'rgba(236,72,153,0.1)',  color:'#ec4899',  border:'rgba(236,72,153,0.25)' },
  'Off topic':       { bg:'rgba(148,163,184,0.1)', color:'#94a3b8',  border:'rgba(148,163,184,0.25)' },
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h/24)}d ago`
}

function Avatar({ initials, color, size = 32 }) {
  const bg = color + '22'
  return (
    <div style={{width:size,height:size,borderRadius:'50%',background:bg,border:`1.5px solid ${color}44`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontWeight:700,fontSize:size*0.35,color,fontFamily:'Inter,sans-serif'}}>
      {initials}
    </div>
  )
}

// Hash a string to pick a color deterministically
function colorForUser(name) {
  const colors = ['#00e5a0','#7c6ff7','#3b82f6','#f5a623','#ec4899','#14b8a6','#f97316','#a855f7']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return colors[Math.abs(h) % colors.length]
}

// ── CHAT ROOM ─────────────────────────────────────────────────────
function ChatRoom({ room, user, onBack }) {
  const [messages, setMessages] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [input, setInput]       = useState('')
  const [tag, setTag]           = useState('')
  const [sending, setSending]   = useState(false)
  const [onlineCount, setOnlineCount] = useState(1)
  const bottomRef = useRef(null)
  const channelRef = useRef(null)
  const inputRef = useRef(null)

  const userName = user?.email?.split('@')[0] || 'Anonymous'
  const userInitials = userName.slice(0,2).toUpperCase()
  const userColor = colorForUser(userName)

  // Load last 60 messages
  const loadMessages = useCallback(async () => {
    const { data } = await supabase
      .from('community_messages')
      .select('*')
      .eq('room', room.id)
      .order('created_at', { ascending: true })
      .limit(60)
    setMessages(data || [])
  }, [room.id])

  useEffect(() => {
    loadMessages()
    inputRef.current?.focus()

    // Simulate online count
    setOnlineCount(Math.floor(Math.random() * 40) + 5)

    // Supabase Realtime subscription
    const channel = supabase
      .channel(`room:${room.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'community_messages',
        filter: `room=eq.${room.id}`
      }, (payload) => {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.find(m => m.id === payload.new.id)) return prev
          return [...prev, payload.new]
        })
      })
      .subscribe()

    channelRef.current = channel
    return () => { supabase.removeChannel(channel) }
  }, [room.id, loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || sending || !user) return
    setSending(true)
    setInput('')
    const full = tag ? `[${tag}] ${text}` : text
    // Capture replyTo BEFORE clearing state
    const currentReply = replyTo
    setReplyTo(null)
    await supabase.from('community_messages').insert({
      room: room.id,
      user_id: user.id,
      user_name: userName,
      user_initials: userInitials,
      message: full,
      reply_to_id:   currentReply ? currentReply.id : null,
      reply_to_name: currentReply ? (currentReply.user_id === user.id ? 'You' : currentReply.user_name) : null,
      reply_to_text: currentReply ? parseMsg(currentReply.message).text.slice(0, 80) : null,
    })
    setSending(false)
    inputRef.current?.focus()
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  // Unsend message — only deletes if it belongs to current user
  const unsendMessage = async (msgId) => {
    if (!msgId) return
    await supabase
      .from('community_messages')
      .delete()
      .eq('id', msgId)
      .eq('user_id', user.id)
    // Remove from local state immediately
    setMessages(prev => prev.filter(m => m.id !== msgId))
  }

  // Edit message
  const startEdit = (msg) => {
    setEditingId(msg.id)
    const { text } = parseMsg(msg.message)
    setEditText(text)
  }

  const saveEdit = async (msg) => {
    if (!editText.trim()) return
    const tag = parseMsg(msg.message).tag
    const newMsg = tag ? `[${tag}] ${editText.trim()}` : editText.trim()
    await supabase
      .from('community_messages')
      .update({ message: newMsg })
      .eq('id', msg.id)
      .eq('user_id', user.id)
    setMessages(prev => prev.map(m => m.id === msg.id ? {...m, message: newMsg} : m))
    setEditingId(null)
    setEditText('')
  }

  // Parse tag from message
  const parseMsg = (msg) => {
    const match = msg.match(/^\[(.+?)\]\s*(.*)/)
    if (match) return { tag: match[1], text: match[2] }
    return { tag: null, text: msg }
  }

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"/>
      <style>{`
        @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .cr-msg{animation:fadeUp .18s ease;}
        .cr-msg:hover .msg-actions{opacity:1!important;}
        .msg-actions button:hover i{color:var(--text)!important;}
        .cr-input:focus{border-color:${room.color}55!important;}
        .cr-tag-btn:hover{border-color:${room.color}66!important;color:${room.color}!important;}
        .send-btn:hover{opacity:.85!important;}
        .cr-scroll::-webkit-scrollbar{width:3px;}
        .cr-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px;}
      `}</style>
      <div style={{display:'flex',flexDirection:'column',height:'100%',background:'var(--bg)'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'center',gap:'.75rem',padding:'.85rem 1.25rem',borderBottom:'1px solid var(--border)',background:'var(--bg2)',flexShrink:0}}>
          <button onClick={onBack} style={{background:'none',border:'none',color:'var(--text2)',cursor:'pointer',display:'flex',alignItems:'center',padding:'.2rem .4rem',borderRadius:'6px',transition:'color .15s'}}
            onMouseEnter={e=>e.currentTarget.style.color='var(--text)'}
            onMouseLeave={e=>e.currentTarget.style.color='var(--text2)'}>
            <i className="ti ti-arrow-left" style={{fontSize:'18px'}} aria-hidden="true"/>
          </button>
          <div style={{width:'36px',height:'36px',borderRadius:'10px',background:`${room.color}18`,border:`1px solid ${room.color}30`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
            <i className={`ti ${room.icon}`} style={{fontSize:'18px',color:room.color}} aria-hidden="true"/>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:'14px',fontWeight:700,color:'var(--text)'}}>{room.id}</div>
            <div style={{fontSize:'11px',color:'var(--text2)',marginTop:'1px'}}>{room.desc}</div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'.4rem',padding:'.3rem .75rem',borderRadius:'20px',background:'rgba(0,229,160,0.08)',border:'0.5px solid rgba(0,229,160,0.2)'}}>
            <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#00e5a0',animation:'blink 1.5s infinite'}}/>
            <span style={{fontSize:'11px',color:'#00e5a0',fontWeight:600}}>{onlineCount} online</span>
          </div>
          <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
        </div>

        {/* Messages */}
        <div className="cr-scroll" style={{flex:1,overflowY:'auto',padding:'1rem 1.25rem',display:'flex',flexDirection:'column',gap:'.85rem'}}>
          {messages.length === 0 && (
            <div style={{textAlign:'center',padding:'3rem 1rem',color:'var(--text3)'}}>
              <div style={{width:'52px',height:'52px',borderRadius:'14px',background:`${room.color}12`,border:`1px solid ${room.color}22`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto .75rem'}}>
                <i className={`ti ${room.icon}`} style={{fontSize:'24px',color:room.color}} aria-hidden="true"/>
              </div>
              <div style={{fontSize:'14px',fontWeight:600,color:'var(--text)',marginBottom:'.35rem'}}>Start the conversation!</div>
              <div style={{fontSize:'12px',lineHeight:1.6}}>Be the first to post in <strong style={{color:room.color}}>{room.id}</strong>. Ask a question, share an experience, or help someone out.</div>
            </div>
          )}
          {messages.map((msg, i) => {
            const isMine = msg.user_id === user?.id
            const { tag: msgTag, text: msgText } = parseMsg(msg.message)
            const tc = TAG_COLORS[msgTag] || null
            const uColor = colorForUser(msg.user_name)
            return (
              <div key={msg.id || i} className="cr-msg" style={{display:'flex',gap:'.65rem',alignItems:'flex-start',flexDirection:isMine?'row-reverse':'row'}}>
                <Avatar initials={msg.user_initials} color={uColor} size={32}/>
                <div style={{maxWidth:'72%',display:'flex',flexDirection:'column',alignItems:isMine?'flex-end':'flex-start'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'.4rem',marginBottom:'3px',flexDirection:isMine?'row-reverse':'row'}}>
                    <span style={{fontSize:'11px',fontWeight:700,color:isMine?room.color:uColor}}>{isMine?'You':msg.user_name}</span>
                    <span style={{fontSize:'10px',color:'var(--text3)'}}>{timeAgo(msg.created_at)}</span>
                    {msgTag && tc && <span style={{fontSize:'9px',padding:'1px 7px',borderRadius:'10px',background:tc.bg,color:tc.color,border:`0.5px solid ${tc.border}`,fontWeight:700}}>{msgTag}</span>}
                  </div>
                  {editingId === msg.id ? (
                    <div style={{display:'flex',gap:'.35rem',alignItems:'center',maxWidth:'260px'}}>
                      <input
                        value={editText}
                        onChange={e=>setEditText(e.target.value)}
                        onKeyDown={e=>{ if(e.key==='Enter') saveEdit(msg); if(e.key==='Escape'){setEditingId(null);setEditText('')} }}
                        autoFocus
                        style={{flex:1,background:'var(--bg3)',border:`1px solid ${room.color}`,borderRadius:'10px',padding:'.45rem .75rem',fontSize:'13px',color:'var(--text)',fontFamily:'Inter,sans-serif',outline:'none'}}
                      />
                      <button onClick={()=>saveEdit(msg)}
                        style={{background:room.color,border:'none',borderRadius:'8px',padding:'.35rem .6rem',cursor:'pointer',display:'flex',alignItems:'center',flexShrink:0}}
                        aria-label="Save edit">
                        <i className="ti ti-send" style={{fontSize:'13px',color:'#060d0a'}} aria-hidden="true"/>
                      </button>
                      <button onClick={()=>{setEditingId(null);setEditText('')}}
                        style={{background:'var(--bg3)',border:'0.5px solid var(--border)',borderRadius:'8px',padding:'.35rem .6rem',cursor:'pointer',display:'flex',alignItems:'center',flexShrink:0}}
                        aria-label="Cancel edit">
                        <i className="ti ti-x" style={{fontSize:'13px',color:'var(--text2)'}} aria-hidden="true"/>
                      </button>
                    </div>
                  ) : (
                    <div style={{display:'flex',alignItems:'center',gap:'.35rem',flexDirection:isMine?'row-reverse':'row'}}>
                      <div style={{padding:'.55rem .85rem',borderRadius:isMine?'14px 14px 3px 14px':'14px 14px 14px 3px',background:isMine?`${room.color}18`:'rgba(255,255,255,0.05)',border:`0.5px solid ${isMine?room.color+'30':'var(--border)'}`,fontSize:'13px',color:'var(--text)',lineHeight:1.55,wordBreak:'break-word',maxWidth:'260px'}}>
                        {msg.reply_to_text && (
                          <div style={{background:'rgba(255,255,255,0.06)',borderLeft:`3px solid ${room.color}`,borderRadius:'4px',padding:'.3rem .5rem',marginBottom:'.4rem',fontSize:'11px',color:'var(--text2)'}}>
                            <div style={{fontWeight:700,color:room.color,marginBottom:'1px',fontSize:'10px'}}>{msg.reply_to_name}</div>
                            <div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{msg.reply_to_text}{msg.reply_to_text && msg.reply_to_text.length >= 60 ? '...' : ''}</div>
                          </div>
                        )}
                        {msgText}
                      </div>
                      <div className="msg-actions" style={{display:'flex',gap:'2px',opacity:0,transition:'opacity .15s',flexShrink:0,flexDirection:isMine?'row-reverse':'row'}}>
                        <button onClick={()=>setReplyTo(msg)} title="Reply"
                          style={{background:'none',border:'none',cursor:'pointer',padding:'.25rem',color:'var(--text3)',display:'flex',alignItems:'center'}}
                          aria-label="Reply to message">
                          <i className="ti ti-arrow-back-up" style={{fontSize:'13px'}} aria-hidden="true"/>
                        </button>
                        {isMine && <>
                          <button onClick={()=>startEdit(msg)} title="Edit"
                            style={{background:'none',border:'none',cursor:'pointer',padding:'.25rem',color:'var(--text3)',display:'flex',alignItems:'center'}}
                            aria-label="Edit message">
                            <i className="ti ti-edit" style={{fontSize:'13px'}} aria-hidden="true"/>
                          </button>
                          <button onClick={()=>unsendMessage(msg.id)} title="Delete"
                            style={{background:'none',border:'none',cursor:'pointer',padding:'.25rem',color:'var(--text3)',display:'flex',alignItems:'center'}}
                            aria-label="Delete message">
                            <i className="ti ti-trash" style={{fontSize:'13px'}} aria-hidden="true"/>
                          </button>
                        </>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          <div ref={bottomRef}/>
        </div>

        {/* Tag picker */}
        <div style={{padding:'.5rem 1.25rem 0',display:'flex',gap:'.35rem',flexWrap:'wrap',flexShrink:0}}>
          {TAGS.map(t=>{
            const tc = TAG_COLORS[t]
            const active = tag === t
            return (
              <button key={t} className="cr-tag-btn" onClick={()=>setTag(active?'':t)}
                style={{fontSize:'10px',padding:'2px 9px',borderRadius:'20px',border:`0.5px solid ${active?tc.border:'var(--border)'}`,background:active?tc.bg:'transparent',color:active?tc.color:'var(--text3)',cursor:'pointer',fontFamily:'Inter,sans-serif',fontWeight:active?700:400,transition:'all .15s'}}>
                {t}
              </button>
            )
          })}
          {tag && <button onClick={()=>setTag('')} style={{fontSize:'10px',padding:'2px 6px',borderRadius:'20px',border:'none',background:'none',color:'var(--text3)',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>✕ clear</button>}
        </div>

        {/* Reply preview bar */}
        {replyTo && (
          <div style={{padding:'.5rem .85rem',background:'var(--bg3)',borderTop:'0.5px solid var(--border)',display:'flex',alignItems:'center',gap:'.5rem',flexShrink:0}}>
            <div style={{flex:1,borderLeft:`3px solid ${room.color}`,paddingLeft:'.5rem'}}>
              <div style={{fontSize:'10px',fontWeight:700,color:room.color,marginBottom:'1px'}}>
                Replying to {replyTo.user_id === user?.id ? 'yourself' : replyTo.user_name}
              </div>
              <div style={{fontSize:'11px',color:'var(--text2)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {parseMsg(replyTo.message).text.slice(0,60)}
              </div>
            </div>
            <button onClick={()=>setReplyTo(null)}
              style={{background:'none',border:'none',cursor:'pointer',color:'var(--text3)',padding:'.2rem',display:'flex',alignItems:'center'}}
              aria-label="Cancel reply">
              <i className="ti ti-x" style={{fontSize:'14px'}} aria-hidden="true"/>
            </button>
          </div>
        )}

        {/* Input */}
        <div style={{padding:'.75rem 1.25rem',borderTop:'1px solid var(--border)',display:'flex',gap:'.5rem',alignItems:'flex-end',flexShrink:0}}>
          <Avatar initials={userInitials} color={userColor} size={30}/>
          <textarea
            ref={inputRef}
            className="cr-input"
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder={`Message ${room.id}${tag?' · '+tag:''}...`}
            rows={1}
            style={{flex:1,background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:'10px',padding:'.6rem .85rem',color:'var(--text)',fontSize:'13px',fontFamily:'Inter,sans-serif',outline:'none',resize:'none',maxHeight:'100px',lineHeight:1.5,transition:'border-color .2s'}}
          />
          <button className="send-btn" onClick={send} disabled={!input.trim()||sending}
            style={{width:'36px',height:'36px',borderRadius:'9px',background:input.trim()?`linear-gradient(135deg,${room.color},${room.color}cc)`:'var(--border)',border:'none',cursor:input.trim()?'pointer':'default',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,transition:'all .15s',opacity:sending?.6:1}}>
            <i className="ti ti-send" style={{fontSize:'16px',color:input.trim()?'#060d0a':'var(--text3)'}} aria-hidden="true"/>
          </button>
        </div>
      </div>
    </>
  )
}

// ── ROOM LIST ─────────────────────────────────────────────────────
export default function LetsConnect() {
  const [user, setUser]           = useState(null)
  const [activeRoom, setActiveRoom] = useState(null)
  const [search, setSearch]       = useState('')
  const [roomCounts, setRoomCounts] = useState({})

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    loadCounts()
  }, [])

  const loadCounts = async () => {
    // Get message counts per room (last 24h for activity indicator)
    const since = new Date(Date.now() - 24*60*60*1000).toISOString()
    const { data } = await supabase
      .from('community_messages')
      .select('room')
      .gte('created_at', since)
    if (!data) return
    const counts = {}
    data.forEach(r => { counts[r.room] = (counts[r.room]||0) + 1 })
    setRoomCounts(counts)
  }

  const filteredRooms = ROOMS.filter(r =>
    !search || r.id.toLowerCase().includes(search.toLowerCase()) || r.desc.toLowerCase().includes(search.toLowerCase())
  )

  if (activeRoom) {
    return (
      <div style={{height:'calc(100vh - 52px)'}}>
        <ChatRoom room={activeRoom} user={user} onBack={()=>{ setActiveRoom(null); loadCounts() }}/>
      </div>
    )
  }

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"/>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .room-card{background:var(--bg3);border:1px solid var(--border);border-radius:16px;padding:1.25rem;cursor:pointer;transition:all .2s;position:relative;overflow:hidden;}
        .room-card:hover{transform:translateY(-3px);}
        .room-card::after{content:'';position:absolute;inset:0;border-radius:16px;opacity:0;transition:opacity .2s;pointer-events:none;}
        .room-card:hover::after{opacity:1;}
      `}</style>
      <div style={{background:'var(--bg)',minHeight:'calc(100vh - 52px)',background:'var(--bg)',fontFamily:'Inter,sans-serif'}}>

        {/* Hero */}
        <div style={{background:'linear-gradient(135deg,rgba(124,111,247,0.08),rgba(0,229,160,0.04))',borderBottom:'1px solid var(--border)',padding:'2rem 1.5rem 1.5rem'}}>
          <div style={{maxWidth:'900px',margin:'0 auto'}}>
            <div style={{display:'flex',alignItems:'center',gap:'.75rem',marginBottom:'.5rem'}}>
              <div style={{width:'40px',height:'40px',borderRadius:'12px',background:'rgba(124,111,247,0.12)',border:'1px solid rgba(124,111,247,0.25)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <i className="ti ti-users" style={{fontSize:'20px',color:'#7c6ff7'}} aria-hidden="true"/>
              </div>
              <div>
                <h1 style={{fontSize:'22px',fontWeight:800,color:'var(--text)',margin:0}}>Let's Connect</h1>
                <div style={{fontSize:'12px',color:'var(--text2)',marginTop:'2px'}}>India's job seeker community — ask, share, and grow together</div>
              </div>
            </div>

            {/* Stats row */}
            <div style={{display:'flex',gap:'1.5rem',margin:'1rem 0',flexWrap:'wrap'}}>
              {[
                {icon:'ti-messages',    label:'Community chats',  val:'10 rooms'},
                {icon:'ti-users',       label:'Active today',     val:`${Object.values(roomCounts).reduce((a,b)=>a+b,0)} msgs`},
                {icon:'ti-map-pin',     label:'Coverage',         val:'All India'},
                {icon:'ti-shield-check',label:'Safe space',       val:'Moderated'},
              ].map(s=>(
                <div key={s.label} style={{display:'flex',alignItems:'center',gap:'.5rem'}}>
                  <i className={`ti ${s.icon}`} style={{fontSize:'15px',color:'#7c6ff7'}} aria-hidden="true"/>
                  <span style={{fontSize:'12px',color:'var(--text2)'}}>{s.label}: <strong style={{color:'var(--text)'}}>{s.val}</strong></span>
                </div>
              ))}
            </div>

            {/* Search */}
            <div style={{position:'relative',maxWidth:'420px'}}>
              <i className="ti ti-search" style={{position:'absolute',left:'.85rem',top:'50%',transform:'translateY(-50%)',fontSize:'14px',color:'var(--text3)'}} aria-hidden="true"/>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                style={{width:'100%',background:'var(--bg3)',border:'1px solid var(--border2)',borderRadius:'10px',padding:'.6rem .85rem .6rem 2.5rem',color:'var(--text)',fontSize:'13px',fontFamily:'Inter,sans-serif',outline:'none',boxSizing:'border-box'}}
                placeholder='Search field or topic...'/>
            </div>
          </div>
        </div>

        {/* Rooms grid */}
        <div style={{maxWidth:'900px',margin:'0 auto',padding:'1.5rem'}}>

          {/* Tips banner */}
          <div style={{display:'flex',gap:'1rem',padding:'.75rem 1rem',background:'rgba(0,229,160,0.05)',border:'0.5px solid rgba(0,229,160,0.15)',borderRadius:'12px',marginBottom:'1.5rem',flexWrap:'wrap'}}>
            {[
              {icon:'ti-help-circle',  text:'Ask doubts about companies, salary, interviews'},
              {icon:'ti-robot',        text:'Get AI help or discuss AI tools for your career'},
              {icon:'ti-star',         text:'Share your experience to help others'},
            ].map((t,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:'.4rem',fontSize:'12px',color:'var(--text2)'}}>
                <i className={`ti ${t.icon}`} style={{fontSize:'14px',color:'#00e5a0',flexShrink:0}} aria-hidden="true"/>
                {t.text}
              </div>
            ))}
          </div>

          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',gap:'1rem'}}>
            {filteredRooms.map(room=>{
              const count = roomCounts[room.id] || 0
              const isActive = count > 0
              return (
                <div key={room.id} className="room-card"
                  style={{borderColor:isActive?`${room.color}25`:'var(--border)'}}
                  onClick={()=>setActiveRoom(room)}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=room.color+'55';e.currentTarget.style.boxShadow=`0 8px 24px ${room.color}18`}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor=isActive?`${room.color}25`:'var(--border)';e.currentTarget.style.boxShadow='none'}}>

                  {/* Glow orb */}
                  <div style={{position:'absolute',top:'-20px',right:'-20px',width:'80px',height:'80px',borderRadius:'50%',background:`${room.color}0e`,filter:'blur(20px)',pointerEvents:'none'}}/>

                  <div style={{display:'flex',alignItems:'flex-start',gap:'.75rem',marginBottom:'.85rem',position:'relative'}}>
                    <div style={{width:'40px',height:'40px',borderRadius:'11px',background:`${room.color}14`,border:`1px solid ${room.color}25`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <i className={`ti ${room.icon}`} style={{fontSize:'20px',color:room.color}} aria-hidden="true"/>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:'14px',fontWeight:700,color:'var(--text)',marginBottom:'2px'}}>{room.id}</div>
                      <div style={{fontSize:'11px',color:'var(--text2)',lineHeight:1.4}}>{room.desc}</div>
                    </div>
                  </div>

                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'.35rem'}}>
                      {isActive ? (
                        <>
                          <div style={{width:'6px',height:'6px',borderRadius:'50%',background:room.color,animation:'spin 0s, pulse 1.5s infinite',boxShadow:`0 0 5px ${room.color}`}}/>
                          <span style={{fontSize:'11px',color:room.color,fontWeight:600}}>{count} messages today</span>
                        </>
                      ) : (
                        <>
                          <div style={{width:'6px',height:'6px',borderRadius:'50%',background:'rgba(255,255,255,0.15)'}}/>
                          <span style={{fontSize:'11px',color:'var(--text3)'}}>Be the first to post</span>
                        </>
                      )}
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:'.25rem',fontSize:'11px',color:room.color,fontWeight:600}}>
                      Join <i className="ti ti-arrow-right" style={{fontSize:'12px'}} aria-hidden="true"/>
                    </div>
                  </div>
                  <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
                </div>
              )
            })}
          </div>

          {filteredRooms.length === 0 && (
            <div style={{textAlign:'center',padding:'3rem',color:'var(--text3)'}}>
              <i className="ti ti-search-off" style={{fontSize:'32px',display:'block',marginBottom:'.75rem'}} aria-hidden="true"/>
              No rooms match your search
            </div>
          )}
        </div>
      </div>
    </>
  )
}