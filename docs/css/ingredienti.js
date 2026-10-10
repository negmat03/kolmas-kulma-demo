// Piatti con disegno (passo C): ogni ingrediente e' un interruttore. Acceso = il suo strato resta pieno e gli altri si attenuano.
// Accendendone piu' d'uno, il piatto si riempie di quelli scelti. Quando sono tutti accesi il panino torna normale
// e la selezione si svuota. Solo opacity (vedi taps.css). Dito, mouse e tastiera: sono pulsanti con aria-pressed.
// Nel markup gli ingredienti sono <span class="ing" data-k>: senza JavaScript restano testo, qui diventano pulsanti.
(function () {
  [].forEach.call(document.querySelectorAll('.dish.art'), function (dish) {
    [].forEach.call(dish.querySelectorAll('span.ing[data-k]'), function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ing';
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('data-k', s.getAttribute('data-k'));
      b.setAttribute('data-fi', s.getAttribute('data-fi'));
      b.setAttribute('data-en', s.getAttribute('data-en'));
      b.textContent = s.textContent;   // lang.js può averlo già cambiato in inglese: si copia il testo attuale
      s.parentNode.replaceChild(b, s);
    });
    var chips = [].slice.call(dish.querySelectorAll('button.ing'));
    // mostra la selezione attuale: gli strati degli ingredienti scelti restano pieni, gli altri si attenuano
    function paint() {
      var on = chips.filter(function (c) { return c.getAttribute('aria-pressed') === 'true'; });
      // panino completo (piu' di un ingrediente, tutti scelti): torna normale e la selezione si svuota
      if (chips.length > 1 && on.length === chips.length) {
        chips.forEach(function (c) { c.setAttribute('aria-pressed', 'false'); });
        on = [];
      }
      [].forEach.call(dish.querySelectorAll('.lyr.lit'), function (l) { l.classList.remove('lit'); });
      on.forEach(function (c) {
        [].forEach.call(dish.querySelectorAll('.lyr.k-' + c.getAttribute('data-k')), function (l) { l.classList.add('lit'); });
      });
      dish.classList.add('poured');   // se il piatto non era ancora comparso, il disegno si compone prima
      dish.classList.toggle('hl', on.length > 0);
    }
    chips.forEach(function (b) {
      b.addEventListener('click', function () {
        b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
        paint();
      });
    });
  });
})();
