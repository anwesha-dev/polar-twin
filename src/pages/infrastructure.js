/**
 * Infrastructure page.
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */
import { activeStations, healthColorClass, sourceBadge } from '../ui/shell.js';
import { fmt1 } from '../utils/helpers.js';

export function renderInfra(){
  const stations = activeStations();
  return `
  <div class="page-head"><div><h1>Infrastructure</h1><div class="page-sub">Buildings, structural & equipment health ${sourceBadge('SIMULATED')}</div></div></div>
  ${stations.map(st=>`
  <div class="card" style="margin-bottom:16px;">
    <h3 style="text-transform:none;color:var(--text);font-size:14px;">${st.label}</h3>
    <table><thead><tr><th>Building / Module</th><th>Health</th><th>Status</th></tr></thead><tbody>
    ${st.buildings.map(b=>{
      const cls = healthColorClass(b.health);
      const status = b.health<40?'CRITICAL':b.health<65?'HIGH RISK':b.health<82?'WARNING':'NORMAL';
      return `<tr><td><b>${b.name}</b></td><td>${fmt1(b.health)}%</td><td><span class="status-pill ${cls}">${status}</span></td></tr>`;
    }).join('')}
    </tbody></table>
    <div class="grid g3" style="margin-top:14px;">
      ${Object.entries(st.equipment).map(([k,v])=>`
      <div class="card" style="background:var(--panel-2);">
        <div style="font-size:11px;color:var(--text-faint);text-transform:capitalize;">${k.replace(/([A-Z])/g,' $1')}</div>
        <div class="metric-big" style="font-size:20px;">${fmt1(v.health)}<span class="metric-unit">% health</span></div>
        <span class="status-pill ${v.status==='NORMAL'?'ok':v.status==='WARNING'?'warn':'crit'}">${v.status}</span>
      </div>`).join('')}
    </div>
  </div>
  `).join('')}
  `;
}

/* ========================= LOGISTICS ========================= */
