/* =========================================================
   Kurbağa Felsefesi — oturum, giriş ekranı ve puan
   ========================================================= */

(function () {
  "use strict";

  var USERS_KEY = "kf.users.v1";
  var SESSION_KEY = "kf.session.v1";
  var POINTS_KEY = "kf.points.v1";
  var TICK_KEY = "kf.pointtick.v1";
  var POINT_INTERVAL = 10000;
  var BADGES = {
    star: { icon: "⭐", label: "Yıldız" },
    skull: { icon: "💀", label: "Kurukafa" },
    medicine: { icon: "💊", label: "İlaç" },
    mushroom: { icon: "🍄", label: "Mantar" },
    whiskey: { icon: "🥃", label: "Viski" },
    cigarette: { icon: "🚬", label: "Sigara" }
  };

  var $ = function (selector, scope) { return (scope || document).querySelector(selector); };
  var $$ = function (selector, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(selector)); };
  var page = document.body.getAttribute("data-auth-page") || "home";

  var gate = $("#auth-gate");
  var form = $("#auth-form");
  var usernameInput = $("#auth-username");
  var passwordInput = $("#auth-password");
  var errorEl = $("#auth-error");
  var submit = $("#auth-submit");
  var submitLabel = submit ? $(".btn-label", submit) : null;
  var welcome = $("#auth-welcome");
  var registerInfo = $("#auth-register-info");
  var userChip = $("#user-chip");
  var userName = $("#user-name");
  var userPoints = $("#user-points");
  var userAvatar = $("#user-avatar");
  var userBadges = $("#user-badges");
  var userRank = $("#user-rank");
  var userTask = $("#user-task");
  var profileSettings = $("#profile-settings");
  var accountDialog = $("#account-dialog");
  var rankList = $("#rank-list");
  var reclaimPanel = $("#reclaim-panel");
  var toast = $("#toast");
  var toastText = $("#toast-text");
  var toastTimer = null;
  var logoutButton = $("#logout-button");
  var modeButtons = Array.prototype.slice.call(document.querySelectorAll("[data-auth-mode]"));

  var currentUser = null;
  var pointsTimer = null;
  var bumpTimer = null;

  function readJSON(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      return false;
    }
  }

  function readUsers() {
    var users = readJSON(USERS_KEY, []);
    return Array.isArray(users) ? users : [];
  }

  function keyOf(username) {
    return String(username || "").trim().toLowerCase();
  }

  function findUser(username) {
    var key = keyOf(username);
    var users = readUsers();
    for (var i = 0; i < users.length; i += 1) {
      if (users[i] && users[i].usernameKey === key) return users[i];
    }
    return null;
  }

  function pointsMap() {
    var value = readJSON(POINTS_KEY, {});
    return value && typeof value === "object" ? value : {};
  }

  function pointsFor(username) {
    var value = pointsMap()[keyOf(username)];
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }

  function addPoint(username) {
    var map = pointsMap();
    var key = keyOf(username);
    map[key] = pointsFor(username) + 1;
    if (!writeJSON(POINTS_KEY, map)) return;
    if (window.KF_RANKS) {
      window.KF_RANKS.update();
      if (rankList) window.KF_RANKS.renderRankList(rankList, currentUser ? currentUser.username : username);
    }
    if (currentUser && currentUser.usernameKey === key) updateChip(true);
  }

  function formatPoints(value) {
    try {
      return new Intl.NumberFormat("tr-TR").format(value);
    } catch (err) {
      return String(value);
    }
  }

  function displayNameOf(user) {
    return user && user.displayName ? user.displayName : (user ? user.username : "");
  }

  function updateChip(bump) {
    if (!userChip || !userName || !userPoints) return;
    var user = currentUser || window.__KF_USER;
    if (!user) {
      userChip.hidden = true;
      return;
    }
    var name = displayNameOf(user);
    userChip.hidden = false;
    userName.textContent = name;
    userPoints.textContent = formatPoints(pointsFor(user.username));
    userChip.title = name + " · Sitede aktif kaldıkça puan kazanırsın.";

    if (userAvatar) {
      userAvatar.textContent = "";
      if (user.photo) {
        var img = document.createElement("img");
        img.src = user.photo;
        img.alt = "";
        userAvatar.appendChild(img);
      } else {
        userAvatar.textContent = name.charAt(0).toLocaleUpperCase("tr-TR");
      }
    }

    if (userBadges) {
      userBadges.textContent = "";
      var badges = Array.isArray(user.badges) ? user.badges : [];
      badges.forEach(function (key) {
        if (!BADGES[key]) return;
        var badge = document.createElement("span");
        badge.className = "user-badge";
        badge.textContent = BADGES[key].icon;
        badge.title = BADGES[key].label;
        userBadges.appendChild(badge);
      });
      userBadges.hidden = badges.length === 0;
    }

    if (window.KF_RANKS) {
      var tasks = window.KF_RANKS.getTasks(user.username);
      if (userTask) {
        userTask.textContent = tasks.length ? (tasks.length + " görev") : "";
        userTask.hidden = tasks.length === 0;
        userTask.title = tasks.length ? tasks[tasks.length - 1] : "";
      }
    }

    if (userRank) {
      var seat = window.KF_RANKS ? window.KF_RANKS.getSeatForUser(user.username) : null;
      userRank.textContent = seat ? seat.title : "";
      userRank.hidden = !seat;
    }

    if (bump) {
      userPoints.classList.remove("is-bumping");
      void userPoints.offsetWidth;
      userPoints.classList.add("is-bumping");
      window.clearTimeout(bumpTimer);
      bumpTimer = window.setTimeout(function () {
        userPoints.classList.remove("is-bumping");
      }, 500);
    }
  }

  function populateAccount() {
    if (!accountDialog) return;
    var user = currentUser || window.__KF_USER;
    if (!user) return;
    var name = displayNameOf(user);
    var avatar = $("#account-avatar");
    if (avatar) {
      avatar.textContent = "";
      if (user.photo) {
        var img = document.createElement("img");
        img.src = user.photo;
        img.alt = "";
        avatar.appendChild(img);
      } else {
        avatar.textContent = name.charAt(0).toLocaleUpperCase("tr-TR");
      }
    }
    var setName = $("#account-name");
    var setUser = $("#account-username");
    var setPoints = $("#account-points");
    var setRank = $("#account-rank");
    var setBadges = $("#account-badges");
    var setTasks = $("#account-tasks");
    if (setName) setName.textContent = name;
    if (setUser) setUser.textContent = "@" + user.username;
    if (setPoints) setPoints.textContent = formatPoints(pointsFor(user.username)) + " puan";
    var seat = window.KF_RANKS ? window.KF_RANKS.getSeatForUser(user.username) : null;
    if (setRank) setRank.textContent = seat ? seat.title : "Koltuk yok";
    if (setBadges) {
      var badges = Array.isArray(user.badges) ? user.badges : [];
      setBadges.textContent = badges.length ? badges.map(function (key) { return BADGES[key] ? BADGES[key].icon : ""; }).join(" ") : "Yok";
    }
    var tasks = window.KF_RANKS ? window.KF_RANKS.getTasks(user.username) : [];
    if (setTasks) setTasks.textContent = tasks.length ? tasks[tasks.length - 1] : "Yok";
  }

  function openAccount() {
    if (!accountDialog) return;
    populateAccount();
    if (typeof accountDialog.showModal === "function") accountDialog.showModal();
    else accountDialog.setAttribute("open", "");
    document.documentElement.style.overflow = "hidden";
  }
  function closeAccount() {
    if (!accountDialog) return;
    if (typeof accountDialog.close === "function") accountDialog.close();
    else accountDialog.removeAttribute("open");
    document.documentElement.style.overflow = "";
  }

  function startPoints() {
    stopPoints();
    try { window.localStorage.setItem(TICK_KEY, String(Date.now())); } catch (err) {}
    pointsTimer = window.setInterval(function () {
      if (!currentUser || document.visibilityState !== "visible") return;
      var now = Date.now();
      var last = 0;
      try { last = Number(window.localStorage.getItem(TICK_KEY) || 0); } catch (err) {}
      if (now - last < POINT_INTERVAL) return;
      try { window.localStorage.setItem(TICK_KEY, String(now)); } catch (err) {}
      addPoint(currentUser.username);
    }, 5000);
  }

  function stopPoints() {
    if (pointsTimer) {
      window.clearInterval(pointsTimer);
      pointsTimer = null;
    }
  }

  function setError(message) {
    if (!errorEl) return;
    errorEl.textContent = message || "";
    if (message && usernameInput) usernameInput.focus();
  }

  function setBackgroundInert(value) {
    if (page !== "home") return;
    var targets = document.querySelectorAll(".site-header, .home-header, main, .site-footer, .home-footer, .skip-link, .fab, .toast");
    Array.prototype.forEach.call(targets, function (el) {
      if (value) el.setAttribute("inert", "");
      else el.removeAttribute("inert");
    });
  }

  function showToast(message, isError) {
    if (!toast || !toastText) return;
    toastText.textContent = message;
    toast.classList.toggle("is-error", Boolean(isError));
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 3600);
  }

  function refreshRankPanels() {
    if (!window.KF_RANKS || !currentUser) return;
    if (rankList) window.KF_RANKS.renderRankList(rankList, currentUser.username);
    if (reclaimPanel) window.KF_RANKS.renderReclaimPanel(reclaimPanel, currentUser.username);
    updateChip(false);
  }

  function setMode(nextMode) {
    var mode = nextMode === "register" ? "register" : "login";
    modeButtons.forEach(function (button) {
      if (button.classList.contains("auth-tab")) {
        button.setAttribute("aria-selected", String(button.getAttribute("data-auth-mode") === mode));
      }
    });
    if (form) form.hidden = mode !== "login";
    if (registerInfo) registerInfo.hidden = mode !== "register";
    if (passwordInput) {
      passwordInput.value = "";
      passwordInput.setAttribute("autocomplete", "current-password");
    }
    if (submitLabel) submitLabel.textContent = "Giriş yap";
    if (welcome) {
      welcome.textContent = mode === "register"
        ? "Üyelik bilgilerini aşağıda görebilirsin."
        : "Devam etmek için kullanıcı adını ve şifreni gir.";
    }
    setError("");
  }

  function enterSite(user, animate) {
    currentUser = user;
    if (window.KF_RANKS) {
      window.KF_RANKS.handleLogin(user.username);
      if (rankList) window.KF_RANKS.renderRankList(rankList, user.username);
      if (reclaimPanel) window.KF_RANKS.renderReclaimPanel(reclaimPanel, user.username);
    }
    try { window.localStorage.setItem(SESSION_KEY, user.usernameKey); } catch (err) {}
    updateChip(false);
    setBackgroundInert(false);
    document.body.classList.remove("auth-locked");
    startPoints();

    if (!gate) return;

    if (!animate) {
      gate.hidden = true;
      return;
    }

    gate.classList.add("is-leaving");
    window.setTimeout(function () {
      gate.hidden = true;
      gate.classList.remove("is-leaving");
      var main = $("#main");
      if (main) {
        main.setAttribute("tabindex", "-1");
        main.focus({ preventScroll: true });
      }
    }, 360);
  }

  function showGate() {
    if (page === "frog") {
      window.location.replace("index.html");
      return;
    }
    if (!gate) {
      // Ana sayfada giriş kapısı (gate) yok; sunucu zaten oturumu zorunlu kılıyor.
      // Burada /login'e yönlendirmek, sunucunun bizi geri /'a atmasıyla döngüye girer.
      // O yüzden hiçbir şey yapmadan çıkıyoruz; oturumu site.js köprüler.
      return;
    }
    currentUser = null;
    stopPoints();
    try { window.localStorage.removeItem(SESSION_KEY); } catch (err) {}
    updateChip(false);
    setBackgroundInert(true);
    gate.hidden = false;
    gate.classList.remove("is-leaving");
    document.body.classList.add("auth-locked");
    setMode("login");
    if (passwordInput) passwordInput.value = "";
    window.setTimeout(function () {
      if (usernameInput) usernameInput.focus();
    }, 80);
  }

  function hex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), function (byte) {
      return byte.toString(16).padStart(2, "0");
    }).join("");
  }

  function hashPassword(password, salt) {
    if (!window.crypto || !window.crypto.subtle) {
      return Promise.reject(new Error("Tarayıcın güvenli şifreleme API'sini desteklemiyor."));
    }
    var encoder = new TextEncoder();
    return window.crypto.subtle
      .importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"])
      .then(function (key) {
        return window.crypto.subtle.deriveBits(
          {
            name: "PBKDF2",
            salt: encoder.encode(salt),
            iterations: 120000,
            hash: "SHA-256"
          },
          key,
          256
        );
      })
      .then(function (bits) {
        return hex(bits);
      });
  }

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      setError("");

      var username = usernameInput ? usernameInput.value.trim() : "";
      var password = passwordInput ? passwordInput.value : "";

      if (!username || !password) {
        setError("Kullanıcı adı ve şifre gerekli.");
        return;
      }

      var existing = findUser(username);
      if (!existing) {
        setError("Kullanıcı adı veya şifre hatalı.");
        return;
      }

      if (submit) submit.disabled = true;
      form.classList.add("is-busy");
      form.setAttribute("aria-busy", "true");

      hashPassword(password, existing.salt).then(function (hash) {
        if (hash !== existing.hash) {
          throw new Error("Kullanıcı adı veya şifre hatalı.");
        }
        enterSite(existing, true);
      }).catch(function (error) {
        setError(error && error.message ? error.message : "Giriş yapılamadı.");
      }).then(function () {
        if (submit) submit.disabled = false;
        form.classList.remove("is-busy");
        form.setAttribute("aria-busy", "false");
      });
    });
  }

  modeButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      if (button.hasAttribute("data-auth-mode")) {
        setMode(button.getAttribute("data-auth-mode"));
      }
    });
  });

  if (logoutButton) {
    logoutButton.addEventListener("click", function () {
      if (page === "frog") {
        try { window.localStorage.removeItem(SESSION_KEY); } catch (err) {}
        window.location.href = "index.html";
        return;
      }
      showGate();
    });
  }

  if (profileSettings) profileSettings.addEventListener("click", openAccount);
  $$("[data-close-account]").forEach(function (button) { button.addEventListener("click", closeAccount); });
  if (accountDialog) {
    accountDialog.addEventListener("click", function (event) {
      if (event.target === accountDialog) closeAccount();
    });
    accountDialog.addEventListener("close", function () { document.documentElement.style.overflow = ""; });
  }

  [usernameInput, passwordInput].forEach(function (input) {
    if (!input) return;
    input.addEventListener("input", function () { setError(""); });
  });

  window.addEventListener("kf-reclaim-voted", function () {
    refreshRankPanels();
    showToast("Oyun kaydedildi.");
  });

  window.addEventListener("kf-reclaim-resolved", function (event) {
    refreshRankPanels();
    var accepted = event.detail && event.detail.accepted;
    showToast(accepted ? "Koltuk geri verildi." : "Koltuk verilmedi; görev eklendi.");
  });

  window.KF_AUTH_SET_USER = function (user) {
    if (!user) return;
    currentUser = user;
    updateChip(false);
    startPoints();
    if (rankList) window.KF_RANKS && window.KF_RANKS.renderRankList(rankList, user.username);
    if (reclaimPanel) window.KF_RANKS && window.KF_RANKS.renderReclaimPanel(reclaimPanel, user.username);
  };

  var year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  var session = null;
  try { session = window.localStorage.getItem(SESSION_KEY); } catch (err) {}
  var existing = session ? findUser(session) : null;

  if (existing) {
    enterSite(existing, false);
  } else if (page === "frog") {
    window.location.replace("index.html");
  } else {
    showGate();
  }
})();