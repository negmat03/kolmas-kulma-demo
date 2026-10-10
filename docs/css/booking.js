// Richiesta di tavolo via sito (NON e' una prenotazione: il locale deve confermare).
// - Giorni e orari arrivano da site.json (window.KK): chiusure ed eccezioni incluse.
// - Modalita' "demo": nessun messaggio parte, si vede solo la conferma simulata.
// - Modalita' "endpoint": i dati vanno in POST (JSON) all'indirizzo di un servizio che li gira
//   per email al locale (vedi site.json > prenotazione). Se l'invio fallisce si invita a telefonare.
// Tutti i testi usati qui sono in due lingue (T) e si ridisegnano al cambio lingua.
(function () {
  var form = document.getElementById('booking');
  var cfg = window.KK;
  if (!form || !cfg) return;
  var P = cfg.prenotazione || {};
  var $ = function (id) { return document.getElementById(id); };
  var f = {
    date: $('bk-date'), service: $('bk-svc-lunch'), time: $('bk-time'), party: $('bk-party'), name: $('bk-name'),
    email: $('bk-email'), phone: $('bk-phone'), notes: $('bk-notes'), consent: $('bk-consent')
  };
  var hint = $('bk-hours'), status = $('bk-status'), done = $('bk-done'), wish = $('bk-wish');
  var send = $('bk-send');
  var table = null;       // tavolo desiderato {id, seats, zone_fi, zone_en}
  var errs = {};          // campo -> chiave messaggio (si ridisegna al cambio lingua)
  var sent = null;        // riepilogo dell'ultima richiesta inviata
  var sentSvc = '';       // pranzo o cena della richiesta inviata ('lunch' | 'dinner')
  var sending = false;

  function lang() { return document.documentElement.lang === 'en' ? 'en' : 'fi'; }
  var T = {
    fi: {
      choose: 'Valitse', pickDate: 'Valitse ensin päivä', closed: 'Suljettu tänä päivänä. Valitse toinen päivä.',
      pickService: 'Valitse ensin lounas tai illallinen', noService: 'Tälle palvelulle ei ole aikoja tänä päivänä. Valitse toinen palvelu tai päivä.',
      e_service: 'Valitse lounas tai illallinen.', s_service: 'Palvelu',
      tooLate: 'Tälle päivälle ei ole enää vapaita aikoja. Valitse toinen päivä.',
      open: 'Auki', last: 'Viimeinen pyyntöaika',
      pickBtn: 'Valitse päivä', fullDay: 'Kaikki ajat ovat täynnä tänä päivänä. Valitse toinen päivä.',
      e_fullday: 'Päivä on täynnä.', e_timefull: 'Tämä aika on täynnä.', slotFull: 'täynnä',
      l_open: 'Vapaita aikoja', l_few: 'Muutama aika jäljellä', l_full: 'Täynnä', l_closed: 'Suljettu',
      calPrev: 'Edellinen kuukausi', calNext: 'Seuraava kuukausi', calClose: 'Sulje kalenteri', calName: 'Valitse päivä',
      availDemo: 'Demo: vapaat ajat on keksitty. Oikeassa sivustossa ne tulisivat ravintolan omasta kalenterista.',
      availNote: 'Vapaa aika on toive, ei varaus: vahvistamme pyynnön erikseen.',
      e_date: 'Valitse päivä.', e_past: 'Päivä on jo mennyt.', e_far: 'Voit pyytää pöytää enintään {n} päivän päähän.',
      e_closedday: 'Olemme silloin suljettuina.', e_time: 'Valitse kellonaika.', e_party: 'Valitse henkilömäärä.',
      e_name: 'Kirjoita nimesi.', e_email: 'Kirjoita toimiva sähköpostiosoite.', e_phone: 'Kirjoita puhelinnumero.',
      e_consent: 'Hyväksyntä tarvitaan pyynnön lähettämiseen.',
      wish: 'Pöytätoive: pöytä {id} ({seats} paikkaa, {zone}). Toive, ei takuuta.',
      sending: 'Lähetetään…',
      fail: 'Lähetys ei onnistunut. Soita meille, niin hoidetaan asia puhelimessa.',
      doneTitle: 'Pyyntö lähetetty', doneText: 'Katsomme pyynnön ja vastaamme osoitteeseen {email}. Tämä ei ole vielä varaus.',
      demo: 'Demo: viestiä ei lähetetty oikeasti, tämä on simulaatio.',
      s_date: 'Päivä', s_time: 'Aika', s_party: 'Henkilöä', s_table: 'Pöytätoive', s_name: 'Nimi', none: 'ei valittu'
    },
    en: {
      choose: 'Choose', pickDate: 'Pick a date first', closed: 'Closed that day. Please pick another date.',
      pickService: 'Choose lunch or dinner first', noService: 'No times for this meal that day. Choose another meal or date.',
      e_service: 'Choose lunch or dinner.', s_service: 'Service',
      tooLate: 'No more times left for that day. Please pick another date.',
      open: 'Open', last: 'Last request time',
      pickBtn: 'Choose a date', fullDay: 'Every time is taken that day. Please pick another date.',
      e_fullday: 'That day is fully booked.', e_timefull: 'That time is taken.', slotFull: 'full',
      l_open: 'Times available', l_few: 'A few times left', l_full: 'Fully booked', l_closed: 'Closed',
      calPrev: 'Previous month', calNext: 'Next month', calClose: 'Close calendar', calName: 'Choose a date',
      availDemo: 'Demo: availability is made up. On a real site it comes from the restaurant\'s own calendar.',
      availNote: 'An available time is a request, not a booking: we confirm each request separately.',
      e_date: 'Choose a date.', e_past: 'That date has passed.', e_far: 'You can request a table up to {n} days ahead.',
      e_closedday: 'We are closed that day.', e_time: 'Choose a time.', e_party: 'Choose the number of guests.',
      e_name: 'Please enter your name.', e_email: 'Please enter a valid email address.', e_phone: 'Please enter a phone number.',
      e_consent: 'Your agreement is needed to send the request.',
      wish: 'Table wish: table {id} ({seats} seats, {zone}). A wish, not a guarantee.',
      sending: 'Sending…',
      fail: 'Sending did not work. Please call us and we will sort it out by phone.',
      doneTitle: 'Request sent', doneText: 'We will look at it and reply to {email}. This is not a booking yet.',
      demo: 'Demo: no message was actually sent, this is a simulation.',
      s_date: 'Date', s_time: 'Time', s_party: 'Guests', s_table: 'Table wish', s_name: 'Name', none: 'none'
    }
  };
  function tx(k, vars) {
    var s = T[lang()][k] || k;
    if (vars) Object.keys(vars).forEach(function (v) { s = s.replace('{' + v + '}', vars[v]); });
    return s;
  }

  // ---- ora e orari (stessa logica di open.js: ora di Helsinki, turni oltre mezzanotte) ----
  var DAYS = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  function now() {
    var p = new Intl.DateTimeFormat('en-GB', {
      timeZone: cfg.fuso, weekday: 'short', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date());
    var o = {};
    p.forEach(function (x) { o[x.type] = x.value; });
    return { date: o.year + '-' + o.month + '-' + o.day, min: (+o.hour % 24) * 60 + +o.minute };
  }
  function addDays(date, n) {
    var d = new Date(date + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
  function mins(hhmm) { var s = hhmm.split(':'); return +s[0] * 60 + +s[1]; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hhmm(m) { return pad(Math.floor(m / 60) % 24) + ':' + pad(m % 60); }
  function shiftsFor(date) {
    var day = new Date(date + 'T12:00:00Z').getUTCDay();
    var ex = (cfg.eccezioni || []).filter(function (e) { return e.data === date; })[0];
    if (ex) return ex.chiuso ? [] : [{ apre: ex.apre, chiude: ex.chiude }];
    return cfg.orari.filter(function (r) { return r.giorni.indexOf(day) > -1; });
  }
  // orari prenotabili: dall'apertura fino a "margine" minuti prima della chiusura
  function slotsFor(date) {
    var out = [], n = now();
    shiftsFor(date).forEach(function (s) {
      var a = mins(s.apre), c = mins(s.chiude);
      if (c <= a) c += 1440;
      for (var t = a; t <= c - (P.chiusura_margine_minuti || 60); t += (P.passo_minuti || 30)) {
        if (date === n.date && t < n.min + (P.preavviso_minuti || 60)) continue;
        out.push(t);
      }
    });
    return out;
  }

  // ---- disegno dei campi ----
  function fillParty() {
    var cur = f.party.value;
    f.party.textContent = '';
    var o = document.createElement('option'); o.value = ''; o.textContent = tx('choose'); f.party.appendChild(o);
    for (var i = 1; i <= (P.max_persone || 8); i++) {
      o = document.createElement('option'); o.value = String(i); o.textContent = String(i); f.party.appendChild(o);
    }
    f.party.value = cur;
  }
  // ---- pranzo o cena: ogni servizio ha la sua fascia di orari (site.json > servizi) ----
  var SVC = cfg.servizi || {};
  var svc = '';           // 'lunch' | 'dinner' | '' (nessuno scelto)
  function svcName(k) { var s = SVC[k]; return s ? (lang() === 'en' ? s.en : s.fi) : ''; }
  // orario di inizio nel servizio: dall'inizio fino a "margine" minuti prima della fine della cucina
  function inService(t) {
    var s = SVC[svc];
    if (!svc || !s) return true;
    return t >= mins(s.da) && t <= mins(s.a) - (P.chiusura_margine_minuti || 60);
  }
  function fillTimes() {
    var cur = f.time.value, d = f.date.value;
    f.time.textContent = '';
    var o = document.createElement('option'); o.value = '';
    if (!d) { o.textContent = tx('pickDate'); f.time.appendChild(o); f.time.disabled = true; hint.textContent = ''; return; }
    var all = slotsFor(d), sh = shiftsFor(d);
    if (!sh.length) { o.textContent = '—'; f.time.appendChild(o); f.time.disabled = true; hint.textContent = tx('closed'); return; }
    if (!all.length) { o.textContent = '—'; f.time.appendChild(o); f.time.disabled = true; hint.textContent = tx('tooLate'); return; }
    if (!svc) { o.textContent = tx('pickService'); f.time.appendChild(o); f.time.disabled = true; hint.textContent = ''; return; }
    var sl = all.filter(function (t) { return inService(t); });
    if (!sl.length) { o.textContent = '—'; f.time.appendChild(o); f.time.disabled = true; hint.textContent = tx('noService'); return; }
    var av = availability(d, sl);
    if (av.full) { o.textContent = '—'; f.time.appendChild(o); f.time.disabled = true; hint.textContent = tx('fullDay'); return; }
    o.textContent = tx('choose'); f.time.appendChild(o);
    sl.forEach(function (t) {
      var op = document.createElement('option'), busy = av.taken.indexOf(t) > -1;
      op.value = hhmm(t); op.textContent = hhmm(t) + (busy ? ' · ' + tx('slotFull') : ''); op.disabled = busy;
      f.time.appendChild(op);
    });
    f.time.disabled = false;
    f.time.value = cur;
    hint.textContent = sh.map(function (s) { return tx('open') + ' ' + s.apre + '–' + s.chiude; }).join(', ') +
      ' · ' + svcName(svc) + ' ' + hhmm(sl[0]) + (sl.length > 1 ? '–' + hhmm(sl[sl.length - 1]) : '');
  }
  var minDate = '', maxDate = '';
  function setLimits() {
    var n = now();
    minDate = n.date;
    maxDate = addDays(n.date, P.max_giorni || 60);
  }

  // ---- disponibilita' ----
  // Demo: giorni e orari "pieni" inventati ma stabili (dipendono solo dalla data).
  // Reale: qui si leggerebbe il calendario del locale.
  function hash(date) {
    var s = date.split('-'), h = (+s[0]) * 372 + (+s[1]) * 31 + (+s[2]);
    return (h * 2654435761) >>> 0;
  }
  // restituisce { full: tutto pieno?, taken: [minuti pieni] } per una data e la sua lista di orari
  function availability(date, slots) {
    var h = hash(date), day = new Date(date + 'T12:00:00Z').getUTCDay(), r = h % 100, taken = [];
    var wk = (day === 6) ? 38 : (day === 5 ? 24 : (day === 0 ? 10 : 6));
    if (!slots.length) return { full: false, taken: [] };
    if (r < wk) return { full: true, taken: slots.slice() };
    var evening = (day === 5 || day === 6);
    slots.forEach(function (t, i) {
      var busy = ((h >> 3) + i * 7) % 5 === 0;
      if (evening && t >= 18 * 60 + 30 && t <= 21 * 60 + 30 && ((h >> 5) + i) % 3 !== 0) busy = true;
      if (busy && r % 3 !== 0) taken.push(t);
    });
    if (taken.length === slots.length) return { full: true, taken: taken };
    return { full: false, taken: taken };
  }
  // stato del giorno nel calendario: out | closed | full | few | open
  function dayStatus(date) {
    if (date < minDate || date > maxDate) return 'out';
    if (!shiftsFor(date).length) return 'closed';
    var sl = slotsFor(date), av = availability(date, sl);
    if (!sl.length || av.full) return 'full';
    return av.taken.length ? 'few' : 'open';
  }
  function drawWish() {
    if (!table) { wish.hidden = true; wish.textContent = ''; return; }
    wish.textContent = tx('wish', { id: table.id, seats: table.seats, zone: lang() === 'en' ? table.ze : table.zf });
    wish.hidden = false;
  }

  // ---- errori ----
  function showErr(field, key, vars) {
    var p = $('bk-' + field + '-err'), inp = f[field];
    errs[field] = key ? { key: key, vars: vars } : null;
    if (!p) return;
    if (key) { p.textContent = tx(key, vars); p.hidden = false; inp.setAttribute('aria-invalid', 'true'); inp.setAttribute('aria-describedby', p.id); }
    else { p.textContent = ''; p.hidden = true; inp.removeAttribute('aria-invalid'); inp.removeAttribute('aria-describedby'); }
  }
  function redrawErrs() {
    Object.keys(errs).forEach(function (k) { if (errs[k]) showErr(k, errs[k].key, errs[k].vars); });
  }

  function validate() {
    var bad = [];
    function fail(field, key, vars) { showErr(field, key, vars); bad.push(field); }
    var n = now(), d = f.date.value;
    showErr('date'); showErr('service'); showErr('time'); showErr('party'); showErr('name'); showErr('email'); showErr('phone'); showErr('consent');
    if (!d) fail('date', 'e_date');
    else if (d < n.date) fail('date', 'e_past');
    else if (d > addDays(n.date, P.max_giorni || 60)) fail('date', 'e_far', { n: P.max_giorni || 60 });
    else if (!shiftsFor(d).length) fail('date', 'e_closedday');
    else if (dayStatus(d) === 'full') fail('date', 'e_fullday');
    if (!svc) fail('service', 'e_service');
    if (!f.time.value) fail('time', 'e_time');
    else if (d && availability(d, slotsFor(d)).taken.indexOf(mins(f.time.value)) > -1) fail('time', 'e_timefull');
    if (!f.party.value) fail('party', 'e_party');
    if (f.name.value.trim().length < 2) fail('name', 'e_name');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.value.trim())) fail('email', 'e_email');
    if (f.phone.value.replace(/\D/g, '').length < 7) fail('phone', 'e_phone');
    if (!f.consent.checked) fail('consent', 'e_consent');
    return bad;
  }

  // ---- invio ----
  function setStatus(msg, isErr) {
    status.textContent = msg || '';
    status.hidden = !msg;
    status.classList.toggle('bad', !!isErr);
  }
  function lock(on) { sending = on; send.disabled = on; send.setAttribute('aria-busy', on ? 'true' : 'false'); }

  function fmtDate(d) { var s = d.split('-'); return +s[2] + '.' + +s[1] + '.' + s[0]; }
  function drawDone() {
    if (!sent) return;
    $('bk-done-title').textContent = tx('doneTitle');
    $('bk-done-text').textContent = tx('doneText', { email: sent.email });
    var ul = $('bk-sum'); ul.textContent = '';
    [
      ['s_date', fmtDate(sent.date)], ['s_service', sentSvc ? svcName(sentSvc) : tx('none')], ['s_time', sent.time], ['s_party', sent.party],
      ['s_table', sent.table ? (lang() === 'en' ? 'table ' : 'pöytä ') + sent.table : tx('none')], ['s_name', sent.name]
    ].forEach(function (r) {
      var li = document.createElement('li'), b = document.createElement('b');
      b.textContent = tx(r[0]); li.appendChild(b); li.appendChild(document.createTextNode(' ' + r[1])); ul.appendChild(li);
    });
    var demo = $('bk-demo');
    demo.textContent = tx('demo'); demo.hidden = P.modalita !== 'demo';
  }
  function finish() {
    form.hidden = true; done.hidden = false;
    drawDone();
    done.focus();
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (sending) return;
    var bad = validate();
    if (bad.length) { f[bad[0]].focus(); return; }
    var payload = {
      date: f.date.value, service: svc ? SVC[svc].fi : '', time: f.time.value, party: f.party.value, table: table ? table.id : '',
      name: f.name.value.trim(), email: f.email.value.trim(), phone: f.phone.value.trim(),
      notes: f.notes.value.trim(), lang: lang(), consent: true, sent_at: new Date().toISOString()
    };
    sent = payload;
    sentSvc = svc;
    // campo trappola riempito = bot: sembra riuscito, ma non si invia nulla
    if (form.elements.website && form.elements.website.value) { finish(); return; }
    lock(true); setStatus(tx('sending'));
    // fase B: richiesta a Google Apps Script (apps-script/prenotazioni.gs). Testo semplice e chiave del servizio,
    // come si aspetta lo script; la risposta è {ok: true|false}.
    if (P.modalita === 'appscript' && P.endpoint) {
      var richiesta = Object.assign({}, payload, { service: svc, website: '' });
      fetch(P.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(richiesta) })
        .then(function (r) { return r.json(); })
        .then(function (j) { if (!j || j.ok !== true) throw new Error('send'); })
        .then(function () { lock(false); setStatus(''); finish(); })
        .catch(function () { lock(false); setStatus(tx('fail'), true); });
      return;
    }
    if (P.modalita !== 'endpoint' || !P.endpoint) {
      setTimeout(function () { lock(false); setStatus(''); finish(); }, 700);
      return;
    }
    var body = Object.assign({
      access_key: P.access_key || undefined,
      subject: 'Table request: ' + payload.date + ' ' + payload.time + ' (' + payload.party + ')',
      from_name: payload.name, replyto: payload.email
    }, payload);
    fetch(P.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (!r.ok || j.success === false) throw new Error('send'); }); })
      .then(function () { lock(false); setStatus(''); finish(); })
      .catch(function () { lock(false); setStatus(tx('fail'), true); });
  });

  $('bk-again').addEventListener('click', function () {
    form.reset(); errs = {}; sent = null;
    form.hidden = false; done.hidden = true; setStatus('');
    setService(''); sentSvc = ''; setDate(''); fillParty(); fillTimes(); setLimits(); f.date.focus();
  });

  // pranzo o cena: sceglie la fascia di orari; l'errore sparisce e gli orari si ridisegnano
  var svcBtns = [].slice.call(document.querySelectorAll('#bk-service button'));
  function setService(k) {
    svc = k;
    svcBtns.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-s') === k ? 'true' : 'false'); });
    if (k) showErr('service');
    fillTimes();
  }
  svcBtns.forEach(function (b) { b.addEventListener('click', function () { setService(b.getAttribute('data-s')); }); });

  ['time', 'party', 'name', 'email', 'phone', 'consent'].forEach(function (k) {
    f[k].addEventListener('input', function () { if (errs[k]) showErr(k); });
    f[k].addEventListener('change', function () { if (errs[k]) showErr(k); });
  });


  // ---- calendario a comparsa (uguale su telefono e computer) ----
  // Un solo calendario nostro al posto di <input type="date">: mostra giorni chiusi, pieni e quasi pieni,
  // cosa che il selettore del browser non sa fare. Si usa con tocco, mouse e tastiera (frecce, Invio, Esc).
  var calEl = $('bk-cal'), dateBtn = f.date, dateTxt = $('bk-date-text');
  var view = null;   // mese mostrato { y, m (0-11) }
  function loc() { return lang() === 'en' ? 'en-GB' : 'fi-FI'; }
  function utc(y, m, d) { return new Date(Date.UTC(y, m, d, 12)); }
  function iso(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }
  function fmtBtn(d) {
    return new Intl.DateTimeFormat(loc(), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(d + 'T12:00:00Z'));
  }
  function drawDateText() { dateTxt.textContent = dateBtn.value ? fmtBtn(dateBtn.value) : tx('pickBtn'); dateBtn.classList.toggle('empty', !dateBtn.value); }
  function setDate(d) {
    dateBtn.value = d || '';
    drawDateText();
    if (d) showErr('date');
    fillTimes();
  }
  function isOpen() { return !calEl.hidden; }
  // Il calendario si chiude quando la pagina scorre. Lo scorrimento che viene dal focus (mostrare il giorno scelto,
  // le frecce da tastiera) non conta: per quel breve periodo calmScroll() lo ignora.
  var quietUntil = 0, baseY = 0;
  function calmScroll() { quietUntil = Date.now() + 800; }
  function closeCal(focusBtn) {
    if (!isOpen()) return;
    var hadFocus = calEl.contains(document.activeElement);
    calEl.hidden = true; dateBtn.setAttribute('aria-expanded', 'false');
    // se il focus era dentro il calendario, torna sul campo senza far scorrere la pagina
    if (focusBtn || hadFocus) dateBtn.focus({ preventScroll: true });
  }
  function openCal() {
    var base = dateBtn.value || minDate, s = base.split('-');
    view = { y: +s[0], m: +s[1] - 1 };
    drawCal();
    calEl.hidden = false; dateBtn.setAttribute('aria-expanded', 'true');
    var tgt = calEl.querySelector('.d.sel') || calEl.querySelector('.d:not([disabled])');
    calmScroll();
    if (tgt) tgt.focus();
    baseY = window.scrollY;
  }
  function drawCal() {
    var y = view.y, m = view.m, first = new Date(Date.UTC(y, m, 1, 12)), lead = (first.getUTCDay() + 6) % 7;   // lunedi' primo
    var days = new Date(Date.UTC(y, m + 1, 0, 12)).getUTCDate();
    var minM = minDate.split('-'), maxM = maxDate.split('-');
    var canPrev = y * 12 + m > +minM[0] * 12 + (+minM[1] - 1), canNext = y * 12 + m < +maxM[0] * 12 + (+maxM[1] - 1);
    calEl.textContent = '';
    calEl.setAttribute('aria-label', tx('calName'));
    var head = document.createElement('div'); head.className = 'cal-head';
    function nav(cls, label, dir, ok, glyph) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'cal-nav ' + cls; b.disabled = !ok;
      b.setAttribute('aria-label', label); b.textContent = glyph;
      b.addEventListener('click', function () { view.m += dir; if (view.m < 0) { view.m = 11; view.y--; } if (view.m > 11) { view.m = 0; view.y++; } drawCal(); var n = calEl.querySelector('.cal-nav.' + cls); if (n && !n.disabled) { calmScroll(); n.focus(); } });
      return b;
    }
    var title = document.createElement('p'); title.className = 'cal-title'; title.setAttribute('aria-live', 'polite');
    title.textContent = new Intl.DateTimeFormat(loc(), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first);
    var close = document.createElement('button'); close.type = 'button'; close.className = 'cal-x'; close.setAttribute('aria-label', tx('calClose')); close.textContent = '×';
    close.addEventListener('click', function () { closeCal(true); });
    head.appendChild(nav('prev', tx('calPrev'), -1, canPrev, '‹')); head.appendChild(title); head.appendChild(nav('next', tx('calNext'), 1, canNext, '›')); head.appendChild(close);
    calEl.appendChild(head);
    var grid = document.createElement('div'); grid.className = 'cal-grid'; grid.setAttribute('role', 'grid');
    var wd = new Intl.DateTimeFormat(loc(), { weekday: 'short', timeZone: 'UTC' });
    for (var i = 0; i < 7; i++) { var h = document.createElement('span'); h.className = 'cal-wd'; h.setAttribute('aria-hidden', 'true'); h.textContent = wd.format(utc(2024, 0, 1 + i)); grid.appendChild(h); }
    for (i = 0; i < lead; i++) grid.appendChild(document.createElement('span'));
    var long = new Intl.DateTimeFormat(loc(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
    for (var d = 1; d <= days; d++) {
      var date = iso(y, m, d), st = dayStatus(date), b2 = document.createElement('button');
      b2.type = 'button'; b2.className = 'd d-' + st + (date === minDate ? ' today' : '') + (date === dateBtn.value ? ' sel' : '');
      b2.textContent = d; b2.dataset.date = date;
      var ok = st === 'open' || st === 'few';
      b2.disabled = !ok;
      var lab = { open: 'l_open', few: 'l_few', full: 'l_full', closed: 'l_closed' }[st];
      b2.setAttribute('aria-label', long.format(new Date(date + 'T12:00:00Z')) + (lab ? ', ' + tx(lab) : ''));
      if (date === dateBtn.value) b2.setAttribute('aria-pressed', 'true');
      if (ok) b2.addEventListener('click', (function (dd) { return function () { setDate(dd); closeCal(true); }; })(date));
      grid.appendChild(b2);
    }
    calEl.appendChild(grid);
    var leg = document.createElement('ul'); leg.className = 'cal-leg';
    [['open', 'l_open'], ['few', 'l_few'], ['full', 'l_full'], ['closed', 'l_closed']].forEach(function (x) {
      var li = document.createElement('li'), i2 = document.createElement('i'); i2.className = 'k k-' + x[0]; i2.setAttribute('aria-hidden', 'true');
      li.appendChild(i2); li.appendChild(document.createTextNode(' ' + tx(x[1]))); leg.appendChild(li);
    });
    calEl.appendChild(leg);
    var note = document.createElement('p'); note.className = 'cal-note';
    note.textContent = tx('availNote') + ((P.disponibilita || {}).modalita === 'demo' ? ' ' + tx('availDemo') : '');
    calEl.appendChild(note);
  }
  dateBtn.addEventListener('click', function () { if (isOpen()) closeCal(false); else openCal(); });
  // tastiera: frecce tra i giorni selezionabili, Esc chiude
  calEl.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { e.preventDefault(); closeCal(true); return; }
    var cell = document.activeElement;
    if (!cell || !cell.classList.contains('d')) return;
    var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!step) return;
    e.preventDefault();
    var all = [].slice.call(calEl.querySelectorAll('.d')), i = all.indexOf(cell) + step;
    while (i >= 0 && i < all.length && all[i].disabled) i += step;
    if (i >= 0 && i < all.length) { calmScroll(); all[i].focus(); }
  });
  // scorrimento della pagina: il calendario si chiude (dopo il periodo di quiete del focus)
  window.addEventListener('scroll', function () {
    if (!isOpen()) return;
    if (Date.now() < quietUntil) { baseY = window.scrollY; return; }
    if (Math.abs(window.scrollY - baseY) > 24) closeCal(false);
  }, { passive: true });

  // un clic fuori chiude il calendario
  // Il percorso del clic si legge con composedPath(): si calcola al momento del tocco, quindi conserva
  // il calendario anche se il pulsante toccato (freccia del mese) e' stato ridisegnato nel frattempo.
  document.addEventListener('click', function (e) {
    var path = e.composedPath ? e.composedPath() : [];
    if (isOpen() && path.indexOf(calEl) < 0 && path.indexOf(dateBtn) < 0) closeCal(false);
  });

  // scelta del tavolo dalla pianta (plan.js manda questo evento)
  document.addEventListener('kk:table', function (e) { table = e.detail; drawWish(); });

  // cambio lingua: ridisegna testi generati da qui
  [].forEach.call(document.querySelectorAll('.lang button'), function (b) {
    b.addEventListener('click', function () {
      setTimeout(function () { drawDateText(); if (isOpen()) drawCal(); fillParty(); fillTimes(); drawWish(); redrawErrs(); drawDone(); if (status.classList.contains('bad')) setStatus(tx('fail'), true); }, 0);
    });
  });

  setLimits(); drawDateText(); fillParty(); fillTimes();
  // l'ora cambia: se la pagina resta aperta, rinnova data minima e orari ogni minuto
  // ogni minuto: date e orari si aggiornano anche con il calendario aperto (senza togliere il focus a chi lo usa)
  setInterval(function () {
    setLimits(); if (!sending) fillTimes();
    if (isOpen() && !calEl.contains(document.activeElement)) drawCal();
  }, 60000);
})();
