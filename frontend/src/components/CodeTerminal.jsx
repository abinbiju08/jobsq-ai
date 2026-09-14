import { useState, useEffect, useRef } from 'react'
import Editor from '@monaco-editor/react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const LANGUAGES = [
  { id: 'python',     label: 'Python',     icon: '🐍', color: '#3b82f6' },
  { id: 'javascript', label: 'JavaScript', icon: '🟨', color: '#f59e0b' },
  { id: 'java',       label: 'Java',       icon: '☕', color: '#ef4444' },
  { id: 'c++',        label: 'C++',        icon: '⚙️', color: '#8b5cf6' },
  { id: 'sql',        label: 'SQL',        icon: '🗄️', color: '#10b981' },
]

const DIFFICULTIES = [
  { id: 'beginner',     label: 'Beginner',     color: '#10b981', xp: 10 },
  { id: 'intermediate', label: 'Intermediate', color: '#f59e0b', xp: 25 },
  { id: 'advanced',     label: 'Advanced',     color: '#ef4444', xp: 50 },
]

const BADGES = [
  { min: 0,    name: 'Beginner',   icon: '🌱' },
  { min: 50,   name: 'Apprentice', icon: '🔧' },
  { min: 150,  name: 'Developer',  icon: '💻' },
  { min: 300,  name: 'Engineer',   icon: '⚙️' },
  { min: 500,  name: 'Senior',     icon: '🚀' },
  { min: 800,  name: 'Expert',     icon: '🏆' },
  { min: 1200, name: 'Master',     icon: '👑' },
]

function getBadge(xp) {
  let badge = BADGES[0]
  for (const b of BADGES) { if (xp >= b.min) badge = b }
  return badge
}

