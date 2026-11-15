(() => {
  "use strict";

  const screenNames = ["home", "browse", "search", "saved"];
  const screens = new Map(screenNames.map(name => [name, document.getElementById(`screen-${name}`)]));
  const menuToggle = document.getElementById("homeMenuToggle");
  const menu = document.getElementById("siteMenu");
  const menuClose = document.getElementById("menuClose");
  const menuBackdrop = document.getElementById("menuBackdrop");
  const bottomNav = document.getElementById("bottomNav");

  function closeMenu() {
    menu?.classList.add("hidden");
    menuBackdrop?.classList.add("hidden");
    menuToggle?.setAttribute("aria-expanded", "false");
    menuToggle?.setAttribute("aria-label", "Open navigation menu");
    document.body.classList.remove("menu-is-open");
  }

  function openMenu() {
    menu?.classList.remove("hidden");
    menuBackdrop?.classList.remove("hidden");
    menuToggle?.setAttribute("aria-expanded", "true");
    menuToggle?.setAttribute("aria-label", "Close navigation menu");
    document.body.classList.add("menu-is-open");
  }

  function setActiveNavigation(screen) {
    document.querySelectorAll("[data-screen-link]").forEach(control => {
      const active = control.dataset.screenLink === screen;
      control.classList.toggle("is-active", active);
      if (active) control.setAttribute("aria-current", "page");
      else control.removeAttribute("aria-current");
    });

    bottomNav?.querySelectorAll("[data-bottom-action]").forEach(button => {
      const active = button.dataset.bottomAction === screen;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function navigate(screen, options = {}) {
    if (!screens.has(screen) || !screens.get(screen)) return;

    screens.forEach((element, name) => {
      const active = name === screen;
      element.classList.toggle("hidden", !active);
      element.setAttribute("aria-hidden", String(!active));
    });

    document.body.dataset.activeScreen = screen;
    setActiveNavigation(screen);
    closeMenu();

    // Clear the legacy app.js favourites-only filter when returning to Search.
    if (screen === "search") {
      document.querySelector('.category-pill[data-category="All"]')?.click();
    }

    if (options.scrollTop !== false) {
      window.scrollTo({ top: 0, behavior: "auto" });
    }

    window.dispatchEvent(new CustomEvent("sw:screenchange", { detail: { screen } }));
  }

  window.SuperwallpapersNavigate = navigate;
  window.addEventListener("sw:navigate", event => navigate(event.detail?.screen || "home"));

  menuToggle?.addEventListener("click", event => {
    event.stopPropagation();
    if (menu?.classList.contains("hidden")) openMenu();
    else closeMenu();
  });
  menuClose?.addEventListener("click", closeMenu);
  menuBackdrop?.addEventListener("click", closeMenu);

  // Delegation also supports buttons inserted after the initial page load.
  document.addEventListener("click", event => {
    const screenControl = event.target.closest("[data-screen-link]");
    if (screenControl) {
      event.preventDefault();
      navigate(screenControl.dataset.screenLink);
      if (screenControl.dataset.screenLink === "search") {
        window.setTimeout(() => document.getElementById("searchInput")?.focus(), 80);
      }
      return;
    }

    const categoryControl = event.target.closest("[data-menu-category]");
    if (categoryControl) {
      const category = categoryControl.dataset.menuCategory;
      navigate("search");
      const categoryButton = [...document.querySelectorAll(".category-pill")]
        .find(button => button.dataset.category === category);
      categoryButton?.click();
      document.getElementById("wallpapers")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  bottomNav?.querySelectorAll("[data-bottom-action]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      const action = button.dataset.bottomAction;
      if (action === "menu") {
        if (menu?.classList.contains("hidden")) openMenu();
        else closeMenu();
        return;
      }
      if (action === "saved") {
        // Let the existing app.js favourites handler update its own gallery state too.
        document.getElementById("favouritesNav")?.click();
      }
      navigate(action);
      if (action === "search") {
        window.setTimeout(() => document.getElementById("searchInput")?.focus(), 80);
      }
    });
  });

  document.getElementById("myFavouritesButton")?.addEventListener("click", () => {
    navigate("saved");
  });

  document.getElementById("mobileSearchToggle")?.addEventListener("click", () => {
    navigate("search");
    window.setTimeout(() => document.getElementById("searchInput")?.focus(), 80);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMenu();
  });

  navigate("home", { scrollTop: false });
})();
