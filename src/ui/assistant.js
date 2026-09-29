/**
 * Rule-based operations assistant.
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */
import { DB, STATE } from '../core/store.js';
import { LOGI_LABELS } from '../pages/logistics.js';
import { clamp, fmt1 } from '../utils/helpers.js';

export function assistantAnswer(q){
  const st = STATE.selectedStation==='ALL' ? DB.stations.BHARATI : DB.stations[STATE.selectedStation];
  if(/bharati.*risk|why.*bharati/i.test(q)){
    const b = DB.stations.BHARATI;
    return b.riskCauses.length ? `Bharati is at ${b.riskLevel} risk (score ${fmt1(b.riskScore)}/100). Primary causes: ${b.riskCauses.slice(0,3).map(c=>c.text).join('; ')}.` : `Bharati is currently at LOW risk — no significant contributing factors detected.`;
  }
  if(/generator ?2|generator #2/i.test(q) && /fail/i.test(q)){
    return `If Generator #2 fails: backup capacity activates within minutes, full load shifts to Generator #1, and fuel consumption typically rises 18–25%. See the What-If Simulator for the full projected timeline on ${st.label}.`;
  }
  if(/fuel.*15 days|remain.*15 days/i.test(q)){
    return `At the current consumption rate (${fmt1(st.fuelForecast.predicted)} L/day) on ${st.label}, fuel reserve is projected at roughly ${fmt1(clamp(st.logistics.fuel.qty - (15/st.fuelForecast.days)*st.logistics.fuel.qty,0,100))}% after 15 days, versus ${fmt1(st.logistics.fuel.qty)}% today.`;
  }
  if(/prioriti[sz]ed.*resupply|resupply.*priorit/i.test(q)){
    const items = Object.entries(st.logistics).sort((a,b)=>(a[1].qty/a[1].threshold)-(b[1].qty/b[1].threshold));
    return `For ${st.label}, resupply priority order: ${items.slice(0,3).map(([k,v])=>LOGI_LABELS[k]).join(', ')} — ranked by proximity to critical threshold.`;
  }
  if(/equipment.*attention|which equipment/i.test(q)){
    const flagged = [];
    Object.values(DB.stations).forEach(s=> s.generators.forEach(g=>{ if(g.status!=='NORMAL') flagged.push(`${g.name} (${s.label}, ${g.status})`); }));
    return flagged.length ? `Equipment needing attention: ${flagged.join('; ')}.` : `No equipment currently requires attention across either station.`;
  }
  return `Based on current structured data: ${st.label} is at ${st.riskLevel} risk with ${fmt1(st.logistics.fuel.qty)}% fuel and ${fmt1(st.endurance)} days estimated endurance. Ask about a specific station, generator, or resupply topic for more detail.`;
}

/* ========================= EVENT WIRING ========================= */
