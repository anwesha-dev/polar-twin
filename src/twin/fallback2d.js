/**
 * Built-in 2D canvas renderer used if WebGL is unavailable.
 * POLAR TWIN — all data handled here is SYNTHETIC (not NCPOR telemetry).
 */
import { STATE } from '../core/store.js';
import { TW_IDS, TW_NAMES, twinStatus } from './digitalTwin.js';
import { clamp } from '../utils/helpers.js';

export function tw2dParts(){
  const out=[];
  const mk=(id,ox,oz)=>({
    bx:(w,h,d,x,y,z,k)=>out.push({id,t:'box',x:ox+x,y,z:oz+z,w,h,d,k}),
    cy:(r,h,x,y,z,k)=>out.push({id,t:'cyl',x:ox+x,y,z:oz+z,r,h,k}),
    sp:(r,x,y,z,k,gid)=>out.push({id,t:'sph',x:ox+x,y,z:oz+z,r,k,gid}),
    dm:(r,x,y,z,k)=>out.push({id,t:'dome',x:ox+x,y,z:oz+z,r,k}),
    bar:(x,z)=>out.push({id,t:'bar',x:ox+x,y:0,z:oz+z,w:.35,d:.35,h:1,k:'b'}),
  });
  let a=mk('hab',-7,-3.5);
  [[-3.6,-1.9],[3.6,-1.9],[-3.6,1.9],[3.6,1.9]].forEach(q=>a.bx(.4,1,.4,q[0],.5,q[1],'n'));
  a.bx(8,3,4.4,0,2.5,0,'s'); a.bx(8.4,.25,4.8,0,4.1,0,'d'); a.bx(6.4,.6,.06,0,2.9,2.23,'g'); a.bx(6.4,.6,.06,0,2.9,-2.23,'g'); a.sp(.28,3,4.55,0,'b');
  a=mk('lab',-7,3.5);
  a.bx(6,2.4,3.6,0,1.2,0,'s'); a.bx(6.3,.2,3.9,0,2.5,0,'d'); a.bx(4.5,.5,.06,0,1.5,1.83,'g'); a.bx(4.5,.5,.06,0,1.5,-1.83,'g'); a.cy(.5,.5,-1.5,2.85,0,'n'); a.sp(.25,2.4,2.9,0,'b');
  a=mk('gen',3,-4.5);
  a.bx(5,2.8,3.4,0,1.4,0,'s'); a.bx(5.3,.2,3.7,0,2.9,0,'d'); a.cy(.22,2,-1.6,3.9,-1,'d'); a.cy(.22,2,-.8,3.9,-1,'d'); a.bx(3.6,.6,.06,0,1.5,1.72,'g');
  a.sp(.34,-1,3.55,.4,'b','G1'); a.sp(.34,1,3.55,.4,'b','G2');
  a=mk('fuel',0,0);
  [[8.2,-5.8],[11,-5.8],[9.6,-3.3]].forEach(q=>{ a.cy(1.25,3.2,q[0],1.6,q[1],'s'); a.cy(1.3,.12,q[0],3.26,q[1],'d'); });
  a.bx(3.8,.15,.15,9.6,.9,-4.6,'d'); a.bar(12.9,-4.5);
  a=mk('water',4.5,3.5);
  a.bx(4.4,2.4,3.4,0,1.2,0,'s'); a.bx(4.7,.2,3.7,0,2.5,0,'d'); a.cy(.9,3.4,3.3,1.7,0,'n'); a.bx(1.6,.15,.15,1.9,1,0,'d'); a.sp(.25,0,2.9,0,'b');
  a=mk('power',11,3.5);
  a.bx(2.2,.8,2.2,0,.4,0,'s'); a.cy(.25,9.5,0,5.55,0,'n'); a.bx(3,.1,.1,0,8,0,'n'); a.bx(2.2,.1,.1,0,6.4,0,'n'); a.sp(.6,.9,7.2,.4,'n'); a.sp(.3,0,10.5,0,'b');
  a=mk('store',-1,7);
  a.bx(6,2.4,3.4,0,1.2,0,'s'); a.bx(6.3,.2,3.7,0,2.5,0,'d'); a.bx(1.6,1.8,.06,1.5,.9,1.73,'d'); a.cy(.25,.6,-1.6,2.9,0,'n'); a.cy(.25,.6,-.6,2.9,0,'n'); a.sp(.25,2.4,2.85,0,'b');
  a=mk('em',-14,0);
  a.dm(1.9,0,0,0,'s'); a.bx(.8,1.1,.06,0,.55,1.75,'d'); a.sp(.22,0,2.15,0,'b');
  return out;
}
export function tw2dFaces(p,fuel){
  const F=[]; const quad=(v,n)=>F.push({v,n,c:[(v[0][0]+v[2][0])/2,(v[0][1]+v[2][1])/2,(v[0][2]+v[2][2])/2]});
  if(p.t==='box'||p.t==='bar'){
    let h=p.h,y=p.y; if(p.t==='bar'){ h=.15+3*clamp(fuel,0,100)/100; y=h/2; }
    const x0=p.x-p.w/2,x1=p.x+p.w/2,y0=y-h/2,y1=y+h/2,z0=p.z-p.d/2,z1=p.z+p.d/2;
    quad([[x1,y0,z0],[x1,y0,z1],[x1,y1,z1],[x1,y1,z0]],[1,0,0]);
    quad([[x0,y0,z1],[x0,y0,z0],[x0,y1,z0],[x0,y1,z1]],[-1,0,0]);
    quad([[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]],[0,0,1]);
    quad([[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0]],[0,0,-1]);
    quad([[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]],[0,1,0]);
  } else if(p.t==='cyl'){
    const N=16,y0=p.y-p.h/2,y1=p.y+p.h/2,top=[];
    for(let i=0;i<N;i++){
      const a0=6.2832*i/N,a1=6.2832*(i+1)/N,c0=Math.cos(a0),s0=Math.sin(a0),c1=Math.cos(a1),s1=Math.sin(a1),am=(a0+a1)/2;
      quad([[p.x+p.r*c0,y0,p.z+p.r*s0],[p.x+p.r*c1,y0,p.z+p.r*s1],[p.x+p.r*c1,y1,p.z+p.r*s1],[p.x+p.r*c0,y1,p.z+p.r*s0]],[Math.cos(am),0,Math.sin(am)]);
      top.push([p.x+p.r*c0,y1,p.z+p.r*s0]);
    }
    F.push({v:top,n:[0,1,0],c:[p.x,y1,p.z]});
  } else if(p.t==='dome'){
    const R=5,N=14, pt=(t,a)=>[p.x+p.r*Math.cos(t)*Math.cos(a),p.y+p.r*Math.sin(t),p.z+p.r*Math.cos(t)*Math.sin(a)];
    for(let j=0;j<R;j++) for(let i=0;i<N;i++){
      const t0=j*1.5708/R,t1=(j+1)*1.5708/R,a0=6.2832*i/N,a1=6.2832*(i+1)/N;
      const v=[pt(t0,a0),pt(t0,a1),pt(t1,a1),pt(t1,a0)];
      const c=[0,1,2].map(k=>(v[0][k]+v[1][k]+v[2][k]+v[3][k])/4), n=[c[0]-p.x,c[1]-p.y,c[2]-p.z], l=Math.hypot(n[0],n[1],n[2])||1;
      F.push({v,n:[n[0]/l,n[1]/l,n[2]/l],c});
    }
  }
  return F;
}
export const TW_RGB = h=>[(h>>16)&255,(h>>8)&255,h&255];
export const TW_BASE = {n:0x9db2c2,d:0x22384a,g:0x2b6f8f};
export function twinInit2d(ctx,w,h){
  const cv = ctx.cv = document.createElement('canvas');
  cv.style.cursor='grab'; ctx.wrap.insertBefore(cv, ctx.wrap.firstChild);
  const g = cv.getContext('2d'); if(!g) throw new Error('Canvas 2D unavailable');
  ctx.g=g; ctx.dpr=Math.min(window.devicePixelRatio||1,2);
  ctx.resize=(w2,h2)=>{ ctx.W=w2; ctx.H=h2; cv.width=Math.round(w2*ctx.dpr); cv.height=Math.round(h2*ctx.dpr); };
  ctx.resize(w,h);
  const parts = ctx.parts = tw2dParts();
  parts.forEach(p=>{ if(p.t!=='bar') p.faces=tw2dFaces(p); });
  ctx.bounds={};
  TW_IDS.forEach(id=>{
    let x0=1e9,x1=-1e9,z0=1e9,z1=-1e9,top=0;
    parts.filter(p=>p.id===id&&!p.gid).forEach(p=>{
      const hw=(p.w||p.r*2)/2, hd=(p.d||p.r*2)/2, hh=p.t==='dome'?p.r:p.t==='sph'?p.r:(p.h||1)/2;
      x0=Math.min(x0,p.x-hw); x1=Math.max(x1,p.x+hw); z0=Math.min(z0,p.z-hd); z1=Math.max(z1,p.z+hd);
      top=Math.max(top,(p.t==='dome'||p.t==='sph')?p.y+hh:p.y+hh);
    });
    ctx.bounds[id]={c:{x:(x0+x1)/2,z:(z0+z1)/2},r:Math.max(x1-x0,z1-z0)/2+.4,top};
  });
  const L=(()=>{const v=[14,24,10],l=Math.hypot(...v);return v.map(x=>x/l);})();
  const paths=[[26,1.2,-1,0]].concat([[-7,-3.5],[-7,3.5],[3,-4.5],[10,-5],[4.5,3.5],[11,3.5],[-1,7]].map(q=>[1,Math.abs(q[1]),q[0],q[1]/2]));
  ctx.draw = ()=>{
    const W=ctx.W,H=ctx.H; g.setTransform(ctx.dpr,0,0,ctx.dpr,0,0); g.clearRect(0,0,W,H);
    const tg=[-1.5,1.4,.5], cp=[tg[0]+ctx.r*Math.cos(ctx.el)*Math.sin(ctx.az), tg[1]+ctx.r*Math.sin(ctx.el), tg[2]+ctx.r*Math.cos(ctx.el)*Math.cos(ctx.az)];
    let f=[tg[0]-cp[0],tg[1]-cp[1],tg[2]-cp[2]]; let l=Math.hypot(...f); f=f.map(x=>x/l);
    let rt=[-f[2],0,f[0]]; l=Math.hypot(...rt); rt=rt.map(x=>x/l);
    const up=[rt[1]*f[2]-rt[2]*f[1], rt[2]*f[0]-rt[0]*f[2], rt[0]*f[1]-rt[1]*f[0]];
    const fpx=(H/2)/Math.tan(22.5*Math.PI/180);
    const P=(x,y,z)=>{ const dx=x-cp[0],dy=y-cp[1],dz=z-cp[2]; const zc=dx*f[0]+dy*f[1]+dz*f[2]; if(zc<.3) return null;
      return [W/2+(dx*rt[0]+dy*rt[1]+dz*rt[2])*fpx/zc, H/2-(dx*up[0]+dy*up[1]+dz*up[2])*fpx/zc, zc]; };
    const camv=(x,y,z)=>{ const dx=x-cp[0],dy=y-cp[1],dz=z-cp[2]; return [dx*rt[0]+dy*rt[1]+dz*rt[2], dx*up[0]+dy*up[1]+dz*up[2], dx*f[0]+dy*f[1]+dz*f[2]]; };
    const pj=c=>[W/2+c[0]*fpx/c[2], H/2-c[1]*fpx/c[2], c[2]];
    const NEAR=.3;
    const clipPoly=(p3)=>{ const c=p3.map(q=>camv(q[0],q[1],q[2])), out=[];
      for(let i=0;i<c.length;i++){ const a=c[i], b=c[(i+1)%c.length], ai=a[2]>=NEAR, bi=b[2]>=NEAR;
        if(ai) out.push(a);
        if(ai!==bi){ const t=(NEAR-a[2])/(b[2]-a[2]); out.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,NEAR]); } }
      return out.length>=3 ? out.map(pj) : null; };
    const clipSeg=(a3,b3)=>{ let a=camv(...a3), b=camv(...b3); if(a[2]<NEAR&&b[2]<NEAR) return null;
      if(a[2]<NEAR){ const t=(NEAR-a[2])/(b[2]-a[2]); a=[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,NEAR]; }
      else if(b[2]<NEAR){ const t=(NEAR-b[2])/(a[2]-b[2]); b=[b[0]+(a[0]-b[0])*t,b[1]+(a[1]-b[1])*t,NEAR]; }
      return [pj(a),pj(b)]; };
    const poly=(pts)=>{ g.beginPath(); pts.forEach((q,i)=>i?g.lineTo(q[0],q[1]):g.moveTo(q[0],q[1])); g.closePath(); };
    const hits=[];
    // ground
    const ring=(cx,cz,r,y,n)=>{ const o=[]; for(let i=0;i<n;i++){ const a=6.2832*i/n; o.push([cx+r*Math.cos(a),y,cz+r*Math.sin(a)]); } return clipPoly(o); };
    const gr=ring(0,0,30,0,72);
    if(gr){
      poly(gr); const gg=g.createRadialGradient(W/2,H*.55,10,W/2,H*.55,Math.max(W,H)*.7); gg.addColorStop(0,'#c4d8e6'); gg.addColorStop(1,'#8fa9bd'); g.fillStyle=gg; g.fill();
      g.save(); poly(gr); g.clip(); g.strokeStyle='rgba(40,96,125,.28)'; g.lineWidth=1; g.beginPath();
      for(let v=-30;v<=30;v+=3){ [[[v,0,-30],[v,0,30]],[[-30,0,v],[30,0,v]]].forEach(sg=>{ const q=clipSeg(sg[0],sg[1]); if(q){ g.moveTo(q[0][0],q[0][1]); g.lineTo(q[1][0],q[1][1]); } }); }
      g.stroke(); g.restore();
      poly(gr); g.strokeStyle='rgba(56,189,248,.55)'; g.lineWidth=2; g.stroke();
    }
    paths.forEach(q=>{ const [w2,d2,x,z]=q; const v=clipPoly([[x-w2/2,.02,z-d2/2],[x+w2/2,.02,z-d2/2],[x+w2/2,.02,z+d2/2],[x-w2/2,.02,z+d2/2]]); if(!v) return; poly(v); g.fillStyle='rgba(42,67,86,.85)'; g.fill(); });
    // selection ring
    const sel=STATE.twinSelectedObject;
    if(sel && ctx.bounds[sel.id]){ const b=ctx.bounds[sel.id], rr=ring(b.c.x,b.c.z,b.r,.05,44); if(rr){ poly(rr); g.strokeStyle='rgba(14,116,170,.95)'; g.lineWidth=2.5; g.stroke(); g.fillStyle='rgba(56,189,248,.16)'; g.fill(); } }
    // parts, far -> near
    const order=parts.map(p=>({p,d:(p.x-cp[0])**2+((p.t==='dome'?p.y+p.r/2:p.y)-cp[1])**2+(p.z-cp[2])**2})).sort((A,B)=>B.d-A.d);
    order.forEach(({p})=>{
      const dat=ctx.data[p.id]; let rgb;
      if(p.k==='s'||p.k==='b') rgb=TW_RGB(p.gid&&ctx.gcol[p.gid]!=null?ctx.gcol[p.gid]:(dat?dat.c:0x34d399)); else rgb=TW_RGB(TW_BASE[p.k]);
      if(p.t==='sph'){
        const q=P(p.x,p.y,p.z); if(!q) return; const rad=Math.max(3,p.r*fpx/q[2]);
        if(p.k==='b'){ g.beginPath(); g.arc(q[0],q[1],rad*2.3,0,6.2832); g.fillStyle=`rgba(${rgb[0]},${rgb[1]},${rgb[2]},.2)`; g.fill(); }
        g.beginPath(); g.arc(q[0],q[1],rad,0,6.2832); g.fillStyle=`rgb(${rgb[0]},${rgb[1]},${rgb[2]})`; g.fill(); g.strokeStyle='rgba(234,250,255,.6)'; g.lineWidth=1; g.stroke();
        hits.push({c:[q[0],q[1],Math.max(rad*1.6,9)],id:p.id,genId:p.gid||null}); return;
      }
      const faces=p.t==='bar'?tw2dFaces(p,ctx.fuelQty==null?60:ctx.fuelQty):p.faces;
      faces.forEach(fc=>{
        if(fc.n[0]*(cp[0]-fc.c[0])+fc.n[1]*(cp[1]-fc.c[1])+fc.n[2]*(cp[2]-fc.c[2])<=0) return;
        const pts=fc.v.map(v=>P(v[0],v[1],v[2])); if(pts.some(t=>!t)) return;
        const sh=.52+.55*Math.max(0,fc.n[0]*L[0]+fc.n[1]*L[1]+fc.n[2]*L[2]);
        const m=p.k==='b'?1:sh, add=p.k==='g'?26:0;
        g.fillStyle=`rgb(${Math.min(255,Math.round(rgb[0]*m+add))},${Math.min(255,Math.round(rgb[1]*m+add))},${Math.min(255,Math.round(rgb[2]*m+add))})`;
        poly(pts); g.fill(); g.strokeStyle='rgba(20,45,62,.55)'; g.lineWidth=1; g.stroke();
        hits.push({pts,id:p.id});
      });
    });
    // labels
    const ls=clamp(W/900,.8,1.1), rects=[]; g.textBaseline='middle'; g.textAlign='left';
    TW_IDS.forEach(id=>{
      const b=ctx.bounds[id], dd=ctx.data[id]; if(!b||!dd) return;
      const q=P(b.c.x,b.top+1.5,b.c.z), q0=P(b.c.x,b.top,b.c.z); if(!q) return;
      const name=TW_NAMES[id], sub=dd.d.offline?'OFFLINE':Math.round(dd.d.health)+'% · '+twinStatus(dd.d.health,false);
      g.font=`600 ${12*ls}px "IBM Plex Sans",sans-serif`; const w1=g.measureText(name).width;
      g.font=`500 ${10*ls}px "IBM Plex Mono",monospace`; const w2=g.measureText(sub).width;
      const bw=Math.max(w1,w2)+32*ls, bh=34*ls, x=q[0]-bw/2, y=q[1]-bh/2;
      if(q0){ g.strokeStyle='rgba(125,211,252,.55)'; g.lineWidth=1; g.beginPath(); g.moveTo(q[0],q[1]+bh/2); g.lineTo(q0[0],q0[1]); g.stroke(); }
      g.beginPath(); if(g.roundRect) g.roundRect(x,y,bw,bh,6); else g.rect(x,y,bw,bh);
      g.fillStyle='rgba(5,17,27,.88)'; g.fill(); g.strokeStyle=(sel&&sel.id===id)?'rgba(125,211,252,1)':'rgba(125,211,252,.4)'; g.lineWidth=(sel&&sel.id===id)?2:1; g.stroke();
      const c=TW_RGB(dd.c); g.beginPath(); g.arc(x+13*ls,y+bh/2,5*ls,0,6.2832); g.fillStyle=`rgb(${c[0]},${c[1]},${c[2]})`; g.fill();
      g.fillStyle='#eaf2f7'; g.font=`600 ${12*ls}px "IBM Plex Sans",sans-serif`; g.fillText(name,x+24*ls,y+bh*.36);
      g.fillStyle='#8ca3b8'; g.font=`500 ${10*ls}px "IBM Plex Mono",monospace`; g.fillText(sub,x+24*ls,y+bh*.72);
      rects.push({x,y,w:bw,h:bh,id});
    });
    ctx.hits=hits; ctx.rects=rects;
  };
  ctx.pick = e=>{
    const r=cv.getBoundingClientRect(), x=e.clientX-r.left, y=e.clientY-r.top;
    for(let i=(ctx.rects||[]).length-1;i>=0;i--){ const q=ctx.rects[i]; if(x>=q.x&&x<=q.x+q.w&&y>=q.y&&y<=q.y+q.h) return {id:q.id}; }
    const hs=ctx.hits||[];
    for(let i=hs.length-1;i>=0;i--){
      const q=hs[i];
      if(q.c){ if(Math.hypot(x-q.c[0],y-q.c[1])<=q.c[2]) return {id:q.id,genId:q.genId}; continue; }
      let inside=false; const v=q.pts;
      for(let a=0,b=v.length-1;a<v.length;b=a++){ if(((v[a][1]>y)!==(v[b][1]>y)) && (x<(v[b][0]-v[a][0])*(y-v[a][1])/(v[b][1]-v[a][1])+v[a][0])) inside=!inside; }
      if(inside) return {id:q.id};
    }
    return null;
  };
}

/* ================= Shared init / loop ================= */
