// Rotate the emphasized word (USEFUL → CLEAR → INTENTIONAL)
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

// Footer year
document.getElementById('y').textContent = new Date().getFullYear();

// Mobile nav toggle
const menuBtn  = document.querySelector('.menu');
const nav      = document.getElementById('primary-nav');
const closeBtn = document.querySelector('.nav__close');

if (menuBtn && nav) {
  const toggle = (force) => {
    const willOpen = typeof force === 'boolean' ? force : !document.body.classList.contains('nav-open');
    document.body.classList.toggle('nav-open', willOpen);
    menuBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
    if (willOpen) {
      // Focus first link for accessibility
      const firstLink = nav.querySelector('.pill');
      firstLink && firstLink.focus();
    } else {
      menuBtn.focus();
    }
  };

  menuBtn.addEventListener('click', () => toggle());

  // Close with the new button
  if (closeBtn) closeBtn.addEventListener('click', () => toggle(false));

  // Close on ESC
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('nav-open')) toggle(false);
  });

  // Close after choosing a link
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) toggle(false);
  });
}
