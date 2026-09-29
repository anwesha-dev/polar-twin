/**
 * Energy page.
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */
import { STATE } from '../core/store.js';
import { activeStations, sourceBadge } from '../ui/shell.js';
import { fmt1 } from '../utils/helpers.js';

export function renderEnergy(){
  const stations = activeStations();
  return `
  <div class="page-head"><div><h1>Energy</h1><div class="page-sub">Generation, load and reserve power ${sourceBadge('SIMULATED')}</div></div></div>
  ${stations.map(st=>`
  <div class="card" style="margin-bottom:16px;">
    <div class="card-title-row"><h3 style="margin:0;font-size:14px;color:var(--text);text-transform:none;">${st.label}</h3><span class="small-note" style="margin:0;">HVAC load: ${fmt1(st.energy.hvacLoad)} kW</span></div>
    <div class="grid g4" style="margin-bottom:14px;">
      <div class="card" style="background:var(--panel-2);"><div style="font-size:11px;color:var(--text-faint);">TOTAL CONSUMPTION</div><div class="metric-big" style="font-size:22px;">${fmt1(st.energy.totalConsumption)}<span class="metric-unit">kW</span></div></div>
      <div class="card" style="background:var(--panel-2);"><div style="font-size:11px;color:var(--text-faint);">GENERATOR OUTPUT</div><div class="metric-big" style="font-size:22px;">${fmt1(st.energy.generatorOutput)}<span class="metric-unit">kW</span></div></div>
      <div class="card" style="background:var(--panel-2);"><div style="font-size:11px;color:var(--text-faint);">BACKUP POWER</div><div class="metric-big" style="font-size:22px;">${fmt1(st.energy.backupPower)}<span class="metric-unit">%</span></div></div>
      <div class="card" style="background:var(--panel-2);"><div style="font-size:11px;color:var(--text-faint);">BATTERY STATE</div><div class="metric-big" style="font-size:22px;">${fmt1(st.energy.batteryState)}<span class="metric-unit">%</span></div></div>
    </div>
    <div class="grid g2">
      ${st.generators.map(g=>`
      <div class="card" style="background:var(--panel-2);">
        <div class="card-title-row"><b>${g.name}</b><span class="status-pill ${g.status==='NORMAL'?'ok':g.status==='ATTENTION'?'warn':g.status==='WARNING'?'high':g.status==='OFFLINE'?'off':'crit'}">${g.status}</span></div>
        <div class="metric-row"><span>Load</span><b>${fmt1(g.load)}%</b></div>
        <div class="progress ${g.load>85?'crit':g.load>65?'warn':'ok'}"><div style="width:${fmt1(g.load)}%"></div></div>
        <div class="metric-row"><span>Health</span><b>${fmt1(g.health)}%</b></div>
        <div class="metric-row"><span>Temperature</span><b>${fmt1(g.temp)}°C</b></div>
        <div class="metric-row"><span>Vibration</span><b>${fmt1(g.vibration)} mm/s ${g.anomaly?'⚠':''}</b></div>
        <div class="metric-row"><span>Oil pressure</span><b>${fmt1(g.oilPressure)} psi</b></div>
        <div class="metric-row"><span>Runtime</span><b>${Math.round(g.runtime)} hrs</b></div>
      </div>`).join('')}
    </div>
    <div style="margin-top:14px;"><canvas class="chart-canvas" id="chart-power-${st.key}" height="70"></canvas></div>
  </div>
  `).join('')}
  `;
}

/* ========================= INFRASTRUCTURE ========================= */
