// main.js — menu, photo slots, scroll reveals, forms. No dependencies.
(function () {
  document.documentElement.classList.remove('no-js');

  // Mobile menu
  var toggle = document.querySelector('.menu-toggle');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
        document.body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.focus();
      }
    });
  }

  // Photo slots: <div class="photo" data-img="/images/x.jpg" data-art="/images/art-x.svg">.
  // A real photo wins; otherwise the drawn artwork; otherwise the "209" monogram.
  document.querySelectorAll('.photo[data-img]').forEach(function (el) {
    var src = el.getAttribute('data-img'), art = el.getAttribute('data-art');
    var show = function (u) { el.style.setProperty('--img', 'url("' + new URL(u, location.href).href + '")'); el.classList.add('has-img'); };
    if (art) { show(art); el.classList.add('is-art'); }
    var probe = new Image();
    probe.onload = function () { show(src); el.classList.remove('is-art'); };
    probe.src = src;
  });

  // Reveal on scroll
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  // Footer year
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // Forms -> FormSubmit
  document.querySelectorAll('form[data-form]').forEach(function (form) {
    var status = form.querySelector('.form-status');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var email = (typeof FORM_EMAIL === 'string') ? FORM_EMAIL.trim() : '';
      if (!email) {
        status.className = 'form-status err';
        status.textContent = 'Online forms are almost ready. For now, please call us at (972) 548-2815.';
        return;
      }
      if (form.querySelector('.hp input').value) return; // bot
      var btn = form.querySelector('button[type="submit"]');
      btn.disabled = true; btn.textContent = 'Sending…';
      var data = {};
      new FormData(form).forEach(function (v, k) { if (k !== '_hp') data[k] = v; });
      data._subject = '209 Salon website: ' + form.getAttribute('data-form');
      data._template = 'table';
      fetch('https://formsubmit.co/ajax/' + encodeURIComponent(email), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(data)
      }).then(function (r) {
        if (!r.ok) throw new Error();
        form.reset();
        status.className = 'form-status ok';
        status.textContent = 'Thank you! We received your message and will be in touch soon.';
      }).catch(function () {
        status.className = 'form-status err';
        status.textContent = 'Something went wrong sending that. Please call us at (972) 548-2815.';
      }).finally(function () {
        btn.disabled = false; btn.textContent = btn.getAttribute('data-label');
      });
    });
  });
})();
