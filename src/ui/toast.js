/**
 * Toast notifications.
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */

export function toast(msg, kind){
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = 'toast'+(kind?(' '+kind):'');
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(()=>{ el.style.opacity='0'; el.style.transition='opacity .4s'; setTimeout(()=>el.remove(),400); }, 4200);
}

/* =========================================================================
   ANTARCTIC STATION DATA SIMULATOR
   Produces correlated synthetic telemetry (not independent random numbers).
   Every scenario perturbs a small set of root variables; everything else
   (power draw, generator load, fuel burn, risk) is DERIVED from those,
   mirroring how the real cascade would propagate once real sensors are
   wired in behind the same interfaces.
   ========================================================================= */

