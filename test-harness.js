const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/app.js','utf8').replace(/ReactDOM\.createRoot\([\s\S]*$/,'');
const React={createElement(){},useState(){},useRef(){},useEffect(){},useMemo(){}};
const ctx={React,htm:()=>function(){return null},Chart:undefined,console,Date,Math,Number,String,Set,Map,location:{hash:''}};
vm.createContext(ctx);
vm.runInContext(src+'\nglobalThis.test={normalize,derive,toNum,pt,ds,dsIdx,gapOf,seqUnbalance,detectDateOrder,calcEnergy,st,makeImportReport,refreshImportReport,headerUnit,norm};',ctx);
const {normalize,derive,toNum,pt,ds,dsIdx,gapOf,seqUnbalance,detectDateOrder,calcEnergy,st,makeImportReport,refreshImportReport,headerUnit,norm}=ctx.test;

// Numeric sanitation and localized number formats.
assert.strictEqual(toNum('1,234.50'),1234.5);
assert.strictEqual(toNum('12,34,567.89'),1234567.89);
assert.strictEqual(toNum('230,5'),230.5);
assert.strictEqual(toNum('12abc'),null);
assert.strictEqual(toNum('—'),null);

// Flexible labels, separate Date + Time columns, unit conversions, and irrelevant columns.
const headers=['Date','Time','Voltage L1-L2 (V)','Voltage L2-L3 (V)','Voltage L3-L1 (V)',
  'Voltage L1-N (V)','Voltage L2-N (V)','Voltage L3-N (V)','Current L1 (A)','Current L2 (A)','Current L3 (A)',
  'Active Power Total (W)','Reactive Power Total (var)','Apparent Power Total (VA)','Power Factor (%)',
  'Neutral Current (A)','Frequency (Hz)','THD V R (%)','Energy Import (kWh)','Operator Name'];
const input={'Date':'08/11/2026','Time':'07:00:00','Voltage L1-L2 (V)':415,'Voltage L2-L3 (V)':414,'Voltage L3-L1 (V)':416,
  'Voltage L1-N (V)':240,'Voltage L2-N (V)':239,'Voltage L3-N (V)':241,'Current L1 (A)':100,'Current L2 (A)':98,'Current L3 (A)':102,
  'Active Power Total (W)':65000,'Reactive Power Total (var)':30000,'Apparent Power Total (VA)':72000,'Power Factor (%)':90,
  'Neutral Current (A)':5,'Frequency (Hz)':50,'THD V R (%)':2.1,'Energy Import (kWh)':100,'Operator Name':'Shift A'};
const flexible=normalize([input],headers,{topology:'wye4',assumeBalanced:true});
assert.strictEqual(flexible.recognizedElectrical,true);
assert.strictEqual(flexible.rows.length,1);
assert.strictEqual(flexible.rows[0].kW,65);
assert.strictEqual(flexible.rows[0].kVAR,30);
assert.strictEqual(flexible.rows[0].kVA,72);
assert.strictEqual(flexible.rows[0].PF,0.9);
assert.strictEqual(flexible.rows[0].IN,5);
assert.strictEqual(flexible.rows[0].Hz,50);
assert(flexible.mapped.includes('VRY')&&flexible.mapped.includes('IR'));
assert(flexible.ignoredFields.includes('THD V R (%)'));
assert(flexible.ignoredFields.includes('Energy Import (kWh)'));
assert(flexible.ignoredFields.includes('Operator Name'));
assert(flexible.mappedFields.some(x=>x.header==='Active Power Total (W)'&&x.scale===0.001));
assert(Number.isFinite(flexible.rows[0].t));
assert.strictEqual(new Date(flexible.rows[0].t).getHours(),7); // Separate date and time columns are combined without altering local clock time.

// Common compact aliases and standalone headers.
assert.strictEqual(norm('kW'),'kw');
assert.strictEqual(norm('kVAR'),'kvar');
assert.strictEqual(norm('kVA'),'kva');
assert.strictEqual(headerUnit('Power (kW)'),'kw');
const compact=normalize([{'Timestamp':'2026-11-08T01:00:00Z','U12':415,'U23':414,'U31':416,'I1':20,'I2':21,'I3':19,'P total (kW)':8,'Q total (kVAR)':3,'S total (kVA)':8.54,'cos phi':0.94,'Frequency (Hz)':50}],
  ['Timestamp','U12','U23','U31','I1','I2','I3','P total (kW)','Q total (kVAR)','S total (kVA)','cos phi','Frequency (Hz)']);
