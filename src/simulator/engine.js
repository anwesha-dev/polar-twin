/**
 * Synthetic Antarctic telemetry simulator, anomaly detection, cascade-risk and forecast maths.
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */
import { DB, STATE, pushAlert } from '../core/store.js';
import { hasScenario } from './scenarios.js';
import { NAV } from '../ui/shell.js';
import { clamp, fmt1, now, rand, uid } from '../utils/helpers.js';

export function simulateTick(){
  STATE.tickCount++; STATE.lastTickAt = now();
  Object.values(DB.stations).forEach(st => simulateStation(st));
  recomputeAllAlertsThrottle();
}

export function simulateStation(st){
  const cold = hasScenario(st,'extreme_cold');
  const genFail = hasScenario(st,'generator_failure');
  const leak = hasScenario(st,'fuel_leak');
  const pumpFail = hasScenario(st,'water_pump_failure');
  const storm = hasScenario(st,'storm');
  const resupplyDelay = hasScenario(st,'resupply_delay');

  // --- Environment (root variables) ---
  const targetTemp = st.profile.baseTemp - (cold?18:0) - (storm?6:0) + rand(-0.6,0.6);
  st.env.temp += (targetTemp - st.env.temp)*0.18;
  st.env.wind = clamp(st.env.wind + (storm? rand(1.5,4) : rand(-1,1)), 4, 95);
  st.env.humidity = clamp(st.env.humidity + rand(-1,1), 30, 85);
  st.env.pressure = clamp(st.env.pressure + rand(-0.4,0.4), 950, 1015);
  st.env.visibility = clamp((storm? 1.5 : 9) + rand(-0.5,0.5), 0.2, 12);
  st.env.snowfall = clamp(storm ? rand(4,12) : rand(0,1.5), 0, 20);
  st.env.solar = clamp(st.profile.baseSolar + rand(-20,20) - (storm?80:0), 0, 500);
  st.env.windDir = st.env.windDir; // static-ish for demo

  // --- Energy (derived from environment) ---
  const heatingDemand = clamp((st.profile.baseTemp - st.env.temp) * 4.2, 0, 260); // extra kW from cold
  const baseDemand = st.profile.baseLoad + heatingDemand;
  st.energy.hvacLoad = fmt1(baseDemand*0.4 + rand(-2,2));
  st.energy.totalConsumption = fmt1(baseDemand + rand(-3,3));

  // Generator behaviour
  const g1 = st.generators[0], g2 = st.generators[1];
  if(genFail){
    g2.status='OFFLINE'; g2.load=0; g2.health = Math.max(20, g2.health-0.05);
    g1.load = clamp(st.energy.totalConsumption, 0, 100* (st.energy.totalConsumption/ (st.profile.baseLoad*1.3)) );
    g1.load = clamp((st.energy.totalConsumption/ (st.profile.baseLoad*1.6))*100, 0, 100);
    st.energy.backupPower = clamp(st.energy.backupPower - rand(0.15,0.4), 0, 100);
  } else {
    const perGenTarget = st.energy.totalConsumption/2;
    g1.load = clamp((perGenTarget/(st.profile.baseLoad*0.8))*100, 10, 100);
    g2.load = clamp((perGenTarget/(st.profile.baseLoad*0.8))*100, 10, 100);
    st.energy.backupPower = clamp(st.energy.backupPower + rand(-0.05,0.2), 0, 100);
    if(g2.status==='OFFLINE') g2.status='NORMAL';
  }
  [g1,g2].forEach(g=>{
    if(g.status==='OFFLINE') return;
    const loadFactor = g.load/100;
    g.temp += ((60+loadFactor*38) - g.temp)*0.15 + rand(-0.4,0.4);
    // slow mechanical degradation trend once runtime is high, to feed anomaly detector
    const wear = (g.runtime>7000?0.006:0.0015) * (1+loadFactor);
    g.vibration = clamp(g.vibration + wear + rand(-0.05,0.05), 2.6, 9.5);
    g.oilPressure = clamp(g.oilPressure - wear*0.6 + rand(-0.3,0.3), 25, 70);
    g.runtime += 3/3600; // ~3s tick -> hours
    g.history.vibration.push(fmt1(g.vibration)); if(g.history.vibration.length>40) g.history.vibration.shift();
    g.history.temp.push(fmt1(g.temp)); if(g.history.temp.length>40) g.history.temp.shift();
    // health derived from vibration+temp+runtime
    const vibPenalty = clamp((g.vibration-3.2)*9,0,55);
    const tempPenalty = clamp((g.temp-95)*1.2,0,25);
    const runtimePenalty = clamp((g.runtime-6000)/120,0,20);
    g.health = clamp(100 - vibPenalty - tempPenalty - runtimePenalty, 5, 100);
    g.status = g.health<35?'CRITICAL': g.health<60?'WARNING': g.health<80?'ATTENTION':'NORMAL';
  });

  // --- Logistics (derived from energy + scenarios) ---
  const fuel = st.logistics.fuel;
  const consumptionMultiplier = 1 + heatingDemand/220 + (genFail?0.25:0) + (leak?0:0);
  let fuelDrop = (fuel.rate/40) * consumptionMultiplier;
  if(leak) fuelDrop += rand(0.15,0.35);
  fuel.qty = clamp(fuel.qty - fuelDrop, 0, 100);
  fuel.currentRateLd = fmt1(600 * consumptionMultiplier + (leak?rand(60,140):0));

  const water = st.logistics.water;
  water.qty = clamp(water.qty - (water.rate/45)*(pumpFail?2.6:1), 0, 100);
  st.equipment.waterPump.health = clamp(st.equipment.waterPump.health - (pumpFail?0.08:0.002), 5, 100);
  st.equipment.waterPump.status = st.equipment.waterPump.health<40?'CRITICAL':st.equipment.waterPump.health<70?'WARNING':'NORMAL';

  ['food','medical','spares','science'].forEach(k=>{
    const it = st.logistics[k];
    it.qty = clamp(it.qty - (it.rate/60) - (resupplyDelay?0.02:0), 0, 100);
  });

  // --- Comms ---
  st.commsOffline = hasScenario(st,'comms_loss') || !STATE.commsConnected;

  // --- Building health rollups ---
  st.buildings.find(b=>b.id==='gen').health = fmt1((g1.health+ (g2.status==='OFFLINE'?40:g2.health))/2);
  st.buildings.find(b=>b.id==='fuel').health = fmt1(clamp(fuel.qty*1.1,0,100));
  st.buildings.find(b=>b.id==='water').health = fmt1(st.equipment.waterPump.health);

  // history for charts
  st.telemetryHistory.temp.push(fmt1(st.env.temp)); if(st.telemetryHistory.temp.length>60) st.telemetryHistory.temp.shift();
  st.telemetryHistory.power.push(fmt1(st.energy.totalConsumption)); if(st.telemetryHistory.power.length>60) st.telemetryHistory.power.shift();
  st.telemetryHistory.fuel.push(fmt1(fuel.qty)); if(st.telemetryHistory.fuel.length>60) st.telemetryHistory.fuel.shift();

  computeCascadeRisk(st);
  computeFuelForecastAndEndurance(st);
  runAnomalyDetection(st);

  if(st.commsOffline){
    DB.syncQueue.push({station:st.key, ts:now(), payload:'telemetry-batch'});
  }
}

