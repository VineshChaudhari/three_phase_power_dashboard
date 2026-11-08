const {useState,useRef,useEffect,useMemo}=React;
const html=htm.bind(React.createElement);
const C={cyan:'#22d3ee',green:'#4ade80',amber:'#fbbf24',red:'#ff6b6b',blue:'#60a5fa',violet:'#a78bfa',pink:'#f472b6'};
const card='rounded-md border border-[#2C3235] bg-[#181B1F]';
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
  ['t',/^(timestamp|datetime|dateandtime|loggedat|recordtime|rtc|date)$/i],
  ['clock',/^(time|timeofday|logtime|recordtimeonly)$/i],
  ['VRY',/^(vry|vab|v12|v1v2|uab|u12|u1u2|ull12|vllry|vl12|vl1l2|voltagery|voltageab|linevoltagery|linevoltageab|voltagel1l2|voltagel12|ul1l2|l1l2voltage|linetolinevoltagery|linetolinevoltageab|voltagel1l2rms|linevoltage12)$/i],
  ['VYB',/^(vyb|vbc|v23|v2v3|ubc|u23|u2u3|ull23|vllyb|vl23|vl2l3|voltageyb|voltagebc|linevoltageyb|linevoltagebc|voltagel2l3|voltagel23|ul2l3|l2l3voltage|linetolinevoltageyb|linetolinevoltagebc|linevoltage23)$/i],
  ['VBR',/^(vbr|vca|v31|v3v1|uca|u31|u3u1|ull31|vllbr|vl31|vl3l1|voltagebr|voltageca|linevoltagebr|linevoltageca|voltagel3l1|voltagel31|ul3l1|l3l1voltage|linetolinevoltagebr|linetolinevoltageca|linevoltage31)$/i],
  ['VR',/^(vr|vrn|van|v1n|v1|voltage1|phasevoltage1|u1|u1n|uln1|vlnr|vln1|voltagern|voltagean|voltagel1n|vl1n|linetoneutralvoltagel1n|voltagel1|phasevoltager|phasevoltagea|phaseavoltage|voltagephasea|voltagea|rphasevoltage|l1voltage|l1nvoltage)$/i],
  ['VY',/^(vy|vyn|v2n|v2|voltage2|phasevoltage2|u2|u2n|uln2|vlny|vln2|voltageyn|voltagebn|voltagel2n|vl2n|linetoneutralvoltagel2n|voltagel2|phasevoltagey|phasevoltageb|phasebvoltage|voltagephaseb|voltageb|yphasevoltage|l2voltage|l2nvoltage)$/i],
  ['VB',/^(vb|vbn|vcn|v3n|v3|voltage3|phasevoltage3|u3|u3n|uln3|vlnb|vln3|voltagecn|voltagel3n|vl3n|linetoneutralvoltagel3n|voltagel3|phasevoltagec|phasecvoltage|voltagephasec|voltagec|bphasevoltage|l3voltage|l3nvoltage)$/i],
  ['IR',/^(ir|i1|ia|ilr|il1|ilinr|linecurrentr|linecurrenta|currentr|currenta|currentl1|l1current|amperel1)$/i],
  ['IY',/^(iy|i2|ily|il2|iliny|linecurrenty|linecurrentb|currenty|currentb|currentl2|l2current|amperel2)$/i],
  ['IB',/^(ib|i3|ic|ilb|il3|ilinb|linecurrentc|currentc|currentl3|l3current|amperel3)$/i],
  ['INm',/^(in|intrl|ineutral|neutralcurrent|neutralcurrenta|ncurrent|currentneutral|currentn|neutralamps|neutralcurrentrms)$/i],
  ['IRp',/^(irph|irp|iphr|iph1|iphasea|phasecurrent1|phasecurrentr|phasecurrenta|currentphasea|phaseacurrent|rphasecurrent|windingcurrentr)$/i],
  ['IYp',/^(iyph|iyp|iphy|iph2|iphasey|phasecurrent2|phasecurrenty|phasecurrentb|currentphaseb|phasebcurrent|yphasecurrent|windingcurrenty)$/i],
  ['IBp',/^(ibph|ibp|iphb|iph3|iphasec|phasecurrent3|phasecurrentc|currentphasec|phaseccurrent|bphasecurrent|windingcurrentb)$/i],
  ['kW',/^(kw|p|ptotal|ptot|totalp|pact|pactive|activepower|activepowerkw|totalactivepower|totalactivepowerkw|activepowertotal|poweractive|totalkw|kwtotal|kwavg|systemactivepower|totalrealpower|realpowertotal)$/i],
  ['kVAR',/^(kvar|q|qtotal|qtot|totalq|qreactive|reactive|reactivepower|reactivepowerkvar|totalreactivepower|reactivepowertotal|totalkvar|kvartotal|kvaravg|systemreactivepower|totalreactivepowerkvar)$/i],
  ['kVA',/^(kva|s|stotal|stot|totals|apparentpower|apparentpowerkva|totalapparentpower|apparentpowertotal|totalkva|kvatotal|kvaavg|systemapparentpower)$/i],
  ['PF',/^(pf|powerfactor|cosphi|cosphitotal|cosф|pfavg|totpf|pftotal|syspf|totalpf|totalpowerfactor|powerfactortotal|systempowerfactor|displacementpf)$/i],
  ['Hz',/^(hz|f|freq|frequency|systemfrequency|linefrequency|mainsfrequency)$/i]
];

