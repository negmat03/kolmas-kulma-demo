// Pianta del locale: filtro per numero di persone + scheda del tavolo scelto.
// La scelta e' un desiderio, non una prenotazione: non c'e' un sistema che
// sappia quali tavoli sono liberi. Il pulsante porta al telefono.
(function () {
  var svg = document.getElementById('plan');
  var info = document.getElementById('plan-info');
  var party = document.getElementById('party');
  if (!svg || !info) return;

  var phone = (window.KK && window.KK.tel) || null;
  var tables = [].slice.call(svg.querySelectorAll('.tbl'));
  var n = 0;           // numero di persone scelto (0 = tutti)
  var selected = null; // id del tavolo scelto

  function lang() { return document.documentElement.lang === 'en' ? 'en' : 'fi'; }
  var T = {
    fi: { pick: 'Valitse pöytä kartalta.', table: 'Pöytä', seats: 'paikkaa', call: 'Soita ja kerro: pöytä ',
          req: 'Lähetä pyyntö: pöytä ',
          small: 'Tähän pöytään ei mahdu koko seurue. Kokeile isompaa pöytää.',
          note: 'Tämä on toive, ei varaus. Emme takaa pöydän saatavuutta; vahvistamme puhelimessa.' },
    en: { pick: 'Choose a table on the plan.', table: 'Table', seats: 'seats', call: 'Call and mention: table ',
          req: 'Send a request: table ',
          small: 'This table is too small for your group. Try a bigger one.',
          note: 'This is a wish, not a booking. Availability is not guaranteed; we confirm by phone.' }
  };

  function paint() {
    var best = null;
    tables.forEach(function (g) {
      var s = +g.dataset.seats;
      if (n && s >= n && (best === null || s < best)) best = s;
    });
    tables.forEach(function (g) {
      var s = +g.dataset.seats;
      var fits = !n || s >= n;
      g.classList.toggle('dim', !fits);
      g.classList.toggle('fit', !!n && fits);
      g.classList.toggle('best', !!n && fits && s === best);
      g.classList.toggle('sel', g.dataset.id === selected);
      g.setAttribute('aria-pressed', g.dataset.id === selected ? 'true' : 'false');
    });
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  function render() {
    var L = T[lang()];
    info.textContent = '';
    var g = tables.filter(function (t) { return t.dataset.id === selected; })[0];
    if (!g) { info.appendChild(el('p', 'pi-empty', L.pick)); return; }
    var zone = lang() === 'en' ? g.dataset.ze : g.dataset.zf;
    info.appendChild(el('p', 'pi-title', L.table + ' ' + g.dataset.id));
    info.appendChild(el('p', 'pi-meta', g.dataset.seats + ' ' + L.seats + ' · ' + zone));
    if (n && +g.dataset.seats < n) info.appendChild(el('p', 'pi-warn', L.small));
    var tel = document.querySelector('a.btn.solid[href^="tel:"]');
    if (tel) {
      var a = el('a', 'btn solid', L.call + g.dataset.id);
      a.href = tel.getAttribute('href');
      info.appendChild(a);
    }
    // alternativa al telefono: porta al modulo di richiesta (c'e' solo se la pagina lo ha)
    if (document.getElementById('booking-box')) {
      var r = el('a', 'btn ghost', L.req + g.dataset.id);
      r.href = '#booking-box';
      r.addEventListener('click', function () {
        setTimeout(function () { var d = document.getElementById('bk-date'); if (d) d.focus({ preventScroll: true }); }, 500);
      });
      info.appendChild(r);
    }
    info.appendChild(el('p', 'pi-note', L.note));
  }

  // il movimento riparte a ogni scelta: si toglie la classe, si forza il ricalcolo dello stile, poi si rimette
  function replay(el, cls) {
    el.classList.remove(cls);
    void el.getBoundingClientRect();
    el.classList.add(cls);
  }
  function choose(g) {
    selected = (selected === g.dataset.id) ? null : g.dataset.id;
    paint(); render();
    if (selected) { replay(g, 'pulse'); replay(info, 'enter'); }   // il tavolo pulsa una volta, la scheda entra
    var sel = tables.filter(function (t) { return t.dataset.id === selected; })[0];
    document.dispatchEvent(new CustomEvent('kk:table', { detail: sel ? {
      id: sel.dataset.id, seats: sel.dataset.seats, zf: sel.dataset.zf, ze: sel.dataset.ze } : null }));
  }
  tables.forEach(function (g) {
    g.addEventListener('click', function () { choose(g); });
    g.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(g); }
    });
  });

  if (party) {
    var btns = [].slice.call(party.querySelectorAll('button'));
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        n = +b.dataset.n;
        btns.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        paint(); render();
      });
    });
  }

  // cambio lingua: ridisegna la scheda con il testo giusto
  [].forEach.call(document.querySelectorAll('.lang button'), function (b) {
    b.addEventListener('click', function () { setTimeout(render, 0); });
  });

  paint(); render();
})();
