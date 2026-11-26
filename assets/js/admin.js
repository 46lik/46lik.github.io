/* =========================================================
   NO.46 — yerel yönetim paneli
   ========================================================= */

(function () {
  "use strict";

  var ADMIN_KEY = "kf.admin.v1";
  var ADMIN_SESSION = "kf.admin.session.v1";
  var USERS_KEY = "kf.users.v1";
  var POINTS_KEY = "kf.points.v1";
  var BADGES = {
    star: { icon: "⭐", label: "Yıldız" },
    skull: { icon: "💀", label: "Kurukafa" },
    medicine: { icon: "💊", label: "İlaç" },
    mushroom: { icon: "🍄", label: "Mantar" },
    whiskey: { icon: "🥃", label: "Viski" },
    cigarette: { icon: "🚬", label: "Sigara" }
  };

  var $ = function (selector, scope) { return (scope || document).querySelector(selector); };

  var authSection = $("#admin-auth");
  var dashboard = $("#admin-dashboard");
  var form = $("#admin-form");
  var usernameInput = $("#admin-username");
  var passwordInput = $("#admin-password");
  var confirmInput = $("#admin-confirm");
  var confirmField = $("#admin-confirm-field");
  var errorEl = $("#admin-error");
  var submit = $("#admin-submit");
  var submitLabel = submit ? $(".btn-label", submit) : null;
  var title = $("#admin-title");
  var sub = $("#admin-sub");
  var logout = $("#admin-logout");

  var addForm = $("#admin-add-form");
  var newUsername = $("#new-username");
  var newDisplay = $("#new-display");
  var newPassword = $("#new-password");
  var newPhoto = $("#new-photo");
  var addError = $("#admin-add-error");
  var userList = $("#admin-user-list");
  var empty = $("#admin-empty");
  var userCount = $("#admin-user-count");
  var adminRankList = $("#admin-rank-list");
  var adminUserSearch = $("#admin-user-search");
  var rankAddForm = $("#rank-add-form");
  var rankTitleInput = $("#rank-title");
  var rankRegionInput = $("#rank-region");
  var rankPointsInput = $("#rank-points");
  var rankAddError = $("#rank-add-error");
  var toast = $("#toast");
  var toastText = $("#toast-text");
  var toastTimer = null;
  var adminInfo = $("#admin-info");
  var adminPassForm = $("#admin-pass-form");
  var adminOldPass = $("#admin-old-pass");
  var adminNewPass = $("#admin-new-pass");
  var adminConfirmPass = $("#admin-confirm-pass");
  var adminPassError = $("#admin-pass-error");
  var adminPassSave = $("#admin-pass-save");
  var adminCurrentPage = 1;
  var adminPageSize = 10;
  var adminPagination = null;

  var mode = "login";
  var currentAdmin = null;
  var ADMIN_SESSION_TTL = 24 * 60 * 60 * 1000; // 24 saat
  var adminAttempts = new Map();

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

  function writeUsers(users) {
    return writeJSON(USERS_KEY, users);
  }

  function readAdmin() {
    var admin = readJSON(ADMIN_KEY, null);
    return admin && typeof admin === "object" ? admin : null;
  }

  function keyOf(value) {
    return String(value || "").trim().toLowerCase();
  }

  function validUsername(value) {
    return /^[\p{L}\p{N}_-]{2,20}$/u.test(value);
  }

  function hex(buffer) {
    return Array.prototype.map.call(new Uint8Array(buffer), function (byte) {
      return byte.toString(16).padStart(2, "0");
    }).join("");
  }

  function makeSalt() {
    var bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return hex(bytes);
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

  function showToast(message, isError) {
    if (!toast || !toastText) return;
    toastText.textContent = message;
    toast.classList.toggle("is-error", Boolean(isError));
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 3600);

    // Kapatma düğmesi ekle
    var existingClose = toast.querySelector(".toast-close");
    if (!existingClose) {
      var closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.className = "toast-close";
      closeBtn.setAttribute("aria-label", "Kapat");
      closeBtn.textContent = "×";
      closeBtn.onclick = function () {
        toast.classList.remove("is-visible");
        window.clearTimeout(toastTimer);
      };
      toast.appendChild(closeBtn);
    }
  }

  function adminRateLimited() {
  var now = Date.now();
  var entry = adminAttempts.get("admin") || { count: 0, reset: now + 15 * 60 * 1000 };
  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + 15 * 60 * 1000;
  }
  entry.count += 1;
  adminAttempts.set("admin", entry);
  return entry.count > 5;
}

function setError(message) {
    if (!errorEl) return;
    errorEl.textContent = message || "";
    if (message && usernameInput) usernameInput.focus();
  }

  function setAddError(message) {
    if (!addError) return;
    addError.textContent = message || "";
  }

  function setMode(nextMode) {
    mode = nextMode === "setup" ? "setup" : "login";
    var setup = mode === "setup";
    if (title) title.textContent = setup ? "Admin kurulumu" : "Admin girişi";
    if (sub) sub.textContent = setup ? "İlk yönetici hesabını oluştur." : "Bu alan sadece yönetici içindir.";
    if (confirmField) confirmField.hidden = !setup;
    if (confirmInput) {
      confirmInput.value = "";
      confirmInput.setAttribute("autocomplete", setup ? "new-password" : "current-password");
    }
    if (passwordInput) {
      passwordInput.value = "";
      passwordInput.setAttribute("autocomplete", setup ? "new-password" : "current-password");
      passwordInput.placeholder = setup ? "En az 8 karakter" : "Şifren";
    }
    if (submitLabel) submitLabel.textContent = setup ? "Kurulumu tamamla" : "Giriş yap";
    setError("");
  }

  function showAuth() {
    currentAdmin = null;
    try { window.localStorage.removeItem(ADMIN_SESSION); } catch (err) {}
    if (authSection) authSection.hidden = false;
    if (dashboard) dashboard.hidden = true;
    if (logout) logout.hidden = true;
    setMode(readAdmin() ? "login" : "setup");
    window.setTimeout(function () {
      if (usernameInput) usernameInput.focus();
    }, 60);
  }

  function showDashboard() {
    if (authSection) authSection.hidden = true;
    if (dashboard) dashboard.hidden = false;
    if (logout) logout.hidden = false;
    renderUsers();
    renderAdminProfile();
  }

  function renderAdminProfile() {
    if (!dashboard) return;
    var wrap = dashboard.querySelector(".wrap");
    if (!wrap) return;

    var existing = wrap.querySelector(".admin-profile-card");
    if (existing) existing.remove();

    var card = document.createElement("section");
    card.className = "admin-panel admin-profile-card";
    card.style.marginBottom = "18px";

    var head = document.createElement("div");
    head.className = "admin-list-head";
    var h2 = document.createElement("h2");
    h2.textContent = "Yönetici Profili";
    var note = document.createElement("span");
    note.className = "admin-note";
    note.textContent = "Hesap güvenliği ve şifre yönetimi";
    head.appendChild(h2);
    head.appendChild(note);
    card.appendChild(head);

    var info = document.createElement("div");
    info.className = "admin-info-grid";
    info.style.display = "grid";
    info.style.gridTemplateColumns = "1fr 1fr";
    info.style.gap = "14px";
    info.style.marginBottom = "14px";

    var field1 = document.createElement("div");
    field1.className = "admin-profile-field";
    var label1 = document.createElement("div");
    label1.className = "admin-profile-label";
    label1.textContent = "Kullanıcı Adı";
    var val1 = document.createElement("div");
    val1.className = "admin-profile-value";
    val1.textContent = currentAdmin ? currentAdmin.username : "-";
    field1.appendChild(label1);
    field1.appendChild(val1);

    var field2 = document.createElement("div");
    field2.className = "admin-profile-field";
    var label2 = document.createElement("div");
    label2.className = "admin-profile-label";
    label2.textContent = "Oluşturulma Tarihi";
    var val2 = document.createElement("div");
    val2.className = "admin-profile-value";
    val2.textContent = currentAdmin ? new Date(currentAdmin.created_at).toLocaleDateString("tr-TR") : "-";
    field2.appendChild(label2);
    field2.appendChild(val2);

    info.appendChild(field1);
    info.appendChild(field2);
    card.appendChild(info);

    // Şifre değiştirme formu
    var passForm = document.createElement("form");
    passForm.id = "admin-pass-form";
    passForm.novalidate = true;
    passForm.style.display = "grid";
    passForm.style.gap = "10px";

    var oldDiv = document.createElement("div");
    oldDiv.className = "admin-field";
    var oldLabel = document.createElement("label");
    oldLabel.textContent = "Eski Şifre";
    var oldInput = document.createElement("input");
    oldInput.id = "admin-old-pass";
    oldInput.type = "password";
    oldInput.maxLength = 100;
    oldInput.placeholder = "Mevcut şifrenizi yazın";
    oldDiv.appendChild(oldLabel);
    oldDiv.appendChild(oldInput);

    var newDiv = document.createElement("div");
    newDiv.className = "admin-field";
    var newLabel = document.createElement("label");
    newLabel.textContent = "Yeni Şifre (en az 8 karakter)";
    var newInput = document.createElement("input");
    newInput.id = "admin-new-pass";
    newInput.type = "password";
    newInput.maxLength = 100;
    newInput.placeholder = "Yeni şifre";
    newDiv.appendChild(newLabel);
    newDiv.appendChild(newInput);

    var confDiv = document.createElement("div");
    confDiv.className = "admin-field";
    var confLabel = document.createElement("label");
    confLabel.textContent = "Yeni Şifre (tekrar)";
    var confInput = document.createElement("input");
    confInput.id = "admin-confirm-pass";
    confInput.type = "password";
    confInput.maxLength = 100;
    confInput.placeholder = "Yeni şifreyi tekrar yazın";
    confDiv.appendChild(confLabel);
    confDiv.appendChild(confInput);

    var errDiv = document.createElement("p");
    errDiv.id = "admin-pass-error";
    errDiv.className = "admin-error";
    errDiv.role = "alert";

    var btnDiv = document.createElement("div");
    btnDiv.style.display = "flex";
    btnDiv.style.gap = "10px";
    var saveBtn = document.createElement("button");
    saveBtn.id = "admin-pass-save";
    saveBtn.type = "button";
    saveBtn.className = "btn btn-amber";
    saveBtn.textContent = "Şifreyi Değiştir";
    var clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "btn";
    clearBtn.textContent = "Temizle";
    clearBtn.onclick = function () {
      adminOldPass.value = "";
      adminNewPass.value = "";
      adminConfirmPass.value = "";
      adminPassError.textContent = "";
    };
    btnDiv.appendChild(saveBtn);
    btnDiv.appendChild(clearBtn);

    passForm.appendChild(oldDiv);
    passForm.appendChild(newDiv);
    passForm.appendChild(confDiv);
    passForm.appendChild(errDiv);
    passForm.appendChild(btnDiv);
    card.appendChild(passForm);

    // Çıkış düğmesini daha belirgin yap
    if (logout) {
      logout.classList.add("btn", "btn-amber", "btn-block");
      logout.style.marginTop = "10px";
      card.appendChild(logout);
    }

    wrap.insertBefore(card, dashboard.querySelector(".admin-rank-panel"));

    // Şifre değiştirme eventi
    saveBtn.onclick = function () {
      adminPassError.textContent = "";
      var oldVal = adminOldPass ? adminOldPass.value : "";
      var newVal = adminNewPass ? adminNewPass.value : "";
      var confVal = adminConfirmPass ? adminConfirmPass.value : "";

      if (!currentAdmin) {
        adminPassError.textContent = "Yönetici hesabı bulunamadı.";
        return;
      }
      if (!oldVal || !newVal || !confVal) {
        adminPassError.textContent = "Tüm alanları doldurun.";
        return;
      }
      if (newVal.length < 8 || newVal.length > 100) {
        adminPassError.textContent = "Yeni şifre 8–100 karakter olmalı.";
        return;
      }
      if (newVal !== confVal) {
        adminPassError.textContent = "Yeni şifreler eşleşmiyor.";
        return;
      }

      saveBtn.disabled = true;
      hashPassword(oldVal, currentAdmin.salt).then(function (hash) {
        if (hash !== currentAdmin.hash) {
          throw new Error("Eski şifre hatalı.");
        }
        return hashPassword(newVal, makeSalt());
      }).then(function (newHash) {
        // Yeni salt oluştur ve güncelle
        var newSalt = makeSalt();
        return hashPassword(newVal, newSalt).then(function (finalHash) {
          currentAdmin.salt = newSalt;
          currentAdmin.hash = finalHash;
          currentAdmin.updated_at = new Date().toISOString();
          if (!writeJSON(ADMIN_KEY, currentAdmin)) {
            throw new Error("Şifre kaydedilemedi.");
          }
          adminPassError.textContent = "";
          showToast("Şifre başarıyla değiştirildi.");
          adminOldPass.value = "";
          adminNewPass.value = "";
          adminConfirmPass.value = "";
        });
      }).catch(function (error) {
        adminPassError.textContent = error && error.message ? error.message : "Şifre değiştirilemedi.";
      }).then(function () {
        saveBtn.disabled = false;
      });
    };
  }

  function pointsFor(username) {
    var map = readJSON(POINTS_KEY, {});
    var value = map && typeof map === "object" ? map[keyOf(username)] : 0;
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }

  function removePoints(username) {
    var map = readJSON(POINTS_KEY, {});
    if (!map || typeof map !== "object") return;
    delete map[keyOf(username)];
    writeJSON(POINTS_KEY, map);
  }

  function readFileAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result || "")); };
      reader.onerror = function () { reject(new Error("Fotoğraf okunamadı.")); };
      reader.readAsDataURL(file);
    });
  }

  function resizeImage(dataUrl, maxSize) {
    return new Promise(function (resolve, reject) {
      var image = new Image();
      image.onload = function () {
        try {
          var size = Math.min(maxSize, image.width, image.height);
          var canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          var ctx = canvas.getContext("2d");
          ctx.fillStyle = "#0b1510";
          ctx.fillRect(0, 0, size, size);
          var scale = Math.min(size / image.width, size / image.height);
          var w = Math.round(image.width * scale);
          var h = Math.round(image.height * scale);
          ctx.drawImage(image, Math.round((size - w) / 2), Math.round((size - h) / 2), w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        } catch (err) {
          reject(new Error("Fotoğraf işlenemedi."));
        }
      };
      image.onerror = function () { reject(new Error("Fotoğraf açılamadı.")); };
      image.src = dataUrl;
    });
  }

  function preparePhoto(file) {
    if (!file) return Promise.resolve("");
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) {
      return Promise.reject(new Error("PNG, JPG veya WebP seçmelisin."));
    }
    if (file.size > 5 * 1024 * 1024) {
      return Promise.reject(new Error("Fotoğraf 5 MB'den küçük olmalı."));
    }
    return readFileAsDataURL(file).then(function (dataUrl) {
      return resizeImage(dataUrl, 256);
    });
  }

  function userRow(user) {
    var row = document.createElement("div");
    row.className = "admin-user";

    var avatar = document.createElement("span");
    avatar.className = "admin-avatar";
    if (user.photo) {
      var img = document.createElement("img");
      img.src = user.photo;
      img.alt = "";
      avatar.appendChild(img);
    } else {
      avatar.textContent = (user.displayName || user.username || "?").charAt(0).toLocaleUpperCase("tr-TR");
    }

    var copy = document.createElement("span");
    copy.className = "admin-user-copy";
    var name = document.createElement("span");
    name.className = "admin-user-name";
    name.textContent = user.displayName || user.username;
    var meta = document.createElement("span");
    meta.className = "admin-user-meta";
    var badges = Array.isArray(user.badges) ? user.badges.filter(function (key) { return BADGES[key]; }) : [];
    var seat = window.KF_RANKS ? window.KF_RANKS.getSeatForUser(user.username) : null;
    var tasks = window.KF_RANKS ? window.KF_RANKS.getTasks(user.username) : [];
    meta.textContent = "@" + user.username + " · " + pointsFor(user.username) + " puan" +
      (seat ? " · " + seat.title : "") +
      (tasks.length ? " · " + tasks.length + " görev" : "") +
      (badges.length ? "  " + badges.map(function (key) { return BADGES[key].icon; }).join(" ") : "");
    copy.appendChild(name);
    copy.appendChild(meta);

    var actions = document.createElement("span");
    actions.className = "admin-user-actions";

    var badgeButton = document.createElement("button");
    badgeButton.className = "admin-icon-button";
    badgeButton.type = "button";
    badgeButton.textContent = "Rozetler";

    var badgeEditor = document.createElement("span");
    badgeEditor.className = "admin-badge-editor";
    badgeEditor.hidden = true;

    Object.keys(BADGES).forEach(function (key) {
      var option = document.createElement("button");
      option.className = "admin-badge-option";
      option.type = "button";
      option.textContent = BADGES[key].icon + " " + BADGES[key].label;
      if (badges.indexOf(key) !== -1) option.classList.add("is-active");
      option.addEventListener("click", function () {
        var users = readUsers();
        for (var i = 0; i < users.length; i += 1) {
          if (users[i].usernameKey === user.usernameKey) {
            var current = Array.isArray(users[i].badges) ? users[i].badges.slice() : [];
            var index = current.indexOf(key);
            if (index === -1) current.push(key);
            else current.splice(index, 1);
            users[i].badges = current;
            break;
          }
        }
        if (!writeUsers(users)) {
          showToast("Rozet kaydedilemedi.", true);
          return;
        }
        renderUsers();
        showToast("Rozetler güncellendi.");
      });
      badgeEditor.appendChild(option);
    });

    badgeButton.addEventListener("click", function () {
      badgeEditor.hidden = !badgeEditor.hidden;
      badgeButton.setAttribute("aria-expanded", String(!badgeEditor.hidden));
    });

    var pointsEditor = document.createElement("span");
    pointsEditor.className = "admin-points-editor";
    var pointsLabel = document.createElement("label");
    pointsLabel.textContent = "Puan";
    var pointsInput = document.createElement("input");
    pointsInput.type = "number";
    pointsInput.min = "0";
    pointsInput.max = "100000";
    pointsInput.value = String(pointsFor(user.username));
    pointsInput.setAttribute("aria-label", user.username + " puanı");
    var addPointsButton = document.createElement("button");
    addPointsButton.className = "admin-icon-button";
    addPointsButton.type = "button";
    addPointsButton.textContent = "Ekle";
    var resetPointsButton = document.createElement("button");
    resetPointsButton.className = "admin-icon-button admin-icon-button--danger";
    resetPointsButton.type = "button";
    resetPointsButton.textContent = "Sıfırla";

    function writePoints(value) {
      var map = readJSON(POINTS_KEY, {});
      if (!map || typeof map !== "object") map = {};
      map[keyOf(user.username)] = Math.max(0, Math.floor(Number(value) || 0));
      if (!writeJSON(POINTS_KEY, map)) {
        showToast("Puan kaydedilemedi.", true);
        return false;
      }
      return true;
    }

    addPointsButton.addEventListener("click", function () {
      var amount = Math.floor(Number(pointsInput.value) || 0);
      if (amount <= 0) {
        showToast("Eklenecek puan 0'dan büyük olmalı.", true);
        return;
      }
      if (!writePoints(pointsFor(user.username) + amount)) return;
      renderUsers();
      showToast("Puan eklendi.");
    });

    resetPointsButton.addEventListener("click", function () {
      if (!window.confirm("Bu kullanıcının puanları sıfırlansın mı?")) return;
      if (!writePoints(0)) return;
      renderUsers();
      showToast("Puanlar sıfırlandı.");
    });

    pointsLabel.appendChild(pointsInput);
    pointsEditor.appendChild(pointsLabel);
    pointsEditor.appendChild(addPointsButton);
    pointsEditor.appendChild(resetPointsButton);

    var photoButton = document.createElement("button");
    photoButton.className = "admin-icon-button";
    photoButton.type = "button";
    photoButton.textContent = user.photo ? "Fotoğrafı değiştir" : "Fotoğraf ekle";

    var fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.accept = "image/png,image/jpeg,image/webp";
    fileInput.hidden = true;

    photoButton.addEventListener("click", function () { fileInput.click(); });
    fileInput.addEventListener("change", function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      photoButton.disabled = true;
      preparePhoto(file).then(function (photo) {
        var users = readUsers();
        for (var i = 0; i < users.length; i += 1) {
          if (users[i].usernameKey === user.usernameKey) {
            users[i].photo = photo;
            break;
          }
        }
        if (!writeUsers(users)) throw new Error("Fotoğraf kaydedilemedi.");
        renderUsers();
        showToast("Karakter fotoğrafı kaydedildi.");
      }).catch(function (error) {
        showToast(error.message || "Fotoğraf eklenemedi.", true);
      }).then(function () {
        photoButton.disabled = false;
        fileInput.value = "";
      });
    });

    var deleteButton = document.createElement("button");
    deleteButton.className = "admin-icon-button admin-icon-button--danger";
    deleteButton.type = "button";
    deleteButton.textContent = "Sil";
    deleteButton.addEventListener("click", function () {
      var seats = readJSON("kf.seats.v1", {});
      var hasSeat = false;
      var seatMsg = "";
      Object.keys(seats).forEach(function (key) {
        if (seats[key] === user.usernameKey) {
          hasSeat = true;
          var ranks = window.KF_RANKS ? window.KF_RANKS.getRanks() : [];
          var rank = ranks.find(function (r) { return r.key === key; });
          seatMsg = "\nBu kullanıcının koltuğu var: " + (rank ? rank.title : "rütbe") + ". Koltuk boşalacak.";
        }
      });
      if (!window.confirm("Bu kullanıcı silinsin mi?" + seatMsg)) return;
      var users = readUsers().filter(function (item) {
        return item.usernameKey !== user.usernameKey;
      });
      if (!writeUsers(users)) {
        showToast("Kullanıcı silinemedi.", true);
        return;
      }
      removePoints(user.username);
      if (window.KF_RANKS) window.KF_RANKS.update();
      renderUsers();
      showToast("Kullanıcı silindi." + (hasSeat ? " Koltuk boşaltıldı." : ""));
    });

    actions.appendChild(badgeButton);
    actions.appendChild(photoButton);
    actions.appendChild(deleteButton);
    actions.appendChild(fileInput);
    row.appendChild(avatar);
    row.appendChild(copy);
    row.appendChild(actions);
    row.appendChild(badgeEditor);
    row.appendChild(pointsEditor);
    return row;
  }

  function renderAdminRanks() {
    if (!adminRankList || !window.KF_RANKS) return;
    var ranks = window.KF_RANKS.getRanks();
    var seats = readJSON("kf.seats.v1", {});
    var users = readUsers();
    adminRankList.textContent = "";

    ranks.forEach(function (rank, index) {
      var row = document.createElement("div");
      row.className = "admin-rank-row";

      var order = document.createElement("span");
      order.className = "admin-rank-order";
      order.textContent = String(index + 1).padStart(2, "0");

      var fields = document.createElement("div");
      fields.className = "admin-rank-fields";

      var title = document.createElement("input");
      title.className = "admin-rank-title-input";
      title.type = "text";
      title.maxLength = 60;
      title.value = rank.title;
      title.setAttribute("aria-label", "Rütbe adı");
      title.addEventListener("change", function () {
        window.KF_RANKS.updateRank(rank.key, { title: title.value });
        renderUsers();
        showToast("Rütbe güncellendi.");
      });

      var region = document.createElement("input");
      region.className = "admin-rank-region-input";
      region.type = "text";
      region.maxLength = 120;
      region.value = rank.region;
      region.placeholder = "Açıklama / görev bölgesi";
      region.setAttribute("aria-label", "Rütbe açıklaması");
      region.addEventListener("change", function () {
        window.KF_RANKS.updateRank(rank.key, { region: region.value });
        renderUsers();
        showToast("Açıklama güncellendi.");
      });

      var holder = seats[rank.key] ? users.find(function (user) { return user.usernameKey === seats[rank.key]; }) : null;
      var holderLine = document.createElement("small");
      holderLine.className = "admin-rank-holder";
      holderLine.textContent = holder ? "Koltuk: " + (holder.displayName || holder.username) : "Koltuk boş";

      fields.appendChild(title);
      fields.appendChild(region);
      fields.appendChild(holderLine);

      var pointsWrap = document.createElement("label");
      pointsWrap.className = "admin-rank-points";
      pointsWrap.textContent = "Puan";
      var points = document.createElement("input");
      points.type = "number";
      points.min = "0";
      points.max = "100000";
      points.value = String(rank.points);
      points.setAttribute("aria-label", rank.title + " puan eşiği");
      points.addEventListener("change", function () {
        window.KF_RANKS.setRankPoints(rank.key, points.value);
        renderUsers();
        showToast("Puan eşiği güncellendi.");
      });
      pointsWrap.appendChild(points);

      var actions = document.createElement("div");
      actions.className = "admin-rank-actions";

      var up = document.createElement("button");
      up.className = "admin-icon-button";
      up.type = "button";
      up.textContent = "↑";
      up.setAttribute("aria-label", "Yukarı taşı");
      up.disabled = index === 0;
      up.addEventListener("click", function () {
        window.KF_RANKS.moveRank(rank.key, -1);
        renderUsers();
      });

      var down = document.createElement("button");
      down.className = "admin-icon-button";
      down.type = "button";
      down.textContent = "↓";
      down.setAttribute("aria-label", "Aşağı taşı");
      down.disabled = index === ranks.length - 1;
      down.addEventListener("click", function () {
        window.KF_RANKS.moveRank(rank.key, 1);
        renderUsers();
      });

      var remove = document.createElement("button");
      remove.className = "admin-icon-button admin-icon-button--danger";
      remove.type = "button";
      remove.textContent = "Sil";
      remove.addEventListener("click", function () {
        var seats = readJSON("kf.seats.v1", {});
        var holderKey = seats[rank.key];
        var holderMsg = "";
        if (holderKey) {
          var users = readUsers();
          var holder = users.find(function (u) { return u.usernameKey === holderKey; });
          holderMsg = "\nBu rütbede koltuk sahibi var: " + (holder ? (holder.displayName || holder.username) : holderKey) + ". Koltuk da boşalacak.";
        }
        if (!window.confirm(rank.title + " rütbesi silinsin mi?" + holderMsg)) return;
        window.KF_RANKS.deleteRank(rank.key);
        renderUsers();
        showToast("Rütbe silindi." + (holderMsg ? " Koltuk boşaltıldı." : ""));
      });

      actions.appendChild(up);
      actions.appendChild(down);
      actions.appendChild(remove);

      row.appendChild(order);
      row.appendChild(fields);
      row.appendChild(pointsWrap);
      row.appendChild(actions);
      adminRankList.appendChild(row);
    });
  }

  function renderUsers() {
    if (!userList) return;
    var users = readUsers();
    var query = adminUserSearch ? adminUserSearch.value.trim().toLowerCase() : "";
    var filtered = users.filter(function (user) {
      if (!query) return true;
      return (user.username + " " + (user.displayName || "")).toLowerCase().includes(query);
    });

    // Sayfa sıfırlama eğer arama değiştiyse
    var totalPages = Math.ceil(filtered.length / adminPageSize);
    if (adminCurrentPage > totalPages) adminCurrentPage = Math.max(1, totalPages);

    var start = (adminCurrentPage - 1) * adminPageSize;
    var pageItems = filtered.slice(start, start + adminPageSize);

    userList.textContent = "";
    if (userCount) userCount.textContent = String(users.length);
    if (empty) {
      empty.hidden = filtered.length > 0;
      empty.textContent = query ? "Eşleşen kullanıcı yok." : "Henüz kullanıcı yok.";
    }
    pageItems.forEach(function (user) {
      userList.appendChild(userRow(user));
    });

    // Sayfalama kontrolleri
    renderAdminPagination(filtered.length, totalPages);

    if (window.KF_RANKS) {
      window.KF_RANKS.update();
      renderAdminRanks();
    }
  }

  function renderAdminPagination(total, totalPages) {
    var wrap = dashboard ? dashboard.querySelector(".wrap") : null;
    if (!wrap) return;

    var existing = wrap.querySelector(".admin-pagination");
    if (existing) existing.remove();

    if (totalPages <= 1) return;

    var bar = document.createElement("div");
    bar.className = "admin-pagination";
    bar.style.display = "flex";
    bar.style.justifyContent = "center";
    bar.style.alignItems = "center";
    bar.style.gap = "8px";
    bar.style.marginTop = "16px";

    var prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "btn";
    prevBtn.textContent = "Önceki";
    prevBtn.disabled = adminCurrentPage <= 1;
    prevBtn.onclick = function () {
      if (adminCurrentPage > 1) {
        adminCurrentPage--;
        renderUsers();
      }
    };

    var pageInfo = document.createElement("span");
    pageInfo.className = "admin-page-info";
    pageInfo.style.color = "#8a8a8a";
    pageInfo.style.fontSize = ".78rem";
    pageInfo.textContent = adminCurrentPage + " / " + totalPages;

    var nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "btn";
    nextBtn.textContent = "Sonraki";
    nextBtn.disabled = adminCurrentPage >= totalPages;
    nextBtn.onclick = function () {
      if (adminCurrentPage < totalPages) {
        adminCurrentPage++;
        renderUsers();
      }
    };

    bar.appendChild(prevBtn);
    bar.appendChild(pageInfo);
    bar.appendChild(nextBtn);

    // Sayfalama çubuğunu user-list'in altına ekle
    userList.parentNode.appendChild(bar);
  }

  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      setError("");
      var username = usernameInput ? usernameInput.value.trim() : "";
      var password = passwordInput ? passwordInput.value : "";

      if (!validUsername(username)) {
        setError("Kullanıcı adı 2–20 karakter olmalı; harf, rakam, _ veya - kullanabilirsin.");
        return;
      }
      if (password.length < 8 || password.length > 100) {
        setError("Şifre 8–100 karakter olmalı.");
        return;
      }

      if (adminRateLimited()) {
        setError("Çok fazla denediniz. 15 dakika sonra tekrar deneyin.");
        if (submit) submit.disabled = false;
        return;
      }

      if (submit) submit.disabled = true;
      var work;

      if (mode === "setup") {
        var confirm = confirmInput ? confirmInput.value : "";
        if (password !== confirm) {
          setError("Şifreler eşleşmiyor.");
          if (submit) submit.disabled = false;
          return;
        }
        var salt = makeSalt();
        work = hashPassword(password, salt).then(function (hash) {
          var admin = {
            username: username,
            usernameKey: keyOf(username),
            salt: salt,
            hash: hash,
            created_at: new Date().toISOString()
          };
          if (!writeJSON(ADMIN_KEY, admin)) {
            throw new Error("Tarayıcı depolaması kapalı; kurulum yapılamıyor.");
          }
          currentAdmin = admin;
          try { window.localStorage.setItem(ADMIN_SESSION, admin.usernameKey); } catch (err) {}
          try { window.localStorage.setItem("kf.admin.session.start", String(Date.now())); } catch (err) {}
          showDashboard();
          showToast("Yönetim hesabı oluşturuldu.");
        });
      } else {
        var admin = readAdmin();
        if (!admin) {
          setError("Yönetim hesabı bulunamadı.");
          if (submit) submit.disabled = false;
          return;
        }
        work = hashPassword(password, admin.salt).then(function (hash) {
          if (hash !== admin.hash || keyOf(username) !== admin.usernameKey) {
            throw new Error("Kullanıcı adı veya şifre hatalı.");
          }
          currentAdmin = admin;
          try { window.localStorage.setItem(ADMIN_SESSION, admin.usernameKey); } catch (err) {}
          try { window.localStorage.setItem("kf.admin.session.start", String(Date.now())); } catch (err) {}
          showDashboard();
        });
      }

      work.catch(function (error) {
        setError(error && error.message ? error.message : "İşlem yapılamadı.");
      }).then(function () {
        if (submit) submit.disabled = false;
      });
    });
  }

  if (addForm) {
    addForm.addEventListener("submit", function (event) {
      event.preventDefault();
      setAddError("");
      var username = newUsername ? newUsername.value.trim() : "";
      var displayName = newDisplay ? newDisplay.value.trim() : "";
      var password = newPassword ? newPassword.value : "";

      if (!validUsername(username)) {
        setAddError("Kullanıcı adı 2–20 karakter olmalı; harf, rakam, _ veya - kullanabilirsin.");
        return;
      }
      if (displayName.length > 40) {
        setAddError("Görünen ad en fazla 40 karakter olabilir.");
        return;
      }
      if (password.length < 8 || password.length > 100) {
        setAddError("Şifre 8–100 karakter olmalı.");
        return;
      }

      var users = readUsers();
      for (var i = 0; i < users.length; i += 1) {
        if (users[i].usernameKey === keyOf(username)) {
          setAddError("Bu kullanıcı adı zaten var.");
          return;
        }
      }

      var submitButton = addForm.querySelector("button[type=submit]");
      if (submitButton) submitButton.disabled = true;

      var salt = makeSalt();
      Promise.all([
        hashPassword(password, salt),
        preparePhoto(newPhoto && newPhoto.files && newPhoto.files[0])
      ]).then(function (values) {
        var user = {
          username: username,
          usernameKey: keyOf(username),
          displayName: displayName,
          salt: salt,
          hash: values[0],
          photo: values[1],
          created_at: new Date().toISOString()
        };
        users.push(user);
        if (!writeUsers(users)) throw new Error("Kullanıcı eklenemedi.");
        addForm.reset();
        renderUsers();
        showToast("Kullanıcı eklendi.");
      }).catch(function (error) {
        setAddError(error.message || "Kullanıcı eklenemedi.");
      }).then(function () {
        if (submitButton) submitButton.disabled = false;
      });
    });
  }

  if (logout) {
    logout.addEventListener("click", showAuth);
  }

  if (adminUserSearch) {
    adminUserSearch.addEventListener("input", function () {
      adminCurrentPage = 1;
      renderUsers();
    });
  }

  if (rankAddForm) {
    rankAddForm.addEventListener("submit", function (event) {
      event.preventDefault();
      if (rankAddError) rankAddError.textContent = "";
      var title = rankTitleInput ? rankTitleInput.value.trim() : "";
      var region = rankRegionInput ? rankRegionInput.value.trim() : "";
      var points = Math.floor(Number(rankPointsInput && rankPointsInput.value) || 0);
      if (!title) {
        if (rankAddError) rankAddError.textContent = "Rütbe adı gerekli.";
        return;
      }
      if (points < 0) {
        if (rankAddError) rankAddError.textContent = "Puan eşiği 0 veya daha büyük olmalı.";
        return;
      }
      if (!window.KF_RANKS) return;
      window.KF_RANKS.addRank({ title: title, region: region, points: points });
      rankAddForm.reset();
      if (rankPointsInput) rankPointsInput.value = "0";
      renderUsers();
      showToast("Yeni rütbe eklendi.");
      if (rankTitleInput) rankTitleInput.focus();
    });
  }

  var session = null;
  try { session = window.localStorage.getItem(ADMIN_SESSION); } catch (err) {}
  var admin = readAdmin();

  if (session && admin && session === admin.usernameKey) {
    var sessionStart = 0;
    try { sessionStart = Number(window.localStorage.getItem("kf.admin.session.start") || 0); } catch (err) {}
    if (sessionStart && Date.now() - sessionStart > ADMIN_SESSION_TTL) {
      try { window.localStorage.removeItem(ADMIN_SESSION); } catch (err) {}
      try { window.localStorage.removeItem("kf.admin.session.start"); } catch (err) {}
      showAuth();
    } else {
      currentAdmin = admin;
      showDashboard();
    }
  } else {
    showAuth();
  }
})();