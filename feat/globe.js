(function(){
  var root=document.getElementById('globe'); if(!root) return;
  // Caption text copied verbatim from the country cards on recognition.html
  var FJ=['France & Japan','Hosted research interns: nine students from Université Sorbonne Paris Nord, plus students from CESI École d\'Ingénieurs and NIT Ube College, Japan.'];
  var CAP={
    'Indonesia':['Indonesia','Keynote speaker at ICESTA-2024 and ICCEEAS-2024 (Universitas Sebelas Maret); person in charge of the MoA with UPN “Veteran” Jawa Timur; joint MOOC research with UNESA.'],
    'Iraq':['Iraq','Research and co-publication with Northern Technical University, Al-Ayen University and Al-Bayan University; two PhD students from Northern Technical University.'],
    'Afghanistan':['Afghanistan','Collaboration with Jawzjan University and Faryab University; one PhD and one MSc student from Jawzjan University.'],
    'Iran':['Iran','Research collaboration with the University of Tabriz.'],
    'United Kingdom':['United Kingdom','Research collaboration with Sheffield Hallam University.'],
    'Kazakhstan':['Kazakhstan','Academic attachment at M. Auezov South Kazakhstan University, September 2025.'],
    'Australia':['Australia','Ongoing collaboration with the University of Melbourne, his PhD alma mater, including a joint Q1 paper.'],
    'Thailand':['Thailand','Principal Investigator of a Malaysia–Thailand Strategic Research Partnership grant (2026–2028).'],
    'France':FJ,'Japan':FJ};
  var started=false;
  new IntersectionObserver(function(es,o){ if(es[0].isIntersecting&&!started){started=true;o.disconnect();boot();} },{rootMargin:'200px'}).observe(root);

  function boot(){
    if(!window.d3||!window.topojson||!window.MAP){ setTimeout(boot,150); return; }
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json').then(function(r){return r.json();}).then(init).catch(fallback);
  }

  function fallback(){
    var st=root.querySelector('.gl-stage'), ul=document.createElement('ul'); ul.className='gl-fb';
    Object.keys(CAP).forEach(function(k){var c=CAP[k]; if(k==='Japan')return; var li=document.createElement('li'),b=document.createElement('b');b.textContent=c[0];li.appendChild(b);li.appendChild(document.createTextNode(' '+c[1]));ul.appendChild(li);});
    st.replaceWith(ul); root.querySelector('.gl-chips').hidden=true; root.querySelector('.gl-cap').hidden=true;
  }
  function init(topo){
    var M=window.MAP, d3=window.d3;
    var land=topojson.feature(topo,topo.objects.countries).features;
    var on=new Set(M.on), home=M.home.c, pts=M.pts;
    var cv=root.querySelector('.gl-cv'), stage=root.querySelector('.gl-stage'), ctx=cv.getContext('2d');
    var pinBox=root.querySelector('.gl-pins'), chipBox=root.querySelector('.gl-chips'), cap=root.querySelector('.gl-cap');
    var cs=getComputedStyle(root), tok=function(n,f){return (cs.getPropertyValue(n)||'').trim()||f;};
    var C={velvet:tok('--velvet','#2a0f3a'),v2:tok('--velvet-2','#3d1652'),purple:tok('--purple','#5b2a7a'),soft:tok('--purple-soft','#8a6aa0'),gold:tok('--gold','#c9a227'),lite:tok('--gold-lite','#e8cf7a')};
    var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    var proj=d3.geoOrthographic().clipAngle(90).precision(.4), path=d3.geoPath(proj,ctx);
    var grat=d3.geoGraticule10();
    var rot=reduce?[-95,-15]:[-home[0],-8], vel=0, dragging=false, lastX=0, lastT=0, idleAt=0, tween=null, sel=null, size=0, dpr=1;
    var arcs=pts.map(function(p){var f=d3.geoInterpolate(home,p.c);return {p:p,f:f,co:d3.range(0,1.001,.02).map(f)};});
    var t0=performance.now(), running=false, raf=0, last=t0, vis=true;

    var all=[{n:'UiTM Shah Alam',c:home,home:1}].concat(pts);
    all.forEach(function(p){var e=document.createElement('span');e.className='gl-pin'+(p.home?' home':'');e.innerHTML='<i></i><b></b>';e.lastChild.textContent=p.n;pinBox.appendChild(e);p.el=e;p.lb=e.lastChild;});
    pts.forEach(function(p){var b=document.createElement('button');b.type='button';b.textContent=p.n;b.setAttribute('aria-pressed','false');
      b.addEventListener('click',function(){choose(p);});chipBox.appendChild(b);p.btn=b;});

    function choose(p){
      sel=p; pts.forEach(function(q){q.btn.setAttribute('aria-pressed',q===p?'true':'false');q.el.classList.toggle('sel',q===p);});
      var c=CAP[p.n]; cap.innerHTML='<span class="gl-cn"></span><span></span>'; cap.firstChild.textContent=c[0]; cap.lastChild.textContent=c[1];
      var from=rot.slice(), to=[-p.c[0],-Math.max(-30,Math.min(30,p.c[1]))];
      to[0]=from[0]+(((to[0]-from[0])%360+540)%360-180); // shortest way round
      vel=0; idleAt=performance.now()+6000;
      if(reduce||!running){rot=to;draw(performance.now());return;}
      tween={from:from,to:to,s:performance.now(),d:1200};
    }

    function resize(){ var w=stage.clientWidth; dpr=Math.min(2,window.devicePixelRatio||1); size=w; cv.width=w*dpr; cv.height=w*dpr; proj.scale(w/2-8).translate([w/2,w/2]); if(!running) draw(performance.now()); }

    function draw(now){
      proj.rotate(rot); var r=proj.scale(), cx=size/2, ctr=[-rot[0],-rot[1]];
      ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,size,size);
      var g=ctx.createRadialGradient(cx-r*.35,cx-r*.4,r*.1,cx,cx,r);
      g.addColorStop(0,C.v2); g.addColorStop(1,C.velvet);
      ctx.beginPath(); path({type:'Sphere'}); ctx.fillStyle=g; ctx.fill();
      ctx.save(); ctx.lineWidth=1.5; ctx.strokeStyle=C.lite; ctx.globalAlpha=.4; ctx.shadowColor=C.gold; ctx.shadowBlur=16; ctx.stroke(); ctx.restore();
      ctx.beginPath(); path(grat); ctx.strokeStyle=C.soft; ctx.globalAlpha=.2; ctx.lineWidth=.5; ctx.stroke(); ctx.globalAlpha=1;
      ctx.beginPath(); land.forEach(function(f){if(!on.has(f.properties.name))path(f);}); ctx.fillStyle=C.purple; ctx.globalAlpha=.8; ctx.fill(); ctx.globalAlpha=1;
      land.forEach(function(f){var nm=f.properties.name; if(!on.has(nm))return; var hi=sel&&nm===sel.n;
        ctx.beginPath(); path(f); ctx.fillStyle=hi?C.lite:C.gold; ctx.globalAlpha=hi?1:(sel?.4:.72); ctx.fill(); ctx.globalAlpha=1;});
      var k=reduce?1:Math.min(1,(now-t0)/1800);
      arcs.forEach(function(a,i){
        var hi=sel===a.p, n=Math.max(2,Math.round(a.co.length*k));
        ctx.beginPath(); path({type:'LineString',coordinates:a.co.slice(0,n)});
        ctx.strokeStyle=C.gold; ctx.lineWidth=hi?3:1.2; ctx.strokeStyle=hi?C.lite:C.gold; ctx.globalAlpha=hi?1:(sel?.4:.8); ctx.stroke(); ctx.globalAlpha=1;
        if(!reduce&&k===1){ var q=a.f((now/2600+i*.17)%1);
          if(d3.geoDistance(q,ctr)<Math.PI/2){ var xy=proj(q), gg=ctx.createRadialGradient(xy[0],xy[1],0,xy[0],xy[1],6);
            gg.addColorStop(0,'rgba(255,248,220,.95)'); gg.addColorStop(1,'rgba(255,248,220,0)'); ctx.fillStyle=gg; ctx.fillRect(xy[0]-6,xy[1]-6,12,12);} }
      });
      // labels: dot on the point, text nudged down/up until it clears earlier labels
      var placed=[];
      all.slice().sort(function(a,b){return proj(a.c)[1]-proj(b.c)[1];}).forEach(function(p){
        var v=d3.geoDistance(p.c,ctr)<Math.PI/2-.08; p.el.classList.toggle('off',!v); if(!v)return;
        var xy=proj(p.c), w=p.w||(p.w=p.lb.offsetWidth+12), y=xy[1], h=14, tries=0, hit, flip=xy[0]+w>size, x0=flip?xy[0]-w:xy[0];
        p.lb.style.left=flip?(4-w)+'px':'';
        do{ hit=placed.some(function(q){return x0<q.x+q.w&&q.x<x0+w&&Math.abs(y-q.y)<h;}); if(hit)y+=h; }while(hit&&++tries<6);
        placed.push({x:x0,y:y,w:w});
        p.el.style.left=xy[0]+'px'; p.el.style.top=xy[1]+'px'; p.lb.style.transform='translateY('+(y-xy[1])+'px)';
        p.el.classList.toggle('lead',y!==xy[1]); });
    }

    function frame(now){
      var dt=Math.min(50,now-last); last=now;
      if(tween){var t=Math.min(1,(now-tween.s)/tween.d), e=d3.easeCubicInOut(t); rot=[tween.from[0]+(tween.to[0]-tween.from[0])*e,tween.from[1]+(tween.to[1]-tween.from[1])*e]; if(t===1)tween=null;}
      else if(!dragging){ if(Math.abs(vel)>.002){rot[0]+=vel*dt;vel*=Math.pow(.94,dt/16);} else if(now>idleAt){rot[0]+=.006*dt; rot[1]+=(-8-rot[1])*.01;} }
      draw(now); raf=requestAnimationFrame(frame);
    }
    function setRun(v){ if(reduce||v===running) return; running=v; if(v){last=performance.now();raf=requestAnimationFrame(frame);} else cancelAnimationFrame(raf); }

    if(!reduce){
      stage.addEventListener('pointerdown',function(e){dragging=true;tween=null;vel=0;lastX=e.clientX;lastT=e.timeStamp;try{stage.setPointerCapture(e.pointerId);}catch(_){}});
      stage.addEventListener('pointermove',function(e){ if(!dragging)return; var dx=e.clientX-lastX, dt=Math.max(1,e.timeStamp-lastT), d=dx*180/(Math.PI*proj.scale());
        rot[0]+=d; vel=d/dt; lastX=e.clientX; lastT=e.timeStamp; });
      var end=function(){ if(!dragging)return; dragging=false; idleAt=performance.now()+4000; };
      stage.addEventListener('pointerup',end); stage.addEventListener('pointercancel',end);
      new IntersectionObserver(function(es){vis=es[0].isIntersecting;setRun(vis&&!document.hidden);}).observe(root);
      document.addEventListener('visibilitychange',function(){setRun(vis&&!document.hidden);});
    }
    window.addEventListener('resize',resize); resize(); setRun(true);
  }
})();