const norm=h=>{
  const raw=String(h).trim().toLowerCase().replace(/\([^)]*\)|\[[^\]]*\]/g,'').trim();
  // Preserve standalone measurement headers (kW, kVAR, kVA, PF, Hz, P, Q, S).
  if(/^(?:mw|kw|w|mvar|kvar|var|mva|kva|va|pf|hz|p|q|s|f)$/i.test(raw))return raw.replace(/[^a-z0-9]/g,'');
  // A/B/C (or R/Y/B) at the end may identify the phase, not the unit.
  const phaseLabel=/(?:\bphase\s+(?:current|voltage)|\b(?:current|voltage)\s+phase|\bcurrent|\bvoltage)\s+[abcryb]$/i.test(raw);
  const cleaned=phaseLabel?raw:raw.replace(/\b(?:mvar|kvar|var|mva|kva|va|mw|kw|w|kv|mv|v|ka|ma|a|hz|rms|avg|average)\s*$/i,' ');
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
  if(!s||/^(?:-|—|n\/a|null|nan|over|under)$/i.test(s))return null;
  // Accept Western and Indian grouped thousands, plus decimal-comma exports.
  const unsigned=s.replace(/^[+-]/,'');
  const grouped=/^(?:\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})+,\d{3})(?:\.\d+)?(?:e[+-]?\d+)?$/i;
  if(s.includes(',')&&grouped.test(unsigned))s=s.replace(/,/g,'');
  else if(!s.includes('.')&&/^[-+]?\d+,\d{1,2}$/.test(s))s=s.replace(',','.');
  else if(/^[-+]?\d{1,3}(?:\.\d{3})+,\d{2}$/.test(s))s=s.replace(/\./g,'').replace(',','.');
  if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(s))return null;
  const n=Number(s);
  return Number.isFinite(n)?n:null;
}

function headerUnit(header){
  const h=String(header||'').trim();
  const bracket=[...h.matchAll(/[([]\s*([^\])]+?)\s*[)\]]/g)].map(m=>m[1].trim()).reverse();
  const known=/^(mw|kw|w|mvar|kvar|var|mva|kva|va|kv|mv|v|ka|ma|a|hz|%|percent|pu)$/i;
  for(const u of bracket)if(known.test(u))return u.toLowerCase();
  const suffix=h.match(/(?:^|[\s_])((?:mvar|kvar|var|mva|kva|va|mw|kw|w|kv|mv|v|ka|ma|a|hz)|%|percent|pu)\s*$/i);
  return suffix?suffix[1].toLowerCase():'';
}

function unitScale(key,header){
  const u=headerUnit(header);
  if(!u)return 1;
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
  const m=s.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?$/);
  if(m){
    const day=+m[1],month=+m[2],year=+m[3],hour=+(m[4]||0),minute=+(m[5]||0),second=+(m[6]||0);
    const d=new Date(year,month-1,day,hour,minute,second);
    if(d.getFullYear()!==year||d.getMonth()!==month-1||d.getDate()!==day||hour>23||minute>59||second>59)return NaN;
    return d.getTime()+(m[7]?Number('0.'+m[7])*1000:0);
  }
  const parsed=Date.parse(s);
  return Number.isFinite(parsed)?parsed:NaN;
}

