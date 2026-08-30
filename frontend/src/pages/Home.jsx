import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function Home() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [visible, setVisible] = useState(false)
  const [statsStarted, setStatsStarted] = useState(false)
  const canvasRef = useRef(null)
  const statsRef = useRef(null)
  const countersRef = useRef([
    { id:'s1', numId:'n1', target:10,  duration:2500, delay:0,   color:'#00e5a0', suffix:'K+' },
    { id:'s2', numId:'n2', target:95,  duration:2500, delay:300, color:'#7c6ff7', suffix:'%'  },
    { id:'s3', numId:'n3', target:50,  duration:2800, delay:600, color:'#3b82f6', suffix:'K+' },
  ])

  function easeOutQuad(t){ return t*(2-t) }

  function spawnParticles(cardEl, color) {
    const cx=cardEl.offsetWidth/2, cy=cardEl.offsetHeight/2
    for(let i=0;i<12;i++){
      const p=document.createElement('div')
      const angle=(i/12)*Math.PI*2, dist=60+Math.random()*40
      p.style.cssText=`position:absolute;width:5px;height:5px;border-radius:50%;background:${color};pointer-events:none;left:${cx}px;top:${cy}px;animation:shootOut ${0.6+Math.random()*0.4}s ease-out ${Math.random()*0.1}s forwards;--tx:${Math.cos(angle)*dist}px;--ty:${Math.sin(angle)*dist}px;`
      cardEl.appendChild(p)
      setTimeout(()=>p.remove(),1200)
    }
  }

  const runCounters = useCallback(() => {
    countersRef.current.forEach(({id,numId,target,duration,delay,color,suffix})=>{
      const card=document.getElementById(id), el=document.getElementById(numId), bar=document.getElementById(`bar-${id}`)
      if(!card||!el) return
      setTimeout(()=>{
        card.classList.add('sc-active')
        if(bar){bar.style.transition=`width ${duration/1000}s cubic-bezier(.16,1,.3,1)`;bar.style.width='100%'}
        let start=null
        function step(ts){
          if(!start) start=ts
          const progress=Math.min((ts-start)/duration,1)
          const val=Math.round(easeOutQuad(progress)*target)
          el.textContent=val
          if(progress<1){ requestAnimationFrame(step) }
          else{
            el.textContent=target
            el.style.animation='numPop .5s ease forwards'
            setTimeout(()=>el.style.animation='',500)
            spawnParticles(card,color)
          }
        }
        requestAnimationFrame(step)
      },delay)
    })
  },[])

  useEffect(()=>{
    supabase.auth.getUser().then(({data:{user}})=>setUser(user))
    setTimeout(()=>setVisible(true),100)
    const canvas=canvasRef.current, ctx=canvas.getContext('2d')
    function resize(){canvas.width=window.innerWidth;canvas.height=window.innerHeight}
    resize(); window.addEventListener('resize',resize)
    const C=[{r:0,g:229,b:160},{r:124,g:111,b:247},{r:59,g:130,b:246}]
    const pts=Array.from({length:60},()=>({x:Math.random()*canvas.width,y:Math.random()*canvas.height,vx:(Math.random()-.5)*.25,vy:(Math.random()-.5)*.25,r:Math.random()*1.4+.4,c:C[Math.floor(Math.random()*C.length)]}))
    let animId
    function draw(){
      ctx.clearRect(0,0,canvas.width,canvas.height)
      for(const p of pts){p.x+=p.vx;p.y+=p.vy;if(p.x<0||p.x>canvas.width)p.vx*=-1;if(p.y<0||p.y>canvas.height)p.vy*=-1}
      for(let i=0;i<pts.length;i++)for(let j=i+1;j<pts.length;j++){const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.sqrt(dx*dx+dy*dy);if(d<120){ctx.beginPath();ctx.moveTo(pts[i].x,pts[i].y);ctx.lineTo(pts[j].x,pts[j].y);ctx.strokeStyle=`rgba(0,229,160,${(1-d/120)*0.12})`;ctx.lineWidth=0.6;ctx.stroke()}}
      for(const p of pts){ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fillStyle=`rgba(${p.c.r},${p.c.g},${p.c.b},0.6)`;ctx.fill()}
      animId=requestAnimationFrame(draw)
    }
    draw()
    // start counters after 1.2s automatically
    setTimeout(()=>setStatsStarted(true), 1200)
    return()=>{cancelAnimationFrame(animId);window.removeEventListener('resize',resize)}
  },[])

  useEffect(()=>{if(statsStarted) runCounters()},[statsStarted,runCounters])

  const cards = [
    { icon:'🔎', title:'Find Suitable Jobs', desc:'Upload your resume and discover jobs that match your skills and experience.', tag:'AI Matched', tagColor:'#00e5a0', tagBg:'rgba(0,229,160,0.1)', border:'rgba(0,229,160,0.25)', glow:'rgba(0,229,160,0.12)', gradient:'linear-gradient(135deg,rgba(0,229,160,0.1),rgba(0,229,160,0.02))', btn:'Find Jobs →', path:'/jobs' },
    { icon:'📄', title:'ATS Resume Checker', desc:"Check your resume's ATS compatibility and identify areas that need improvement.", tag:'ATS Score', tagColor:'#7c6ff7', tagBg:'rgba(124,111,247,0.12)', border:'rgba(124,111,247,0.25)', glow:'rgba(124,111,247,0.12)', gradient:'linear-gradient(135deg,rgba(124,111,247,0.1),rgba(124,111,247,0.02))', btn:'Check Now →', path:'/resume' },
    { icon:'📝', title:'Resume & Cover Letter Builder', desc:'Create professional, ATS-friendly resumes and personalized cover letters with AI.', tag:'AI Builder', tagColor:'#3b82f6', tagBg:'rgba(59,130,246,0.12)', border:'rgba(59,130,246,0.25)', glow:'rgba(59,130,246,0.12)', gradient:'linear-gradient(135deg,rgba(59,130,246,0.1),rgba(59,130,246,0.02))', btn:'Build Resume →', path:'/resume' },
    { icon:'🎤', title:'AI Interview Prep', desc:'Practice role-specific interview questions and get AI-powered feedback instantly.', tag:'Coming Soon', tagColor:'#f5a623', tagBg:'rgba(245,166,35,0.12)', border:'rgba(245,166,35,0.25)', glow:'rgba(245,166,35,0.12)', gradient:'linear-gradient(135deg,rgba(245,166,35,0.1),rgba(245,166,35,0.02))', btn:'Start Prep →', path:'/dashboard' },
    { icon:'📬', title:'Application Assistant', desc:'Get help with job applications, application questions, and personalized responses.', tag:'AI Assist', tagColor:'#ec4899', tagBg:'rgba(236,72,153,0.12)', border:'rgba(236,72,153,0.25)', glow:'rgba(236,72,153,0.12)', gradient:'linear-gradient(135deg,rgba(236,72,153,0.1),rgba(236,72,153,0.02))', btn:'Get Help →', path:'/dashboard' },
    { icon:'📊', title:'Application Tracker', desc:'Track your applications, interviews, follow-ups, and progress all in one place.', tag:'Tracker', tagColor:'#14b8a6', tagBg:'rgba(20,184,166,0.12)', border:'rgba(20,184,166,0.25)', glow:'rgba(20,184,166,0.12)', gradient:'linear-gradient(135deg,rgba(20,184,166,0.1),rgba(20,184,166,0.02))', btn:'Track Apps →', path:'/dashboard' },
  ]

  const name = user?.email?.split('@')[0] || 'there'

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes shootOut{0%{transform:translate(0,0) scale(1);opacity:1;}100%{transform:translate(var(--tx),var(--ty)) scale(0);opacity:0;}}
        @keyframes numPop{0%{transform:scale(1);}50%{transform:scale(1.18);}100%{transform:scale(1);}}
        @keyframes orbTL{0%,100%{transform:translate(0,0)}40%{transform:translate(40px,50px)}70%{transform:translate(20px,80px)}}
        @keyframes orbTR{0%,100%{transform:translate(0,0)}35%{transform:translate(-40px,45px)}70%{transform:translate(-20px,70px)}}
        @property --sc-a{syntax:'<angle>';initial-value:0deg;inherits:false;}
        @keyframes scSpin{to{--sc-a:360deg;}}
        .home-page{min-height:calc(100vh - 52px);background:#080c18;position:relative;overflow:hidden;font-family:'Inter',sans-serif;}
        .home-canvas{position:absolute;inset:0;z-index:0;pointer-events:none;}
        .orb-tl{position:absolute;top:-150px;left:-150px;width:450px;height:450px;border-radius:50%;background:radial-gradient(circle,rgba(0,229,160,0.15) 0%,transparent 70%);filter:blur(60px);pointer-events:none;animation:orbTL 16s ease-in-out infinite;}
        .orb-tr{position:absolute;top:-150px;right:-150px;width:420px;height:420px;border-radius:50%;background:radial-gradient(circle,rgba(124,111,247,0.15) 0%,transparent 70%);filter:blur(60px);pointer-events:none;animation:orbTR 20s ease-in-out infinite;}
        .orb-bc{position:absolute;bottom:-100px;left:50%;transform:translateX(-50%);width:600px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(0,229,160,0.06) 0%,transparent 70%);filter:blur(70px);pointer-events:none;}
        .home-content{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;padding:3.5rem 2rem 4rem;}
        .hero-greeting{font-size:12px;color:#8b93b0;margin-bottom:1rem;letter-spacing:.06em;text-transform:uppercase;font-weight:500;opacity:0;transform:translateY(16px);transition:opacity .6s,transform .6s;}
        .hero-greeting.show{opacity:1;transform:translateY(0);}
        .hero-heading{font-size:clamp(1.8rem,3.5vw,2.8rem);font-weight:900;text-align:center;line-height:1.15;margin-bottom:1rem;letter-spacing:-.03em;opacity:0;transform:translateY(24px);transition:opacity .7s .15s,transform .7s .15s;}
        .hero-heading.show{opacity:1;transform:translateY(0);}
        .hl{background:linear-gradient(135deg,#00e5a0,#7c6ff7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .hero-sub{font-size:1rem;color:#8b93b0;text-align:center;margin-bottom:2.5rem;font-weight:500;opacity:0;transform:translateY(16px);transition:opacity .7s .3s,transform .7s .3s;}
        .hero-sub.show{opacity:1;transform:translateY(0);}
        .dot{color:#00e5a0;margin:0 .5rem;}
        .stats-row{display:flex;gap:1.25rem;margin-bottom:3rem;opacity:0;transform:translateY(16px);transition:opacity .7s .45s,transform .7s .45s;}
        .stats-row.show{opacity:1;transform:translateY(0);}
        .sc{position:relative;text-align:center;padding:1.5rem 2rem;background:rgba(14,18,35,0.85);border-radius:18px;overflow:hidden;min-width:130px;border:1px solid rgba(255,255,255,0.06);}
        .sc::before{content:'';position:absolute;inset:-1px;border-radius:19px;background:conic-gradient(from var(--sc-a,0deg),transparent 60%,var(--sc-clr),transparent);-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;padding:1px;animation:scSpin 3s linear infinite;z-index:0;}
        .sc-glow{position:absolute;inset:0;border-radius:18px;background:radial-gradient(circle at 50% 50%,var(--sc-clr-dim) 0%,transparent 70%);opacity:0;transition:opacity .6s;}
        .sc.sc-active .sc-glow{opacity:1;}
        .sc-num{font-size:2.6rem;font-weight:900;line-height:1;background:linear-gradient(135deg,#fff 30%,var(--sc-clr));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;font-variant-numeric:tabular-nums;position:relative;z-index:1;filter:drop-shadow(0 0 14px var(--sc-clr));}
        .sc-suffix{font-size:1.5rem;font-weight:900;color:var(--sc-clr);position:relative;z-index:1;filter:drop-shadow(0 0 8px var(--sc-clr));}
        .sc-lbl{font-size:10px;color:#8b93b0;text-transform:uppercase;letter-spacing:.1em;margin-top:.5rem;font-weight:600;position:relative;z-index:1;}
        .sc-bar{position:absolute;bottom:0;left:0;height:2px;width:0%;background:var(--sc-clr);box-shadow:0 0 10px var(--sc-clr);border-radius:0 2px 2px 0;}
        .cards-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.25rem;width:100%;max-width:1050px;opacity:0;transform:translateY(24px);transition:opacity .8s .55s,transform .8s .55s;}
        .cards-grid.show{opacity:1;transform:translateY(0);}
        .feat-card{background:var(--fc-grad);border-radius:18px;padding:1.75rem;cursor:pointer;position:relative;overflow:hidden;border:1px solid var(--fc-border);transition:transform .25s,box-shadow .25s,border-color .25s;backdrop-filter:blur(16px);}
        .feat-card:hover{transform:translateY(-6px);box-shadow:0 16px 48px var(--fc-glow);border-color:var(--fc-color);}
        .feat-card::after{content:'';position:absolute;bottom:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--fc-color),transparent);opacity:0;transition:opacity .3s;}
        .feat-card:hover::after{opacity:1;}
        .fc-glow-orb{position:absolute;top:-30px;right:-30px;width:130px;height:130px;border-radius:50%;background:var(--fc-glow);filter:blur(35px);pointer-events:none;opacity:.6;}
        .fc-icon{font-size:2rem;margin-bottom:1rem;}
        .fc-tag{display:inline-block;font-size:10px;font-weight:700;padding:2px 9px;border-radius:20px;margin-bottom:.85rem;letter-spacing:.04em;text-transform:uppercase;background:var(--fc-tagbg);color:var(--fc-color);}
        .fc-title{font-size:1rem;font-weight:800;color:#eef0ff;margin-bottom:.6rem;line-height:1.3;}
        .fc-desc{font-size:12.5px;color:#8b93b0;line-height:1.65;margin-bottom:1.25rem;}
        .fc-btn{display:inline-flex;align-items:center;gap:.35rem;font-size:12.5px;font-weight:700;padding:.5rem 1rem;border-radius:9px;border:none;cursor:pointer;font-family:'Inter',sans-serif;background:var(--fc-tagbg);color:var(--fc-color);transition:opacity .15s,transform .15s;}
        .feat-card:hover .fc-btn{transform:translateX(3px);}
        .bottom-cta{margin-top:2.5rem;text-align:center;font-size:13px;color:#4a5168;opacity:0;transform:translateY(16px);transition:opacity .7s .8s,transform .7s .8s;}
        .bottom-cta.show{opacity:1;transform:translateY(0);}
        .bottom-cta span{color:#00e5a0;font-weight:600;}
        @media(max-width:768px){.cards-grid{grid-template-columns:1fr 1fr;}}
        @media(max-width:500px){.cards-grid{grid-template-columns:1fr;}}
      `}</style>

      <div className="home-page">
        <canvas ref={canvasRef} className="home-canvas"/>
        <div className="orb-tl"/><div className="orb-tr"/><div className="orb-bc"/>
        <div className="home-content">
          <div className={`hero-greeting ${visible?'show':''}`}>👋 Welcome back, {name}</div>
          <h1 className={`hero-heading ${visible?'show':''}`}>Land Your Dream Job with <span className="hl">JobsQ AI</span></h1>
          <p className={`hero-sub ${visible?'show':''}`}>Get Matched<span className="dot">·</span>Get Prepared<span className="dot">·</span>Get Hired</p>

          <div ref={statsRef} className={`stats-row ${visible?'show':''}`}>
            <div id="s1" className="sc" style={{'--sc-clr':'#00e5a0','--sc-clr-dim':'rgba(0,229,160,0.15)'}}>
              <div className="sc-glow"/><div id="bar-s1" className="sc-bar"/>
              <div style={{display:'flex',alignItems:'baseline',justifyContent:'center',gap:'2px',position:'relative',zIndex:1}}>
                <span id="n1" className="sc-num">0</span>
                <span className="sc-suffix" style={{color:'#00e5a0'}}>K+</span>
              </div>
              <div className="sc-lbl">Active Jobs</div>
            </div>
            <div id="s2" className="sc" style={{'--sc-clr':'#7c6ff7','--sc-clr-dim':'rgba(124,111,247,0.15)'}}>
              <div className="sc-glow"/><div id="bar-s2" className="sc-bar"/>
              <div style={{display:'flex',alignItems:'baseline',justifyContent:'center',gap:'2px',position:'relative',zIndex:1}}>
                <span id="n2" className="sc-num">0</span>
                <span className="sc-suffix" style={{color:'#7c6ff7'}}>%</span>
              </div>
              <div className="sc-lbl">Match Accuracy</div>
            </div>
            <div id="s3" className="sc" style={{'--sc-clr':'#3b82f6','--sc-clr-dim':'rgba(59,130,246,0.15)'}}>
              <div className="sc-glow"/><div id="bar-s3" className="sc-bar"/>
              <div style={{display:'flex',alignItems:'baseline',justifyContent:'center',gap:'2px',position:'relative',zIndex:1}}>
                <span id="n3" className="sc-num">0</span>
                <span className="sc-suffix" style={{color:'#3b82f6'}}>K+</span>
              </div>
              <div className="sc-lbl">Users Hired</div>
            </div>
          </div>

          <div className={`cards-grid ${visible?'show':''}`}>
            {cards.map((card,i)=>(
              <div key={i} className="feat-card"
                style={{'--fc-color':card.tagColor,'--fc-border':card.border,'--fc-glow':card.glow,'--fc-tagbg':card.tagBg,'--fc-grad':card.gradient}}
                onClick={()=>navigate(card.path)}>
                <div className="fc-glow-orb"/>
                <div className="fc-icon">{card.icon}</div>
                <span className="fc-tag">{card.tag}</span>
                <div className="fc-title">{card.title}</div>
                <div className="fc-desc">{card.desc}</div>
                <button className="fc-btn">{card.btn}</button>
              </div>
            ))}
          </div>

          <div className={`bottom-cta ${visible?'show':''}`}>
            <p>Powered by <span>Gemini AI</span> · Jobs updated every <span>2 hours</span></p>
          </div>
        </div>
      </div>
    </>
  )
}
