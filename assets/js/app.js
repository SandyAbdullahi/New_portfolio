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
