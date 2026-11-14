const {useState,useRef,useEffect,useMemo}=React;
const html=htm.bind(React.createElement);
const C={cyan:'#22d3ee',green:'#4ade80',amber:'#fbbf24',red:'#ff6b6b',blue:'#60a5fa',violet:'#a78bfa',pink:'#f472b6'};
if (typeof Chart !== 'undefined') {
  Chart.defaults.font.family = "'DM Sans', sans-serif";
  Chart.defaults.color = '#9aa7b8';
}
const card='dashboard-card rounded-md border border-[#2C3235] bg-[#181B1F]';
const R3=Math.sqrt(3);

/* ---------- Icons (inline, Lucide-style) ---------- */
const P={
 upload:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
 db:'<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
 zap:'<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
 chart:'<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/>',
 gauge:'<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
 activity:'<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
 clock:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'
};
const Icon=({n,s=16})=>html`<svg width=${s} height=${s} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" dangerouslySetInnerHTML=${{__html:P[n]}}></svg>`;

/* ---------- Flexible CSV parsing, header mapping & unit normalization ---------- */
const PAT=[
  ['t',/^(timestamp|datetime|dateandtime|loggedat|recordtime|rtc|date|timeanddate|sampletime|logdatetime|start|starttime)$/i],
  ['clock',/^(time|timeofday|logtime|recordtimeonly|clocktime)$/i],
  ['VRY',/^(vry|vab|v12|v1v2|uab|u12|u1u2|ull12|vllry|vl12|vl1l2|voltagery|voltageab|linevoltagery|linevoltageab|voltagel1l2|voltagel12|ul1l2|l1l2voltage|linetolinevoltagery|linetolinevoltageab|voltagel1l2rms|linevoltage12|vrmsab)$/i],
  ['VYB',/^(vyb|vbc|v23|v2v3|ubc|u23|u2u3|ull23|vllyb|vl23|vl2l3|voltageyb|voltagebc|linevoltageyb|linevoltagebc|voltagel2l3|voltagel23|ul2l3|l2l3voltage|linetolinevoltageyb|linetolinevoltagebc|voltagel2l3rms|linevoltage23|vrmsbc)$/i],
  ['VBR',/^(vbr|vca|v31|v3v1|uca|u31|u3u1|ull31|vllbr|vl31|vl3l1|voltagebr|voltageca|linevoltagebr|linevoltageca|voltagel3l1|voltagel31|ul3l1|l3l1voltage|linetolinevoltagebr|linetolinevoltageca|voltagel3l1rms|linevoltage31|vrmsca)$/i],
  ['VR',/^(vr|vrn|van|v1n|v1|voltage1|phasevoltage1|u1|u1n|uln1|vlnr|vln1|voltagern|voltagean|voltagel1n|vl1n|linetoneutralvoltagel1n|voltagel1|phasevoltager|phasevoltagea|phaseavoltage|voltagephasea|voltagea|rphasevoltage|l1voltage|l1nvoltage|va|ua|vrmsan)$/i],
  ['VY',/^(vy|vyn|v2n|v2|voltage2|phasevoltage2|u2|u2n|uln2|vlny|vln2|voltageyn|voltagebn|voltagel2n|vl2n|linetoneutralvoltagel2n|voltagel2|phasevoltagey|phasevoltageb|phasebvoltage|voltagephaseb|voltageb|yphasevoltage|l2voltage|l2nvoltage|ub|vrmsbn)$/i],
  ['VB',/^(vb|vbn|vcn|v3n|v3|voltage3|phasevoltage3|u3|u3n|uln3|vlnb|vln3|voltagecn|voltagel3n|vl3n|linetoneutralvoltagel3n|voltagel3|phasevoltagec|phasecvoltage|voltagephasec|voltagec|bphasevoltage|l3voltage|l3nvoltage|vc|uc|vrmscn)$/i],
  ['IR',/^(ir|i1|ia|ilr|il1|ilinr|linecurrentr|linecurrenta|currentr|currenta|currentl1|l1current|amperel1|apparentcurrentl1|irmsa)$/i],
  ['IY',/^(iy|i2|ib|ily|il2|iliny|linecurrenty|linecurrentb|currenty|currentb|currentl2|l2current|amperel2|apparentcurrentl2|irmsb)$/i],
  ['IB',/^(ib|i3|ic|ilb|il3|ilinb|linecurrentb|linecurrentc|currentc|currentl3|l3current|amperel3|apparentcurrentl3|irmsc)$/i],
  ['INm',/^(in|intrl|ineutral|neutralcurrent|neutralcurrenta|ncurrent|currentneutral|currentn|neutralamps|neutralcurrentrms|inrms|irmsn)$/i],
  ['IRp',/^(irph|irp|iphr|iph1|iphasea|phasecurrent1|phasecurrentr|phasecurrenta|currentphasea|phaseacurrent|rphasecurrent|windingcurrentr)$/i],
  ['IYp',/^(iyph|iyp|iphy|iph2|iphasey|iphaseb|phasecurrent2|phasecurrenty|phasecurrentb|currentphaseb|phasebcurrent|yphasecurrent|windingcurrenty)$/i],
  ['IBp',/^(ibph|ibp|iphb|iphc|iph3|iphasec|phasecurrent3|phasecurrentc|phasecurrentb|currentphasec|phaseccurrent|bphasecurrent|windingcurrentb)$/i],
  ['kW',/^(kw|w|mw|p|ptotal|ptot|totalp|pact|pactive|activepower|activepowerkw|totalactivepower|totalactivepowerkw|activepowertotal|poweractive|totalkw|kwtotal|kwavg|systemactivepower|totalrealpower|realpowertotal|powerptotal)$/i],
  ['kVAR',/^(kvar|var|mvar|q|qtotal|qtot|totalq|qreactive|reactive|reactivepower|reactivepowerkvar|totalreactivepower|reactivepowertotal|totalkvar|kvartotal|kvaravg|systemreactivepower|totalreactivepowerkvar|powerqfundtotal)$/i],
  ['kVA',/^(kva|va|mva|s|stotal|stot|totals|apparentpower|apparentpowerkva|totalapparentpower|apparentpowertotal|totalkva|kvatotal|kvaavg|systemapparentpower|powerstotal)$/i],
  ['PF',/^(pf|powerfactor|cosphi|cosphitotal|cos|pfavg|totpf|pftotal|syspf|totalpf|totalpowerfactor|powerfactortotal|systempowerfactor|displacementpf|avgpf|averagepf|avgpowerfactor|averagepowerfactor|pfcapindtotal)$/i],
  ['Hz',/^(hz|f|freq|frequency|systemfrequency|linefrequency|mainsfrequency|fq|fqtest)$/i]
];

const isPhaseHeader=raw=>/(?:^(?:[ivu]|il|ip|iph|vln|uln)[\s_-]*[abcryb]$|(?:\bphase[\s_-]+(?:current|voltage)|\b(?:current|voltage)[\s_-]+phase|\b(?:current|voltage))[\s_-]+[abcryb]$)/i.test(raw);

const norm=h=>{
  const raw=String(h||'').replace(/^.*\s>\s*/,'').trim().toLowerCase().replace(/[φϕф]/g,'phi').replace(/\([^)]*\)|\[[^\]]*\]/g,'').trim();
  // Preserve standalone measurement headers (kW, W, MW, kVAR, var, kVA, VA, PF, Hz, P, Q, S, F).
  if(/^(?:mw|kw|w|mvar|kvar|var|mva|kva|va|pf|hz|p|q|s|f)$/i.test(raw))return raw.replace(/[^a-z0-9]/g,'');
  // Protect trailing phase identifiers (A/B/C or R/Y/B) before stripping trailing engineering unit tokens.
  const phaseLabel=isPhaseHeader(raw);
  const cleaned=phaseLabel?raw:raw.replace(/(?:^|[\s_-])(?:mvar|kvar|var|mva|kva|va|mw|kw|w|kv|mv|v|ka|ma|a|hz|rms|avg|average)\s*$/i,' ');
  return cleaned.replace(/[^a-z0-9]/g,'');
};

const mean=a=>{
  let s=0,c=0;
  for(let i=0;i<a.length;i++)if(a[i]!=null&&Number.isFinite(a[i])){s+=a[i];c++}
  return c?s/c:null;
};

function toNum(v){
  if(typeof v==='number')return Number.isFinite(v)?v:null;
  if(v==null||typeof v==='boolean')return null;
  let s=String(v).trim();
  if(!s||/^(?:-|—|–|n\/a|#n\/a|#value!|null|nan|over|under|ol|err|error|inf|\+inf|-inf)$/i.test(s))return null;
  // Accept Western and Indian grouped thousands, plus European decimal-comma exports (including 3+ decimal places).
  const unsigned=s.replace(/^[+-]/,'');
  const grouped=/^(?:[1-9]\d{0,2}(?:,\d{3})+|[1-9]\d?(?:,\d{2})+,\d{3})(?:\.\d+)?(?:e[+-]?\d+)?$/i;
  if(s.includes(',')&&grouped.test(unsigned))s=s.replace(/,/g,'');
  else if(!s.includes('.')&&/^[-+]?(?:0,\d+|\d+,\d{1,2}|\d+,\d{4,})$/.test(s))s=s.replace(',','.');
  else if(/^[-+]?\d{1,3}(?:\.\d{3})+,\d+$/.test(s))s=s.replace(/\./g,'').replace(',','.');
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s))return null;
  const n=Number(s);
  return Number.isFinite(n)?n:null;
}

function headerUnit(header){
  const h=String(header||'').trim();
  const bracket=[...h.matchAll(/[([]\s*([^\])]+?)\s*[)\]]/g)].map(m=>m[1].trim()).reverse();
  const known=/^(mw|kw|w|mvar|kvar|var|mva|kva|va|kv|mv|v|ka|ma|a|hz|%|percent|pu)$/i;
  for(const u of bracket)if(known.test(u))return u.toLowerCase();
  const noBracket=h.replace(/\([^)]*\)|\[[^\]]*\]/g,'').trim();
  if(/^(?:mw|kw|w|mvar|kvar|var|mva|kva|va|hz)$/i.test(noBracket))return noBracket.toLowerCase();
  if(isPhaseHeader(noBracket.toLowerCase()))return '';
  const suffix=noBracket.match(/(?:[\s_-])((?:mvar|kvar|var|mva|kva|va|mw|kw|w|kv|mv|v|ka|ma|a|hz)|%|percent|pu)\s*$/i);
  return suffix?suffix[1].toLowerCase():'';
}

function unitScale(key,header,profile){
  const u=headerUnit(header);
  if(!u)return profile==='elspec'&&['kW','kVAR','kVA'].includes(key)?0.001:1; // Elspec trend exports give W / var / VA with no unit in the header
  
  if(['VRY','VYB','VBR','VR','VY','VB'].includes(key))return u==='kv'?1000:u==='mv'?0.001:1;
  if(['IR','IY','IB','IRp','IYp','IBp','INm'].includes(key))return u==='ka'?1000:u==='ma'?0.001:1;
  if(key==='kW')return u==='w'?0.001:u==='mw'?1000:1;
  if(key==='kVAR')return u==='var'?0.001:u==='mvar'?1000:1;
  if(key==='kVA')return u==='va'?0.001:u==='mva'?1000:1;
  if(key==='PF')return (u==='%'||u==='percent')?0.01:1;
  return 1;
}

function pt(v){
  if(typeof v==='number'){
    if(!Number.isFinite(v))return NaN;
    if(v>1e14)return v/1000;
    return v>1e11?v:v*1000;
  }
  const s=String(v??'').trim();
  if(!s)return NaN;
  const dmy=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(?:\s*(am|pm))?)?$/i);
  if(dmy){
    const day=+dmy[1],month=+dmy[2],rawY=+dmy[3],year=rawY<100?2000+rawY:rawY;
    let hour=+(dmy[4]||0);
    const minute=+(dmy[5]||0),second=+(dmy[6]||0),ampm=(dmy[8]||'').toLowerCase();
    if(ampm){
      if(hour<1||hour>12)return NaN;
      if(ampm==='pm'&&hour<12)hour+=12;
      if(ampm==='am'&&hour===12)hour=0;
    }
    const d=new Date(year,month-1,day,hour,minute,second);
    if(d.getFullYear()!==year||d.getMonth()!==month-1||d.getDate()!==day||hour>23||minute>59||second>59)return NaN;
    return d.getTime()+(dmy[7]?Number('0.'+dmy[7])*1000:0);
  }
  const ymd=s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?(?:\s*(am|pm))?)?$/i);
  if(ymd&&!s.includes('Z')&&!/[+-]\d{2}:?\d{2}$/.test(s)){
    const year=+ymd[1],month=+ymd[2],day=+ymd[3];
    let hour=+(ymd[4]||0);
    const minute=+(ymd[5]||0),second=+(ymd[6]||0),ampm=(ymd[8]||'').toLowerCase();
    if(ampm){
      if(hour<1||hour>12)return NaN;
      if(ampm==='pm'&&hour<12)hour+=12;
      if(ampm==='am'&&hour===12)hour=0;
    }
    const d=new Date(year,month-1,day,hour,minute,second);
    if(d.getFullYear()!==year||d.getMonth()!==month-1||d.getDate()!==day||hour>23||minute>59||second>59)return NaN;
    return d.getTime()+(ymd[7]?Number('0.'+ymd[7])*1000:0);
  }
  const parsed=Date.parse(s);
  return Number.isFinite(parsed)?parsed:NaN;
}

