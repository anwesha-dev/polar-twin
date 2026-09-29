/**
 * Predictive maintenance page.
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */
import { DB } from '../core/store.js';
import { activeStations, sourceBadge, timeAgo } from '../ui/shell.js';

export function renderMaintenance(){
  const stations = activeStations();
  return `
  <div class="page-head"><div><h1>Predictive Maintenance</h1><div class="page-sub">Anomaly detection over vibration, temperature, oil pressure and runtime ${sourceBadge('SIMULATED')}</div></div></div>
  ${stations.map(st=>`
  <div class="card" style="margin-bottom:16px;">
    <h3 style="text-transform:none;color:var(--text);font-size:14px;">${st.label}</h3>
    <div class="grid g2">
    ${st.generators.map(g=>`
      <div class="card" style="background:var(--panel-2);">
        <div class="card-title-row"><b>${g.name}</b>${g.anomaly?'<span class="status-pill high">⚠ ANOMALY DETECTED</span>':'<span class="status-pill ok">Normal</span>'}</div>
        <canvas class="chart-canvas" id="chart-vib-${st.key}-${g.id}" height="60"></canvas>
        ${g.anomaly? `<div class="why-box" style="margin-top:10px;">Vibration trend rising beyond normal band — possible mechanical degradation. Predicted maintenance window: 5–8 days. Recommendation: inspect bearings / mounts.</div>` : `<div class="small-note">Vibration, temperature and oil pressure trends within the normal operating band.</div>`}
      </div>`).join('')}
    </div>
  </div>
  `).join('')}
  <div class="card">
    <h3>Maintenance Log</h3>
    <table><thead><tr><th>Time</th><th>Asset</th><th>Finding</th><th>Recommendation</th><th>Predicted Window</th></tr></thead><tbody>
    ${(Object.values(DB.stations).flatMap(s=>s.maintenanceLog).sort((a,b)=>b.ts-a.ts).slice(0,20).map(m=>`
      <tr><td>${timeAgo(m.ts)}</td><td><b>${m.asset}</b></td><td>${m.finding}</td><td>${m.recommendation}</td><td>${m.predictedWindow}</td></tr>
    `).join('')) || '<tr><td colspan="5" class="small-note">No maintenance findings yet — anomalies will populate this log automatically.</td></tr>'}
    </tbody></table>
  </div>
  `;
}

/* ========================= EMERGENCY MODE ========================= */
