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
      start: "top 70%",   // when section enters viewport
    }
  })


gsap.utils.toArray(".reveal-up").forEach(el=>{
  gsap.from(el,{ y:80, opacity:0, duration:0.6,
    scrollTrigger:{ trigger:el, start:"top 85%" }
  })
})

 const tl = gsap.timeline({
    scrollTrigger: {
      trigger: ".bg-hero",   // start when the image section enters
      start: "top 60%",
    }
  });

  tl.from(".hero-accent-bar", {          // bar grows
    scaleX: 0,
    transformOrigin: "left center",
    duration: 0.6,
    ease: "power4.out"
  })
  .from(".hero-content h1", {            // headline slides up
    y: 60,
    opacity: 0,
    duration: 0.8,
    ease: "power3.out"
  }, "-=0.3")
  .from([".hero-copy", ".hero-rule"], { // copy & rule stagger
    y: 40,
    opacity: 0,
    duration: 0.6,
    stagger: 0.15,
    ease: "power3.out"
  }, "-=0.4");
