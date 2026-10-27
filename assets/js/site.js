// Shared behaviour for every page: hide-on-scroll header, desktop Services dropdown, mobile menu,
// back-to-top button and footer year. Page-specific scripts (reveal effects, forms) stay inline.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Header: frosted glass once the page scrolls (is-scrolled); slides away while scrolling down and
  // comes back on any scroll up (is-hidden). It stays in view near the top of the page, while the
  // Services dropdown or the mobile menu is open, and while it holds keyboard focus.
  var header = $('site-header');
  if (header) {
    var headerMenus = [$('sectorsMenu'), $('mobilemenu')].filter(Boolean);
    var lastY = Math.max(window.scrollY, 0), ticking = false;
    var keepHeader = function () {
      if (headerMenus.some(function (m) { return !m.classList.contains('hidden'); })) return true;
      var el = document.activeElement;
      try { return header.contains(el) && el.matches(':focus-visible'); } catch (e) { return false; }
    };
    var updateHeader = function () {
      ticking = false;
      var y = Math.max(window.scrollY, 0); // iOS overscroll can go below 0
      header.classList.toggle('is-scrolled', y > 0);
      if (y < header.offsetHeight || keepHeader()) {
        header.classList.remove('is-hidden');
        lastY = y;
      } else if (Math.abs(y - lastY) > 8) { // ignore small jitters (trackpads, the mobile address bar)
        header.classList.toggle('is-hidden', y > lastY);
        lastY = y;
      }
    };
    updateHeader();
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(updateHeader); }
    }, { passive: true });
    header.addEventListener('focusin', function () { header.classList.remove('is-hidden'); });
  }

  // Desktop Services dropdown: hover (with a short close delay), click, Escape, outside click, focus leaving
  var sectorsBtn = $('sectorsBtn'), sectorsMenu = $('sectorsMenu'), sectorsArrow = $('sectorsArrow');
  var sectorsItem = sectorsBtn ? sectorsBtn.closest('li') : null;
  var sectorsTimer = null;
  function setSectors(open) {
    clearTimeout(sectorsTimer);
    sectorsMenu.classList.toggle('hidden', !open);
    sectorsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (sectorsArrow) sectorsArrow.classList.toggle('rotate-180', open);
  }
  function sectorsOpen() { return !sectorsMenu.classList.contains('hidden'); }
  if (sectorsBtn && sectorsMenu && sectorsItem) {
    if (window.matchMedia('(hover: hover)').matches) {
      sectorsItem.addEventListener('mouseenter', function () { setSectors(true); });
      sectorsItem.addEventListener('mouseleave', function () {
        clearTimeout(sectorsTimer);
        sectorsTimer = setTimeout(function () { setSectors(false); }, 150);
      });
    }
    sectorsBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      setSectors(!sectorsOpen());
    });
    sectorsItem.addEventListener('focusout', function (e) {
      if (sectorsOpen() && e.relatedTarget && !sectorsItem.contains(e.relatedTarget)) setSectors(false);
    });
    document.addEventListener('click', function (e) {
      if (sectorsOpen() && !sectorsItem.contains(e.target)) setSectors(false);
    });
  }

  // Mobile menu. The toggle's icon follows aria-expanded through CSS (bars <-> xmark).
  var navToggle = $('navtoggle'), mobileMenu = $('mobilemenu');
  function setMobile(open) {
    mobileMenu.classList.toggle('hidden', !open);
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function mobileOpen() { return mobileMenu && !mobileMenu.classList.contains('hidden'); }
  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', function () { setMobile(!mobileOpen()); });
    mobileMenu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { setMobile(false); });
    });
    window.addEventListener('resize', function () { if (window.innerWidth >= 1024 && mobileOpen()) setMobile(false); });
  }
  var mBtn = $('mobileSectorsBtn'), mMenu = $('mobileSectorsMenu'), mArrow = $('mobileSectorsArrow');
  if (mBtn && mMenu) {
    mBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = mMenu.classList.contains('hidden');
      mMenu.classList.toggle('hidden', !open);
      mBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (mArrow) mArrow.classList.toggle('rotate-180', open);
    });
  }

  // Escape closes whichever menu is open and returns focus to the button that opened it
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    if (sectorsMenu && sectorsOpen()) {
      var hadFocus = sectorsItem.contains(document.activeElement);
      setSectors(false);
      if (hadFocus) sectorsBtn.focus();
    }
    if (mobileOpen()) {
      var inMenu = mobileMenu.contains(document.activeElement) || document.activeElement === navToggle;
      setMobile(false);
      if (inMenu) navToggle.focus();
    }
  });

  // Back to top
  var toTop = $('backToTop');
  if (toTop) {
    var onScroll = function () { toTop.classList.toggle('show', window.scrollY > 500); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
    });
  }

  // Footer year
  var year = $('footer-year');
  if (year) year.textContent = new Date().getFullYear();
})();
