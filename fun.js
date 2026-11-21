// Fun lab: extra motion just for fun.
//  - section labels "decode" when they appear
//  - the first screen reacts to the mouse (spotlight + layered parallax)
//  - cards tilt in 3D with a moving shine, buttons are slightly magnetic
//  - a little bat chases the cursor with spring physics
//  - the scrolling ribbon speeds up while you scroll
//  - hidden: click the spinning badge (or type the Konami code) for a sticker rain
(function () {
  'use strict';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var NS = 'http://www.w3.org/2000/svg';

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // ---------- 1. Labels decode when they scroll into view ----------
  var GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  function decode(el) {
    var finalText = el.textContent;
    var n = finalText.length;
    var t0 = performance.now();
    (function step(t) {
      var p = clamp((t - t0) / 850, 0, 1);
      var out = '';
      for (var i = 0; i < n; i++) {
        var ch = finalText.charAt(i);
        out += (ch === ' ' || p > i / n) ? ch : GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
      }
      el.textContent = p >= 1 ? finalText : out;
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  var labels = document.querySelectorAll('.sec .eyebrow, .gallery-head .eyebrow');
  if ('IntersectionObserver' in window && labels.length) {
    var lo = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        lo.unobserve(e.target);
        decode(e.target);
      });
    }, { threshold: 0.8 });
    labels.forEach(function (l) { lo.observe(l); });
  }

  // ---------- 2. Hero: spotlight + layered parallax ----------
  var mouse = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  var parts = [];
  var DEPTH = { 'wave-k': 16, badge: 34, c1: 26, c2: 26, s1: 40, s2: 40, s3: 36, h1: 34, h2: 34, st1: 30, st2: 30 };
  var heroArt = document.querySelector('.hero-art');
  var heroSeen = true;
  if (heroArt && fine) {
    heroArt.querySelectorAll('.wave-k, .badge, .art').forEach(function (el) {
      var d = 14;
      Object.keys(DEPTH).forEach(function (k) { if (el.classList.contains(k)) d = DEPTH[k]; });
      parts.push({ el: el, d: d });
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { heroSeen = es[0].isIntersecting; }).observe(heroArt);
    }
  }
  if (fine) {
    document.querySelectorAll('.hero, .page-hero').forEach(function (hero) {
      hero.addEventListener('pointermove', function (e) {
        var r = hero.getBoundingClientRect();
        hero.style.setProperty('--sx', (e.clientX - r.left) + 'px');
        hero.style.setProperty('--sy', (e.clientY - r.top) + 'px');
      });
      hero.addEventListener('pointerleave', function () {
        hero.style.setProperty('--sx', '-300px');
        hero.style.setProperty('--sy', '-300px');
      });
    });
    window.addEventListener('mousemove', function (e) {
      mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
    }, { passive: true });
  }

  // ---------- 3. Tilting cards with a moving shine ----------
  if (fine) {
    document.querySelectorAll('.pet figure, .stat, .doc-card, .spotify-card').forEach(function (el) {
      el.classList.add('tilt');
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.transform = 'perspective(800px) rotateX(' + ((0.5 - py) * 12).toFixed(2) + 'deg) rotateY(' + ((px - 0.5) * 14).toFixed(2) + 'deg) translateY(-4px)';
        el.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
        el.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      });
      el.addEventListener('pointerleave', function () { el.style.transform = ''; });
    });

    // ---------- 4. Slightly magnetic buttons ----------
    document.querySelectorAll('.btn, .car-btn').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) * 0.22;
        var dy = (e.clientY - (r.top + r.height / 2)) * 0.3;
        b.style.translate = dx.toFixed(1) + 'px ' + dy.toFixed(1) + 'px';
      });
      b.addEventListener('pointerleave', function () { b.style.translate = ''; });
    });
  }

  // ---------- 5. A little bat that chases the cursor ----------
  var bat = null, bx = 0, by = 0, tx = 0, ty = 0, batOn = false;
  if (fine) {
    bat = document.createElementNS(NS, 'svg');
    bat.setAttribute('class', 'sidekick');
    bat.setAttribute('aria-hidden', 'true');
    var use = document.createElementNS(NS, 'use');
    use.setAttribute('href', '#bat');
    bat.appendChild(use);
    document.body.appendChild(bat);
    window.addEventListener('mousemove', function (e) {
      tx = e.clientX + 30; ty = e.clientY + 22;
      if (!batOn) { batOn = true; bx = tx; by = ty; bat.style.opacity = '1'; }
    }, { passive: true });
    document.documentElement.addEventListener('mouseleave', function () { batOn = false; bat.style.opacity = '0'; });
  }

  // ---------- 6. Ribbon speeds up while you scroll ----------
  var track = document.querySelector('.ribbon-track');
  var ranim = track && track.getAnimations ? track.getAnimations()[0] : null;
  var lastY = window.scrollY, vel = 0, rate = 1;
  window.addEventListener('scroll', function () {
    vel = Math.abs(window.scrollY - lastY);
    lastY = window.scrollY;
  }, { passive: true });

  // ---------- one animation loop for everything that follows the mouse ----------
  var last = performance.now();
  function loop(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (parts.length && heroSeen) {
      var k = 1 - Math.exp(-dt * 6);
      cur.x += (mouse.x - cur.x) * k;
      cur.y += (mouse.y - cur.y) * k;
      parts.forEach(function (p) {
        p.el.style.translate = (-cur.x * p.d).toFixed(1) + 'px ' + (-cur.y * p.d).toFixed(1) + 'px';
      });
    }
    if (bat && batOn) {
      var kb = 1 - Math.exp(-dt * 5);
      var ox = bx;
      bx += (tx - bx) * kb;
      by += (ty - by) * kb;
      var tilt = clamp((bx - ox) * 3, -35, 35);
      bat.style.transform = 'translate(' + bx.toFixed(1) + 'px,' + by.toFixed(1) + 'px) rotate(' + tilt.toFixed(1) + 'deg)';
    }
    if (ranim) {
      var target = 1 + Math.min(9, vel * 0.4);
      rate += (target - rate) * (1 - Math.exp(-dt * 4));
      ranim.playbackRate = rate;
      vel *= 0.85;
      if (vel < 0.2) vel = 0;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // ---------- 7. Hidden sticker rain ----------
  var SRC = ['bunny.gif', 'penguin.gif', 'puppy.gif', 'kuromi-dance.gif', 'cat.gif', 'dachshund-sticker.png', 'kuromi-wave.png', 'dachshund.gif'];
  function rain() {
    if (document.querySelector('.rain')) return;
    var box = document.createElement('div');
    box.className = 'rain';
    box.setAttribute('aria-hidden', 'true');
    document.body.appendChild(box);
    var W = window.innerWidth, H = window.innerHeight, items = [];
    for (var i = 0; i < 30; i++) {
      var im = document.createElement('img');
      im.src = 'images/' + SRC[i % SRC.length];
      im.alt = '';
      var s = 64 + Math.random() * 64;
      im.style.width = s + 'px';
      box.appendChild(im);
      items.push({ el: im, s: s, x: Math.random() * (W - s), y: -s - Math.random() * H * 0.9,
                   vx: (Math.random() - 0.5) * 3, vy: Math.random() * 2, r: Math.random() * 40 - 20, vr: (Math.random() - 0.5) * 6 });
    }
    var t0 = performance.now(), prev = t0;
    (function step(now) {
      var f = Math.min(0.033, (now - prev) / 1000) * 60;
      prev = now;
      items.forEach(function (o) {
        o.vy += 0.45 * f; o.x += o.vx * f; o.y += o.vy * f; o.r += o.vr * f;
        if (o.y > H - o.s) { o.y = H - o.s; o.vy *= -0.55; o.vx *= 0.9; o.vr *= 0.8; if (Math.abs(o.vy) < 1.2) o.vy = 0; }
        if (o.x < 0 || o.x > W - o.s) { o.vx *= -1; o.x = clamp(o.x, 0, W - o.s); }
        o.el.style.transform = 'translate(' + o.x.toFixed(1) + 'px,' + o.y.toFixed(1) + 'px) rotate(' + o.r.toFixed(1) + 'deg)';
      });
      if (now - t0 < 7000) { requestAnimationFrame(step); }
      else { box.classList.add('out'); setTimeout(function () { box.remove(); }, 700); }
    })(t0);
  }
  document.querySelectorAll('.badge').forEach(function (b) { b.addEventListener('click', rain); });
  var KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'], pos = 0;
  window.addEventListener('keydown', function (e) {
    var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    pos = key === KONAMI[pos] ? pos + 1 : (key === KONAMI[0] ? 1 : 0);
    if (pos === KONAMI.length) { pos = 0; rain(); }
  });
})();