function derive(r,config={}){
  const source=r._source||Object.fromEntries(Object.entries(r).filter(([k])=>k!=='_source'));
  r={...source,_source:source};
  const topology=config.topology||'wye4';
  if(config.assumeBalanced!==false){
    if(topology==='delta'){
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
  const delta=topology==='delta';
  if(r.IRp==null&&r.IR!=null)r.IRp=delta?r.IR/R3:r.IR;
  if(r.IYp==null&&r.IY!=null)r.IYp=delta?r.IY/R3:r.IY;
  if(r.IBp==null&&r.IB!=null)r.IBp=delta?r.IB/R3:r.IB;
  if(r.IR==null&&r.IRp!=null)r.IR=delta?r.IRp*R3:r.IRp;
  if(r.IY==null&&r.IYp!=null)r.IY=delta?r.IYp*R3:r.IYp;
  if(r.IB==null&&r.IBp!=null)r.IB=delta?r.IBp*R3:r.IBp;

  r.Vavg=mean([r.VRY,r.VYB,r.VBR]);
  r.Vph=mean([r.VR,r.VY,r.VB]);
  r.Iavg=mean([r.IR,r.IY,r.IB]);
  r.Iph=mean([r.IRp,r.IYp,r.IBp]);
  if(r.Vavg>0&&[r.VRY,r.VYB,r.VBR].every(Number.isFinite))
    r.VUF=Math.max(...[r.VRY,r.VYB,r.VBR].map(v=>Math.abs(v-r.Vavg)))/r.Vavg*100;
  if(r.Iavg>0&&[r.IR,r.IY,r.IB].every(Number.isFinite)){
    r.IUF=Math.max(...[r.IR,r.IY,r.IB].map(v=>Math.abs(v-r.Iavg)))/r.Iavg*100;
    const inSq=r.IR*r.IR+r.IY*r.IY+r.IB*r.IB-r.IR*r.IY-r.IY*r.IB-r.IB*r.IR;
    r.IN=Math.sqrt(Math.max(0,inSq));
  }
  if(r.INm!=null)r.IN=Math.abs(r.INm);

  r.lead=r.kVAR!=null?r.kVAR<0:(r.PF!=null&&r.PF<0);
  if(r.PF!=null){
    if(Math.abs(r.PF)>1&&Math.abs(r.PF)<=100)r.PF/=100;
    r.PF=Math.max(-1,Math.min(1,r.PF));
  }
  if(r.kVA==null){
    if(r.kW!=null&&r.kVAR!=null)r.kVA=Math.hypot(r.kW,r.kVAR);
    else if(r.kW!=null&&r.PF!=null&&Math.abs(r.PF)>0)r.kVA=Math.abs(r.kW)/Math.abs(r.PF);
    else if([r.VRY,r.VYB,r.VBR,r.IR,r.IY,r.IB].every(Number.isFinite))r.kVA=(R3*r.Vavg*r.Iavg)/1000;
  }
  if(r.kW==null&&r.kVA!=null&&r.PF!=null)r.kW=r.kVA*Math.abs(r.PF);
  if(r.kW==null&&r.kVA!=null&&r.kVAR!=null)r.kW=Math.sqrt(Math.max(0,r.kVA*r.kVA-r.kVAR*r.kVAR));
  if(r.kVAR==null&&r.kVA!=null&&r.kW!=null){
    const q=Math.sqrt(Math.max(0,r.kVA*r.kVA-r.kW*r.kW));
    r.kVAR=r.lead?-q:q;
  }
  if(r.PF==null&&r.kW!=null&&r.kVA>0)r.PF=(r.lead?-1:1)*Math.min(1,Math.abs(r.kW)/r.kVA);
  return r;
}

function normalize(data,fields,config={}){
  const used=new Set(),map={};
  for(const [k,re] of PAT){
    const h=fields.find(f=>!used.has(f)&&re.test(norm(f)));
    if(h){map[k]=h;used.add(h)}
  }
  const base=Date.now()-Math.max(0,data.length-1)*60000;
  const rows=data.map((d,i)=>{
    let timestamp=map.t?d[map.t]:null;
    if(map.t&&norm(map.t)==='date'&&map.clock&&d[map.clock]!=null)timestamp=String(timestamp??'')+' '+String(d[map.clock]);
    const r={t:pt(timestamp)};
    if(!Number.isFinite(r.t))r.t=base+i*60000;
    for(const k in map){
      if(k==='t'||k==='clock')continue;
      const value=toNum(d[map[k]]);
      r[k]=value==null?null:value*unitScale(k==='INm'?'INm':k,map[k]);
    }
    r._sourceIndex=i;
    return derive(r,config);
  }).sort((a,b)=>a.t-b.t||a._sourceIndex-b._sourceIndex);
  rows.forEach(r=>{delete r._sourceIndex;if(r._source)delete r._source._sourceIndex;});
  const mappedFields=Object.entries(map).filter(([k])=>k!=='clock').map(([key,header])=>({key,header,unit:headerUnit(header),scale:unitScale(key,header)}));
  const ignoredFields=fields.filter(f=>!used.has(f));
  const mappedKeys=Object.keys(map).filter(k=>k!=='clock');
  const electricalKeys=['VRY','VYB','VBR','VR','VY','VB','IR','IY','IB','IRp','IYp','IBp','INm','kW','kVAR','kVA','PF','Hz'];
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
    const imported=!!map[sourceKey];
    const present=rows.some(row=>Number.isFinite(row[key]));
    return {key,label,status:imported?(present?'imported':'empty'):present?'estimated':'missing'};
  });
  return {rows,mapped:mappedKeys,mappedFields,ignoredFields,signals,recognizedElectrical,hasTimestamp:!!map.t};
}

function makeImportReport(result){
  const states=result.signals;
  const imported=states.filter(x=>x.status==='imported').length;
  const estimated=states.filter(x=>x.status==='estimated').length;
  const missing=states.filter(x=>x.status==='missing'||x.status==='empty').length;
  return {signals:states,mappedFields:result.mappedFields,ignoredFields:result.ignoredFields,
    imported,estimated,missing,hasTimestamp:result.hasTimestamp,recognizedElectrical:result.recognizedElectrical};
}

function refreshImportReport(report,rows){
  if(!report)return report;
  const direct=new Set(report.mappedFields.map(x=>x.key));
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
      IR:f(IR,1),IY:f(IY,1),IB:f(IB,1),IRp:f(IR,1),IYp:f(IY,1),IBp:f(IB,1),kW:f(kW,2),kVAR:f(kVAR,2),kVA:f(kVA,2),PF:f(pf,3)}));
  }
  return rows;
}

/* ---------- Peak-Preserving Downsampler & Stack-Safe Stats ---------- */
const ds=(a,maxPts=300,keys=['VRY','VYB','VBR','VR','VY','VB','IR','IY','IB','IRp','IYp','IBp','kW','kVAR','kVA','PF','VUF','IUF','IN'])=>{
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
  for(let i=0;i<rows.length;i++){
    const v=rows[i][k];
    if(v!=null&&Number.isFinite(v)){
      if(v<min)min=v;
      if(v>max)max=v;
      sum+=v;
      count++;
    }
  }
  return count?{min,max,avg:sum/count}:null;
};