function derive(r,config={}){
  const source=r._source||Object.fromEntries(Object.entries(r).filter(([k])=>k!=='_source'));
  r={...source,_source:source};
  const topology=config.topology||'wye4';
  const delta=topology==='delta';
  const bal=config.assumeBalanced!==false;

  if(bal){
    if(delta){
      if(r.VR==null&&r.VRY!=null)r.VR=r.VRY;
      if(r.VY==null&&r.VYB!=null)r.VY=r.VYB;
      if(r.VB==null&&r.VBR!=null)r.VB=r.VBR;
      if(r.VRY==null&&r.VR!=null)r.VRY=r.VR;
      if(r.VYB==null&&r.VY!=null)r.VYB=r.VY;
      if(r.VBR==null&&r.VB!=null)r.VBR=r.VB;
    }else{
      if(r.VR==null&&r.VRY!=null)r.VR=r.VRY/R3;
      if(r.VY==null&&r.VYB!=null)r.VY=r.VYB/R3;
      if(r.VB==null&&r.VBR!=null)r.VB=r.VBR/R3;
      if(r.VRY==null&&r.VR!=null)r.VRY=r.VR*R3;
      if(r.VYB==null&&r.VY!=null)r.VYB=r.VY*R3;
      if(r.VBR==null&&r.VB!=null)r.VBR=r.VB*R3;
    }
  }
  // In Wye, I_line === I_phase by series winding topology; in Delta, I_line = sqrt(3)*I_phase under balanced assumption.
  if(!delta||bal){
    if(r.IRp==null&&r.IR!=null)r.IRp=delta?r.IR/R3:r.IR;
    if(r.IYp==null&&r.IY!=null)r.IYp=delta?r.IY/R3:r.IY;
    if(r.IBp==null&&r.IB!=null)r.IBp=delta?r.IB/R3:r.IB;
    if(r.IR==null&&r.IRp!=null)r.IR=delta?r.IRp*R3:r.IRp;
    if(r.IY==null&&r.IYp!=null)r.IY=delta?r.IYp*R3:r.IYp;
    if(r.IB==null&&r.IBp!=null)r.IB=delta?r.IBp*R3:r.IBp;
  }

  r.Vavg=mean([r.VRY,r.VYB,r.VBR]);
  r.Vph=mean([r.VR,r.VY,r.VB]);
  r.Iavg=mean([r.IR,r.IY,r.IB]);
  r.Iph=mean([r.IRp,r.IYp,r.IBp]);

  if(r.Vavg>0&&[r.VRY,r.VYB,r.VBR].every(Number.isFinite))
    r.VUF=Math.max(Math.abs(r.VRY-r.Vavg),Math.abs(r.VYB-r.Vavg),Math.abs(r.VBR-r.Vavg))/r.Vavg*100;
  else if(r.Vph>0&&[r.VR,r.VY,r.VB].every(Number.isFinite))
    r.VUF=Math.max(Math.abs(r.VR-r.Vph),Math.abs(r.VY-r.Vph),Math.abs(r.VB-r.Vph))/r.Vph*100;

  if(r.Iavg>0&&[r.IR,r.IY,r.IB].every(Number.isFinite)){
    r.IUF=Math.max(Math.abs(r.IR-r.Iavg),Math.abs(r.IY-r.Iavg),Math.abs(r.IB-r.Iavg))/r.Iavg*100;
    const inSq=r.IR*r.IR+r.IY*r.IY+r.IB*r.IB-r.IR*r.IY-r.IY*r.IB-r.IB*r.IR;
    r.IN=Math.sqrt(Math.max(0,inSq));
  }
  if(r.INm!=null&&Number.isFinite(r.INm))r.IN=Math.abs(r.INm);

  r.lead=r.kVAR!=null?r.kVAR<0:(r.PF!=null&&r.PF<0);
  if(r.PF!=null){
    if(Math.abs(r.PF)>1&&Math.abs(r.PF)<=100)r.PF/=100;
    r.PF=Math.max(-1,Math.min(1,r.PF));
  }

  // Complete 4-quadrant power triangle (kW, kVAR, kVA, PF)
  if(r.kVA==null){
    if(r.kW!=null&&r.kVAR!=null)r.kVA=Math.hypot(r.kW,r.kVAR);
    else if(r.kW!=null&&r.PF!=null&&Math.abs(r.PF)>0)r.kVA=Math.abs(r.kW)/Math.abs(r.PF);
    else if(r.kVAR!=null&&r.PF!=null&&Math.abs(r.PF)<1){
      const sinPhi=Math.sqrt(Math.max(0,1-r.PF*r.PF));
      if(sinPhi>0)r.kVA=Math.abs(r.kVAR)/sinPhi;
    }else if(!delta&&[r.VR,r.VY,r.VB,r.IR,r.IY,r.IB].every(Number.isFinite)){
      r.kVA=(r.VR*r.IR+r.VY*r.IY+r.VB*r.IB)/1000;
    }else if([r.VRY,r.VYB,r.VBR,r.IR,r.IY,r.IB].every(Number.isFinite)){
      r.kVA=(R3*r.Vavg*r.Iavg)/1000;
    }
  }
  if(r.kW==null&&r.kVA!=null&&r.PF!=null)r.kW=r.kVA*Math.abs(r.PF);
  if(r.kW==null&&r.kVA!=null&&r.kVAR!=null)r.kW=Math.sqrt(Math.max(0,r.kVA*r.kVA-r.kVAR*r.kVAR));
  if(r.kVAR==null&&r.kVA!=null&&r.kW!=null){
    const q=Math.sqrt(Math.max(0,r.kVA*r.kVA-r.kW*r.kW));
    r.kVAR=r.lead?-q:q;
  }
  if(r.PF==null&&r.kW!=null&&r.kVA>0){
    r.PF=(r.lead?-1:1)*Math.min(1,Math.abs(r.kW)/r.kVA);
  }else if(r.PF!=null){
    // Synchronize PF sign with leading/capacitive indicator while preserving magnitude in PFmag.
    const mag=Math.min(1,Math.abs(r.PF));
    r.PF=r.lead?-mag:mag;
  }
  if(r.PF!=null&&Number.isFinite(r.PF))r.PFmag=Math.abs(r.PF);
  return r;
}

/* ---------- Datalogger file repair & content summary ---------- */
function repairCsvText(text){
  const s=String(text).replace(/^\uFEFF/,'');
  const lines=s.split(/\r\n|\n|\r/);
  const hi=lines.findIndex(l=>l.trim()!=='');
  if(hi<0)return {text:s,delimiter:'',repaired:0};
  const head=lines[hi],sample=[];
  for(let i=hi+1;i<lines.length&&sample.length<20;i++)if(lines[i].trim()!=='')sample.push(lines[i]);
  let best=null;
  for(const d of [';','\t',',']){
    const counts=(sample.length?sample:[head]).map(l=>l.split(d).length-1);
    const score=Math.min(...counts);
    if(score>=1&&(!best||score>best.score))best={d,score,counts};
  }
  if(!best)return {text:s,delimiter:'',repaired:0};
  const d=best.d,freq={};
  for(const c of best.counts)freq[c+1]=(freq[c+1]||0)+1;
  const D=+Object.keys(freq).sort((a,b)=>freq[b]-freq[a])[0];
  const H=head.split(d);
  if(H.length<=D)return {text:s,delimiter:d,repaired:0};
  // Some loggers put the separator inside a column name ("CosPhi; UL3 IL3"); rejoin those fragments.
  let need=H.length-D;const out=[];
  for(const t of H){
    if(need>0&&out.length&&/^\s/.test(t)){out[out.length-1]=out[out.length-1].trimEnd()+' '+t.trim();need--}
    else out.push(t);
  }
  if(need!==0)return {text:s,delimiter:d,repaired:0};
  lines[hi]=out.join(d);
  return {text:lines.join('\n'),delimiter:d,repaired:H.length-D};
}

const AVAIL_KEYS={voltage:['VR','VY','VB','VRY','VYB','VBR'],current:['IR','IY','IB','IRp','IYp','IBp','IN'],pq:['kW','kVAR','kVA'],pf:['PF'],freq:['Hz']};
function availability(rows){
  const a={};
  for(const f in AVAIL_KEYS)a[f]=rows.some(r=>AVAIL_KEYS[f].some(k=>Number.isFinite(r[k])));
  a.pages={power:a.pq||a.pf||a.freq,graphs:a.pq||a.pf,voltage:a.voltage,current:a.current};
  return a;
}
const spanText=ms=>{
  const s=Math.round(ms/1000);
  if(s<60)return s+' s';
  if(s<3600)return Math.floor(s/60)+' min '+(s%60)+' s';
  if(s<86400){const m=Math.round(s/60);return Math.floor(m/60)+' h '+(m%60)+' min'}
  const h=Math.round(s/3600);return Math.floor(h/24)+' d '+(h%24)+' h';
};
function summarizeImport(o,extra={}){
  const fam=k=>/^V/.test(k)?'Voltage':/^I/.test(k)?'Current':k==='PF'?'Power factor':k==='Hz'?'Frequency':'Power';
  const found={},derived={};
  for(const s of o.signals){
    const f=fam(s.key),lab=s.label.split(' · ')[0];
    if(s.status==='imported')(found[f]=found[f]||[]).push(lab);
    else if(s.status==='estimated')(derived[f]=derived[f]||[]).push(s.label.replace(' · ',' '));
  }
  const order=['Voltage','Current','Power','Power factor','Frequency'];
  const missing=order.filter(f=>!found[f]&&!derived[f]).map(f=>f==='Power'?'Active / reactive / apparent power':f);
  const notes=[];
  if(extra.repaired)notes.push('The header row had '+extra.repaired+' column name'+(extra.repaired>1?'s':'')+' containing the separator character; it was repaired so values line up with the right columns.');
  if(o.blankRowsDropped)notes.push(o.blankRowsDropped.toLocaleString()+' of '+(o.rows.length+o.blankRowsDropped).toLocaleString()+' rows had no readings and were skipped.');
  if(o.emptyFields&&o.emptyFields.length)notes.push(o.emptyFields.length+' column'+(o.emptyFields.length>1?'s are':' is')+' completely empty.');
  if(o.rebuilt)notes.push('The Start column holds only minutes:seconds (no date or hour), so times were rebuilt from the Trend_Period column ('+o.rebuilt.period+' s steps) starting at '+fmtDT(o.rebuilt.anchor)+', taken from the file name. Energy depends only on the step size; please confirm the start date/time with whoever exported the file.');
  if(o.profile==='elspec'&&o.mappedFields.some(m=>['kW','kVAR','kVA'].includes(m.key)&&m.scale===0.001&&!m.unit))notes.push('Power columns carry no unit in this export; they were read as W / var / VA and converted to kW / kVAR / kVA.');
  const mm=(o.ignoredFields||[]).filter(f=>/_(min|max)$/i.test(f)).length;
  if(mm)notes.push(mm+' min/max columns are not plotted; averages are used.');
  const tst=o.mappedFields.find(m=>/test/i.test(m.header));
  if(tst)notes.push('Column “'+tst.header.replace(/^.*\s>\s*/,'')+'” has “test” in its name; confirm it holds real measurements.');
  if(!o.hasTimestamp)notes.push('No usable timestamps were found, so times are placeholders and energy totals are unavailable.');
  const rows=o.rows,span=o.hasTimestamp&&rows.length>1?spanText(rows[rows.length-1].t-rows[0].t):null;
  return {name:extra.name||'',found:order.filter(f=>found[f]).map(f=>[f,found[f]]),derived:order.filter(f=>derived[f]).map(f=>[f,derived[f]]),
    missing,notes,rowsUsed:rows.length,span,show:missing.length>0||notes.length>0};
}

function normalize(data,fields,config={}){
  const used=new Set(),map={};
  const electricalKeys=['VRY','VYB','VBR','VR','VY','VB','IR','IY','IB','IRp','IYp','IBp','INm','kW','kVAR','kVA','PF','Hz'];
  // A column counts as empty when every cell is blank; empty duplicates must not shadow a populated channel.
  const hasData={};let remaining=fields.length;
  for(const d of data){
    if(!remaining)break;
    for(const f of fields)if(!hasData[f]){const v=d[f];if(v!=null&&String(v).trim()!==''){hasData[f]=true;remaining--}}
  }
  for(const [k,re] of PAT){
    const c=fields.filter(f=>!used.has(f)&&re.test(norm(f)));
    const h=c.find(f=>hasData[f]&&/avg$/i.test(f))||c.find(f=>hasData[f])||c[0];
    if(h){map[k]=h;used.add(h)}
  }
  if(!map.t&&map.clock){map.t=map.clock;delete map.clock} // a lone TIME column holding full date-times is the timestamp
  const periodField=fields.find(f=>norm(f)==='trendperiod');
  const profile=periodField&&fields.some(f=>/_avg$/i.test(f))&&fields.some(f=>/^stop/i.test(f))?'elspec':null;
  const mappedElectrical=Object.keys(map).filter(k=>electricalKeys.includes(k));
  const hasRowData=d=>mappedElectrical.some(k=>toNum(d[map[k]])!=null);
  let src=data,blankRowsDropped=0;
  if(mappedElectrical.length&&data.some(hasRowData)){src=data.filter(hasRowData);blankRowsDropped=data.length-src.length}
  // Trend exports sometimes keep only mm:ss in the Start column. When the interval is known (Trend_Period) and the
  // file name carries a YYMMDD_HHMM stamp, rebuild a regular timeline from it; energy then depends only on the interval.
  let rebuilt=null;
  if(map.t&&periodField&&blankRowsDropped===0&&src.length>1&&!src.slice(0,50).some(d=>Number.isFinite(pt(d[map.t])))){
    const m=String(config.fileName||'').match(/(?:^|[_\s-])(\d{2})(\d{2})(\d{2})_(\d{2})(\d{2})(?:[_.\s-]|$)/);
    if(m&&+m[2]>=1&&+m[2]<=12&&+m[3]>=1&&+m[3]<=31&&+m[4]<24&&+m[5]<60){
      const periods=src.map(d=>toNum(d[periodField]));
      if(periods.every(p=>p!=null&&p>0)){
        const anchor=new Date(2000+ +m[1],+m[2]-1,+m[3],+m[4],+m[5]).getTime(),times=[];let acc=anchor;
        for(const p of periods){times.push(acc);acc+=p*1000}
        rebuilt={anchor,times,period:periods[0]};
      }
    }
  }
  const base=Date.now()-Math.max(0,src.length-1)*60000;
  let validTimestamps=0;
  const rows=src.map((d,i)=>{
    let timestamp=map.t?d[map.t]:null;
    if(map.t&&norm(map.t)==='date'&&map.clock&&d[map.clock]!=null)timestamp=String(timestamp??'')+' '+String(d[map.clock]);
    const parsedT=rebuilt?rebuilt.times[i]:pt(timestamp);
    const hasT=Number.isFinite(parsedT);
    if(hasT)validTimestamps++;
    const r={t:hasT?parsedT:base+i*60000};
    for(const k in map){
      if(k==='t'||k==='clock')continue;
      const value=toNum(d[map[k]]);
      r[k]=value==null?null:value*unitScale(k==='INm'?'INm':k,map[k],profile);
    }
    r._sourceIndex=i;
    return derive(r,config);
  }).sort((a,b)=>a.t-b.t||a._sourceIndex-b._sourceIndex);
  rows.forEach(r=>{delete r._sourceIndex;if(r._source)delete r._source._sourceIndex;});
  const mappedFields=Object.entries(map).filter(([k])=>k!=='clock').map(([key,header])=>({key,header,unit:headerUnit(header),scale:unitScale(key,header,profile),hasData:!!hasData[header]}));
  const emptyFields=fields.filter(f=>!used.has(f)&&!hasData[f]);
  const ignoredFields=fields.filter(f=>!used.has(f)&&hasData[f]);
  const mappedKeys=Object.keys(map).filter(k=>k!=='clock');
  const recognizedElectrical=mappedKeys.some(k=>electricalKeys.includes(k));
  const signals=[
    ['VRY','V_RY · line voltage'],['VYB','V_YB · line voltage'],['VBR','V_BR · line voltage'],
    ['VR','V_R · phase voltage'],['VY','V_Y · phase voltage'],['VB','V_B · phase voltage'],
    ['IR','I_R · line current'],['IY','I_Y · line current'],['IB','I_B · line current'],
    ['IRp','I_R · phase current'],['IYp','I_Y · phase current'],['IBp','I_B · phase current'],
    ['kW','Active power'],['kVAR','Reactive power'],['kVA','Apparent power'],['PF','Power factor'],
    ['IN','Neutral current'],['Hz','Frequency']
  ].map(([key,label])=>{
    const sourceKey=key==='IN'?'INm':key;
    const imported=!!map[sourceKey]&&!!hasData[map[sourceKey]];
    const present=rows.some(row=>Number.isFinite(row[key]));
    return {key,label,status:imported?(present?'imported':'empty'):present?'estimated':'missing'};
  });
  const hasTimestamp=!!map.t&&(src.length<=1?validTimestamps>=1:validTimestamps>=2);
  return {rows,mapped:mappedKeys,mappedFields,ignoredFields,emptyFields,blankRowsDropped,signals,recognizedElectrical,hasTimestamp,profile,rebuilt:rebuilt?{anchor:rebuilt.anchor,period:rebuilt.period}:null};
}

