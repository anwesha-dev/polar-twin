/**
 * What-If scenario catalogue and activation helpers.
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */
import { DB, STATE, pushAlert, pushAudit } from '../core/store.js';
import { now } from '../utils/helpers.js';

export const SCENARIOS = {
  extreme_cold:  { label:'Extreme Cold', desc:'External temperature drops sharply, heating demand spikes.' },
  generator_failure: { label:'Generator Failure', desc:'Generator #2 trips offline; backup must absorb the load.' },
  fuel_leak:     { label:'Fuel Leak', desc:'Fuel tank develops a slow leak — abnormal loss rate.' },
  water_pump_failure: { label:'Water Pump Failure', desc:'Primary water pump degrades, availability drops.' },
  storm:         { label:'Storm', desc:'High winds, temperature swing, outdoor ops restricted.' },
  resupply_delay:{ label:'Resupply Delay', desc:'Next supply flight/vessel pushed back.' },
  comms_loss:    { label:'Communication Loss', desc:'Satellite/network link drops; local ops continue.' },
  combined_crisis:{ label:'Combined Crisis', desc:'Multiple failures triggered simultaneously.' },
};

export function activateScenario(stKey, type, intensity){
  const st = DB.stations[stKey];
  if(type==='combined_crisis'){
    ['extreme_cold','generator_failure','storm'].forEach(t=>st.activeScenarios.push({type:t,startedAt:now(),intensity:intensity||1}));
  } else {
    st.activeScenarios.push({type, startedAt:now(), intensity:intensity||1});
  }
  if(type==='comms_loss'){ STATE.commsConnected=false; }
  pushAudit('Scenario injected', `${type} on ${st.label}`);
  pushAlert(st.label,'WARNING', SCENARIOS[type]?SCENARIOS[type].label:type, `Scenario triggered by operator: ${SCENARIOS[type]?SCENARIOS[type].label:type}.`, 'Monitor cascading effects on the risk board.');
}

export function clearScenarios(stKey){
  DB.stations[stKey].activeScenarios = [];
}

export function hasScenario(st, type){ return st.activeScenarios.some(s=>s.type===type); }

