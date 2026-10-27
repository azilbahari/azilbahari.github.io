(function () {
  var root = document.querySelector('.nw');
  if (!root) return;
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var yrs = function (n) { return n.y0 === n.y1 ? n.y0 : n.y0 + '–' + n.y1; };

  function needD3(cb) {
    if (window.d3) return cb();
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js';
    s.onload = cb; document.head.appendChild(s);
  }
  function start() {
    needD3(function () {
      fetch(root.getAttribute('data-src') || 'data.json').then(function (r) { return r.json(); })
        .then(function (D) { network(D); chart(D); });
    });
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '300px' });
    io.observe(root);
  } else start();

  /* ---------- 1. co-author network ---------- */
  function network(D) {
    var svgEl = root.querySelector('.nw-svg'), tip = root.querySelector('.nw-tip'), panel = root.querySelector('.nw-panel');
    var stage = root.querySelector('.nw-stage');
    var W = Math.max(300, stage.clientWidth - (innerWidth > 860 ? 18 : 0));
    var phone = W < 600, H = phone ? W : Math.min(640, Math.round(W * 0.68));
    var me = Object.assign({ me: 1 }, D.self);
    var nodes = [me].concat(D.nodes.map(function (n) { return Object.assign({}, n); }));
    var byId = {}; nodes.forEach(function (n) { byId[n.id] = n; });
    var links = D.nodes.map(function (n) { return { source: 'SELF', target: n.id, w: n.w, self: 1 }; })
      .concat(D.links.map(function (l) { return { source: l.s, target: l.t, w: l.w }; }));
    var maxW = D.nodes[0].w;
    var r = d3.scaleSqrt().domain([1, maxW]).range(phone ? [3, 10] : [4, 17]);
    me.r = phone ? 18 : 30; D.nodes.forEach(function (n, i) { nodes[i + 1].r = r(n.w); });
    me.fx = W / 2; me.fy = H / 2;
    var ring = d3.scaleLinear().domain([maxW, 1]).range([W * (phone ? 0.16 : 0.12), Math.min(W, H) * (phone ? 0.46 : 0.45)]);

    var sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(function (d) { return d.id; }).strength(function (l) { return l.self ? 0 : 0.015; }))
      .force('radial', d3.forceRadial(function (d) { return d.me ? 0 : ring(d.w); }, W / 2, H / 2).strength(phone ? 0.9 : 0.5))
      .force('charge', d3.forceManyBody().strength(phone ? -14 : -40))
      .force('collide', d3.forceCollide(function (d) { return d.r + (phone ? 1.5 : 3); }))
      .force('x', d3.forceX(W / 2).strength(phone ? 0 : 0.03)).force('y', d3.forceY(H / 2).strength(phone ? 0 : 0.05));

    var svg = d3.select(svgEl).attr('viewBox', '0 0 ' + W + ' ' + H);
    var lk = svg.append('g').selectAll('line').data(links).join('line')
      .attr('class', function (l) { return 'lk' + (l.self ? ' self' : ''); })
      .attr('stroke-width', function (l) { return l.self ? 0.5 + l.w * (phone ? 0.25 : 0.45) : 0.6 + l.w * 0.4; });
    var nd = svg.append('g').selectAll('g').data(nodes).join('g')
      .attr('class', function (d) { return 'nd' + (d.me ? ' me' : ''); })
      .attr('tabindex', function (d) { return d.me ? -1 : 0; }).attr('role', 'button')
      .attr('aria-label', function (d) { return d.me ? null : d.name + ', ' + d.w + ' joint paper' + (d.w > 1 ? 's' : '') + ', ' + yrs(d); });
    nd.append('circle').attr('r', function (d) { return d.r; });
    nd.filter(function (d) { return d.me || d.w >= (phone ? 16 : 4); }).append('text')
      .attr('text-anchor', 'middle').attr('dy', function (d) { return d.me ? d.r + 18 : -d.r - 5; })
      .text(function (d) { return d.me ? 'Azil Bahari Alias' : d.name.split(' ').pop(); });

    function draw() {
      nodes.forEach(function (n) { n.x = Math.max(n.r + 2, Math.min(W - n.r - 2, n.x)); n.y = Math.max(n.r + 14, Math.min(H - n.r - 2, n.y)); });
      lk.attr('x1', function (l) { return l.source.x; }).attr('y1', function (l) { return l.source.y; })
        .attr('x2', function (l) { return l.target.x; }).attr('y2', function (l) { return l.target.y; });
      nd.attr('transform', function (d) { return 'translate(' + d.x.toFixed(1) + ',' + d.y.toFixed(1) + ')'; });
    }
    // run to convergence first, then centre the bounding box; motion = nodes grow out from the centre
    sim.stop(); for (var i = 0; i < 400; i++) sim.tick();
    // fit the converged layout (nodes + label room) to the viewBox, centred with small padding
    var bx = d3.extent(nodes.flatMap(function (n) { return [n.x - n.r, n.x + n.r]; })), by = d3.extent(nodes.flatMap(function (n) { return [n.y - n.r - 16, n.y + n.r + (n.me ? 26 : 0)]; }));
    var pad = phone ? 10 : 18, k = Math.min((W - 2 * pad) / (bx[1] - bx[0]), (H - 2 * pad) / (by[1] - by[0]), 1.8);
    var cx = (bx[0] + bx[1]) / 2, cy = (by[0] + by[1]) / 2;
    nodes.forEach(function (n) { n.x = W / 2 + (n.x - cx) * k; n.y = H / 2 + (n.y - cy) * k; });
    draw();
    // label collision pass: centre label first, then by weight; hide any label whose box hits one already kept
    nd.filter(function (d) { return d.me; }).raise();
    var kept = [];
    nd.selectAll('text').nodes().map(function (t) { return { t: t, d: t.__data__ }; })
      .sort(function (a, b) { return (b.d.me ? 1e9 : b.d.w) - (a.d.me ? 1e9 : a.d.w); })
      .forEach(function (o) {
        function box() { var bb = o.t.getBBox(), x0 = o.d.x + bb.x - 2, y0 = o.d.y + bb.y - 1; return [x0, y0, x0 + bb.width + 4, y0 + bb.height + 2]; }
        function hit(b) { return kept.some(function (q) { return b[0] < q[2] && b[2] > q[0] && b[1] < q[3] && b[3] > q[1]; }) ||
          nodes.some(function (n) { return n !== o.d && n.x + n.r > b[0] && n.x - n.r < b[2] && n.y + n.r > b[1] && n.y - n.r < b[3]; }); }
        var b = box();
        if (!o.d.me && hit(b)) { o.t.setAttribute('dy', o.d.r + 12); b = box(); }  // nudge below the node
        if (!o.d.me && hit(b)) o.t.remove(); else kept.push(b);
      });
    draw();
    if (!RM) {
      var fin = nodes.map(function (n) { return [n.x, n.y]; }), c = [me.x, me.y];
      svg.transition().duration(1400).ease(d3.easeCubicOut).tween('grow', function () {
        return function (t) { nodes.forEach(function (n, i) { n.x = c[0] + (fin[i][0] - c[0]) * t; n.y = c[1] + (fin[i][1] - c[1]) * t; }); draw(); };
      });
    }

    var sel = null;
    function light(d) {
      svg.classed('dim', !!d);
      nd.classed('hot', function (n) { return d && (n === d || n.me || links.some(function (l) { return (l.source === d && l.target === n) || (l.target === d && l.source === n); })); });
      lk.classed('on', function (l) { return d && (l.source === d || l.target === d); });
    }
    function showTip(d) {
      if (d.me) { tip.innerHTML = '<b>Azil Bahari Alias</b>' + D.withAuthors + ' papers with listed co-authors'; }
      else tip.innerHTML = '<b>' + esc(d.name) + '</b>' + d.w + ' joint paper' + (d.w > 1 ? 's' : '') + ' &middot; ' + yrs(d);
      var k = svgEl.clientWidth / W;
      tip.style.left = Math.min(Math.max(d.x * k, 110), svgEl.clientWidth - 110) + 'px';
      tip.style.top = (svgEl.offsetTop + (d.y - d.r) * k) + 'px';
      tip.classList.add('on');
    }
    function hideTip() { tip.classList.remove('on'); light(sel); }
    function select(d) {
      sel = d; nd.classed('sel', function (n) { return n === d; }); light(d);
      if (!d) { panel.innerHTML = '<p class="nw-hint"><span class="nw-num">01</span>Select a circle, or search by surname, to list the papers written together.</p>'; return; }
      var ps = d.p.map(function (i) { return D.pubs[i]; }).sort(function (a, b) { return b.y - a.y; });
      panel.innerHTML = '<div class="kicker">Co-author</div><h3>' + esc(d.name) + '</h3><p class="meta">' + d.w + ' joint paper' + (d.w > 1 ? 's' : '') + ' &middot; ' + yrs(d) + '</p><ol>' +
        ps.map(function (p) {
          return '<li>' + esc(p.t) + '<span>' + p.y + (p.d ? ' &middot; <a href="https://doi.org/' + esc(p.d) + '" target="_blank" rel="noopener">doi:' + esc(p.d) + '</a>' : '') + '</span></li>';
        }).join('') + '</ol>';
      if (innerWidth <= 860) panel.scrollIntoView({ block: 'nearest', behavior: RM ? 'auto' : 'smooth' });
    }
    nd.on('mouseenter focus', function (e, d) { light(d); showTip(d); })
      .on('mouseleave blur', hideTip)
      .on('click', function (e, d) { if (!d.me) select(sel === d ? null : d); })
      .on('keydown', function (e, d) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(d); panel.focus(); } });
    root.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sel) { var n = sel; select(null); hideTip(); nd.filter(function (x) { return x === n; }).node().focus(); } });

    // search
    var inp = root.querySelector('.nw-search input');
    root.querySelector('#nw-names').innerHTML = D.nodes.map(function (n) { return '<option value="' + esc(n.name) + '">'; }).join('');
    inp.addEventListener('input', function () {
      var q = inp.value.trim().toLowerCase(); if (q.length < 2) return;
      var hit = nodes.find(function (n) { return !n.me && n.name.toLowerCase() === q; }) ||
        nodes.find(function (n) { return !n.me && n.name.split(' ').pop().toLowerCase().indexOf(q) === 0; });
      if (hit) { select(hit); showTip(hit); }
    });

    // table fallback
    root.querySelector('.nw-tablewrap tbody').innerHTML = D.nodes.map(function (n) {
      return '<tr><td>' + esc(n.name) + '</td><td class="num">' + n.w + '</td><td>' + yrs(n) + '</td></tr>';
    }).join('');
    var tb = root.querySelector('.nw-tbtn'), tw = root.querySelector('.nw-tablewrap');
    tb.addEventListener('click', function () { var o = tw.hidden; tw.hidden = !o; tb.setAttribute('aria-expanded', o); tb.textContent = o ? 'Hide table' : 'Show as table'; });

    root.querySelector('.nw-cap').textContent = 'Drawn from the ' + D.withAuthors + ' curated publications that list their authors. The ' + D.nodes.length +
      ' most frequent co-authors are shown; ' + D.others + ' further co-authors share one paper each and are omitted for clarity. Name variants of the same person are merged.';
  }

  /* ---------- 2. output and citations ---------- */
  function chart(D) {
    var el = root.querySelector('.nw-csvg'), S = D.series;
    var W = Math.max(320, el.clientWidth), phone = W < 600;
    var m = { l: phone ? 30 : 44, r: phone ? 8 : 120, t: phone ? 46 : 26 }, h1 = phone ? 150 : 190, gap = phone ? 56 : 60, h2 = phone ? 150 : 170;
    var H = m.t + h1 + gap + h2 + 30;
    var svg = d3.select(el).attr('viewBox', '0 0 ' + W + ' ' + H);
    var x = d3.scaleBand().domain(S.map(function (s) { return s.y; })).range([m.l, W - m.r]).padding(0.28);
    var T = function (s) { return { j: s['Journal article'], c: s['Conference paper'], o: s['Book chapter'] + s.Book + s.Other }; };
    var y1 = d3.scaleLinear().domain([0, Math.ceil(d3.max(S, function (s) { var t = T(s); return t.j + t.c + t.o; }) / 5 + 0.2) * 5]).range([m.t + h1, m.t]);
    var b2 = m.t + h1 + gap, y2 = d3.scaleLinear().domain([0, d3.max(S, function (s) { return s.c; })]).nice().range([b2 + h2, b2]);
    var g = svg.append('g');
    // hairline grids + axes
    [[y1, m.t + h1, 'Papers'], [y2, b2 + h2, 'Citations received']].forEach(function (a) {
      (a[0] === y1 ? d3.range(0, y1.domain()[1] + 1, 5) : a[0].ticks(4)).forEach(function (t) {
        if (t) g.append('line').attr('class', 'gr').attr('x1', m.l).attr('x2', W - m.r).attr('y1', a[0](t)).attr('y2', a[0](t));
        g.append('text').attr('x', m.l - 6).attr('y', a[0](t) + 4).attr('text-anchor', 'end').text(d3.format(',')(t));
      });
      g.append('line').attr('class', 'ax').attr('x1', m.l).attr('x2', W - m.r).attr('y1', a[1]).attr('y2', a[1]);
      g.append('text').attr('class', 'lab').attr('x', m.l).attr('y', a[0].range()[1] - 12).text(a[2]);
    });
    S.forEach(function (s, i) {
      if (phone ? i % 4 === 0 || s.y === 2026 : i % 2 === 0) [m.t + h1, b2 + h2].forEach(function (yy) { g.append('text').attr('x', x(s.y) + x.bandwidth() / 2).attr('y', yy + 15).attr('text-anchor', 'middle').text(s.y); });
    });
    var top = D.top;
    var bars = g.selectAll('g.yr').data(S).join('g').attr('class', 'yr').attr('tabindex', 0)
      .attr('aria-label', function (s) { var t = T(s); return s.y + ': ' + t.j + ' journal, ' + t.c + ' conference, ' + t.o + ' book or other; ' + s.q1 + ' Q1, ' + s.q2 + ' Q2; ' + s.c + ' citations'; });
    bars.append('rect').attr('class', 'hit').attr('x', function (s) { return x(s.y) - 2; }).attr('width', x.bandwidth() + 4).attr('y', m.t).attr('height', H - m.t - 20);
    bars.each(function (s) {
      var t = T(s), b = d3.select(this), y0 = 0, bx = x(s.y), bw = x.bandwidth();
      [['j', t.j], ['c', t.c], ['o', t.o]].forEach(function (k) {
        if (!k[1]) return;
        b.append('rect').attr('class', 't-' + k[0]).attr('x', bx).attr('width', bw).attr('y', y1(y0 + k[1])).attr('height', y1(y0) - y1(y0 + k[1]) - 0.5);
        y0 += k[1];
      });
      // Q1 solid gold, Q2 gold outline, at the base of the journal stack
      if (s.q1) b.append('rect').attr('class', 'q1').attr('x', bx).attr('width', bw).attr('y', y1(s.q1)).attr('height', y1(0) - y1(s.q1) - 0.5);
      if (s.q2) b.append('rect').attr('class', 'q2').attr('x', bx + 0.6).attr('width', bw - 1.2).attr('y', y1(s.q1 + s.q2) + 0.6).attr('height', y1(s.q1) - y1(s.q1 + s.q2) - 1.7);
      if (s.c) b.append('rect').attr('class', 'cb' + (s.y === top.y ? ' hi' : '')).attr('x', bx).attr('width', bw).attr('y', y2(s.c)).attr('height', y2(0) - y2(s.c));
    });
    bars.append('title').text(function (s) { var t = T(s); return s.y + ': ' + (t.j + t.c + t.o) + ' outputs (' + s.q1 + ' Q1, ' + s.q2 + ' Q2), ' + s.c + ' citations'; });

    // direct labels for series (right margin on desktop, under title on phone)
    var last = S.reduce(function (a, s) { var t = T(s); return t.j + t.c + t.o ? s : a; });
    if (!phone) {
      var lx = W - m.r + 10, L = [['Journal', 't-j', 0.85], ['Conference', 't-c', 0.62], ['Book / other', 't-o', 0.4], ['Q1 journal', 'q1', 0.18], ['Q2 journal', 'q2', 0.02]];
      L.forEach(function (l) {
        var yy = m.t + h1 - h1 * l[2] - 10;
        g.append('rect').attr('class', l[1]).attr('x', lx).attr('y', yy - 8).attr('width', 10).attr('height', 10);
        g.append('text').attr('x', lx + 16).attr('y', yy + 1).text(l[0]);
      });
    } else {
      var px = m.l;
      [['Journal', 't-j'], ['Conf.', 't-c'], ['Other', 't-o'], ['Q1', 'q1'], ['Q2', 'q2']].forEach(function (l) {
        g.append('rect').attr('class', l[1]).attr('x', px).attr('y', 2).attr('width', 9).attr('height', 9);
        var tx = g.append('text').attr('x', px + 13).attr('y', 10).text(l[0]); px += 13 + tx.node().getComputedTextLength() + 12;
      });
    }

    // annotations from data: most-cited paper, second citation peak, Q1 peak
    function ann(year, yv, txt, dx, dy, yscale) {
      var cx = x(year) + x.bandwidth() / 2, ty = yscale(yv);
      var ax = Math.max(m.l + 4, Math.min(cx + dx, W - (phone ? 8 : m.r) - 4));
      g.append('line').attr('class', 'lead').attr('x1', cx).attr('y1', ty - 3).attr('x2', ax).attr('y2', ty + dy + 4);
      var t = g.append('text').attr('class', 'ann').attr('x', ax + (dx < 0 ? -4 : 4)).attr('y', ty + dy).attr('text-anchor', dx < 0 ? 'end' : 'start');
      txt.forEach(function (line, i) { t.append('tspan').attr('x', ax + (dx < 0 ? -4 : 4)).attr('dy', i ? 15 : 0).text(line); });
    }
    var short = function (s, n) { return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };
    ann(top.y, D.series.find(function (s) { return s.y === top.y; }).c, ['Most-cited: “' + short(top.t, phone ? 34 : 60) + '”', top.y + ', ' + top.s + ', ' + top.c + ' citations'], phone ? 16 : 22, phone ? 30 : 12, y2);
    var after = S.filter(function (s) { return s.y > top.y + 2; }).reduce(function (a, s) { return s.c > a.c ? s : a; });
    ann(after.y, after.c, [after.y + ': “' + short(after.tt, phone ? 30 : 48) + '”', 'leads ' + after.c + ' citations'], phone ? 10 : 18, -34, y2);
    var qmax = S.reduce(function (a, s) { return s.q1 > a.q1 ? s : a; });
    var tq = T(qmax);
    if (!phone) ann(qmax.y, tq.j + tq.c + tq.o, [qmax.y + ': ' + qmax.q1 + ' Q1 papers,', 'his strongest year'], phone ? -10 : -24, -28, y1);

    root.querySelector('.nw-ccap').textContent = 'All ' + D.totals.pubs + ' curated outputs, ' + S[0].y + '–' + S[S.length - 1].y +
      '. Lower panel: citations to the papers published in each year. Citations per paper: higher of Google Scholar and Scopus counts, 25 September 2026. Recent papers have had less time to be cited.';
  }
})();
