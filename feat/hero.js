/* Hero "waste into value": loose gold fibres drift in from the left, cross a faint reactor arc
   and settle into a honeycomb carbon lattice (or energy glow / safety shield) behind the portrait. */
(function () {
  var hero = document.querySelector('.wv-hero'), cv = hero && hero.querySelector('.wv-canvas');
  if (!hero || !cv || !cv.getContext) return;
  var arch = hero.querySelector('.arch'), ctx = cv.getContext('2d');
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W, H, dpr, cx, cy, sx0, sy0, S, R, rx, bond, N, T, P = [], L = [], E = [], free = [], owner = [];
  var mode = 'carbon', seen = false, raf = 0, last = 0, ptr = { x: -1e4, y: -1e4 }, tight = 1, glow;
  var GOLD = '233,199,102', PALE = '255,241,191';

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function gauss() { return (Math.random() + Math.random() + Math.random() - 1.5) / 1.5; }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

  function layout() {
    var hr = hero.getBoundingClientRect();
    W = hr.width; H = hr.height; dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var a = arch ? arch.getBoundingClientRect() : { left: W * .6, top: 0, width: W * .35, height: H };
    // lattice disc sits up and left of the portrait so it shows around the arch; shield hugs the arch
    var al = a.left - hr.left, at = a.top - hr.top, phone0 = W < 800;
    cx = al + a.width * (phone0 ? .5 : .22); cy = at + a.height * (phone0 ? .02 : .28);
    R = Math.max(a.width, a.height) * (phone0 ? .55 : .6);
    sx0 = al + a.width / 2; sy0 = at + a.height * .5; S = (a.width / 2 + (phone0 ? 10 : 34)) / .8; rx = cx - R * .92;
    var phone = W < 800; bond = phone ? 15 : 21;
    N = phone ? 200 : 600;
    // honeycomb: basis A(0,0), B(0,b); a1=(sqrt3 b,0), a2=(sqrt3 b/2, 1.5b)
    L = []; var s3 = Math.sqrt(3) * bond, n = Math.ceil(R / bond) + 2;
    for (var j = -n; j <= n; j++) for (var i = -n - j; i <= n; i++) {
      var x = i * s3 + j * s3 / 2, y = j * 1.5 * bond;
      [[x, y], [x, y + bond]].forEach(function (p) {
        var d = Math.hypot(p[0], p[1] * 1.08);
        if (d < R * .98) L.push({ x: p[0], y: p[1], v: Math.pow(1 - d / R, .6) });
      });
    }
    L.sort(function (p, q) { return p.x - q.x; });
    if (L.length > N * .68) L = thin(L, Math.round(N * .68));
    T = L.length; E = [];
    for (var u = 0; u < T; u++) for (var w = u + 1; w < T; w++)
      if (Math.abs(Math.hypot(L[u].x - L[w].x, L[u].y - L[w].y) - bond) < 1) E.push([u, w]);
    free = []; owner = new Array(T);
    for (var k = 0; k < T; k++) free.push(k);
    P = []; for (var m = 0; m < N; m++) P.push(spawn({}, true));
    glow = sprite();
  }
  // keep the vertices closest to the centre so the lattice stays a soft disc
  function thin(arr, k) { return arr.slice().sort(function (p, q) { return q.v - p.v; }).slice(0, k).sort(function (p, q) { return p.x - q.x; }); }

  function shield(k) {
    // outline of a heater shield, sampled by index; inner ring for the second 40%
    var outer = k < T * .6, u = outer ? k / (T * .6) : (k - T * .6) / (T * .4), s = S * (outer ? 1 : .86);
    var pts = [[-.8, -.85], [0, -1], [.8, -.85], [.8, .05], [.45, .7], [0, 1.05], [-.45, .7], [-.8, .05], [-.8, -.85]];
    var seg = u * (pts.length - 1), i = Math.min(Math.floor(seg), pts.length - 2), f = seg - i;
    return { x: (pts[i][0] + (pts[i + 1][0] - pts[i][0]) * f) * s, y: (pts[i][1] + (pts[i + 1][1] - pts[i][1]) * f) * s };
  }
  function target(k) {
    if (mode === 'safety') { var q = shield(k); return { x: sx0 + q.x * tight, y: sy0 + q.y * tight }; }
    return { x: cx + L[k].x * tight, y: cy + L[k].y * tight };
  }

  function spawn(p, anywhere) {
    p.x = anywhere ? rnd(-20, rx + R * .4) : rnd(-60, -10);
    p.y = Math.max(8, Math.min(H - 8, cy + gauss() * R * 1.15));
    p.vx = rnd(.18, .5); p.ph = rnd(0, 6.28); p.len = rnd(5, 13); p.a = rnd(.25, .8);
    p.k = -1; p.t = 0; p.hold = 0; p.fade = anywhere ? 1 : 0;
    return p;
  }
  function capture(p) {
    if (!free.length) return;
    var pick = Math.floor(Math.random() * Math.min(10, free.length)), k = free.splice(pick, 1)[0];
    p.k = k; owner[k] = p; p.sx = p.x; p.sy = p.y; p.t = 0; p.hold = rnd(9, 18);
  }
  function release(p) {
    owner[p.k] = null; free.push(p.k); free.sort(function (a, b) { return L[a].x - L[b].x; });
    p.x = p.dx; p.y = p.dy; p.k = -1; p.leaving = 1;
  }

  function step(dt, time) {
    for (var i = 0; i < N; i++) {
      var p = P[i];
      if (p.k < 0) {
        p.x += p.vx * dt * 60;
        p.y += (Math.sin(time * .0005 + p.ph + p.x * .01) * .22 + (cy - p.y) * .0012) * dt * 60;
        p.fade = Math.min(1, p.fade + dt * .6);
        if (p.leaving) { p.leaving -= dt * .5; if (p.leaving <= 0) spawn(p); continue; }
        if (Math.hypot(p.x - cx, (p.y - cy) * 1.08) < R * .95 && p.x < cx) capture(p);
        if (p.x > W + 20) spawn(p);
      } else {
        p.t = Math.min(1, p.t + dt / 2.6);
        if (p.t === 1 && (p.hold -= dt) < 0) release(p);
      }
    }
  }
  function pos(p) {
    var x = p.x, y = p.y;
    if (p.k >= 0) { var g = target(p.k), e = ease(p.t); x = p.sx + (g.x - p.sx) * e; y = p.sy + (g.y - p.sy) * e; }
    var dx = x - ptr.x, dy = y - ptr.y, d = Math.hypot(dx, dy);
    if (d < 110 && d > .1) { var f = Math.pow(1 - d / 110, 2) * 16 / d; x += dx * f; y += dy * f; }
    p.dx = x; p.dy = y; return p;
  }
  function vign(x, y) { return Math.max(0, 1 - Math.hypot(x - cx, (y - cy) * 1.08) / (R * 1.02)); }

  function draw(time) {
    ctx.clearRect(0, 0, W, H);
    // reactor: a faint dashed arc on the inflow side of the portrait
    ctx.save(); ctx.strokeStyle = 'rgba(' + GOLD + ',.22)'; ctx.lineWidth = 1; ctx.setLineDash([2, 6]);
    ctx.beginPath(); ctx.ellipse(cx, cy, R * .95, R * .95 / 1.08, 0, Math.PI * .62, Math.PI * 1.38); ctx.stroke(); ctx.restore();
    var i, p;
    for (i = 0; i < N; i++) pos(P[i]);
    // bonds
    var bondA = mode === 'carbon' ? .55 : mode === 'energy' ? .14 : 0;
    ctx.lineWidth = .7;
    if (bondA) { ctx.beginPath(); ctx.strokeStyle = 'rgba(' + GOLD + ',' + bondA + ')';
      for (i = 0; i < E.length; i++) { var a = owner[E[i][0]], b = owner[E[i][1]];
        if (a && b && a.t > .97 && b.t > .97 && vign(a.dx, a.dy) > .12) { ctx.moveTo(a.dx, a.dy); ctx.lineTo(b.dx, b.dy); } }
      ctx.stroke(); }
    if (mode === 'safety') { ctx.beginPath(); ctx.strokeStyle = 'rgba(' + GOLD + ',.5)';
      for (i = 0; i < T - 1; i++) { if (i === Math.round(T * .6) - 1) continue; var c = owner[i], e2 = owner[i + 1];
        if (c && e2 && c.t > .97 && e2.t > .97) { ctx.moveTo(c.dx, c.dy); ctx.lineTo(e2.dx, e2.dy); } }
      ctx.stroke(); }
    // particles
    for (i = 0; i < N; i++) {
      p = P[i];
      var tx = Math.min(1, Math.max(0, (p.dx + 20) / (rx + 40)));
      var al = p.a * p.fade * (p.leaving ? p.leaving : 1) * (p.k < 0 ? .25 + .75 * tx * tx : 1);
      if (p.k >= 0) {
        var e = ease(p.t), v = .35 + .65 * vign(p.dx, p.dy);
        if (mode === 'energy' && p.t > .9) {
          var pulse = .5 + .5 * Math.sin(time * .002 + p.k);
          ctx.globalAlpha = .35 * pulse * v; ctx.drawImage(glow, p.dx - 9, p.dy - 9, 18, 18); ctx.globalAlpha = 1;
        }
        var ln = p.len * (1 - e);
        ctx.strokeStyle = ctx.fillStyle = 'rgba(' + (e > .9 ? PALE : GOLD) + ',' + (al * v) + ')';
        if (ln > .6) { ctx.beginPath(); ctx.moveTo(p.dx - ln / 2, p.dy); ctx.lineTo(p.dx + ln / 2, p.dy); ctx.stroke(); }
        ctx.beginPath(); ctx.arc(p.dx, p.dy, .5 + e * .9, 0, 6.283); ctx.fill();
      } else {
        // a loose fibre: short curved stroke tilted with the flow
        var ang = Math.sin(time * .0007 + p.ph) * .5, h = p.len / 2, ca = Math.cos(ang) * h, sa = Math.sin(ang) * h;
        ctx.strokeStyle = 'rgba(' + GOLD + ',' + al + ')';
        ctx.beginPath(); ctx.moveTo(p.dx - ca, p.dy - sa); ctx.quadraticCurveTo(p.dx + sa * .5, p.dy - ca * .5, p.dx + ca, p.dy + sa); ctx.stroke();
      }
    }
  }
  function sprite() {
    var c = document.createElement('canvas'); c.width = c.height = 36;
    var g = c.getContext('2d'), r = g.createRadialGradient(18, 18, 0, 18, 18, 18);
    r.addColorStop(0, 'rgba(' + PALE + ',1)'); r.addColorStop(.35, 'rgba(' + GOLD + ',.5)'); r.addColorStop(1, 'rgba(' + GOLD + ',0)');
    g.fillStyle = r; g.fillRect(0, 0, 36, 36); return c;
  }

  function frame(now) {
    raf = 0; if (!seen || document.hidden) return;
    var dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
    var hr = hero.getBoundingClientRect();
    tight += ((1 - .16 * Math.min(1, Math.max(0, -hr.top / hr.height))) - tight) * .08;
    step(dt, now); draw(now); raf = requestAnimationFrame(frame);
  }
  function go() { if (!raf && !still && seen && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
  function settleStill() {
    // reduced motion: run the simulation forward off-screen, then paint one composed frame
    // reduced motion: compose one full frame, every lattice site filled, loose fibres on the inflow side
    free = []; for (var k = 0; k < T; k++) { var p = P[k], g = target(k); p.k = k; owner[k] = p; p.t = 1; p.hold = 1e9; p.sx = g.x; p.sy = g.y; }
    draw(0);
  }
  function init() {
    layout();
    if (still) settleStill(); else go();
  }

  hero.querySelectorAll('.wv-legend button').forEach(function (b) {
    b.addEventListener('click', function () {
      mode = b.dataset.mode;
      hero.querySelectorAll('.wv-legend button').forEach(function (o) { o.setAttribute('aria-pressed', o === b); });
      P.forEach(function (p) { if (p.k >= 0) { p.sx = p.dx; p.sy = p.dy; p.t = still ? 1 : 0; p.hold = still ? 99 : rnd(9, 18); } });
      if (still) draw(0);
    });
  });
  if (matchMedia('(pointer:fine)').matches) {
    hero.addEventListener('pointermove', function (e) { var r = hero.getBoundingClientRect(); ptr.x = e.clientX - r.left; ptr.y = e.clientY - r.top; });
    hero.addEventListener('pointerleave', function () { ptr.x = ptr.y = -1e4; });
  }
  document.addEventListener('visibilitychange', go);
  var rt; addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (W !== hero.getBoundingClientRect().width) init(); }, 200); });
  new IntersectionObserver(function (en) {
    var was = seen; seen = en[0].isIntersecting;
    if (seen && !W) init(); else if (seen && !was) go();
  }).observe(hero);
})();
