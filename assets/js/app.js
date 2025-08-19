// ==================== Word Rotator ====================
(() => {
  const root = document.querySelector('.rotator');
  if (!root) return;
  const words = Array.from(root.querySelectorAll('.rot'));
  if (!words.length) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HOLD = reduce ? 2200 : 1400;

  let i = 0;
  const tick = () => {
    words.forEach(w => w.classList.remove('is-active'));
    words[i % words.length].classList.add('is-active');
    i++;
    setTimeout(tick, HOLD);
  };
  tick();
})();

// ==================== Footer Year ====================
(() => {
  const y = document.getElementById('y');
  if (y) y.textContent = new Date().getFullYear();
})();

// ==================== Mobile Nav ====================
(() => {
  const menuBtn  = document.querySelector('.menu');
  const nav      = document.getElementById('primary-nav');
  const closeBtn = document.querySelector('.nav__close');
  const main     = document.querySelector('main');
  const header   = document.querySelector('.header');
  const footer   = document.querySelector('footer');

  if (!menuBtn || !nav) return;

  // Link button to nav for a11y
  menuBtn.setAttribute('aria-controls', nav.id);
  menuBtn.setAttribute('aria-expanded', 'false');

  // Scroll lock helpers (fixes iOS overscroll)
  let scrollY = 0;
  const lockScroll = () => {
    scrollY = window.scrollY || document.documentElement.scrollTop;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  };
  const unlockScroll = () => {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, scrollY);
  };

  // Focus trap
  const getFocusable = () =>
    Array.from(
      nav.querySelectorAll(
        'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => !el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'));

  let lastFocused = null;

  const openNav = () => {
    if (document.body.classList.contains('nav-open')) return;
    lastFocused = document.activeElement;

    document.body.classList.add('nav-open');
    menuBtn.setAttribute('aria-expanded', 'true');

    // Dim other regions for screen readers
    main && main.setAttribute('aria-hidden', 'true');
    footer && footer.setAttribute('aria-hidden', 'true');
    // keep header readable (contains the menu button)

    lockScroll();

    // Focus the first focusable in the overlay
    const f = getFocusable();
    (f[0] || nav).focus();
  };

  const closeNav = () => {
    if (!document.body.classList.contains('nav-open')) return;

    document.body.classList.remove('nav-open');
    menuBtn.setAttribute('aria-expanded', 'false');

    main && main.removeAttribute('aria-hidden');
    footer && footer.removeAttribute('aria-hidden');

    unlockScroll();

    // Return focus to the trigger
    (lastFocused || menuBtn).focus();
  };

  const toggle = () => (document.body.classList.contains('nav-open') ? closeNav() : openNav());

  // Events
  menuBtn.addEventListener('click', toggle);
  if (closeBtn) closeBtn.addEventListener('click', closeNav);

  // Close on ESC
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
      e.preventDefault();
      closeNav();
    }
  });

  // Focus trap (Tab cycling)
  nav.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !document.body.classList.contains('nav-open')) return;
    const focusables = getFocusable();
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last  = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  // Close after choosing a link
  nav.addEventListener('click', (e) => {
    const link = e.target.closest('a');
    if (link) closeNav();
  });

  // Defensive: close if viewport grows to desktop (overlay not needed)
  const mq = window.matchMedia('(min-width: 761px)');
  const onMQ = () => { if (mq.matches) closeNav(); };
  if (mq.addEventListener) mq.addEventListener('change', onMQ);
  else mq.addListener(onMQ);
})();
