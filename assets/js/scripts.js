  const toggleBtn = document.getElementById('mobileMenuToggle');
  const mobileMenu = document.getElementById('mobileMenu');

  //   toggleBtn.addEventListener('click', () => {
  //     mobileMenu.classList.toggle('hidden');
  //     // circle fill effect
  //     toggleBtn.classList.toggle('bg-lime-200');
  //     toggleBtn.classList.toggle('border-lime-200');
  //     toggleBtn.classList.toggle('text-[#1A2318]');
  //   });
  toggleBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
    document.body.classList.toggle('nav-open'); // toggle the X state
    toggleBtn.classList.toggle('bg-lime-200'); // optional circle fill
  });


  /* ─────────────────────────────
     0.  SMOOTH SCROLL (Lenis)
  ───────────────────────────────*/
  const lenis = new Lenis({ smooth: true, lerp: 0.08 });
  function raf(t) { lenis.raf(t); requestAnimationFrame(raf); }
  requestAnimationFrame(raf);

  /* ─────────────────────────────
     1.  GSAP & SCROLLTRIGGER
  ───────────────────────────────*/
  gsap.registerPlugin(ScrollTrigger);

  /* ─────────────────────────────
     2.  INTRO OVERLAY LOGIC
  ───────────────────────────────*/
  ScrollTrigger.matchMedia({

    /* 2A ▸ MOBILE (< 768 px)  — hide overlay immediately */
    "(max-width: 767px)": () => {
      gsap.set("#intro-overlay", { display: "none" });
    },

    /* 2B ▸ DESKTOP (≥ 768 px) — full intro timeline */
    "(min-width: 768px)": () => {

      const introTL = gsap.timeline({ defaults: { ease: "power4.inOut" } });

      introTL
        /* lime stroke grows */
        .to(".intro-stroke", { width: "100%", duration: 0.6 })

        /* overlay curtain slides up */
        .to("#intro-overlay", { yPercent: -100, duration: 1 })

        /* remove overlay from DOM flow */
        .set("#intro-overlay", { display: "none" })

        /* nav links fade-in */
        .from(".nav-link", {
          y: -20,
          opacity: 0,
          stagger: 0.1,
          duration: 0.6,
          ease: "power3.out"
        })

        /* hero elements */
        .from(".hero-accent-bar", {
          scaleX: 0,
          transformOrigin: "left center",
          duration: 0.6
        }, "-=0.3")
        .from(".hero-content h1", {
          y: 70,
          opacity: 0,
          duration: 0.8
        }, "-=0.3")
        .from([".hero-copy", ".hero-rule"], {
          y: 40,
          opacity: 0,
          stagger: 0.12,
          duration: 0.6
        }, "-=0.5");
    }

  }); // end matchMedia for intro

  /* ─────────────────────────────
     3.  ABOUT SECTION SCRUB
  ───────────────────────────────*/
  gsap.timeline({
    scrollTrigger: {
      trigger: "#about",
      start: "top 70%",
      end:   "bottom 30%",
      scrub: true,
    }
  })
  .fromTo(".about-img",
          { xPercent: -50, opacity: 0 },
          { xPercent:   0, opacity: 1, ease: "power3.out" }, 0)
  .fromTo(".about-text",
          { xPercent:  50, opacity: 0 },
          { xPercent:   0, opacity: 1, ease: "power3.out" }, 0)
  .to(".about-img",
      { xPercent:  40, opacity: 0, ease: "power3.in" }, 0.5)
  .to(".about-text",
      { xPercent: -40, opacity: 0, ease: "power3.in" }, 0.5);

  /* ─────────────────────────────
     4.  WORK SECTION SCRUB
  ───────────────────────────────*/
  gsap.timeline({
    scrollTrigger: {
      trigger: "#work",
      start: "top 70%",
      end:   "bottom 30%",
      scrub: true,
    }
  })
  .fromTo("#workHeading",
          { yPercent: 100, opacity: 0 },
          { yPercent:   0, opacity: 1, ease: "power3.out" }, 0)
  .to("#workHeading",
       { yPercent: -60, opacity: 0, ease: "power3.in" }, 0.6)
  .fromTo(".work-card",
          { yPercent:  50, opacity: 0 },
          { yPercent:   0, opacity: 1, stagger: 0.15, ease: "power3.out" }, 0.2)
  .to(".work-card",
       { yPercent: -40, opacity: 0, stagger: 0.15, ease: "power3.in" }, 0.7);

