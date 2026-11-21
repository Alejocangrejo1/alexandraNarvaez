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