function makeImportReport(result){
  const states=result.signals;
  const imported=states.filter(x=>x.status==='imported').length;
  const estimated=states.filter(x=>x.status==='estimated').length;
  const missing=states.filter(x=>x.status==='missing'||x.status==='empty').length;
  return {signals:states,mappedFields:result.mappedFields,ignoredFields:result.ignoredFields,emptyFields:result.emptyFields||[],blankRowsDropped:result.blankRowsDropped||0,
    imported,estimated,missing,hasTimestamp:result.hasTimestamp,recognizedElectrical:result.recognizedElectrical,profile:result.profile||null,rebuilt:result.rebuilt||null};
}

function refreshImportReport(report,rows){
  if(!report)return report;
  const direct=new Set(report.mappedFields.filter(x=>x.hasData!==false).map(x=>x.key));
  const signals=report.signals.map(x=>{
    const sourceKey=x.key==='IN'?'INm':x.key;
    const imported=direct.has(sourceKey);
    const present=rows.some(row=>Number.isFinite(row[x.key]));
    return {...x,status:imported?(present?'imported':'empty'):present?'estimated':'missing'};
  });
  return {...report,signals,
    imported:signals.filter(x=>x.status==='imported').length,
    estimated:signals.filter(x=>x.status==='estimated').length,
    missing:signals.filter(x=>x.status==='missing'||x.status==='empty').length};
}

/* ---------- Mock data: 24h @ 5-min, 3-phase 415V plant ---------- */
function sample(){
  const n=288,step=3e5,end=Math.floor(Date.now()/step)*step,rows=[],rnd=a=>(Math.random()-.5)*2*a,f=(v,d)=>+v.toFixed(d);
  for(let i=0;i<n;i++){
    const t=end-(n-1-i)*step,d=new Date(t),h=d.getHours()+d.getMinutes()/60;
    let load=.6+.25*Math.sin(Math.PI*(h-6)/12)+rnd(.04)+(Math.sin(i/7)>.96?.12:0);
    load=Math.max(.25,Math.min(1,load));
    const vb=415+4*Math.sin(i/40)-8*load+rnd(1.2);
    const VRY=vb+1.5+rnd(.6),VYB=vb-1+rnd(.6),VBR=vb-.5+rnd(.6);
    const IR=130*load*(1.04+rnd(.02)),IY=130*load*(.98+rnd(.02)),IB=130*load*(1+rnd(.02));
    let pf=.8+.2*load+rnd(.01); if(i>190&&i<206)pf-=.06; pf=Math.min(.995,Math.max(.78,pf));
    const kVA=R3*((VRY+VYB+VBR)/3)*((IR+IY+IB)/3)/1000,kW=kVA*pf,kVAR=Math.sqrt(kVA*kVA-kW*kW);
    rows.push(derive({t,VRY:f(VRY,1),VYB:f(VYB,1),VBR:f(VBR,1),VR:f(VRY/R3+rnd(.3),1),VY:f(VYB/R3+rnd(.3),1),VB:f(VBR/R3+rnd(.3),1),
      IR:f(IR,1),IY:f(IY,1),IB:f(IB,1),IRp:f(IR,1),IYp:f(IY,1),IBp:f(IB,1),kW:f(kW,2),kVAR:f(kVAR,2),kVA:f(kVA,2),PF:f(pf,3),Hz:f(50+rnd(.04),2)}));
  }
  return rows;
}

/* ---------- Peak-Preserving Downsampler & Stack-Safe Stats ---------- */
const ds=(a,maxPts=300,keys=['VRY','VYB','VBR','VR','VY','VB','IR','IY','IB','IRp','IYp','IBp','kW','kVAR','kVA','PF','PFmag','VUF','IUF','IN'])=>{
  if(a.length<=maxPts)return a;
  const bucketCount=Math.max(1,Math.floor((maxPts-2)/2));
  const bucketSize=Math.max(1,Math.ceil((a.length-2)/bucketCount));
  const keep=new Set([0,a.length-1]);
  for(let start=1;start<a.length-1;start+=bucketSize){
    const end=Math.min(a.length-1,start+bucketSize);
    for(const key of keys){
      let minI=-1,maxI=-1,min=Infinity,max=-Infinity;
      for(let i=start;i<end;i++){
        const v=a[i][key];
        if(v==null||!Number.isFinite(v))continue;
        if(v<min){min=v;minI=i}
        if(v>max){max=v;maxI=i}
      }
      if(minI>=0)keep.add(minI);
      if(maxI>=0)keep.add(maxI);
    }
  }
  return [...keep].sort((x,y)=>x-y).map(i=>a[i]);
};

const st=(rows,k)=>{
  let min=Infinity,max=-Infinity,sum=0,count=0;
  const useMag=k==='PF'||k==='PFmag';
  for(let i=0;i<rows.length;i++){
    const raw=rows[i][k==='PFmag'?'PF':k];
    if(raw!=null&&Number.isFinite(raw)){
      const v=useMag?Math.abs(raw):raw;
      if(v<min)min=v;
      if(v>max)max=v;
      sum+=v;
      count++;
    }
  }
  return count?{min,max,avg:sum/count}:null;
};

const calcEnergy=(rows,hasRealTimestamps=true)=>{
  let kWh=0,kVArh=0,kVArhLag=0,kVArhLead=0,kVAh=0,maxKVA=0,hasPInterval=false,hasQInterval=false,hasSInterval=false,hasKVA=false;
  const intervals=[];
  for(let i=1;i<rows.length;i++){
    const dt=(rows[i].t-rows[i-1].t)/36e5;
    if(Number.isFinite(dt)&&dt>0)intervals.push(dt);
  }
  intervals.sort((a,b)=>a-b);
  const median=intervals.length?intervals[Math.floor(intervals.length/2)]:0;
  const maxGap=median?median*5:0;
  for(let i=0;i<rows.length;i++){
    const s=rows[i].kVA;
    if(s!=null&&Number.isFinite(s)){hasKVA=true;if(s>maxKVA)maxKVA=s;}
    if(i===0)continue;
    const dt=(rows[i].t-rows[i-1].t)/36e5;
    if(!(dt>0&&dt<24&&(!maxGap||dt<=maxGap)))continue;
    const p0=rows[i-1].kW,p1=rows[i].kW,q0=rows[i-1].kVAR,q1=rows[i].kVAR,s0=rows[i-1].kVA,s1=rows[i].kVA;
    if(Number.isFinite(p0)&&Number.isFinite(p1)){kWh+=0.5*(p0+p1)*dt;hasPInterval=true;}
    // Signed net reactive energy: positive inductive (lag), negative capacitive (lead).
    if(Number.isFinite(q0)&&Number.isFinite(q1)){
      const dq=0.5*(q0+q1)*dt;
      kVArh+=dq;
      if(dq>=0)kVArhLag+=dq;else kVArhLead+=Math.abs(dq);
      hasQInterval=true;
    }
    if(Number.isFinite(s0)&&Number.isFinite(s1)){kVAh+=0.5*(s0+s1)*dt;hasSInterval=true;}
  }
  const validP=hasRealTimestamps&&hasPInterval;
  const validQ=hasRealTimestamps&&hasQInterval;
  const validS=hasRealTimestamps&&hasSInterval;
  const truePF=validP&&validS&&kVAh>0?Math.min(1,Math.abs(kWh)/kVAh):null;
  return {
    kWh:validP?kWh:null,
    kVArh:validQ?kVArh:null,
    kVArhLag:validQ?kVArhLag:null,
    kVArhLead:validQ?kVArhLead:null,
    kVAh:validS?kVAh:null,
    truePF,
    maxKVA:hasKVA?maxKVA:null
  };
};


/* ---------- Power-overview calculations (full-resolution selected rows) ---------- */
const timedStats=(rows,key,absolute=false)=>{
  let min=Infinity,max=-Infinity,sum=0,count=0,minRow=null,maxRow=null;
  for(let i=0;i<rows.length;i++){
    const raw=rows[i][key];
    if(raw==null||!Number.isFinite(raw))continue;
    const value=absolute?Math.abs(raw):raw;
    if(value<min){min=value;minRow=rows[i];}
    if(value>max){max=value;maxRow=rows[i];}
    sum+=value;count++;
  }
  return count?{min,max,avg:sum/count,count,minRow,maxRow}:null;
};

const splitSignedIntegral=(a,b,dt)=>{
  if(!Number.isFinite(a)||!Number.isFinite(b)||!(dt>0))return {positive:0,negative:0};
  if(a>=0&&b>=0)return {positive:(a+b)*.5*dt,negative:0};
  if(a<=0&&b<=0)return {positive:0,negative:(-a-b)*.5*dt};
  if(a>0){
    const f=a/(a-b);
    return {positive:.5*a*f*dt,negative:.5*(-b)*(1-f)*dt};
  }
  const f=(-a)/(b-a);
  return {positive:.5*b*(1-f)*dt,negative:.5*(-a)*f*dt};
};

const calcPowerWindowTotals=(rows,hasRealTimestamps=true)=>{
  let importKWh=0,exportKWh=0,inductiveKVArh=0,capacitiveKVArh=0,kVAh=0;
  let hasP=false,hasQ=false,hasS=false,peak=null,peakP=null,peakQ=null;
  const intervals=[];
  for(let i=1;i<rows.length;i++){
    const dt=(rows[i].t-rows[i-1].t)/36e5;
    if(Number.isFinite(dt)&&dt>0)intervals.push(dt);
  }
  intervals.sort((a,b)=>a-b);
  const median=intervals.length?intervals[Math.floor(intervals.length/2)]:0;
  const maxGap=median?median*5:0;
  for(let i=0;i<rows.length;i++){
    const r=rows[i];
    if(Number.isFinite(r.kVA)&&(!peak||r.kVA>peak.value))peak={value:r.kVA,t:r.t};
    if(Number.isFinite(r.kW)&&(!peakP||r.kW>peakP.value))peakP={value:r.kW,t:r.t};
    if(Number.isFinite(r.kVAR)&&(!peakQ||Math.abs(r.kVAR)>Math.abs(peakQ.value)))peakQ={value:r.kVAR,t:r.t};
    if(i===0)continue;
    const prev=rows[i-1],dt=(r.t-prev.t)/36e5;
    if(!(dt>0&&dt<24&&(!maxGap||dt<=maxGap)))continue;
    if(Number.isFinite(prev.kW)&&Number.isFinite(r.kW)){
      const parts=splitSignedIntegral(prev.kW,r.kW,dt);
      importKWh+=parts.positive;exportKWh+=parts.negative;hasP=true;
    }
    if(Number.isFinite(prev.kVAR)&&Number.isFinite(r.kVAR)){
      const parts=splitSignedIntegral(prev.kVAR,r.kVAR,dt);
      inductiveKVArh+=parts.positive;capacitiveKVArh+=parts.negative;hasQ=true;
    }
    if(Number.isFinite(prev.kVA)&&Number.isFinite(r.kVA)){
      kVAh+=.5*(prev.kVA+r.kVA)*dt;hasS=true;
    }
  }
  const validP=hasRealTimestamps&&hasP,validQ=hasRealTimestamps&&hasQ,validS=hasRealTimestamps&&hasS;
  const netKWh=validP?importKWh-exportKWh:null;
  const netKVArh=validQ?inductiveKVArh-capacitiveKVArh:null;
  return {
    importKWh:validP?importKWh:null,exportKWh:validP?exportKWh:null,netKWh,
    inductiveKVArh:validQ?inductiveKVArh:null,capacitiveKVArh:validQ?capacitiveKVArh:null,netKVArh,
    kVAh:validS?kVAh:null,
    energyPF:validP&&validS&&kVAh>0?Math.min(1,Math.abs(netKWh)/kVAh):null,
    peakKVA:peak?peak.value:null,peakTime:peak?peak.t:null,
    peakKW:peakP?peakP.value:null,peakKWTime:peakP?peakP.t:null,peakKVAR:peakQ?peakQ.value:null,peakKVARTime:peakQ?peakQ.t:null
  };
};

const sampleLeadSplit=rows=>{
  let lag=0,lead=0;
  for(const r of rows){
    let sign=null;
    if(Number.isFinite(r.kVAR))sign=r.kVAR<0?-1:(r.kVAR>0?1:0);
    else if(Number.isFinite(r.PF))sign=r.PF<0?-1:(r.PF>0?1:0);
    if(sign<0)lead++;else if(sign>0)lag++;
  }
  const total=lag+lead;
  return {lag,lead,total,lagPct:total?Math.round(lag/total*100):0,leadPct:total?Math.round(lead/total*100):0};
};

const durationText=ms=>{
  if(!Number.isFinite(ms)||ms<0)return '—';
  const mins=Math.round(ms/60000);
  if(mins<1)return '<1 min';
  if(mins<60)return mins+' min';
  const h=Math.floor(mins/60),m=mins%60;
  return h+'h'+(m?' '+m+'m':'');
};


const fx=(v,dp)=>v==null||!Number.isFinite(v)?'—':v.toFixed(dp);
const fmtDT=t=>t==null||isNaN(t)?'—':new Date(t).toLocaleString([], {year:'numeric',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:false});
const fmtClock=t=>t==null||isNaN(t)?'—':new Date(t).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:false});
const rowTime=(t,hasReal=true)=>hasReal?fmtDT(t):'Timestamp unavailable';
const hasValue=(rows,k)=>rows.some(r=>r[k]!=null&&Number.isFinite(r[k]));

/* ---------- Chart.js wrapper ---------- */
function Cv({datasets,opts,cls,plugins=[]}){
  const ref=useRef(),ch=useRef();
  useEffect(()=>{
    if(!ref.current||typeof Chart==='undefined')return;
    try{
      if(!ch.current){
        if(typeof Chart.getChart==='function'){
          const existing=Chart.getChart(ref.current);
          if(existing)existing.destroy();
        }
        ch.current=new Chart(ref.current,{type:'line',data:{datasets},options:opts,plugins});
      }else{
        ch.current.data.datasets=datasets;
        ch.current.options=opts;
        ch.current.update('none');
      }
    }catch(err){console.error('Chart render failed:',err)}
  },[datasets,opts]);
  useEffect(()=>()=>{if(ch.current){ch.current.destroy();ch.current=null}},[]);
  return html`<div class=${'relative '+cls}><canvas ref=${ref}></canvas></div>`;
}

