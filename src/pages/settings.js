/**
 * Settings page.
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */
import { DB, STATE } from '../core/store.js';
import { timeAgo } from '../ui/shell.js';

export function renderSettings(){
  return `
  <div class="page-head"><div><h1>Settings</h1><div class="page-sub">Data sources, roles and system info</div></div></div>
  <div class="grid g2">
    <div class="card">
      <h3>Data Source Disclosure</h3>
      <p class="small-note" style="font-size:12.5px;color:var(--text-dim);">POLAR TWIN is a Smart India Hackathon prototype for problem statement SIH26060 (Ministry of Earth Sciences / NCPOR). It has <b>no live connection</b> to real Maitri or Bharati station telemetry, sensors or satellite systems. All operational data shown is produced by an in-browser Antarctic Station Data Simulator using correlated, scenario-driven synthetic values. Environmental baselines are informed by publicly available Antarctic climate data. The system architecture (sensors → MQTT → FastAPI → Digital Twin) is designed so real NCPOR telemetry can be substituted later without changing the frontend or the risk/ML layer.</p>
    </div>
    <div class="card">
      <h3>Current Session</h3>
      <div class="metric-row"><span>Signed in as</span><b>${STATE.user?STATE.user.name:'—'}</b></div>
      <div class="metric-row"><span>User ID</span><b>${STATE.user?STATE.user.username:'—'}</b></div>
      <div class="metric-row"><span>Role</span><b>${STATE.role}</b></div>
      <div class="metric-row"><span>Session started</span><b>${STATE.user?timeAgo(STATE.user.loginAt):'—'}</b></div>
      <div class="metric-row"><span>Station filter</span><b>${STATE.selectedStation}</b></div>
      <div class="metric-row"><span>Simulation ticks</span><b>${STATE.tickCount}</b></div>
      <div class="metric-row"><span>Comms link</span><b>${STATE.commsConnected?'Connected':'Offline'}</b></div>
    </div>
  </div>
  <div class="card" style="margin-top:16px;">
    <h3>Key Differentiator</h3>
    <div class="diff-flow">
      <div class="step">Existing Monitoring</div><div class="arrow-down">↓</div>
      <div class="step">Integrated Digital Twin</div><div class="arrow-down">↓</div>
      <div class="step">AI Prediction</div><div class="arrow-down">↓</div>
      <div class="step">Cascade Risk Analysis</div><div class="arrow-down">↓</div>
      <div class="step">What-If Simulation</div><div class="arrow-down">↓</div>
      <div class="step">Explainable Decision Support</div>
    </div>
    <div class="quote">"We don't just show what is happening in Antarctica — we predict what could happen next and allow operators to evaluate possible responses before acting."</div>
  </div>
  <div class="card" style="margin-top:16px;">
    <h3>AI Operations Assistant</h3>
    <div id="assistantLogWrap">${STATE.assistantLog.map(m=>`<div class="assistant-msg ${m.role}">${m.text}</div>`).join('')}</div>
    <div style="margin-top:8px;">
      <span class="q-chip" data-q="Why is Bharati at high risk?">Why is Bharati at high risk?</span>
      <span class="q-chip" data-q="What happens if Generator 2 fails?">What happens if Generator 2 fails?</span>
      <span class="q-chip" data-q="How much fuel is expected to remain after 15 days?">Fuel after 15 days?</span>
      <span class="q-chip" data-q="What should be prioritized during the next resupply?">Resupply priorities?</span>
      <span class="q-chip" data-q="Which equipment requires attention?">Equipment needing attention?</span>
    </div>
    <div class="small-note">Answers are generated from the platform's own structured data (risk engine, telemetry, logistics) — the assistant does not invent readings and never overrides the risk engine.</div>
  </div>
  <div class="card" style="margin-top:16px;">
    <h3>Audit Log</h3>
    <table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Detail</th></tr></thead><tbody>
    ${DB.auditLog.slice(0,25).map(a=>`<tr><td>${timeAgo(a.ts)}</td><td>${a.user}</td><td><b>${a.action}</b></td><td>${a.detail||''}</td></tr>`).join('') || '<tr><td colspan="4" class="small-note">No actions logged yet.</td></tr>'}
    </tbody></table>
  </div>
  `;
}

/* ========================= 3D DIGITAL TWIN ========================= */
