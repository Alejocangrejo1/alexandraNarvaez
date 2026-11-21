// Background music: an instrumental that is always on, with a small volume control in the corner.
//  - there is no play/pause button: to turn it off you mute it, to turn it on you raise the volume
//  - the volume and the position in the song are remembered while you move between the pages
//  - browsers only allow sound after the first tap/click/key, so it starts on that first interaction
//  - it ducks (goes silent) while the Álvaro Díaz video has its own sound on
(function () {
  'use strict';

  var SRC = 'media/reina-pepiada-instrumental.mp3';
  var KEY = 'ale-music';
  var DEFAULT_VOL = 0.3;

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  var saved = load();
  var vol = typeof saved.v === 'number' ? clamp(saved.v, 0, 1) : DEFAULT_VOL;   // chosen volume, 0 = muted
  var lastLoud = saved.l > 0 ? saved.l : DEFAULT_VOL;
  var ducked = false;
  var started = false;
  var wasPlaying = false;

  // ---------------------------------------------------------------- audio
  var audio = new Audio();
  audio.src = SRC;
  audio.loop = true;
  audio.preload = 'auto';
  audio.volume = 0;
  window.__aleMusic = audio;
  // It loops forever; if a browser ever ignores `loop`, start it again by hand when it ends.
  audio.addEventListener('ended', function () {
    audio.currentTime = 0;
    audio.play().catch(function () {});
  });

  audio.addEventListener('loadedmetadata', function () {
    var t = Number(saved.t) || 0;
    if (saved.playing && saved.at) t += Math.min(8, Math.max(0, (Date.now() - saved.at) / 1000));   // the page change took a moment
    if (audio.duration && t > 0 && t < audio.duration - 1) { try { audio.currentTime = t; } catch (e) {} }
  });

  var rampTimer = 0;
  function rampTo(target, ms) {
    clearInterval(rampTimer);
    var from = audio.volume, t0 = Date.now();
    rampTimer = setInterval(function () {
      var p = clamp((Date.now() - t0) / ms, 0, 1);
      audio.volume = clamp(from + (target - from) * p, 0, 1);
      if (p >= 1) clearInterval(rampTimer);
    }, 40);
  }
  function targetVolume() { return ducked ? 0 : vol; }

  // ---------------------------------------------------------------- the corner widget
  var NS = 'http://www.w3.org/2000/svg';
  var root = document.createElement('div');
  root.className = 'mp';
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', 'Background music');
  root.innerHTML =
    '<button class="mp-disc" type="button" aria-expanded="false" aria-label="Music controls">' +
      '<span class="mp-vinyl"><i></i></span>' +
      '<svg class="mp-note n1" aria-hidden="true"><use href="#note"/></svg>' +
      '<svg class="mp-note n2" aria-hidden="true"><use href="#note"/></svg>' +
      '<svg class="mp-note n3" aria-hidden="true"><use href="#heart"/></svg>' +
    '</button>' +
    '<div class="mp-panel">' +
      '<span class="mp-title">Reina Pepiada · instrumental</span>' +
      '<div class="mp-row">' +
        '<button class="mp-mute" type="button" aria-label="Mute the music">' +
          '<svg class="ic-off" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3z" fill="currentColor"/><path d="M16 9.500l5 5M21 9.500l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
          '<svg class="ic-on" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9H3z" fill="currentColor"/><path d="M15.500 9a4 4 0 0 1 0 6M18 6.500a8 8 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
        '</button>' +
        '<input class="mp-range" type="range" min="0" max="100" step="1" aria-label="Music volume">' +
      '</div>' +
    '</div>' +
    '<span class="mp-hint" aria-hidden="true">Tap anywhere to start the music ♪</span>';
  document.body.appendChild(root);

  var disc = root.querySelector('.mp-disc');
  var muteBtn = root.querySelector('.mp-mute');
  var range = root.querySelector('.mp-range');

  function sync() {
    var audible = started && vol > 0 && !ducked;
    root.classList.toggle('playing', audible);
    root.classList.toggle('muted', vol === 0);
    root.classList.toggle('waiting', !started);
    range.value = Math.round(vol * 100);
    range.style.setProperty('--fill', range.value + '%');
    muteBtn.setAttribute('aria-label', vol > 0 ? 'Mute the music' : 'Turn the music on');
  }

  function persist() {
    save({ v: vol, l: lastLoud, t: audio.currentTime || 0, at: Date.now(), playing: started && !audio.paused });
  }

  // ---------------------------------------------------------------- starting (autoplay rules)
  function tryStart() {
    var p = audio.play();
    if (p && p.then) {
      p.then(function () {
        started = true;
        wasPlaying = true;
        rampTo(targetVolume(), 1800);
        removeGestureListeners();
        sync();
      }).catch(function () { started = false; sync(); });
    } else {
      started = true; sync();
    }
  }
  var gestureEvents = ['pointerdown', 'keydown', 'touchstart'];
  function onGesture() { if (!started) tryStart(); }
  function removeGestureListeners() { gestureEvents.forEach(function (ev) { window.removeEventListener(ev, onGesture, true); }); }
  gestureEvents.forEach(function (ev) { window.addEventListener(ev, onGesture, true); });
  tryStart();   // works straight away if the browser already allows sound for this site

  // ---------------------------------------------------------------- controls
  muteBtn.addEventListener('click', function () {
    if (vol > 0) { lastLoud = vol; vol = 0; } else { vol = lastLoud || DEFAULT_VOL; }
    rampTo(targetVolume(), 350);
    sync(); persist();
  });
  range.addEventListener('input', function () {
    vol = Number(range.value) / 100;
    if (vol > 0) lastLoud = vol;
    audio.volume = targetVolume();
    sync();
  });
  range.addEventListener('change', persist);

  // The round disc opens the controls (hover also opens them with a mouse).
  disc.addEventListener('click', function (e) {
    e.stopPropagation();
    var open = !root.classList.contains('open');
    root.classList.toggle('open', open);
    disc.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', function (e) {
    if (!root.contains(e.target)) { root.classList.remove('open'); disc.setAttribute('aria-expanded', 'false'); }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { root.classList.remove('open'); disc.setAttribute('aria-expanded', 'false'); }
  });

  // ---------------------------------------------------------------- polite behaviour
  // 1) Keep quiet while the Álvaro Díaz video has its own sound on.
  var video = document.querySelector('.phone video');
  if (video) {
    video.addEventListener('volumechange', function () {
      var loud = !video.muted && video.volume > 0;
      if (loud !== ducked) { ducked = loud; rampTo(targetVolume(), 600); sync(); }
    });
  }
  // 2) Pause while the tab is hidden, pick up again when it comes back.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      wasPlaying = started && !audio.paused;
      persist();
      audio.pause();
    } else if (wasPlaying) {
      audio.play().then(function () { rampTo(targetVolume(), 800); }).catch(function () {});
    }
  });
  // 3) Remember where we are, so the next page continues from the same moment.
  var lastSave = 0;
  audio.addEventListener('timeupdate', function () {
    var now = Date.now();
    if (now - lastSave > 1000) { lastSave = now; persist(); }
  });
  window.addEventListener('pagehide', persist);

  sync();
})();
