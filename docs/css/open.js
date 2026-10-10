// Badge "Auki nyt / Open now", riga di oggi negli orari, eccezioni.
// Legge gli orari da window.KK (che arrivano da site.json) e usa l'ora e la
// data di Helsinki, non quelle del telefono: chi guarda da un altro fuso vede
// lo stesso. Le date speciali (eccezioni) sovrascrivono gli orari settimanali.
(function () {
  var cfg = window.KK;
  var box = document.getElementById('status');
  var txt = document.getElementById('status-text');
  if (!cfg || !box || !txt) return;

  var DAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

  // giorno della settimana, data (AAAA-MM-GG) e minuti dalla mezzanotte, a Helsinki
  function nowInHelsinki() {
    var p = new Intl.DateTimeFormat('en-GB', {
      timeZone: cfg.fuso, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date());
    var o = {};
    p.forEach(function (x) { o[x.type] = x.value; });
    return {
      day: DAYS[o.weekday],
      date: o.year + '-' + o.month + '-' + o.day,
      min: (+o.hour % 24) * 60 + +o.minute
    };
  }
  function mins(hhmm) { var s = hhmm.split(':'); return +s[0] * 60 + +s[1]; }

  // data del giorno prima (aritmetica in UTC sul solo testo AAAA-MM-GG)
  function dayBefore(date) {
    var d = new Date(date + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  // turni di un giorno: l'eccezione di quella data, altrimenti gli orari della settimana
  function shiftsFor(day, date) {
    var ex = (cfg.eccezioni || []).filter(function (e) { return e.data === date; })[0];
    if (ex) return ex.chiuso ? [] : [{ apre: ex.apre, chiude: ex.chiude }];
    return cfg.orari.filter(function (r) { return r.giorni.indexOf(day) > -1; });
  }

  // un turno che chiude dopo mezzanotte (es. 14:00-02:00) occupa due giorni
  function isOpen(now) {
    var today = shiftsFor(now.day, now.date), i, a, c;
    for (i = 0; i < today.length; i++) {
      a = mins(today[i].apre); c = mins(today[i].chiude);
      if (c <= a) c += 24 * 60;
      if (now.min >= a && now.min < c) return today[i];
    }
    var y = shiftsFor((now.day + 6) % 7, dayBefore(now.date));   // turno iniziato ieri sera
    for (i = 0; i < y.length; i++) {
      a = mins(y[i].apre); c = mins(y[i].chiude);
      if (c <= a && now.min < c) return y[i];
    }
    return null;
  }

  // Calcola lo stato e lo disegna. Si puo' richiamare tutte le volte che serve:
  // ogni chiamata rilegge l'ora e riparte da zero (toglie classi e segni vecchi).
  function update() {
    var now = nowInHelsinki();
    var r = isOpen(now);
    box.classList.remove('open', 'closed');
    box.classList.add(r ? 'open' : 'closed');
    var close = r ? r.chiude.replace('24:00', '00:00') : '';
    txt.setAttribute('data-fi', r ? 'Auki nyt · sulkeutuu ' + close : 'Suljettu nyt');
    txt.setAttribute('data-en', r ? 'Open now · closes ' + close : 'Closed now');
    var lang = document.documentElement.lang === 'en' ? 'en' : 'fi';
    txt.textContent = txt.getAttribute('data-' + lang);

    // riga di oggi nella tabella orari
    [].forEach.call(document.querySelectorAll('#hours tr[data-days]'), function (tr) {
      if (tr.dataset.days.split(',').indexOf(String(now.day)) > -1) tr.setAttribute('aria-current', 'date');
      else tr.removeAttribute('aria-current');
    });

    // eccezioni gia' passate: nascoste (e se non ne resta nessuna, via tutto il blocco)
    var exc = document.getElementById('exc');
    if (exc) {
      var left = 0;
      [].forEach.call(exc.querySelectorAll('li[data-date]'), function (li) {
        li.hidden = li.dataset.date < now.date;
        if (!li.hidden) left++;
      });
      exc.hidden = !left;
    }
  }

  update();   // una volta al caricamento della pagina

  // Quando riaggiornare il badge (altrimenti resta fermo all'ora di apertura della pagina):
  // 1) ogni 30 secondi, ma solo se la scheda e' visibile (a scheda nascosta non serve);
  // 2) appena si torna sulla scheda dopo averla lasciata in secondo piano;
  // 3) quando Safari riporta in vita la pagina dalla sua cache (back/forward, app riaperta):
  //    in quel caso gli script non rigirano da soli, e "persisted" e' vero.
  setInterval(function () { if (!document.hidden) update(); }, 30000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) update(); });
  window.addEventListener('pageshow', function (e) { if (e.persisted) update(); });
})();
