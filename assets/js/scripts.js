  const toggleBtn  = document.getElementById('mobileMenuToggle');
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
  document.body.classList.toggle('nav-open');   // toggle the X state
  toggleBtn.classList.toggle('bg-lime-200');    // optional circle fill
});