assert.strictEqual(compact.rows[0].VRY,415);
assert.strictEqual(compact.rows[0].IR,20);
assert.strictEqual(compact.rows[0].kW,8);
assert.strictEqual(compact.rows[0].kVAR,3);
assert.strictEqual(compact.rows[0].kVA,8.54);
const standalone=normalize([{'kW':12,'kVAR':4,'kVA':12.65,'PF':0.95}],['kW','kVAR','kVA','PF']);
assert.strictEqual(standalone.rows[0].kW,12);
assert.strictEqual(standalone.rows[0].PF,0.95);
const phaseOnly=normalize([{'Phase Current A (A)':10,'Phase Current B (A)':11,'Phase Current C (A)':9}],
  ['Phase Current A (A)','Phase Current B (A)','Phase Current C (A)'],{topology:'wye4'});
assert(phaseOnly.mapped.includes('IRp')&&phaseOnly.mapped.includes('IYp')&&phaseOnly.mapped.includes('IBp'));
assert.strictEqual(phaseOnly.rows[0].IR,10); // Wye line current equals phase current.

// Sparse/unsupported and single-row CSV handling.
let sparse=normalize([{Timestamp:'2026-11-07T12:00:00Z',Misc:'x'}],['Timestamp','Misc']);
assert.strictEqual(sparse.rows.length,1);
assert.strictEqual(sparse.rows[0].kW,undefined);
assert.strictEqual(sparse.recognizedElectrical,false);

// Date parsing and epoch normalization.
assert.strictEqual(pt(1700000000),1700000000000);
assert(Number.isNaN(pt('31/02/2026 12:00')));

// Wye and Delta conversions, and re-derivation from source values.
let one=normalize([{Timestamp:'2026-11-07T12:00:00Z',V_R:230,I_R:10,kW:2,kVAR:-1,PF:0.89}],['Timestamp','V_R','I_R','kW','kVAR','PF']);
assert.strictEqual(one.rows.length,1);
assert(Math.abs(one.rows[0].VRY-230*Math.sqrt(3))<1e-8);
assert.strictEqual(one.rows[0].IRp,10);
assert.strictEqual(one.rows[0].lead,true);
let wyeAgain=derive({VRY:415,IR:17.320508});
let asDelta=derive(wyeAgain,{topology:'delta'});
assert.strictEqual(asDelta.VR,415);
assert(Math.abs(asDelta.IRp-10)<1e-6);
let backToWye=derive(asDelta,{topology:'wye4'});
assert(Math.abs(backToWye.VR-415/Math.sqrt(3))<1e-8);
assert(Math.abs(backToWye.IRp-17.320508)<1e-6);
let delta=derive({IR:17.320508,VRY:400},{topology:'delta'});
assert(Math.abs(delta.IRp-10)<1e-6);
assert.strictEqual(delta.VR,400);
let measuredNeutral=derive({INm:7.5});
assert.strictEqual(measuredNeutral.IN,7.5);

// Power triangle and signed reactive power.
let p=derive({kW:3,kVAR:-4});
assert.strictEqual(p.kVA,5);
assert.strictEqual(p.lead,true);
assert.strictEqual(p.PF,-0.6);
let pfOnly=derive({kVA:10,PF:-0.8});
assert.strictEqual(pfOnly.kW,8);
assert.strictEqual(pfOnly.kVAR,-6);
let pAndPf=derive({kW:8,PF:-0.8});
assert.strictEqual(pAndPf.kVA,10);
assert.strictEqual(pAndPf.kVAR,-6);
let sAndQ=derive({kVA:10,kVAR:-6});
assert.strictEqual(sAndQ.kW,8);
assert.strictEqual(sAndQ.PF,-0.8);
let partialPower=derive({VR:230,IR:10});
assert.strictEqual(partialPower.kVA,undefined); // Do not estimate total 3-phase kVA from one phase only.

// Import report distinguishes direct, estimated, and absent signals.
const report=makeImportReport(flexible);
assert(report.imported>0);
assert(report.ignoredFields.includes('THD V R (%)'));
const reReport=refreshImportReport(report,flexible.rows);
assert.strictEqual(reReport.imported,report.imported);

// Trapezoidal energy and large-file multi-signal extrema retention.
let e=calcEnergy([{t:0,kW:10,kVAR:-4,kVA:12},{t:3600000,kW:20,kVAR:-2,kVA:22}]);
assert.strictEqual(e.kWh,15);
assert.strictEqual(e.kVArh,-3);
const noEnergy=calcEnergy([{t:0},{t:60000}]);
assert.strictEqual(noEnergy.kWh,null);
assert.strictEqual(noEnergy.kVArh,null);
assert.strictEqual(noEnergy.maxKVA,null);
const syntheticTimeEnergy=calcEnergy([{t:0,kW:4,kVAR:2,kVA:5},{t:3600000,kW:4,kVAR:2,kVA:5}],false);
assert.strictEqual(syntheticTimeEnergy.kWh,null);
assert.strictEqual(syntheticTimeEnergy.kVArh,null);
let rows=Array.from({length:65001},(_,i)=>({t:i,kW:i===32000?100:1,VRY:i===32001?100:230,IR:i===32002?500:10}));
let reduced=ds(rows,300,['kW','VRY','IR']);
assert(reduced.length<65001);
assert(reduced.some(r=>r.kW===100));
assert(reduced.some(r=>r.VRY===100));
assert(reduced.some(r=>r.IR===500));
assert.strictEqual(st([{x:1},{x:3}],'x').avg,2);

