/* NO.46 — Giriş ekranı: sekmeler + şifre göster/gizle (CSP uyumlu, harici) */
(function () {
  "use strict";
  var tabs = { giris: document.getElementById("t-giris"), kayit: document.getElementById("t-kayit") };
  var panels = { giris: document.getElementById("p-giris"), kayit: document.getElementById("p-kayit") };
  function show(k) {
    Object.keys(tabs).forEach(function (n) {
      var on = n === k;
      tabs[n].setAttribute("aria-selected", on ? "true" : "false");
      tabs[n].tabIndex = on ? 0 : -1;
      panels[n].hidden = !on;
    });
  }
  Object.keys(tabs).forEach(function (k) {
    if (tabs[k]) tabs[k].addEventListener("click", function () { show(k); });
  });
  document.querySelectorAll("[data-go]").forEach(function (b) {
    b.addEventListener("click", function () { show(b.getAttribute("data-go")); if (tabs[b.getAttribute("data-go")]) tabs[b.getAttribute("data-go")].focus(); });
  });
  var tablist = document.querySelector(".tabs");
  if (tablist) tablist.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      var k = tabs.giris.getAttribute("aria-selected") === "true" ? "kayit" : "giris";
      show(k); tabs[k].focus();
    }
  });
  var pw = document.getElementById("pw"), rv = document.getElementById("reveal");
  if (pw && rv) rv.addEventListener("click", function () {
    var h = pw.type === "password";
    pw.type = h ? "text" : "password";
    rv.textContent = h ? "gizle" : "göster";
    rv.setAttribute("aria-pressed", h ? "true" : "false");
  });
})();