// Bicchieri delle birre e panini: si riempiono (o si compongono) ogni volta che la riga entra nello schermo,
// e tornano vuoti quando esce, cosi' il movimento si rivede a ogni passaggio.
// Solo transform e opacity (vedi taps.css). Con "riduci movimento" o senza IntersectionObserver tutto resta pieno.
// Se questo file non parte, dopo 4 s la pagina (base.html) rimette tutto pieno da sola.
(function () {
  clearTimeout(window.__pour);
  var items = [].slice.call(document.querySelectorAll('.tap, .dish.art'));
  var calm = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;
  if (!items.length) return;
  if (calm || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('poured'); });
    return;
  }

  // torna vuoto senza animare la discesa del liquido (che avverrebbe fuori schermo)
  function rearm(el) {
    el.classList.add('rearm');
    el.classList.remove('poured');
    void el.offsetWidth;          // forza il ricalcolo: le animazioni CSS ripartono da zero
    el.classList.remove('rearm');
  }

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      var el = e.target;
      if (e.isIntersecting && e.intersectionRatio >= 0.45) {
        el.classList.add('poured');
      } else if (e.intersectionRatio < 0.1 && el.classList.contains('poured')) {
        rearm(el);
      }
    });
  }, { threshold: [0, 0.1, 0.45], rootMargin: '0px 0px -6% 0px' });
  items.forEach(function (el) { io.observe(el); });
})();
