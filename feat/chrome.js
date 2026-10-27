/* Site chrome: search palette, theme toggle, reading progress, back-to-top. */
(function () {
  var tools = document.querySelector('.cx-tools');
  if (!tools) return;
  var html = document.documentElement;
  var base = tools.dataset.base || '';
  var indexUrl = tools.dataset.index || 'search-index.json';

  // must match slug() in make_data.py; gives anchors to headings build.py has not yet tagged
  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60); }
  var used = {};
  document.querySelectorAll('main h2, main h3').forEach(function (h) {
    var id = h.id || slug(h.textContent.replace(/\s+/g, ' ').trim()), b = id, n = 2;
    if (!h.id) { while (used[id]) id = b + '-' + n++; h.id = id; }
    used[h.id] = 1;
  });

  /* ---------- theme ---------- */
  var tb = tools.querySelector('.cx-theme');
  function syncTheme() {
    var dark = html.dataset.theme === 'dark';
    tb.setAttribute('aria-pressed', dark);
    tb.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  }
  if (!html.dataset.theme) html.dataset.theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  syncTheme();
  tb.addEventListener('click', function () {
    html.dataset.theme = html.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('theme', html.dataset.theme); } catch (e) {}
    syncTheme();
  });

  /* ---------- progress + back to top ---------- */
  var bar = document.querySelector('.cx-progress i');
  var up = document.createElement('button');
  up.className = 'cx-top'; up.type = 'button'; up.setAttribute('aria-label', 'Back to top');
  up.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';
  up.addEventListener('click', function () { scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); });
  document.body.appendChild(up);
  var ticking = false;
  function onScroll() {
    if (ticking) return; ticking = true;
    requestAnimationFrame(function () {
      var max = document.documentElement.scrollHeight - innerHeight, y = scrollY;
      if (bar) bar.style.setProperty('--cx-p', max > 0 ? Math.min(1, y / max) : 0);
      up.classList.toggle('on', y > innerHeight * 0.9);
      ticking = false;
    });
  }
  addEventListener('scroll', onScroll, { passive: true }); addEventListener('resize', onScroll); onScroll();

  /* ---------- search palette ---------- */
  var dlg, input, res, data, items = [], sel = 0;
  var ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg>';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  function build() {
    dlg = document.createElement('dialog');
    dlg.className = 'cx-pal'; dlg.setAttribute('aria-label', 'Search the site');
    dlg.innerHTML = '<form role="search" method="dialog">' + ICON +
      '<input type="text" enterkeyhint="go" placeholder="Search pages, sections, publications" aria-label="Search" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="cx-res" aria-autocomplete="list">' +
      '<button class="cx-esc" type="button" aria-label="Close search">Esc</button></form>' +
      '<div class="cx-res" id="cx-res" role="listbox" aria-label="Results"></div>' +
      '<div class="cx-foot" aria-hidden="true"><span><kbd>&uarr;</kbd><kbd>&darr;</kbd>move</span><span><kbd>Enter</kbd>open</span><span><kbd>Esc</kbd>close</span></div>';
    document.body.appendChild(dlg);
    input = dlg.querySelector('input'); res = dlg.querySelector('.cx-res');
    dlg.querySelector('.cx-esc').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); }); // backdrop click
    input.addEventListener('input', render);
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); move(e.key === 'ArrowDown' ? 1 : -1); }
      else if (e.key === 'Enter') { e.preventDefault(); if (items[sel]) items[sel].click(); }
    });
    res.addEventListener('mousemove', function (e) { var a = e.target.closest('a'); if (a) select(items.indexOf(a)); });
    fetch(indexUrl).then(function (r) { return r.json(); }).then(function (d) {
      data = d;
      ['pages', 'sections', 'pubs'].forEach(function (k) { d[k].forEach(function (x) { x._t = norm(x.t); x._d = norm((x.pg || '') + ' ' + x.d + ' ' + (x.s || '') + ' ' + (x.y || '')); }); });
      render();
    }).catch(function () { res.innerHTML = '<p class="cx-empty">Search is unavailable offline.</p>'; });
  }

  // token scoring: title word-start > title substring > title subsequence > body substring
  function score(x, toks) {
    var s = 0;
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i], p = x._t.indexOf(t);
      if (p === 0 || (p > 0 && /[^a-z0-9]/.test(x._t[p - 1]))) s += 10;
      else if (p > 0) s += 6;
      else if (x._d.indexOf(t) >= 0) s += 3;
      else if (t.length > 3 && subseq(t, x._t)) s += 1;
      else return 0;
    }
    return s + 2 / (1 + x._t.length / 40);
  }
  function subseq(t, s) { for (var i = 0, j = 0; i < s.length && j < t.length; i++) if (s[i] === t[j]) j++; return j === t.length; }
  function hl(s, toks) {
    var out = esc(s);
    toks.forEach(function (t) { if (t.length > 1) out = out.replace(new RegExp('(' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>'); });
    return out;
  }
  function group(title, list, toks, cap, urlFn, metaFn, descFn) {
    if (!list.length) return '';
    return '<h5>' + title + '</h5>' + list.slice(0, cap).map(function (x) {
      return '<a role="option" href="' + esc(urlFn(x)) + '"><b>' + hl(x.t, toks) + '</b><small>' + esc(descFn(x)) + '</small><i>' + esc(metaFn(x)) + '</i></a>';
    }).join('');
  }
  function render() {
    if (!data) { res.innerHTML = '<p class="cx-empty">Loading the index&hellip;</p>'; return; }
    var q = norm(input.value).trim(), toks = q.split(/\s+/).filter(Boolean);
    function top(list) {
      if (!toks.length) return list;
      return list.map(function (x) { return [score(x, toks), x]; }).filter(function (p) { return p[0] > 0; })
        .sort(function (a, b) { return b[0] - a[0]; }).map(function (p) { return p[1]; });
    }
    var P = top(data.pages), S = toks.length ? top(data.sections) : [], U = toks.length ? top(data.pubs) : [];
    var h = group('Pages', P, toks, 9, function (x) { return base + x.u; }, function () { return 'Page'; }, function (x) { return x.d; }) +
      group('Sections', S, toks, 8, function (x) { return base + x.u; }, function (x) { return x.pg; }, function (x) { return x.d; }) +
      group('Publications', U, toks, 8, function (x) { return x.d ? 'https://doi.org/' + x.d : base + 'publications.html'; }, function (x) { return x.y || ''; }, function (x) { return x.s; });
    res.innerHTML = h || '<p class="cx-empty">Nothing matches &ldquo;' + esc(input.value) + '&rdquo;. Try a topic such as biochar or CIMAH.</p>';
    items = [].slice.call(res.querySelectorAll('a'));
    items.forEach(function (a, i) { a.id = 'cx-o' + i; a.tabIndex = -1; if (/^https?:/.test(a.getAttribute('href'))) { a.target = '_blank'; a.rel = 'noopener'; } });
    select(0);
  }
  function select(i) {
    if (!items.length) { input.removeAttribute('aria-activedescendant'); return; }
    sel = (i + items.length) % items.length;
    items.forEach(function (a, k) { a.setAttribute('aria-selected', k === sel); });
    input.setAttribute('aria-activedescendant', items[sel].id);
    items[sel].scrollIntoView({ block: 'nearest' });
  }
  function move(d) { select(sel + d); }
  function open() {
    if (!dlg) build();
    if (dlg.open) return;
    dlg.showModal(); // native modal: inert background = focus trap, Esc closes
    input.select(); render();
  }
  tools.querySelector('.cx-search').addEventListener('click', open);
  addEventListener('keydown', function (e) {
    var t = e.target, typing = t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName);
    if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); open(); }
    else if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); open(); }
  });
})();
