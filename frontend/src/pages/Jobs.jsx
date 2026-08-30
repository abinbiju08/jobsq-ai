import { useState, useEffect } from 'react'
import axios from 'axios'
import JobCard from '../components/JobCard'

const API = import.meta.env.VITE_API_URL

const categories = ['All','IT & Software','Healthcare','Finance','Engineering','Marketing','Education','Sales']
const types = ['All','Full-time','Part-time','Remote','Contract']

export default function Jobs() {
  const [jobs, setJobs] = useState([])
  const [filtered, setFiltered] = useState([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [type, setType] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchJobs()
  }, [])

  useEffect(() => {
    let result = jobs
    if (search) result = result.filter(j => j.title?.toLowerCase().includes(search.toLowerCase()) || j.company?.toLowerCase().includes(search.toLowerCase()))
    if (category !== 'All') result = result.filter(j => j.category === category)
    if (type !== 'All') result = result.filter(j => j.job_type === type)
    setFiltered(result)
  }, [jobs, search, category, type])

  const fetchJobs = async () => {
    try {
      const res = await axios.get(`${API}/jobs`)
      setJobs(res.data)
      setFiltered(res.data)
    } catch {
      // Use mock data if backend not running
      const mock = [
        {id:1,title:'Full Stack Developer',company:'TCS',location:'Bangalore',job_type:'Full-time',salary:'₹8-12 LPA',category:'IT & Software',posted_at:'2h ago',match:94},
        {id:2,title:'Data Scientist',company:'Infosys',location:'Hyderabad',job_type:'Remote',salary:'₹12-18 LPA',category:'IT & Software',posted_at:'4h ago',match:87},
        {id:3,title:'Product Manager',company:'Wipro',location:'Pune',job_type:'Full-time',salary:'₹15-22 LPA',category:'IT & Software',posted_at:'6h ago',match:76},
        {id:4,title:'Staff Nurse',company:'Apollo Hospitals',location:'Chennai',job_type:'Full-time',salary:'₹4-6 LPA',category:'Healthcare',posted_at:'3h ago',match:0},
        {id:5,title:'Finance Manager',company:'HDFC Bank',location:'Mumbai',job_type:'Full-time',salary:'₹14-20 LPA',category:'Finance',posted_at:'8h ago',match:0},
        {id:6,title:'React Developer',company:'Zoho',location:'Remote',job_type:'Remote',salary:'₹10-16 LPA',category:'IT & Software',posted_at:'1h ago',match:91},
        {id:7,title:'Digital Marketing Lead',company:'Swiggy',location:'Bangalore',job_type:'Full-time',salary:'₹8-12 LPA',category:'Marketing',posted_at:'5h ago',match:0},
        {id:8,title:'Civil Engineer',company:'L&T',location:'Delhi',job_type:'Full-time',salary:'₹6-10 LPA',category:'Engineering',posted_at:'12h ago',match:0},
      ]
      setJobs(mock)
      setFiltered(mock)
    }
    setLoading(false)
  }

  return (
    <div style={styles.page}>
      <div style={styles.sidebar}>
        <div style={styles.sideLabel}>Department</div>
        {categories.map(c => (
          <div key={c} style={{...styles.sideItem,...(category===c?styles.sideActive:{})}} onClick={()=>setCategory(c)}>
            {c}
          </div>
        ))}
        <div style={{...styles.sideLabel,marginTop:'1.25rem'}}>Type</div>
        {types.map(t => (
          <div key={t} style={{...styles.sideItem,...(type===t?styles.sideActive:{})}} onClick={()=>setType(t)}>
            {t}
          </div>
        ))}
      </div>
      <div style={styles.main}>
        <div style={styles.topBar}>
          <input style={styles.search} placeholder="Search jobs, companies, skills..." value={search} onChange={e=>setSearch(e.target.value)} />
          <div style={styles.count}>{filtered.length} jobs found</div>
        </div>
        <div style={styles.feed}>
          {loading ? (
            <div style={{textAlign:'center',color:'#8b93b0',padding:'3rem'}}>Loading jobs...</div>
          ) : filtered.length === 0 ? (
            <div style={{textAlign:'center',color:'#8b93b0',padding:'3rem'}}>No jobs found</div>
          ) : (
            filtered.map(job => <JobCard key={job.id} job={job} />)
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  page:{display:'flex',height:'calc(100vh - 52px)',background:'#080c18'},
  sidebar:{width:'200px',background:'#0d1120',borderRight:'1px solid rgba(255,255,255,0.07)',padding:'1rem .85rem',overflowY:'auto',flexShrink:0},
  sideLabel:{fontSize:'10px',fontWeight:600,color:'#4a5168',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:'.5rem',padding:'.25rem .4rem'},
  sideItem:{padding:'.45rem .7rem',borderRadius:'8px',fontSize:'13px',color:'#8b93b0',cursor:'pointer',marginBottom:'2px',transition:'all .15s'},
  sideActive:{background:'rgba(0,229,160,0.1)',color:'#00e5a0',fontWeight:500},
  main:{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'},
  topBar:{padding:'.85rem 1rem',borderBottom:'1px solid rgba(255,255,255,0.07)',background:'#0d1120',display:'flex',alignItems:'center',gap:'1rem'},
  search:{flex:1,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:'9px',padding:'.55rem .85rem',color:'#eef0ff',fontSize:'13px',outline:'none',fontFamily:'Inter,sans-serif'},
  count:{fontSize:'12px',color:'#8b93b0',whiteSpace:'nowrap'},
  feed:{flex:1,overflowY:'auto',padding:'.85rem',display:'flex',flexDirection:'column',gap:'.55rem'},
}
