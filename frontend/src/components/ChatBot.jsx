import { useState, useRef, useEffect } from 'react'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hi! I'm JobsQ AI Assistant 👋 I can help you find jobs, improve your resume, prep for interviews, or answer any career questions. What would you like help with?" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pulse, setPulse] = useState(true)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 300)
      setPulse(false)
    }
  }, [open])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)

    try {
      const history = messages.map(m => ({
        role: m.role === 'bot' ? 'model' : 'user',
        parts: [{ text: m.text }]
      }))

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: {
              parts: [{ text: `You are JobsQ AI Assistant, a helpful career guidance chatbot for the JobsQ AI platform. 
              You help users with:
              - Finding the right jobs based on their skills
              - Resume writing and ATS optimization tips
              - Interview preparation and common questions
              - Career advice and skill development
              - Salary negotiation tips
              Keep responses concise, friendly and actionable. Use emojis occasionally to be engaging.` }]
            },
            contents: [
              ...history,
              { role: 'user', parts: [{ text: userMsg }] }
            ],
            generationConfig: { maxOutputTokens: 500, temperature: 0.7 }
          })
        }
      )
      const data = await res.json()
      const botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Sorry, I couldn't process that. Please try again!"
      setMessages(prev => [...prev, { role: 'bot', text: botReply }])
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: "Sorry, I'm having trouble connecting. Please check your internet and try again! 🔄" }])
    }
    setLoading(false)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const quickReplies = [
    '🔍 Find me jobs',
    '📄 Resume tips',
    '🎯 Interview prep',
    '💰 Salary advice'
  ]

  return (
    <>
      <style>{`
        .chatbot-wrap { position:fixed;bottom:24px;right:24px;z-index:1000;font-family:'Inter',system-ui,sans-serif; }

        /* FAB BUTTON */
        .chatbot-fab { width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,#00e5a0,#00c484);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 24px rgba(0,229,160,0.45);transition:transform .2s,box-shadow .2s;position:relative; }
        .chatbot-fab:hover { transform:scale(1.08);box-shadow:0 6px 32px rgba(0,229,160,0.6); }
        .chatbot-fab.open { background:linear-gradient(135deg,#ff4d6d,#cc3355);box-shadow:0 4px 24px rgba(255,77,109,0.4); }
        .chatbot-fab svg { transition:transform .3s; }
        .chatbot-fab.open svg { transform:rotate(90deg); }

        /* PULSE RING */
        .pulse-ring { position:absolute;inset:-4px;border-radius:50%;border:2px solid rgba(0,229,160,0.5);animation:pulseRing 2s ease-in-out infinite; }
        @keyframes pulseRing { 0%{transform:scale(1);opacity:.8} 100%{transform:scale(1.4);opacity:0} }

        /* NOTIFICATION DOT */
        .notif-dot { position:absolute;top:0;right:0;width:14px;height:14px;border-radius:50%;background:#ff4d6d;border:2px solid #080c18;display:flex;align-items:center;justify-content:center;font-size:8px;color:#fff;font-weight:700; }

        /* CHAT WINDOW */
        .chat-window {
          position:absolute;bottom:68px;right:0;
          width:340px;height:480px;
          background:rgba(10,14,28,0.97);
          border:1px solid rgba(255,255,255,0.1);
          border-radius:20px;
          display:flex;flex-direction:column;
          box-shadow:0 20px 60px rgba(0,0,0,0.6),0 0 0 1px rgba(255,255,255,0.05);
          backdrop-filter:blur(20px);
          overflow:hidden;
          transform-origin:bottom right;
          animation:chatOpen .25s ease;
        }
        @keyframes chatOpen { from{transform:scale(0.8);opacity:0} to{transform:scale(1);opacity:1} }

        /* CHAT HEADER */
        .chat-header { padding:.85rem 1rem;background:linear-gradient(135deg,rgba(0,229,160,0.15),rgba(124,111,247,0.1));border-bottom:1px solid rgba(255,255,255,0.07);display:flex;align-items:center;gap:.75rem; }
        .chat-avatar { width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#00e5a0,#00c484);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0; }
        .chat-header-info { flex:1; }
        .chat-header-name { font-size:13px;font-weight:700;color:#eef0ff; }
        .chat-header-status { font-size:11px;color:#00e5a0;display:flex;align-items:center;gap:4px; }
        .online-dot { width:6px;height:6px;border-radius:50%;background:#00e5a0;animation:blink 1.5s infinite; }
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        .chat-close { background:none;border:none;color:#8b93b0;cursor:pointer;font-size:18px;padding:.25rem;transition:color .15s; }
        .chat-close:hover { color:#eef0ff; }

        /* MESSAGES */
        .chat-messages { flex:1;overflow-y:auto;padding:.85rem;display:flex;flex-direction:column;gap:.6rem; }
        .chat-messages::-webkit-scrollbar { width:4px; }
        .chat-messages::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1);border-radius:2px; }

        .msg { max-width:82%;display:flex;flex-direction:column; }
        .msg.bot { align-self:flex-start; }
        .msg.user { align-self:flex-end; }
        .msg-bubble { padding:.6rem .85rem;border-radius:14px;font-size:13px;line-height:1.55; }
        .msg.bot .msg-bubble { background:rgba(255,255,255,0.07);color:#eef0ff;border-bottom-left-radius:4px; }
        .msg.user .msg-bubble { background:linear-gradient(135deg,#00e5a0,#00c484);color:#080c18;font-weight:500;border-bottom-right-radius:4px; }

        /* TYPING */
        .typing { display:flex;gap:4px;padding:.6rem .85rem;background:rgba(255,255,255,0.07);border-radius:14px;border-bottom-left-radius:4px;width:fit-content; }
        .typing span { width:6px;height:6px;border-radius:50%;background:#8b93b0;animation:typingDot 1.2s infinite; }
        .typing span:nth-child(2){animation-delay:.2s}
        .typing span:nth-child(3){animation-delay:.4s}
        @keyframes typingDot{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}

        /* QUICK REPLIES */
        .quick-replies { padding:.5rem .85rem;display:flex;flex-wrap:wrap;gap:.4rem; }
        .quick-btn { font-size:11px;padding:.35rem .75rem;border-radius:20px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:#8b93b0;cursor:pointer;transition:all .15s;font-family:'Inter',sans-serif;white-space:nowrap; }
        .quick-btn:hover { border-color:rgba(0,229,160,0.4);color:#00e5a0;background:rgba(0,229,160,0.08); }

        /* INPUT */
        .chat-input-wrap { padding:.75rem;border-top:1px solid rgba(255,255,255,0.07);display:flex;gap:.5rem;align-items:flex-end; }
        .chat-input { flex:1;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:.6rem .85rem;color:#eef0ff;font-size:13px;font-family:'Inter',sans-serif;outline:none;resize:none;max-height:80px;line-height:1.4;transition:border-color .2s; }
        .chat-input::placeholder { color:#4a5168; }
        .chat-input:focus { border-color:rgba(0,229,160,0.4); }
        .chat-send { width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#00e5a0,#00c484);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:opacity .15s,transform .15s; }
        .chat-send:hover { opacity:.88;transform:scale(1.05); }
        .chat-send:disabled { opacity:.4;cursor:default;transform:none; }
      `}</style>

      <div className="chatbot-wrap">

        {/* CHAT WINDOW */}
        {open && (
          <div className="chat-window">
            {/* HEADER */}
            <div className="chat-header">
              <div className="chat-avatar">🤖</div>
              <div className="chat-header-info">
                <div className="chat-header-name">JobsQ AI Assistant</div>
                <div className="chat-header-status">
                  <span className="online-dot"/>
                  Online · Powered by Gemini
                </div>
              </div>
              <button className="chat-close" onClick={() => setOpen(false)}>✕</button>
            </div>

            {/* MESSAGES */}
            <div className="chat-messages">
              {messages.map((m, i) => (
                <div key={i} className={`msg ${m.role}`}>
                  <div className="msg-bubble">{m.text}</div>
                </div>
              ))}
              {loading && (
                <div className="msg bot">
                  <div className="typing">
                    <span/><span/><span/>
                  </div>
                </div>
              )}
              <div ref={bottomRef}/>
            </div>

            {/* QUICK REPLIES — show only at start */}
            {messages.length <= 1 && (
              <div className="quick-replies">
                {quickReplies.map((q, i) => (
                  <button key={i} className="quick-btn" onClick={() => { setInput(q); setTimeout(() => sendMessage(), 50) }}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            {/* INPUT */}
            <div className="chat-input-wrap">
              <textarea
                ref={inputRef}
                className="chat-input"
                placeholder="Ask me anything about jobs..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
              />
              <button className="chat-send" onClick={sendMessage} disabled={!input.trim() || loading}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#080c18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* FAB BUTTON */}
        <button className={`chatbot-fab ${open ? 'open' : ''}`} onClick={() => setOpen(!open)}>
          {pulse && !open && <div className="pulse-ring"/>}
          {!open && messages.length > 1 && <div className="notif-dot">!</div>}
          {open ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#080c18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          )}
        </button>
      </div>
    </>
  )
}
