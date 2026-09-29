/**
 * Delegated page event wiring.
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */
import { DB, STATE, pushAudit } from '../core/store.js';
import { runRestoreSequence, triggerEmergency } from '../features/emergency.js';
import { buildSimResult, renderSimResult } from '../pages/whatIf.js';
import { assistantAnswer } from './assistant.js';
import { initPageCharts } from './charts.js';
import { render } from './shell.js';
import { toast } from './toast.js';

export function wirePageEvents(){
  document.querySelectorAll('.env-tab').forEach(t=>t.addEventListener('click', e=>{
    document.querySelectorAll('.env-tab').forEach(x=>x.classList.remove('active')); t.classList.add('active');
  }));
  document.querySelectorAll('[data-scenario]').forEach(b=>b.addEventListener('click', ()=>{
    STATE.whatIfScenario = b.dataset.scenario; STATE.lastSimResult=null; render();
  }));
  const runBtn = document.getElementById('runSimBtn');
  if(runBtn) runBtn.addEventListener('click', ()=>{
    const stKey = STATE.selectedStation==='ALL' ? 'MAITRI' : STATE.selectedStation;
    STATE.lastSimResult = buildSimResult(stKey, STATE.whatIfScenario);
    pushAudit('Scenario created', `${STATE.whatIfScenario} projection on ${DB.stations[stKey].label}`);
    document.getElementById('simResultWrap').innerHTML = renderSimResult(STATE.lastSimResult);
    toast('Simulation complete.','ok');
  });
  ['temp','wind','fuel','gen','power','delay'].forEach(k=>{
    const map = {temp:'temp',wind:'wind',fuel:'fuel',gen:'genHealth',power:'powerDemand',delay:'resupplyDelay'};
    const el = document.getElementById('wif-'+k);
    if(el) el.addEventListener('input', ()=>{ STATE.whatIfParams[map[k]] = Number(el.value); el.parentElement.querySelector('.val').textContent = el.value; });
  });
  ['capacity','personnel','date'].forEach(k=>{
    const map={capacity:'capacity',personnel:'personnel',date:'resupplyDate'};
    const el = document.getElementById('mp-'+k);
    if(el) el.addEventListener('input', ()=>{ STATE.plannerInput[map[k]]=Number(el.value); render(); });
  });
  document.querySelectorAll('[data-ack]').forEach(b=>b.addEventListener('click', ()=>{
    const a = DB.alerts.find(x=>x.id===b.dataset.ack); if(a){ a.ack=true; pushAudit('Alert acknowledged', a.asset); render(); }
  }));
  document.querySelectorAll('[data-emergency-trigger]').forEach(b=>b.addEventListener('click', ()=>{
    triggerEmergency(b.dataset.emergencyTrigger);
  }));
  const simLoss = document.getElementById('simLossBtn');
  if(simLoss) simLoss.addEventListener('click', ()=>{
    STATE.commsConnected = false; pushAudit('Communication loss simulated','Operator triggered'); toast('Connection lost — local operation active.','err'); render();
  });
  const restore = document.getElementById('restoreBtn');
  if(restore) restore.addEventListener('click', runRestoreSequence);
  document.querySelectorAll('.q-chip').forEach(c=>c.addEventListener('click', ()=>{
    const q = c.dataset.q;
    STATE.assistantLog.push({role:'user', text:q});
    STATE.assistantLog.push({role:'bot', text:assistantAnswer(q)});
    render();
  }));
  initPageCharts();
}

