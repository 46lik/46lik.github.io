(function () {
  "use strict";

  var form = document.getElementById("login-form") || document.getElementById("register-form");
  var errorEl = document.getElementById("form-error");
  var submit = document.getElementById("submit");
  if (!form) return;

  function setError(message) {
    if (!errorEl) return;
    errorEl.textContent = message || "";
    if (message) errorEl.classList.add("on"); else errorEl.classList.remove("on");
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    setError("");
    if (submit) submit.disabled = true;

    var data = {};
    Array.prototype.forEach.call(form.querySelectorAll("input"), function (input) {
      if (input.name) data[input.name] = input.value.trim();
    });

    var isRegister = form.id === "register-form";
    function csrf() {
      var m = document.cookie.match(/(?:^|;\s*)no46_csrf=([^;]+)/);
      return m ? decodeURIComponent(m[1]) : "";
    }
    try {
      const response = await fetch(isRegister ? "/api/register" : "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-csrf-token": csrf() },
        credentials: "same-origin",
        body: JSON.stringify(data)
      });
      const result = await response.json().catch(function () { return {}; });
      if (!response.ok || !result.ok) {
        setError(result.error || "Bir şey ters gitti. Sunucu da mı kırık?");
        return;
      }
      window.location.href = "/";
    } catch (error) {
      setError("Sunucuya ulaşılamadı. Kabloyu, Wi-Fi'ı ve kendini kontrol et.");
    } finally {
      if (submit) submit.disabled = false;
    }
  });
})();