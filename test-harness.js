const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/app.js','utf8').replace(/ReactDOM\.createRoot\([\s\S]*$/,'');
const React={createElement(){},useState(){},useRef(){},useEffect(){},useMemo(){}};
const ctx={React,htm:()=>function(){return null},Chart:undefined,console,Date,Math,Number,String,Set,Map,location:{hash:''}};
vm.createContext(ctx);
vm.runInContext(src+'\nglobalThis.test={normalize,derive,toNum,pt,ds,calcEnergy,st,makeImportReport,refreshImportReport,headerUnit,norm,calcPowerWindowTotals,repairCsvText,availability,summarizeImport,detectPhaseScheme};',ctx);
const {normalize,derive,toNum,pt,ds,calcEnergy,st,makeImportReport,refreshImportReport,headerUnit,norm,calcPowerWindowTotals,repairCsvText,availability,summarizeImport,detectPhaseScheme}=ctx.test;

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
assert.strictEqual(new Date(flexible.rows[0].t).getHours(),7);

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
assert.strictEqual(phaseOnly.rows[0].IR,10);

// Sparse/unsupported and single-row CSV handling.
let sparse=normalize([{Timestamp:'2026-11-07T12:00:00Z',Misc:'x'}],['Timestamp','Misc']);
assert.strictEqual(sparse.rows.length,1);
assert.strictEqual(sparse.rows[0].kW,undefined);
assert.strictEqual(sparse.recognizedElectrical,false);

// Date parsing and epoch normalization.
assert.strictEqual(pt(1700000000),1700000000000);
assert.strictEqual(pt(1700000000000000000),1700000000000); // Nanosecond epoch support
assert.strictEqual(pt('1700000000'),1700000000000);          // Stringified epoch support
assert(Number.isFinite(pt(45238.5)));                        // Excel serial date support
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

// Power triangle, signed reactive power, and PF overshoot near unity.
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
assert.strictEqual(partialPower.kVA,undefined);
let unityOvershoot=derive({PF:1.002});
assert.strictEqual(unityOvershoot.PF,1); // Clamps minor ADC overshoot to 1 instead of dividing by 100
let zeroActiveLead=derive({kW:0,kVAR:-5});
assert.strictEqual(Object.is(zeroActiveLead.PF,-0),false); // Avoids -0

// Import report distinguishes direct, estimated, empty, and absent signals.
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
console.log('All flexible-header, unit-conversion, extra-column, Date+Time, Wye/Delta, power, energy, and 65,001-row regression tests passed.');

// Additional v5 audit verification tests:
assert.strictEqual(norm('VRY_V'),'vry');
assert.strictEqual(norm('IR_A'),'ir');
assert.strictEqual(norm('I-A'),'ia');
assert.strictEqual(norm('cos φ'),'cosphi');
assert.strictEqual(toNum('0,985'),0.985);
assert.strictEqual(toNum('OL'),null);
assert.strictEqual(st([{PF:0.95},{PF:-0.95}],'PF').avg,0.95);
let qAndPf=derive({kVAR:-6,PF:-0.8});
assert(Math.abs(qAndPf.kVA-10)<1e-9);
assert(Math.abs(qAndPf.kW-8)<1e-9);

const near=(a,b,e=1e-9)=>Math.abs(a-b)<e;
// Regression for fixed bugs.
{
  const rows=Array.from({length:120},(_,i)=>({t:i*1000,kW:10,kVAR:0,kVA:10}));
  rows.splice(60,0,{t:59000+30000,kW:10,kVAR:0,kVA:10}); rows.sort((a,b)=>a.t-b.t);
  const tot=calcPowerWindowTotals(rows,true);
  assert(tot.netKWh<(119*1000/36e5)*10+1e-9);
  const d=derive({VB:240});assert(near(d.VBR,240*Math.sqrt(3)));
}
console.log('Energy-gap and derive regression tests passed.');

