  const toggleBtn  = document.getElementById('mobileMenuToggle');
  const mobileMenu = document.getElementById('mobileMenu');

  toggleBtn.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
    // circle fill effect
    toggleBtn.classList.toggle('bg-lime-200');
    toggleBtn.classList.toggle('border-lime-200');
    toggleBtn.classList.toggle('text-[#1A2318]');
  });