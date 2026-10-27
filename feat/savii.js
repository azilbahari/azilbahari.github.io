/* SAVii explainer: illustrative VCE overpressure rings + control-room siting. Not an engineering tool. */
(function () {
  var root = document.querySelector('.sv');
  if (!root) return;
  var NS = 'http://www.w3.org/2000/svg';
  var Z = [18, 8, 6];                       // scaled distance m/kg^(1/3) for 0.07, 0.21, 0.35 bar (illustrative)
  var ZN = ['glass breakage (0.07 bar)', 'building damage (0.21 bar)', 'severe damage (0.35 bar)'];
  // 1 SVG unit = 1 m
  var UNITS = [
    { id: 'T-101', name: 'Tank T-101', c: [95, 95], r: 28 },
    { id: 'T-102', name: 'Tank T-102', c: [170, 95], r: 28 },
    { id: 'T-103', name: 'Tank T-103', c: [95, 175], r: 22 },
    { id: 'U-200', name: 'Reactor U-200', x: 255, y: 60, w: 80, h: 55 },
    { id: 'U-300', name: 'Distillation U-300', x: 380, y: 60, w: 55, h: 95 },
    { id: 'U-400', name: 'Compressor house U-400', x: 255, y: 160, w: 75, h: 45 }
  ];
  var BLDG = [
    { id: 'cr', name: 'Control room', x: 300, y: 270, w: 55, h: 32 },
    { id: 'lab', name: 'Laboratory', x: 395, y: 250, w: 50, h: 30 },
    { id: 'ws', name: 'Workshop', x: 150, y: 290, w: 70, h: 38 },
    { id: 'adm', name: 'Administration office', x: 465, y: 305, w: 85, h: 50 },
    { id: 'gh', name: 'Gatehouse', x: 512, y: 372, w: 30, h: 16 }
  ];
  var CR0 = { x: 300, y: 270 };
  var svg = root.querySelector('.sv-svg');
  var m = root.querySelector('#sv-m'), mo = root.querySelector('#sv-mo');
  var list = root.querySelector('.sv-list'), srcL = root.querySelector('#sv-src');
  var state = { u: UNITS[5], p2: false };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, at, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in at) e.setAttribute(k, at[k]);
    (parent || svg).appendChild(e);
    return e;
  }
  function txt(s, x, y, parent, anchor) {
    var t = el('text', { x: x, y: y, 'text-anchor': anchor || 'middle' }, parent);
    t.textContent = s; return t;
  }
  function centre(o) { return o.c || [o.x + o.w / 2, o.y + o.h / 2]; }
  function mass() { return 100 * Math.pow(10, m.value / 50); }
  function eta() { return +root.querySelector('input[name=sv-c]:checked').value; }
  function radii(M) { var w = Math.cbrt(eta() * M * 10); return Z.map(function (z) { return z * w; }); }
  // zone index of a building for a release at point c: 2 severe, 1, 0, -1 outside
  function zone(b, c, R) {
    var dx = Math.max(b.x - c[0], 0, c[0] - b.x - b.w), dy = Math.max(b.y - c[1], 0, c[1] - b.y - b.h);
    var d = Math.hypot(dx, dy);
    for (var i = 2; i >= 0; i--) if (d <= R[i]) return i;
    return -1;
  }

  function draw() {
    var g = el('g', {});
    for (var i = 0; i <= 600; i += 20) el('line', { x1: i, y1: 0, x2: i, y2: 420, 'class': 'grid' }, g);
    for (i = 0; i <= 420; i += 20) el('line', { x1: 0, y1: i, x2: 600, y2: i, 'class': 'grid' }, g);
    el('path', { d: 'M20 230H580M230 20V400M230 230V400M440 230V400', 'class': 'road' }, g);
    el('path', { d: 'M500 400H20V20H580V400H556', 'class': 'fence' }, g);
    txt('ENTRY', 528, 412, g); txt('FENCE LINE', 60, 14, g, 'start');
    txt('TANK FARM', 130, 40, g); txt('PROCESS AREA', 340, 40, g);
    // scale bar
    el('path', { d: 'M40 384v4h60v-4M70 386v2', 'class': 'road', style: 'stroke:var(--gold-lite);stroke-width:.8' }, g);
    txt('0', 40, 380, g); txt('60 M', 100, 380, g);
    // north arrow
    el('path', { d: 'M560 50l6 18-6-5-6 5z', fill: 'var(--gold)' }, g); txt('N', 560, 44, g);
    state.ringG = el('g', { 'aria-hidden': 'true' });
    state.rings = [0, 1, 2].map(function (k) { return el('circle', { 'class': 'ring r' + k, r: 0, cx: 0, cy: 0 }, state.ringG); });
    UNITS.forEach(function (u) {
      var a = el('g', { 'class': 'u', tabindex: 0, role: 'button', 'aria-label': 'Release from ' + u.name });
      if (u.c) {
        el('circle', { 'class': 's', cx: u.c[0], cy: u.c[1], r: u.r }, a);
        el('circle', { cx: u.c[0], cy: u.c[1], r: u.r - 6, fill: 'none', stroke: 'var(--gold-lite)', 'stroke-width': .3 }, a);
      } else el('rect', { 'class': 's', x: u.x, y: u.y, width: u.w, height: u.h }, a);
      var c = centre(u); txt(u.id, c[0], c[1] + 3, a);
      a.addEventListener('click', function () { pick(u); });
      a.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(u); } });
      u.el = a;
    });
    state.ghost = el('rect', { 'class': 'ghost', x: CR0.x, y: CR0.y, width: 55, height: 32 });
    BLDG.forEach(function (b) {
      var a = el('g', { 'class': 'b ' + b.id });
      b.rect = el('rect', { 'class': 's', x: b.x, y: b.y, width: b.w, height: b.h }, a);
      b.lab = txt(b.name.split(' ')[0].toUpperCase(), b.x + b.w / 2, b.y + b.h / 2 + 3, a);
      if (b.id === 'gh') b.lab.textContent = 'GATE';
      if (b.id === 'lab') b.lab.textContent = 'LAB';
      if (b.id === 'adm') b.lab.textContent = 'OFFICE';
      if (b.id === 'cr') b.lab.textContent = 'CONTROL';
      b.el = a;
    });
    state.mark = el('path', { 'class': 'x', d: '', 'aria-hidden': 'true' });
  }

  function update() {
    var M = mass(), R = radii(M), c = centre(state.u);
    mo.textContent = M < 1000 ? Math.round(M / 10) * 10 + ' kg' : (M / 1000).toFixed(1) + ' t';
    m.setAttribute('aria-valuetext', mo.textContent);
    srcL.textContent = state.u.name;
    UNITS.forEach(function (u) { u.el.classList.toggle('on', u === state.u); });
    state.rings.forEach(function (r, k) {
      r.setAttribute('cx', c[0]); r.setAttribute('cy', c[1]);
      if (reduce || !r.style) r.setAttribute('r', R[k]); else r.style.r = R[k] + 'px';
    });
    state.mark.setAttribute('d', 'M' + (c[0] - 5) + ' ' + (c[1] - 5) + 'l10 10m0 -10l-10 10');
    var groups = [[], [], []];
    BLDG.forEach(function (b) {
      var z = zone(b, c, R);
      b.el.setAttribute('data-z', z);
      if (z >= 0) groups[z].push(b.name);
    });
    var h = '';
    for (var k = 2; k >= 0; k--) h += '<h4>' + ZN[k] + '</h4><p>' + (groups[k].join(', ') || 'No occupied buildings') + '</p>';
    h += '<h4>Outside all rings</h4><p>' + (BLDG.filter(function (b) { return b.el.getAttribute('data-z') === '-1'; }).map(function (b) { return b.name; }).join(', ') || 'None') + '</p>';
    list.innerHTML = h;
    risk(R);
  }

  function risk(R) {
    var cr = BLDG[0], W = [10, 50, 100], s = 0, worst = -1;
    UNITS.forEach(function (u) { var z = zone(cr, centre(u), R); if (z >= 0) s += W[z]; worst = Math.max(worst, z); });
    s = Math.round(s / UNITS.length);
    root.querySelector('#sv-ri').textContent = s;
    root.querySelector('#sv-rb').style.width = s + '%';
    root.querySelector('#sv-rz').textContent = worst < 0 ? 'Outside every ring for all release points.' : 'Worst case: ' + ZN[worst] + '.';
  }

  function pick(u) { state.u = u; update(); }
  function moveCR(x, y) {
    var cr = BLDG[0];
    cr.x = Math.max(24, Math.min(576 - cr.w, x)); cr.y = Math.max(24, Math.min(396 - cr.h, y));
    cr.rect.setAttribute('x', cr.x); cr.rect.setAttribute('y', cr.y);
    cr.lab.setAttribute('x', cr.x + cr.w / 2); cr.lab.setAttribute('y', cr.y + cr.h / 2 + 3);
    update();
  }

  function tabs() {
    var t = root.querySelectorAll('[role=tab]');
    function sel(i) {
      t.forEach(function (b, j) {
        b.setAttribute('aria-selected', i === j); b.tabIndex = i === j ? 0 : -1;
        root.querySelector('#' + b.getAttribute('aria-controls')).hidden = i !== j;
      });
      state.p2 = i === 1; root.classList.toggle('sv-p2on', state.p2);
      var cr = BLDG[0].el;
      if (state.p2) { cr.setAttribute('tabindex', 0); cr.setAttribute('role', 'button'); cr.setAttribute('aria-label', 'Control room. Arrow keys move it.'); }
      else { cr.removeAttribute('tabindex'); cr.removeAttribute('role'); cr.removeAttribute('aria-label'); }
    }
    t.forEach(function (b, i) {
      b.addEventListener('click', function () { sel(i); });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { var n = 1 - i; sel(n); t[n].focus(); }
      });
    });
  }

  function drag() {
    var cr = BLDG[0], off = null;
    function pt(e) { var p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY; return p.matrixTransform(svg.getScreenCTM().inverse()); }
    cr.el.addEventListener('pointerdown', function (e) {
      if (!state.p2) return;
      var p = pt(e); off = [p.x - cr.x, p.y - cr.y]; cr.el.setPointerCapture(e.pointerId); e.preventDefault();
    });
    cr.el.addEventListener('pointermove', function (e) { if (off) { var p = pt(e); moveCR(p.x - off[0], p.y - off[1]); } });
    cr.el.addEventListener('pointerup', function () { off = null; });
    cr.el.addEventListener('pointercancel', function () { off = null; });
    cr.el.addEventListener('keydown', function (e) {
      var d = { ArrowLeft: [-10, 0], ArrowRight: [10, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] }[e.key];
      if (d && state.p2) { e.preventDefault(); moveCR(cr.x + d[0], cr.y + d[1]); }
    });
    root.querySelector('.sv-reset').addEventListener('click', function () { moveCR(CR0.x, CR0.y); });
  }

  function init() {
    draw(); tabs(); drag();
    m.addEventListener('input', update);
    root.querySelectorAll('input[name=sv-c]').forEach(function (r) { r.addEventListener('change', update); });
    // start rings at 0 so they grow on first view
    requestAnimationFrame(function () { requestAnimationFrame(update); });
  }

  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { io.disconnect(); init(); } }, { rootMargin: '200px' });
    io.observe(root);
  } else init();
})();
