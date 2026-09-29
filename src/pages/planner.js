/**
 * Mission / cargo planner page.
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */
import { DB, STATE } from '../core/store.js';
import { LOGI_LABELS } from './logistics.js';
import { sourceBadge } from '../ui/shell.js';
import { clamp, fmt1 } from '../utils/helpers.js';

export function renderPlanner(){
  const stKey = STATE.selectedStation==='ALL' ? 'MAITRI' : STATE.selectedStation;
  const st = DB.stations[stKey];
  const mp = STATE.plannerInput || (STATE.plannerInput = { capacity:10, personnel:12, resupplyDate:24 });
  const cargo = computeCargoPlan(st, mp);
  return `
  <div class="page-head"><div><h1>Mission Planner</h1><div class="page-sub">Resupply planning for ${st.label} ${sourceBadge('SIMULATED')}</div></div></div>
  <div class="two-col">
    <div class="card">
      <h3>Inputs</h3>
      <div class="slider-row"><label>Cargo capacity (t)</label><input type="range" min="2" max="20" value="${mp.capacity}" id="mp-capacity"><span class="val mono">${mp.capacity}</span></div>
      <div class="slider-row"><label>Personnel</label><input type="range" min="4" max="40" value="${mp.personnel}" id="mp-personnel"><span class="val mono">${mp.personnel}</span></div>
      <div class="slider-row"><label>Resupply in (days)</label><input type="range" min="3" max="60" value="${mp.resupplyDate}" id="mp-date"><span class="val mono">${mp.resupplyDate}</span></div>
      <div class="small-note">Weather forecast: ${fmt1(st.env.temp)}°C, wind ${fmt1(st.env.wind)} km/h — ${st.env.wind>45?'marginal for flight operations':'suitable for planned resupply window'}.</div>
    </div>
    <div class="card">
      <h3>Recommended Cargo</h3>
      ${cargo.items.map(it=>`<div class="metric-row"><span>${it.name}</span><b>${it.tonnes} t</b></div>`).join('')}
      <div class="metric-row" style="border-top:1px solid var(--line);margin-top:6px;padding-top:8px;"><span>Total</span><b>${cargo.total} / ${mp.capacity} t</b></div>
      <div class="progress" style="margin-top:8px;"><div style="width:${clamp((cargo.total/mp.capacity)*100,0,100)}%"></div></div>
    </div>
  </div>
  <div class="card" style="margin-top:16px;">
    <h3>Logistics Priority (feeding this plan)</h3>
    <table><thead><tr><th>Item</th><th>Current</th><th>Days Remaining</th><th>Priority</th></tr></thead><tbody>
    ${Object.entries(st.logistics).map(([k,v])=>`<tr><td><b>${LOGI_LABELS[k]}</b></td><td>${fmt1(v.qty)}${v.unit}</td><td>${fmt1(v.qty/(v.rate/40))} d</td><td><span class="chip">${v.priority}</span></td></tr>`).join('')}
    </tbody></table>
  </div>
  `;
}
export function computeCargoPlan(st, mp){
  const fuelNeed = clamp((100-st.logistics.fuel.qty)/100 * mp.capacity * 0.55, 0.5, mp.capacity*0.6);
  const foodNeed = clamp(mp.personnel*mp.resupplyDate*0.0018, 0.3, mp.capacity*0.3);
  const sparesNeed = clamp((100-st.buildings.find(b=>b.id==='gen').health)/100*3+0.6,0.4,mp.capacity*0.25);
  const medicalNeed = clamp(mp.personnel*0.02,0.2,mp.capacity*0.1);
  const scienceNeed = clamp(mp.capacity*0.08,0.2,mp.capacity*0.15);
  let items = [
    {name:'Fuel', tonnes:fmt1(fuelNeed)}, {name:'Food', tonnes:fmt1(foodNeed)},
    {name:'Spare parts', tonnes:fmt1(sparesNeed)}, {name:'Medical', tonnes:fmt1(medicalNeed)}, {name:'Scientific supplies', tonnes:fmt1(scienceNeed)},
  ];
  let total = items.reduce((a,b)=>a+b.tonnes,0);
  if(total>mp.capacity){ const s = mp.capacity/total; items = items.map(i=>({name:i.name,tonnes:fmt1(i.tonnes*s)})); total = fmt1(items.reduce((a,b)=>a+b.tonnes,0)); }
  return { items, total: fmt1(total) };
}

/* ========================= MAINTENANCE ========================= */
