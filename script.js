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

// Infographics carousel: native swipe/scroll, buttons, dots, arrow keys.
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

  function go(i) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    track.scrollTo({ left: slides[i].offsetLeft - track.offsetLeft, behavior: 'smooth' });
  }
  function update() {
    var w = track.clientWidth;
    index = Math.round(track.scrollLeft / (slides[0].offsetWidth + 20)) || 0;
    index = Math.max(0, Math.min(slides.length - 1, index));
    dots.forEach(function (d, n) { d.setAttribute('aria-current', String(n === index)); });
    prev.disabled = index === 0;
    next.disabled = index === slides.length - 1;
    count.textContent = (index + 1) + ' / ' + slides.length;
  }

  prev.addEventListener('click', function () { go(index - 1); });
  next.addEventListener('click', function () { go(index + 1); });
  dots.forEach(function (d, n) { d.addEventListener('click', function () { go(n); }); });
  track.addEventListener('scroll', function () { window.requestAnimationFrame(update); }, { passive: true });
  track.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
  });
  window.addEventListener('resize', update);
  update();
})();
