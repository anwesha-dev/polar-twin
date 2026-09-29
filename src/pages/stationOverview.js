/**
 * Station Overview page.
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */
import { SCENARIOS } from '../simulator/scenarios.js';
import { activeStations, riskColorClass, sourceBadge } from '../ui/shell.js';
import { fmt1 } from '../utils/helpers.js';

export function renderStationOverview(){
  const stations = activeStations();
  return `
  <div class="page-head"><div><h1>Station Overview</h1><div class="page-sub">Domain summary per station ${sourceBadge('SIMULATED')}</div></div></div>
  ${stations.map(st=>`
    <div class="card" style="margin-bottom:16px;">
      <div class="card-title-row"><h3 style="margin:0;font-size:14px;color:var(--text);text-transform:none;">${st.label}</h3><span class="status-pill ${riskColorClass(st.riskLevel)}">${st.riskLevel} RISK</span></div>
      <div class="grid g4">
        <div class="metric-row" style="display:block;"><div style="color:var(--text-faint);font-size:11px;">TEMPERATURE</div><b class="mono">${fmt1(st.env.temp)}°C</b></div>
        <div class="metric-row" style="display:block;"><div style="color:var(--text-faint);font-size:11px;">POWER DEMAND</div><b class="mono">${fmt1(st.energy.totalConsumption)} kW</b></div>
        <div class="metric-row" style="display:block;"><div style="color:var(--text-faint);font-size:11px;">FUEL RESERVE</div><b class="mono">${fmt1(st.logistics.fuel.qty)}%</b></div>
        <div class="metric-row" style="display:block;"><div style="color:var(--text-faint);font-size:11px;">ENDURANCE</div><b class="mono">${fmt1(st.endurance)} days</b></div>
      </div>
      <div class="grid g3" style="margin-top:10px;">
        <div><div style="font-size:11px;color:var(--text-faint);margin-bottom:4px;">Generators</div>
        ${st.generators.map(g=>`<div class="metric-row"><span>${g.name}</span><span class="status-pill ${g.status==='NORMAL'?'ok':g.status==='ATTENTION'?'warn':g.status==='WARNING'?'high':'crit'}">${g.status}</span></div>`).join('')}</div>
        <div><div style="font-size:11px;color:var(--text-faint);margin-bottom:4px;">Equipment</div>
        ${Object.entries(st.equipment).map(([k,v])=>`<div class="metric-row"><span>${k}</span><b>${fmt1(v.health)}%</b></div>`).join('')}</div>
        <div><div style="font-size:11px;color:var(--text-faint);margin-bottom:4px;">Active scenarios</div>
        ${st.activeScenarios.length? st.activeScenarios.map(s=>`<span class="chip">${SCENARIOS[s.type]?SCENARIOS[s.type].label:s.type}</span>`).join(''): '<span class="small-note">None — normal operating mode.</span>'}</div>
      </div>
    </div>
  `).join('')}
  `;
}

/* ========================= ENERGY ========================= */
