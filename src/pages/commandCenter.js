/**
 * Command Center page.
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */
import { DB, STATE } from '../core/store.js';
import { riskColorClass, sourceBadge, stationStatusSummary } from '../ui/shell.js';
import { fmt1 } from '../utils/helpers.js';

export function renderCommandCenter(){
  const stations = Object.values(DB.stations);
  const primary = STATE.selectedStation==='ALL' ? (DB.stations.BHARATI.riskLevel==='HIGH'||DB.stations.BHARATI.riskLevel==='CRITICAL'?DB.stations.BHARATI:DB.stations.MAITRI) : DB.stations[STATE.selectedStation];
  const gen = primary.generators[0];
  const genHealth = primary.buildings.find(b=>b.id==='gen')?.health || Math.round(primary.generators.reduce((a,g)=>a+g.health,0)/primary.generators.length);
  const fuel = primary.logistics.fuel.qty;
  const risk = Math.min(100, Math.max(8, Math.round(primary.riskScore || 8)));
  const riskLabel = primary.riskLevel==='LOW'?'LOW':primary.riskLevel==='MEDIUM'?'MODERATE':primary.riskLevel;
  const riskClass = riskColorClass(primary.riskLevel);
  const causes = primary.riskCauses && primary.riskCauses.length ? primary.riskCauses.slice(0,3) : [
    {text:'Generator health and vibration trend',weight:32},
    {text:'Extreme environmental conditions',weight:24},
    {text:'Fuel consumption trend',weight:19}
  ];
  const weights = causes.map((c,i)=>Number(c.weight)||[32,24,19][i]||12);
  const alertList = DB.alerts.filter(a=>!a.ack).slice(0,3);
  const healthItems = [
    ['Power', primary.energy.backupPower>=60?'ok':'warn'],
    ['Fuel', fuel>=30?'ok':fuel>=15?'warn':'crit'],
    ['Generator', genHealth>=82?'ok':genHealth>=65?'warn':'crit'],
    ['Comms', primary.commsOffline?'crit':'ok'],
    ['Weather', primary.env.wind>45?'warn':'ok']
  ];
  return `
  <div class="sih-command-head">
    <div>
      <div class="sih-eyebrow">Antarctic Operations · Mission Control</div>
      <h1>Command Center</h1>
      <div class="sih-location">${STATE.selectedStation==='ALL'?'Multi-station operational overview':primary.label+' · '+primary.coords.lat+', '+primary.coords.lon}</div>
    </div>
    <div class="sih-head-right">
      <span class="sih-live-badge"><i class="sih-live-dot"></i> TELEMETRY ACTIVE</span>
      <span class="sih-sim-badge">◉ SIMULATION DATA</span>
      ${sourceBadge('SIMULATED')}
    </div>
  </div>

  <div class="sih-kpi-grid">
    <div class="card sih-kpi"><div class="sih-kpi-top"><span>AMBIENT TEMPERATURE</span><span class="sih-kpi-icon">❄</span></div><div class="sih-kpi-value">${fmt1(primary.env.temp)}<span>°C</span></div><div class="sih-kpi-trend warn">${primary.env.temp<-30?'↓ Extreme cold conditions':'● Within monitored range'}</div></div>
    <div class="card sih-kpi"><div class="sih-kpi-top"><span>POWER LOAD</span><span class="sih-kpi-icon">⚡</span></div><div class="sih-kpi-value">${fmt1(primary.energy.totalConsumption)}<span>kW</span></div><div class="sih-kpi-trend ok">● Grid operating normally</div></div>
    <div class="card sih-kpi"><div class="sih-kpi-top"><span>FUEL RESERVE</span><span class="sih-kpi-icon">▣</span></div><div class="sih-kpi-value">${fmt1(fuel)}<span>%</span></div><div class="sih-kpi-trend ${fuel<30?'warn':'ok'}">${fuel<30?'⚠ Review consumption':'● Adequate reserve'}</div></div>
    <div class="card sih-kpi"><div class="sih-kpi-top"><span>OPERATIONAL ENDURANCE</span><span class="sih-kpi-icon">◷</span></div><div class="sih-kpi-value">${fmt1(primary.endurance)}<span>days</span></div><div class="sih-kpi-trend">Projected critical-operation window</div></div>
  </div>

  <div class="sih-command-grid">
    <div class="card sih-twin-card">
      <div class="sih-card-head"><div><div class="sih-card-title">Station Digital Twin</div><div class="sih-card-meta">Live operational state · ${primary.label}</div></div><button class="sih-link-btn" data-route="twin">OPEN 3D TWIN →</button></div>
      <div class="sih-station-visual">
        <div class="sih-grid-lines"></div><div class="sih-station-glow"></div><div class="sih-station-shape"></div>
        <div class="sih-module gen ${gen.status!=='NORMAL'?'warn':''}">⚡ GENERATOR</div>
        <div class="sih-module hab">⌂ HABITAT</div>
        <div class="sih-module fuel">▣ FUEL FARM</div>
        <div class="sih-module comms ${primary.commsOffline?'warn':''}">◉ COMMS</div>
        <div class="twin-hint">SELECTED STATION · ${primary.label.toUpperCase()}</div>
      </div>
      <div class="sih-twin-footer"><span>Digital twin status: <b style="color:var(--ok)">SYNCHRONIZED</b></span><span>${gen.status==='NORMAL'?'All core modules stable':'⚠ '+gen.name+' requires attention'}</span></div>
    </div>

    <div class="card sih-ai-card">
      <div class="sih-card-head"><div><div class="sih-card-title">AI Risk Intelligence</div><div class="sih-card-meta">Predictive station assessment</div></div><span class="sih-live-badge" style="padding:5px 8px;font-size:8px"><i class="sih-live-dot"></i> AI</span></div>
      <div class="sih-risk-hero">
        <div class="sih-risk-row"><div class="sih-risk-score"><div class="sih-risk-score-inner"><b>${risk}</b><span>RISK</span></div></div><div><div class="sih-risk-level">${riskLabel}</div><div class="sih-risk-desc">${primary.riskCauses?.[0]?.text || 'No dominant anomaly detected. Continue monitoring station telemetry.'}</div></div></div>
      </div>
      <div class="sih-factor-wrap"><div class="sih-card-title" style="margin-bottom:3px">Why is the risk changing?</div>
        ${causes.map((c,i)=>{const w=weights[i]; return `<div class="sih-factor"><div class="sih-factor-label"><span>${c.text}</span><b>${w}%</b></div><div class="sih-factor-bar"><i style="width:${Math.min(100,w*2.5)}%"></i></div></div>`}).join('')}
        <div class="sih-ai-action"><b>AI RECOMMENDATION</b>${primary.commsOffline?'Maintain local operations and queue telemetry until the satellite link is restored.':genHealth<82?'Schedule generator inspection during the next maintenance window.':'Continue monitoring high-impact station parameters.'}</div>
        <div class="sih-action-row"><button class="sih-action" data-route="risk">VIEW RISK ANALYSIS</button><button class="sih-action" data-route="whatif">RUN WHAT-IF</button></div>
      </div>
    </div>
  </div>

  <div class="card" style="margin-bottom:14px"><div class="sih-card-head" style="padding:0 0 11px;border-bottom:0"><div><div class="sih-card-title">System Health</div><div class="sih-card-meta">Current subsystem availability</div></div></div><div class="sih-health">${healthItems.map(([label,cls])=>`<div class="sih-health-item"><i class="sih-health-dot ${cls}"></i><span>${label}</span><b style="margin-left:auto;color:var(--text)">${cls==='ok'?'NORMAL':cls==='warn'?'WATCH':'ALERT'}</b></div>`).join('')}</div></div>

  <div class="sih-bottom-grid">
    <div class="card"><div class="sih-card-head" style="padding:0 0 8px"><div><div class="sih-card-title">Active Alerts</div><div class="sih-card-meta">Unacknowledged operational events</div></div><button class="sih-link-btn" data-route="alerts">VIEW ALL →</button></div>
      ${alertList.length ? alertList.map(a=>`<div class="sih-alert"><div class="sih-alert-icon ${a.severity==='CRITICAL'||a.severity==='EMERGENCY'?'crit':''}">${a.severity==='CRITICAL'||a.severity==='EMERGENCY'?'!':'⚠'}</div><div><div class="sih-alert-title">${a.title||a.asset||'Operational alert'}</div><div class="sih-alert-meta">${a.asset||''}${a.reason?' · '+a.reason:''}</div></div></div>`).join('') : `<div class="small-note" style="padding:12px 0">No unacknowledged alerts. Station monitoring continues.</div>`}
    </div>
    <div class="card"><div class="sih-card-head" style="padding:0 0 8px"><div><div class="sih-card-title">Operational Endurance</div><div class="sih-card-meta">AI-assisted resource outlook</div></div><button class="sih-link-btn" data-route="logistics">LOGISTICS →</button></div><div class="sih-endurance"><div class="sih-endurance-num">${fmt1(primary.endurance)}<span> days</span></div><div class="sih-endurance-copy">Estimated critical-operation window based on fuel, water, food, medical stores, spares and equipment health.<br><span style="color:var(--sih-yellow)">Prototype estimate · not an official NCPOR metric.</span></div></div><div style="margin-top:14px"><div class="metric-row"><span>Fuel reserve</span><b>${fmt1(fuel)}%</b></div><div class="progress ${fuel<30?'warn':''}"><div style="width:${fuel}%"></div></div></div></div>
  </div>

  <div class="card"><div class="sih-card-head" style="padding:0 0 8px"><div><div class="sih-card-title">Station Comparison</div><div class="sih-card-meta">Quick cross-station operational snapshot</div></div></div><div class="grid g2">${stations.map(st=>{const sg=stationStatusSummary(st); return `<div class="station-card" style="padding:12px 14px"><div class="card-title-row"><b>${st.label}</b><span class="status-pill ${sg.level}">${sg.emoji} ${sg.label}</span></div><div class="grid g4" style="gap:8px"><div><div style="font-size:9px;color:var(--text-faint)">FUEL</div><b class="mono">${fmt1(st.logistics.fuel.qty)}%</b></div><div><div style="font-size:9px;color:var(--text-faint)">POWER</div><b class="mono">${fmt1(st.energy.totalConsumption)} kW</b></div><div><div style="font-size:9px;color:var(--text-faint)">RISK</div><b class="mono">${st.riskLevel}</b></div><div><div style="font-size:9px;color:var(--text-faint)">ENDURANCE</div><b class="mono">${fmt1(st.endurance)}d</b></div></div></div>`}).join('')}</div></div>
  `;
}

/* ========================= STATION OVERVIEW ========================= */
