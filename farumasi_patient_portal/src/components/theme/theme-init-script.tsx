/** Runs before paint to avoid light flash when dark mode is active. */
export function ThemeInitScript() {
  const script = `
(function () {
  var NIGHT_START = ${18 * 60 + 30};
  var NIGHT_END = ${5 * 60 + 30};
  function isNight() {
    var d = new Date();
    var m = d.getHours() * 60 + d.getMinutes();
    return m >= NIGHT_START || m < NIGHT_END;
  }
  function shouldDark() {
    try {
      var raw = localStorage.getItem("farumasi-theme");
      var mode = "auto";
      if (raw) {
        var p = JSON.parse(raw);
        mode = (p.state && p.state.mode) || p.mode || "auto";
      }
      if (mode === "dark") return true;
      if (mode === "light") return false;
      return isNight();
    } catch (e) {
      return isNight();
    }
  }
  if (shouldDark()) {
    document.documentElement.classList.add("dark");
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", "#0f172a");
  }
})();
`.trim();

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
