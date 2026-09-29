/**
 * Alerts page.
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */
import { DB, STATE } from '../core/store.js';
import { timeAgo } from '../ui/shell.js';

export function renderAlerts(){
  const filt = STATE.selectedStation==='ALL' ? DB.alerts : DB.alerts.filter(a=>a.station===DB.stations[STATE.selectedStation].label);
  return `
  <div class="page-head"><div><h1>Alert Center</h1><div class="page-sub">${filt.filter(a=>!a.ack).length} unacknowledged of ${filt.length} total</div></div></div>
  <div class="card">
    ${filt.length? filt.slice(0,60).map(a=>`
      <div class="alert-item">
        <div class="alert-sev ${a.severity}"></div>
        <div class="alert-body">
          <div class="alert-title">${a.severity} — ${a.asset}</div>
          <div class="alert-meta">${a.station} · ${timeAgo(a.ts)}</div>
          <div class="alert-reason">${a.reason}</div>
          <div class="alert-reason" style="color:var(--text-faint);">Recommended: ${a.action}</div>
        </div>
        ${a.ack? '<span class="ack-tag">ACKNOWLEDGED</span>' : `<button class="btn sm" data-ack="${a.id}">Acknowledge</button>`}
      </div>
    `).join('') : '<div class="small-note">No alerts recorded yet.</div>'}
  </div>
  `;
}

/* ========================= SETTINGS ========================= */
