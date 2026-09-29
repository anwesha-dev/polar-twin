/**
 * Simulator timer (3 s tick) that drives live updates.
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */
import { STATE } from '../core/store.js';
import { simulateTick } from './engine.js';
import { twinCtx, twinUpdateColors } from '../twin/digitalTwin.js';
import { render, renderCommsPill, renderSidebar } from '../ui/shell.js';

export let simTimer = null;
export function simTick(){
  try{
    simulateTick();
    // On the 3D Twin page never rebuild the WebGL scene — just refresh colors/data.
    if(STATE.route==='twin'){ if(twinCtx) twinUpdateColors(); renderSidebar(); renderCommsPill(); }
    else render();
  }catch(e){ console.error('tick error', e); }
}
export function startSim(){ if(!simTimer) simTimer = setInterval(simTick, 3000); }
export function stopSim(){ if(simTimer){ clearInterval(simTimer); simTimer=null; } }