const calcEnergy=(rows,hasRealTimestamps=true)=>{
  let kWh=0,kVArh=0,maxKVA=0,hasPInterval=false,hasQInterval=false,hasKVA=false;
  const intervals=[];
  for(let i=1;i<rows.length;i++){
    const dt=(rows[i].t-rows[i-1].t)/36e5;
    if(Number.isFinite(dt)&&dt>0)intervals.push(dt);
  }
  intervals.sort((a,b)=>a-b);
  const median=intervals.length?intervals[Math.floor(intervals.length/2)]:0;
  const maxGap=median?Math.max(median*5,1/60):0;
  for(let i=0;i<rows.length;i++){
    const s=rows[i].kVA;
    if(s!=null&&Number.isFinite(s)){hasKVA=true;if(s>maxKVA)maxKVA=s;}
    if(i===0)continue;
    const dt=(rows[i].t-rows[i-1].t)/36e5;
    if(!(dt>0&&dt<24&&(!maxGap||dt<=maxGap)))continue;
    const p0=rows[i-1].kW,p1=rows[i].kW,q0=rows[i-1].kVAR,q1=rows[i].kVAR;
    if(Number.isFinite(p0)&&Number.isFinite(p1)){kWh+=0.5*(p0+p1)*dt;hasPInterval=true;}
    // Signed net reactive energy: positive inductive, negative capacitive.
    if(Number.isFinite(q0)&&Number.isFinite(q1)){kVArh+=0.5*(q0+q1)*dt;hasQInterval=true;}
  }
  // Do not show zero energy when there were no valid intervals to integrate.
  return {kWh:hasRealTimestamps&&hasPInterval?kWh:null,kVArh:hasRealTimestamps&&hasQInterval?kVArh:null,maxKVA:hasKVA?maxKVA:null};
};

const fx=(v,dp)=>v==null||!Number.isFinite(v)?'—':v.toFixed(dp);
const fmtDT=t=>t==null||isNaN(t)?'—':new Date(t).toLocaleString([], {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:false});

