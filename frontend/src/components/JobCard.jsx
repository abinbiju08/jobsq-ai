export default function JobCard({ job }) {
  const title    = job.title    || job.job_title || 'Untitled'
  const company  = job.company  || ''
  const location = job.location || job.city || ''
  const salary   = job.salary   || job.salary_range || ''
  const jobType  = job.job_type || job.type || ''
  const source   = job.source   || ''
  const logo     = job.logo     || null

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css"/>
      <style>{`
        .jc{background:var(--bg3,#141828);border:1px solid var(--border,rgba(255,255,255,0.07));border-radius:14px;padding:1rem 1.1rem;transition:border-color .2s,background .2s;position:relative;overflow:hidden;}
        .jc:hover{border-color:rgba(0,229,160,0.25);background:var(--bg3h,#181e2e);}
        .jc::after{content:'';position:absolute;inset:0;border-radius:14px;background:linear-gradient(135deg,rgba(0,229,160,0.03),transparent);opacity:0;transition:opacity .2s;pointer-events:none;}
        .jc:hover::after{opacity:1;}
        .jc-top{display:flex;align-items:flex-start;gap:.85rem;}
        .jc-logo{width:40px;height:40px;border-radius:10px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;overflow:hidden;}
        .jc-logo img{width:100%;height:100%;object-fit:cover;border-radius:9px;}
        .jc-title{font-size:14px;font-weight:700;color:var(--text,#eef0ff);margin-bottom:3px;line-height:1.3;}
        .jc-company{font-size:12px;color:var(--text2,#8b93b0);}
        .jc-tags{display:flex;flex-wrap:wrap;gap:.3rem;margin-top:.6rem;}
        .jc-tag{display:inline-flex;align-items:center;gap:.2rem;font-size:11px;padding:2px 8px;border-radius:20px;background:rgba(255,255,255,0.04);border:0.5px solid rgba(255,255,255,0.07);color:var(--text2,#8b93b0);}
        .jc-tag i{font-size:11px;}
        .jc-tag.salary{background:rgba(0,229,160,0.06);border-color:rgba(0,229,160,0.15);color:#00e5a0;}
        .jc-tag.source{background:rgba(124,111,247,0.08);border-color:rgba(124,111,247,0.15);color:#7c6ff7;}
        .jc-hint{position:absolute;top:.85rem;right:.85rem;font-size:10px;color:#4a5168;display:flex;align-items:center;gap:.2rem;opacity:0;transition:opacity .2s;}
        .jc:hover .jc-hint{opacity:1;}
      `}</style>
      <div className="jc">
        <div className="jc-hint">
          <i className="ti ti-eye" aria-hidden="true"/> View details
        </div>
        <div className="jc-top">
          <div className="jc-logo">
            {logo
              ? <img src={logo} alt={company} onError={e=>e.target.style.display='none'}/>
              : <i className="ti ti-building" style={{fontSize:'18px',color:'#4a5168'}} aria-hidden="true"/>
            }
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div className="jc-title">{title}</div>
            <div className="jc-company">{company}{location ? ` · ${location}` : ''}</div>
          </div>
        </div>
        <div className="jc-tags">
          {jobType && <span className="jc-tag"><i className="ti ti-clock" aria-hidden="true"/>{jobType}</span>}
          {salary && <span className="jc-tag salary"><i className="ti ti-currency-rupee" aria-hidden="true"/>{salary}</span>}
          {source && <span className="jc-tag source"><i className="ti ti-link" aria-hidden="true"/>{source}</span>}
        </div>
      </div>
    </>
  )
}