const sparkOpts={responsive:true,maintainAspectRatio:false,animation:false,events:[],plugins:{legend:{display:false},tooltip:{enabled:false}},scales:{x:{type:'linear',display:false},y:{display:false}}};
const mkOpts=(rows,unit,dp,yMin,yMax)=>{
  if(!rows.length)return sparkOpts;
  const rawT0=rows[0].t,rawT1=rows[rows.length-1].t;
  const t0=rawT0===rawT1?rawT0-60000:rawT0,t1=rawT0===rawT1?rawT1+60000:rawT1;
  const long=t1-t0>36*36e5;
  const f=v=>{const d=new Date(v),tm=d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:false});return long?d.toLocaleDateString([], {day:'2-digit',month:'short'})+' '+tm:tm};
  return {responsive:true,maintainAspectRatio:false,animation:false,interaction:{mode:'index',intersect:false},
    plugins:{legend:{display:false},tooltip:{backgroundColor:'#0b0c10',borderColor:'#2C3235',borderWidth:1,titleColor:'#e5e7eb',bodyColor:'#cbd5e1',
      callbacks:{
        title:i=>i.length?new Date(i[0].parsed.x).toLocaleString([], {hour12:false}):'',
        label:c=>' '+c.dataset.label+': '+(c.parsed.y!=null&&Number.isFinite(c.parsed.y)?c.parsed.y.toFixed(dp)+(unit?' '+unit:''):'—')
      }}},
    scales:{x:{type:'linear',min:t0,max:t1,grid:{color:'#23272b'},ticks:{color:'#8b9199',count:7,maxRotation:0,callback:f}},
      y:{min:yMin,max:yMax,grid:{color:'#23272b'},ticks:{color:'#8b9199'},title:{display:!!unit,text:unit,color:'#8b9199'}}}};
};

/* ---------- Components ---------- */
function Panel({title,sub,series,rows,unit,dp=1,yMin,yMax,refLine,h='h-64'}){
  const [hid,setHid]=useState({});
  const av=series.filter(s=>rows.some(r=>r[s.k]!=null&&Number.isFinite(r[s.k])));
  const pts=ds(rows,300,av.map(s=>s.k));
  const datasets=av.map(s=>{
    const validCount=pts.reduce((acc,r)=>acc+(r[s.k]!=null&&Number.isFinite(r[s.k])?1:0),0);
    return {label:s.label,data:pts.map(r=>({x:r.t,y:r[s.k]})),borderColor:s.c,backgroundColor:s.c+'26',fill:!!s.fill,stepped:!!s.step,
      borderDash:s.dash||[],borderWidth:1.5,pointRadius:validCount<=2?3:0,pointHoverRadius:3,spanGaps:false,tension:s.step?0:.3,hidden:!!hid[s.k]};
  });
  if(refLine!=null&&rows.length){
    const rawT0=rows[0].t,rawT1=rows[rows.length-1].t;
    const t0=rawT0===rawT1?rawT0-60000:rawT0,t1=rawT0===rawT1?rawT1+60000:rawT1;
    datasets.push({label:'Target ('+refLine+')',data:[{x:t0,y:refLine},{x:t1,y:refLine}],borderColor:C.red,borderDash:[6,4],borderWidth:1,pointRadius:0});
  }
  const opts=mkOpts(rows,unit,dp,yMin,yMax);
  return html`<section class=${card+' p-4'}>
    <div class="flex items-start justify-between gap-2 flex-wrap">
      <div><h3 class="text-sm font-semibold text-slate-100">${title}</h3><p class="text-xs text-slate-500">${sub}</p></div>
      <div class="flex flex-wrap gap-1.5">${av.map(s=>html`
        <button key=${s.k} onClick=${()=>setHid({...hid,[s.k]:!hid[s.k]})} class=${'flex items-center gap-1.5 rounded border border-[#2C3235] px-2 py-0.5 text-xs transition '+(hid[s.k]?'opacity-40':'hover:bg-white/5')}>
          <span class="inline-block h-0.5 w-3" style=${{background:s.c,height:s.dash?0:2,borderTop:s.dash?'2px dashed '+s.c:'none'}}></span>${s.label}</button>`)}
      </div>
    </div>
    <${Cv} datasets=${datasets} opts=${opts} cls=${h+' mt-3'}/>
    <div class="mt-3 overflow-x-auto"><table class="w-full text-xs mono"><thead><tr class="text-slate-500 text-right"><th class="text-left font-normal py-1">Series</th><th class="font-normal">Min</th><th class="font-normal">Max</th><th class="font-normal">Avg</th></tr></thead>
      <tbody>${av.map(s=>{const x=st(rows,s.k);return html`<tr key=${s.k} class="border-t border-[#2C3235] text-right">
        <td class="text-left py-1 text-slate-300"><span class="inline-block w-2 h-2 rounded-full mr-1.5" style=${{background:s.c}}></span>${s.label}</td>
        <td>${fx(x&&x.min,dp)}</td><td>${fx(x&&x.max,dp)}</td><td class="text-slate-100">${fx(x&&x.avg,dp)}</td></tr>`})}</tbody></table></div>
  </section>`;
}

function Foot({rows,k,dp}){
  const s=st(rows,k)||{};
  return html`<div class="mt-3 grid grid-cols-3 border-t border-[#2C3235] pt-2 text-center text-[11px] mono">
    ${[['Min',s.min],['Max',s.max],['Avg',s.avg]].map(([l,v])=>html`<div key=${l}><div class="text-slate-500">${l}</div><div class="text-slate-200">${fx(v,dp)}</div></div>`)}</div>`;
}

function Kpi({title,k,unit,color,rows,dp=1}){
  const last=rows[rows.length-1]||{};
  const pts=ds(rows,70,[k]).map(r=>({x:r.t,y:r[k]}));
  const data=[{data:pts,borderColor:color,backgroundColor:color+'22',fill:true,borderWidth:1.5,pointRadius:pts.length<=1?2.5:0,spanGaps:false,tension:.35}];
  return html`<div class=${card+' p-4 flex flex-col'}>
    <div class="text-xs uppercase tracking-wide text-slate-400"><${Term} label=${title}/></div>
    <div class="mt-1 flex items-baseline gap-1.5"><span class="text-4xl font-bold mono" style=${{color}}>${fx(last[k],dp)}</span><span class="text-sm text-slate-400">${unit}</span></div>
    <${Cv} datasets=${data} opts=${sparkOpts} cls="h-12 mt-2"/>
    <${Foot} rows=${rows} k=${k} dp=${dp}/>
  </div>`;
}

function PfCard({rows}){
  const last=rows[rows.length-1]||{},pf=last.PF,v=Math.max(0,Math.min(1,Math.abs(pf||0)));
  const lead=!!last.lead;
  const col=v>=.95?C.green:v>=.9?C.amber:C.red;
  const pts=ds(rows,70,['PFmag','PF']).map(r=>({x:r.t,y:r.PFmag!=null?r.PFmag:(r.PF!=null?Math.abs(r.PF):null)}));
  const data=[{data:pts,borderColor:col,backgroundColor:col+'22',fill:true,borderWidth:1.5,pointRadius:pts.length<=1?2.5:0,spanGaps:false,tension:.35}];
  const arc='M20 100A80 80 0 0 1 180 100';
  return html`<div class=${card+' p-4 flex flex-col'}>
    <div class="flex items-center justify-between"><div class="text-xs uppercase tracking-wide text-slate-400">Power Factor (|PF|)</div>
      <span class=${'rounded px-2 py-0.5 text-[11px] font-semibold '+(lead?'bg-cyan-400/15 text-cyan-300':'bg-amber-400/15 text-amber-300')}>${lead?'LEAD (Cap)':'LAG (Ind)'}</span></div>
    <svg viewBox="0 0 200 116" class="mx-auto mt-1 w-full max-w-[220px]">
      <path d=${arc} pathLength="1" fill="none" stroke="#2C3235" stroke-width="14" stroke-linecap="round"/>
      <path d=${arc} pathLength="1" fill="none" stroke=${col} stroke-width="14" stroke-linecap="round" stroke-dasharray=${v+' 1'} style=${{filter:'drop-shadow(0 0 5px '+col+'99)'}}/>
      <text x="100" y="92" text-anchor="middle" fill="#f1f5f9" font-size="34" font-weight="700">${pf==null||!Number.isFinite(pf)?'—':v.toFixed(2)}</text>
      <text x="20" y="114" text-anchor="middle" fill="#8b9199" font-size="10">0</text><text x="180" y="114" text-anchor="middle" fill="#8b9199" font-size="10">1.0</text>
    </svg>
    <${Cv} datasets=${data} opts=${sparkOpts} cls="h-8"/>
    <${Foot} rows=${rows} k="PFmag" dp=${3}/>
  </div>`;
}


/* ---------- New Power overview components ---------- */
function SectionHeading({title,sub}){
  return html`<div class="flex items-center gap-3"><h2 class="shrink-0 text-[11px] font-semibold uppercase tracking-[.18em] text-slate-300">${title}</h2><div class="h-px flex-1 bg-[#30373d]"></div>${sub&&html`<span class="hidden text-[11px] text-slate-400 sm:inline">${sub}</span>`}</div>`;
}

function PowerChart({rows,fullWidth=false,hasRealTimestamps=true}){
  const [hidden,setHidden]=useState({});
  const pts=useMemo(()=>ds(rows,520,['kW','kVAR','kVA']),[rows]);
  const series=[
    {k:'kW',label:'Active · kW',color:C.green},
    {k:'kVAR',label:'Reactive · kVAR',color:C.amber},
    {k:'kVA',label:'Apparent · kVA',color:C.cyan}
  ].filter(s=>hasValue(rows,s.k));
  const datasets=series.map(s=>({label:s.label,data:pts.map(r=>({x:r.t,y:Number.isFinite(r[s.k])?r[s.k]:null})),borderColor:s.color,
    backgroundColor:s.color+'18',borderWidth:2,pointRadius:0,pointHoverRadius:4,pointHitRadius:8,spanGaps:false,tension:.12,hidden:!!hidden[s.k]}));
  const sMax=timedStats(rows,'kVA'),qMin=timedStats(rows,'kVAR'),qMax=timedStats(rows,'kVAR');
  const markers=[];
  if(sMax?.maxRow)markers.push({label:'S peak',x:sMax.maxRow.t,y:sMax.maxRow.kVA,color:C.cyan});
  if(qMin?.minRow&&qMax?.maxRow&&qMin.minRow.t===qMax.maxRow.t)markers.push({label:'Q min/max',x:qMin.minRow.t,y:qMin.minRow.kVAR,color:C.amber});
  else {
    if(qMin?.minRow)markers.push({label:'Q min',x:qMin.minRow.t,y:qMin.minRow.kVAR,color:C.amber});
    if(qMax?.maxRow)markers.push({label:'Q max',x:qMax.maxRow.t,y:qMax.maxRow.kVAR,color:C.amber});
  }
  const markersRef=useRef(markers);
  markersRef.current=markers;
  const crosshair={id:'powerSharedCrosshair',afterDraw(chart){
    const tip=chart.tooltip;
    if(!tip||!tip.getActiveElements||!tip.getActiveElements().length||!chart.chartArea)return;
    const x=tip.caretX,ctx=chart.ctx,{top,bottom}=chart.chartArea;
    ctx.save();ctx.beginPath();ctx.setLineDash([3,4]);ctx.strokeStyle='rgba(190,202,214,.5)';ctx.lineWidth=1;
    ctx.moveTo(x,top);ctx.lineTo(x,bottom);ctx.stroke();ctx.restore();
  }};
  const markerPlugin={id:'powerExtremaMarkers',afterDatasetsDraw(chart){
    if(!chart.chartArea)return;
    const ctx=chart.ctx,xs=chart.scales.x,ys=chart.scales.y,{left,right,top,bottom}=chart.chartArea;
    ctx.save();ctx.font='600 10px "DM Sans", sans-serif';ctx.textBaseline='middle';
    markersRef.current.forEach((m,i)=>{
      const x=xs.getPixelForValue(m.x),y=ys.getPixelForValue(m.y);
      if(x<left||x>right||y<top||y>bottom)return;
      ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fillStyle=m.color;ctx.fill();ctx.lineWidth=1.5;ctx.strokeStyle='#111217';ctx.stroke();
      const label=m.label,w=ctx.measureText(label).width+10,h=17;
      let lx=x+7,ly=y-20-(i===2?17:0);
      if(lx+w>right)lx=x-w-7;
      ly=Math.max(top+2,Math.min(bottom-h,ly));
      ctx.fillStyle='rgba(13,15,19,.92)';ctx.fillRect(lx,ly,w,h);
      ctx.strokeStyle=m.color;ctx.lineWidth=1;ctx.strokeRect(lx,ly,w,h);
      ctx.fillStyle='#e7edf4';ctx.fillText(label,lx+5,ly+h/2);
    });ctx.restore();
  }};
  const x0=rows[0]?.t??0,x1=rows[rows.length-1]?.t??x0;
  const peakCaption=sMax?.maxRow?'Peak demand '+fx(sMax.max,2)+' kVA · '+rowTime(sMax.maxRow.t,hasRealTimestamps):'Peak demand unavailable';
  const axisTime=v=>new Date(v).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',hour12:false});
  const opts={responsive:true,maintainAspectRatio:false,animation:false,interaction:{mode:'index',intersect:false,axis:'x'},
    plugins:{legend:{display:false},tooltip:{enabled:true,mode:'index',intersect:false,backgroundColor:'#0b0d11',borderColor:'#46515c',borderWidth:1,
      titleColor:'#f1f5f9',bodyColor:'#d7e0e9',displayColors:false,padding:11,callbacks:{
        title:items=>items.length?(hasRealTimestamps?new Date(items[0].parsed.x).toLocaleString([], {year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}):'Timestamp unavailable · sample '+(items[0].dataIndex+1)):'',
        label:()=>'',afterBody:items=>{
          const r=pts[items[0]?.dataIndex];if(!r)return [];
          return ['Active  '+fx(r.kW,2)+' kW','Reactive '+fx(r.kVAR,2)+' kVAR','Apparent '+fx(r.kVA,2)+' kVA'];
        }
      }}},
    scales:{x:{type:'linear',min:x0===x1?x0-60000:x0,max:x0===x1?x1+60000:x1,grid:{color:'#252c33'},ticks:{color:'#b1bdc9',maxTicksLimit:8,maxRotation:0,callback:v=>hasRealTimestamps?axisTime(v):''}},
      y:{beginAtZero:true,grid:{color:c=>c.tick.value===0?'#7d8995':'#2b3239',lineWidth:c=>c.tick.value===0?1.4:1},ticks:{color:'#b1bdc9',maxTicksLimit:6},title:{display:true,text:'kW / kVAR / kVA',color:'#b1bdc9',font:{size:11}}}}};
  return html`<section id="power-chart" class=${card+' power-overview-card p-4 '+(fullWidth?'xl:col-span-12':'xl:col-span-8')} aria-label="Active, reactive and apparent power history">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div><div class="text-sm font-semibold text-slate-100">P / Q / S history</div><p class="mt-1 text-xs text-slate-300">${peakCaption} <span class="text-slate-400">· ${hasRealTimestamps?'selected window · shared timestamp cursor · zero baseline':'no timestamp column · sample positions only'}</span></p></div>
      <div class="flex flex-wrap gap-1.5" aria-label="Chart series visibility">
        ${series.map(s=>html`<button key=${s.k} type="button" aria-pressed=${!hidden[s.k]} title=${(hidden[s.k]?'Show ':'Hide ')+s.label} onClick=${()=>setHidden(prev=>({...prev,[s.k]:!prev[s.k]}))}
          class=${'power-legend-toggle '+(hidden[s.k]?'is-hidden':'')}><span class="power-legend-swatch" style=${{background:s.color}}></span>${s.label}</button>`)}
      </div>
    </div>
    ${series.length?html`<${Cv} datasets=${datasets} opts=${opts} plugins=${[crosshair,markerPlugin]} cls="h-[320px] mt-3"/>`:html`<div class="flex h-[320px] items-center justify-center text-sm text-slate-400">No P / Q / S samples are available in this range.</div>`}
    <div class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400"><span><span class="mr-1 inline-block h-2 w-2 rounded-full" style=${{background:C.cyan}}></span>S maximum marker</span><span><span class="mr-1 inline-block h-2 w-2 rounded-full" style=${{background:C.amber}}></span>Q minimum / maximum markers</span><span>Markers are calculated from all selected samples, not downsampled chart points.</span></div>
  </section>`;
}

