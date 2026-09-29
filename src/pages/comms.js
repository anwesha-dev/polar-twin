/**
 * Communications page.
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */
import { DB, STATE } from '../core/store.js';
import { sourceBadge } from '../ui/shell.js';

export function renderComms(){
  return `
  <div class="page-head"><div><h1>Communication / Offline Mode</h1><div class="page-sub">Satellite/network link and offline-first synchronization ${sourceBadge('SIMULATED')}</div></div></div>
  <div class="card" style="margin-bottom:16px;">
    <div class="card-title-row"><h3 style="margin:0;">SATELLITE / NETWORK</h3>
      <span class="status-pill ${STATE.commsConnected?'ok':'crit'}">${STATE.commsConnected?'🟢 CONNECTED':'🔴 OFFLINE'}</span>
    </div>
    <div class="grid g4">
      <div class="metric-row" style="display:block;"><div style="color:var(--text-faint);font-size:11px;">LOCAL MONITORING</div><b>ACTIVE</b></div>
      <div class="metric-row" style="display:block;"><div style="color:var(--text-faint);font-size:11px;">LOCAL STORAGE</div><b>ACTIVE</b></div>
      <div class="metric-row" style="display:block;"><div style="color:var(--text-faint);font-size:11px;">AI INFERENCE</div><b>ACTIVE</b></div>
      <div class="metric-row" style="display:block;"><div style="color:var(--text-faint);font-size:11px;">CLOUD SYNC</div><b style="color:${STATE.commsConnected?'var(--ok)':'var(--warn)'}">${STATE.commsConnected?'ACTIVE':'PAUSED'}</b></div>
    </div>
    <div style="margin-top:14px;display:flex;gap:10px;">
      ${STATE.commsConnected? `<button class="btn danger" id="simLossBtn">SIMULATE CONNECTION LOSS</button>` : `<button class="btn primary" id="restoreBtn">RESTORE CONNECTION</button>`}
    </div>
    <div id="syncProgressWrap" style="margin-top:14px;"></div>
    <div class="metric-row" style="margin-top:10px;"><span>Queued records</span><b>${DB.syncQueue.length}</b></div>
  </div>
  `;
}

/* ========================= ALERT CENTER ========================= */
