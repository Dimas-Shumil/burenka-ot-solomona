// Показываем шапку при прокрутке к началу страницы.
(function () {
  const header = document.querySelector(".header");
  if (!header) return;

  const menu = header.querySelector(".navigation");
  const minScroll = 6;
  let previousScroll = Math.max(0, window.scrollY);

  function showHeader() {
    header.classList.remove("header--hidden");
  }

  window.addEventListener(
    "scroll",
    function () {
      // Учитываем отскок прокрутки у краёв страницы на телефоне.
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const scroll = Math.max(0, Math.min(window.scrollY, maxScroll));

      if (
        scroll <= header.offsetHeight ||
        menu?.classList.contains("navigation--open") ||
        header.querySelector(":focus-visible")
      ) {
        showHeader();
        previousScroll = scroll;
        return;
      }

      const distance = scroll - previousScroll;
      if (Math.abs(distance) < minScroll) return;

      header.classList.toggle("header--hidden", distance > 0);
      previousScroll = scroll;
    },
    { passive: true },
  );

  // Если пользователь дошёл до шапки клавишей Tab, показываем её.
  header.addEventListener("focusin", showHeader);
  window.addEventListener("pageshow", function () {
    previousScroll = Math.max(0, window.scrollY);
    showHeader();
  });
})();
