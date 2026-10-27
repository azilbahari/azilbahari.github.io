/* Academic family tree (students.html). Needs d3@7.9.0. */
(function () {
  var root = document.querySelector('.ft-tree');
  if (!root) return;
  var stage = root.querySelector('.ft-stage'), card = root.querySelector('.ft-card');
  var keyHTML = card.innerHTML, pinned = null;
  var NS = 'http://www.w3.org/2000/svg';

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // Short botanical label: given name(s) before the patronymic
  function short(n) { return n.split(/\s+(?:Binti|Bin)\s+/)[0]; }
  function role(d) { return d.main ? 'Main supervisor' : 'Co-supervisor'; }

  function show(d) {
    card.classList.add('has-d');
    card.innerHTML = '<div class="ft-card-k">' + d.l + ' &middot; ' + (d.g ? 'Graduated' : 'In progress') + '</div>' +
      '<h3>' + esc(d.n) + '</h3>' +
      '<p class="ft-card-t">' + (d.t ? esc(d.t) : 'Thesis title to be confirmed') + '</p>' +
      '<dl><dt>Role</dt><dd>' + role(d) + '</dd>' + (d.y ? '<dt>Graduated</dt><dd>' + d.y + '</dd>' : '') + '</dl>';
  }
  function clear() { pinned = null; card.classList.remove('has-d'); card.innerHTML = keyHTML; mark(null); }
  function mark(el) {
    root.querySelectorAll('.ft-leaf.on').forEach(function (x) { x.classList.remove('on'); });
    if (el) root.querySelectorAll('[data-i="' + el.getAttribute('data-i') + '"]').forEach(function (x) { x.classList.add('on'); });
  }

  function wire(el, d) {
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', d.n + ', ' + d.l + ', ' + (d.g ? 'graduated ' + (d.y || '') : 'in progress') + ', ' + role(d));
    el.addEventListener('mouseenter', function () { if (!pinned) { show(d); mark(el); } });
    el.addEventListener('mouseleave', function () { if (!pinned) clear(); });
    el.addEventListener('focus', function () { show(d); mark(el); });
    el.addEventListener('click', function () { pinned = pinned === d ? null : d; show(d); mark(el); });
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); }
    });
  }

  function svgEl(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  function build(data) {
    data.forEach(function (d, i) { d.i = i; });
    var groups = ['PhD', 'MSc'].map(function (lv) {
      return { name: lv, children: [true, false].map(function (g) {
        return { name: g ? 'Graduated' : 'In progress', children: data.filter(function (d) { return d.l === lv && d.g === g; })
          .sort(function (a, b) { return b.main - a.main || a.n.localeCompare(b.n); }) };
      }) };
    });
    var h = d3.hierarchy({ name: 'Azil', children: groups });
    var R = 330, SPAN = 150, W = 1100, H = 640, CX = W / 2, CY = 575;
    d3.cluster().size([SPAN, R]).separation(function (a, b) { return a.parent === b.parent ? 1 : 1.6; })(h);
    var rad = function (x) { return (x - SPAN / 2) * Math.PI / 180; };
    var pt = function (n) { var a = rad(n.x); return [n.y * Math.sin(a), -n.y * Math.cos(a)]; };

    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'ft-svg', role: 'group', 'aria-label': 'Radial supervision tree: Dr Azil at the root, PhD and MSc branches, one leaf per student' });
    var defs = svgEl('defs', {}, svg);
    defs.innerHTML = '<radialGradient id="ftSeal" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff1bf"/><stop offset=".55" stop-color="#c9a227"/><stop offset="1" stop-color="#8c6b1f"/></radialGradient>';
    var g = svgEl('g', { transform: 'translate(' + CX + ',' + CY + ')' }, svg);

    // engraved guide arcs and degree ticks
    var arc = d3.arc().startAngle(rad(-6)).endAngle(rad(SPAN + 6));
    [110, 220, R].forEach(function (r) { svgEl('path', { d: arc({ innerRadius: r, outerRadius: r }), class: 'ft-guide' }, g); });
    for (var t = 0; t <= SPAN; t += 5) {
      var a = rad(t), r0 = R + 10, r1 = R + (t % 25 ? 14 : 20);
      svgEl('line', { x1: r0 * Math.sin(a), y1: -r0 * Math.cos(a), x2: r1 * Math.sin(a), y2: -r1 * Math.cos(a), class: 'ft-tick' }, g);
    }

    var link = d3.linkRadial().angle(function (n) { return rad(n.x); }).radius(function (n) { return n.y; });
    h.links().forEach(function (l, k) {
      var d = l.target.data, p = svgEl('path', { d: link(l), class: 'ft-link' + (l.target.children ? ' ft-trunk' : '') + (d.n && !d.main ? ' ft-co' : ''), pathLength: 1, style: '--k:' + k }, g);
      if (d.n) { p.setAttribute('data-i', d.i); p.classList.add('ft-lk'); }
    });

    h.descendants().forEach(function (n) {
      if (!n.depth) return;
      var p = pt(n), deg = n.x - SPAN / 2;
      if (n.children) {
        svgEl('circle', { cx: p[0], cy: p[1], r: n.depth === 1 ? 4 : 2.5, class: 'ft-node' }, g);
        var tx = svgEl('text', { x: p[0], y: p[1] - (n.depth === 1 ? 12 : 8), class: n.depth === 1 ? 'ft-lv' : 'ft-st' }, g);
        tx.textContent = n.data.name;
        return;
      }
      var d = n.data, leaf = svgEl('g', { class: 'ft-leaf' + (d.g ? ' is-g' : '') + (d.main ? '' : ' is-co'), 'data-i': d.i, 'data-l': d.l, transform: 'translate(' + p[0] + ',' + p[1] + ') rotate(' + (deg - 90) + ')' }, g);
      svgEl('path', { d: 'M0,0C4,-6 13,-6 18,0C13,6 4,6 0,0Z', class: 'ft-blade' }, leaf);
      svgEl('path', { d: 'M1,0H16', class: 'ft-vein' }, leaf);
      var flip = deg < 0, lab = svgEl('text', { x: flip ? -24 : 24, dy: '.34em', transform: flip ? 'rotate(180)' : '', 'text-anchor': flip ? 'end' : 'start', class: 'ft-name' }, leaf);
      lab.textContent = short(d.n);
      wire(leaf, d);
    });

    // seal
    var seal = svgEl('g', { class: 'ft-seal' }, g);
    svgEl('circle', { r: 30, fill: 'url(#ftSeal)' }, seal);
    svgEl('circle', { r: 25, class: 'ft-seal-ring' }, seal);
    var st = svgEl('text', { y: 4, class: 'ft-seal-t' }, seal); st.textContent = 'AZIL';
    var cap = svgEl('text', { y: 52, class: 'ft-root' }, g); cap.textContent = 'Dr Azil Bahari';
    stage.appendChild(svg);
    var bb = g.getBBox(), pad = 12; // fit viewBox to drawing so it fills the column
    svg.setAttribute('viewBox', [CX + bb.x - pad, CY + bb.y - pad, bb.width + 2 * pad, bb.height + 2 * pad].join(' '));

    // phone: vertical indented tree
    var ul = document.createElement('ul'); ul.className = 'ft-list';
    groups.forEach(function (lv) {
      var li = document.createElement('li'); li.innerHTML = '<span class="ft-lv">' + lv.name + '</span>';
      var ul2 = document.createElement('ul');
      lv.children.forEach(function (s) {
        var li2 = document.createElement('li'); li2.innerHTML = '<span class="ft-st">' + s.name + '</span>';
        var ul3 = document.createElement('ul');
        s.children.forEach(function (d) {
          var li3 = document.createElement('li');
          li3.className = 'ft-leaf' + (d.g ? ' is-g' : '') + (d.main ? '' : ' is-co');
          li3.setAttribute('data-i', d.i); li3.setAttribute('data-l', d.l);
          li3.innerHTML = '<svg viewBox="0 0 20 12" aria-hidden="true"><path class="ft-blade" d="M1,6C5,0 14,0 19,6C14,12 5,12 1,6Z"/></svg><span>' + esc(d.n) + '</span>';
          wire(li3, d); ul3.appendChild(li3);
        });
        li2.appendChild(ul3); ul2.appendChild(li2);
      });
      li.appendChild(ul2); ul.appendChild(li);
    });
    var top = document.createElement('div'); top.className = 'ft-list-root'; top.textContent = 'Dr Azil Bahari';
    stage.appendChild(top); stage.appendChild(ul);

    // filters
    root.querySelectorAll('.ft-filters button').forEach(function (b) {
      b.addEventListener('click', function () {
        var f = b.getAttribute('data-f');
        root.querySelectorAll('.ft-filters button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
        root.querySelectorAll('[data-i]').forEach(function (el) {
          var d = data[el.getAttribute('data-i')];
          var hit = f === 'all' || f === d.l || (f === 'grad' && d.g) || (f === 'ongoing' && !d.g);
          el.classList.toggle('off', !hit);
          if (el.classList.contains('ft-leaf')) el.setAttribute('tabindex', hit ? '0' : '-1');
        });
        if (pinned) clear();
      });
    });
    root.addEventListener('keydown', function (e) { if (e.key === 'Escape') { clear(); if (root.contains(document.activeElement)) document.activeElement.blur(); } });
    root.classList.add('is-ready');
    setTimeout(function () { root.classList.add('is-grown'); }, 3200);
  }

  function start() {
    if (!window.d3) return;
    if (window.FT_DATA) return build(window.FT_DATA);
    fetch(stage.getAttribute('data-src')).then(function (r) { return r.json(); }).then(build);
  }
  function load() {
    if (window.d3) return start();
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js';
    s.onload = start; document.head.appendChild(s);
  }
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); load(); } }, { rootMargin: '300px' });
    io.observe(root);
  } else load();
})();
