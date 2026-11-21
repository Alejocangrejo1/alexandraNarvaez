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

// Infographics carousel: 3D coverflow driven by JS (smooth easing, arrows, drag, keys).
(function () {
  var car = document.querySelector('.carousel');
  if (!car) return;
  var track = car.querySelector('.track');
  var slides = Array.prototype.slice.call(track.children);
  var dots = Array.prototype.slice.call(car.querySelectorAll('.dot'));
  var prev = car.querySelector('.prev');
  var next = car.querySelector('.next');
  var count = car.querySelector('.count');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var last = slides.length - 1;

  var pos = 0;      // current (fractional) position shown on screen
  var target = 0;   // slide we are heading to
  var raf = 0, lastT = 0;
  var dragging = false, moved = false, startX = 0, startPos = 0, lastX = 0, lastMoveT = 0, vel = 0;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function step() { return slides[0].offsetWidth * 0.62; }

  function render() {
    var w = slides[0].offsetWidth;
    var active = Math.round(pos);
    slides.forEach(function (el, i) {
      var d = i - pos, a = Math.abs(d), sign = d < 0 ? -1 : 1;
      var x = sign * (a <= 1 ? a * w * 0.62 : w * 0.62 + (a - 1) * w * 0.3);
      var z = -Math.min(a, 3) * 150;
      var rot = -sign * Math.min(a, 1) * 52;   // static 3D layout stays; only the animation is skipped for reduced motion
      var sc = 1 - Math.min(a, 3) * 0.1;
      var op = a <= 1 ? 1 - a * 0.25 : Math.max(0, 0.75 * (3 - a) / 2);
      el.style.transform = 'translate3d(' + x + 'px,0,' + z + 'px) rotateY(' + rot + 'deg) scale(' + sc + ')';
      el.style.opacity = op;
      el.style.zIndex = String(100 - Math.round(a * 10));
      el.style.pointerEvents = a <= 2.4 ? 'auto' : 'none';
      var isActive = i === active;
      if (el.classList.contains('is-active') !== isActive) {
        el.classList.toggle('is-active', isActive);
        el.querySelector('a').tabIndex = isActive ? 0 : -1;
        el.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      }
    });
    dots.forEach(function (dot, n) { dot.setAttribute('aria-current', String(n === active)); });
    prev.disabled = target === 0;
    next.disabled = target === last;
    count.textContent = (active + 1) + ' / ' + slides.length;
  }

  function tick(t) {
    var dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;
    if (!dragging) {
      var diff = target - pos;
      if (Math.abs(diff) < 0.001) { pos = target; render(); raf = 0; return; }
      pos += diff * (1 - Math.exp(-dt * 7));   // smooth ease-out toward the target
    }
    render();
    raf = requestAnimationFrame(tick);
  }
  function run() {
    if (reduce) { pos = target; render(); return; }
    if (!raf) { lastT = performance.now(); raf = requestAnimationFrame(tick); }
  }
  function go(i) { target = clamp(i, 0, last); run(); }

  prev.addEventListener('click', function () { go(target - 1); });
  next.addEventListener('click', function () { go(target + 1); });
  dots.forEach(function (d, n) { d.addEventListener('click', function () { go(n); }); });
  track.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(target + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(target - 1); }
  });

  // Side cards come to the front; the front card opens the full image.
  slides.forEach(function (el, i) {
    el.querySelector('a').addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); return; }
      if (i !== Math.round(pos)) { e.preventDefault(); go(i); }
    });
  });

  // Stop the browser's own link/image drag, which would cancel our gesture.
  track.addEventListener('dragstart', function (e) { e.preventDefault(); });

  // Drag: cards follow the pointer, then glide to the nearest slide.
  track.addEventListener('pointerdown', function (e) {
    dragging = true; moved = false;
    startX = lastX = e.clientX; startPos = pos; vel = 0; lastMoveT = performance.now();
    if (!raf && !reduce) { lastT = performance.now(); raf = requestAnimationFrame(tick); }
  });
  track.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - startX;
    if (Math.abs(dx) > 8) moved = true;
    if (!moved) return;
    var now = performance.now();
    vel = (e.clientX - lastX) / Math.max(16, now - lastMoveT);
    lastX = e.clientX; lastMoveT = now;
    pos = clamp(startPos - dx / step(), -0.3, last + 0.3);
    if (reduce) render();
  });
  function endDrag(e) {
    if (!dragging) return;
    dragging = false;
    if (moved) {
      var fling = clamp(-vel * 120 / step(), -0.5, 0.5);   // a quick flick adds a little, never a whole lap
      target = clamp(Math.round(pos + fling), 0, last);
      if (target === Math.round(startPos) && Math.abs(e.clientX - startX) > 50) {
        target = clamp(target + (e.clientX < startX ? 1 : -1), 0, last);
      }
      run();
    }
    setTimeout(function () { moved = false; }, 0);
  }
  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);

  window.addEventListener('resize', render);
  render();
})();

// Scroll animations: text and cards slide in from the sides as you scroll,
// the decorations drift at different speeds, and a thin bar tracks your progress.
(function () {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // 1) Reveal on scroll (classes are removed again after the animation so hover effects keep working)
  var rules = [
    ['.sec .eyebrow', 'left'],
    ['.sec h2', 'left'],
    ['.gallery-head p', 'up'],
    ['.about .prose, .teacher .prose, .pets-head .prose, #reflection .prose', 'right'],
    ['.music .split > div:first-child .prose', 'up'],
    ['.spotify-card', 'pop'],
    ['.pframe', 'pop'],
    ['.chips li', 'up', 140],
    ['.pet', 'up', 130],
    ['.carousel', 'zoom'],
    ['.cat-stick', 'drop']
  ];
  var all = ['rv', 'in', 'rv-left', 'rv-right', 'rv-up', 'rv-zoom', 'rv-pop', 'rv-drop'];
  var items = [];
  rules.forEach(function (r) {
    document.querySelectorAll(r[0]).forEach(function (el, i) {
      if (el.__rv) return;
      el.__rv = true;
      el.classList.add('rv', 'rv-' + r[1]);
      if (r[2]) el.style.setProperty('--rd', (i % 4) * r[2] + 'ms');
      items.push(el);
    });
  });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        io.unobserve(el);
        requestAnimationFrame(function () { el.classList.add('in'); });
        setTimeout(function () {
          all.forEach(function (c) { el.classList.remove(c); });
          el.style.removeProperty('--rd');
        }, 2000);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { all.forEach(function (c) { el.classList.remove(c); }); });
  }

  // 2) Progress bar + parallax decorations
  var bar = document.createElement('div');
  bar.className = 'progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);
  var decos = Array.prototype.slice.call(document.querySelectorAll('.deco')).map(function (el, i) {
    return { el: el, sec: el.closest('.sec'), k: (i % 2 ? 1 : -1) * (0.05 + (i % 3) * 0.04) };
  });
  var heroArt = document.querySelector('.hero-art');
  var ticking = false;
  function frame() {
    ticking = false;
    var y = window.scrollY, vh = window.innerHeight;
    var max = document.documentElement.scrollHeight - vh;
    bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, y / max) : 0) + ')';
    decos.forEach(function (d) {
      var r = d.sec.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      d.el.style.setProperty('--py', ((r.top + r.height / 2 - vh / 2) * d.k).toFixed(1) + 'px');
    });
    if (heroArt && y < vh * 1.2) heroArt.style.setProperty('--hy', (y * 0.14).toFixed(1) + 'px');
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }, { passive: true });
  window.addEventListener('resize', frame);
  frame();
})();
