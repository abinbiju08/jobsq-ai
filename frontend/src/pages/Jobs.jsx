import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import JobCard from '../components/JobCard'
import SmartJobMatch from '../components/SmartJobMatch'
import JobAlertModal from '../components/JobAlertModal'
import SkillGapModal from '../components/SkillGapModal'
import TailorModal from '../components/TailorModal'
import { supabase } from '../lib/supabase'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const categories = ['All','IT & Software','Healthcare','Finance','Engineering','Marketing','Education','Sales']
const types = ['All','Full-time','Part-time','Remote','Contract']
const CITY_DATA = [
  {n:'Bangalore',lat:12.9716,lng:77.5946,state:'Karnataka'},{n:'Mysuru',lat:12.2958,lng:76.6394,state:'Karnataka'},
  {n:'Hubli',lat:15.3647,lng:75.1240,state:'Karnataka'},{n:'Mangalore',lat:12.8698,lng:74.8431,state:'Karnataka'},
  {n:'Hyderabad',lat:17.3850,lng:78.4867,state:'Telangana'},{n:'Warangal',lat:17.9784,lng:79.5941,state:'Telangana'},
  {n:'Mumbai',lat:19.0760,lng:72.8777,state:'Maharashtra'},{n:'Pune',lat:18.5204,lng:73.8567,state:'Maharashtra'},
  {n:'Nagpur',lat:21.1458,lng:79.0882,state:'Maharashtra'},{n:'Nashik',lat:19.9975,lng:73.7898,state:'Maharashtra'},
  {n:'Chennai',lat:13.0827,lng:80.2707,state:'Tamil Nadu'},{n:'Coimbatore',lat:11.0168,lng:76.9558,state:'Tamil Nadu'},
  {n:'Madurai',lat:9.9252,lng:78.1198,state:'Tamil Nadu'},{n:'Salem',lat:11.6643,lng:78.1460,state:'Tamil Nadu'},
  {n:'Delhi NCR',lat:28.6139,lng:77.2090,state:'Delhi'},{n:'Noida',lat:28.5355,lng:77.3910,state:'Delhi'},
  {n:'Gurgaon',lat:28.4595,lng:77.0266,state:'Delhi'},{n:'Kolkata',lat:22.5726,lng:88.3639,state:'West Bengal'},
  {n:'Durgapur',lat:23.5204,lng:87.3119,state:'West Bengal'},{n:'Ahmedabad',lat:23.0225,lng:72.5714,state:'Gujarat'},
  {n:'Surat',lat:21.1702,lng:72.8311,state:'Gujarat'},{n:'Vadodara',lat:22.3072,lng:73.1812,state:'Gujarat'},
  {n:'Kochi',lat:9.9312,lng:76.2673,state:'Kerala'},{n:'Thiruvananthapuram',lat:8.5241,lng:76.9366,state:'Kerala'},
  {n:'Kozhikode',lat:11.2588,lng:75.7804,state:'Kerala'},{n:'Thrissur',lat:10.5276,lng:76.2144,state:'Kerala'},
  {n:'Jaipur',lat:26.9124,lng:75.7873,state:'Rajasthan'},{n:'Jodhpur',lat:26.2389,lng:73.0243,state:'Rajasthan'},
  {n:'Udaipur',lat:24.5854,lng:73.7125,state:'Rajasthan'},{n:'Lucknow',lat:26.8467,lng:80.9462,state:'Uttar Pradesh'},
  {n:'Kanpur',lat:26.4499,lng:80.3319,state:'Uttar Pradesh'},{n:'Agra',lat:27.1767,lng:78.0081,state:'Uttar Pradesh'},
  {n:'Varanasi',lat:25.3176,lng:82.9739,state:'Uttar Pradesh'},{n:'Chandigarh',lat:30.7333,lng:76.7794,state:'Punjab'},
  {n:'Bhopal',lat:23.2599,lng:77.4126,state:'Madhya Pradesh'},{n:'Indore',lat:22.7196,lng:75.8577,state:'Madhya Pradesh'},
  {n:'Bhubaneswar',lat:20.2961,lng:85.8245,state:'Odisha'},{n:'Patna',lat:25.5941,lng:85.1376,state:'Bihar'},
  {n:'Ranchi',lat:23.3441,lng:85.3096,state:'Jharkhand'},{n:'Guwahati',lat:26.1445,lng:91.7362,state:'Assam'},
  {n:'Dehradun',lat:30.3165,lng:78.0322,state:'Uttarakhand'},
]
const CITY_IMPORTANCE = {
  'Bangalore':200,'Mumbai':180,'Hyderabad':160,'Pune':140,'Chennai':130,
  'Delhi NCR':120,'Noida':110,'Gurgaon':100,'Kolkata':90,'Ahmedabad':80,
  'Kochi':70,'Coimbatore':60,'Jaipur':60,'Lucknow':50,'Chandigarh':50,
  'Indore':40,'Bhopal':40,'Nagpur':40,'Surat':40,'Vadodara':35,
  'Mysuru':30,'Thiruvananthapuram':30,'Kozhikode':30,'Thrissur':25,
  'Madurai':30,'Salem':20,'Hubli':20,'Mangalore':20,'Nashik':25,
  'Warangal':20,'Durgapur':15,'Kanpur':30,'Agra':20,'Varanasi':20,
  'Jodhpur':20,'Udaipur':18,'Patna':20,'Ranchi':18,'Bhubaneswar':25,
  'Guwahati':20,'Dehradun':15,'default':10
}

