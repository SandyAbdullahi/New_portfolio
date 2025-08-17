// assets/js/showcase-tabs.js
const tablist = document.querySelector('[data-tablist]');
if (tablist) {
  const tabs   = Array.from(tablist.querySelectorAll('[role="tab"]'));
  const panels = tabs.map(t => document.getElementById(t.getAttribute('aria-controls')));
  const bar    = document.getElementById('showcase-bar');
  const status = document.getElementById('showcase-status');

  const setActive = (idx, focus = false) => {
    tabs.forEach((t,i) => {
      const sel = i === idx;
      t.setAttribute('aria-selected', sel);
      t.classList.toggle('bg-white', sel);
      t.classList.toggle('border-[var(--green)]', sel);
      panels[i].hidden = !sel;
      if (sel && focus) t.focus();
    });
    // progress
    const pct = ((idx + 1) / tabs.length) * 100;
    if (bar)    bar.style.width = `${pct}%`;
    if (status) status.textContent = `Step ${idx + 1} of ${tabs.length}`;
  };

  // click
  tabs.forEach((t, i) => t.addEventListener('click', () => setActive(i)));

  // keyboard (Left/Right/Home/End)
  tablist.addEventListener('keydown', (e) => {
    const i = tabs.findIndex(t => t.getAttribute('aria-selected') === 'true');
    if (e.key === 'ArrowRight') { e.preventDefault(); setActive((i+1) % tabs.length, true); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); setActive((i-1+tabs.length) % tabs.length, true); }
    if (e.key === 'Home')       { e.preventDefault(); setActive(0, true); }
    if (e.key === 'End')        { e.preventDefault(); setActive(tabs.length-1, true); }
  });

  // deep-link support (?step=design)
  const params = new URLSearchParams(location.search);
  const stepId = params.get('step');
  const idx = stepId ? tabs.findIndex(t => t.id === `tab-${stepId}`) : 0;
  setActive(idx >= 0 ? idx : 0);
}
