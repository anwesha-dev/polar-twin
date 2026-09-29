/**
 * Chart.js page charts.
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */
import Chart from 'chart.js/auto';
import { DB } from '../core/store.js';

export const chartInstances = {};
export function destroyChart(id){ if(chartInstances[id]){ chartInstances[id].destroy(); delete chartInstances[id]; } }
export function initPageCharts(){
  Object.values(DB.stations).forEach(st=>{
    const pc = document.getElementById('chart-power-'+st.key);
    if(pc){
      destroyChart('power-'+st.key);
      chartInstances['power-'+st.key] = new Chart(pc, { type:'line', data:{ labels: st.telemetryHistory.power.map((_,i)=>i), datasets:[{label:'Power (kW)', data:st.telemetryHistory.power, borderColor:'#4fc3e8', tension:.3, pointRadius:0}] },
        options:{ animation:false, plugins:{legend:{labels:{color:'#8ca3b8'}}}, scales:{x:{display:false}, y:{ticks:{color:'#8ca3b8'},grid:{color:'#152230'}}} } });
    }
    const envc = document.getElementById('chart-env-'+st.key);
    if(envc){
      destroyChart('env-'+st.key);
      chartInstances['env-'+st.key] = new Chart(envc, { type:'line', data:{ labels: st.telemetryHistory.temp.map((_,i)=>i), datasets:[{label:'Temperature (°C)', data:st.telemetryHistory.temp, borderColor:'#f5a623', tension:.3, pointRadius:0}] },
        options:{ animation:false, plugins:{legend:{labels:{color:'#8ca3b8'}}}, scales:{x:{display:false}, y:{ticks:{color:'#8ca3b8'},grid:{color:'#152230'}}} } });
    }
    st.generators.forEach(g=>{
      const vc = document.getElementById('chart-vib-'+st.key+'-'+g.id);
      if(vc){
        destroyChart('vib-'+st.key+'-'+g.id);
        chartInstances['vib-'+st.key+'-'+g.id] = new Chart(vc, { type:'line', data:{ labels:g.history.vibration.map((_,i)=>i), datasets:[{label:'Vibration (mm/s)', data:g.history.vibration, borderColor: g.anomaly?'#e5484d':'#34d399', tension:.3, pointRadius:0}] },
          options:{ animation:false, plugins:{legend:{labels:{color:'#8ca3b8'}}}, scales:{x:{display:false}, y:{ticks:{color:'#8ca3b8'},grid:{color:'#152230'}}} } });
      }
    });
  });
}

/* ========================= AI ASSISTANT (structured, no invented data) ========================= */
