// Menu, reveal-on-scroll, counters, lightbox, publication filter, service worker
(function(){
  document.documentElement.classList.add('js');
  var m=document.querySelector('.menu'),n=document.querySelector('.nav');
  if(m){m.addEventListener('click',function(){var o=n.classList.toggle('open');m.setAttribute('aria-expanded',o)});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&n.classList.contains('open')){n.classList.remove('open');m.setAttribute('aria-expanded','false');m.focus()}})}

  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;
    e.target.classList.add('in');io.unobserve(e.target);
    e.target.querySelectorAll('[data-count]').forEach(count)})},{threshold:.15});
  var all=document.querySelectorAll('.rv,.bars,.stats,.sh');all.forEach(function(el){io.observe(el)});
  // safety: never leave content hidden (print, fast scroll, bots)
  setTimeout(function(){all.forEach(function(el){if(!el.classList.contains('in')&&el.getBoundingClientRect().top<innerHeight){el.classList.add('in');io.unobserve(el)}})},1500);
  addEventListener('beforeprint',function(){all.forEach(function(el){el.classList.add('in')})});

  function count(el){
    var end=parseFloat(el.dataset.count),dec=(el.dataset.count.split('.')[1]||'').length,t0=null,pre='',suf='';
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){return}
    function step(t){t0=t0||t;var p=Math.min((t-t0)/1400,1),v=end*(1-Math.pow(1-p,3));
      el.textContent=pre+v.toLocaleString('en-MY',{minimumFractionDigits:dec,maximumFractionDigits:dec})+suf;if(p<1)requestAnimationFrame(step)}
    requestAnimationFrame(step);
  }

  var lb=document.createElement('div');lb.className='lightbox';lb.setAttribute('role','dialog');lb.setAttribute('aria-modal','true');lb.setAttribute('aria-label','Enlarged photo');
  lb.innerHTML='<button type="button">Close</button><div><img alt=""><p></p></div>';
  document.body.appendChild(lb);
  var lbBtn=lb.querySelector('button'),opener=null;
  function close(){if(!lb.classList.contains('open'))return;lb.classList.remove('open');if(opener)opener.focus();opener=null}
  lb.addEventListener('click',function(e){if(e.target.tagName!=='IMG')close()});
  // keep focus inside the open lightbox (Close is its only control)
  lb.addEventListener('keydown',function(e){if(e.key==='Tab'){e.preventDefault();lbBtn.focus()}});
  document.addEventListener('keydown',function(e){if(e.key==='Escape')close()});
  document.querySelectorAll('figure.ph').forEach(function(f){
    var im=f.querySelector('img');if(!im)return;
    var alt=im.alt,cap=f.querySelector('figcaption');
    f.tabIndex=0;
    // a figure that holds no link of its own acts as one "enlarge" button (its contents are read via the label)
    if(!f.querySelector('a,button')){f.setAttribute('role','button');f.setAttribute('aria-label','Enlarge photo: '+(alt||(cap?cap.textContent.trim():'')));if(cap&&alt===cap.textContent.trim())im.alt=''}
    function open(){var c=cap;lb.querySelector('img').src=im.currentSrc||im.src;lb.querySelector('img').alt=alt;lb.querySelector('p').textContent=c?c.textContent:'';opener=f;lb.classList.add('open');lbBtn.focus()}
    f.addEventListener('click',open);f.addEventListener('keydown',function(e){if(e.target===f&&(e.key==='Enter'||e.key===' ')){e.preventDefault();open()}});
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
      var last=null;list.innerHTML=r.map(function(p){var hy=p.y!==last;last=p.y;
        var src=[p.s,p.v&&('vol. '+p.v),p.i&&('('+p.i+')'),p.p&&('pp. '+p.p)].filter(Boolean).join(', ');
        return '<li class="pub'+(hy?' yr1':'')+'"><div class="py">'+(hy?p.y:'')+'</div><div><p class="pt">'+'<a href="'+(p.d?'https://doi.org/'+esc(p.d):'https://scholar.google.com/scholar?q=%22'+encodeURIComponent(p.t)+'%22')+'" target="_blank" rel="noopener"'+(p.d?'':' title="Search Google Scholar"')+'>'+esc(p.t)+'</a>'+'</p>'+
          '<p class="pa">'+esc(p.a).replace(me,'<span class="me">$1</span>')+'</p><p class="ps">'+esc(src)+'</p></div>'+
          '<div class="pm"><span class="q '+(p.q?p.q.toLowerCase():'qx')+'">'+(p.q||'–')+'</span><span class="ty">'+esc(p.g)+'</span>'+(p.c?'<span class="cites">'+p.c+(p.c>1?' citations':' citation')+'</span>':'')+'</div></li>'}).join('')||'<li class="count">No outputs match. Try a shorter search.</li>';
    }
    [q,ty,yr,qt].forEach(function(e){e.addEventListener('input',draw)});draw();
  }

  // offline support (sw.js cache name carries the build stamp)
  if('serviceWorker' in navigator)addEventListener('load',function(){navigator.serviceWorker.register('sw.js').catch(function(){})});
})();
