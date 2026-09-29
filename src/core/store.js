/**
 * In-memory synthetic database (DB), UI state (STATE), audit log and alert helpers.
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */
import { now, rand, uid } from '../utils/helpers.js';

export function makeGenerator(id,name,baseLoad){
  return { id, name, health:92, load:baseLoad, temp:74, vibration:3.1, oilPressure:62, runtime:rand(4000,9000),
    status:'NORMAL', history:{vibration:[3.1,3.2,3.1,3.3,3.2], temp:[73,74,73,75,74]} };
}

export function seedStation(key,label,coords,profile){
  return {
    key,label,coords,
    profile, // temperature bias / baseline
    env:{ temp:profile.baseTemp, humidity:55, wind:18, windDir:'SW', pressure:986, visibility:8, snowfall:0, solar:profile.baseSolar },
    energy:{ totalConsumption:profile.baseLoad, generatorOutput:profile.baseLoad*1.15, backupPower:100, batteryState:88, hvacLoad:profile.baseLoad*0.42 },
    generators:[ makeGenerator('G1','Generator #1',profile.baseLoad*0.55), makeGenerator('G2','Generator #2',profile.baseLoad*0.45) ],
    logistics:{
      fuel:{ qty:profile.fuelQty, unit:'%', rate:profile.fuelRate, threshold:15, priority:'Critical' },
      food:{ qty:78, unit:'%', rate:0.9, threshold:20, priority:'Medium' },
      medical:{ qty:64, unit:'%', rate:0.3, threshold:25, priority:'Low' },
      water:{ qty:70, unit:'%', rate:1.1, threshold:20, priority:'Medium' },
      spares:{ qty:52, unit:'%', rate:0.4, threshold:20, priority:'High' },
      science:{ qty:66, unit:'%', rate:0.2, threshold:15, priority:'Low' },
    },
    equipment:{ waterPump:{health:90,status:'NORMAL'}, hvac:{health:88,status:'NORMAL'}, commsRig:{health:95,status:'NORMAL'} },
    buildings:[
      {id:'hab', name:'Main Habitat Module', health:94},
      {id:'lab', name:'Scientific & Laboratory Block', health:91},
      {id:'gen', name:'Generator Shed', health:0}, // derived from generators
      {id:'fuel', name:'Fuel Farm', health:0}, // derived
      {id:'water', name:'Water Treatment Plant', health:90},
      {id:'power', name:'Power Distribution & Comms Tower', health:96},
      {id:'store', name:'Storage & Cold Warehouse', health:93},
      {id:'em', name:'Emergency Shelter', health:99},
    ],
    activeScenarios:[], // {type, startedAt, intensity}
    riskScore:8, riskLevel:'LOW', riskCauses:[],
    endurance:34,
    fuelForecast:{avg:profile.fuelRate*100/6.1, predicted:0, days:0},
    alerts:[],
    maintenanceLog:[],
    auditRelevant:true,
    commsOffline:false,
    telemetryHistory:{ temp:[], power:[], fuel:[] },
  };
}

export const DB = {
  stations:{
    MAITRI: seedStation('MAITRI','Maitri Station',{lat:-70.76,lon:11.73},{baseTemp:-14,baseSolar:180,baseLoad:210,fuelQty:63,fuelRate:0.55}),
    BHARATI: seedStation('BHARATI','Bharati Station',{lat:-69.41,lon:76.19},{baseTemp:-9,baseSolar:210,baseLoad:230,fuelQty:43,fuelRate:0.71}),
  },
  users:[
    {id:'u1',name:'Cdr. A. Rathore',role:'Admin'},
    {id:'u2',name:'Eng. S. Mehta',role:'Station Engineer'},
    {id:'u3',name:'Lt. P. Nair',role:'Logistics Officer'},
    {id:'u4',name:'Dr. K. Iyer',role:'Scientist'},
    {id:'u5',name:'Off. R. Bose',role:'Emergency Officer'},
  ],
  auditLog:[],
  alerts:[],
  simulationCounter:0,
  syncQueue:[],
};

export const STATE = {
  route:'command',
  selectedStation:'ALL', // ALL | MAITRI | BHARATI
  role:'Admin',
  commsConnected:true,
  emergencyActive:false,
  demoRunning:false,
  demoStep:0,
  demoTimer:null,
  twinSelectedObject:null,
  whatIfScenario:null,
  whatIfParams:{ temp:-14, wind:18, fuel:60, genHealth:90, powerDemand:210, resupplyDelay:0 },
  assistantLog:[],
  tickCount:0,
  user:null, navHist:[], lastRoute:null, backNav:false, lastTickAt:0,
};

export function pushAudit(action, detail){
  DB.auditLog.unshift({ id:uid(), ts:now(), action, detail, user: STATE.role });
  if(DB.auditLog.length>200) DB.auditLog.length=200;
}

export function pushAlert(station, severity, assetName, reason, action){
  const a = { id:uid(), ts:now(), station, asset:assetName, severity, reason, action, ack:false };
  DB.alerts.unshift(a);
  if(DB.alerts.length>150) DB.alerts.length=150;
  return a;
}