function XPBar({ xp, animating }) {
  const badge    = getBadge(xp)
  const nextIdx  = BADGES.findIndex(b => b.min > xp)
  const next     = nextIdx !== -1 ? BADGES[nextIdx] : null
  const prevMin  = badge.min
  const nextMin  = next?.min || prevMin + 200
  const pct      = Math.min(100, ((xp - prevMin) / (nextMin - prevMin)) * 100)

  return (
    <div style={{ background: animating ? 'rgba(0,229,160,0.06)' : 'rgba(255,255,255,0.03)', border: `0.5px solid ${animating ? 'rgba(0,229,160,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '10px', padding: '.65rem .85rem', transition: 'all .4s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
          <span style={{ fontSize: '1.1rem' }}>{badge.icon}</span>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#eef0ff' }}>{badge.name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
          {animating && <span style={{ fontSize: '11px', color: '#00e5a0', fontWeight: 700, animation: 'pulse 1s ease infinite' }}>+XP ↑</span>}
          <span style={{ fontSize: '11px', color: animating ? '#00e5a0' : '#7c6ff7', fontWeight: 700 }}>{xp} XP</span>
        </div>
      </div>
      <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: animating ? 'linear-gradient(90deg,#00e5a0,#7c6ff7)' : 'linear-gradient(90deg,#7c6ff7,#00e5a0)', borderRadius: '2px', transition: 'width .8s ease' }} />
      </div>
      {next
        ? <div style={{ fontSize: '10px', color: animating ? '#00e5a0' : '#4a5168', marginTop: '.25rem', transition: 'color .4s' }}>{next.min - xp} XP to {next.icon} {next.name}</div>
        : <div style={{ fontSize: '10px', color: '#fbbf24', marginTop: '.25rem' }}>👑 Max rank achieved!</div>
      }
    </div>
  )
}

export default function CodeTerminal({ user, role = 'Full Stack Developer' }) {
  const [lang, setLang]           = useState('python')
  const [difficulty, setDiff]     = useState('beginner')
  const [problem, setProblem]     = useState(null)
  const [code, setCode]           = useState('')
  const [output, setOutput]       = useState(null)
  const [loadingProb, setLoadingProb] = useState(false)
  const [running, setRunning]     = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [scores, setScores]       = useState({})
  const [activeTab, setActiveTab] = useState('problem')  // problem | output | hints
  const [xpPopup, setXpPopup]     = useState(null)
  const [leaderboard, setLeaderboard] = useState([])
  const [lbLang, setLbLang]       = useState('global')
  const [lbLoading, setLbLoading] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [solved, setSolved]       = useState(false)
  const [prevXP, setPrevXP]       = useState(0)
  const [animXP, setAnimXP]       = useState(false)
  const [errorLine, setErrorLine] = useState(null)
  const editorRef = useRef(null)
  const monacoRef = useRef(null)

  const currentLang = LANGUAGES.find(l => l.id === lang)
  const currentDiff = DIFFICULTIES.find(d => d.id === difficulty)
  const currentScore = scores[lang] || { xp: 0, problems_solved: 0 }

  useEffect(() => { if (user?.id) fetchScores() }, [user?.id])

  async function fetchScores() {
    try {
      const res  = await fetch(`${API}/terminal/skill-scores/${user.id}`)
      const data = await res.json()
      if (data.success) setScores(data.scores)
    } catch {}
  }

  async function generateProblem() {
    setLoadingProb(true); setProblem(null); setOutput(null); setSolved(false); setActiveTab('problem')
    try {
      const res  = await fetch(`${API}/terminal/generate-problem`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, language: lang, difficulty, user_id: user.id })
      })
      const data = await res.json()
      if (data.success) {
        setProblem(data.problem)
        setCode(data.problem.starter_code?.[lang] || '')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingProb(false)
    }
  }

  async function fetchLeaderboard(language) {
    setLbLoading(true)
    try {
      const url = language === 'global'
        ? `${API}/terminal/global-leaderboard`
        : `${API}/terminal/leaderboard/${language}`
      const res  = await fetch(url)
      const data = await res.json()
      if (data.success) setLeaderboard(data.leaderboard)
    } catch {}
    setLbLoading(false)
  }

  function extractErrorLine(stderr, language) {
    if (!stderr) return null
    // Python: line 3, in ..., File "x.py", line 3
    let m = stderr.match(/line (\d+)/i)
    if (m) return parseInt(m[1])
    // JavaScript: at line:col or :3:5
    m = stderr.match(/:(\d+):\d+/)
    if (m) return parseInt(m[1])
    // Java: .java:3)
    m = stderr.match(/\.java:(\d+)/)
    if (m) return parseInt(m[1])
    // C++: :3:5: error
    m = stderr.match(/:(\d+):\d+: error/i)
    if (m) return parseInt(m[1])
    return null
  }

  function highlightErrorLine(lineNum) {
    if (!editorRef.current || !monacoRef.current || !lineNum) return
    const monaco = monacoRef.current
    const editor = editorRef.current
    // Clear previous decorations
    editor.deltaDecorations(editor.getModel()?.getAllDecorations()?.map(d => d.id) || [], [])
    // Add red line highlight
    editor.deltaDecorations([], [
      {
        range: new monaco.Range(lineNum, 1, lineNum, 1),
        options: {
          isWholeLine: true,
          className: 'error-line-highlight',
          glyphMarginClassName: 'error-glyph',
          overviewRuler: { color: '#ff6b6b', position: 1 },
          minimap: { color: '#ff6b6b', position: 1 },
        }
      }
    ])
    // Scroll to error line
    editor.revealLineInCenter(lineNum)
  }

  async function runCode() {
    if (!code.trim()) return
    setRunning(true); setOutput(null); setActiveTab('output')
    try {
      const testCase = problem?.test_cases?.[0] || {}
      const stdin    = testCase.input || ''
      const expected = testCase.expected_output || ''
      const res = await fetch(`${API}/terminal/run-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang, code, stdin, expected_output: expected })
      })
      const data = await res.json()
      setOutput(data)
      // Extract and highlight error line
      if (data.stderr && !data.passed) {
        const errLine = extractErrorLine(data.stderr, lang)
        setErrorLine(errLine)
        if (errLine) highlightErrorLine(errLine)
      } else {
        setErrorLine(null)
        // Clear decorations on success
        if (editorRef.current) {
          editorRef.current.deltaDecorations(
            editorRef.current.getModel()?.getAllDecorations()?.map(d => d.id) || [], []
          )
        }
      }
    } catch (e) {
      setOutput({ success: false, stderr: e.message })
    } finally {
      setRunning(false)
    }
  }

  async function submitSolution() {
    if (!problem || !output?.passed) return
    setSubmitting(true)
    try {
      const res  = await fetch(`${API}/terminal/submit-solution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id:    user.id,
          language:   lang,
          difficulty,
          problem_id: problem.id,
          code,
          passed:     true,
        })
      })
      const data = await res.json()
      if (data.success) {
        setSolved(true)
        // Save old XP for animation
        const oldXP = scores[lang]?.xp || 0
        setPrevXP(oldXP)
        // Refresh scores first
        await fetchScores()
        // Then show popup and animate
        setXpPopup({ xp: data.xp_earned, badge: data.badge, message: data.message, total: data.total_xp })
        setAnimXP(true)
        setTimeout(() => { setXpPopup(null); setAnimXP(false) }, 5000)
      } else if (data.already_solved) {
        setSolved(true)
        alert('Already solved! No duplicate XP.')
      }
    } catch {}
    finally { setSubmitting(false) }
  }

  const monacoLang = lang === 'c++' ? 'cpp' : lang === 'sql' ? 'sql' : lang

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"/>
      <style>{`
        @keyframes xpPop{0%{opacity:0;transform:translateY(20px) scale(.8)}20%{opacity:1;transform:translateY(0) scale(1)}80%{opacity:1}100%{opacity:0;transform:translateY(-20px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .ct-tab{padding:.35rem .75rem;border-radius:8px;font-size:12px;font-weight:600;cursor:pointer;border:none;font-family:Inter,sans-serif;transition:all .15s;}
        .ct-tab.active{background:rgba(124,111,247,0.15);color:#a89ef7;border:0.5px solid rgba(124,111,247,0.3);}
        .ct-tab.inactive{background:none;color:#4a5168;}
        .ct-tab.inactive:hover{color:#8b93b0;}
      `}</style>

      {/* XP Popup */}
      {xpPopup && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999, minWidth: '260px', background: 'linear-gradient(135deg,#1a1a2e,#16213e)', border: '1px solid rgba(0,229,160,0.4)', borderRadius: '16px', padding: '1.25rem 1.5rem', color: '#fff', animation: 'xpPop 5s ease forwards', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', marginBottom: '.75rem' }}>
            <div style={{ fontSize: '2rem' }}>{xpPopup.badge?.icon}</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#00e5a0' }}>🎉 {xpPopup.message}</div>
              <div style={{ fontSize: '11px', color: '#8b93b0', marginTop: '2px' }}>{xpPopup.badge?.name} rank</div>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', padding: '.6rem .85rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.35rem' }}>
              <span style={{ fontSize: '11px', color: '#4a5168' }}>{currentLang?.label} XP</span>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#00e5a0' }}>{xpPopup.total} XP total</span>
            </div>
            <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100,(xpPopup.total / 1200) * 100)}%`, background: 'linear-gradient(90deg,#7c6ff7,#00e5a0)', borderRadius: '3px', transition: 'width 1s ease' }}/>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>

        {/* ── HEADER ROW ── */}
        <div style={{ display: 'flex', gap: '.75rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* Language selector */}
          <div style={{ display: 'flex', gap: '.3rem', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '.3rem' }}>
            {LANGUAGES.map(l => (
              <button key={l.id} onClick={() => { setLang(l.id); setProblem(null); setOutput(null) }}
                style={{ padding: '.3rem .6rem', borderRadius: '7px', border: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontSize: '12px', fontWeight: 600, background: lang === l.id ? `${l.color}22` : 'transparent', color: lang === l.id ? l.color : '#4a5168', transition: 'all .15s' }}>
                {l.icon} {l.label}
              </button>
            ))}
          </div>

          {/* Difficulty selector */}
          <div style={{ display: 'flex', gap: '.3rem', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '.3rem' }}>
            {DIFFICULTIES.map(d => (
              <button key={d.id} onClick={() => setDiff(d.id)}
                style={{ padding: '.3rem .7rem', borderRadius: '7px', border: 'none', cursor: 'pointer', fontFamily: 'Inter,sans-serif', fontSize: '12px', fontWeight: 600, background: difficulty === d.id ? `${d.color}22` : 'transparent', color: difficulty === d.id ? d.color : '#4a5168', transition: 'all .15s' }}>
                {d.label} <span style={{ fontSize: '10px', opacity: .7 }}>+{d.xp}xp</span>
              </button>
            ))}
          </div>

          {/* Generate button */}
          <button onClick={generateProblem} disabled={loadingProb}
            style={{ display: 'flex', alignItems: 'center', gap: '.4rem', padding: '.4rem 1rem', background: 'linear-gradient(135deg,#7c6ff7,#5a52d5)', border: 'none', borderRadius: '10px', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: loadingProb ? 'wait' : 'pointer', fontFamily: 'Inter,sans-serif', opacity: loadingProb ? .7 : 1, marginLeft: 'auto' }}>
            {loadingProb
              ? <><i className="ti ti-loader" style={{ fontSize: '14px', animation: 'spin .8s linear infinite' }}/> Generating...</>
              : <><i className="ti ti-code" style={{ fontSize: '14px' }}/> New Problem</>
            }
          </button>

          {/* Leaderboard button */}
          <button
            onClick={() => { setShowLeaderboard(s => !s); if (!showLeaderboard) fetchLeaderboard(lbLang) }}
            style={{ display: 'flex', alignItems: 'center', gap: '.4rem', padding: '.4rem 1rem', background: showLeaderboard ? 'rgba(245,166,35,0.15)' : 'rgba(255,255,255,0.04)', border: `0.5px solid ${showLeaderboard ? 'rgba(245,166,35,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: '10px', color: showLeaderboard ? '#f5a623' : '#8b93b0', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
            <i className="ti ti-trophy" style={{ fontSize: '14px' }}/>
            Leaderboard
          </button>
        </div>

        {/* ── SCORE BAR ── */}
        <XPBar xp={currentScore.xp} key={currentScore.xp} animating={animXP} />

        {/* ── LEADERBOARD PANEL ── */}
        {showLeaderboard && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(245,166,35,0.2)', borderRadius: '12px', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.65rem 1rem', borderBottom: '0.5px solid rgba(255,255,255,0.06)', background: 'rgba(245,166,35,0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                <i className="ti ti-trophy" style={{ fontSize: '14px', color: '#f5a623' }}/>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#eef0ff' }}>Top coders</span>
              </div>
              {/* Language filter */}
              <div style={{ display: 'flex', gap: '.3rem' }}>
                {[
                  { id: 'global', label: 'All' },
                  { id: 'python', label: 'Python' },
                  { id: 'javascript', label: 'JS' },
                  { id: 'java', label: 'Java' },
                  { id: 'c++', label: 'C++' },
                  { id: 'sql', label: 'SQL' },
                ].map(l => (
                  <button key={l.id}
                    onClick={() => { setLbLang(l.id); fetchLeaderboard(l.id) }}
                    style={{ padding: '2px 9px', borderRadius: '20px', border: `0.5px solid ${lbLang === l.id ? 'rgba(245,166,35,0.4)' : 'rgba(255,255,255,0.08)'}`, background: lbLang === l.id ? 'rgba(245,166,35,0.12)' : 'transparent', color: lbLang === l.id ? '#f5a623' : '#4a5168', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {lbLoading ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', color: '#4a5168' }}>
                <i className="ti ti-loader" style={{ fontSize: '20px', animation: 'spin .8s linear infinite', display: 'block', marginBottom: '.4rem', color: '#f5a623' }}/>
                Loading...
              </div>
            ) : leaderboard.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', fontSize: '12px', color: '#4a5168' }}>
                No coders yet — solve a problem to appear here!
              </div>
            ) : (
              <>
                {/* Table header */}
                <div style={{ display: 'grid', gridTemplateColumns: '36px 1fr 160px 60px', padding: '6px 12px', background: 'rgba(255,255,255,0.02)', fontSize: '10px', fontWeight: 700, color: '#4a5168', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  <div>#</div><div>User</div><div>Email</div><div style={{ textAlign: 'right' }}>XP</div>
                </div>
                {/* Rows */}
                {leaderboard.map((entry) => {
                  const isMe = entry.user_id === user?.id
                  const medals = ['🥇','🥈','🥉']
                  return (
                    <div key={entry.user_id}
                      style={{ display: 'grid', gridTemplateColumns: '36px 1fr 160px 60px', padding: '8px 12px', borderTop: '0.5px solid rgba(255,255,255,0.04)', background: isMe ? 'rgba(124,111,247,0.06)' : 'transparent', alignItems: 'center' }}>
                      <div style={{ fontSize: entry.rank <= 3 ? '14px' : '11px', color: '#4a5168', fontWeight: 700 }}>
                        {entry.rank <= 3 ? medals[entry.rank - 1] : `#${entry.rank}`}
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: isMe ? '#a89ef7' : '#c8cde0' }}>
                          {entry.display_name}{isMe ? ' (you)' : ''}
                        </div>
                        <div style={{ fontSize: '10px', color: '#4a5168' }}>
                          {entry.badge?.icon} {entry.badge?.name} · {entry.problems_solved} solved
                        </div>
                      </div>
                      <div style={{ fontSize: '11px', color: '#4a5168', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.email || '—'}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: isMe ? '#a89ef7' : '#c8cde0' }}>{entry.xp}</span>
                        <span style={{ fontSize: '10px', color: '#4a5168', marginLeft: '2px' }}>XP</span>
                      </div>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

        {!showLeaderboard && !problem && !loadingProb && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 1rem', gap: '1rem', background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: '12px' }}>
            <div style={{ fontSize: '3rem' }}>⌨️</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#eef0ff' }}>Ready to code?</div>
            <div style={{ fontSize: '12px', color: '#4a5168', textAlign: 'center' }}>Select a language and difficulty, then click <strong style={{ color: '#7c6ff7' }}>New Problem</strong> to start</div>
          </div>
        )}

        {!showLeaderboard && loadingProb && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', gap: '.75rem' }}>
            <i className="ti ti-loader" style={{ fontSize: '24px', color: '#7c6ff7', animation: 'spin .8s linear infinite' }}/>
            <span style={{ fontSize: '14px', color: '#8b93b0' }}>AI is generating a {difficulty} {lang} problem for {role}...</span>
          </div>
        )}

        {!showLeaderboard && problem && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', flex: 1, minHeight: 0 }}>

            {/* ── LEFT: PROBLEM PANEL ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>

              {/* Problem header */}
              <div style={{ padding: '.75rem 1rem', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: `${currentDiff.color}22`, color: currentDiff.color }}>{difficulty}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#eef0ff' }}>{problem.title}</span>
                {solved && <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#00e5a0', fontWeight: 700 }}>✅ Solved</span>}
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: '.25rem', padding: '0 .75rem' }}>
                {['problem', 'hints'].map(t => (
                  <button key={t} className={`ct-tab ${activeTab === t ? 'active' : 'inactive'}`}
                    onClick={() => {
                      setActiveTab(t)
                      if (t === 'leaderboard') fetchLeaderboard(lbLang)
                    }}>
                    {t === 'problem' ? '📋 Problem' : t === 'hints' ? '💡 Hints' : '🏆 Leaderboard'}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '.75rem 1rem', fontSize: '12.5px', color: '#8b93b0', lineHeight: 1.7 }}>
                {activeTab === 'problem' && (
                  <div>
                    <p style={{ color: '#c8cde0', marginBottom: '.75rem', whiteSpace: 'pre-wrap' }}>{problem.description}</p>
                    {problem.examples?.map((ex, i) => (
                      <div key={i} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '.6rem .8rem', marginBottom: '.5rem', fontFamily: 'monospace', fontSize: '12px' }}>
                        <div style={{ color: '#4a5168', fontSize: '10px', marginBottom: '.2rem' }}>EXAMPLE {i + 1}</div>
                        <div><span style={{ color: '#7c6ff7' }}>Input:</span> <span style={{ color: '#eef0ff' }}>{ex.input}</span></div>
                        <div><span style={{ color: '#00e5a0' }}>Output:</span> <span style={{ color: '#eef0ff' }}>{ex.output}</span></div>
                        {ex.explanation && <div style={{ color: '#4a5168', marginTop: '.2rem' }}>{ex.explanation}</div>}
                      </div>
                    ))}
                    {problem.constraints?.length > 0 && (
                      <div style={{ marginTop: '.75rem' }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#4a5168', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.3rem' }}>Constraints</div>
                        {problem.constraints.map((c, i) => (
                          <div key={i} style={{ fontSize: '12px', color: '#8b93b0' }}>• {c}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'hints' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
                    {problem.hints?.length > 0
                      ? problem.hints.map((h, i) => (
                          <div key={i} style={{ background: 'rgba(124,111,247,0.06)', border: '0.5px solid rgba(124,111,247,0.2)', borderRadius: '8px', padding: '.6rem .8rem' }}>
                            <div style={{ fontSize: '10px', color: '#7c6ff7', fontWeight: 700, marginBottom: '.2rem' }}>HINT {i + 1}</div>
                            <div style={{ fontSize: '12px', color: '#8b93b0' }}>{h}</div>
                          </div>
                        ))
                      : <div style={{ color: '#4a5168', fontSize: '12px' }}>No hints available for this problem.</div>
                    }
                  </div>
                )}

                {activeTab === 'leaderboard' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '.6rem' }}>
                    {/* Language filter */}
                    <div style={{ display: 'flex', gap: '.3rem', flexWrap: 'wrap', marginBottom: '.25rem' }}>
                      {[
                        { id: 'global', label: 'All' },
                        { id: 'python', label: 'Python' },
                        { id: 'javascript', label: 'JS' },
                        { id: 'java', label: 'Java' },
                        { id: 'c++', label: 'C++' },
                        { id: 'sql', label: 'SQL' },
                      ].map(l => (
                        <button key={l.id}
                          onClick={() => { setLbLang(l.id); fetchLeaderboard(l.id) }}
                          style={{ padding: '2px 10px', borderRadius: '20px', border: `0.5px solid ${lbLang === l.id ? 'rgba(124,111,247,0.4)' : 'rgba(255,255,255,0.08)'}`, background: lbLang === l.id ? 'rgba(124,111,247,0.12)' : 'transparent', color: lbLang === l.id ? '#a89ef7' : '#4a5168', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
                          {l.label}
                        </button>
                      ))}
                    </div>

                    {lbLoading ? (
                      <div style={{ textAlign: 'center', padding: '1.5rem', color: '#4a5168' }}>
                        <i className="ti ti-loader" style={{ fontSize: '20px', animation: 'spin .8s linear infinite', display: 'block', marginBottom: '.4rem', color: '#7c6ff7' }}/>
                        Loading...
                      </div>
                    ) : leaderboard.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '1.5rem', color: '#4a5168', fontSize: '12px' }}>
                        No coders yet — solve a problem to appear here!
                      </div>
                    ) : (
                      <>
                        {/* Table header */}
                        <div style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 52px', gap: '0', padding: '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', fontSize: '10px', fontWeight: 700, color: '#4a5168', textTransform: 'uppercase', letterSpacing: '.05em' }}>
                          <div>#</div>
                          <div>User</div>
                          <div>Email</div>
                          <div style={{ textAlign: 'right' }}>XP</div>
                        </div>

                        {/* Table rows */}
                        {leaderboard.map((entry, i) => {
                          const isMe = entry.user_id === user?.id
                          const medals = ['🥇','🥈','🥉']
                          return (
                            <div key={entry.user_id}
                              style={{ display: 'grid', gridTemplateColumns: '32px 1fr 1fr 52px', gap: '0', padding: '8px', borderRadius: '8px', background: isMe ? 'rgba(124,111,247,0.08)' : 'rgba(255,255,255,0.02)', border: `0.5px solid ${isMe ? 'rgba(124,111,247,0.25)' : 'rgba(255,255,255,0.05)'}`, alignItems: 'center' }}>
                              <div style={{ fontSize: entry.rank <= 3 ? '14px' : '11px', fontWeight: 700, color: '#4a5168' }}>
                                {entry.rank <= 3 ? medals[entry.rank - 1] : `#${entry.rank}`}
                              </div>
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: 600, color: isMe ? '#a89ef7' : '#c8cde0' }}>
                                  {entry.display_name}{isMe ? ' (you)' : ''}
                                </div>
                                <div style={{ fontSize: '10px', color: '#4a5168', marginTop: '1px' }}>
                                  {entry.badge?.icon} {entry.badge?.name} · {entry.problems_solved} solved
                                </div>
                              </div>
                              <div style={{ fontSize: '11px', color: '#4a5168', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {entry.email || '—'}
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: isMe ? '#a89ef7' : '#c8cde0' }}>{entry.xp}</span>
                                <span style={{ fontSize: '10px', color: '#4a5168', marginLeft: '2px' }}>XP</span>
                              </div>
                            </div>
                          )
                        })}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: EDITOR + OUTPUT ── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>

              {/* Editor */}
              <div style={{ flex: 1, minHeight: 0, border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.5rem .75rem', background: 'rgba(255,255,255,0.03)', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                  <span style={{ fontSize: '12px', color: '#4a5168', fontFamily: 'monospace' }}>{currentLang.icon} {problem.title?.toLowerCase().replace(/ /g, '_')}.{lang === 'javascript' ? 'js' : lang === 'c++' ? 'cpp' : lang}</span>
                  <div style={{ display: 'flex', gap: '.4rem' }}>
                    <button onClick={runCode} disabled={running || !code.trim()}
                      style={{ display: 'flex', alignItems: 'center', gap: '.3rem', padding: '.3rem .7rem', background: 'rgba(0,229,160,0.1)', border: '0.5px solid rgba(0,229,160,0.3)', borderRadius: '7px', color: '#00e5a0', fontSize: '12px', fontWeight: 700, cursor: running ? 'wait' : 'pointer', fontFamily: 'Inter,sans-serif' }}>
                      {running
                        ? <><i className="ti ti-loader" style={{ fontSize: '12px', animation: 'spin .8s linear infinite' }}/> Running...</>
                        : <><i className="ti ti-player-play" style={{ fontSize: '12px' }}/> Run</>
                      }
                    </button>
                    {output?.passed && !solved && (
                      <button onClick={submitSolution} disabled={submitting}
                        style={{ display: 'flex', alignItems: 'center', gap: '.3rem', padding: '.3rem .7rem', background: 'linear-gradient(135deg,#7c6ff7,#5a52d5)', border: 'none', borderRadius: '7px', color: '#fff', fontSize: '12px', fontWeight: 700, cursor: submitting ? 'wait' : 'pointer', fontFamily: 'Inter,sans-serif' }}>
                        {submitting
                          ? <><i className="ti ti-loader" style={{ fontSize: '12px', animation: 'spin .8s linear infinite' }}/> Submitting...</>
                          : <><i className="ti ti-trophy" style={{ fontSize: '12px' }}/> Submit (+{currentDiff.xp}xp)</>
                        }
                      </button>
                    )}
                    {solved && (
                      <span style={{ padding: '.3rem .7rem', background: 'rgba(0,229,160,0.1)', border: '0.5px solid rgba(0,229,160,0.2)', borderRadius: '7px', color: '#00e5a0', fontSize: '12px', fontWeight: 700 }}>✅ Submitted</span>
                    )}
                  </div>
                </div>
                <Editor
                  height="340px"
                  language={monacoLang}
                  value={code}
                  onChange={v => { setCode(v || ''); setErrorLine(null) }}
                  theme="vs-dark"
                  onMount={(editor, monaco) => {
                    editorRef.current  = editor
                    monacoRef.current  = monaco
                    // Inject error line CSS
                    const style = document.createElement('style')
                    style.textContent = `
                      .error-line-highlight { background: rgba(255,107,107,0.15) !important; border-left: 3px solid #ff6b6b !important; }
                      .error-glyph::before { content: '●'; color: #ff6b6b; font-size: 12px; margin-left: 2px; }
                    `
                    document.head.appendChild(style)
                  }}
                  options={{
                    fontSize: 13,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    lineNumbers: 'on',
                    wordWrap: 'on',
                    padding: { top: 12 },
                    fontFamily: "'Fira Code', 'Cascadia Code', monospace",
                    fontLigatures: true,
                    glyphMargin: true,
                  }}
                />
              </div>

              {/* Output panel */}
              <div style={{ background: 'rgba(0,0,0,0.3)', border: `0.5px solid ${output ? (output.passed ? 'rgba(0,229,160,0.3)' : 'rgba(255,107,107,0.3)') : 'rgba(255,255,255,0.06)'}`, borderRadius: '10px', padding: '.65rem .85rem', minHeight: '80px', maxHeight: '140px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '12px' }}>
                {!output && !running && (
                  <div style={{ color: '#4a5168', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                    <i className="ti ti-terminal" style={{ fontSize: '14px' }}/> Output will appear here after running...
                  </div>
                )}
                {running && (
                  <div style={{ color: '#8b93b0', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                    <i className="ti ti-loader" style={{ fontSize: '14px', animation: 'spin .8s linear infinite' }}/> Executing...
                  </div>
                )}
                {output && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.4rem' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: output.passed ? '#00e5a0' : '#ff6b6b' }}>
                        {output.passed ? '✅ Accepted' : '❌ ' + (output.status || 'Wrong Answer')}
                      </span>
                      {output.time && <span style={{ fontSize: '10px', color: '#4a5168' }}>· {output.time}s</span>}
                      {output.memory && <span style={{ fontSize: '10px', color: '#4a5168' }}>· {output.memory}KB</span>}
                    </div>
                    {output.stdout && (
                      <div style={{ marginBottom: '.3rem' }}>
                        <div style={{ fontSize: '10px', color: '#4a5168', marginBottom: '2px' }}>YOUR OUTPUT</div>
                        <pre style={{ color: output.passed ? '#00e5a0' : '#ff6b6b', margin: 0, whiteSpace: 'pre-wrap' }}>{output.stdout}</pre>
                      </div>
                    )}
                    {!output.passed && output.expected && (
                      <div style={{ marginBottom: '.3rem' }}>
                        <div style={{ fontSize: '10px', color: '#4a5168', marginBottom: '2px' }}>EXPECTED OUTPUT</div>
                        <pre style={{ color: '#00e5a0', margin: 0, whiteSpace: 'pre-wrap' }}>{output.expected}</pre>
                      </div>
                    )}
                    {output.stderr && (
                      <div>
                        {errorLine && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '.4rem', marginBottom: '.3rem', padding: '3px 8px', background: 'rgba(255,107,107,0.1)', border: '0.5px solid rgba(255,107,107,0.3)', borderRadius: '6px', width: 'fit-content' }}>
                            <i className="ti ti-map-pin" style={{ fontSize: '11px', color: '#ff6b6b' }}/>
                            <span style={{ fontSize: '11px', color: '#ff6b6b', fontWeight: 700 }}>Error on line {errorLine}</span>
                          </div>
                        )}
                        <pre style={{ color: '#ff6b6b', margin: 0, whiteSpace: 'pre-wrap', fontSize: '11px' }}>{output.stderr}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}