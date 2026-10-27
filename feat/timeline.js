/* Career timeline: year numeral counts with scroll, gold spine and paper ribbon fill. Markup is complete without JS. */
(function () {
  var root = document.querySelector('.tlx');
  if (!root) return;
  var num = root.querySelector('.tlx-num span');
  var list = root.querySelector('.tlx-list');
  var groups = [].slice.call(root.querySelectorAll('.tlx-y'));
  var bars = [].slice.call(root.querySelectorAll('.tlx-bars rect'));
  var still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var shown = num.textContent, ticking = false, live = false;
  root.classList.add('js');

  function setYear(y) {
    bars.forEach(function (b) {
      var by = +b.getAttribute('data-y');
      b.classList.toggle('on', by < y);
      b.classList.toggle('now', by === y);
    });
    if (String(y) === shown) return;
    shown = String(y);
    if (still) { num.textContent = shown; return; }
    num.classList.add('tlx-flip');
    setTimeout(function () { num.textContent = shown; num.classList.remove('tlx-flip'); }, 140);
  }

  function update() {
    ticking = false;
    var line = innerHeight * 0.45, cur = groups[0];
    groups.forEach(function (g) {
      var r = g.getBoundingClientRect();
      if (r.top < line) cur = g;
      if (r.top < innerHeight * 0.9) g.classList.add('in');
      g.classList.remove('cur');
    });
    cur.classList.add('cur');
    setYear(+cur.getAttribute('data-y'));
    var lr = list.getBoundingClientRect();
    list.style.setProperty('--p', Math.max(0, Math.min(1, (line - lr.top) / lr.height)).toFixed(3));
  }
  function onScroll() { if (live && !ticking) { ticking = true; requestAnimationFrame(update); } }

  if (still) groups.forEach(function (g) { g.classList.add('in'); });
  // only listen while the section is on screen
  new IntersectionObserver(function (e) { live = e[0].isIntersecting; if (live) update(); }).observe(root);
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
})();