/* ---- Cascading Risk Engine ---------------------------------------------
   Explicit dependency graph: Environment -> Energy -> Infrastructure ->
   Logistics -> Operations -> Risk. We evaluate deltas from station baseline
   and walk the chain, producing human-readable causes rather than a bare
   score. */
export function computeCascadeRisk(st){
  const causes = [];
  let score = 5;
  const tempDelta = st.profile.baseTemp - st.env.temp;
  if(tempDelta > 8){ score += clamp(tempDelta*1.6,0,35); causes.push({text:`Extreme cold: ${fmt1(st.env.temp)}°C, ${fmt1(tempDelta)}°C below baseline`, weight: clamp(tempDelta*1.6,0,35)}); }
  const g2 = st.generators[1], g1 = st.generators[0];
  [g1,g2].forEach(g=>{
    if(g.status==='OFFLINE'){ score += 22; causes.push({text:`${g.name} offline — full load on remaining generator`, weight:22}); }
    else if(g.health<70){ const w = clamp((80-g.health)*0.9,0,30); score+=w; causes.push({text:`${g.name} health declining (${fmt1(g.health)}%) — rising vibration/temperature trend`, weight:w}); }
  });
  const fuel = st.logistics.fuel;
  const baselineRate = st.profile.fuelRate*100/6.1;
  const rateExcess = ((fuel.currentRateLd||0) - baselineRate*100) / (baselineRate*100||1) * 100;
  if(rateExcess>8){ const w=clamp(rateExcess*0.5,0,25); score+=w; causes.push({text:`Fuel consumption ${fmt1(rateExcess)}% above baseline`, weight:w}); }
  if(fuel.qty<25){ const w=clamp((25-fuel.qty)*1.4,0,30); score+=w; causes.push({text:`Fuel reserve at ${fmt1(fuel.qty)}% — approaching operational threshold`, weight:w}); }
  if(st.equipment.waterPump.status!=='NORMAL'){ score+=12; causes.push({text:'Water pump degraded — availability at risk', weight:12}); }
  if(hasScenario(st,'storm')){ score+=10; causes.push({text:'Storm conditions restricting outdoor maintenance & resupply', weight:10}); }
  if(hasScenario(st,'resupply_delay')){ score+=14; causes.push({text:'Next resupply window delayed', weight:14}); }
  if(st.commsOffline){ score+=8; causes.push({text:'Communication link offline — decisions must rely on local data', weight:8}); }

  score = clamp(score,0,100);
  st.riskScore = fmt1(score);
  st.riskLevel = score>=70?'CRITICAL': score>=45?'HIGH': score>=22?'MEDIUM':'LOW';
  causes.sort((a,b)=>b.weight-a.weight);
  st.riskCauses = causes.slice(0,5);

  if(st.riskLevel==='CRITICAL' || st.riskLevel==='HIGH'){
    const already = DB.alerts.find(a=>a.station===st.label && a.asset==='Operational Risk' && !a.ack && (now()-a.ts)<60000);
    if(!already && Math.random()<0.15){
      pushAlert(st.label, st.riskLevel==='CRITICAL'?'CRITICAL':'HIGH', 'Operational Risk',
        causes[0] ? causes[0].text : 'Multiple contributing factors detected.',
        'Open Cascading Risk view for full explanation.');
    }
  }
}