// ---------- v7: datalogger-style files (device prefixes, broken header, blank rows, partial channels) ----------
{
  const hdr='TIME;Dev A > Voltage L1-N;Dev A > Apparent current, L1;Dev A > Cos; UL1 IL1;Dev B > VRN;Dev B > VYN;Dev B > VBN;Dev B > FQ_TEST;Dev B > Avg PF';
  const ln=(t,a,b,c,d,e,f,g,h)=>[t,a,b,c,d,e,f,g,h].join(';');
  const text=[hdr,ln('15/06/2026 16:00:00','','','','225.5','225.6','225.4','49.9','1.00'),ln('15/06/2026 16:00:01','','','','225.7','225.6','225.5','50.0','1.00'),
    ln('24/07/2026 11:20:27','','','','','','','',''),ln('24/07/2026 11:20:28','','','','','','','','')].join('\r\n');
  const fix=repairCsvText(text);
  assert.strictEqual(fix.delimiter,';');assert.strictEqual(fix.repaired,1);
  const head=fix.text.split('\n')[0].split(';');assert.strictEqual(head.length,9);
  assert.strictEqual(head[3],'Dev A > Cos UL1 IL1');
  assert.strictEqual(repairCsvText('a,b,c\n1,2,3').repaired,0);
  const lines=fix.text.split('\n'),fields=lines[0].split(';');
  const data=lines.slice(1).map(l=>{const v=l.split(';'),o={};fields.forEach((k,i)=>{const x=v[i].trim();o[k]=x===''?null:(/^[\d.]+$/.test(x)?+x:x)});return o});
  const o=normalize(data,fields,{topology:'wye4',assumeBalanced:true});
  assert.strictEqual(o.rows.length,2);assert.strictEqual(o.blankRowsDropped,2);
  assert.strictEqual(o.rows[0].VR,225.5);
  assert.strictEqual(o.rows[0].Hz,49.9);assert.strictEqual(o.rows[0].PF,1);
  assert(o.hasTimestamp&&new Date(o.rows[0].t).getDate()===15);
  const av=availability(o.rows);
  assert(av.voltage&&av.pf&&av.freq&&!av.current&&!av.pq);
  assert(av.pages.voltage&&av.pages.power&&!av.pages.current);
  const sum=summarizeImport(o,{name:'x.csv',repaired:1});
  assert.strictEqual(sum.found.map(x=>x[0]).join(),'Voltage,Power factor,Frequency');
  assert.strictEqual(sum.found[0][1].join(),'V_R,V_Y,V_B');
  assert.strictEqual(sum.derived[0][1].join(),'V_RY line voltage,V_YB line voltage,V_BR line voltage');
  assert.strictEqual(sum.missing.join(),'Current,Active / reactive / apparent power');
  assert(sum.show&&sum.notes.some(n=>/test/i.test(n)));
  assert.strictEqual(sum.span,'1 s');
  const rep2=makeImportReport(o);assert(rep2.mappedFields.some(m=>m.hasData===false));
  assert(rep2.signals.some(s=>s.key==='IR'&&s.status==='empty')); // Mapped but empty column reports 'empty' status
  const vOnly=normalize([{VR:230,VY:231,VB:229}],['VR','VY','VB']);
  assert(availability(vOnly.rows).pages.voltage&&!availability(vOnly.rows).pages.current&&!availability(vOnly.rows).pages.power);
  const iOnly=normalize([{IR:10,IY:11,IB:9}],['IR','IY','IB']);
  assert(availability(iOnly.rows).pages.current&&!availability(iOnly.rows).pages.voltage);
  assert(!summarizeImport(vOnly,{}).found.some(x=>x[0]==='Current'));
}
console.log('All v7 datalogger-format tests passed.');