function JobMap({ search }) {
  const mapRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markersRef = useRef([])
  const [role, setRole] = useState(search || '')
  const [selectedState, setSelectedState] = useState('')
  const [dots, setDots] = useState([])
  const [stats, setStats] = useState({ total: 0, hottest: 'Bangalore' })
  const [searching, setSearching] = useState(false)
  const [leafletLoaded, setLeafletLoaded] = useState(false)
  const [isLight, setIsLight] = useState(() => document.body.classList.contains('light'))
  const tileLayerRef = useRef(null)

  useEffect(() => {
    if (window.L) { setLeafletLoaded(true); return }
    const link = document.createElement('link'); link.rel='stylesheet'; link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(link)
    const script = document.createElement('script'); script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; script.onload=()=>setLeafletLoaded(true); document.head.appendChild(script)
  }, [])

  useEffect(() => {
    const observer = new MutationObserver(() => setIsLight(document.body.classList.contains('light')))
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstanceRef.current) return
    const L = window.L
    const map = L.map(mapRef.current, { center:[20.5937,78.9629], zoom:5, zoomControl:false, minZoom:4, maxZoom:12 })
    const light = document.body.classList.contains('light')
    const initTile = light
      ? L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap', maxZoom:18 })
      : L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap', maxZoom:18, className:'dark-tiles' })
    initTile.addTo(map); tileLayerRef.current = initTile
    L.control.zoom({ position:'bottomright' }).addTo(map)
    mapInstanceRef.current = map; runSearch(true)
  }, [leafletLoaded])

  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !leafletLoaded) return
    const L = window.L, map = mapInstanceRef.current
    if (tileLayerRef.current) map.removeLayer(tileLayerRef.current)
    const newTile = isLight
      ? L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap', maxZoom:18 })
      : L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution:'© OpenStreetMap', maxZoom:18, className:'dark-tiles' })
    newTile.addTo(map); tileLayerRef.current = newTile
  }, [isLight])

  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return
    const L = window.L, map = mapInstanceRef.current
    markersRef.current.forEach(m => map.removeLayer(m)); markersRef.current = []
    dots.forEach(dot => {
      const color = dot.color || '#00e5a0'
      const size = dot.estimated ? 20 : Math.max(20, Math.min(50, dot.j / 5))
      const marker = L.circleMarker([dot.lat,dot.lng], { radius:size/2, fillColor:color, color, weight:2, opacity:0.9, fillOpacity:0.5 }).addTo(map)
      marker.bindPopup(`<div style="font-family:Inter,sans-serif;min-width:160px"><div style="font-size:14px;font-weight:700;margin-bottom:4px">${dot.n}</div><div style="font-size:18px;font-weight:800;color:${color}">${dot.j} jobs</div><div style="font-size:11px;color:#888;margin-top:4px">${dot.state}</div><div style="font-size:10px;color:${dot.estimated?'#f5a623':'#00e5a0'};margin-top:2px">${dot.estimated?'Estimated':'Live data'}</div></div>`, { maxWidth:200 })
      marker.bindTooltip(`<b>${dot.n}</b><br/>${dot.j} jobs`, { permanent:true, direction:'top', offset:[0,-size/2], className:'job-tooltip' })
      markersRef.current.push(marker)
    })
  }, [dots])

  async function runSearch(initial=false) {
    setSearching(true)
    try {
      const params = new URLSearchParams({ country:'India' })
      if (!initial && role?.trim()) params.append('role', role)
      if (selectedState) params.append('state', selectedState)
      const res = await fetch(`${API}/jobs/map-counts?${params}`)
      const data = await res.json()
      const byCityRaw = data.by_city || {}
      let cities = CITY_DATA.map(c => {
        const j = byCityRaw[c.n] || byCityRaw[c.n.split(' ')[0]] || Object.entries(byCityRaw).find(([k])=>k.toLowerCase().includes(c.n.toLowerCase().split(' ')[0])||c.n.toLowerCase().includes(k.toLowerCase()))?.[1] || 0
        return { ...c, j, realData:j>0 }
      })
      cities = cities.map(c => {
        if (c.j > 0) { const color=c.j>100?'#00e5a0':c.j>40?'#00c484':c.j>15?'#7c6ff7':'#3b82f6'; return {...c,color} }
        return {...c, j:Math.max(3,Math.round((CITY_IMPORTANCE[c.n]||10)*0.12)), estimated:true, color:'#f5a623'}
      })
      const displayCities = selectedState ? cities.filter(c=>c.state===selectedState) : cities
      if (selectedState && mapInstanceRef.current && displayCities.length>0) {
        const lats=displayCities.map(c=>c.lat), lngs=displayCities.map(c=>c.lng)
        mapInstanceRef.current.flyToBounds(window.L.latLngBounds([Math.min(...lats)-.5,Math.min(...lngs)-.5],[Math.max(...lats)+.5,Math.max(...lngs)+.5]),{duration:1.2,padding:[30,30]})
      } else if (!selectedState && mapInstanceRef.current) {
        mapInstanceRef.current.flyTo([20.5937,78.9629],5,{duration:1.2})
      }
      setStats({ total:data.total||0, hottest:[...displayCities].sort((a,b)=>b.j-a.j)[0]?.n||'Bangalore' })
      setDots(displayCities)
    } catch(e) {
      setDots((selectedState?CITY_DATA.filter(c=>c.state===selectedState):CITY_DATA).map(c=>({...c,j:CITY_IMPORTANCE[c.n]||10,estimated:true,color:'#f5a623'})))
    }
    setSearching(false)
  }

  const sortedDots = [...dots].sort((a,b)=>b.j-a.j).slice(0,10)
  const maxJ = Math.max(...dots.map(d=>d.j),1)

  return (
    <>
      <style>{`
        .job-tooltip{background:rgba(6,9,20,0.92)!important;border:1px solid rgba(0,229,160,0.3)!important;border-radius:8px!important;color:#eef0ff!important;font-family:Inter,sans-serif!important;font-size:11px!important;font-weight:600!important;padding:4px 8px!important;box-shadow:0 4px 12px rgba(0,0,0,0.4)!important;}
        .job-tooltip::before{display:none!important;}
        .leaflet-popup-content-wrapper{background:rgba(6,9,20,0.96)!important;border:1px solid rgba(0,229,160,0.3)!important;border-radius:12px!important;color:#eef0ff!important;}
        .leaflet-popup-tip{background:rgba(6,9,20,0.96)!important;}
        .leaflet-popup-close-button{color:#8b93b0!important;}
        .leaflet-control-zoom a{background:rgba(6,9,20,0.92)!important;color:#00e5a0!important;border-color:rgba(0,229,160,0.2)!important;}
        .leaflet-control-zoom a:hover{background:rgba(0,229,160,0.1)!important;}
        .leaflet-control-attribution{display:none!important;}
      `}</style>
      <div style={{display:'flex',height:'100%',background:'var(--bg)'}}>
        <div style={{flex:1,position:'relative',overflow:'hidden'}}>
          {/* Map search bar */}
          <div style={{position:'absolute',top:'1rem',left:'50%',transform:'translateX(-50%)',zIndex:1000,display:'flex',gap:'.5rem',alignItems:'center',background:'var(--card,rgba(6,9,20,0.94))',border:'1px solid var(--border2,rgba(255,255,255,0.12))',borderRadius:'14px',padding:'.55rem .8rem',backdropFilter:'blur(20px)',boxShadow:'0 8px 32px rgba(0,0,0,0.4)',minWidth:'460px'}}>
            <i className="ti ti-search" style={{fontSize:'14px',color:'var(--text3)'}} aria-hidden="true"/>
            <input value={role} onChange={e=>setRole(e.target.value)} onKeyDown={e=>e.key==='Enter'&&runSearch()} style={{background:'none',border:'none',color:'var(--text)',fontSize:'13px',fontFamily:'Inter,sans-serif',outline:'none',width:'150px'}} placeholder="Job role or skill..."/>
            <div style={{width:'1px',height:'18px',background:'var(--border,rgba(255,255,255,0.1))'}}/>
            <i className="ti ti-map-pin" style={{fontSize:'14px',color:'var(--text3)'}} aria-hidden="true"/>
            <select value={selectedState} onChange={e=>setSelectedState(e.target.value)} style={{background:'var(--bg)',border:'none',color:selectedState?'var(--text)':'var(--text3)',fontSize:'13px',fontFamily:'Inter,sans-serif',outline:'none',width:'130px',cursor:'pointer'}}>
              <option value=''>All India</option>
              {['Karnataka','Telangana','Maharashtra','Tamil Nadu','Delhi','West Bengal','Gujarat','Kerala','Rajasthan','Uttar Pradesh','Punjab','Madhya Pradesh','Odisha','Bihar','Jharkhand','Assam','Uttarakhand'].map(s=><option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={()=>runSearch()} disabled={searching} style={{display:'flex',alignItems:'center',gap:'.35rem',padding:'.38rem .9rem',background:searching?'var(--text3)':'linear-gradient(135deg,#00e5a0,#00c484)',border:'none',borderRadius:'8px',color:'#060d0a',fontSize:'12px',fontWeight:700,cursor:searching?'not-allowed':'pointer',fontFamily:'Inter,sans-serif'}}>
              {searching ? <><i className="ti ti-loader" style={{fontSize:'13px',animation:'spin .8s linear infinite'}} aria-hidden="true"/> Searching</> : 'Search'}
            </button>
            {selectedState && <button onClick={()=>{setSelectedState('');setTimeout(()=>runSearch(true),50)}} style={{display:'flex',alignItems:'center',gap:'.3rem',padding:'.38rem .6rem',background:'rgba(255,77,109,0.1)',border:'1px solid rgba(255,77,109,0.2)',borderRadius:'8px',color:'#ff4d6d',fontSize:'11px',fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif'}}><i className="ti ti-x" style={{fontSize:'12px'}} aria-hidden="true"/> All India</button>}
          </div>

          {/* Map stats */}
          <div style={{position:'absolute',bottom:'1.5rem',left:'50%',transform:'translateX(-50%)',zIndex:1000,display:'flex',gap:'.5rem'}}>
            {[
              {icon:'ti-circle-check',l:`${stats.total} Jobs`,c:'#00e5a0',bg:'rgba(0,229,160,0.1)',b:'rgba(0,229,160,0.2)'},
              {icon:'ti-map',l:selectedState||'All India',c:'#7c6ff7',bg:'rgba(124,111,247,0.1)',b:'rgba(124,111,247,0.2)'},
              {icon:'ti-live-view',l:'Live',c:'#3b82f6',bg:'rgba(59,130,246,0.1)',b:'rgba(59,130,246,0.2)'},
              {icon:'ti-flame',l:stats.hottest,c:'#f5a623',bg:'rgba(245,166,35,0.1)',b:'rgba(245,166,35,0.2)'},
            ].map((s,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:'.3rem',padding:'.28rem .7rem',borderRadius:'20px',fontSize:'11px',fontWeight:600,color:s.c,background:s.bg,border:`1px solid ${s.b}`,backdropFilter:'blur(10px)',whiteSpace:'nowrap'}}>
                <i className={`ti ${s.icon}`} style={{fontSize:'12px'}} aria-hidden="true"/>{s.l}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div style={{position:'absolute',bottom:'1.5rem',left:'1rem',background:'var(--card,rgba(6,9,20,0.9))',border:'1px solid var(--border)',borderRadius:'10px',padding:'.55rem .8rem',zIndex:1000}}>
            <div style={{fontSize:'9px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.3rem',fontWeight:600}}>Job density</div>
            {[['#00e5a0','100+ Live'],['#7c6ff7','40-100 Live'],['#3b82f6','15-40 Live'],['#f5a623','Estimated']].map(([c,l])=>(
              <div key={l} style={{display:'flex',alignItems:'center',gap:'.35rem',fontSize:'9px',color:'var(--text2)',marginBottom:'.18rem'}}>
                <div style={{width:'7px',height:'7px',borderRadius:'50%',background:c,flexShrink:0}}/>{l}
              </div>
            ))}
          </div>

          <div ref={mapRef} style={{width:'100%',height:'100%'}}/>
          {!leafletLoaded && <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',color:'var(--text2)',fontSize:'14px'}}>Loading map...</div>}
        </div>

        {/* Map sidebar */}
        <div style={{width:'210px',background:'var(--bg2,rgba(8,12,24,0.95))',borderLeft:'1px solid var(--border)',display:'flex',flexDirection:'column',overflow:'hidden',flexShrink:0}}>
          <div style={{display:'flex',alignItems:'center',gap:'.5rem',padding:'.7rem 1rem',fontSize:'11px',fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.06em',borderBottom:'1px solid var(--border,rgba(255,255,255,0.05))'}}>
            <i className="ti ti-trophy" style={{fontSize:'13px',color:'#f5a623'}} aria-hidden="true"/>
            Top Hotspots
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'.5rem'}}>
            {sortedDots.map((c,i)=>(
              <div key={i} onClick={()=>{setSelectedState(c.state);setTimeout(()=>runSearch(),50)}} style={{padding:'.6rem .7rem',borderRadius:'10px',border:`1px solid ${i===0?'rgba(0,229,160,0.3)':'var(--border,rgba(255,255,255,0.06))'}`,background:i===0?'rgba(0,229,160,0.05)':'var(--bg3,rgba(14,18,35,0.6))',marginBottom:'.35rem',cursor:'pointer',transition:'all .2s'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'.28rem'}}>
                  <div style={{display:'flex',alignItems:'center',gap:'.3rem',fontSize:'12px',fontWeight:700,color:'var(--text)'}}>
                    {i===0 && <i className="ti ti-flame" style={{fontSize:'12px',color:'#f5a623'}} aria-hidden="true"/>}
                    {c.n}
                  </div>
                  <div style={{fontSize:'11px',fontWeight:700,color:c.color}}>{c.j}</div>
                </div>
                <div style={{height:'2px',background:'var(--border,rgba(255,255,255,0.05))',borderRadius:'2px',overflow:'hidden',marginBottom:'.28rem'}}>
                  <div style={{height:'100%',width:`${(c.j/maxJ)*100}%`,background:c.color,borderRadius:'2px',transition:'width .6s'}}/>
                </div>
                <div style={{fontSize:'9px',color:'var(--text3)',display:'flex',justifyContent:'space-between'}}>
                  <span style={{display:'flex',alignItems:'center',gap:'.2rem'}}><i className="ti ti-map-pin" style={{fontSize:'10px'}} aria-hidden="true"/>{c.state}</span>
                  <span style={{color:c.estimated?'#f5a623':'#00e5a0'}}>{c.estimated?'est':'live'}</span>
                </div>
              </div>
            ))}
          </div>
          <div style={{padding:'.5rem',borderTop:'1px solid var(--border,rgba(255,255,255,0.05))'}}>
            <div style={{fontSize:'9px',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.35rem',fontWeight:600}}>Quick select</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:'.25rem'}}>
              {['Karnataka','Kerala','Maharashtra','Tamil Nadu','Delhi','Telangana','Gujarat','West Bengal'].map(s=>(
                <button key={s} onClick={()=>{const ns=s===selectedState?'':s;setSelectedState(ns);setTimeout(()=>runSearch(),50)}} style={{fontSize:'9px',padding:'2px 7px',borderRadius:'10px',cursor:'pointer',fontFamily:'Inter,sans-serif',border:`1px solid ${selectedState===s?'rgba(0,229,160,0.4)':'var(--border)'}`,background:selectedState===s?'rgba(0,229,160,0.1)':'none',color:selectedState===s?'#00e5a0':'var(--text2)',transition:'all .15s'}}>{s.split(' ')[0]}</button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function Jobs() {
  const [jobs, setJobs]               = useState([])
  const [filtered, setFiltered]       = useState([])
  const [search, setSearch]           = useState('')
  const [location, setLocation]       = useState('')
  const [category, setCategory]       = useState('All')
  const [type, setType]               = useState('All')
  const [loading, setLoading]         = useState(true)
  const [view, setView]               = useState('list')
  const [showMatch, setShowMatch]     = useState(false)
  const [smartJobs, setSmartJobs]     = useState(null)
  const [resumeAnalysis, setResumeAnalysis] = useState(null)
  const [showAlert, setShowAlert]     = useState(false)
  const [showSkillGap, setShowSkillGap] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)
  const [tailorJob, setTailorJob]     = useState(null)
  const [user, setUser]               = useState(null)
  const [userSkills, setUserSkills]   = useState([])
  const [notifications, setNotifications] = useState([])
  const [showNotifs, setShowNotifs]   = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [alertActive, setAlertActive] = useState(false)

  useEffect(() => { fetchJobs(); loadUserData() }, [])
  useEffect(() => {
    let result = jobs
    if (search) result = result.filter(j=>j.title?.toLowerCase().includes(search.toLowerCase())||j.company?.toLowerCase().includes(search.toLowerCase()))
    if (category!=='All') result = result.filter(j=>j.category===category)
    if (type!=='All') result = result.filter(j=>j.job_type===type)
    setFiltered(result)
  }, [jobs, search, category, type])

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    try { const res=await fetch(`${API}/alerts/notifications?user_id=${user.id}`); const data=await res.json(); if(Array.isArray(data)){setNotifications(data);setUnreadCount(data.filter(n=>!n.read).length)} } catch(e){}
    try { const res=await fetch(`${API}/alerts/?user_id=${user.id}`); const data=await res.json(); if(data&&data.roles) setAlertActive(true) } catch(e){}
  }

  const fetchJobs = async (searchQ='',locationQ='',categoryQ='All') => {
    setLoading(true)
    try {
      const params=new URLSearchParams()
      if(searchQ) params.append('search',searchQ)
      if(locationQ) params.append('location',locationQ)
      if(categoryQ&&categoryQ!=='All') params.append('category',categoryQ)
      const res=await axios.get(`${API}/jobs?${params}`)
      setJobs(res.data||[]); setFiltered(res.data||[])
    } catch(e){ setJobs([]) }
    setLoading(false)
  }

  const handleJobClick = (job) => { setSelectedJob(job); setShowSkillGap(true) }

  const handleTrack = async (job) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await fetch(`${API}/tracker/`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:user.id,job_title:job.title||'',company:job.company||'',location:job.location||'',job_url:job.url||'',salary:job.salary||'',job_type:job.job_type||'',status:'Applied',applied_date:new Date().toISOString().slice(0,10)})})
  }

  const markAllRead = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    for (const n of notifications.filter(x=>!x.read)) await fetch(`${API}/alerts/notifications/${n.id}/read`,{method:'PATCH'})
    setNotifications(prev=>prev.map(n=>({...n,read:true}))); setUnreadCount(0)
  }

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"/>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
  .dark-tiles{filter:invert(1) hue-rotate(180deg) brightness(0.85) contrast(0.9) saturate(0.7);}
        .jobs-page{display:flex;height:calc(100vh - 52px);background:var(--bg);}
        .jobs-sidebar{width:200px;background:var(--bg2);border-right:1px solid var(--border);padding:1rem .85rem;overflow-y:auto;flex-shrink:0;}
        .side-label{font-size:10px;font-weight:600;color:var(--text3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.5rem;padding:.25rem .4rem;}
        .side-item{padding:.45rem .7rem;border-radius:8px;font-size:13px;color:var(--text2);cursor:pointer;margin-bottom:2px;transition:all .15s;}
        .side-item:hover{background:rgba(0,229,160,0.08);color:var(--text);}
        .side-item.active{background:rgba(0,229,160,0.1);color:#00e5a0;font-weight:500;}
        .jobs-main{flex:1;display:flex;flex-direction:column;overflow:hidden;}
        .jobs-topbar{padding:.75rem 1rem;border-bottom:1px solid var(--border);background:var(--bg2);display:flex;align-items:center;gap:.65rem;flex-wrap:wrap;}
        .jobs-search{flex:1;min-width:0;background:var(--card,rgba(255,255,255,0.04));border:1px solid var(--border);border-radius:9px;padding:.5rem .85rem;color:var(--text);font-size:13px;outline:none;font-family:Inter,sans-serif;}
        .jobs-search::placeholder{color:var(--text3);}
        .jobs-count{font-size:12px;color:var(--text2);white-space:nowrap;}
        .view-toggle{display:flex;gap:.3rem;background:var(--card,rgba(255,255,255,0.04));border:1px solid var(--border);border-radius:8px;padding:3px;}
        .vbtn{display:flex;align-items:center;gap:.3rem;padding:.3rem .65rem;border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;border:none;font-family:Inter,sans-serif;color:var(--text2);background:none;transition:all .15s;}
        .vbtn i{font-size:13px;}
        .vbtn.active{background:rgba(0,229,160,0.15);color:#00e5a0;}
        .jobs-feed{flex:1;overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:.55rem;background:var(--bg);}
        .search-btn{display:flex;align-items:center;gap:.4rem;padding:.5rem 1rem;background:linear-gradient(135deg,#00e5a0,#00c484);border:none;border-radius:9px;color:#060d0a;font-size:13px;font-weight:700;cursor:pointer;font-family:Inter,sans-serif;white-space:nowrap;flex-shrink:0;}
        .search-btn i{font-size:15px;}
        .icon-btn{display:flex;align-items:center;gap:.35rem;padding:.38rem .75rem;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.04);color:var(--text2);font-size:12px;cursor:pointer;font-family:Inter,sans-serif;position:relative;white-space:nowrap;}
        .icon-btn i{font-size:14px;}
        .icon-btn.active{border-color:rgba(0,229,160,0.4);color:#00e5a0;background:rgba(0,229,160,0.08);}
        .notif-badge{position:absolute;top:-5px;right:-5px;background:#E24B4A;color:#fff;font-size:9px;font-weight:700;width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;}
        .notif-dropdown{position:absolute;top:calc(100% + 8px);right:0;width:280px;background:#0d1120;border:1px solid rgba(255,255,255,0.1);border-radius:14px;z-index:999;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.5);}
        .notif-header{padding:.65rem 1rem;border-bottom:1px solid rgba(255,255,255,0.07);display:flex;justify-content:space-between;align-items:center;}
        .notif-item{padding:.65rem 1rem;border-bottom:1px solid rgba(255,255,255,0.04);font-size:12px;color:#8b93b0;line-height:1.4;}
        .notif-item.unread{background:rgba(0,229,160,0.04);color:#eef0ff;}
        .job-card-wrap{cursor:pointer;transition:transform .15s;}
        .job-card-wrap:hover{transform:translateY(-1px);}
        @keyframes bannerShimmer{0%{transform:translateX(-100%) skewX(-15deg)}100%{transform:translateX(400%) skewX(-15deg)}}
        @keyframes bannerPulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.05)}}
        @keyframes bannerFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
        @keyframes bannerGlow{0%,100%{box-shadow:0 0 20px rgba(0,229,160,.1),0 4px 20px rgba(0,0,0,.2)}50%{box-shadow:0 0 35px rgba(0,229,160,.25),0 4px 25px rgba(0,0,0,.3)}}
        @keyframes orbit{from{transform:rotate(0deg) translateX(38px) rotate(0deg)}to{transform:rotate(360deg) translateX(38px) rotate(-360deg)}}
        @keyframes orbit2{from{transform:rotate(180deg) translateX(28px) rotate(-180deg)}to{transform:rotate(540deg) translateX(28px) rotate(-540deg)}}
        @keyframes tagFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
        @keyframes arrowMove{0%,100%{transform:translateX(0)}50%{transform:translateX(4px)}}
        .ai-banner:hover{transform:translateY(-1px);}
        .ai-banner:hover .banner-btn{transform:scale(1.05);}
        .ai-tag{animation:tagFloat 2s ease-in-out infinite;}
        .ai-tag:nth-child(2){animation-delay:.3s;}
        .ai-tag:nth-child(3){animation-delay:.6s;}
        .banner-arrow{animation:arrowMove 1.2s ease-in-out infinite;}
      `}</style>

      <div className="jobs-page">
        {view==='list' && (
          <div className="jobs-sidebar">
            <div className="side-label">Department</div>
            {categories.map(c=><div key={c} className={`side-item ${category===c?'active':''}`} onClick={()=>{setCategory(c);fetchJobs(search,location,c)}}>{c}</div>)}
            <div className="side-label" style={{marginTop:'1.25rem'}}>Type</div>
            {types.map(t=><div key={t} className={`side-item ${type===t?'active':''}`} onClick={()=>setType(t)}>{t}</div>)}
          </div>
        )}

        <div className="jobs-main">
          <div className="jobs-topbar">
            {view==='list' && <>
              <input className="jobs-search" placeholder="Search jobs, skills, companies..." value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchJobs(search,location,category)}/>
              <input className="jobs-search" style={{maxWidth:'140px'}} placeholder="Location..." value={location} onChange={e=>setLocation(e.target.value)} onKeyDown={e=>e.key==='Enter'&&fetchJobs(search,location,category)}/>
              <button className="search-btn" onClick={()=>fetchJobs(search,location,category)}>
                <i className="ti ti-search" aria-hidden="true"/>
                Search
              </button>
              {smartJobs && (
                <button onClick={()=>setSmartJobs(null)} style={{display:'flex',alignItems:'center',gap:'.35rem',padding:'.5rem .85rem',background:'rgba(124,111,247,0.1)',border:'1px solid rgba(124,111,247,0.3)',borderRadius:'9px',color:'#7c6ff7',fontSize:'12px',fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif',whiteSpace:'nowrap'}}>
                  <i className="ti ti-x" style={{fontSize:'13px'}} aria-hidden="true"/> Clear AI match
                </button>
              )}
              <div className="jobs-count">{smartJobs?`${smartJobs.length} AI matched`:`${filtered.length} jobs`}</div>

              {/* Alert button */}
              <button className={`icon-btn ${alertActive?'active':''}`} onClick={()=>setShowAlert(true)}>
                <i className="ti ti-bell" aria-hidden="true"/>
                {alertActive ? 'Alert on' : 'Set alert'}
              </button>

              {/* Notifications */}
              <div style={{position:'relative'}}>
                <button className="icon-btn" onClick={()=>setShowNotifs(v=>!v)}>
                  <i className="ti ti-inbox" aria-hidden="true"/>
                  {unreadCount>0 && <span className="notif-badge">{unreadCount}</span>}
                </button>
                {showNotifs && (
                  <div className="notif-dropdown">
                    <div className="notif-header">
                      <span style={{fontSize:'13px',fontWeight:700,color:'var(--text)'}}>Notifications</span>
                      {unreadCount>0 && <button onClick={markAllRead} style={{fontSize:'11px',color:'#00e5a0',background:'none',border:'none',cursor:'pointer'}}>Mark all read</button>}
                    </div>
                    {notifications.length===0
                      ? <div style={{padding:'1.5rem',textAlign:'center',color:'var(--text3)',fontSize:'12px'}}>No notifications yet.<br/>Set a job alert to get notified!</div>
                      : notifications.slice(0,8).map(n=>(
                        <div key={n.id} className={`notif-item ${!n.read?'unread':''}`}>
                          {!n.read && <i className="ti ti-circle-filled" style={{fontSize:'8px',color:'#00e5a0',marginRight:'4px'}} aria-hidden="true"/>}
                          {n.message}
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>

              {/* Tracker link */}
              <a href="/tracker" style={{display:'flex',alignItems:'center',gap:'.35rem',padding:'.38rem .75rem',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.1)',background:'rgba(255,255,255,0.04)',color:'var(--text2)',fontSize:'12px',textDecoration:'none',whiteSpace:'nowrap',fontFamily:'Inter,sans-serif'}}>
                <i className="ti ti-layout-kanban" style={{fontSize:'14px'}} aria-hidden="true"/>
                Tracker
              </a>
            </>}
            {view==='map' && <div style={{display:'flex',alignItems:'center',gap:'.5rem',fontSize:'13px',color:'var(--text2)',fontWeight:500}}><i className="ti ti-map" style={{fontSize:'16px'}} aria-hidden="true"/> Job hotspot map — search by role and state</div>}
            <div className="view-toggle" style={{marginLeft:'auto'}}>
              <button className={`vbtn ${view==='list'?'active':''}`} onClick={()=>setView('list')}><i className="ti ti-list" aria-hidden="true"/> List</button>
              <button className={`vbtn ${view==='map'?'active':''}`} onClick={()=>setView('map')}><i className="ti ti-map" aria-hidden="true"/> Map</button>
            </div>
          </div>

          {/* AI Match Banner */}
          {view==='list' && !smartJobs && (
            <div className="ai-banner" onClick={()=>setShowMatch(true)} style={{margin:'0 1rem .5rem',background:'linear-gradient(135deg,rgba(0,229,160,0.06) 0%,rgba(0,196,132,0.04) 50%,rgba(0,229,160,0.06) 100%)',border:'1px solid rgba(0,229,160,0.25)',borderRadius:'16px',padding:'.9rem 1.25rem',cursor:'pointer',display:'flex',alignItems:'center',gap:'1rem',transition:'all .25s ease',position:'relative',overflow:'hidden',flexShrink:0,animation:'bannerGlow 3s ease-in-out infinite'}}>
              <div style={{position:'absolute',top:0,left:0,width:'40%',height:'100%',background:'linear-gradient(90deg,transparent,rgba(0,229,160,0.06),transparent)',animation:'bannerShimmer 3s ease-in-out infinite',pointerEvents:'none'}}/>
              {[['8px','8px'],['8px','right:8px'],['bottom:8px','8px'],['bottom:8px','right:8px']].map(([t,r],i)=>(
                <div key={i} style={{position:'absolute',[t.includes('bottom')?'bottom':'top']:t.includes('bottom')?'8px':'8px',[r.includes('right')?'right':'left']:r.includes('right')?'8px':'8px',width:'4px',height:'4px',borderRadius:'50%',background:'#00e5a0',opacity:.4,animation:`bannerPulse 2s ease-in-out infinite ${i*0.5}s`}}/>
              ))}
              <div style={{position:'relative',width:'48px',height:'48px',flexShrink:0,animation:'bannerFloat 3s ease-in-out infinite'}}>
                <div style={{position:'absolute',inset:'-6px',border:'1px dashed rgba(0,229,160,0.2)',borderRadius:'50%'}}/>
                <div style={{position:'absolute',top:'50%',left:'50%',marginTop:'-3px',marginLeft:'-3px'}}><div style={{width:'6px',height:'6px',borderRadius:'50%',background:'#00e5a0',boxShadow:'0 0 6px #00e5a0',animation:'orbit 3s linear infinite'}}/></div>
                <div style={{position:'absolute',top:'50%',left:'50%',marginTop:'-3px',marginLeft:'-3px'}}><div style={{width:'4px',height:'4px',borderRadius:'50%',background:'rgba(0,229,160,0.6)',animation:'orbit2 2s linear infinite'}}/></div>
                <div style={{position:'absolute',inset:0,borderRadius:'12px',background:'rgba(0,229,160,0.12)',border:'1px solid rgba(0,229,160,0.3)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                  <i className="ti ti-robot" style={{fontSize:'22px',color:'#00e5a0'}} aria-hidden="true"/>
                </div>
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:'13.5px',fontWeight:800,color:'var(--text)',marginBottom:'3px',display:'flex',alignItems:'center',gap:'.5rem'}}>
                  Find jobs that match your resume
                  <span style={{fontSize:'9px',padding:'2px 6px',borderRadius:'20px',background:'rgba(0,229,160,0.15)',border:'1px solid rgba(0,229,160,0.3)',color:'#00e5a0',fontWeight:700,animation:'bannerPulse 2s ease-in-out infinite'}}>AI Powered</span>
                </div>
                <div style={{fontSize:'11.5px',color:'var(--text2)'}}>Upload CV → AI extracts skills → Shows best matching jobs with score</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'.4rem',flexShrink:0}}>
                <div className="banner-btn" style={{display:'flex',alignItems:'center',gap:'.4rem',padding:'.45rem 1rem',background:'linear-gradient(135deg,#00e5a0,#00c484)',borderRadius:'20px',color:'#060d0a',fontSize:'12px',fontWeight:700,whiteSpace:'nowrap',transition:'transform .2s'}}>
                  Try AI match <span className="banner-arrow"><i className="ti ti-arrow-right" style={{fontSize:'13px'}} aria-hidden="true"/></span>
                </div>
                <div style={{display:'flex',gap:'.3rem'}}>
                  {[{icon:'ti-target',label:'Skills'},{icon:'ti-briefcase',label:'Roles'},{icon:'ti-chart-bar',label:'Score'}].map(t=>(
                    <span key={t.label} className="ai-tag" style={{display:'inline-flex',alignItems:'center',gap:'.25rem',fontSize:'9px',padding:'2px 7px',borderRadius:'10px',background:'rgba(0,229,160,0.08)',border:'1px solid rgba(0,229,160,0.2)',color:'#00e5a0',fontWeight:600}}>
                      <i className={`ti ${t.icon}`} style={{fontSize:'10px'}} aria-hidden="true"/>{t.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {view==='list' && (
            <div className="jobs-feed" onClick={()=>setShowNotifs(false)}>
              {smartJobs ? (
                <>
                  <div style={{padding:'.75rem 1rem',background:'rgba(124,111,247,0.06)',border:'1px solid rgba(124,111,247,0.2)',borderRadius:'12px',marginBottom:'.5rem',display:'flex',alignItems:'center',gap:'.75rem',flexWrap:'wrap'}}>
                    <div style={{display:'flex',alignItems:'center',gap:'.4rem',fontSize:'13px',fontWeight:700,color:'#7c6ff7'}}>
                      <i className="ti ti-robot" style={{fontSize:'15px'}} aria-hidden="true"/> AI match results
                    </div>
                    {resumeAnalysis?.skills?.slice(0,5).map(s=><span key={s} style={{fontSize:'10px',padding:'2px 8px',borderRadius:'20px',background:'rgba(0,229,160,0.1)',border:'1px solid rgba(0,229,160,0.2)',color:'#00e5a0'}}>{s}</span>)}
                  </div>
                  {smartJobs.map((job,i)=>(
                    <div key={job.id||i} className="job-card-wrap" onClick={()=>handleJobClick(job)} style={{position:'relative'}}>
                      <JobCard job={job}/>
                      <button onClick={e=>{e.stopPropagation();setTailorJob(job)}}
                        style={{position:'absolute',bottom:'.65rem',right:'.65rem',display:'inline-flex',alignItems:'center',gap:'.25rem',padding:'.25rem .6rem',background:'rgba(124,111,247,0.12)',border:'0.5px solid rgba(124,111,247,0.3)',borderRadius:'6px',color:'#7c6ff7',fontSize:'11px',fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif',zIndex:2}}
                        aria-label="Tailor resume for this job">
                        <i className="ti ti-file-text" style={{fontSize:'12px'}} aria-hidden="true"/> Tailor
                      </button>
                      {job.matchScore>0 && (
                        <div style={{position:'absolute',top:'.75rem',right:'2.5rem'}}>
                          <div style={{fontSize:'11px',fontWeight:700,padding:'2px 8px',borderRadius:'20px',background:job.matchScore>60?'rgba(0,229,160,0.15)':job.matchScore>30?'rgba(124,111,247,0.15)':'rgba(255,166,35,0.15)',color:job.matchScore>60?'#00e5a0':job.matchScore>30?'#7c6ff7':'#f5a623',border:`1px solid ${job.matchScore>60?'rgba(0,229,160,0.3)':job.matchScore>30?'rgba(124,111,247,0.3)':'rgba(255,166,35,0.3)'}`}}>{job.matchScore}% match</div>
                        </div>
                      )}
                    </div>
                  ))}
                </>
              ) : loading ? (
                <div style={{textAlign:'center',color:'var(--text2)',padding:'3rem',fontSize:'14px',display:'flex',flexDirection:'column',alignItems:'center',gap:'.75rem'}}>
                  <i className="ti ti-loader" style={{fontSize:'28px',animation:'spin .8s linear infinite'}} aria-hidden="true"/>
                  Loading jobs...
                </div>
              ) : filtered.length===0 ? (
                <div style={{textAlign:'center',color:'var(--text2)',padding:'3rem',fontSize:'14px'}}>
                  <i className="ti ti-search-off" style={{fontSize:'32px',display:'block',marginBottom:'.75rem',color:'var(--text3)'}} aria-hidden="true"/>
                  No jobs found. Try a different search!
                </div>
              ) : (
                filtered.map((job,i)=>(
                   <div key={job.id||i} className="job-card-wrap" onClick={()=>handleJobClick(job)} style={{position:"relative"}}>
                     <JobCard job={job}/>
                     <button onClick={e=>{e.stopPropagation();setTailorJob(job)}}
                       style={{position:"absolute",bottom:".65rem",right:".65rem",display:"inline-flex",alignItems:"center",gap:".25rem",padding:".25rem .6rem",background:"rgba(124,111,247,0.12)",border:"0.5px solid rgba(124,111,247,0.3)",borderRadius:"6px",color:"#7c6ff7",fontSize:"11px",fontWeight:600,cursor:"pointer",fontFamily:"Inter,sans-serif",zIndex:2}}
                       aria-label="Tailor resume for this job">
                       <i className="ti ti-file-text" style={{fontSize:"12px"}} aria-hidden="true"/> Tailor
                     </button>
                   </div>
                ))
              )}
            </div>
          )}
          {view==='map' && <JobMap search={search}/>}
        </div>
      </div>

      {showMatch && <SmartJobMatch onMatched={(jobs,analysis)=>{setSmartJobs(jobs);setResumeAnalysis(analysis);setShowMatch(false);setUserSkills(analysis?.skills||[])}} onClose={()=>setShowMatch(false)}/>}
      {showAlert && <JobAlertModal onClose={()=>{setShowAlert(false);loadUserData()}}/>}
      {showSkillGap && selectedJob && <SkillGapModal job={selectedJob} userSkills={userSkills} onClose={()=>setShowSkillGap(false)} onTrack={handleTrack}/>}
      {tailorJob && user && <TailorModal job={tailorJob} user={user} onClose={()=>setTailorJob(null)}/>}
    </>
  )
}