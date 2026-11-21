// Background music: an instrumental that is always on, soft, with a small volume control in the corner.
//  - there is no play/pause button: to turn it off you mute it, to turn it on you raise the volume
//  - it tries to start the moment the page opens
//  - browsers refuse SOUND until the visitor does something (tap, click, key press), so until then a small
//    "Tap anywhere to start the music" bubble shows, and the song starts on the FIRST interaction that the
//    browser accepts. Every click / tap / key / scroll retries until it really plays.
//  - the volume and the position in the song are remembered while you move between the pages
//  - it ducks (goes silent) while the Álvaro Díaz video has its own sound on
(function () {
  'use strict';

  var SRC = 'media/reina-pepiada-instrumental.mp3';
  var KEY = 'ale-music-v3';
  var DEFAULT_VOL = 0.034;    // 3.4%: a whisper of background
  var FADE_IN_MS = 2000;

  // sessionStorage: every new visit starts at the default again, but moving between pages keeps your choice
  function load() { try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save(o) { try { sessionStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  var saved = load();
  var vol = typeof saved.v === 'number' ? clamp(saved.v, 0, 1) : DEFAULT_VOL;   // chosen volume, 0 = muted
  var lastLoud = saved.l > 0 ? saved.l : DEFAULT_VOL;
  var ducked = false;
  var started = false;        // the song is really playing now
  var wasPlaying = false;

  // ---------------------------------------------------------------- audio
  var audio = new Audio();
  audio.preload = 'auto';
  audio.loop = true;
  audio.volume = 0;
  audio.src = SRC;
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
    root.classList.toggle('playing', started && vol > 0 && !ducked);
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
  var trying = false;
  var gestureEvents = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'click', 'touchstart', 'touchend', 'keydown', 'wheel', 'scroll'];

  function removeGestureListeners() {
    gestureEvents.forEach(function (ev) { window.removeEventListener(ev, attempt, true); });
  }

  // Ask the browser to play. It only says yes after a real interaction (or if the site is already trusted).
  function attempt() {
    if (started || trying) return;
    trying = true;
    audio.muted = false;
    var p;
    try { p = audio.play(); } catch (e) { trying = false; return; }
    if (p && p.then) {
      p.then(function () {
        trying = false;
        started = true;
        wasPlaying = true;
        removeGestureListeners();
        rampTo(targetVolume(), FADE_IN_MS);
        sync();
      }, function () {
        trying = false;       // not allowed yet: stay on the hint and try again on the next interaction
        sync();
      });
    } else {
      trying = false; started = true; removeGestureListeners(); rampTo(targetVolume(), FADE_IN_MS); sync();
    }
  }

  // every interaction retries; the first one the browser accepts starts the song
  gestureEvents.forEach(function (ev) { window.addEventListener(ev, attempt, { capture: true, passive: true }); });
  attempt();   // and try right now (works when the browser already trusts the site)

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
      audio.play().then(function () { rampTo(targetVolume(), 800); }).catch(function () { started = false; sync(); });
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