// ---------- v8: Elspec-style trend export (avg/min/max columns, mm:ss-only Start, unit-less W/VA/var) ----------
{
  const f=['Start(India Standard Time)','Stop(India Standard Time)','Trend_Period','FlaggingStatus','Vrms_AN_avg','Vrms_AN_min','Vrms_AN_max','Vrms_AB_avg','Irms_A_avg','Irms_N_avg','PowerP_Total_avg','PowerS_Total_avg','PowerQfund_Total_avg','PfCapInd_Total_avg','Frequency_avg'];
  const row=(a,b,v)=>Object.fromEntries(f.map((k,i)=>[k,[a,b,30,'----',v,v-1,v+1,415,100,20,100000,110000,-40000,-0.95,50][i]]));
  const data=[row('00:00.0','00:30.0',240),row('00:30.0','01:00.2',241),row('01:00.2','01:30.1',242)];
  const name='ES_238_X_1_WK__SN_1__260817_1500_trend.csv';
  const o=normalize(data,f,{fileName:name});
  assert.strictEqual(o.profile,'elspec');
  assert.strictEqual(o.rows[0].VR,240);
  assert.strictEqual(o.rows[0].kW,100);assert.strictEqual(o.rows[0].kVA,110);assert.strictEqual(o.rows[0].kVAR,-40);
  assert.strictEqual(o.rows[0].PF,-0.95);assert.strictEqual(o.rows[0].lead,true);
  assert(o.hasTimestamp&&o.rebuilt&&o.rebuilt.period===30);
  const d0=new Date(o.rows[0].t);assert(d0.getFullYear()===2026&&d0.getMonth()===7&&d0.getDate()===17&&d0.getHours()===15&&d0.getMinutes()===0);
  assert.strictEqual(o.rows[1].t-o.rows[0].t,30000);assert.strictEqual(o.rows[2].t-o.rows[1].t,30000);
  const tot=calcPowerWindowTotals(o.rows,o.hasTimestamp);
  assert(Math.abs(tot.netKWh-100*60/3600)<1e-9);
  const nf=normalize(data,f,{});
  assert(!nf.hasTimestamp&&!nf.rebuilt);
  const sm=summarizeImport(o,{name});
  assert(sm.notes.some(n=>/rebuilt/.test(n))&&sm.notes.some(n=>/W \/ var \/ VA/.test(n))&&sm.notes.some(n=>/min\/max/.test(n)));
  assert.strictEqual(sm.missing.length,0);
  assert.strictEqual(summarizeImport(normalize([{VR:230,VY:231,VB:229}],['VR','VY','VB']),{}).span,null);
}
console.log('All v8 trend-export tests passed.');

// ---------- v9: A/B/C vs R/Y/B phase scheme disambiguation, VA header collision & European CSV repair ----------
{
  // 1. Bare VA column maps to apparent power (kVA, scaled from VA), not Phase-A voltage.
  const vaPower=normalize([{W:5000,var:2000,VA:5385.16}],['W','var','VA']);
  assert.strictEqual(vaPower.rows[0].kW,5);
  assert.strictEqual(vaPower.rows[0].kVAR,2);
  assert(near(vaPower.rows[0].kVA,5.38516));
  assert.strictEqual(vaPower.rows[0].VR,undefined);

  // 2. A/B/C voltage triplet (Va, Vb, Vc) maps to VR, VY, VB in order without dropping Vc or mapping Vb to blue phase.
  const abcV=normalize([{Va:230,Vb:231,Vc:232}],['Va','Vb','Vc']);
  assert.strictEqual(abcV.rows[0].VR,230);
  assert.strictEqual(abcV.rows[0].VY,231);
  assert.strictEqual(abcV.rows[0].VB,232);

  // 3. A/B/C voltage triplet (V_A, V_B, V_C) alongside bare VA apparent power column maps both correctly.
  const abcAndVA=normalize([{V_A:230,V_B:231,V_C:232,VA:15000}],['V_A','V_B','V_C','VA']);
  assert.strictEqual(abcAndVA.rows[0].VR,230);
  assert.strictEqual(abcAndVA.rows[0].VY,231);
  assert.strictEqual(abcAndVA.rows[0].VB,232);
  assert.strictEqual(abcAndVA.rows[0].kVA,15);

  // 4. R/Y/B currents ordered IR, IB, IY (or missing IY) never let IY steal IB.
  const rybReordered=normalize([{IR:10,IB:30,IY:20}],['IR','IB','IY']);
  assert.strictEqual(rybReordered.rows[0].IR,10);
  assert.strictEqual(rybReordered.rows[0].IY,20);
  assert.strictEqual(rybReordered.rows[0].IB,30);

  // 5. A/B/C currents (IA, IB, IC) map IB to Phase 2 (IY) and IC to Phase 3 (IB).
  const abcCurrents=normalize([{IA:10,IB:20,IC:30}],['IA','IB','IC']);
  assert.strictEqual(abcCurrents.rows[0].IR,10);
  assert.strictEqual(abcCurrents.rows[0].IY,20);
  assert.strictEqual(abcCurrents.rows[0].IB,30);

  // 6. Semicolon-delimited CSV with European decimal commas in every cell still selects ';' as delimiter.
  const euroCsv='TIME;VRN;VYN;VBN\n15/06/2026 16:00:00;225,5;226,1;224,9\n15/06/2026 16:00:01;225,7;226,0;225,1';
  const euroFix=repairCsvText(euroCsv);
  assert.strictEqual(euroFix.delimiter,';');
}
console.log('All v9 phase-scheme, VA-collision, and European-CSV delimiter tests passed.');
