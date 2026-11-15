(() => {
  const toggle = document.getElementById('homeMenuToggle');
  const menu = document.getElementById('siteMenu');
  const closeButton = document.getElementById('menuClose');
  if (!toggle || !menu) return;

  const closeMenu = () => {
    menu.classList.add('hidden');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open navigation menu');
  };

  const openMenu = () => {
    menu.classList.remove('hidden');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close navigation menu');
  };

  toggle.addEventListener('click', (event) => {
    event.stopPropagation();
    if (menu.classList.contains('hidden')) openMenu();
    else closeMenu();
  });

  closeButton?.addEventListener('click', closeMenu);

  menu.querySelectorAll('[data-menu-category]').forEach((button) => {
    button.addEventListener('click', () => {
      const category = button.dataset.menuCategory;
      const existingFilter = document.querySelector(`.category-pill[data-category="${category}"]`);
      closeMenu();
      if (existingFilter) {
        existingFilter.click();
        document.getElementById('wallpapers')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  menu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => closeMenu());
  });

  document.getElementById('menuFavourites')?.addEventListener('click', (event) => {
    event.preventDefault();
    closeMenu();
    document.getElementById('favouritesNav')?.click();
  });

  document.addEventListener('click', (event) => {
    if (!menu.classList.contains('hidden') && !menu.contains(event.target) && !toggle.contains(event.target)) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
})();
