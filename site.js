// Menu, reveal-on-scroll, counters, lightbox, publication filter, map
(function(){
  var m=document.querySelector('.menu'),n=document.querySelector('.nav');
  if(m)m.addEventListener('click',function(){var o=n.classList.toggle('open');m.setAttribute('aria-expanded',o)});

  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;
    e.target.classList.add('in');io.unobserve(e.target);
    e.target.querySelectorAll('[data-count]').forEach(count)})},{threshold:.15});
  document.querySelectorAll('.rv,.bars,.stats').forEach(function(el){io.observe(el)});

  function count(el){
    var end=parseFloat(el.dataset.count),dec=(el.dataset.count.split('.')[1]||'').length,t0=null,pre='',suf='';
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){return}
    function step(t){t0=t0||t;var p=Math.min((t-t0)/1400,1),v=end*(1-Math.pow(1-p,3));
      el.textContent=pre+v.toLocaleString('en-MY',{minimumFractionDigits:dec,maximumFractionDigits:dec})+suf;if(p<1)requestAnimationFrame(step)}
    requestAnimationFrame(step);
  }

  var lb=document.createElement('div');lb.className='lightbox';lb.innerHTML='<button type="button">Close</button><div><img alt=""><p></p></div>';
  document.body.appendChild(lb);
  function close(){lb.classList.remove('open')}
  lb.addEventListener('click',function(e){if(e.target.tagName!=='IMG')close()});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});
  document.querySelectorAll('figure.ph').forEach(function(f){
    f.tabIndex=0;
    function open(){var i=f.querySelector('img'),c=f.querySelector('figcaption');lb.querySelector('img').src=i.src;lb.querySelector('img').alt=i.alt;lb.querySelector('p').textContent=c?c.textContent:'';lb.classList.add('open')}
    f.addEventListener('click',open);f.addEventListener('keydown',function(e){if(e.key==='Enter')open()});
  });

  // publications
  var list=document.getElementById('publist');
  if(list&&window.PUBS){
    var q=document.getElementById('fq'),ty=document.getElementById('ft'),yr=document.getElementById('fy'),qt=document.getElementById('fqt'),ct=document.getElementById('fcount');
    var esc=function(s){return String(s||'').replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
    var me=/((?:Alias|Alis),?\s*A\.\s*B\.|Bahari,?\s*A\.|Azil Bahari[^;,]*)/g;
    function draw(){
      var s=q.value.trim().toLowerCase(),t=ty.value,y=yr.value,k=qt.value;
      var r=PUBS.filter(function(p){
        if(t&&p.g!==t)return false;
        if(y&&String(p.y).slice(0,3)+'0'!==y)return false;
        if(k==='Q1/Q2'&&!(p.q==='Q1'||p.q==='Q2'))return false;
        if(k&&k!=='Q1/Q2'&&p.q!==k)return false;
        return !s||(p.t+' '+p.a+' '+p.s).toLowerCase().indexOf(s)>-1});
      ct.textContent=r.length+' of '+PUBS.length+' outputs';
      list.innerHTML=r.map(function(p){
        var src=[p.s,p.v&&('vol. '+p.v),p.i&&('('+p.i+')'),p.p&&('pp. '+p.p)].filter(Boolean).join(', ');
        return '<li class="pub"><div class="py">'+p.y+'</div><div><p class="pt">'+(p.d?'<a href="https://doi.org/'+esc(p.d)+'" target="_blank" rel="noopener">'+esc(p.t)+'</a>':esc(p.t))+'</p>'+
          '<p class="pa">'+esc(p.a).replace(me,'<span class="me">$1</span>')+'</p><p class="ps">'+esc(src)+'</p></div>'+
          '<div class="pm"><span class="q '+(p.q?p.q.toLowerCase():'qx')+'">'+(p.q||'–')+'</span><span class="ty">'+esc(p.g)+'</span>'+(p.c?'<span class="cites">'+p.c+(p.c>1?' citations':' citation')+'</span>':'')+'</div></li>'}).join('')||'<li class="count">No outputs match. Try a shorter search.</li>';
    }
    [q,ty,yr,qt].forEach(function(e){e.addEventListener('input',draw)});draw();
  }

  // collaboration map
  var map=document.getElementById('map');
  if(map&&window.d3&&window.topojson){
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json').then(function(r){return r.json()}).then(function(w){
      var W=960,H=480,svg=d3.select(map).attr('viewBox','0 0 '+W+' '+H);
      var proj=d3.geoNaturalEarth1().center([72,8]).scale(250).translate([W/2,H/2]),path=d3.geoPath(proj);
      var on=new Set(MAP.on);
      var defs=svg.append('defs'),g=defs.append('linearGradient').attr('id','arcg');
      g.append('stop').attr('offset','0').attr('stop-color','#fff3c4');g.append('stop').attr('offset','1').attr('stop-color','#c9a227');
      svg.append('g').selectAll('path').data(topojson.feature(w,w.objects.countries).features).join('path')
        .attr('class',function(d){return'land'+(on.has(d.properties.name)?' on':'')}).attr('d',path);
      var home=proj(MAP.home.c);
      MAP.pts.forEach(function(p,i){
        var b=proj(p.c),mx=(home[0]+b[0])/2,my=Math.min(home[1],b[1])-Math.hypot(b[0]-home[0],b[1]-home[1])*.28;
        var a=svg.append('path').attr('class','arc').attr('d','M'+home+'Q'+mx+','+my+' '+b);
        var L=a.node().getTotalLength();a.attr('stroke-dasharray',L).attr('stroke-dashoffset',L).transition().delay(300+i*180).duration(1400).attr('stroke-dashoffset',0);
        svg.append('circle').attr('class','pin').attr('cx',b[0]).attr('cy',b[1]).attr('r',4.5);
        svg.append('text').attr('class','lbl').attr('x',b[0]+(p.dx||7)).attr('y',b[1]+(p.dy||4)).attr('text-anchor',p.dx<0?'end':'start').text(p.n);
      });
      svg.append('circle').attr('class','home').attr('cx',home[0]).attr('cy',home[1]).attr('r',7);
      svg.append('text').attr('class','lbl').attr('x',home[0]+10).attr('y',home[1]+18).text('UiTM Shah Alam');
    }).catch(function(){map.parentNode.style.display='none'});
  }
})();
