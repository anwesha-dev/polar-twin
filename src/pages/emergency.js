/**
 * Emergency page and emergency overlay markup.
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */
import { activeStations, sourceBadge, stationStatusSummary } from '../ui/shell.js';
import { fmt1 } from '../utils/helpers.js';

export function renderEmergencyPage(){
  const stations = activeStations();
  return `
  <div class="page-head"><div><h1>Emergency Mode</h1><div class="page-sub">Trigger the dedicated emergency interface for a critical event ${sourceBadge('SIMULATED')}</div></div></div>
  <div class="grid g4" style="margin-bottom:16px;">
    ${['Generator failure','Fire','Fuel leak','Water failure','Communication failure','Extreme weather'].map(t=>`<button class="scenario-btn" data-emergency-trigger="${t}">${t}<small>Trigger emergency interface</small></button>`).join('')}
  </div>
  <div class="card"><h3>Current Station Standing</h3>
  ${stations.map(st=>{const s=stationStatusSummary(st); return `<div class="metric-row"><span>${st.label}</span><span class="status-pill ${s.level}">${s.emoji} ${s.label}</span></div>`;}).join('')}
  <div class="small-note">Emergency Mode can also be triggered automatically when a station reaches CRITICAL risk.</div>
  </div>
  `;
}
export function buildEmergencyOverlayHTML(trigger, st){
  return `
  <div class="emergency-top">
    <h1>⚠ EMERGENCY MODE — ${trigger.toUpperCase()}</h1>
    <button class="btn danger" id="exitEmergencyBtn">EXIT EMERGENCY MODE</button>
  </div>
  <div class="emergency-body">
    <div class="page-sub" style="margin-bottom:14px;color:#ffb3b5;">Station: ${st.label} — ${sourceBadge('SIMULATED')}</div>
    <div class="grid g4" style="margin-bottom:16px;">
      <div class="em-card card"><h3>Affected Systems</h3><div class="small-note" style="color:#ffcfcf;">${trigger==='Generator failure'?'Power generation':trigger==='Fire'?'Habitat module, HVAC':trigger==='Fuel leak'?'Fuel farm':trigger==='Water failure'?'Water treatment':trigger==='Communication failure'?'Satellite / network link':'All outdoor operations'}</div></div>
      <div class="em-card card"><h3>Personnel Impact</h3><div class="small-note" style="color:#ffcfcf;">All personnel accounted for. Movement restricted to essential modules.</div></div>
      <div class="em-card card"><h3>Energy Status</h3><div class="small-note" style="color:#ffcfcf;">${fmt1(st.energy.totalConsumption)} kW demand, backup power ${fmt1(st.energy.backupPower)}%</div></div>
      <div class="em-card card"><h3>Fuel Status</h3><div class="small-note" style="color:#ffcfcf;">${fmt1(st.logistics.fuel.qty)}% reserve, ${fmt1(st.fuelForecast.days)} days at current burn</div></div>
    </div>
    <div class="grid g2">
      <div class="em-card card">
        <h3>Recommended Actions</h3>
        <ol style="font-size:13px;color:#ffdada;">
          <li>Activate backup power / rationing as required</li>
          <li>Restrict non-essential movement and outdoor activity</li>
          <li>Notify all personnel via internal comms</li>
          <li>Assess ${trigger.toLowerCase()} directly if safe to do so</li>
          <li>Prepare local logs for sync once communication restores</li>
        </ol>
      </div>
      <div class="em-card card">
        <h3>Emergency Checklist</h3>
        <div class="em-checklist">
          <label><input type="checkbox"> Personnel headcount confirmed</label>
          <label><input type="checkbox"> Backup systems activated</label>
          <label><input type="checkbox"> Non-essential loads shed</label>
          <label><input type="checkbox"> Incident logged in Audit Log</label>
          <label><input type="checkbox"> Command Center notified</label>
        </div>
      </div>
    </div>
  </div>`;
}

/* ========================= DATA & TELEMETRY ========================= */
