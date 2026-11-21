/* Apply a stored theme before first paint. External so the CSP stays script-src 'self'. */
(function () {
  try {
    var stored = localStorage.getItem("theme");
    if (stored === "light" || stored === "dark") {
      document.documentElement.setAttribute("data-theme", stored);
    }
  } catch (error) {
    /* Storage can be blocked. The OS preference still applies through CSS. */
  }
})();