/* ===================== v5 regression tests ===================== */
// A/B/C phase naming must land in R/Y/B slots (previously Ib->IB, Ic dropped, Va/Vc unmapped).
{
  const o=normalize([{Time:'2026-11-08 10:00:00',Va:240,Vb:239,Vc:241,Ia:10,Ib:11,Ic:12}],['Time','Va','Vb','Vc','Ia','Ib','Ic']);
  assert.deepStrictEqual([o.rows[0].VR,o.rows[0].VY,o.rows[0].VB],[240,239,241]);
  assert.deepStrictEqual([o.rows[0].IR,o.rows[0].IY,o.rows[0].IB],[10,11,12]);
  const ryb=normalize([{VR:230,VY:231,VB:232,IR:1,IY:2,IB:3}],['VR','VY','VB','IR','IY','IB']);
  assert.deepStrictEqual([ryb.rows[0].VY,ryb.rows[0].IB],[231,3]); // R/Y/B files are untouched
  const mm=normalize([{'Voltage L1-N (V)':230,'Voltage L1-N Max (V)':250}],['Voltage L1-N Max (V)','Voltage L1-N (V)']);
  assert.strictEqual(mm.rows[0].VR,230); // Min/Max statistic columns are never mapped as the RMS channel
}
// Date formats: month-first detection, Excel serials, 12-hour clocks, Y/M/D, ns/us epochs.
assert.strictEqual(detectDateOrder([{d:'12/25/2026'},{d:'01/02/2026'}],'d'),'mdy');
assert.strictEqual(detectDateOrder([{d:'25/12/2026'}],'d'),'dmy');
assert.strictEqual(detectDateOrder([{d:'01/02/2026'}],'d'),'dmy');
{
  const us=normalize([{Timestamp:'12/25/2026 10:00:00',kW:1},{Timestamp:'12/25/2026 10:00:10',kW:1}],['Timestamp','kW']);
  assert.strictEqual(us.hasTimestamp,true);assert.strictEqual(us.dateOrder,'mdy');
  assert.strictEqual(new Date(us.rows[0].t).getMonth(),11);
}
assert.strictEqual(new Date(pt(46334.5)).getHours(),12);                // Excel serial keeps local wall-clock time
assert.strictEqual(new Date(pt(46334.5)).getFullYear(),2026);
assert.strictEqual(new Date(pt('08/11/2026 01:30 PM')).getHours(),13);
assert.strictEqual(new Date(pt('2026/11/08 07:00:00')).getHours(),7);
assert.strictEqual(pt(1700000000000000),1700000000000);                 // microseconds
assert.strictEqual(pt(1700000000000000000),1700000000000);              // nanoseconds
{ // time-only column rolls the day over at midnight
  const o=normalize([{Time:'23:59:58',kW:1},{Time:'23:59:59',kW:1},{Time:'00:00:01',kW:1}],['Time','kW']);
  assert.strictEqual(o.hasTimestamp,true);assert.strictEqual(o.timeOnly,true);
  assert(o.rows[2].t>o.rows[1].t&&o.rows[2].t-o.rows[1].t===2000);
}
// Timestamp integrity: unreadable stamps never poison the time axis or enable fake energy.
{
  const p=normalize([{Timestamp:'2026-11-08T10:00:00Z',kW:1},{Timestamp:'garbage',kW:2},{Timestamp:'2026-11-08T10:00:02Z',kW:3}],['Timestamp','kW']);
  assert(p.rows[2].t-p.rows[0].t<=2000);assert.strictEqual(p.badTimestamps,1);assert.strictEqual(p.hasTimestamp,true);
  const q=normalize([{Timestamp:'x',kW:1},{Timestamp:'y',kW:1}],['Timestamp','kW']);
  assert.strictEqual(q.hasTimestamp,false);
}
// Neutral: Delta has no neutral estimate; measured value is still honoured.
assert.strictEqual(derive({IR:10,IY:12,IB:9},{topology:'delta'}).IN,undefined);
assert(derive({IR:10,IY:12,IB:9},{topology:'wye4'}).IN>0);
assert.strictEqual(derive({IR:10,IY:12,IB:9,INm:3},{topology:'delta'}).IN,3);
// PF sign is always consistent with Q (lead => negative), so trend and stats never disagree.
assert.strictEqual(derive({kW:9,kVAR:-4,PF:0.9}).PF,-0.9);
assert.strictEqual(derive({kW:9,kVAR:4,PF:-0.9}).PF,0.9);
assert.strictEqual(derive({kW:9,kVAR:-4,PF:0.9}).PFa,0.9);
{ // averaging signed PF cancels; magnitude statistics do not
  const rs=[{PF:0.9},{PF:-0.9}];
  assert.strictEqual(st(rs,'PF').avg,0);
  assert.strictEqual(st(rs,'PF',true).avg,0.9);
}
// VUF/IUF: exact sequence ratio from three magnitudes, cross-checked against explicit phasor math.
{
  const seqRef=(a,b,c)=>{ // closed triangle with B lagging A (positive ABC rotation), then Fortescue
    const cosPhi=(c*c-a*a-b*b)/(2*a*b),phi=Math.acos(cosPhi);
    const A=[a,0],B=[b*Math.cos(phi),-b*Math.sin(phi)],Cc=[-(A[0]+B[0]),-(A[1]+B[1])];
    const rot=(v,deg)=>{const t=deg*Math.PI/180;return [v[0]*Math.cos(t)-v[1]*Math.sin(t),v[0]*Math.sin(t)+v[1]*Math.cos(t)]};
    const sum=(...v)=>[v.reduce((s,x)=>s+x[0],0)/3,v.reduce((s,x)=>s+x[1],0)/3];
    const v1=sum(A,rot(B,120),rot(Cc,240)),v2=sum(A,rot(B,240),rot(Cc,120));
    return 100*Math.hypot(...v2)/Math.hypot(...v1);
  };
  for(const [a,b,c] of [[415,400,430],[415,415,415],[420,410,380],[233,240,251],[100,60,70]])
    assert(Math.abs(seqUnbalance(a,b,c)-(a===b&&b===c?0:seqRef(a,b,c)))<1e-6,[a,b,c].join());
  assert.strictEqual(seqUnbalance(415,415,415),0);
  assert.strictEqual(seqUnbalance(100,10,10),null);       // triangle cannot close -> not a valid sequence result
  assert.strictEqual(seqUnbalance(null,1,1),null);
  const m=derive({VRY:415,VYB:400,VBR:430});
  assert(Math.abs(m.VUF-seqRef(415,400,430))<1e-6);
  assert(Math.abs(m.VUFp-100*15/415)<1e-9); // NEMA proxy: max|V-Vavg|/Vavg, Vavg=415
  assert.strictEqual(derive({VR:240,VY:230,VB:250}).VUF,null); // never from synthesized line-to-line values
  assert(derive({IR:100,IY:90,IB:110},{topology:'delta'}).IUF>0);
}
// Downsampler keeps dropouts: null runs and time gaps stay visible after decimation.
{
  const rs=Array.from({length:6000},(_,i)=>({t:i*1000,kW:(i>2000&&i<3000)?null:5+Math.sin(i/50)}));
  const idx=dsIdx(rs,300,['kW'],gapOf(rs));
  assert(idx.some(i=>rs[i].kW==null),'null rows must survive decimation');
  assert(idx.some((i,j)=>j>0&&idx[j-1]===2000&&i===2001),'gap boundary rows kept');
  const g=Array.from({length:6000},(_,i)=>({t:i<3000?i*1000:i*1000+3.6e6,kW:5+Math.sin(i/50)}));
  const gi=dsIdx(g,300,['kW'],gapOf(g));
  assert(gi.includes(2999)&&gi.includes(3000),'time-gap boundary rows kept');
}
// Energy: exact zero-crossing split, kVAh and energy-weighted PF.
{
  const e2=calcEnergy([{t:0,kW:10,kVAR:5,kVA:11.18},{t:3600000,kW:-10,kVAR:-5,kVA:11.18}]);
  assert(Math.abs(e2.kWh)<1e-9);                       // net cancels
  assert(Math.abs(e2.kWhImp-2.5)<1e-9&&Math.abs(e2.kWhExp-2.5)<1e-9); // each half-hour triangle: 0.5*10*0.5
  assert(Math.abs(e2.kVArhInd-1.25)<1e-9&&Math.abs(e2.kVArhCap-1.25)<1e-9);
  assert(Math.abs(e2.pfw-5/11.18)<1e-9); // ∫|P|dt=5 kWh, ∫S dt=11.18 kVAh
  const e3=calcEnergy([{t:0,kW:8,kVAR:6,kVA:10},{t:3600000,kW:8,kVAR:6,kVA:10}]);
  assert(Math.abs(e3.pfw-0.8)<1e-9);assert.strictEqual(e3.kVAh,10);
}
console.log('All v4 + v5 regression tests passed (header/ABC mapping, dates, PF sign, VUF/IUF, Wye/Delta, gaps, energy, 65,001-row peaks).');
