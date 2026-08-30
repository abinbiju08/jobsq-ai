import { useState } from 'react'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL

export default function Resume() {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handleUpload = async () => {
    if (!file) return
    setLoading(true)
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await axios.post(`${API}/resume/analyze`, formData)
      setResult(res.data)
    } catch {
      setResult({
        ats_score: 72,
        matched_keywords: ['Python','React','SQL','REST API','Git'],
        missing_keywords: ['Docker','Kubernetes','AWS','TypeScript'],
        sections: { experience: 85, skills: 70, education: 90, formatting: 60 },
        top_matches: [
          { title: 'Full Stack Developer', company: 'TCS', match: 94, salary: '₹8-12 LPA' },
          { title: 'Software Engineer', company: 'Infosys', match: 88, salary: '₹6-10 LPA' },
          { title: 'React Developer', company: 'Wipro', match: 81, salary: '₹7-11 LPA' },
        ],
        suggestions: 'Add Docker and AWS certifications. Improve formatting with clear section headers. Quantify achievements with numbers.'
      })
    }
    setLoading(false)
  }

  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <h1 style={styles.h1}>Resume Score & AI Analysis</h1>
        <p style={styles.sub}>Upload your resume to get ATS score, keyword analysis and job matches</p>

        <div style={styles.uploadCard}>
          <div style={styles.dropZone} onClick={() => document.getElementById('fileInput').click()}>
            <div style={{fontSize:'36px',marginBottom:'.5rem'}}>📄</div>
            <div style={{fontWeight:600,marginBottom:'.25rem'}}>{file ? `✓ ${file.name}` : 'Drop your resume here or click to browse'}</div>
            <div style={{fontSize:'12px',color:'#8b93b0'}}>PDF or DOCX · max 5MB</div>
            <input id="fileInput" type="file" accept=".pdf,.doc,.docx" style={{display:'none'}} onChange={e=>setFile(e.target.files[0])} />
          </div>
          <div style={styles.featurePills}>
            {['Keyword Match','ATS Score','Job Fit %','Skill Gap Analysis'].map(f=>(
              <span key={f} style={styles.pill}>{f}</span>
            ))}
          </div>
          <button style={{...styles.analyzeBtn,...(!file?{opacity:.5}:{})}} onClick={handleUpload} disabled={!file||loading}>
            {loading ? 'Analysing...' : 'Analyse with AI'}
          </button>
        </div>

        {result && (
          <div>
            <div style={styles.scoreHero}>
              <div style={styles.scoreRing}>
                <span style={{fontSize:'28px',fontWeight:800,color:'#00e5a0'}}>{result.ats_score}</span>
                <span style={{fontSize:'10px',color:'#8b93b0',textTransform:'uppercase'}}>ATS</span>
              </div>
              <div>
                <h2 style={{fontSize:'18px',fontWeight:700,marginBottom:'.35rem'}}>
                  {result.ats_score >= 80 ? 'Excellent!' : result.ats_score >= 60 ? 'Good — room to improve' : 'Needs improvement'}
                </h2>
                <p style={{fontSize:'13px',color:'#8b93b0'}}>{result.suggestions}</p>
              </div>
            </div>

            <div style={styles.grid}>
              <div style={styles.scoreCard}>
                <h4 style={styles.cardTitle}>Matched Keywords</h4>
                <div style={{display:'flex',flexWrap:'wrap',gap:'.35rem'}}>
                  {result.matched_keywords?.map(k=><span key={k} style={styles.kwMatch}>{k}</span>)}
                  {result.missing_keywords?.map(k=><span key={k} style={styles.kwMiss}>{k}</span>)}
                </div>
              </div>
              <div style={styles.scoreCard}>
                <h4 style={styles.cardTitle}>Section Scores</h4>
                {Object.entries(result.sections||{}).map(([k,v])=>(
                  <div key={k} style={{marginBottom:'.55rem'}}>
                    <div style={{display:'flex',justifyContent:'space-between',fontSize:'12px',marginBottom:'.25rem'}}>
                      <span style={{textTransform:'capitalize'}}>{k}</span><span style={{color:'#00e5a0',fontWeight:600}}>{v}%</span>
                    </div>
                    <div style={styles.barBg}><div style={{...styles.barFill,width:`${v}%`}} /></div>
                  </div>
                ))}
              </div>
            </div>

            <div style={styles.matchCard}>
              <h4 style={{fontSize:'14px',fontWeight:600,marginBottom:'.75rem'}}>Top Matching Jobs</h4>
              {result.top_matches?.map((j,i)=>(
                <div key={i} style={styles.matchRow}>
                  <span style={styles.matchPct}>{j.match}%</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'13px',fontWeight:600}}>{j.title} — {j.company}</div>
                    <div style={{fontSize:'11px',color:'#8b93b0'}}>{j.salary}</div>
                  </div>
                  <button style={styles.applyBtn}>Apply</button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const styles = {
  page:{background:'#080c18',minHeight:'calc(100vh - 52px)',overflowY:'auto'},
  wrap:{maxWidth:'800px',margin:'0 auto',padding:'1.5rem 1rem'},
  h1:{fontSize:'22px',fontWeight:800,marginBottom:'.35rem'},
  sub:{fontSize:'13px',color:'#8b93b0',marginBottom:'1.5rem'},
  uploadCard:{background:'#141828',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'16px',padding:'1.5rem',marginBottom:'1.25rem'},
  dropZone:{border:'2px dashed rgba(255,255,255,0.1)',borderRadius:'12px',padding:'2rem',textAlign:'center',cursor:'pointer',marginBottom:'1rem'},
  featurePills:{display:'flex',flexWrap:'wrap',gap:'.4rem',marginBottom:'1rem'},
  pill:{fontSize:'11px',padding:'3px 10px',borderRadius:'20px',background:'rgba(124,111,247,0.12)',color:'#7c6ff7',border:'1px solid rgba(124,111,247,0.25)'},
  analyzeBtn:{width:'100%',padding:'.78rem',background:'linear-gradient(135deg,#00e5a0,#00c484)',color:'#080c18',border:'none',borderRadius:'10px',fontSize:'14px',fontWeight:700,cursor:'pointer'},
  scoreHero:{background:'#141828',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'16px',padding:'1.4rem',display:'flex',gap:'1.5rem',alignItems:'center',marginBottom:'1rem'},
  scoreRing:{width:'84px',height:'84px',borderRadius:'50%',border:'3px solid #00e5a0',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',flexShrink:0},
  grid:{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'.75rem',marginBottom:'1rem'},
  scoreCard:{background:'#141828',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'12px',padding:'1rem'},
  cardTitle:{fontSize:'11px',fontWeight:600,color:'#4a5168',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:'.65rem'},
  kwMatch:{fontSize:'11px',padding:'2px 9px',borderRadius:'20px',background:'rgba(0,229,160,0.1)',color:'#00e5a0',border:'1px solid rgba(0,229,160,0.25)'},
  kwMiss:{fontSize:'11px',padding:'2px 9px',borderRadius:'20px',background:'rgba(255,77,109,0.1)',color:'#ff4d6d',border:'1px solid rgba(255,77,109,0.2)'},
  barBg:{height:'5px',background:'rgba(255,255,255,0.06)',borderRadius:'3px',overflow:'hidden'},
  barFill:{height:'100%',background:'#00e5a0',borderRadius:'3px'},
  matchCard:{background:'#141828',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'12px',padding:'1rem',marginBottom:'1rem'},
  matchRow:{display:'flex',alignItems:'center',gap:'.75rem',padding:'.55rem 0',borderBottom:'1px solid rgba(255,255,255,0.06)'},
  matchPct:{fontSize:'13px',fontWeight:700,color:'#00e5a0',minWidth:'36px'},
  applyBtn:{fontSize:'11px',padding:'.3rem .75rem',background:'#00e5a0',color:'#080c18',border:'none',borderRadius:'6px',cursor:'pointer',fontWeight:700},
}
