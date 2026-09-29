/**
 * Environment page.
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */
import { hasScenario } from '../simulator/scenarios.js';
import { activeStations, sourceBadge } from '../ui/shell.js';
import { fmt1 } from '../utils/helpers.js';

export function renderEnvironment(){
  const stations = activeStations();
  return `
  <div class="page-head"><div><h1>Environment</h1><div class="page-sub">Weather telemetry and operational impact ${sourceBadge('SIMULATED')} <span class="chip">Historical baselines: public Antarctic climate records</span></div></div></div>
  ${stations.map(st=>{
    const storm = hasScenario(st,'storm');
    return `
    <div class="card" style="margin-bottom:16px;">
      <h3 style="text-transform:none;color:var(--text);font-size:14px;">${st.label}</h3>
      <div class="grid g4" style="margin-bottom:14px;">
        <div><div style="font-size:11px;color:var(--text-faint);">TEMPERATURE</div><b class="mono" style="font-size:18px;">${fmt1(st.env.temp)}°C</b></div>
        <div><div style="font-size:11px;color:var(--text-faint);">WIND</div><b class="mono" style="font-size:18px;">${fmt1(st.env.wind)} km/h ${st.env.windDir}</b></div>
        <div><div style="font-size:11px;color:var(--text-faint);">PRESSURE</div><b class="mono" style="font-size:18px;">${fmt1(st.env.pressure)} hPa</b></div>
        <div><div style="font-size:11px;color:var(--text-faint);">HUMIDITY</div><b class="mono" style="font-size:18px;">${fmt1(st.env.humidity)}%</b></div>
        <div><div style="font-size:11px;color:var(--text-faint);">VISIBILITY</div><b class="mono" style="font-size:18px;">${fmt1(st.env.visibility)} km</b></div>
        <div><div style="font-size:11px;color:var(--text-faint);">SNOWFALL</div><b class="mono" style="font-size:18px;">${fmt1(st.env.snowfall)} cm/hr</b></div>
        <div><div style="font-size:11px;color:var(--text-faint);">SOLAR RADIATION</div><b class="mono" style="font-size:18px;">${fmt1(st.env.solar)} W/m²</b></div>
      </div>
      ${storm? `<div class="why-box"><b>⚠ Extreme Weather — Expected Impact</b><ul>
        <li>Heating demand ↑</li><li>Energy demand ↑</li><li>Fuel consumption ↑</li><li>Outdoor maintenance restricted</li>
      </ul></div>`:''}
      <div class="tabs" style="margin-top:14px;">
        <div class="tab env-tab active" data-st="${st.key}" data-range="24h">24 Hour</div>
        <div class="tab env-tab" data-st="${st.key}" data-range="7d">7 Day</div>
        <div class="tab env-tab" data-st="${st.key}" data-range="30d">30 Day</div>
      </div>
      <canvas class="chart-canvas" id="chart-env-${st.key}" height="70"></canvas>
    </div>`;
  }).join('')}
  `;
}

/* ========================= AI RISK INTELLIGENCE ========================= */
