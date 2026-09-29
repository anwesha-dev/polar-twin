/**
 * What-If simulation page.
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */
import { DB, STATE } from '../core/store.js';
import { projectStationForward } from '../simulator/engine.js';
import { SCENARIOS } from '../simulator/scenarios.js';
import { sourceBadge } from '../ui/shell.js';
import { clamp, fmt1, rand } from '../utils/helpers.js';

export function renderWhatIf(){
  const stKey = STATE.selectedStation==='ALL' ? 'MAITRI' : STATE.selectedStation;
  const st = DB.stations[stKey];
  const p = STATE.whatIfParams;
  const sel = STATE.whatIfScenario;
  return `
  <div class="page-head"><div><h1>Antarctic Scenario Simulator</h1><div class="page-sub">Modelling station: <b>${st.label}</b> — switch station from the top bar ${sourceBadge('SIMULATED')}</div></div></div>
  <div class="card" style="margin-bottom:16px;">
    <h3>Select Scenario</h3>
    <div class="scenario-grid">
      ${Object.entries(SCENARIOS).map(([key,s])=>`
        <button class="scenario-btn ${sel===key?'selected':''}" data-scenario="${key}">${s.label}<small>${s.desc}</small></button>
      `).join('')}
    </div>
  </div>
  <div class="two-col">
    <div class="card">
      <h3>Custom Parameters</h3>
      <div class="slider-row"><label>Temperature (°C)</label><input type="range" min="-45" max="0" value="${p.temp}" id="wif-temp"><span class="val mono">${p.temp}</span></div>
      <div class="slider-row"><label>Wind (km/h)</label><input type="range" min="0" max="120" value="${p.wind}" id="wif-wind"><span class="val mono">${p.wind}</span></div>
      <div class="slider-row"><label>Fuel reserve (%)</label><input type="range" min="0" max="100" value="${p.fuel}" id="wif-fuel"><span class="val mono">${p.fuel}</span></div>
      <div class="slider-row"><label>Generator health (%)</label><input type="range" min="0" max="100" value="${p.genHealth}" id="wif-gen"><span class="val mono">${p.genHealth}</span></div>
      <div class="slider-row"><label>Power demand (kW)</label><input type="range" min="100" max="400" value="${p.powerDemand}" id="wif-power"><span class="val mono">${p.powerDemand}</span></div>
      <div class="slider-row"><label>Resupply delay (days)</label><input type="range" min="0" max="30" value="${p.resupplyDelay}" id="wif-delay"><span class="val mono">${p.resupplyDelay}</span></div>
      <button class="btn primary" id="runSimBtn" ${sel?'':'disabled'}>SIMULATE</button>
    </div>
    <div class="card">
      <h3>Current → Predicted State</h3>
      <div class="metric-row"><span>Current fuel</span><b>${fmt1(st.logistics.fuel.qty)}%</b></div>
      <div class="metric-row"><span>Predicted fuel (24h)</span><b>${fmt1(clamp(st.logistics.fuel.qty - (sel? rand(3,9):1),0,100))}%</b></div>
      <div class="metric-row"><span>Current risk</span><b>${st.riskLevel}</b></div>
      <div class="metric-row"><span>Predicted risk</span><b>${sel? (sel==='combined_crisis'?'CRITICAL':'HIGH') : st.riskLevel}</b></div>
    </div>
  </div>
  <div id="simResultWrap">${STATE.lastSimResult ? renderSimResult(STATE.lastSimResult) : ''}</div>
  `;
}

export function renderSimResult(res){
  return `
  <div class="card" style="margin-top:16px;">
    <h3>Simulation: ${res.title}</h3>
    <div class="timeline">${res.steps.map(s=>`<div class="timeline-item"><div class="t">${s.t}</div><div class="d">${s.d}</div></div>`).join('')}</div>
    <div class="why-box" style="margin-top:14px;"><b>Recommended Response</b><ol>${res.actions.map(a=>`<li>${a}</li>`).join('')}</ol></div>
  </div>
  <div class="card" style="margin-top:16px;">
    <h3>Scenario Comparison</h3>
    <table><thead><tr><th>Strategy</th><th>Fuel Impact</th><th>Energy Impact</th><th>Operational Risk</th><th>Est. Endurance</th><th>Affected Systems</th></tr></thead><tbody>
    ${res.comparison.map(c=>`<tr><td><b>${c.name}</b></td><td>${c.fuel}</td><td>${c.energy}</td><td>${c.risk}</td><td>${c.endurance}</td><td>${c.affected}</td></tr>`).join('')}
    </tbody></table>
    <div class="small-note">These are trade-offs, not a ranked recommendation — the operator selects the strategy that fits the situation on the ground.</div>
  </div>`;
}

export function buildSimResult(stKey, scenario){
  const st = DB.stations[stKey];
  const steps = projectStationForward(st, scenario, STATE.whatIfParams, 24);
  const actionsByScenario = {
    generator_failure:['Activate backup generator','Reduce non-critical loads','Prioritize heating and communications','Inspect Generator #2','Recalculate resupply requirement'],
    extreme_cold:['Increase heating priority for critical modules','Reduce non-essential power draw','Monitor fuel burn rate hourly','Pre-position spare heating parts'],
    fuel_leak:['Isolate suspected tank section','Switch to secondary tank if available','Inspect fuel lines and seals','Advance resupply request'],
    water_pump_failure:['Switch to secondary pump','Ration non-essential water use','Schedule pump repair','Monitor storage tank levels'],
    storm:['Suspend outdoor operations','Secure loose equipment','Reroute non-critical power to heating','Reassess resupply flight window'],
    resupply_delay:['Re-rank resupply cargo by criticality','Extend rationing on low-priority items','Reassess endurance estimate','Notify logistics command'],
    comms_loss:['Confirm local monitoring & storage active','Continue AI inference on local data','Attempt secondary comms channel','Log all decisions for later sync'],
    combined_crisis:['Activate Emergency Mode','Triage by system criticality','Activate backup power and rationing simultaneously','Request emergency resupply assessment'],
  };
  const comparison = [
    {name:'Activate backup generator', fuel:'+18% burn', energy:'Stabilized', risk:'Reduced to MEDIUM', endurance: fmt1(st.endurance*0.92)+'d', affected:'Energy, Fuel'},
    {name:'Reduce non-critical loads', fuel:'+6% burn', energy:'Lower peak demand', risk:'Reduced to HIGH', endurance: fmt1(st.endurance*0.97)+'d', affected:'Energy, Comfort systems'},
    {name:'Emergency resupply', fuel:'No change', energy:'No change', risk:'Unchanged short-term', endurance: fmt1(st.endurance)+'d + resupply', affected:'Logistics'},
  ];
  return { title: SCENARIOS[scenario].label+' — '+st.label, steps, actions: actionsByScenario[scenario]||['Monitor and reassess.'], comparison };
}

/* ========================= MISSION PLANNER ========================= */
