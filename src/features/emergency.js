/**
 * Emergency trigger and restore sequence.
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */
import { DB, STATE, pushAudit } from '../core/store.js';
import { buildEmergencyOverlayHTML } from '../pages/emergency.js';
import { render } from '../ui/shell.js';
import { toast } from '../ui/toast.js';

export function runRestoreSequence(){
  const wrap = document.getElementById('syncProgressWrap');
  const total = Math.max(DB.syncQueue.length, 1);
  let synced = 0;
  wrap.innerHTML = `<div class="small-note">Synchronizing... <span id="syncCount">0</span> / ${total} records</div><div class="progress" style="margin-top:6px;"><div id="syncBar" style="width:0%"></div></div>`;
  const timer = setInterval(()=>{
    synced += Math.ceil(total/12);
    synced = Math.min(synced,total);
    document.getElementById('syncCount').textContent = synced;
    document.getElementById('syncBar').style.width = (synced/total*100)+'%';
    if(synced>=total){
      clearInterval(timer);
      DB.syncQueue = [];
      STATE.commsConnected = true;
      pushAudit('Communication restored', `${total} records synchronized`);
      toast('Synchronization complete.','ok');
      setTimeout(render, 400);
    }
  }, 180);
}

export function triggerEmergency(trigger){
  const stKey = STATE.selectedStation==='ALL' ? (DB.stations.BHARATI.riskLevel==='CRITICAL'||DB.stations.BHARATI.riskLevel==='HIGH' ? 'BHARATI':'MAITRI') : STATE.selectedStation;
  STATE.emergencyActive = true;
  const overlay = document.getElementById('emergencyOverlay');
  overlay.innerHTML = buildEmergencyOverlayHTML(trigger, DB.stations[stKey]);
  overlay.classList.add('show');
  pushAudit('Emergency Mode activated', `${trigger} — ${DB.stations[stKey].label}`);
  document.getElementById('exitEmergencyBtn').addEventListener('click', ()=>{
    overlay.classList.remove('show'); STATE.emergencyActive=false; pushAudit('Emergency Mode exited', trigger); render();
  });
}

/* ========================= DEMO MODE ========================= */
