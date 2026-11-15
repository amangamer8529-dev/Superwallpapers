
(() => {
  const toggle = document.getElementById("homeMenuToggle");
  const menu = document.getElementById("siteMenu");
  const closeButton = document.getElementById("menuClose");
  const bottomNav = document.getElementById("bottomNav");

  if (!toggle || !menu) return;

  const setActive = (action) => {
    bottomNav?.querySelectorAll("[data-bottom-action]").forEach(button => {
      const active = button.dataset.bottomAction === action;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  };

  const openMenu = () => {
    menu.classList.remove("hidden");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Close navigation menu");
  };

  const closeMenu = () => {
    menu.classList.add("hidden");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Open navigation menu");
  };

  toggle.addEventListener("click", event => {
    event.stopPropagation();

    if (menu.classList.contains("hidden")) {
      openMenu();
    } else {
      closeMenu();
    }
  });

  closeButton?.addEventListener("click", closeMenu);

  menu.querySelectorAll("[data-menu-category]").forEach(button => {
    button.addEventListener("click", () => {
      const category = button.dataset.menuCategory;

      const filter = [...document.querySelectorAll(".category-pill")]
        .find(item => item.dataset.category === category);

      closeMenu();
      setActive("categories");

      if (filter) {
        filter.click();

        document.getElementById("wallpapers")?.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }
    });
  });

  menu.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", closeMenu);
  });

  document.addEventListener("click", event => {
    if (
      !menu.classList.contains("hidden") &&
      !menu.contains(event.target) &&
      !toggle.contains(event.target)
    ) {
      closeMenu();
    }
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeMenu();
    }
  });

  bottomNav?.querySelectorAll("[data-bottom-action]").forEach(button => {
    button.addEventListener("click", event => {
      event.stopPropagation();

      const action = button.dataset.bottomAction;
      setActive(action);

      if (action === "home") {
        closeMenu();

        document.getElementById("explore")?.scrollIntoView({
          behavior: "smooth"
        });
      }

      if (action === "search") {
        closeMenu();

        document.getElementById("wallpapers")?.scrollIntoView({
          behavior: "smooth"
        });

        window.setTimeout(() => {
          document.getElementById("searchInput")?.focus();
        }, 350);
      }

      if (action === "categories") {
        closeMenu();

        document.getElementById("categories")?.scrollIntoView({
          behavior: "smooth",
          block: "center"
        });
      }

      if (action === "saved") {
        closeMenu();

        document.getElementById("favouritesNav")?.click();
      }

      if (action === "menu") {
        if (menu.classList.contains("hidden")) {
          openMenu();
        } else {
          closeMenu();
        }
      }
    });
  });

  document.getElementById("searchInput")?.addEventListener("focus", () => {
    setActive("search");
  });

  document.getElementById("favouritesNav")?.addEventListener("click", () => {
    setActive("saved");
  });

})();