/* ---------- Chart.js wrapper ---------- */
function Cv({datasets,opts,cls}){
  const ref=useRef(),ch=useRef();
  useEffect(()=>{
    if(!ref.current||typeof Chart==='undefined')return;
    try{
      if(!ch.current)ch.current=new Chart(ref.current,{type:'line',data:{datasets},options:opts});
      else{ch.current.data.datasets=datasets;ch.current.options=opts;ch.current.update('none')}
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
  const av=series.filter(s=>rows.some(r=>r[s.k]!=null));
  const pts=ds(rows,300,series.map(s=>s.k));
  const datasets=av.map(s=>({label:s.label,data:pts.map(r=>({x:r.t,y:r[s.k]})),borderColor:s.c,backgroundColor:s.c+'26',fill:!!s.fill,stepped:!!s.step,
    borderDash:s.dash||[],borderWidth:1.5,pointRadius:rows.length===1?3:0,pointHoverRadius:3,spanGaps:false,tension:s.step?0:.3,hidden:!!hid[s.k]}));
  if(refLine&&rows.length)datasets.push({label:'Target',data:[{x:rows[0].t,y:refLine},{x:rows[rows.length-1].t,y:refLine}],borderColor:C.red,borderDash:[6,4],borderWidth:1,pointRadius:0});
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
  const data=[{data:pts,borderColor:color,backgroundColor:color+'22',fill:true,borderWidth:1.5,pointRadius:0,spanGaps:false,tension:.35}];
  return html`<div class=${card+' p-4 flex flex-col'}>
    <div class="text-xs uppercase tracking-wide text-slate-400">${title}</div>
    <div class="mt-1 flex items-baseline gap-1.5"><span class="text-4xl font-bold mono" style=${{color}}>${fx(last[k],dp)}</span><span class="text-sm text-slate-400">${unit}</span></div>
    <${Cv} datasets=${data} opts=${sparkOpts} cls="h-12 mt-2"/>
    <${Foot} rows=${rows} k=${k} dp=${dp}/>
  </div>`;
}

function PfCard({rows}){
  const last=rows[rows.length-1]||{},pf=last.PF,v=Math.max(0,Math.min(1,Math.abs(pf||0)));
  const lead=!!last.lead;
  const col=v>=.95?C.green:v>=.9?C.amber:C.red;
  const data=[{data:ds(rows,70,['PF']).map(r=>({x:r.t,y:r.PF})),borderColor:col,backgroundColor:col+'22',fill:true,borderWidth:1.5,pointRadius:0,spanGaps:false,tension:.35}];
  const arc='M20 100A80 80 0 0 1 180 100';
  return html`<div class=${card+' p-4 flex flex-col'}>
    <div class="flex items-center justify-between"><div class="text-xs uppercase tracking-wide text-slate-400">Power Factor</div>
      <span class=${'rounded px-2 py-0.5 text-[11px] font-semibold '+(lead?'bg-cyan-400/15 text-cyan-300':'bg-amber-400/15 text-amber-300')}>${lead?'LEAD':'LAG'}</span></div>
    <svg viewBox="0 0 200 116" class="mx-auto mt-1 w-full max-w-[220px]">
      <path d=${arc} pathLength="1" fill="none" stroke="#2C3235" stroke-width="14" stroke-linecap="round"/>
      <path d=${arc} pathLength="1" fill="none" stroke=${col} stroke-width="14" stroke-linecap="round" stroke-dasharray=${v+' 1'} style=${{filter:'drop-shadow(0 0 5px '+col+'99)'}}/>
      <text x="100" y="92" text-anchor="middle" fill="#f1f5f9" font-size="34" font-weight="700">${pf==null||!Number.isFinite(pf)?'—':v.toFixed(2)}</text>
      <text x="20" y="114" text-anchor="middle" fill="#8b9199" font-size="10">0</text><text x="180" y="114" text-anchor="middle" fill="#8b9199" font-size="10">1.0</text>
    </svg>
    <${Cv} datasets=${data} opts=${sparkOpts} cls="h-8"/>
    <${Foot} rows=${rows} k="PF" dp=${3}/>
  </div>`;
}

/* ---------- R / Y / B gauges & number cards ---------- */
const PH={R:'#ff6b6b',Y:'#facc15',B:'#4da3ff'};
const nice=m=>{
  if(!Number.isFinite(m)||m<=0)return 10;
  const p=Math.pow(10,Math.floor(Math.log10(m)));
  return ([1,1.5,2,2.5,3,4,5,6,8,10].find(x=>x*p>=m)||10)*p;
};
function Gauge({title,k,unit,color,rows,all,dp=1}){
  const val=(rows[rows.length-1]||{})[k];
  let peak=1;
  for(let i=0;i<all.length;i++){
    const rv=all[i][k];
    if(rv!=null&&Number.isFinite(rv)&&rv>peak)peak=rv;
  }
  const mx=nice(peak*1.15);
  const v=Math.max(0,Math.min(1,(val||0)/mx));
  const arc='M20 100A80 80 0 0 1 180 100';
  return html`<div class=${card+' p-4 flex flex-col'}>
    <div class="text-xs uppercase tracking-wide text-slate-400">${title}</div>
    <svg viewBox="0 0 200 116" class="mx-auto mt-2 w-full max-w-[240px]">
      <path d=${arc} pathLength="1" fill="none" stroke="#2C3235" stroke-width="14" stroke-linecap="round"/>
      <path d=${arc} pathLength="1" fill="none" stroke=${color} stroke-width="14" stroke-linecap="round" stroke-dasharray=${v+' 1'} style=${{filter:'drop-shadow(0 0 5px '+color+'99)'}}/>
      <text x="100" y="84" text-anchor="middle" fill=${color} font-size="30" font-weight="700">${fx(val,dp)}</text>
      <text x="100" y="100" text-anchor="middle" fill="#8b9199" font-size="11">${unit}</text>
      <text x="20" y="114" text-anchor="middle" fill="#8b9199" font-size="10">0</text><text x="180" y="114" text-anchor="middle" fill="#8b9199" font-size="10">${mx}</text>
    </svg>
    <${Foot} rows=${rows} k=${k} dp=${dp}/>
  </div>`;
}

function LineNums({title,unit,items,rows,dp=1}){
  const last=rows[rows.length-1]||{};
  return html`<div class=${card+' p-4'}>
    <div class="text-xs uppercase tracking-wide text-slate-400">${title}</div>
    <div class="mt-3 grid grid-cols-3 gap-3 text-center">${items.map(([k,l,c])=>html`<div key=${k}>
      <div class="text-xs text-slate-500">${l}</div>
      <div class="mt-1 text-3xl font-bold mono sm:text-4xl" style=${{color:c}}>${fx(last[k],dp)}</div>
      <div class="text-xs text-slate-400">${unit}</div></div>`)}</div>
  </div>`;
}

/* ---------- App & Homepage ---------- */
const Y={IR:C.red,IY:C.amber,IB:C.cyan},D=[4,3];
const NAV=[['power','gauge','Power'],['graphs','chart','Power Graphs'],['voltage','zap','Voltage'],['current','activity','Current']];
const EMB=(location.hash.match(/^#embed-(\w+)/)||[])[1];
const PV=[['power',540,'Power overview','Power factor gauge with live kW, kVAR, kVA and integrated kWh energy telemetry.'],
  ['graphs',460,'Power analysis','Active, reactive and apparent power breakdown, plus the 0.95 PF target threshold.'],
  ['voltage',820,'Voltage and current by phase','R, Y, B gauges, line readings, phase unbalance (VUF/IUF) and neutral current.']];

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
  return html`<section class=${card+' p-4'}>
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
    <p class="mt-3 text-[11px] text-slate-500">${report.hasTimestamp?'Timestamp column detected.':'No supported timestamp detected; evenly spaced fallback timestamps are assigned.'} Estimated values use the selected topology and balanced-system assumptions; they are not original meter measurements.</p>
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

function Home({fileRef,onFile,handle,onSample,toast}){
  const [drag,setDrag]=useState(false);
  const go=()=>{const el=document.getElementById('preview');if(el)el.scrollIntoView({behavior:'smooth'})};
  return html`<div class="min-h-screen text-slate-200" style=${{background:'radial-gradient(900px 420px at 50% -80px, rgba(34,211,238,.13), transparent), #111217'}}>
    <header class="flex items-center gap-2.5 px-6 py-4">
      <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-[#111217]"><${Icon} n="zap" s=${18}/></div>
      <span class="text-lg font-semibold text-slate-100">Dashboard</span>
    </header>
    <main class="mx-auto max-w-5xl px-4">
      <section class="mx-auto max-w-3xl pb-10 pt-10 text-center">
        <h1 class="text-4xl font-bold leading-tight text-slate-50 sm:text-5xl">Turn your logger CSV into a <span class="text-cyan-300">live power dashboard</span></h1>
        <p class="mx-auto mt-4 max-w-xl text-slate-400">Upload a CSV from your electrical data logger. Voltage, current, power, unbalance and power factor are detected automatically and plotted instantly.</p>
        <div onDragOver=${e=>{e.preventDefault();setDrag(true)}} onDragLeave=${()=>setDrag(false)} onDrop=${e=>{e.preventDefault();setDrag(false);handle(e.dataTransfer.files[0])}}
          class=${'mt-8 rounded-xl border-2 border-dashed p-8 transition sm:p-12 '+(drag?'border-cyan-400 bg-cyan-400/10':'border-[#2C3235] bg-[#181B1F]')}>
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cyan-400/10 text-cyan-300"><${Icon} n="upload" s=${28}/></div>
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
  const [win,setWin]=useState([0,1000]);
  const [preset,setPreset]=useState('all');
  const [topology,setTopology]=useState('wye4');
  const [assumeBalanced,setAssumeBalanced]=useState(true);
  const [toast,setToast]=useState('');
  const [page,setPage]=useState(EMB||'power');
  const [view,setView]=useState(EMB?'dash':'home');
  const file=useRef(),toastTimer=useRef();

  const note=m=>{
    if(toastTimer.current)clearTimeout(toastTimer.current);
    setToast(m);
    toastTimer.current=setTimeout(()=>setToast(''),4500);
  };
  useEffect(()=>()=>toastTimer.current&&clearTimeout(toastTimer.current),[]);

  const load=(rows,name,mapped,report=null)=>{setView('dash');setAll(rows);setInfo({name,mapped,report});setWin([0,1000]);setPreset('all')};
  const handle=f=>{
    if(!f)return;
    if(!/\.csv$/i.test(f.name))return note('Please choose a .CSV file');
    Papa.parse(f,{header:true,dynamicTyping:true,skipEmptyLines:'greedy',worker:true,
      complete:res=>{
        if(res.errors&&res.errors.some(e=>e.code==='UndetectableDelimiter'))return note('Could not detect the CSV delimiter. Save the file as comma-separated CSV and try again.');
        const o=normalize(res.data,res.meta.fields||[],{topology,assumeBalanced});
        if(!o.rows.length)return note('No valid data rows found in '+f.name);
        if(!o.recognizedElectrical)return note('CSV parsed, but no supported electrical columns were recognized. Check the header names or include voltage, current, power or PF columns.');
        const report=makeImportReport(o);
        load(o.rows,f.name,o.mapped,report);
        const issueCount=(res.errors||[]).length;
        note('Loaded '+o.rows.length.toLocaleString()+' rows · '+o.mappedFields.length+' recognized columns · '+o.ignoredFields.length+' other columns ignored'+(issueCount?' · '+issueCount+' CSV warnings':''));
      },
      error:()=>note('Failed to parse CSV')});
  };
  const onFile=e=>{handle(e.target.files[0]);e.target.value=''};
  const pickPreset=v=>{
    setPreset(v);
    if(v==='all'||!all.length)return setWin([0,1000]);
    const end=all[all.length-1].t;
    let i=all.findIndex(r=>r.t>=end-(+v)*36e5);
    if(i<0)i=0;
    setWin([Math.round(i/all.length*1000),1000]);
  };

  const n=all.length;
  const i0=n<=1?0:Math.max(0,Math.min(Math.floor(win[0]/1000*n),n-2));
  const i1=n<=1?n:Math.max(i0+1,Math.min(n,Math.ceil(win[1]/1000*n)));
  const rows=useMemo(()=>all.slice(i0,i1),[all,i0,i1]);
  const energy=useMemo(()=>calcEnergy(rows,!info.report||info.report.hasTimestamp),[rows,info.report]);

  const slide=(idx,v)=>{
    const w=[...win];
    w[idx]=+v;
    if(w[0]>w[1]-10)w[idx?1:0]=idx?Math.min(1000,w[0]+10):Math.max(0,w[1]-10);
    setWin(w);
    setPreset('custom');
  };
  const btn='flex items-center gap-2 rounded border px-3 py-1.5 text-sm font-medium transition';

  if(view==='home')return html`<${Home} fileRef=${file} onFile=${onFile} handle=${handle} onSample=${()=>load(sample(),'sample-data.csv',null)} toast=${toast}/>`;
  return html`<div class="min-h-screen text-slate-200">
    ${!EMB&&html`<nav class="fixed inset-y-0 left-0 z-30 flex w-12 flex-col items-center gap-1 border-r border-[#2C3235] bg-[#0d0e12] pb-3 sm:w-14" style=${{paddingTop:'calc(env(safe-area-inset-top,0px) + 12px)'}}>
      <button title="Home" aria-label="Home" onClick=${()=>setView('home')} class="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-[#111217] transition hover:scale-105"><${Icon} n="zap" s=${18}/></button>
      ${NAV.map(([id,ic,label])=>html`<button key=${id} title=${label} aria-label=${label} onClick=${()=>setPage(id)} class=${'group relative flex h-10 w-10 items-center justify-center rounded transition '+(page===id?'bg-white/10 text-cyan-300':'text-slate-400 hover:bg-white/5 hover:text-slate-100')}>
        ${page===id&&html`<span class="absolute -left-1 top-1.5 h-7 w-0.5 rounded bg-cyan-400 sm:-left-2"></span>`}
        <${Icon} n=${ic} s=${20}/>
        <span class="pointer-events-none absolute left-full z-40 ml-2 hidden whitespace-nowrap rounded border border-[#2C3235] bg-[#181B1F] px-2 py-1 text-xs text-slate-200 group-hover:block">${label}</span></button>`)}
    </nav>`}
    <div class=${EMB?'':'pl-12 sm:pl-14'}>
    ${!EMB&&html`<header class="sticky z-20 border-b border-[#2C3235] bg-[#181B1F]/95 backdrop-blur" style=${{top:'env(safe-area-inset-top,0px)'}}>
      <div class="flex flex-wrap items-center gap-3 px-4 py-2.5">
        <span class="text-lg font-semibold text-slate-100">Dashboard</span>
        <span class="hidden sm:inline rounded bg-white/5 px-2 py-0.5 text-xs text-slate-400">${info.name} · ${n.toLocaleString()} rows${info.mapped?' · '+info.mapped.length+' cols mapped':''}</span>
        <div class="flex-1"></div>
        <label class="flex items-center gap-2 text-sm text-slate-400"><${Icon} n="clock"/>
          <select value=${preset} onChange=${e=>pickPreset(e.target.value)} class="rounded border border-[#2C3235] bg-[#111217] px-2 py-1.5 text-sm text-slate-200 outline-none focus:border-cyan-400">
            <option value="all">Entire range</option><option value="1">Last 1 hour</option><option value="3">Last 3 hours</option><option value="6">Last 6 hours</option><option value="12">Last 12 hours</option>
            ${preset==='custom'&&html`<option value="custom">Custom window</option>`}</select></label>
        <label class="flex items-center gap-2 text-xs text-slate-400">Topology
          <select value=${topology} onChange=${e=>{const v=e.target.value;const next=all.map(r=>derive(r,{topology:v,assumeBalanced}));setTopology(v);setAll(next);setInfo(prev=>({...prev,report:refreshImportReport(prev.report,next)}))}} class="rounded border border-[#2C3235] bg-[#111217] px-2 py-1.5 text-sm text-slate-200">
            <option value="wye4">Wye · 4-wire</option><option value="delta">Delta · balanced</option>
          </select>
        </label>
        <label class="flex items-center gap-1.5 text-xs text-slate-400">
          <input type="checkbox" checked=${assumeBalanced} onChange=${e=>{const v=e.target.checked;const next=all.map(r=>derive(r,{topology,assumeBalanced:v}));setAssumeBalanced(v);setAll(next);setInfo(prev=>({...prev,report:refreshImportReport(prev.report,next)}))}}/>
          Estimate missing voltages
        </label>
        <button onClick=${()=>load(sample(),'sample-data.csv',null)} class=${btn+' border-[#2C3235] text-slate-200 hover:bg-white/5'}><${Icon} n="db"/>Load Sample Data</button>
        <button onClick=${()=>file.current.click()} class=${btn+' border-cyan-400/60 bg-cyan-400/10 text-cyan-300 hover:bg-cyan-400/20'}><${Icon} n="upload"/>Upload CSV</button>
        <input ref=${file} type="file" accept=".csv,text/csv" class="hidden" onChange=${onFile}/>
      </div>
      <div class="flex items-center gap-3 border-t border-[#2C3235] px-4 py-1.5 text-[11px] text-slate-500 mono">
        <span class="w-28 shrink-0">${fmtDT(rows[0]&&rows[0].t)}</span>
        <input type="range" min="0" max="1000" value=${win[0]} onInput=${e=>slide(0,e.target.value)} class="min-w-0 flex-1" aria-label="Window start"/>
        <input type="range" min="0" max="1000" value=${win[1]} onInput=${e=>slide(1,e.target.value)} class="min-w-0 flex-1" aria-label="Window end"/>
        <span class="w-28 shrink-0 text-right">${fmtDT(rows[rows.length-1]&&rows[rows.length-1].t)}</span>
      </div>
    </header>`}
    ${toast&&html`<div class="fixed right-4 z-30 rounded border border-[#2C3235] bg-[#181B1F] px-4 py-2 text-sm shadow-lg" style=${{top:'calc(env(safe-area-inset-top,0px) + 96px)'}}>${toast}</div>`}

    <main class="mx-auto max-w-[1600px] space-y-4 p-4">
      ${!EMB&&html`<${ImportSummary} report=${info.report}/>`}
      ${page==='power'&&html`<div class="space-y-4">
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <${PfCard} rows=${rows}/>
          <${Kpi} title="Active Power" k="kW" unit="kW" color=${C.green} rows=${rows} dp=${2}/>
          <${Kpi} title="Reactive Power" k="kVAR" unit="kVAR" color=${C.amber} rows=${rows} dp=${2}/>
          <${Kpi} title="Apparent Power" k="kVA" unit="kVA" color=${C.cyan} rows=${rows} dp=${2}/>
          ${info.report&&info.report.signals.some(x=>x.key==='Hz'&&x.status==='imported')&&html`<${Kpi} title="System Frequency" k="Hz" unit="Hz" color=${C.violet} rows=${rows} dp=${2}/>`}
        </div>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div class=${card+' p-4'}><div class="text-xs uppercase tracking-wide text-slate-400">Window Active Energy</div><div class="mt-1 flex items-baseline gap-1.5"><span class="text-3xl font-bold mono text-emerald-400">${fx(energy.kWh,2)}</span><span class="text-sm text-slate-400">kWh</span></div></div>
          <div class=${card+' p-4'}><div class="text-xs uppercase tracking-wide text-slate-400">Net Reactive Energy (signed)</div><div class="mt-1 flex items-baseline gap-1.5"><span class="text-3xl font-bold mono text-amber-400">${fx(energy.kVArh,2)}</span><span class="text-sm text-slate-400">kVArh</span></div></div>
          <div class=${card+' p-4'}><div class="text-xs uppercase tracking-wide text-slate-400">Peak Apparent Demand</div><div class="mt-1 flex items-baseline gap-1.5"><span class="text-3xl font-bold mono text-cyan-400">${fx(energy.maxKVA,2)}</span><span class="text-sm text-slate-400">kVA</span></div></div>
        </div>
        <p class="text-[11px] text-slate-500">Energy uses trapezoidal integration across adjacent valid samples; intervals over five times the median sample interval are excluded. Net kVArh is signed (positive inductive, negative capacitive).</p>
      </div>`}
      ${page==='graphs'&&html`<div class="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <${Panel} title="Power Breakdown" sub="Active vs reactive vs apparent · gap between kVA and kW shows reactive demand" unit="kW / kVAR / kVA" h="h-80" rows=${rows} dp=${2} series=${[
          {k:'kVA',label:'Apparent (kVA)',c:C.cyan,dash:D},{k:'kW',label:'Active (kW)',c:C.green,fill:true},{k:'kVAR',label:'Reactive (kVAR)',c:C.amber,fill:true}]}/>
        <${Panel} title="Power Factor Trend" sub="Step line with 0.95 target threshold" unit="PF" dp=${3} h="h-80" yMin=${-1} yMax=${1} refLine=${0.95} rows=${rows} series=${[
          {k:'PF',label:'Signed Power Factor',c:C.green,step:true}]}/>
      </div>`}
      ${page==='voltage'&&html`<div class="space-y-4">
        <p class="text-xs text-slate-500">VUF shown here is the maximum line-voltage magnitude deviation from the three-line average (NEMA-style proxy), not IEC symmetrical-component VUF. Missing Wye LL/LN magnitudes use the balanced √3 relationship; in Delta, winding phase voltage equals line voltage and no neutral voltage exists.</p>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
          <${Gauge} title="R Phase Voltage" k="VR" unit="V" color=${PH.R} rows=${rows} all=${all}/>
          <${Gauge} title="Y Phase Voltage" k="VY" unit="V" color=${PH.Y} rows=${rows} all=${all}/>
          <${Gauge} title="B Phase Voltage" k="VB" unit="V" color=${PH.B} rows=${rows} all=${all}/>
        </div>
        <${LineNums} title="Line Voltage" unit="V" rows=${rows} items=${[['VRY','V_RY',PH.R],['VYB','V_YB',PH.Y],['VBR','V_BR',PH.B]]}/>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <${Kpi} title="Avg Line Voltage" k="Vavg" unit="V" color=${C.blue} rows=${rows}/>
          <${Kpi} title="Avg Phase Voltage" k="Vph" unit="V" color=${C.violet} rows=${rows}/>
          <${Kpi} title="Voltage Magnitude Unbalance (proxy)" k="VUF" unit="%" color=${C.amber} rows=${rows} dp=${2}/>
        </div>
        <${Panel} title="Voltage Analysis" sub="Line (solid) vs phase (dashed) · balanced-system estimates where derived" unit="V" h="h-[420px]" rows=${rows} series=${[
          {k:'VRY',label:'V_RY',c:C.red},{k:'VYB',label:'V_YB',c:C.amber},{k:'VBR',label:'V_BR',c:C.cyan},
          {k:'VR',label:'V_R',c:C.red,dash:D},{k:'VY',label:'V_Y',c:C.amber,dash:D},{k:'VB',label:'V_B',c:C.cyan,dash:D}]}/>
      </div>`}
      ${page==='current'&&html`<div class="space-y-4">
        <p class="text-xs text-slate-500">IUF is a phase-current magnitude-unbalance proxy. When no neutral CT column is present, neutral current is estimated from three RMS phase currents assuming 120° displacement; the estimate does not represent triplen harmonics.</p>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
          <${Gauge} title="R Phase Current" k="IRp" unit="A" color=${PH.R} rows=${rows} all=${all}/>
          <${Gauge} title="Y Phase Current" k="IYp" unit="A" color=${PH.Y} rows=${rows} all=${all}/>
          <${Gauge} title="B Phase Current" k="IBp" unit="A" color=${PH.B} rows=${rows} all=${all}/>
        </div>
        <${LineNums} title="Line Current" unit="A" rows=${rows} items=${[['IR','I_R',PH.R],['IY','I_Y',PH.Y],['IB','I_B',PH.B]]}/>
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <${Kpi} title="Avg Line Current" k="Iavg" unit="A" color=${C.red} rows=${rows}/>
          <${Kpi} title="Avg Phase Current" k="Iph" unit="A" color=${C.pink} rows=${rows}/>
          <${Kpi} title="Current Magnitude Unbalance (proxy)" k="IUF" unit="%" color=${C.amber} rows=${rows} dp=${2}/>
          <${Kpi} title="Neutral Current (measured or estimated)" k="IN" unit="A" color=${C.cyan} rows=${rows} dp=${1}/>
        </div>
        <${Panel} title="Current Analysis" sub="Line (solid) vs phase (dashed) · phase-current conversion depends on topology" unit="A" h="h-[420px]" rows=${rows} series=${[
          {k:'IR',label:'I_R',c:Y.IR},{k:'IY',label:'I_Y',c:Y.IY},{k:'IB',label:'I_B',c:Y.IB},
          {k:'IRp',label:'I_R ph',c:Y.IR,dash:D},{k:'IYp',label:'I_Y ph',c:Y.IY,dash:D},{k:'IBp',label:'I_B ph',c:Y.IB,dash:D},
          {k:'IN',label:'I_N (Neutral)',c:C.violet,dash:[2,2]}]}/>
      </div>`}
      ${!EMB&&html`<p class="pb-4 text-center text-xs text-slate-600">${info.report?'Imported columns are mapped automatically; unrelated columns are ignored. Open CSV import check above to inspect the mapping.':info.mapped?'Mapped columns: '+info.mapped.join(', '):'Sample data: 24 h at 5-minute intervals. Upload a CSV with common datalogger headers such as U12, I1, P total, Q total, S total and cos phi.'}</p>`}
    </main>
    </div>
  </div>`;
}
ReactDOM.createRoot(document.getElementById('root')).render(html`<${App}/>`);