/* ---- Fuel forecasting ---------------------------------------------------
   current fuel + historical consumption + temperature + heating demand +
   generator load + resupply date -> predicted reserve / endurance. */
export function computeFuelForecastAndEndurance(st){
  const fuel = st.logistics.fuel;
  const avgRate = fuel.currentRateLd ? fuel.currentRateLd*0.85 : 600; // smoothed
  const predictedRate = fuel.currentRateLd || avgRate;
  const tankLiters = 40000; // assumed tank capacity for L/day math (labelled synthetic)
  const currentLiters = tankLiters * (fuel.qty/100);
  const daysLeft = predictedRate>0 ? currentLiters/predictedRate : 999;
  st.fuelForecast = { avg: fmt1(avgRate), predicted: fmt1(predictedRate), days: fmt1(clamp(daysLeft,0,400)) };

  // Endurance index: weakest constrained resource across fuel/food/water/medical/spares, adjusted by risk
  const daysFor = (key,dailyPct)=> st.logistics[key].qty / (dailyPct||0.01);
  const candidates = [
    st.fuelForecast.days,
    daysFor('food', st.logistics.food.rate/60*100/100* (100/60)), // approximate day burn
    daysFor('water', st.logistics.water.rate/45),
    daysFor('medical', st.logistics.medical.rate/60),
    daysFor('spares', st.logistics.spares.rate/60),
  ].map(v=>clamp(v,0,400));
  let endurance = Math.min(...candidates);
  if(st.riskLevel==='HIGH') endurance*=0.9;
  if(st.riskLevel==='CRITICAL') endurance*=0.78;
  st.endurance = fmt1(clamp(endurance,0,400));
}

/* ---- Predictive maintenance / anomaly detection -------------------------
   Simplified rolling z-score approximation of an Isolation-Forest style
   detector over vibration + temperature + oil pressure. Flags gradual
   drift, not just single-point spikes. */
export function runAnomalyDetection(st){
  st.generators.forEach(g=>{
    if(g.status==='OFFLINE') return;
    const v = g.history.vibration;
    if(v.length<8) return;
    const recent = v.slice(-5), base = v.slice(0,Math.max(1,v.length-5));
    const meanBase = base.reduce((a,b)=>a+b,0)/base.length;
    const meanRecent = recent.reduce((a,b)=>a+b,0)/recent.length;
    const drift = meanRecent-meanBase;
    g.anomaly = drift>0.9;
    if(g.anomaly && Math.random()<0.06){
      const exists = DB.alerts.find(a=>a.asset===g.name+' — Vibration' && !a.ack && (now()-a.ts)<90000);
      if(!exists){
        pushAlert(st.label,'WARNING', g.name+' — Vibration',
          `Vibration trending up (${fmt1(meanBase)} → ${fmt1(meanRecent)} mm/s over recent window). Possible mechanical degradation.`,
          'Schedule inspection within 5–8 days.');
        st.maintenanceLog.unshift({id:uid(), ts:now(), asset:g.name, finding:'Vibration drift anomaly', recommendation:'Inspect bearings / mounts', predictedWindow:'5–8 days'});
      }
    }
  });
}

