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

  // Smooth scroll (optional)
  const lenis = new Lenis({
    smooth: true,
    lerp: 0.08 // damping
  })

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf)
  }
  requestAnimationFrame(raf)

  // GSAP
  gsap.registerPlugin(ScrollTrigger)
  gsap.from(".work-card", {
    y: 60,
    opacity: 0,
    duration: 0.8,
    stagger: 0.15,
    ease: "power3.out",
    scrollTrigger: {
      trigger: "#work",
      start: "top 70%", // when section enters viewport
    }
  })


  gsap.utils.toArray(".reveal-up").forEach(el => {
    gsap.from(el, {
      y: 80,
      opacity: 0,
      duration: 0.6,
      scrollTrigger: {
        trigger: el,
        start: "top 85%"
      }
    })
  })

  
  /* LOAD / INTRO timeline */
  const introTL = gsap.timeline({
    defaults: {
      ease: "power4.inOut"
    }
  });

  introTL
    // lime stroke grows across
    .to(".intro-stroke", {
      width: "100%",
      duration: 0.6
    })

    // overlay slides up & off
    .to("#intro-overlay", {
      yPercent: -100,
      duration: 1
    })

    // finally remove overlay from layout
    .set("#intro-overlay", {
      display: "none"
    })

    // nav links fade-in
    .from(".nav-link", {
      y: -20,
      opacity: 0,
      stagger: 0.1,
      duration: 0.5
    }, "-=0.4") /* overlap 0.4 s with overlay */

    // hero accent bar wipes in
    .from(".hero-accent-bar", {
      scaleX: 0,
      transformOrigin: "left center",
      duration: 0.6
    }, "-=0.3")

    // headline rises
    .from(".hero-content h1", {
      y: 70,
      opacity: 0,
      duration: 0.8
    }, "-=0.4")

    // paragraph + rule
    .from([".hero-copy", ".hero-rule"], {
      y: 40,
      opacity: 0,
      stagger: 0.12,
      duration: 0.6
    }, "-=0.6");