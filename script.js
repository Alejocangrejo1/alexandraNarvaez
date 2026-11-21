// "About Me" dropdown: opens on click/tap and keyboard; CSS also opens it on hover.
(function () {
  var dd = document.querySelector('.dd');
  if (!dd) return;
  var btn = dd.querySelector('.dd-btn');

  function setOpen(open) {
    dd.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
  }

  btn.addEventListener('click', function () {
    setOpen(!dd.classList.contains('open'));
  });
  document.addEventListener('click', function (e) {
    if (!dd.contains(e.target)) setOpen(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { setOpen(false); btn.focus(); }
  });
  dd.querySelectorAll('.dd-menu a').forEach(function (a) {
    a.addEventListener('click', function () { setOpen(false); });
  });
})();

// Infographics carousel: 3D coverflow with buttons, dots, arrow keys, drag and swipe.
(function () {
  var car = document.querySelector('.carousel');
  if (!car) return;
  var track = car.querySelector('.track');
  var slides = Array.prototype.slice.call(track.children);
  var dots = Array.prototype.slice.call(car.querySelectorAll('.dot'));
  var prev = car.querySelector('.prev');
  var next = car.querySelector('.next');
  var count = car.querySelector('.count');
  var index = 0;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function layout() {
    var w = slides[0].offsetWidth;
    slides.forEach(function (el, i) {
      var d = i - index, a = Math.abs(d), sign = d < 0 ? -1 : 1;
      var visible = a <= 2;
      var x = d === 0 ? 0 : sign * (w * 0.62 + (a - 1) * w * 0.3);
      var z = -a * 150;
      var rot = reduce ? 0 : -sign * Math.min(a, 1) * 52;
      var sc = 1 - Math.min(a, 3) * 0.1;
      el.style.transform = 'translateX(' + x + 'px) translateZ(' + z + 'px) rotateY(' + rot + 'deg) scale(' + sc + ')';
      el.style.opacity = visible ? (d === 0 ? 1 : 0.75 - (a - 1) * 0.3) : 0;
      el.style.filter = d === 0 ? 'none' : 'brightness(.92) saturate(.9)';
      el.style.zIndex = String(10 - a);
      el.style.pointerEvents = visible ? 'auto' : 'none';
      el.classList.toggle('is-active', d === 0);
      var link = el.querySelector('a');
      link.tabIndex = d === 0 ? 0 : -1;
      el.setAttribute('aria-hidden', d === 0 ? 'false' : 'true');
    });
    dots.forEach(function (dot, n) { dot.setAttribute('aria-current', String(n === index)); });
    prev.disabled = index === 0;
    next.disabled = index === slides.length - 1;
    count.textContent = (index + 1) + ' / ' + slides.length;
  }
  function go(i) {
    index = Math.max(0, Math.min(slides.length - 1, i));
    layout();
  }

  prev.addEventListener('click', function () { go(index - 1); });
  next.addEventListener('click', function () { go(index + 1); });
  dots.forEach(function (d, n) { d.addEventListener('click', function () { go(n); }); });
  track.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
  });

  // Side cards come to the front on click; the front card opens the full image.
  slides.forEach(function (el, i) {
    el.querySelector('a').addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); return; }
      if (i !== index) { e.preventDefault(); go(i); }
    });
  });

  // Drag / swipe
  var startX = 0, dragging = false, moved = false;
  track.addEventListener('pointerdown', function (e) {
    dragging = true; moved = false; startX = e.clientX;
  });
  track.addEventListener('pointermove', function (e) {
    if (dragging && Math.abs(e.clientX - startX) > 12) moved = true;
  });
  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    var dx = e.clientX - startX;
    if (Math.abs(dx) > 50) go(index + (dx < 0 ? 1 : -1));
    setTimeout(function () { moved = false; }, 0);
  }
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', function () { dragging = false; moved = false; });

  window.addEventListener('resize', layout);
  layout();
})();
