import './styles/main.css';
import { STATE, pushAudit } from './core/store.js';
import { doLogin, goBack, logout } from './features/auth.js';
import { resetDemo, startDemo } from './features/demo.js';
import { simulateTick } from './simulator/engine.js';
import { render } from './ui/shell.js';
import { toast } from './ui/toast.js';
import { $id } from './utils/helpers.js';

/* ========================= APP BOOTSTRAP ========================= */
$id('enterBtn').addEventListener('click', doLogin);
['loginUser','loginPass'].forEach(i=>{
  $id(i).addEventListener('keydown', e=>{ if(e.key==='Enter') doLogin(); });
  $id(i).addEventListener('input', ()=>{ $id('loginError').hidden=true; });
});
$id('forgotLink').addEventListener('click', e=>{ e.preventDefault(); toast('Password recovery is not available in this demo environment.'); });
$id('logoutBtn').addEventListener('click', logout);
try{ const ru=localStorage.getItem('polarTwinUser'); if(ru){ $id('loginUser').value=ru; $id('loginRemember').checked=true; } }catch(_){}

const closeNav = ()=>document.body.classList.remove('nav-open');
$id('menuBtn').addEventListener('click', ()=>document.body.classList.toggle('nav-open'));
$id('navBackdrop').addEventListener('click', closeNav);
window.addEventListener('resize', ()=>{ if(window.innerWidth>900) closeNav(); });
$id('sidebar').addEventListener('click', e=>{
  try{ const item=e.target.closest('[data-route]'); if(item){ closeNav(); STATE.route=item.dataset.route; render(); } }
  catch(err){ console.error(err); toast('Navigation error','err'); }
});
$id('main').addEventListener('click', e=>{
  try{
    if(e.target.closest('[data-back]')){ goBack(); return; }
    const item=e.target.closest('[data-route]'); if(item){ STATE.route=item.dataset.route; render(); }
  }catch(err){ console.error(err); toast('Navigation error','err'); }
});
$id('stationSelect').addEventListener('click', e=>{
  const b = e.target.closest('button[data-st]');
  if(b){ STATE.selectedStation = b.dataset.st; document.querySelectorAll('#stationSelect button').forEach(x=>x.classList.remove('active')); b.classList.add('active'); render(); }
});
$id('roleSelect').addEventListener('change', e=>{ STATE.role=e.target.value; pushAudit('Role switched', STATE.role); render(); });
$id('demoBtn').addEventListener('click', startDemo);
$id('resetDemoBtn').addEventListener('click', resetDemo);



// Kick off one immediate tick so first render has non-zero derived values
simulateTick();