function StatSparkline({rows,k,frequency=false}){
  const pts=ds(rows,90,[k]);
  const datasets=[{label:k,data:pts.map(r=>({x:r.t,y:Number.isFinite(r[k])?r[k]:null})),borderColor:'#8b9aaa',backgroundColor:'#8b9aaa16',fill:true,borderWidth:1.5,pointRadius:0,spanGaps:false,tension:.2}];
  if(frequency&&pts.length){
    datasets.push({label:'50 Hz reference',data:[{x:pts[0].t,y:50},{x:pts[pts.length-1].t,y:50}],borderColor:'#aab4bf',borderDash:[5,4],borderWidth:1,pointRadius:0,fill:false,spanGaps:true});
  }
  const t0=pts[0]?.t??0,t1=pts[pts.length-1]?.t??t0;
  const opts={responsive:true,maintainAspectRatio:false,animation:false,events:[],plugins:{legend:{display:false},tooltip:{enabled:false}},
    scales:{x:{type:'linear',display:false,min:t0===t1?t0-60000:t0,max:t0===t1?t1+60000:t1,grid:{display:false}},
      y:{display:false,min:frequency?49.5:undefined,max:frequency?50.5:undefined,grid:{display:false}}}};
  return html`<${Cv} datasets=${datasets} opts=${opts} cls="h-12 mt-2"/>`;
}

function StatCard({title,k,unit,color,rows,dp=2,frequency=false,className='',hasRealTimestamps=true}){
  const stats=timedStats(rows,k);
  if(!stats)return null;
  const inBand=frequency&&stats.min>=49.5&&stats.max<=50.5;
  return html`<article class=${card+' power-stat-card p-4 '+className}>
    <div class="flex items-center justify-between gap-2"><div class="text-xs font-semibold uppercase tracking-[.12em] text-slate-300"><${Term} label=${title}/></div><span class="power-accent-line" style=${{background:color}}></span></div>
    <div class="mt-3 flex items-baseline gap-2"><span class="text-[11px] font-semibold tracking-[.14em] text-slate-300">AVG</span><span class="text-[32px] font-semibold leading-none mono" style=${{color}}>${fx(stats.avg,dp)}</span><span class="text-sm text-slate-300">${unit}</span></div>
    ${frequency&&html`<div class=${'mt-2 text-[11px] '+(inBand?'text-emerald-300':'text-amber-300')}>${inBand?'Within ±0.5 Hz':'Outside ±0.5 Hz'} <span class="text-slate-400">· 50 Hz reference</span></div>`}
    <${StatSparkline} rows=${rows} k=${k} frequency=${frequency}/>
    <div class="mt-3 space-y-1.5 border-t border-[#30373d] pt-2.5 text-xs mono">
      <div class="flex flex-wrap items-start justify-between gap-x-2 gap-y-0.5"><span class="text-slate-300">Min</span><span class="text-right text-slate-100">${fx(stats.min,dp)} ${unit} <span class="text-slate-400">@ ${rowTime(stats.minRow.t,hasRealTimestamps)}</span></span></div>
      <div class="flex flex-wrap items-start justify-between gap-x-2 gap-y-0.5"><span class="text-slate-300">Max</span><span class="text-right text-slate-100">${fx(stats.max,dp)} ${unit} <span class="text-slate-400">@ ${rowTime(stats.maxRow.t,hasRealTimestamps)}</span></span></div>
    </div>
  </article>`;
}

function LagLeadBar({split}){
  if(!split.total)return html`<div class="mt-3 text-xs text-slate-400">Lag / lead direction unavailable in this window.</div>`;
  return html`<div class="mt-3">
    <div class="mb-1.5 flex items-center justify-between text-[11px] text-slate-300"><span>${split.lagPct}% lagging</span><span>${split.leadPct}% leading</span></div>
    <div class="flex h-2 overflow-hidden rounded-full bg-[#30373d]" role="img" aria-label=${split.lagPct+' percent lagging samples and '+split.leadPct+' percent leading samples'}>
      <span class="bg-amber-400" style=${{width:split.lagPct+'%'}}></span><span class="bg-cyan-400" style=${{width:split.leadPct+'%'}}></span>
    </div>
    <div class="mt-1 text-[10px] text-slate-400">Sample share · ${split.total.toLocaleString()} valid direction samples</div>
  </div>`;
}

function PfOverviewCard({rows,hasRealTimestamps=true}){
  const stats=timedStats(rows,'PF',true);
  const shown=useSweep(stats?Math.max(0,Math.min(1,stats.avg)):0);   // hook must run before the early return
  if(!stats)return null;
  const split=sampleLeadSplit(rows),dominant=!split.total?'N/A':split.lead===split.lag?'BALANCED':split.lead>split.lag?'LEAD':'LAG';
  const badgeClass=dominant==='LEAD'?'border-cyan-400/30 bg-cyan-400/10 text-cyan-200':dominant==='LAG'?'border-amber-400/30 bg-amber-400/10 text-amber-200':'border-[#46515c] bg-white/5 text-slate-300';
  const v=Math.max(0,Math.min(1,stats.avg)),col=v>=.95?C.green:v>=.9?C.amber:C.red;
  const latest=[...rows].reverse().find(r=>Number.isFinite(r.PF));
  const arc='M30 132A100 100 0 0 1 230 132';
  return html`<section class=${card+' power-pf-card p-4 xl:col-span-4'} aria-label="Power factor overview">
    <div class="flex items-start justify-between gap-2"><div><div class="text-xs font-semibold uppercase tracking-[.13em] text-slate-300">Power factor · |PF|</div><div class="mt-1 text-[11px] text-slate-400">AVG |PF| · selected window</div></div>
      <span class=${'rounded border px-2 py-1 text-[10px] font-semibold tracking-[.12em] '+badgeClass}>${dominant}</span></div>
    <svg viewBox="0 0 260 154" class="mx-auto mt-4 w-full max-w-[330px]" role="img" aria-label=${'Average absolute power factor '+fx(v,3)}>
      <path d=${arc} pathLength="1" fill="none" stroke="#30373d" stroke-width="19" stroke-linecap="round"/>
      <path d=${arc} pathLength="1" fill="none" stroke="#4ade80" stroke-opacity=".42" stroke-width="19" stroke-linecap="butt" stroke-dasharray="0.05 0.95" stroke-dashoffset="-0.95"/>
      <path d=${arc} pathLength="1" fill="none" stroke=${col} stroke-width="13" stroke-linecap="round" class="gauge-arc" stroke-dasharray=${shown+' 1'} style=${{filter:'drop-shadow(0 0 4px '+col+'66)'}}/>
      <text key=${fx(v,3)} class="gauge-value" x="130" y="112" text-anchor="middle" fill="#f8fafc" font-family="IBM Plex Mono, monospace" font-size="43" font-weight="600">${fx(v,3)}</text>
      <text x="28" y="151" text-anchor="middle" fill="#b3bfcb" font-size="11">0</text><text x="232" y="151" text-anchor="middle" fill="#b3bfcb" font-size="11">1.0</text>
      <text x="130" y="135" text-anchor="middle" fill="#9eabb8" font-size="9">GOOD BAND 0.95–1.00</text>
    </svg>
    <div class="mt-1 text-center text-[11px] text-slate-400">Latest ${latest?fx(Math.abs(latest.PF),3)+' @ '+rowTime(latest.t,hasRealTimestamps):'—'}</div>
    <${LagLeadBar} split=${split}/>
    <div class="mt-4 grid grid-cols-3 gap-2 border-t border-[#30373d] pt-3 text-center mono">
      <div><div class="text-[10px] uppercase tracking-wide text-slate-300">Min |PF|</div><div class="mt-1 text-base text-slate-100">${fx(stats.min,3)}</div><div class="mt-1 text-[10px] leading-tight text-slate-400">${rowTime(stats.minRow.t,hasRealTimestamps)}</div></div>
      <div><div class="text-[10px] uppercase tracking-wide text-slate-300">Max |PF|</div><div class="mt-1 text-base text-slate-100">${fx(stats.max,3)}</div><div class="mt-1 text-[10px] leading-tight text-slate-400">${rowTime(stats.maxRow.t,hasRealTimestamps)}</div></div>
      <div><div class="text-[10px] uppercase tracking-wide text-slate-300">Avg |PF|</div><div class="mt-1 text-base" style=${{color:col}}>${fx(stats.avg,3)}</div><div class="mt-1 text-[10px] leading-tight text-slate-400">Selected window</div></div>
    </div>
  </section>`;
}


function WindowTotalCard({title,value,unit,detail,color}){
  return html`<article class="power-window-total min-w-0 border-t border-[#3a424a] pt-3">
    <div class="text-[10px] font-semibold uppercase tracking-[.13em] text-slate-300"><${Term} label=${title}/></div>
    <div class="mt-1 flex flex-wrap items-baseline gap-1.5"><span class="text-2xl font-semibold mono" style=${{color:color||'#e2e8f0'}}>${value}</span><span class="text-xs text-slate-300">${unit}</span></div>
    ${detail&&html`<div class="mt-1 space-y-0.5 text-[11px] leading-snug text-slate-400 mono">${detail}</div>`}
  </article>`;
}

function PowerSkeleton(){
  return html`<div class="space-y-5" aria-label="Loading CSV analysis" aria-busy="true">
    <div class="grid grid-cols-1 gap-5 xl:grid-cols-12"><div class=${card+' h-[390px] animate-pulse xl:col-span-8'}></div><div class=${card+' h-[390px] animate-pulse xl:col-span-4'}></div></div>
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">${[1,2,3,4].map(x=>html`<div key=${x} class=${card+' h-52 animate-pulse'}></div>`)}</div>
  </div>`;
}

/* ---------- R / Y / B gauges & number cards ---------- */
const PH={R:'#ff6b6b',Y:'#facc15',B:'#4da3ff'};
const nice=m=>{
  if(!Number.isFinite(m)||m<=0)return 10;
  const p=Math.pow(10,Math.floor(Math.log10(m)));
  return ([1,1.5,2,2.5,3,4,5,6,8,10].find(x=>x*p>=m)||10)*p;
};
// Starts at 0, then moves to the real value on the next frame so the CSS transition sweeps the arc in.
const useSweep=v=>{
  const [shown,setShown]=useState(0);
  useEffect(()=>{const id=requestAnimationFrame(()=>setShown(v));return()=>cancelAnimationFrame(id)},[v]);
  return shown;
};

function Gauge({title,k,altKey,altTitle,unit,color,rows,all,dp=1}){
  const hasPrimary=all.some(r=>r[k]!=null&&Number.isFinite(r[k]));
  const useKey=hasPrimary||!altKey?k:altKey;
  const useTitle=hasPrimary||!altTitle?title:altTitle;
  const val=(rows[rows.length-1]||{})[useKey];
  let peak=1;
  for(let i=0;i<all.length;i++){
    const rv=all[i][useKey];
    if(rv!=null&&Number.isFinite(rv)&&rv>peak)peak=rv;
  }
  const mx=nice(peak*1.15);
  const v=Math.max(0,Math.min(1,(val||0)/mx));
  const shown=useSweep(v);
  const arc='M20 100A80 80 0 0 1 180 100';
  return html`<div class=${card+' p-4 flex flex-col'}>
    <div class="text-xs uppercase tracking-wide text-slate-400"><${Term} label=${useTitle}/></div>
    <svg viewBox="0 0 200 116" class="mx-auto mt-2 w-full max-w-[240px]">
      <path d=${arc} pathLength="1" fill="none" stroke="#2C3235" stroke-width="14" stroke-linecap="round"/>
      <path d=${arc} pathLength="1" fill="none" stroke=${color} stroke-width="14" stroke-linecap="round" class="gauge-arc" stroke-dasharray=${shown+' 1'} style=${{filter:'drop-shadow(0 0 5px '+color+'99)'}}/>
      <text key=${fx(val,dp)} class="gauge-value" x="100" y="84" text-anchor="middle" fill=${color} font-size="30" font-weight="700">${fx(val,dp)}</text>
      <text x="100" y="100" text-anchor="middle" fill="#8b9199" font-size="11">${unit}</text>
      <text x="20" y="114" text-anchor="middle" fill="#8b9199" font-size="10">0</text><text x="180" y="114" text-anchor="middle" fill="#8b9199" font-size="10">${mx}</text>
    </svg>
    <${Foot} rows=${rows} k=${useKey} dp=${dp}/>
  </div>`;
}

function LineNums({title,unit,items,rows,dp=1}){
  const last=rows[rows.length-1]||{};
  return html`<div class=${card+' p-4'}>
    <div class="text-xs uppercase tracking-wide text-slate-400"><${Term} label=${title}/></div>
    <div class="mt-3 grid grid-cols-3 gap-3 text-center">${items.map(([k,l,c])=>html`<div key=${k}>
      <div class="text-xs text-slate-500">${l}</div>
      <div class="mt-1 text-3xl font-bold mono sm:text-4xl" style=${{color:c}}>${fx(last[k],dp)}</div>
      <div class="text-xs text-slate-400">${unit}</div></div>`)}</div>
  </div>`;
}


