(function () {
  // Press kit: copy buttons (Clipboard API, textarea fallback for http/older browsers)
  var live = document.querySelector('.pk-live');
  document.querySelectorAll('.pk-copy').forEach(function (b) {
    b.addEventListener('click', function () {
      var el = document.getElementById(b.dataset.copy);
      if (!el) return;
      var text = Array.prototype.map.call(el.querySelectorAll('p'), function (p) { return p.textContent.trim(); }).join('\n\n');
      var done = function () {
        b.textContent = 'Copied'; b.classList.add('ok');
        if (live) live.textContent = 'Biography copied to clipboard';
        setTimeout(function () { b.textContent = 'Copy'; b.classList.remove('ok'); }, 1800);
      };
      var fallback = function () {
        var t = document.createElement('textarea');
        t.value = text; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select();
        try { document.execCommand('copy') ? done() : (b.textContent = 'Select and copy'); } catch (e) { b.textContent = 'Select and copy'; }
        document.body.removeChild(t);
      };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, fallback);
      else fallback();
    });
  });
})();
