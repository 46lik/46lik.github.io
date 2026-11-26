/* NO.46 — Giriş / zorunlu şifre değiştirme (CSP uyumlu, harici) */
(function () {
  "use strict";

  var form = document.getElementById("login-form") || document.getElementById("register-form");
  var errorEl = document.getElementById("form-error");
  var submit = document.getElementById("submit");
  var sifreForm = document.getElementById("sifre-form");
  var sifreError = document.getElementById("sifre-error");
  var sifreSubmit = document.getElementById("sifre-submit");
  var eskiInput = document.getElementById("eski");
  var yeniInput = document.getElementById("yeni");
  var tekrarInput = document.getElementById("tekrar");
  if (!form && !sifreForm) return;

  function setError(message) {
    if (!errorEl) return;
    errorEl.textContent = message || "";
    if (message) errorEl.classList.add("on"); else errorEl.classList.remove("on");
  }

  function setSifreError(message) {
    if (!sifreError) return;
    sifreError.textContent = message || "";
  }

  function csrfToken() {
    var m = document.cookie ? document.cookie.split("; ").filter(function (r) { return r.indexOf("no46_csrf=") === 0; })[0] : null;
    if (!m) return "";
    return decodeURIComponent(m.split("=")[1] || "");
  }

  function showForcedPasswordChange() {
    var pg = document.getElementById("p-giris");
    var pk = document.getElementById("p-kayit");
    var ps = document.getElementById("p-sifre");
    if (pg) pg.hidden = true;
    if (pk) pk.hidden = true;
    if (ps) ps.hidden = false;
    var tab = document.getElementById("t-giris");
    if (tab) tab.setAttribute("aria-selected", "true");
  }

  function showNormalLogin() {
    var pg = document.getElementById("p-giris");
    var pk = document.getElementById("p-kayit");
    var ps = document.getElementById("p-sifre");
    if (pg) pg.hidden = false;
    if (pk) pk.hidden = false;
    if (ps) ps.hidden = true;
    var tab = document.getElementById("t-giris");
    if (tab) tab.setAttribute("aria-selected", "true");
  }

  async function handleLogin(event) {
    event.preventDefault();
    setError("");
    if (submit) submit.disabled = true;

    var data = {};
    Array.prototype.forEach.call(form.querySelectorAll("input"), function (input) {
      if (input.name) data[input.name] = input.value.trim();
    });

    var isRegister = form.id === "register-form";
    try {
      var response = await fetch(isRegister ? "/api/register" : "/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        credentials: "include",
        body: JSON.stringify(data)
      });
      var result = await response.json().catch(function () { return {}; });
      if (!response.ok || !result.ok) {
        setError(result.error || "Bir şey ters gitti. Sunucu da mı kırık?");
        return;
      }
      // Token'ı kaydet (cross-origin için)
      if (window.NO46_API && result.token) {
        window.NO46_API.setToken(result.token);
      }
      // Sınırlanan kullanıcı: zorunlu şifre değiştirme ekranına git
      if (result.must_change) {
        showForcedPasswordChange();
        if (yeniInput) {
          yeniInput.focus();
        }
        return;
      }
      window.location.href = "/";
    } catch (error) {
      setError("Sunucuya ulaşılamadı. Kabloyu, Wi-Fi'ı ve kendini kontrol et.");
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  async function handleSifre(event) {
    event.preventDefault();
    setSifreError("");
    if (sifreSubmit) sifreSubmit.disabled = true;

    var eski = eskiInput ? eskiInput.value : "";
    var yeni = yeniInput ? yeniInput.value : "";
    var tekrar = tekrarInput ? tekrarInput.value : "";

    if (!eski || !yeni) {
      setSifreError("Eski ve yeni şifre gerekli.");
      return;
    }
    if (yeni.length < 6) {
      setSifreError("Yeni şifre en az 6 karakter olmalı.");
      return;
    }
    if (yeni !== tekrar) {
      setSifreError("Yeni şifreler eşleşmiyor.");
      return;
    }

    try {
      var response = await fetch("/api/sifre-degistir", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "x-csrf-token": csrfToken()
        },
        credentials: "include",
        body: JSON.stringify({ eski: eski, yeni: yeni })
      });
      var result = await response.json().catch(function () { return {}; });
      if (!response.ok || !result.ok) {
        setSifreError(result.error || "Şifre değiştirilemedi.");
        return;
      }
      // Yeni token al (oturumlar kapanıp yenilenir)
      if (window.NO46_API && result.token) {
        window.NO46_API.setToken(result.token);
      }
      window.location.href = "/";
    } catch (error) {
      setSifreError("Sunucuya ulaşılamadı. Tekrar dene.");
    } finally {
      if (sifreSubmit) sifreSubmit.disabled = false;
    }
  }

  if (form) {
    form.addEventListener("submit", handleLogin);
  }
  if (sifreForm) {
    sifreForm.addEventListener("submit", handleSifre);
  }

  window.NO46_AUTH_FORCED_CHANGE = function () {
    showForcedPasswordChange();
  };
})();
