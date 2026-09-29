/**
 * Logistics page.
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */
import { activeStations, sourceBadge } from '../ui/shell.js';
import { fmt1 } from '../utils/helpers.js';

export const LOGI_LABELS = {fuel:'Fuel',food:'Food',medical:'Medical Supplies',water:'Water Reserves',spares:'Spare Parts',science:'Scientific Supplies'};
export function renderLogistics(){
  const stations = activeStations();
  return `
  <div class="page-head"><div><h1>Logistics</h1><div class="page-sub">Inventory levels, consumption and resupply prioritization ${sourceBadge('SIMULATED')}</div></div></div>
  ${stations.map(st=>{
    const items = Object.entries(st.logistics);
    const priorityOrder = {Critical:0,High:1,Medium:2,Low:3};
    const ranked = items.map(([k,v])=>({key:k,...v, daysLeft: fmt1(v.qty/(v.rate/40))})).sort((a,b)=>{
      if(a.qty<a.threshold && b.qty>=b.threshold) return -1;
      if(b.qty<b.threshold && a.qty>=a.threshold) return 1;
      return priorityOrder[a.priority]-priorityOrder[b.priority];
    });
    return `
    <div class="card" style="margin-bottom:16px;">
      <h3 style="text-transform:none;color:var(--text);font-size:14px;">${st.label}</h3>
      <table><thead><tr><th>Item</th><th>Qty</th><th>Consumption Rate</th><th>Days Remaining</th><th>Critical Threshold</th><th>Priority</th></tr></thead><tbody>
      ${items.map(([k,v])=>`
        <tr><td><b>${LOGI_LABELS[k]}</b></td><td>${fmt1(v.qty)}${v.unit}</td><td>${k==='fuel'? fmt1(v.currentRateLd||0)+' L/day' : fmt1(v.rate)+'%/day'}</td>
        <td>${fmt1(v.qty/(v.rate/40))} d</td><td>${v.threshold}${v.unit}</td><td><span class="chip">${v.priority}</span></td></tr>
      `).join('')}
      </tbody></table>
      <div class="why-box" style="margin-top:12px;"><b>AI Resupply Prioritization</b>
        <ol>${ranked.slice(0,4).map(r=>`<li>${LOGI_LABELS[r.key]} — ${r.qty<r.threshold?'Critical':r.priority} ${r.qty<r.threshold?`(below ${r.threshold}${r.unit} threshold, ~${fmt1(r.qty/(r.rate/40))}d remaining)`:''}</li>`).join('')}</ol>
      </div>
    </div>`;
  }).join('')}
  `;
}

/* ========================= ENVIRONMENT ========================= */
