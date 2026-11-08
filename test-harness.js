const fs=require('fs'),vm=require('vm'),assert=require('assert');
const src=fs.readFileSync(__dirname+'/app.js','utf8').replace(/ReactDOM\.createRoot\([\s\S]*$/,'');
const React={createElement(){},useState(){},useRef(){},useEffect(){},useMemo(){}};
const ctx={React,htm:()=>function(){return null},Chart:undefined,console,Date,Math,Number,String,Set,Map,location:{hash:''}};
vm.createContext(ctx);
vm.runInContext(src+'\nglobalThis.test={normalize,derive,toNum,pt,ds,calcEnergy,st,makeImportReport,refreshImportReport,headerUnit,norm};',ctx);
const {normalize,derive,toNum,pt,ds,calcEnergy,st,makeImportReport,refreshImportReport,headerUnit,norm}=ctx.test;

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
