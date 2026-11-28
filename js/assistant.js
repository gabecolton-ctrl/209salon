// assistant.js — "209 Assistant" chat. Answers from ASSISTANT_DATA (built from
// the site's own data). If ASSISTANT_ENDPOINT is set in site-config.js, questions
// go to that server (tools/assistant-worker.js, real AI) and the built-in answers
// become the fallback.
(function () {
  var D = window.ASSISTANT_DATA;
  if (!D) return;

  // Base path of the site, worked out from this script's own address, so links
  // work at the domain root or under a sub-path (e.g. GitHub Pages).
  var me = document.currentScript || document.querySelector('script[src*="assistant.js"]');
  var BASE = me ? me.src.replace(/js\/assistant\.js.*$/, '') : '/';
  var PREVIEW = /\/index\.html$/.test(location.pathname) || location.pathname.slice(-5) === '.html';
  function page(path) { // 'services/' -> absolute URL, spelling out index.html where the site does
    var p = path.replace(/^\//, '');
    if (PREVIEW && (p === '' || /\/$/.test(p.split('#')[0]))) p = p.replace(/(\/?)(#.*)?$/, function (m, sl, h) { return (sl || '') + 'index.html' + (h || ''); });
    return BASE + p;
  }
  var ENDPOINT = (typeof ASSISTANT_ENDPOINT === 'string' && ASSISTANT_ENDPOINT) ? ASSISTANT_ENDPOINT : '';

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9$#\/ ]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  function has(t, words) { return words.some(function (w) { return new RegExp('(^| )' + w + '( |$)').test(t); }); }
  function hasPart(t, parts) { return parts.some(function (w) { return t.indexOf(w) !== -1; }); }

  // ---------------------------------------------------------------- studios
  var ALIASES = { mckinney: ['mckinney', 'mckinny', 'mc kinney', 'virginia'], prosper: ['prosper'], 'legacy-plano': ['legacy', 'plano'], frisco: ['frisco'], melissa: ['melissa'] };
  function studioIn(t) {
    for (var slug in ALIASES) if (hasPart(t, ALIASES[slug])) return studio(slug);
    return null;
  }
  function studio(slug) { return D.studios.filter(function (s) { return s.slug === slug; })[0] || null; }
  function remembered() { try { return studio(localStorage.getItem('209_studio')); } catch (e) { return null; } }
  var ctx = { studio: remembered(), here: null }; // here = studio named in the current question
  function maps(s) { return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('209 Salon, ' + s.street + ', ' + s.city); }

  // ---------------------------------------------------------------- answers
  // Each answer: { text (HTML-safe pieces built here), actions: [{label, href}], chips: [quick replies] }
  var BOOK_ALL = { label: 'Book online', href: page('book/') };
  function bookAction(s) { return s ? { label: 'Book at ' + s.short, href: s.book, ext: true } : BOOK_ALL; }
  var CALL = { label: 'Call ' + D.phone, href: 'tel:' + D.phoneTel };
  function studiosList(fn) { return '<ul>' + D.studios.map(function (s) { return '<li><b>' + esc(s.name) + '</b> — ' + fn(s) + '</li>'; }).join('') + '</ul>'; }
  function faq(qWords) {
    var best = null, bestScore = 0;
    D.faqs.forEach(function (f) {
      var q = norm(f[0]), score = 0;
      qWords.forEach(function (w) { if (w.length > 3 && q.indexOf(w) !== -1) score++; });
      if (score > bestScore) { bestScore = score; best = f; }
    });
    return bestScore >= 2 ? best : null;
  }
  function svc(id) { return D.services.filter(function (x) { return x.id === id; })[0]; }
  function svcList(id, n) { return '<ul>' + svc(id).items.slice(0, n || 99).map(function (i) { return '<li><b>' + esc(i[0]) + '</b> — ' + esc(i[1]) + '</li>'; }).join('') + '</ul>'; }

  var INTENTS = [
    { test: function (t) { return has(t, ['hi', 'hello', 'hey', 'hiya', 'good morning', 'good afternoon', 'good evening']) && t.split(' ').length <= 4; },
      run: function () { return { text: 'Hi! I can help with hours, booking, services, extensions and prices at any of our five studios. What can I help with?', chips: ['Hours', 'Book an appointment', 'Extensions', 'Prices'] }; } },
    { test: function (t) { return has(t, ['thanks', 'thank you', 'thx', 'ty', 'perfect', 'great', 'awesome']) && t.split(' ').length <= 5; },
      run: function () { return { text: 'Anytime! Anything else I can help with?', chips: ['Book an appointment', 'Hours', 'Locations'] }; } },
    { test: function (t) { return has(t, ['gift card', 'gift cards', 'gift certificate', 'voucher']); },
      run: function () { return { text: 'For gift cards, give us a call or stop by any studio and the front desk will set you up.', actions: [CALL] }; } },
    { test: function (t) { return hasPart(t, ['kid', 'child', 'children', 'bring my', 'bring a friend', 'guest']); },
      run: function () { return { text: 'To keep the studio relaxing for everyone, we ask that only guests receiving services join us in the salon. If you have a question about a specific visit, give us a call.', actions: [{ label: 'Salon policies', href: page('policy/') }, CALL] }; } },
    { test: function (t) { return hasPart(t, ['cancel', 'resched', 'late', 'deposit', 'no show', 'noshow', 'policy', 'policies']); },
      run: function () { return { text: 'If you need to cancel or move an appointment, let us know as early as you can — you can reschedule online or by calling. Some longer services, like extensions, may need a deposit, which you’ll see before you confirm a booking.', actions: [{ label: 'Salon policies', href: page('policy/') }, CALL] }; } },
    { test: function (t) { return hasPart(t, ['job', 'hiring', 'career', 'work at', 'work for', 'apply', 'stylist position', 'booth']); },
      run: function () { return { text: 'We’re always looking for passionate stylists, extension artists and front-desk team members. Tell us about yourself on our careers page.', actions: [{ label: 'Careers at 209', href: page('careers/') }] }; } },
    { test: function (t) { return hasPart(t, ['refer', 'referral', 'friend']); },
      run: function () { return { text: 'Refer a friend and you’ll get <b>$10 off</b> your next service, and they’ll get <b>$10 off</b> their first.', actions: [{ label: 'Refer a friend', href: page('refer-a-friend/') }] }; } },
    { test: function (t) { return hasPart(t, ['new client', 'first time', 'first visit', 'discount', 'deal', 'promo', 'coupon', 'special', 'offer', 'never been']); },
      run: function () { return { text: 'Welcome! New clients get <b>15% off</b> their first services at any 209 studio.', actions: [bookAction(ctx.studio)], chips: ['Which studio is closest?', 'Prices'] }; } },
    { test: function (t) { return hasPart(t, ['ccix', 'product', 'shampoo', 'conditioner', 'hairspray', 'spray', 'buy', 'shop', 'store', 'purple shampoo', 'retail']); },
      run: function () { return { text: 'Every 209 studio carries CCIX, our own line of shampoo, conditioner, styling and extensions. Your stylist can recommend what’s right for your hair at your next visit.', actions: [{ label: 'See the CCIX line', href: page('products/') }, bookAction(ctx.studio)] }; } },
    { test: function (t) { return hasPart(t, ['headspa', 'head spa', 'scalp', 'massage']); },
      run: function () { return { text: 'Our headspa is a scalp-focused ritual: a consultation, a deep cleanse, a nourishing treatment and a long, relaxing scalp massage, finished with a blowout. Times and pricing for each studio show when you book.', actions: [{ label: 'About headspa', href: page('headspa/') }, bookAction(ctx.studio)] }; } },
    { test: function (t) { return hasPart(t, ['extension', 'tape in', 'tapein', 'tape-in', 'i tip', 'itip', 'k tip', 'ktip', 'keratin bond', 'hand tied', 'handtied', 'weft', 'sew in', 'sewin', 'beaded', 'length', 'volume', 'move up', 'moveup']); },
      run: function (t) {
        var f = faq(t.split(' '));
        if (f) return { text: esc(f[1]), actions: [{ label: 'Book a free consultation', href: ctx.studio ? ctx.studio.book : page('book/'), ext: !!ctx.studio }], chips: ['Which method is right for me?', 'How much are extensions?'] };
        if (hasPart(t, ['price', 'cost', 'how much', '$'])) return { text: 'Extension pricing depends on the method, how much hair you need and the length, so every extension journey starts with a <b>free consultation</b> where you get a price estimate.', actions: [{ label: 'Book a free consultation', href: ctx.studio ? ctx.studio.book : page('book/'), ext: !!ctx.studio }] };
        return { text: 'We offer five extension methods, all with premium Remy hair matched to you:' + svcList('extensions', 5) + 'Every extension journey starts with a <b>free consultation</b>.', actions: [{ label: 'How extensions work', href: page('extensions/') }, { label: 'Book a consultation', href: ctx.studio ? ctx.studio.book : page('book/'), ext: !!ctx.studio }], chips: ['How long do extensions last?', 'How often is maintenance?'] };
      } },
    { test: function (t) { return hasPart(t, ['price', 'cost', 'how much', 'expensive', 'cheap', 'rate', '$']); },
      run: function () { return { text: 'Prices depend on the service and your stylist’s level, so there’s a fit for every budget. You’ll see the exact price for each stylist when you book online. New clients get 15% off.', actions: [bookAction(ctx.studio), { label: 'Service menu', href: page('services/') }] }; } },
    { test: function (t) { return hasPart(t, ['balayage', 'foilayage', 'highlight', 'foil', 'babylight', 'blonde', 'color', 'colour', 'grey', 'gray', 'root', 'toner', 'gloss', 'lightener', 'bleach', 'dye']); },
      run: function () { return { text: 'Our color menu includes:' + svcList('color', 6) + 'Every color service starts with a consultation.', actions: [{ label: 'Full color menu', href: page('services/#color') }, bookAction(ctx.studio)] }; } },
    { test: function (t) { return hasPart(t, ['keratin', 'brazilian', 'smooth', 'frizz', 'kerastase', 'treatment', 'damage', 'dry hair']); },
      run: function () { return { text: 'For frizz, dryness or damage we offer:' + svcList('treatments') , actions: [{ label: 'Treatments', href: page('services/#treatments') }, bookAction(ctx.studio)] }; } },
    { test: function (t) { return hasPart(t, ['cut', 'trim', 'haircut', 'blowout', 'blow out', 'style', 'beard', 'mens', 'men ', 'bangs', 'fringe']) || has(t, ['men']); },
      run: function () { return { text: 'Cuts and styles:' + svcList('cuts') + 'Every cut includes a relaxing scalp massage, shampoo and a finished blowout.', actions: [{ label: 'Cuts & styles', href: page('services/#cuts') }, bookAction(ctx.studio)] }; } },
    { test: function (t) { return hasPart(t, ['where', 'address', 'located', 'location', 'direction', 'near', 'close to', 'closest', 'parking', 'map', 'studio']); },
      run: function () {
        if (ctx.here) return { text: '<b>209 ' + esc(ctx.here.name) + '</b><br>' + esc(ctx.here.street) + '<br>' + esc(ctx.here.city), actions: [{ label: 'Directions', href: maps(ctx.here), ext: true }, bookAction(ctx.here)], chips: ['Hours', 'Other studios'] };
        return { text: 'We have five studios:' + studiosList(function (s) { return esc(s.street + ', ' + s.city); }) + 'Which one is closest to you?', chips: D.studios.map(function (s) { return s.short; }) };
      } },
    { test: function (t) { return hasPart(t, ['hour', 'open', 'what time', 'today', 'tomorrow', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'weekend']) || has(t, ['close', 'closes', 'closing']); },
      run: function () {
        if (ctx.here) return { text: '<b>209 ' + esc(ctx.here.name) + '</b> is usually open <b>' + esc(ctx.here.hours || 'by appointment') + '</b>. For a specific day, the booking page shows that day’s exact openings.', actions: [bookAction(ctx.here), CALL], chips: ['Other studios’ hours'] };
        return { text: 'Our studios are usually open:' + studiosList(function (s) { return esc(s.hours || 'by appointment'); }) + 'For a specific day, the booking page shows exact openings.', actions: [BOOK_ALL, CALL] };
      } },
    { test: function (t) { return hasPart(t, ['book', 'appointment', 'schedule', 'availability', 'available', 'reserve', 'consult']); },
      run: function () {
        if (ctx.studio) return { text: 'You can book at <b>209 ' + esc(ctx.studio.name) + '</b> online — you’ll see each stylist’s openings and exact prices.', actions: [bookAction(ctx.studio), CALL], chips: ['A different studio'] };
        return { text: 'Which studio would you like to book at?', chips: D.studios.map(function (s) { return 'Book ' + s.short; }) };
      } },
    { test: function (t) { return hasPart(t, ['phone', 'call', 'talk to', 'speak', 'human', 'person', 'someone', 'contact', 'email', 'text']); },
      run: function () { return { text: 'You can reach every studio at <b>' + esc(D.phone) + '</b>, or send an appointment request and we’ll get back to you.', actions: [CALL, { label: 'Appointment request', href: page('appointment-request/') }] }; } },
    { test: function (t) { return hasPart(t, ['team', 'stylist', 'who', 'staff']); },
      run: function () { return { text: 'Each studio has stylists at different levels and specialties. When you book online you can see every stylist, their openings and their prices. Not sure who to pick? Call and we’ll match you.', actions: [bookAction(ctx.studio), CALL] }; } }
  ];

  function answer(raw) {
    var t = norm(raw);
    var s = studioIn(t);
    ctx.here = s;
    if (s) {
      ctx.studio = s;
      if (t.replace(/book|at|the|in|studio|salon|209/g, '').trim().length <= s.short.length + 2 || /^book /.test(t)) {
        // Just a studio name (or "Book X"): answer with that studio's card.
        return { text: '<b>209 ' + esc(s.name) + '</b><br>' + esc(s.street) + '<br>' + esc(s.city) + '<br>Open ' + esc(s.hours || 'call for hours'), actions: [bookAction(s), { label: 'Directions', href: maps(s), ext: true }], chips: ['Services', 'Prices', 'New client offer'] };
      }
    }
    if (/other studio|different studio|other studios hours|all studios/.test(t)) { ctx.studio = null; }
    if (/^services$/.test(t)) return { text: 'We offer cuts and styles, color, treatments, extensions and headspa. What are you thinking about?', chips: ['Balayage', 'Extensions', 'Keratin treatment', 'Haircut'] };
    for (var i = 0; i < INTENTS.length; i++) if (INTENTS[i].test(t)) return INTENTS[i].run(t);
    var f = faq(t.split(' '));
    if (f) return { text: esc(f[1]) };
    return { text: 'I’m not sure about that one, but the team can help. You can call any studio at <b>' + esc(D.phone) + '</b>.', actions: [CALL, BOOK_ALL], chips: ['Hours', 'Locations', 'Prices', 'Extensions'] };
  }

  // ---------------------------------------------------------------- UI
  var root = document.createElement('div');
  root.className = 'asst';
  root.innerHTML =
    '<button class="asst-fab" type="button" aria-expanded="false" aria-controls="asst-panel"><span class="asst-fab-dot"></span><span class="asst-fab-label">Ask 209</span></button>' +
    '<section class="asst-panel" id="asst-panel" role="dialog" aria-label="209 Assistant" hidden>' +
      '<header class="asst-head"><div><b>209 Assistant</b><span>Hours, booking, services &amp; more</span></div><button class="asst-x" type="button" aria-label="Close">×</button></header>' +
      '<div class="asst-log" role="log" aria-live="polite"></div>' +
      '<form class="asst-form"><input type="text" placeholder="Ask about hours, extensions, prices…" aria-label="Your question" autocomplete="off" maxlength="300"><button type="submit" aria-label="Send">↑</button></form>' +
    '</section>';
  document.body.appendChild(root);
  var fab = root.querySelector('.asst-fab'), panel = root.querySelector('.asst-panel');
  var log = root.querySelector('.asst-log'), form = root.querySelector('.asst-form'), input = form.querySelector('input');
  var history = [], started = false;

  function bubble(who, html) {
    var d = document.createElement('div'); d.className = 'asst-msg ' + who; d.innerHTML = html; log.appendChild(d);
    log.scrollTop = log.scrollHeight; return d;
  }
  function render(a) {
    var html = '<div class="asst-text">' + a.text + '</div>';
    if (a.actions && a.actions.length) html += '<div class="asst-actions">' + a.actions.map(function (x, i) {
      return '<a class="asst-act' + (i === 0 ? ' primary' : '') + '" href="' + esc(x.href) + '"' + (x.ext ? ' target="_blank" rel="noopener"' : '') + '>' + esc(x.label) + '</a>';
    }).join('') + '</div>';
    var b = bubble('bot', html);
    if (a.chips && a.chips.length) {
      var c = document.createElement('div'); c.className = 'asst-chips';
      a.chips.forEach(function (label) { var btn = document.createElement('button'); btn.type = 'button'; btn.textContent = label; btn.onclick = function () { c.remove(); ask(label); }; c.appendChild(btn); });
      log.appendChild(c); log.scrollTop = log.scrollHeight;
    }
    return b;
  }
  function typing() { return bubble('bot typing', '<span></span><span></span><span></span>'); }
  function ask(q) {
    q = String(q || '').trim(); if (!q) return;
    log.querySelectorAll('.asst-chips').forEach(function (c) { c.remove(); });
    bubble('me', esc(q));
    history.push({ role: 'user', content: q });
    var t = typing();
    var local = answer(q);
    var done = function (a) { t.remove(); render(a); history.push({ role: 'assistant', content: a.text.replace(/<[^>]+>/g, ' ') }); };
    if (!ENDPOINT) { setTimeout(function () { done(local); }, 450 + Math.min(700, q.length * 12)); return; }
    fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: history.slice(-12), studio: ctx.studio && ctx.studio.slug }) })
      .then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (j) {
        // Live AI writes plain text; keep the built-in action buttons for the same question.
        done({ text: esc(j.reply || '').replace(/\n/g, '<br>'), actions: local.actions, chips: local.chips });
      })
      .catch(function () { done(local); });
  }
  function open() {
    panel.hidden = false; root.classList.add('open'); fab.setAttribute('aria-expanded', 'true');
    if (!started) {
      started = true;
      var hi = ctx.studio ? 'Hi! Welcome to 209 ' + esc(ctx.studio.name) + '. ' : 'Hi! ';
      render({ text: hi + 'I can help with hours, booking, services, extensions and prices. What can I help with?', chips: ['Hours', 'Book an appointment', 'Extensions', 'New client offer'] });
    }
    setTimeout(function () { input.focus({ preventScroll: true }); }, 50);
  }
  function close() { panel.hidden = true; root.classList.remove('open'); fab.setAttribute('aria-expanded', 'false'); fab.focus(); }
  fab.addEventListener('click', function () { panel.hidden ? open() : close(); });
  root.querySelector('.asst-x').addEventListener('click', close);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) close(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); var q = input.value; input.value = ''; ask(q); });

  window.Assistant209 = { open: open, ask: function (q) { open(); ask(q); }, answer: answer };
})();