/* ---------- App & Homepage ---------- */
const Y={IR:C.red,IY:C.amber,IB:C.cyan},D=[4,3];
const NAV=[['power','gauge','Power'],['graphs','chart','Power Trends'],['voltage','zap','Voltage'],['current','activity','Current']];
const EMB=(location.hash.match(/^#embed-(\w+)/)||[])[1];
const PV=[['power',540,'Power overview','Power factor gauge with live kW, kVAR, kVA and integrated kWh energy telemetry.'],
  ['graphs',460,'Power analysis','Active, reactive and apparent power breakdown, plus the 0.95 PF target threshold.'],
  ['voltage',1260,'Voltage and current by phase','R, Y, B gauges, line readings, phase unbalance (VUF/IUF) and neutral current.']];

function Preview({page,h,title,text}){
  const box=useRef(),[s,setS]=useState(.6);
  useEffect(()=>{
    const f=()=>{if(box.current&&box.current.clientWidth>0)setS(box.current.clientWidth/1280)};
    f();
    const ro=new ResizeObserver(f);
    if(box.current)ro.observe(box.current);
    return()=>ro.disconnect();
  },[]);
  const src=location.href.split('#')[0]+'#embed-'+page;
  return html`<figure class="mb-12">
    <div class="overflow-hidden rounded-xl border border-[#2C3235] bg-[#0d0e12] shadow-2xl shadow-black/50">
      <div class="flex items-center gap-1.5 border-b border-[#2C3235] px-3 py-2"><span class="h-2.5 w-2.5 rounded-full bg-[#ff6b6b]"></span><span class="h-2.5 w-2.5 rounded-full bg-[#facc15]"></span><span class="h-2.5 w-2.5 rounded-full bg-[#4ade80]"></span></div>
      <div ref=${box} class="relative w-full overflow-hidden" style=${{height:h*s}}>
        <iframe src=${src} title=${title} loading="lazy" tabindex="-1" scrolling="no" class="pointer-events-none absolute left-0 top-0 border-0" style=${{width:1280,height:h,transform:'scale('+s+')',transformOrigin:'0 0'}}></iframe>
      </div>
    </div>
    <figcaption class="mt-3 text-center"><div class="font-medium text-slate-100">${title}</div><div class="text-sm text-slate-500">${text}</div></figcaption>
  </figure>`;
}

function ImportSummary({report}){
  if(!report)return null;
  const statusText={imported:'Imported',estimated:'Estimated',missing:'Not available',empty:'Column found · no numeric data'};
  const statusClass={imported:'text-emerald-300',estimated:'text-amber-300',missing:'text-slate-500',empty:'text-rose-300'};
  const mappedCount=report.mappedFields.length;
  return html`<section class=${card+' import-summary p-4'}>
    <div class="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 class="text-sm font-semibold text-slate-100">CSV import check</h2>
        <p class="mt-1 text-xs text-slate-400">${mappedCount} recognized columns · ${report.ignoredFields.length} unrelated columns ignored · ${report.imported} imported signals · ${report.estimated} estimated signals</p>
      </div>
      <span class=${'rounded px-2 py-1 text-xs '+(report.missing===0?'bg-emerald-400/10 text-emerald-300':'bg-amber-400/10 text-amber-300')}>${report.missing===0?'Core signals available':'Some signals unavailable'}</span>
    </div>
    <div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:grid-cols-5">
      ${report.signals.map(x=>html`<div key=${x.key} class="flex min-w-0 items-center justify-between gap-2 border-b border-[#2C3235] py-1 text-xs">
        <span class="truncate text-slate-300">${x.label}</span><span class=${'shrink-0 '+statusClass[x.status]}>${statusText[x.status]}</span>
      </div>`)}
    </div>
    <p class="mt-3 text-[11px] text-slate-500">${report.hasTimestamp?'Valid timestamp column detected.':'No valid timestamp detected; evenly spaced fallback timestamps are assigned (energy integration disabled).'} Estimated values use the selected topology and balanced-system assumptions; they are not original meter measurements.</p>
    <details class="mt-3 border-t border-[#2C3235] pt-2 text-xs">
      <summary class="cursor-pointer select-none text-cyan-300">View header mapping and ignored columns</summary>
      <div class="mt-3 grid gap-3 md:grid-cols-2">
        <div>
          <div class="mb-1 font-semibold text-slate-300">Recognized headers</div>
          ${report.mappedFields.length?report.mappedFields.map(x=>html`<div key=${x.key} class="py-0.5 text-slate-400"><span class="text-slate-200">${x.header}</span> → ${x.key}${x.scale!==1?' · ×'+x.scale:''}</div>`):html`<span class="text-slate-500">None</span>`}
        </div>
        <div>
          <div class="mb-1 font-semibold text-slate-300">Other columns ignored</div>
          ${report.ignoredFields.length?html`<div class="flex flex-wrap gap-1.5">${report.ignoredFields.slice(0,30).map(x=>html`<span key=${x} class="rounded bg-white/5 px-2 py-1 text-slate-400">${x}</span>`)}</div>${report.ignoredFields.length>30&&html`<p class="mt-1 text-slate-500">and ${report.ignoredFields.length-30} more…</p>`}`:html`<span class="text-slate-500">No extra columns</span>`}
        </div>
      </div>
    </details>
  </section>`;
}

function FileSummaryDialog({s,onClose}){
  const ok=useRef();
  useEffect(()=>{
    if(!s)return;
    const prev=document.activeElement;
    if(ok.current)ok.current.focus();
    const key=e=>{if(e.key==='Escape')onClose()};
    document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('keydown',key);if(prev&&prev.focus)prev.focus()};
  },[s]);
  if(!s)return null;
  return html`<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick=${e=>{if(e.target===e.currentTarget)onClose()}}>
    <div role="dialog" aria-modal="true" aria-labelledby="file-summary-title" class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border border-[#3a424a] bg-[#181B1F] p-5 shadow-2xl">
      <h2 id="file-summary-title" class="text-base font-semibold text-slate-100">What this CSV contains</h2>
      <p class="mt-1 text-xs text-slate-400">${s.name}${s.span?' · '+s.span+' of data':''} · ${s.rowsUsed.toLocaleString()} usable rows</p>
      ${s.found.length?html`<p class="mt-4 text-sm text-slate-200">Only these quantities could be identified, so only they are shown:</p>
        <ul class="mt-2 space-y-1 text-sm">${s.found.map(([f,items])=>html`<li key=${f} class="flex gap-2"><span class="text-emerald-400" aria-hidden="true">✓</span><span><b class="text-slate-100">${f}</b> <span class="text-slate-400">· ${items.join(', ')}</span></span></li>`)}</ul>`:null}
      ${s.derived.length?html`<p class="mt-3 text-xs text-slate-400">Estimated from the above (balanced-system assumption, not measured): ${s.derived.map(([f,items])=>f+' ('+items.join(', ')+')').join('; ')}.</p>`:null}
      ${s.missing.length?html`<p class="mt-4 text-sm text-slate-200">Not found in this file:</p>
        <ul class="mt-2 space-y-1 text-sm text-slate-400">${s.missing.map(f=>html`<li key=${f} class="flex gap-2"><span class="text-amber-400" aria-hidden="true">–</span>${f}</li>`)}</ul>`:null}
      ${s.notes.length?html`<ul class="mt-4 space-y-1 border-t border-[#2C3235] pt-3 text-xs text-slate-400">${s.notes.map((n,i)=>html`<li key=${i}>• ${n}</li>`)}</ul>`:null}
      <div class="mt-5 text-right"><button ref=${ok} type="button" onClick=${onClose} class="rounded border border-cyan-400/60 bg-cyan-400/10 px-4 py-1.5 text-sm text-cyan-200 hover:bg-cyan-400/20">OK</button></div>
    </div>
  </div>`;
}

/* ---------- Cursor tracking (ref-based: no React re-renders while the pointer moves) ---------- */
const useMousePositionRef=containerRef=>{
  const positionRef=useRef({x:0,y:0});
  useEffect(()=>{
    const update=(x,y)=>{
      const el=containerRef&&containerRef.current;
      if(el){const r=el.getBoundingClientRect();positionRef.current={x:x-r.left,y:y-r.top}}
      else positionRef.current={x,y};
    };
    const onMove=e=>update(e.clientX,e.clientY);
    const onTouch=e=>{const t=e.touches[0];if(t)update(t.clientX,t.clientY)};
    window.addEventListener('mousemove',onMove,{passive:true});
    window.addEventListener('touchmove',onTouch,{passive:true});
    return()=>{window.removeEventListener('mousemove',onMove);window.removeEventListener('touchmove',onTouch)};
  },[containerRef]);
  return positionRef;
};

/* Soft cyan spotlight that eases toward the pointer on the home page. The loop sleeps once it has caught up,
   pauses while the tab is hidden, and is skipped entirely under prefers-reduced-motion. */
function CursorGlow(){
  const layer=useRef(),pos=useMousePositionRef();
  useEffect(()=>{
    const el=layer.current;
    if(!el||(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches))return;
    let raf=null,x=0,y=0,seen=false,on=!document.hidden;
    const frame=()=>{
      raf=null;const p=pos.current;
      if(!seen&&(p.x||p.y)){seen=true;x=p.x;y=p.y;el.style.opacity='1'}
      if(!seen)return;
      x+=(p.x-x)*.14;y+=(p.y-y)*.14;
      el.style.setProperty('--mx',x.toFixed(1)+'px');el.style.setProperty('--my',y.toFixed(1)+'px');
      if(on&&(Math.abs(p.x-x)>.3||Math.abs(p.y-y)>.3))raf=requestAnimationFrame(frame);
    };
    const wake=()=>{if(on&&raf==null)raf=requestAnimationFrame(frame)};
    const vis=()=>{on=!document.hidden;wake()};
    window.addEventListener('mousemove',wake,{passive:true});
    window.addEventListener('touchmove',wake,{passive:true});
    document.addEventListener('visibilitychange',vis);
    return()=>{
      window.removeEventListener('mousemove',wake);window.removeEventListener('touchmove',wake);
      document.removeEventListener('visibilitychange',vis);
      if(raf!=null)cancelAnimationFrame(raf);
    };
  },[]);
  return html`<div ref=${layer} aria-hidden="true" class="cursor-glow"></div>`;
}

/* ---------- Parameter definitions (hover / focus / tap) ---------- */
const DEFS=[
  [/current unbalance|\biuf\b/,'How unevenly the three phases are loaded (biggest gap from the average current). Some is normal; a large value means one phase is overworked.'],
  [/unbalance factor|\bvuf\b/,'How uneven the three voltages are (biggest gap from their average). 0% is perfect; a few percent already makes motors run hot.'],
  [/winding/,'Voltage across one winding of a Delta connection. In Delta it is the same as the line voltage.'],
  [/neutral/,'Return current in the neutral wire. Near zero when the phases are evenly loaded; a high value points to uneven loads.'],
  [/line-to-line|line voltage/,'Voltage measured between two phases, such as R–Y. Roughly 400–415 V on a normal three-phase supply.'],
  [/phase voltage/,'Voltage from one phase to neutral, like at a wall socket. Roughly 230–240 V on a normal supply.'],
  [/current/,'How much current each phase is carrying, in amperes. Higher means a heavier load.'],
  [/energy-weighted pf/,'Power factor of everything used over the whole period, not just one moment.'],
  [/power factor|\bpf\b/,'Share of the supplied power that does useful work (kW ÷ kVA). 1.0 is perfect; lower wastes capacity. Negative means leading.'],
  [/\bactive energy/,'Useful energy actually used, in kWh, which is what a bill mostly counts. Import is drawn from the supply; export goes back.'],
  [/reactive energy/,'Energy that sloshes back and forth to magnetise motors and transformers instead of doing work, in kVArh.'],
  [/apparent energy/,'Total energy the supply delivered, useful plus reactive, in kVAh.'],
  [/peak active/,'The highest kW reached in this period, and when. Billing and sizing are often based on it.'],
  [/peak reactive/,'The biggest reactive load (kVAR) in this period, and when.'],
  [/peak apparent/,'The most total load (kVA) the supply had to carry, and when. Equipment is sized for this.'],
  [/\bactive power/,'The power doing real work: running motors, lights, heaters. Measured in kW.'],
  [/reactive power/,'Power used to magnetise motors and transformers. It does no work but still loads the supply. Positive is inductive, negative is capacitive.'],
  [/apparent power/,'Total load on the supply: the working part and the reactive part combined, in kVA.'],
  [/frequency/,'How many times per second the AC supply cycles. It should stay close to 50 Hz.']
];
const defFor=title=>{const t=String(title||'').toLowerCase();const d=DEFS.find(x=>x[0].test(t));return d?d[1]:null};
function Term({label}){
  const d=defFor(label);
  return d?html`<span class="term" tabIndex="0" data-def=${d}>${label}</span>`:label;
}
function DefTip(){
  // The tooltip lives directly on <body> so animated or clipped ancestors can never shift or hide it.
  useEffect(()=>{
    const el=document.createElement('div');
    el.id='term-tip';el.setAttribute('role','tooltip');document.body.appendChild(el);
    let cur=null;
    const show=t=>{
      cur=t;el.textContent=t.getAttribute('data-def');el.classList.add('on');
      const r=t.getBoundingClientRect(),w=el.offsetWidth,h=el.offsetHeight;
      const x=Math.min(Math.max(8,r.left+r.width/2-w/2),Math.max(8,window.innerWidth-w-8));
      const y=r.top-h-8>=8?r.top-h-8:r.bottom+8;   // always above the term; below only when there is no room
      el.style.left=x+'px';el.style.top=y+'px';t.setAttribute('aria-describedby','term-tip');
    };
    const hide=()=>{if(cur)cur.removeAttribute('aria-describedby');cur=null;el.classList.remove('on')};
    const find=e=>e.target&&e.target.closest?e.target.closest('[data-def]'):null;
    const over=e=>{const t=find(e);if(t&&t!==cur)show(t)};
    const out=e=>{const t=find(e);if(t&&(!e.relatedTarget||!t.contains(e.relatedTarget)))hide()};
    const key=e=>{if(e.key==='Escape')hide()};
    document.addEventListener('mouseover',over);document.addEventListener('mouseout',out);
    document.addEventListener('focusin',over);document.addEventListener('focusout',out);
    document.addEventListener('keydown',key);window.addEventListener('scroll',hide,{passive:true,capture:true});
    return()=>{
      document.removeEventListener('mouseover',over);document.removeEventListener('mouseout',out);
      document.removeEventListener('focusin',over);document.removeEventListener('focusout',out);
      document.removeEventListener('keydown',key);window.removeEventListener('scroll',hide,true);
      el.remove();
    };
  },[]);
  return null;
}

/* ---------- Value at an exact date & time ---------- */
const LOOKUP_FIELDS=[['VR','V_R (phase voltage)','V',1],['VY','V_Y (phase voltage)','V',1],['VB','V_B (phase voltage)','V',1],
  ['VRY','V_RY (line voltage)','V',1],['VYB','V_YB (line voltage)','V',1],['VBR','V_BR (line voltage)','V',1],
  ['IR','I_R (line current)','A',1],['IY','I_Y (line current)','A',1],['IB','I_B (line current)','A',1],['IN','I_N (neutral current)','A',1],
  ['kW','Active power','kW',2],['kVAR','Reactive power','kVAR',2],['kVA','Apparent power','kVA',2],['PF','Power factor','',3],['Hz','Frequency','Hz',2]];
const nearestRowIndex=(rows,t)=>{
  let lo=0,hi=rows.length-1;
  while(lo<hi){const mid=(lo+hi)>>1;if(rows[mid].t<t)lo=mid+1;else hi=mid}
  if(lo>0&&Math.abs(rows[lo-1].t-t)<=Math.abs(rows[lo].t-t))lo--;
  return lo;
};
const fmtSec=t=>new Date(t).toLocaleString([], {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
const toLocalInput=t=>{const d=new Date(t),p=n=>String(n).padStart(2,'0');return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds())};
function TimeLookup({rows}){
  const [val,setVal]=useState('');
  const first=rows[0].t,last=rows[rows.length-1].t;
  const hit=useMemo(()=>{const t=val?new Date(val).getTime():NaN;return Number.isFinite(t)?{i:nearestRowIndex(rows,t),t}:null},[val,rows]);
  const r=hit?rows[hit.i]:null,outside=hit&&(hit.t<first||hit.t>last);
  const items=r?LOOKUP_FIELDS.filter(f=>Number.isFinite(r[f[0]])):[];
  return html`<section class="rounded border border-[#2C3235] bg-[#181B1F] p-3" aria-label="Find values at a date and time">
    <div class="flex flex-wrap items-center gap-3">
      <label htmlFor="time-lookup" class="text-sm font-medium text-slate-200">Find a date and time</label>
      <input id="time-lookup" type="datetime-local" step="1" min=${toLocalInput(first)} max=${toLocalInput(last)} value=${val} onChange=${e=>setVal(e.target.value)}
        class="rounded border border-[#3a424a] bg-[#111217] px-2 py-1 text-sm text-slate-100"/>
      ${val&&html`<button type="button" onClick=${()=>setVal('')} class="rounded border border-[#3a424a] px-2 py-1 text-xs text-slate-300 hover:bg-white/5">Clear</button>`}
      <span class="text-xs text-slate-500">Data covers ${fmtSec(first)} to ${fmtSec(last)}</span>
    </div>
    ${r&&html`<div class="mt-3 border-t border-[#2C3235] pt-3" aria-live="polite">
      <p class="text-sm text-slate-200">Reading at <b class="mono">${fmtSec(r.t)}</b>${outside?html` <span class="text-amber-300">· your time is outside the data, so this is the closest reading</span>`:Math.abs(r.t-hit.t)>=1000?html` <span class="text-slate-400">· closest reading to your time</span>`:null}</p>
      <dl class="mt-2 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3 lg:grid-cols-5">${items.map(f=>html`<div key=${f[0]}><dt class="text-[11px] text-slate-400"><${Term} label=${f[1]}/></dt><dd class="mono text-base text-slate-100">${fx(r[f[0]],f[3])}<span class="ml-1 text-xs text-slate-400">${f[2]}</span></dd></div>`)}</dl>
    </div>`}
  </section>`;
}

function Home({fileRef,onFile,handle,onSample,toast}){
  const [drag,setDrag]=useState(false);
  const go=()=>{const el=document.getElementById('preview');if(el)el.scrollIntoView({behavior:'smooth'})};
  return html`<div class="min-h-screen text-slate-200" style=${{background:'radial-gradient(900px 420px at 50% -80px, rgba(34,211,238,.13), transparent), #111217'}}>
    <${CursorGlow}/>
    <header class="relative z-10 flex items-center gap-2.5 px-6 py-4">
      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-[#111217]"><${Icon} n="zap" s=${18}/></div>
      <span class="text-lg font-semibold text-slate-100">Dashboard</span>
    </header>
    <main class="relative z-10 mx-auto max-w-5xl px-4">
      <section class="mx-auto max-w-3xl pb-10 pt-10 text-center">
        <h1 class="text-4xl font-bold leading-tight text-slate-50 sm:text-5xl">Turn your logger CSV into a <span class="text-cyan-300">live power dashboard</span></h1>
        <p class="mx-auto mt-4 max-w-xl text-slate-400">Upload a CSV from your electrical data logger. Voltage, current, power, unbalance and power factor are detected automatically and plotted instantly.</p>
        <div onDragOver=${e=>{e.preventDefault();setDrag(true)}} onDragLeave=${()=>setDrag(false)} onDrop=${e=>{e.preventDefault();setDrag(false);handle(e.dataTransfer.files[0])}}
          class=${'upload-zone mt-8 rounded-xl border-2 border-dashed p-8 transition sm:p-12 '+(drag?'is-drag border-cyan-400 bg-cyan-400/10':'border-[#2C3235] bg-[#181B1F]')}>
          <div class="upload-grid" aria-hidden="true"></div>
          <div class="upload-file-wrap">
            <span class="upload-ghost" aria-hidden="true"></span>
            <button type="button" class="upload-file" aria-label="Choose a CSV file" onClick=${()=>fileRef.current.click()}>${drag?html`<span class="text-sm font-medium">Drop it</span>`:html`<${Icon} n="upload" s=${28}/>`}</button>
          </div>
          <p class="mt-4 font-medium text-slate-100">Drag and drop your CSV file here</p>
          <p class="mt-1 text-sm text-slate-500">or</p>
          <button onClick=${()=>fileRef.current.click()} class="mt-3 inline-flex items-center gap-2 rounded border border-cyan-400/60 bg-cyan-400/10 px-5 py-2 font-medium text-cyan-300 transition hover:bg-cyan-400/20"><${Icon} n="upload"/>Upload CSV</button>
          <p class="mt-5 text-sm text-slate-500">No file handy? <button onClick=${onSample} class="text-cyan-300 underline underline-offset-4 hover:text-cyan-200">Try it with sample data</button></p>
          <input ref=${fileRef} type="file" accept=".csv,text/csv" class="hidden" onChange=${onFile}/>
        </div>
        <p class="mt-3 text-xs text-slate-600">Common meter headers are supported (for example U12, Voltage L1-L2, I1, Active Power (W), Q total and cos phi). Extra columns are ignored. Your file is processed locally in your browser and never uploaded.</p>
        <button onClick=${go} class="mx-auto mt-10 flex flex-col items-center gap-1 text-sm text-slate-400 hover:text-slate-200">See how it looks<span class="animate-bounce">↓</span></button>
      </section>
      <section id="preview" class="pt-8">
        <h2 class="mb-8 text-center text-2xl font-semibold text-slate-100">Here’s what you’ll get</h2>
        ${PV.map(([pg,h,t,x])=>html`<${Preview} key=${pg} page=${pg} h=${h} title=${t} text=${x}/>`)}
      </section>
    </main>
    ${toast&&html`<div class="fixed right-4 top-4 z-30 rounded border border-[#2C3235] bg-[#181B1F] px-4 py-2 text-sm shadow-lg">${toast}</div>`}
  </div>`;
}

function App(){
  const [all,setAll]=useState(()=>sample());
  const [info,setInfo]=useState({name:'sample-data.csv',mapped:null,report:null});
  const [win,setWin]=useState([0,100000]);
  const [preset,setPreset]=useState('all');
  const [topology,setTopology]=useState('wye4');
  const [assumeBalanced,setAssumeBalanced]=useState(true);
  const [toast,setToast]=useState('');
  const [isParsing,setIsParsing]=useState(false);
  const [summary,setSummary]=useState(null);
  const [page,setPage]=useState(EMB||'power');
  const [view,setView]=useState(EMB?'dash':'home');
  const file=useRef(),toastTimer=useRef();

  const note=m=>{
    if(toastTimer.current)clearTimeout(toastTimer.current);
    setToast(m);
    toastTimer.current=setTimeout(()=>setToast(''),4500);
  };
  useEffect(()=>()=>toastTimer.current&&clearTimeout(toastTimer.current),[]);

  const load=(rows,name,mapped,report=null)=>{setIsParsing(false);setView('dash');setAll(rows);setInfo({name,mapped,report});setWin([0,100000]);setPreset('all')};
  const handle=f=>{
    if(!f)return;
    if(!/\.csv$/i.test(f.name))return note('Please choose a .CSV file');
    setIsParsing(true);setView('dash');setPage('power');setSummary(null);
    const readText=f.text?f.text():new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(r.result);r.onerror=no;r.readAsText(f)});
    readText.then(text=>{
    const fixed=repairCsvText(text);
    Papa.parse(fixed.text,{header:true,dynamicTyping:true,skipEmptyLines:'greedy',worker:true,delimiter:fixed.delimiter||'',
      complete:res=>{
        setIsParsing(false);
        if(res.errors&&res.errors.some(e=>e.code==='UndetectableDelimiter'))return note('Could not detect the CSV delimiter. Save the file as comma-separated CSV and try again.');
        const o=normalize(res.data,res.meta.fields||[],{topology,assumeBalanced,fileName:f.name});
        if(!o.rows.length)return note('No valid data rows found in '+f.name);
        if(!o.recognizedElectrical)return note('CSV parsed, but no supported electrical columns were recognized. Check the header names or include voltage, current, power or PF columns.');
        const report=makeImportReport(o);
        load(o.rows,f.name,o.mapped,report);
        const av=availability(o.rows);
        setPage(['power','voltage','current','graphs'].find(p=>av.pages[p])||'power');
        const sum=summarizeImport(o,{name:f.name,repaired:fixed.repaired});
        if(sum.show)setSummary(sum);
        const issueCount=(res.errors||[]).length;
        note('Loaded '+o.rows.length.toLocaleString()+' rows · '+o.mappedFields.length+' recognized columns · '+o.ignoredFields.length+' other columns ignored'+(issueCount?' · '+issueCount+' CSV warnings':''));
      },
      error:()=>{setIsParsing(false);note('Failed to parse CSV')}});
    }).catch(()=>{setIsParsing(false);note('Could not read the file')});
  };
  const onFile=e=>{handle(e.target.files[0]);e.target.value=''};
  const pickPreset=v=>{
    setPreset(v);
    if(v==='all'||!all.length)return setWin([0,100000]);
    const end=all[all.length-1].t;
    let i=all.findIndex(r=>r.t>=end-(+v)*36e5);
    if(i<0)i=0;
    setWin([Math.round(i/all.length*100000),100000]);
  };

  const n=all.length;
  const i0=n<=1?0:Math.max(0,Math.min(Math.floor(win[0]/100000*n),n-2));
  const i1=n<=1?n:Math.max(i0+1,Math.min(n,Math.ceil(win[1]/100000*n)));
  const rows=useMemo(()=>all.slice(i0,i1),[all,i0,i1]);
  const hasRealTimestamps=!info.report||info.report.hasTimestamp;
  const rangeStartLabel=hasRealTimestamps?fmtDT(rows[0]&&rows[0].t):'Sample '+(i0+1);
  const rangeEndLabel=hasRealTimestamps?fmtDT(rows[rows.length-1]&&rows[rows.length-1].t):'Sample '+i1;
  const windowTotals=useMemo(()=>calcPowerWindowTotals(rows,!info.report||info.report.hasTimestamp),[rows,info.report]);

  const avail=useMemo(()=>availability(all),[all]);
  const powerStatItems=[
    ...(hasValue(rows,'kW')?[{title:'Active power',k:'kW',unit:'kW',color:C.green,dp:2}]:[]),
    ...(hasValue(rows,'kVAR')?[{title:'Reactive power',k:'kVAR',unit:'kVAR',color:C.amber,dp:2}]:[]),
    ...(hasValue(rows,'kVA')?[{title:'Apparent power',k:'kVA',unit:'kVA',color:C.cyan,dp:2}]:[]),
    ...(hasValue(rows,'Hz')?[{title:'System frequency',k:'Hz',unit:'Hz',color:C.violet,dp:2,frequency:true}]:[])
  ];
  const slide=(idx,v)=>{
    const w=[...win];
    w[idx]=+v;
    if(w[0]>w[1]-1)w[idx?1:0]=idx?Math.min(100000,w[0]+1):Math.max(0,w[1]-1);
    setWin(w);
    setPreset('custom');
  };
  const DL=topology==='delta';
  const btn='flex items-center gap-2 rounded border px-3 py-1.5 text-sm font-medium transition';

  if(view==='home')return html`<${Home} fileRef=${file} onFile=${onFile} handle=${handle} onSample=${()=>load(sample(),'sample-data.csv',null)} toast=${toast}/>`;
  return html`<div class="min-h-screen text-slate-200" style=${{background:'radial-gradient(900px 420px at 50% -80px, rgba(34,211,238,.08), transparent), #111217',minHeight:'100vh'}}>
    ${!EMB&&html`<nav class="fixed inset-y-0 left-0 z-30 flex w-12 flex-col items-center gap-1 border-r border-[#2C3235] bg-[#0d0e12] pb-3 sm:w-14" style=${{paddingTop:'calc(env(safe-area-inset-top,0px) + 12px)'}}>
      <button title="Home" aria-label="Home" onClick=${()=>setView('home')} class="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-[#111217] transition hover:scale-105"><${Icon} n="zap" s=${18}/></button>
      ${NAV.filter(([id])=>avail.pages[id]).map(([id,ic,label])=>html`<button key=${id} title=${label} aria-label=${label} onClick=${()=>setPage(id)} aria-current=${page===id?'page':undefined} class=${'group relative flex h-10 w-10 items-center justify-center rounded transition '+(page===id?'bg-white/10 text-cyan-300':'text-slate-400 hover:bg-white/5 hover:text-slate-100')}>
        ${page===id&&html`<span class="absolute -left-1 top-1.5 h-7 w-0.5 rounded bg-cyan-400 sm:-left-2"></span>`}
        <${Icon} n=${ic} s=${20}/>
        <span class="pointer-events-none absolute left-full z-40 ml-2 hidden whitespace-nowrap rounded border border-[#2C3235] bg-[#181B1F] px-2 py-1 text-xs text-slate-200 group-hover:block group-focus-visible:block">${label}</span></button>`)}
    </nav>`}
    <div class=${EMB?'':'pl-12 sm:pl-14'}>
    ${!EMB&&html`<header class="sticky z-20 border-b border-[#2C3235] bg-[#181B1F]/95 backdrop-blur" style=${{top:'env(safe-area-inset-top,0px)'}}>
      <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <div class="flex min-w-0 flex-wrap items-center gap-3">
          <span class="text-lg font-semibold text-slate-100">Dashboard</span>
          <span class="max-w-[46vw] truncate rounded bg-white/5 px-2.5 py-1 text-xs text-slate-300" title=${info.name}>${info.name} · ${n.toLocaleString()} rows${info.mapped?' · '+info.mapped.length+' mapped':''}</span>
          <label class="flex items-center gap-2 text-sm text-slate-300"><${Icon} n="clock"/>
            <select aria-label="Select historical time range" value=${preset} onChange=${e=>pickPreset(e.target.value)} class="rounded border border-[#2C3235] bg-[#111217] px-2.5 py-1.5 text-sm text-slate-100 outline-none focus:border-cyan-400">
              <option value="all">Entire range</option><option value="1">Last 1 hour</option><option value="3">Last 3 hours</option><option value="6">Last 6 hours</option><option value="12">Last 12 hours</option>
              ${preset==='custom'&&html`<option value="custom">Custom window</option>`}</select></label>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <details class="power-settings relative">
            <summary class="flex cursor-pointer list-none items-center gap-1.5 rounded border border-[#2C3235] px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-cyan-400"><span aria-hidden="true">⚙</span> Settings <span class="text-[10px]">▾</span></summary>
            <div class="absolute right-0 top-full z-40 mt-2 w-64 space-y-3 rounded-lg border border-[#3a424a] bg-[#181B1F] p-3 shadow-2xl">
              <label class="block text-xs text-slate-300">Electrical topology
                <select value=${topology} onChange=${e=>{const v=e.target.value;const next=all.map(r=>derive(r,{topology:v,assumeBalanced}));setTopology(v);setAll(next);setInfo(prev=>({...prev,report:refreshImportReport(prev.report,next)}))}} class="mt-1 w-full rounded border border-[#3a424a] bg-[#111217] px-2 py-1.5 text-sm text-slate-100">
                  <option value="wye4">Wye · 4-wire</option><option value="delta">Delta · balanced</option>
                </select>
              </label>
              <label class="flex items-center gap-2 text-xs leading-relaxed text-slate-300">
                <input type="checkbox" checked=${assumeBalanced} onChange=${e=>{const v=e.target.checked;const next=all.map(r=>derive(r,{topology,assumeBalanced:v}));setAssumeBalanced(v);setAll(next);setInfo(prev=>({...prev,report:refreshImportReport(prev.report,next)}))}}/>
                Estimate missing balanced-system voltage signals
              </label>
            </div>
          </details>
          <button onClick=${()=>load(sample(),'sample-data.csv',null)} class=${btn+' border-[#2C3235] bg-transparent text-slate-300 hover:bg-white/5'}><${Icon} n="db"/>Load Sample Data</button>
          <button onClick=${()=>file.current.click()} class=${btn+' border-cyan-400/60 bg-cyan-400/10 text-cyan-200 hover:bg-cyan-400/20'}><${Icon} n="upload"/>Upload CSV</button>
          <input ref=${file} type="file" accept=".csv,text/csv" class="hidden" onChange=${onFile}/>
        </div>
      </div>
      <div class="time-range-controls flex items-center gap-3 border-t border-[#2C3235] px-4 py-2 text-[11px] text-slate-300 mono">
        <span class="w-36 shrink-0">${rangeStartLabel}</span>
        <input type="range" min="0" max="100000" step="1" value=${win[0]} onInput=${e=>slide(0,e.target.value)} class="min-w-0 flex-1" aria-label="Window start time" aria-valuetext=${rangeStartLabel}/>
        <input type="range" min="0" max="100000" step="1" value=${win[1]} onInput=${e=>slide(1,e.target.value)} class="min-w-0 flex-1" aria-label="Window end time" aria-valuetext=${rangeEndLabel}/>
        <span class="w-36 shrink-0 text-right">${rangeEndLabel}</span>
      </div>
    </header>`}
    ${toast&&html`<div class="fixed right-4 z-30 rounded border border-[#2C3235] bg-[#181B1F] px-4 py-2 text-sm shadow-lg" style=${{top:'calc(env(safe-area-inset-top,0px) + 96px)'}}>${toast}</div>`}

    <main class="dashboard-main mx-auto max-w-[1600px] space-y-4 p-4">
      ${!EMB&&!isParsing&&hasRealTimestamps&&all.length>1&&html`<${TimeLookup} rows=${all}/>`}
      ${!isParsing&&all.length>0&&!avail.pages[page]&&html`<div class="rounded border border-[#2C3235] bg-[#181B1F] p-6 text-sm text-slate-300">This CSV contains no data for this page. Choose another page from the sidebar.</div>`}
      ${page==='power'&&avail.pages.power&&html`${isParsing?html`<${PowerSkeleton}/>`:html`<div class="space-y-6">
        <section class="space-y-3">
          <${SectionHeading} title="Power" sub="Historical analysis · selected file window"/>
          <div class="grid grid-cols-1 gap-5 xl:grid-cols-12">
            ${avail.pq&&html`<${PowerChart} rows=${rows} fullWidth=${!hasValue(rows,'PF')} hasRealTimestamps=${hasRealTimestamps}/>`}
            ${hasValue(rows,'PF')&&(avail.pq?html`<${PfOverviewCard} rows=${rows} hasRealTimestamps=${hasRealTimestamps}/>`:html`<div class="xl:col-span-12"><${PfOverviewCard} rows=${rows} hasRealTimestamps=${hasRealTimestamps}/></div>`)}
            ${!avail.pq&&html`<p class="rounded border border-amber-400/30 bg-amber-400/5 px-3 py-2 text-xs text-amber-200 xl:col-span-12">Active, reactive and apparent power are not in this CSV, so only the quantities it contains are shown.</p>`}
          </div>
        </section>

        <section class="space-y-3">
          <${SectionHeading} title="Summary statistics" sub="Average, minimum and maximum across the selected range"/>
          <div class="power-stats-grid" style=${{'--stat-count':Math.max(1,powerStatItems.length)}}>
            ${powerStatItems.map((item,i)=>html`<${StatCard} key=${item.k} title=${item.title} k=${item.k} unit=${item.unit} color=${item.color} rows=${rows} dp=${item.dp} frequency=${!!item.frequency} className=${powerStatItems.length===3&&i===2?'power-stat-last':''} hasRealTimestamps=${hasRealTimestamps}/>`)}
          </div>
          ${!powerStatItems.length&&html`<p class="text-sm text-slate-400">No summary quantities are available in the selected window.</p>`}
        </section>

        ${avail.pq&&html`<section class="space-y-3">
          <${SectionHeading} title="Window totals" sub="Cumulative values integrated over this selected window"/>
          <div class="grid grid-cols-1 gap-x-6 gap-y-4 border-t border-[#30373d] pt-4 sm:grid-cols-2 xl:grid-cols-4">
            <${WindowTotalCard} title="Net active energy" value=${fx(windowTotals.netKWh,2)} unit="kWh" color=${C.green}
              detail=${[('Import '+fx(windowTotals.importKWh,2)+' kWh'),('Export '+fx(windowTotals.exportKWh,2)+' kWh')]}/>
            <${WindowTotalCard} title="Net reactive energy" value=${fx(windowTotals.netKVArh,2)} unit="kVArh" color=${C.amber}
              detail=${[('Inductive '+fx(windowTotals.inductiveKVArh,2)+' kVArh'),('Capacitive '+fx(windowTotals.capacitiveKVArh,2)+' kVArh')]}/>
            <${WindowTotalCard} title="Apparent energy" value=${fx(windowTotals.kVAh,2)} unit="kVAh" color=${C.cyan}
              detail=${['Total energy including the reactive part']}/>
            <${WindowTotalCard} title="Energy-weighted PF" value=${fx(windowTotals.energyPF,3)} unit="|PF|" color=${'#e2e8f0'}
              detail=${['|Net kWh| ÷ kVAh']}/>
            ${windowTotals.peakKW!=null&&html`<${WindowTotalCard} title="Peak active demand" value=${fx(windowTotals.peakKW,2)} unit="kW" color=${C.green}
              detail=${[rowTime(windowTotals.peakKWTime,hasRealTimestamps)]}/>`}
            ${windowTotals.peakKVAR!=null&&html`<${WindowTotalCard} title="Peak reactive demand" value=${fx(windowTotals.peakKVAR,2)} unit="kVAR" color=${C.amber}
              detail=${[rowTime(windowTotals.peakKVARTime,hasRealTimestamps)]}/>`}
            <${WindowTotalCard} title="Peak apparent demand" value=${fx(windowTotals.peakKVA,2)} unit="kVA" color=${C.cyan}
              detail=${[windowTotals.peakTime==null?'Timestamp unavailable':rowTime(windowTotals.peakTime,hasRealTimestamps)]}/>
          </div>
          <p class="text-[11px] leading-relaxed text-slate-400">Energy is trapezoidally integrated from adjacent valid samples. Positive kW is treated as import and negative kW as export; positive kVAR is inductive and negative kVAR is capacitive. Large timestamp gaps are excluded. These are estimates from instantaneous channels, not meter billing registers.</p>
        </section>`}
      </div>`}`}
      ${page==='graphs'&&avail.pages.graphs&&html`<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <${Panel} title="Power Breakdown" sub="Active vs reactive vs apparent · gap between kVA and kW shows reactive demand" unit="kW / kVAR / kVA" h="h-80" rows=${rows} dp=${2} series=${[
          {k:'kVA',label:'Apparent (kVA)',c:C.cyan,dash:D},{k:'kW',label:'Active (kW)',c:C.green,fill:true},{k:'kVAR',label:'Reactive (kVAR)',c:C.amber,fill:true}]}/>
        <${Panel} title="Power Factor Trend" sub="Unsigned displacement |PF| avoids artificial zero-crossings at unity; toggle Signed PF for ± polarity" unit="PF" dp=${3} h="h-80" yMin=${-1} yMax=${1} refLine=${0.95} rows=${rows} series=${[
          {k:'PFmag',label:'|PF| Magnitude',c:C.green,step:true},{k:'PF',label:'Signed PF (±)',c:C.cyan,dash:D,step:true}]}/>
      </div>`}
      ${page==='voltage'&&avail.pages.voltage&&html`<div class="space-y-4">
        <p class="text-xs text-slate-500">VUF shown here is the maximum voltage magnitude deviation from the three-phase average (NEMA MG1-style proxy), not IEC 61000-4-30 negative-sequence VUF. Missing Wye LL/LN magnitudes use the balanced √3 relationship; in Delta, winding phase voltage equals line voltage.</p>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
          <${Gauge} title=${DL?"R-Y Winding Voltage (V_RY)":"R Phase Voltage (V_RN)"} k=${DL?"VRY":"VR"} altKey=${DL?undefined:"VRY"} altTitle="R-Y Line Voltage (V_RY)" unit="V" color=${PH.R} rows=${rows} all=${all}/>
          <${Gauge} title=${DL?"Y-B Winding Voltage (V_YB)":"Y Phase Voltage (V_YN)"} k=${DL?"VYB":"VY"} altKey=${DL?undefined:"VYB"} altTitle="Y-B Line Voltage (V_YB)" unit="V" color=${PH.Y} rows=${rows} all=${all}/>
          <${Gauge} title=${DL?"B-R Winding Voltage (V_BR)":"B Phase Voltage (V_BN)"} k=${DL?"VBR":"VB"} altKey=${DL?undefined:"VBR"} altTitle="B-R Line Voltage (V_BR)" unit="V" color=${PH.B} rows=${rows} all=${all}/>
        </div>
        <${LineNums} title="Line-to-Line Voltage" unit="V" rows=${rows} items=${[['VRY','V_RY',PH.R],['VYB','V_YB',PH.Y],['VBR','V_BR',PH.B]]}/>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <${Kpi} title="Avg Line Voltage" k="Vavg" unit="V" color=${C.blue} rows=${rows}/>
          <${Kpi} title="Avg Phase Voltage" k="Vph" unit="V" color=${C.violet} rows=${rows}/>
          <${Kpi} title="Voltage Unbalance Factor (VUF)" k="VUF" unit="%" color=${C.amber} rows=${rows} dp=${2}/>
        </div>
        <${Panel} title="Voltage Analysis" sub="Line (solid) vs phase (dashed) · balanced-system estimates where derived" unit="V" h="h-[420px]" rows=${rows} series=${[
          {k:'VRY',label:'V_RY',c:C.red},{k:'VYB',label:'V_YB',c:C.amber},{k:'VBR',label:'V_BR',c:C.cyan},
          {k:'VR',label:'V_R',c:C.red,dash:D},{k:'VY',label:'V_Y',c:C.amber,dash:D},{k:'VB',label:'V_B',c:C.cyan,dash:D}]}/>
      </div>`}
      ${page==='current'&&avail.pages.current&&html`<div class="space-y-4">
        <p class="text-xs text-slate-500">IUF is the maximum phase-current magnitude deviation from the 3-phase average. When no neutral CT column is present, neutral current I_N is synthesized from three RMS phase currents assuming 120° fundamental displacement (excluding triplen harmonics).</p>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
          <${Gauge} title="R Phase Current" k="IRp" altKey="IR" altTitle="R Line Current (I_R)" unit="A" color=${PH.R} rows=${rows} all=${all}/>
          <${Gauge} title="Y Phase Current" k="IYp" altKey="IY" altTitle="Y Line Current (I_Y)" unit="A" color=${PH.Y} rows=${rows} all=${all}/>
          <${Gauge} title="B Phase Current" k="IBp" altKey="IB" altTitle="B Line Current (I_B)" unit="A" color=${PH.B} rows=${rows} all=${all}/>
        </div>
        <${LineNums} title="Line Current" unit="A" rows=${rows} items=${[['IR','I_R',PH.R],['IY','I_Y',PH.Y],['IB','I_B',PH.B]]}/>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <${Kpi} title="Avg Line Current" k="Iavg" unit="A" color=${C.red} rows=${rows}/>
          <${Kpi} title="Avg Phase Current" k="Iph" unit="A" color=${C.pink} rows=${rows}/>
          <${Kpi} title="Current Unbalance Factor (IUF)" k="IUF" unit="%" color=${C.amber} rows=${rows} dp=${2}/>
          <${Kpi} title="Neutral Current (I_N)" k="IN" unit="A" color=${C.cyan} rows=${rows} dp=${1}/>
        </div>
        <${Panel} title="Current Analysis" sub="Line (solid) vs phase (dashed) · phase-current conversion depends on topology" unit="A" h="h-[420px]" rows=${rows} series=${[
          {k:'IR',label:'I_R',c:Y.IR},{k:'IY',label:'I_Y',c:Y.IY},{k:'IB',label:'I_B',c:Y.IB},
          {k:'IRp',label:'I_R ph',c:Y.IR,dash:D},{k:'IYp',label:'I_Y ph',c:Y.IY,dash:D},{k:'IBp',label:'I_B ph',c:Y.IB,dash:D},
          {k:'IN',label:'I_N (Neutral)',c:C.violet,dash:[2,2]}]}/>
      </div>`}
      ${!EMB&&html`<p class="pb-2 pt-2 text-center text-xs text-slate-600">${info.report?'Imported columns are mapped automatically; unrelated columns are ignored. The CSV import check is at the bottom of this dashboard.':info.mapped?'Mapped columns: '+info.mapped.join(', '):'Sample data: 24 h at 5-minute intervals. Upload a CSV with common datalogger headers such as U12, I1, P total, Q total, S total and cos phi.'}</p>`}
      ${!EMB&&html`<${ImportSummary} report=${info.report}/>`}
      <${DefTip}/>
      <${FileSummaryDialog} s=${summary} onClose=${()=>setSummary(null)}/>
    </main>
    </div>
  </div>`;
}
ReactDOM.createRoot(document.getElementById('root')).render(html`<${App}/>`);
