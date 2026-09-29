/**
 * Guided demo sequence.
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */
import { DB, STATE, pushAudit, seedStation } from '../core/store.js';
import { runRestoreSequence } from './emergency.js';
import { buildSimResult, renderSimResult } from '../pages/whatIf.js';
import { activateScenario } from '../simulator/scenarios.js';
import { NAV, render } from '../ui/shell.js';
import { toast } from '../ui/toast.js';
import { now } from '../utils/helpers.js';

export const DEMO_SEQUENCE = [
  {label:'Starting normal station view', action:()=>{ STATE.selectedStation='ALL'; STATE.route='command'; render(); }},
  {label:'Showing Maitri', action:()=>{ STATE.selectedStation='MAITRI'; STATE.route='overview'; render(); }},
  {label:'Showing Bharati', action:()=>{ STATE.selectedStation='BHARATI'; STATE.route='overview'; render(); }},
  {label:'Opening 3D Digital Twin', action:()=>{ STATE.route='twin'; render(); }},
  {label:'Injecting extreme cold at Bharati', action:()=>{ activateScenario('BHARATI','extreme_cold'); render(); }},
  {label:'Showing energy impact', action:()=>{ STATE.route='energy'; render(); }},
  {label:'Showing fuel impact', action:()=>{ STATE.route='logistics'; render(); }},
  {label:'Showing AI prediction', action:()=>{ STATE.route='risk'; render(); }},
  {label:'Injecting generator anomaly', action:()=>{ const g=DB.stations.BHARATI.generators[1]; g.vibration=6.4; g.runtime=8200; render(); }},
  {label:'Showing cascading risk', action:()=>{ STATE.route='risk'; render(); }},
  {label:'Opening What-If Simulator', action:()=>{ STATE.route='whatif'; STATE.whatIfScenario='generator_failure'; render(); }},
  {label:'Simulating generator failure', action:()=>{ const stKey='BHARATI'; STATE.lastSimResult = buildSimResult(stKey,'generator_failure'); render(); document.getElementById('simResultWrap') && (document.getElementById('simResultWrap').innerHTML = renderSimResult(STATE.lastSimResult)); }},
  {label:'Showing recommended response', action:()=>{ /* already visible in sim result */ }},
  {label:'Simulating satellite communication loss', action:()=>{ STATE.commsConnected=false; STATE.route='comms'; render(); }},
  {label:'Showing offline operation', action:()=>{ /* comms page already shows ACTIVE/PAUSED */ }},
  {label:'Restoring connection', action:()=>{ DB.syncQueue.push(...Array.from({length:20}).map(()=>({station:'BHARATI',ts:now()}))); runRestoreSequence(); }},
  {label:'Showing synchronization', action:()=>{}},
  {label:'Opening Mission Planner', action:()=>{ STATE.route='planner'; STATE.selectedStation='BHARATI'; render(); }},
  {label:'Showing resupply recommendation', action:()=>{}},
];

export function startDemo(){
  if(STATE.demoRunning) return;
  STATE.demoRunning = true;
  STATE.demoStep = 0;
  pushAudit('Demo mode started','');
  toast('Demo sequence running…');
  runDemoStep();
}
export function runDemoStep(){
  if(!STATE.demoRunning || STATE.demoStep>=DEMO_SEQUENCE.length){ STATE.demoRunning=false; return; }
  const step = DEMO_SEQUENCE[STATE.demoStep];
  toast('Demo: '+step.label);
  try{ step.action(); }catch(e){ console.error(e); }
  STATE.demoStep++;
  STATE.demoTimer = setTimeout(runDemoStep, 3400);
}
export function resetDemo(){
  STATE.demoRunning = false;
  if(STATE.demoTimer) clearTimeout(STATE.demoTimer);
  Object.keys(DB.stations).forEach(k=> DB.stations[k]=null);
  DB.stations.MAITRI = seedStation('MAITRI','Maitri Station',{lat:-70.76,lon:11.73},{baseTemp:-14,baseSolar:180,baseLoad:210,fuelQty:63,fuelRate:0.55});
  DB.stations.BHARATI = seedStation('BHARATI','Bharati Station',{lat:-69.41,lon:76.19},{baseTemp:-9,baseSolar:210,baseLoad:230,fuelQty:43,fuelRate:0.71});
  DB.alerts = []; DB.auditLog = []; DB.syncQueue = [];
  STATE.selectedStation='ALL'; STATE.route='command'; STATE.commsConnected=true; STATE.emergencyActive=false;
  STATE.whatIfScenario=null; STATE.lastSimResult=null; STATE.assistantLog=[]; STATE.plannerInput=null;
  document.getElementById('emergencyOverlay').classList.remove('show');
  toast('Demo reset.','ok');
  render();
}

/* ========================= ROLES, NAV HISTORY, LOGIN ========================= */
