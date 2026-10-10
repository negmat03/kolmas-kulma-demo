// Foto di sfondo "a scorrimento": ogni foto si muove piu' lentamente del testo.
// - Solo per le fasce che sono sullo schermo (IntersectionObserver): le altre non costano nulla.
// - Niente se l'utente ha chiesto di ridurre il movimento.
// - Si sposta con transform (veloce), mai con background-attachment: fixed, che su
//   Safari iOS scatta o non funziona.
(function () {
  if (window.matchMedia('(prefers-reduced-motion:reduce)').matches) return;
  var bands = [].slice.call(document.querySelectorAll('.band'));
  if (!bands.length || !('IntersectionObserver' in window)) return;

  var visible = new Set();
  var queued = false;
  var SPEED = 0.12;   // 0 = ferma, 0.12 = lieve; piu' alto = piu' evidente

  function paint() {
    queued = false;
    var mid = window.innerHeight / 2;
    visible.forEach(function (band) {
      var r = band.getBoundingClientRect();
      var inner = band.querySelector('.bgphoto-in');
      if (!inner) return;
      // non oltre il margine extra della foto (9% dell'altezza del riquadro che la contiene)
      var sticky = document.body.dataset.photomode === 'sticky';
      var max = (sticky ? inner.clientHeight : r.height) * 0.07;
      var y = -((r.top + r.height / 2) - mid) * SPEED;
      inner.style.setProperty('--py', Math.max(-max, Math.min(max, y)).toFixed(1) + 'px');
    });
  }
  function onScroll() { if (!queued) { queued = true; requestAnimationFrame(paint); } }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target); });
    onScroll();
  }, { rootMargin: '10% 0px' });
  bands.forEach(function (b) { io.observe(b); });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
})();