export function recomputeAllAlertsThrottle(){ /* placeholder hook for future batching */ }

// advance the clock fast for What-If projections without touching live state
export function projectStationForward(stBase, scenarioType, params, hours){
  // returns a lightweight timeline array — deterministic narrative model
  const st = JSON.parse(JSON.stringify(stBase));
  const steps = [];
  const s = scenarioType;
  if(s==='generator_failure'){
    steps.push({t:'0 hr', d:'Generator #2 failure detected by monitoring system.'});
    steps.push({t:'5 min', d:'Backup generator / reserve capacity activates automatically.'});
    steps.push({t:'6 hr', d:'Load redistributed fully onto Generator #1; load rises to ~'+fmt1(clamp((params.powerDemand/ (stBase.profile.baseLoad*0.8))*100,40,100))+'%.'});
    steps.push({t:'12 hr', d:'Single-generator operation increases fuel burn; consumption rises roughly 18–25% above baseline.'});
    steps.push({t:'18 hr', d:'Heating margin narrows if temperature drops further — heating risk flagged.'});
    steps.push({t:'24 hr', d:'Fuel reserve trending toward critical threshold if resupply is not advanced.'});
  } else if(s==='extreme_cold'){
    steps.push({t:'0 hr', d:`Temperature falls toward ${params.temp}°C.`});
    steps.push({t:'2 hr', d:'Heating demand rises sharply; HVAC load increases.'});
    steps.push({t:'8 hr', d:'Total power demand climbs; generator load increases correspondingly.'});
    steps.push({t:'16 hr', d:'Fuel consumption rate rises above baseline.'});
    steps.push({t:'24 hr', d:'Fuel reserve depletion accelerates; endurance estimate shortens.'});
  } else if(s==='fuel_leak'){
    steps.push({t:'0 hr', d:'Abnormal fuel level drop detected beyond expected consumption.'});
    steps.push({t:'4 hr', d:'Leak rate estimated; tank isolation recommended.'});
    steps.push({t:'12 hr', d:'Reserve falls faster than forecast model predicted.'});
    steps.push({t:'24 hr', d:'Resupply timeline reassessed as urgent if leak continues.'});
  } else if(s==='water_pump_failure'){
    steps.push({t:'0 hr', d:'Primary water pump degrades / trips.'});
    steps.push({t:'3 hr', d:'Water reserve draw shifts to storage tank only.'});
    steps.push({t:'18 hr', d:'Water availability approaches rationing threshold.'});
    steps.push({t:'30 hr', d:'Secondary pump or manual intervention required.'});
  } else if(s==='storm'){
    steps.push({t:'0 hr', d:`Wind rises toward ${params.wind} km/h; visibility drops.`});
    steps.push({t:'4 hr', d:'Outdoor maintenance and resupply operations restricted.'});
    steps.push({t:'10 hr', d:'Temperature swing adds incremental heating load.'});
    steps.push({t:'20 hr', d:'Storm clears; backlog of deferred maintenance reassessed.'});
  } else if(s==='resupply_delay'){
    steps.push({t:'0 hr', d:`Resupply pushed back by ${params.resupplyDelay||7} days.`});
    steps.push({t:'—', d:'Logistics module recalculates days-remaining against new date.'});
    steps.push({t:'—', d:'Critical-priority items (fuel, spares) re-ranked in resupply queue.'});
  } else if(s==='comms_loss'){
    steps.push({t:'0 hr', d:'Satellite/network link drops.'});
    steps.push({t:'0 hr', d:'Local monitoring, storage and AI inference continue uninterrupted.'});
    steps.push({t:'—', d:'Telemetry queues locally until link restoration.'});
  } else {
    steps.push({t:'0 hr', d:'Multiple failure modes triggered together — compounding effects expected.'});
    steps.push({t:'6 hr', d:'Energy and fuel systems under simultaneous strain.'});
    steps.push({t:'24 hr', d:'Operational risk elevated across all monitored domains.'});
  }
  return steps;
}

/* ========================= NAV + SHELL ========================= */
