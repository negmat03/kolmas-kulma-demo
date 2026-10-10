// Menu laterale + sezione attiva.
// - Telefono: il pannello scorre da destra, si apre dal bottone in testata.
// - Desktop (>= 900 px): il pannello e' sempre visibile sul bordo destro.
// - La voce della sezione che stai guardando prende aria-current="true".
(function () {
  var btn = document.getElementById('menu-btn');
  var nav = document.getElementById('sidenav');
  var back = document.getElementById('backdrop');
  if (!btn || !nav) return;

  var root = document.documentElement;
  var wide = window.matchMedia('(min-width:900px)');
  var links = [].slice.call(nav.querySelectorAll('a[data-sec]'));

  // lo sfondo scuro sfuma: va tolto da `hidden` solo dopo la dissolvenza
  var backTimer;
  function showBackdrop(on) {
    clearTimeout(backTimer);
    if (on) {
      back.hidden = false;
      void back.offsetWidth;            // fa partire la transizione dal basso
      back.classList.add('on');
    } else {
      back.classList.remove('on');
      backTimer = setTimeout(function () { back.hidden = true; }, 300);
    }
  }

  // quando il pannello e' chiuso su telefono, i suoi link non devono
  // essere raggiungibili con Tab ne' letti dai lettori di schermo
  function sync() {
    var open = root.classList.contains('nav-open');
    var hidden = !wide.matches && !open;
    if (hidden) nav.setAttribute('inert', ''); else nav.removeAttribute('inert');
    showBackdrop(open && !wide.matches);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function setOpen(v, returnFocus) {
    root.classList.toggle('nav-open', v);
    sync();
    if (v && links[0]) links[0].focus();
    if (!v && returnFocus) btn.focus();
  }

  btn.addEventListener('click', function () { setOpen(!root.classList.contains('nav-open')); });
  var closeBtn = document.getElementById('nav-close');
  if (closeBtn) closeBtn.addEventListener('click', function () { setOpen(false, true); });
  back.addEventListener('click', function () { setOpen(false, true); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && root.classList.contains('nav-open')) setOpen(false, true);
  });
  links.forEach(function (a) {
    a.addEventListener('click', function () { if (!wide.matches) setOpen(false); });
  });
  (wide.addEventListener ? wide.addEventListener('change', function () { setOpen(false); })
                         : wide.addListener(function () { setOpen(false); }));
  sync();

  // sezione attiva: l'ultima il cui bordo alto ha superato il 40% dello schermo.
  // In fondo alla pagina vince sempre l'ultima (le ultime sezioni sono corte
  // e non arriverebbero mai a quella soglia).
  var secs = links.map(function (a) { return document.getElementById(a.dataset.sec); })
                  .filter(Boolean);
  // barretta che scivola sulla voce attiva (e' solo decorazione: aria-hidden)
  var ind = nav.querySelector('.nav-ind');
  var current = null, placed = false;
  function place() {
    if (!ind || !current) return;
    var li = current.parentNode;
    ind.style.height = li.offsetHeight + 'px';
    ind.style.transform = 'translateY(' + li.offsetTop + 'px)';
    if (!placed) {                      // la prima posizione e' immediata, niente corsa dall'alto
      placed = true;
      requestAnimationFrame(function () { requestAnimationFrame(function () { ind.classList.add('ready'); }); });
    }
  }
  function mark(id) {
    links.forEach(function (a) {
      if (a.dataset.sec === id) { a.setAttribute('aria-current', 'true'); current = a; }
      else a.removeAttribute('aria-current');
    });
    place();
  }
  // la voce cliccata resta attiva finche' l'utente non scorre da solo
  // (le ultime sezioni non possono salire in cima: la pagina finisce prima)
  var pinned = null;
  ['wheel', 'touchmove', 'keydown', 'mousedown'].forEach(function (ev) {
    window.addEventListener(ev, function () { pinned = null; }, { passive: true });
  });
  links.forEach(function (a) {
    a.addEventListener('click', function () { pinned = a.dataset.sec; mark(pinned); });
  });
  function update() {
    if (pinned) return;
    var line = window.innerHeight * 0.4, id = secs[0] && secs[0].id;
    secs.forEach(function (el) { if (el.getBoundingClientRect().top <= line) id = el.id; });
    var atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
    if (atEnd && secs.length) id = secs[secs.length - 1].id;
    mark(id);
  }
  var queued = false;
  function onScroll() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; update(); });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', function () { onScroll(); place(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  update();
})();
