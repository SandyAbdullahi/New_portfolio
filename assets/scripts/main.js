// /assets/scripts/main.js — v3.5
// Mobile drawer: safe focus handoff + inert + backdrop (no ARIA warnings)
// Keeps: theme/grid toggles, reveal, marquee, parallax, mini-header progress,
//        smooth anchors, work view toggle, hover tilt, fake form submit.

(() => {
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ===========================
   * Motion prefs (live)
   * =========================== */
  const mqReduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let prefersReduced = mqReduced.matches;
  mqReduced.addEventListener?.('change', e => { prefersReduced = e.matches; });

  const html = document.documentElement;
  const body = document.body;

  /* ===========================
   * Theme toggle (persisted)
   * =========================== */
  const THEME_KEY = 'site-theme';
  const setTheme = m => { html.setAttribute('data-theme', m); localStorage.setItem(THEME_KEY, m); };
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'color' || savedTheme === 'bw') setTheme(savedTheme);

  const themeBtns   = $$('[data-theme-toggle]');
  const themeStates = $$('[data-theme-state]');
  const renderThemeUI = () => {
    const mode = html.getAttribute('data-theme') || 'bw';
    themeBtns.forEach(b => b.setAttribute('aria-pressed', mode === 'color' ? 'true' : 'false'));
    themeStates.forEach(s => (s.textContent = mode === 'color' ? 'Color' : 'BW'));
  };
  renderThemeUI();
  themeBtns.forEach(btn => btn.addEventListener('click', () => {
    const cur = html.getAttribute('data-theme') || 'bw';
    setTheme(cur === 'bw' ? 'color' : 'bw');
    renderThemeUI();
  }));

  /* ===========================
   * Year stamp
   * =========================== */
  $$('[data-year]').forEach(el => (el.textContent = String(new Date().getFullYear())));

  /* ===========================
   * Grid overlay toggle
   * =========================== */
  const gridOverlay = $('[data-grid-overlay]');
  const gridBtns    = $$('[data-grid-toggle]');
  const gridStates  = $$('[data-grid-state]');
  gridBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const on = gridOverlay.classList.toggle('is-on');
      gridBtns.forEach(b => b.setAttribute('aria-pressed', on ? 'true' : 'false'));
      gridStates.forEach(s => (s.textContent = on ? 'on' : 'off'));
    });
  });

  /* ===========================
   * Smooth anchor scroll w/ header offset
   * =========================== */
  const header  = $('.site-header');
  let headerH   = header ? header.offsetHeight : 0;
  if (header && 'ResizeObserver' in window) new ResizeObserver(() => { headerH = header.offsetHeight; }).observe(header);

  $$('a[href^="#"][data-navlink]').forEach(link => {
    link.addEventListener('click', e => {
      const id = link.getAttribute('href').slice(1);
      const target = document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      closeMobileMenu(); // in case we came from the drawer
      const y = Math.max(0, target.getBoundingClientRect().top + window.pageYOffset - (headerH + 8));
      window.scrollTo({ top: y, behavior: prefersReduced ? 'auto' : 'smooth' });
      target.setAttribute('tabindex','-1');
      target.focus({ preventScroll: true });
      const cleanup = () => { target.removeAttribute('tabindex'); target.removeEventListener('blur', cleanup); };
      target.addEventListener('blur', cleanup);
    });
  });

  /* ===========================
   * Marquee auto-fill (ensure 2x width)
   * =========================== */
  $$('[data-marquee]').forEach(section => {
    const track = section.querySelector('.ticker__track');
    if (!track) return;
    const fill = () => {
      const minWidth = section.offsetWidth * 2;
      if (track.scrollWidth >= minWidth) return;
      const base = track.innerHTML;
      let i = 0;
      while (track.scrollWidth < minWidth && i < 4) {
        track.insertAdjacentHTML('beforeend', base);
        i++;
      }
    };
    fill();
    window.addEventListener('resize', fill, { passive: true });
  });

  /* ===========================
   * Reveal + optional SVG stroke draw
   * =========================== */
  const anySvgShapes = !!document.querySelector('svg path, svg line, svg rect, svg circle, svg polyline, svg polygon');
  function prepSvgStrokes(scope = document){
    scope.querySelectorAll('svg path, svg line, svg rect, svg circle, svg polyline, svg polygon')
      .forEach(el => { try {
        const L = typeof el.getTotalLength === 'function' ? el.getTotalLength() : null;
        if (!L || !isFinite(L)) return;
        el.style.strokeDasharray = L;
        el.style.strokeDashoffset = L;
        el.style.transition = 'none';
      } catch {} });
  }
  function animateSvgStrokes(scope = document){
    scope.querySelectorAll('svg path, svg line, svg rect, svg circle, svg polyline, svg polygon')
      .forEach(el => {
        if (!el.style.strokeDasharray || el.style.strokeDasharray === 'none') return;
        el.style.transition = 'stroke-dashoffset 900ms cubic-bezier(.22,.72,0,.99)';
        requestAnimationFrame(() => { void el.getBoundingClientRect(); el.style.strokeDashoffset = '0'; });
      });
  }
  if (anySvgShapes) prepSvgStrokes(document);

  const revealTargets = $$('[data-reveal]');
  if (revealTargets.length){
    if (!prefersReduced && 'IntersectionObserver' in window){
      const io = new IntersectionObserver((entries, ob) => {
        entries.forEach(entry => {
          if (entry.isIntersecting){
            entry.target.classList.add('is-inview');
            if (anySvgShapes) animateSvgStrokes(entry.target);
            ob.unobserve(entry.target);
          }
        });
      }, { root:null, rootMargin:'0px 0px -10% 0px', threshold:0.1 });
      revealTargets.forEach(el => io.observe(el));
    } else {
      revealTargets.forEach(el => el.classList.add('is-inview'));
      if (anySvgShapes) animateSvgStrokes(document);
    }
  }

  /* ===========================
   * Mini-header (appear on scroll) + progress bar
   * =========================== */
  const mini = $('[data-mini-header]');
  if (mini && 'IntersectionObserver' in window){
    const sentinel = document.createElement('div');
    sentinel.style.position = 'absolute';
    sentinel.style.top = '40vh';
    sentinel.style.width = '1px';
    sentinel.style.height = '1px';
    sentinel.setAttribute('aria-hidden', 'true');
    document.body.prepend(sentinel);

    const ioMini = new IntersectionObserver((entries) => {
      const e = entries[0];
      const show = e.intersectionRatio === 0;
      mini.classList.toggle('is-visible', show);
      mini.setAttribute('aria-hidden', show ? 'false' : 'true');
    }, { threshold: [0, 1] });
    ioMini.observe(sentinel);
  }

  const progressBar = $('[data-scroll-progress]');
  if (progressBar){
    let tick = false;
    const update = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, Math.max(0, (window.pageYOffset || h.scrollTop) / max)) : 0;
      progressBar.style.transform = `scaleX(${p})`;
      tick = false;
    };
    const onScroll = () => { if (!tick && !prefersReduced) { tick = true; requestAnimationFrame(update); } };
    update();
    window.addEventListener('scroll', onScroll, { passive:true });
    window.addEventListener('resize', onScroll, { passive:true });
  }

  /* ===========================
   * Parallax (gentle, rAF)
   * =========================== */
  const parallaxEls = $$('[data-parallax]');
  let ticking = false;
  const isSmall = () => window.matchMedia('(max-width: 900px)').matches;
  function updateParallax(){
    if (prefersReduced) return;
    const viewH = window.innerHeight || document.documentElement.clientHeight;
    const base = isSmall() ? 0.05 : 0.1;
    parallaxEls.forEach(el => {
      const speed = parseFloat(el.dataset.speed || String(base));
      const r = el.getBoundingClientRect();
      const y = ((r.top + r.height/2) - viewH/2) * -speed;
      el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
    });
    ticking = false;
  }
  function onScrollOrResize(){
    if (ticking || prefersReduced || parallaxEls.length === 0) return;
    ticking = true; window.requestAnimationFrame(updateParallax);
  }
  if (parallaxEls.length){
    updateParallax();
    window.addEventListener('scroll', onScrollOrResize, { passive:true });
    window.addEventListener('resize', onScrollOrResize, { passive:true });
  }

  /* ===========================
   * Work view toggle (Showcase/Grid)
   * =========================== */
  const work = $('#work');
  const btnShowcase = $('[data-view-btn="showcase"]');
  const btnGrid     = $('[data-view-btn="grid"]');
  const VIEW_KEY = 'work-view';

  function ensureProjectGrid(mode){
    if (!work) return;
    let list = work.querySelector('.project-list');
    const projects = Array.from(work.querySelectorAll('.project'));
    if (mode === 'grid'){
      if (!list){
        list = document.createElement('div');
        list.className = 'project-list';
        projects.forEach(p => list.appendChild(p));
        work.appendChild(list);
      }
    } else if (list){
      projects.forEach(p => work.insertBefore(p, list));
      list.remove();
    }
  }
  function setView(mode){
    if (!work) return;
    work.setAttribute('data-view', mode);
    btnShowcase?.setAttribute('aria-pressed', String(mode === 'showcase'));
    btnGrid?.setAttribute('aria-pressed', String(mode === 'grid'));
    localStorage.setItem(VIEW_KEY, mode);
    ensureProjectGrid(mode);
  }
  if (btnShowcase && btnGrid && work){
    const stored = localStorage.getItem(VIEW_KEY);
    setView(stored === 'grid' ? 'grid' : 'showcase');
    btnShowcase.addEventListener('click', () => setView('showcase'));
    btnGrid.addEventListener('click', () => setView('grid'));
  }

  /* ===========================
   * Hover tilt on capable devices
   * =========================== */
  const canHover = window.matchMedia('(hover: hover)').matches;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const tiltEls  = $$('[data-tilt]');
  if (tiltEls.length && canHover && !hasTouch && !prefersReduced){
    tiltEls.forEach(el => {
      let raf = 0;
      const maxTilt = 6, maxScale = 1.02;
      const img = el.querySelector('.project__img');
      const rect = { w: 0, h: 0, l: 0, t: 0 };
      const readRect = () => { const r = el.getBoundingClientRect(); rect.w=r.width; rect.h=r.height; rect.l=r.left; rect.t=r.top; };
      readRect();
      window.addEventListener('resize', readRect, { passive: true });
      const onMove = (e) => {
        const x = e.clientX - rect.l, y = e.clientY - rect.t;
        const px = (x / rect.w) * 2 - 1, py = (y / rect.h) * 2 - 1;
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          const rx = (py * -maxTilt).toFixed(2), ry = (px *  maxTilt).toFixed(2);
          el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
          if (img){ img.style.transform = `scale(${maxScale})`; img.style.filter = 'grayscale(0.9) contrast(1.08)'; }
        });
      };
      const onLeave = () => {
        if (raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          el.style.transform = 'perspective(800px) rotateX(0) rotateY(0)';
          if (img){ img.style.transform = 'scale(1)'; img.style.filter = ''; }
        });
      };
      el.addEventListener('mouseenter', readRect);
      el.addEventListener('mousemove', onMove);
      el.addEventListener('mouseleave', onLeave);
    });
  }

  /* ===========================
   * Mobile drawer (overlay + backdrop)
   * =========================== */
  const menuToggles  = $$('[data-menu-toggle]');
  const drawer       = $('#mobile-menu');
  const backdrop     = $('[data-menu-backdrop]');
  const inertTargets = [ $('main'), $('.site-footer'), $('[data-mini-header]') ].filter(Boolean);
  const TRANSITION_MS = 320;
  let lastActive = null;

  // Initial safe state
  if (drawer) {
    drawer.hidden = true;
    drawer.setAttribute('aria-hidden', 'true');
    drawer.setAttribute('inert', '');
  }
  if (backdrop) {
    backdrop.hidden = true;              // start genuinely hidden
    backdrop.classList.remove('is-open');
  }
  const setInert = on => inertTargets.forEach(el => on ? el.setAttribute('inert','') : el.removeAttribute('inert'));

  function trapFocus(e){
    if (!drawer || drawer.getAttribute('aria-hidden') === 'true') return;
    const focusables = drawer.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.key === 'Tab'){
      if (e.shiftKey && document.activeElement === first){ last.focus(); e.preventDefault(); }
      else if (!e.shiftKey && document.activeElement === last){ first.focus(); e.preventDefault(); }
    } else if (e.key === 'Escape'){ closeMobileMenu(); }
  }

  function openMobileMenu(){
    if (!drawer) return;
    lastActive = document.activeElement;

    // Backdrop: show then fade in
    if (backdrop){
      backdrop.hidden = false;
      requestAnimationFrame(() => backdrop.classList.add('is-open'));
    }

    // Drawer visible + focusable
    drawer.hidden = false;
    drawer.removeAttribute('inert');
    drawer.setAttribute('aria-hidden','false');
    menuToggles.forEach(b => b.setAttribute('aria-expanded','true'));
    body.classList.add('nav-open');
    setInert(true);

    // Focus after state change to avoid aria-hidden warning
    requestAnimationFrame(() => {
      const f = drawer.querySelector('a,button,[tabindex]:not([tabindex="-1"])');
      (f || drawer).focus();
    });

    document.addEventListener('keydown', trapFocus);
  }

  function closeMobileMenu(){
    if (!drawer) return;

    const fallback   = menuToggles[0] || document.body;
    const focusAfter = (lastActive && document.contains(lastActive)) ? lastActive : fallback;

    // Move focus OUT before we hide the drawer (prevents ARIA warning)
    if (drawer.contains(document.activeElement)) {
      focusAfter.focus({ preventScroll: true });
    }

    // Backdrop: fade out then truly hide
    if (backdrop){
      backdrop.classList.remove('is-open');
      setTimeout(() => { backdrop.hidden = true; }, TRANSITION_MS);
    }

    // Drawer close + inert
    drawer.setAttribute('inert','');
    drawer.setAttribute('aria-hidden','true');
    menuToggles.forEach(b => b.setAttribute('aria-expanded','false'));
    body.classList.remove('nav-open');
    setInert(false);
    document.removeEventListener('keydown', trapFocus);

    // Fully hide after transition
    setTimeout(() => {
      if (drawer.getAttribute('aria-hidden') === 'true') drawer.hidden = true;
      if (!document.activeElement || document.activeElement === document.body) {
        focusAfter?.focus?.();
      }
    }, TRANSITION_MS);
  }

  menuToggles.forEach(btn => btn.addEventListener('click', () => {
    const willOpen = drawer?.getAttribute('aria-hidden') === 'true';
    willOpen ? openMobileMenu() : closeMobileMenu();
  }));
  backdrop?.addEventListener('click', closeMobileMenu);

  // Close when tapping any menu link or the X button
  drawer?.addEventListener('click', (e) => {
    const t = e.target;
    if (t.closest('.mobile-menu__link') || t.closest('.mobile-menu__close')) closeMobileMenu();
  });

  /* ===========================
   * Form micro-interaction
   * =========================== */
  const form = $('[data-form]');
  if (form){
    form.addEventListener('submit', e => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const original = btn ? btn.textContent : null;
      if (btn){
        btn.textContent = 'Sent ✓'; btn.disabled = true;
        setTimeout(() => { btn.textContent = original || 'Send'; btn.disabled = false; }, 1800);
      }
    });
  }
})();
