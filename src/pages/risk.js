/**
 * Risk page.
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */
import { activeStations, riskColorClass, sourceBadge } from '../ui/shell.js';
import { clamp, fmt1 } from '../utils/helpers.js';

export function renderRisk(){
  const stations = activeStations();
  return `
  <div class="page-head"><div><h1>AI Risk Intelligence</h1><div class="page-sub">Cascading risk engine — Environment → Energy → Infrastructure → Logistics → Operations → Risk ${sourceBadge('SIMULATED')}</div></div></div>
  ${stations.map(st=>`
  <div class="card" style="margin-bottom:16px;">
    <div class="card-title-row">
      <h3 style="text-transform:none;color:var(--text);font-size:15px;">${st.label} — ${st.riskLevel==='LOW'?'LOW':st.riskLevel+' OPERATIONAL RISK'}</h3>
      <span class="status-pill ${riskColorClass(st.riskLevel)}">Risk score ${fmt1(st.riskScore)}/100</span>
    </div>
    <div class="chain" style="margin-bottom:14px;">
      <div class="node">Environment</div><div class="arrow">→</div><div class="node">Energy</div><div class="arrow">→</div>
      <div class="node">Infrastructure</div><div class="arrow">→</div><div class="node">Logistics</div><div class="arrow">→</div>
      <div class="node">Operations</div><div class="arrow">→</div><div class="node" style="border-color:var(--${riskColorClass(st.riskLevel)==='ok'?'ok':riskColorClass(st.riskLevel)});color:var(--${riskColorClass(st.riskLevel)==='ok'?'ok':riskColorClass(st.riskLevel)});">Risk</div>
    </div>
    <div class="why-box">
      <b>WHY IS THIS STATION AT RISK?</b>
      ${st.riskCauses.length? `<b style="display:block;margin-top:6px;">Primary causes:</b><ol>${st.riskCauses.map(c=>`<li>${c.text}</li>`).join('')}</ol>`: '<div style="margin-top:6px;">No significant risk drivers detected — all monitored chains within normal range.</div>'}
      ${st.riskCauses.length? `<b style="display:block;margin-top:10px;">Projected impact:</b><div>Fuel reserve may fall below the operational threshold in ~${fmt1(st.fuelForecast.days)} days at current consumption. Endurance estimate: ${fmt1(st.endurance)} days.</div>`:''}
    </div>
    <div class="grid g3" style="margin-top:14px;">
      <div class="card" style="background:var(--panel-2);">
        <h3>Prediction</h3>
        <div class="metric-row"><span>Risk level</span><b>${st.riskLevel}</b></div>
        <div class="metric-row"><span>Confidence</span><b>${clamp(70+Math.round(st.riskScore/4),70,96)}%</b></div>
        <div class="metric-row"><span>Model</span><b>Rule engine + gradient-boosted risk classifier</b></div>
      </div>
      <div class="card" style="background:var(--panel-2);">
        <h3>Contributing Factors</h3>
        ${st.riskCauses.length? st.riskCauses.map(c=>`<div class="metric-row"><span>${c.text.split(':')[0].split('—')[0].split('(')[0].slice(0,28)}</span><b>+${Math.round(c.weight)}</b></div>`).join(''): '<div class="small-note">None active.</div>'}
      </div>
      <div class="card" style="background:var(--panel-2);">
        <h3>Recommended Action</h3>
        <div class="small-note" style="margin-top:0;">${st.riskLevel==='LOW'? 'Continue routine monitoring. No intervention required.' : 'Review the What-If Simulator for response options, and consider advancing the next resupply window.'}</div>
      </div>
    </div>
  </div>
  `).join('')}
  `;
}

/* ========================= WHAT-IF SIMULATOR ========================= */
