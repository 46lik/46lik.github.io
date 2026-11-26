/* =========================================================
   NO.46 — Yönetim Paneli (API tabanlı, güvenli)
   ========================================================= */

(function () {
  "use strict";

  var $ = function (selector, scope) { return (scope || document).querySelector(selector); };
  var $$ = function (selector, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(selector)); };

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
  var logoutBtn = $("#admin-logout");

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

  var currentAdmin = null;
  var adminToken = null;
  var usersCache = [];
  var adminCurrentPage = 1;
  var adminPageSize = 20;

  var API_BASE = (window.NO46_API && window.NO46_API.base) ? window.NO46_API.base : "";
  var SESSION_KEY = "kf.session.v1";

  function getApiHeaders(includeAuth) {
    var headers = {
      "Content-Type": "application/json",
      "Accept": "application/json"
    };
    if (includeAuth) {
      var token = adminToken || (window.NO46_API ? window.NO46_API.getToken() : null);
      if (token) headers["Authorization"] = "Bearer " + token;
    }
    return headers;
  }

  function apiRequest(endpoint, method, body, requireAuth) {
    var base = API_BASE;
    var url = base + endpoint;
    var options = {
      method: method,
      headers: getApiHeaders(requireAuth),
      credentials: "include"
    };
    if (body) options.body = JSON.stringify(body);
    return fetch(url, options)
      .catch(function () {
        throw new Error("Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.");
      })
      .then(function (response) {
        return response.text().then(function (text) {
          var data = null;
          if (text) {
            try { data = JSON.parse(text); } catch (err) { data = null; }
          }
          if (!response.ok) {
            var msg = data && (data.error || data.message)
              ? String(data.error || data.message)
              : "Sunucu yanıt vermedi (" + response.status + ").";
            var error = new Error(msg);
            error.status = response.status;
            throw error;
          }
          return data;
        });
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
    }, 4000);
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
    var setup = nextMode === "setup";
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
      passwordInput.placeholder = setup ? "En az 12 karakter, güçlü şifre" : "Şifren";
    }
    if (submitLabel) submitLabel.textContent = setup ? "Kurulumu tamamla" : "Giriş yap";
    setError("");
  }

  function showAuth() {
    currentAdmin = null;
    adminToken = null;
    try { window.localStorage.removeItem(SESSION_KEY); } catch (err) {}
    if (authSection) authSection.hidden = false;
    if (dashboard) dashboard.hidden = true;
    if (logoutBtn) logoutBtn.hidden = true;
    setMode("login");
    window.setTimeout(function () {
      if (usernameInput) usernameInput.focus();
    }, 60);
  }

  function showDashboard() {
    if (authSection) authSection.hidden = true;
    if (dashboard) dashboard.hidden = false;
    if (logoutBtn) logoutBtn.hidden = false;
    renderUsers();
    renderAdminRanks();
    renderAdminProfile();
  }

  function renderAdminProfile() {
    if (!dashboard || !currentAdmin) return;
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
    val1.textContent = currentAdmin.username;
    field1.appendChild(label1);
    field1.appendChild(val1);

    var field2 = document.createElement("div");
    field2.className = "admin-profile-field";
    var label2 = document.createElement("div");
    label2.className = "admin-profile-label";
    label2.textContent = "Yetki";
    var val2 = document.createElement("div");
    val2.className = "admin-profile-value";
    val2.textContent = currentAdmin.isRoot ? "Root Admin (RouterMurtii)" : "Admin";
    val2.style.color = currentAdmin.isRoot ? "#ffb020" : "#ff3b30";
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
    newLabel.textContent = "Yeni Şifre (en az 6 karakter, basit)";
    var newInput = document.createElement("input");
    newInput.id = "admin-new-pass";
    newInput.type = "password";
    newInput.maxLength = 100;
    newInput.placeholder = "Yeni şifre (en az 6 karakter, harf + rakam)";
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
      oldInput.value = "";
      newInput.value = "";
      confInput.value = "";
      errDiv.textContent = "";
    };
    btnDiv.appendChild(saveBtn);
    btnDiv.appendChild(clearBtn);

    passForm.appendChild(oldDiv);
    passForm.appendChild(newDiv);
    passForm.appendChild(confDiv);
    passForm.appendChild(errDiv);
    passForm.appendChild(btnDiv);
    card.appendChild(passForm);

    // Çıkış düğmesi
    if (logoutBtn) {
      logoutBtn.classList.add("btn", "btn-amber", "btn-block");
      logoutBtn.style.marginTop = "10px";
      card.appendChild(logoutBtn);
    }

    wrap.insertBefore(card, dashboard.querySelector(".admin-rank-panel"));

    // Şifre değiştirme eventi
    saveBtn.onclick = function () {
      errDiv.textContent = "";
      var oldVal = oldInput.value;
      var newVal = newInput.value;
      var confVal = confInput.value;

      if (!oldVal || !newVal || !confVal) {
        errDiv.textContent = "Tüm alanları doldurun.";
        return;
      }
      if (newVal.length < 6 || newVal.length > 100) {
        errDiv.textContent = "Yeni şifre en az 6 karakter olmalı.";
        return;
      }
      if (newVal !== confVal) {
        errDiv.textContent = "Yeni şifreler eşleşmiyor.";
        return;
      }

      saveBtn.disabled = true;
      apiRequest("/api/sifre-degistir", "POST", { eski: oldVal, yeni: newVal }, true)
        .then(function () {
          errDiv.textContent = "";
          showToast("Şifre başarıyla değiştirildi.");
          oldInput.value = "";
          newInput.value = "";
          confInput.value = "";
        })
        .catch(function (error) {
          errDiv.textContent = error && error.message ? error.message : "Şifre değiştirilemedi.";
        })
        .then(function () {
          saveBtn.disabled = false;
        });
    };
  }

  function userRow(user) {
    var row = document.createElement("div");
    row.className = "admin-user";
    row.dataset.userId = user.id;

    var avatar = document.createElement("span");
    avatar.className = "admin-avatar";
    if (user.avatar) {
      var img = document.createElement("img");
      img.src = "/assets/img/avatar-" + user.avatar + ".svg";
      img.alt = "";
      avatar.appendChild(img);
    } else {
      avatar.textContent = (user.gorunen_ad || user.username || "?").charAt(0).toLocaleUpperCase("tr-TR");
    }

    var copy = document.createElement("span");
    copy.className = "admin-user-copy";
    var name = document.createElement("span");
    name.className = "admin-user-name";
    name.textContent = user.gorunen_ad || user.username;
    var meta = document.createElement("span");
    meta.className = "admin-user-meta";
    var badges = Array.isArray(user.badges) ? user.badges.filter(function (key) { return BADGES[key]; }) : [];
    var metaText = "@" + user.username + " · " + user.puan + " puan";
    if (user.seviye) metaText += " · " + user.seviye.ad;
    if (user.koltuk) metaText += " · Koltuk: " + user.koltuk.ad;
    metaText += (badges.length ? "  " + badges.map(function (key) { return BADGES[key].icon; }).join(" ") : "");
    if (user.isAdmin) metaText += " · 👑 ADMİN";
    if (user.banned) metaText += " · 🚫 BANLI";
    meta.textContent = metaText;
    copy.appendChild(name);
    copy.appendChild(meta);

    var actions = document.createElement("span");
    actions.className = "admin-user-actions";

    // Şifre sıfırla
    var resetPassBtn = document.createElement("button");
    resetPassBtn.className = "admin-icon-button";
    resetPassBtn.type = "button";
    resetPassBtn.textContent = "Şifre Sıfırla";
    resetPassBtn.title = "Kullanıcının şifresini sıfırla (basit şifre zorunlu)";
    resetPassBtn.onclick = function () {
      resetUserPassword(user);
    };

    // Ban / Unban
    var banBtn = document.createElement("button");
    banBtn.className = "admin-icon-button" + (user.banned ? " admin-icon-button--danger" : "");
    banBtn.type = "button";
    banBtn.textContent = user.banned ? "Ban Kaldır" : "Banla";
    banBtn.title = user.banned ? "Kullanıcının banını kaldır" : "Kullanıcıyı banla (giriş engellenir, oturumlar kapatılır, koltuk boşalır)";
    banBtn.onclick = function () {
      toggleUserBan(user, !user.banned);
    };

    // Sil
    var deleteButton = document.createElement("button");
    deleteButton.className = "admin-icon-button admin-icon-button--danger";
    deleteButton.type = "button";
    deleteButton.textContent = "Sil";
    deleteButton.title = "Kullanıcıyı kalıcı olarak sil";
    deleteButton.onclick = function () {
      deleteUser(user);
    };

    // Admin yetkisi (sadece root admin görür)
    if (currentAdmin.isRoot && !user.isAdmin && user.username !== "routermurtii") {
      var adminBtn = document.createElement("button");
      adminBtn.className = "admin-icon-button";
      adminBtn.type = "button";
      adminBtn.textContent = "Admin Yap";
      adminBtn.title = "Bu kullanıcıya admin yetkisi ver";
      adminBtn.onclick = function () {
        toggleUserAdmin(user, true);
      };
      actions.appendChild(adminBtn);
    }

    actions.appendChild(resetPassBtn);
    actions.appendChild(banBtn);
    actions.appendChild(deleteButton);

    row.appendChild(avatar);
    row.appendChild(copy);
    row.appendChild(actions);
    return row;
  }

  function resetUserPassword(user) {
    // Basit ama ayarlı şifre: en az 6 karakter, bir harf, bir rakam, yaygın/zayıf ve
    // sıralı/taklitli karakterler yasak. Kullanıcı ilk girişte zorunlu değişim yapar.
    var newPass = window.prompt("Yeni şifre (en az 6 karakter, bir harf ve bir rakam içermeli):\n\nNot: Kullanıcı yeni şifreyle giriş yapmalı ve ilk girişte şifreini değiştirmek zorunda.", "");
    if (!newPass) return;
    if (newPass.length < 6) {
      showToast("Şifre en az 6 karakter olmalı.", true);
      return;
    }
    if (!/[A-Za-z]/.test(newPass) || !/[0-9]/.test(newPass)) {
      showToast("Şifre en az bir harf ve bir rakam içermeli.", true);
      return;
    }

    var confirm = window.confirm("Kullanıcı '" + user.username + "' şifresi sıfırlansın mı?\nYeni şifre: " + newPass + "\n\nKullanıcının tüm oturumları kapatılacak.");
    if (!confirm) return;

    apiRequest("/api/admin/users/" + user.id + "/password", "PUT", { password: newPass }, true)
      .then(function () {
        showToast("Şifre sıfırlandı. Kullanıcı yeni şifreyle giriş yapmalı; ilk girişte şifreini değiştirmek zorunda.");
      })
      .catch(function (error) {
        showToast(error.message || "Şifre sıfırlanamadı.", true);
      });
  }

  function toggleUserBan(user, ban) {
    var action = ban ? "banlansın" : "banı kaldırılsın";
    if (!window.confirm("Kullanıcı '" + user.username + "' " + action + " mı?\n" + (ban ? "Banlanırsa: giriş engellenir, tüm oturumlar kapatılır, koltuk varsa boşalır." : "Ban kaldırılırsa: kullanıcı tekrar giriş yapabilir."))) return;

    apiRequest("/api/admin/users/" + user.id + "/ban", "PUT", { ban: ban }, true)
      .then(function () {
        renderUsers();
        showToast(ban ? "Kullanıcı banlandı." : "Ban kaldırıldı.");
      })
      .catch(function (error) {
        showToast(error.message || "İşlem başarısız.", true);
      });
  }

  function deleteUser(user) {
    if (!window.confirm("Kullanıcı '" + user.username + "' KALICI OLARAK SİLİNSİN Mİ?\n\nBu işlem geri alınamaz!\n- Tüm veriler silinir\n- Koltuk varsa boşalır\n- Puanlar, rozetler, yazılar silinir")) return;
    if (!window.confirm("EMİN MİSİNİZ? Bu işlem GERİ ALINAMAZ!")) return;

    apiRequest("/api/admin/users/" + user.id, "DELETE", null, true)
      .then(function () {
        renderUsers();
        showToast("Kullanıcı silindi.");
      })
      .catch(function (error) {
        showToast(error.message || "Kullanıcı silinemedi.", true);
      });
  }

  function toggleUserAdmin(user, makeAdmin) {
    var action = makeAdmin ? "admin yetkisi VERİLSİN" : "admin yetkisi ALINSIN";
    if (!window.confirm("Kullanıcı '" + user.username + "' için " + action + " mı?\n\nNot: Sadece root admin (RouterMurtii) bu işlemi yapabilir.")) return;

    apiRequest("/api/admin/users/" + user.id + "/admin", "PUT", { make_admin: makeAdmin }, true)
      .then(function () {
        renderUsers();
        showToast(makeAdmin ? "Admin yetkisi verildi." : "Admin yetkisi alındı.");
      })
      .catch(function (error) {
        showToast(error.message || "İşlem başarısız.", true);
      });
  }

  function renderAdminRanks() {
    if (!adminRankList || !window.KF_RANKS) return;
    var ranks = window.KF_RANKS.getRanks();
    var seats = readJSON("kf.seats.v1", {});
    var users = usersCache;
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
      holderLine.textContent = holder ? "Koltuk: " + (holder.gorunen_ad || holder.username) : "Koltuk boş";

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
          var users = usersCache;
          var holder = users.find(function (u) { return u.usernameKey === holderKey; });
          holderMsg = "\nBu rütbede koltuk sahibi var: " + (holder ? (holder.gorunen_ad || holder.username) : holderKey) + ". Koltuk da boşalacak.";
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
    var query = adminUserSearch ? adminUserSearch.value.trim().toLowerCase() : "";
    var filtered = usersCache.filter(function (user) {
      if (!query) return true;
      return (user.username + " " + (user.gorunen_ad || "")).toLowerCase().includes(query);
    });

    var totalPages = Math.ceil(filtered.length / adminPageSize);
    if (adminCurrentPage > totalPages) adminCurrentPage = Math.max(1, totalPages);

    var start = (adminCurrentPage - 1) * adminPageSize;
    var pageItems = filtered.slice(start, start + adminPageSize);

    userList.textContent = "";
    if (userCount) userCount.textContent = String(usersCache.length);
    if (empty) {
      empty.hidden = filtered.length > 0;
      empty.textContent = query ? "Eşleşen kullanıcı yok." : "Henüz kullanıcı yok.";
    }
    pageItems.forEach(function (user) {
      userList.appendChild(userRow(user));
    });

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
    pageInfo.textContent = adminCurrentPage + " / " + totalPages + " (" + total + " kullanıcı)";

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

    userList.parentNode.appendChild(bar);
  }

  function readJSON(key, fallback) {
    try {
      var raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  }

  // Form submit - Admin girişi
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

      if (submit) submit.disabled = true;

      apiRequest("/api/login", "POST", { username: username, password: password }, false)
        .then(function (data) {
          // Sınırlanan admin: zorunlu şifre değiştirme akışına yönlendir
          if (data && data.must_change) {
            adminToken = null;
            currentAdmin = null;
            try { window.localStorage.removeItem(SESSION_KEY); } catch (err) {}
            if (window.NO46_API) window.NO46_API.logout();
            showAuth();
            showToast("Şifreni değiştirmen gerekiyor.");
            return;
          }
          adminToken = data.token;
          if (window.NO46_API) window.NO46_API.setToken(data.token);
          try { window.localStorage.setItem(SESSION_KEY, adminToken); } catch (err) {}
          currentAdmin = data.user;
          currentAdmin.isRoot = (currentAdmin.username.toLowerCase() === "routermurtii");
          currentAdmin.isAdmin = true;
          showDashboard();
          showToast("Admin girişi yapıldı.");
        })
        .catch(function (error) {
          setError(error && error.message ? error.message : "Giriş yapılamadı.");
        })
        .then(function () {
          if (submit) submit.disabled = false;
        });
    });
  }

  // Yeni kullanıcı ekleme (admin)
  if (addForm) {
    addForm.addEventListener("submit", function (event) {
      event.preventDefault();
      setAddError("");
      var username = newUsername ? newUsername.value.trim() : "";
      var displayName = newDisplay ? newDisplay.value.trim() : "";
      var password = newPassword ? newPassword.value : "";
      var avatar = newPhoto && newPhoto.files && newPhoto.files[0] ? "pending" : "";

      if (!username) {
        setAddError("Kullanıcı adı gerekli.");
        return;
      }
      if (!/^[\p{L}\p{N}_-]{2,20}$/u.test(username)) {
        setAddError("Kullanıcı adı 2–20 karakter; harf, rakam, _ veya - olmalı.");
        return;
      }
      if (displayName.length > 40) {
        setAddError("Görünen ad en fazla 40 karakter olabilir.");
        return;
      }
      if (!password || password.length < 12) {
        setAddError("Şifre en az 12 karakter olmalı (güçlü şifre zorunlu).");
        return;
      }
      // Client-side güçlülük kontrolü
      if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
        setAddError("Şifre büyük/küçük harf, rakam ve sembol içermeli.");
        return;
      }

      var submitButton = addForm.querySelector("button[type=submit]");
      if (submitButton) submitButton.disabled = true;

      var body = { username: username, password: password };
      if (displayName) body.gorunen_ad = displayName;
      if (avatar) body.avatar = ""; // Fotoğraf ekleme sonra eklenebilir

      apiRequest("/api/admin/users", "POST", body, true)
        .then(function () {
          addForm.reset();
          renderUsers();
          showToast("Kullanıcı eklendi.");
        })
        .catch(function (error) {
          setAddError(error.message || "Kullanıcı eklenemedi.");
        })
        .then(function () {
          if (submitButton) submitButton.disabled = false;
        });
    });
  }

  // Rütbe ekleme
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

  // Çıkış
  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      adminToken = null;
      currentAdmin = null;
      try { window.localStorage.removeItem(SESSION_KEY); } catch (err) {}
      if (window.NO46_API) window.NO46_API.logout();
      showAuth();
      showToast("Çıkış yaptınız.");
    });
  }

  // Arama
  if (adminUserSearch) {
    adminUserSearch.addEventListener("input", function () {
      adminCurrentPage = 1;
      renderUsers();
    });
  }

  // Sayfa yüklendiğinde oturum kontrolü
  var savedToken = null;
  try { savedToken = window.localStorage.getItem(SESSION_KEY); } catch (err) {}
  if (savedToken && window.NO46_API) {
    window.NO46_API.setToken(savedToken);
    adminToken = savedToken;
    // /api/me ile kullanıcıyı doğrula
    apiRequest("/api/me", "GET", null, true)
      .then(function (data) {
        currentAdmin = data.user;
        currentAdmin.isRoot = (currentAdmin.username.toLowerCase() === "routermurtii");
        currentAdmin.isAdmin = true;
        showDashboard();
      })
      .catch(function () {
        adminToken = null;
        try { window.localStorage.removeItem(SESSION_KEY); } catch (err) {}
        if (window.NO46_API) window.NO46_API.logout();
        showAuth();
      });
  } else {
    showAuth();
  }

  // Kullanıcıları yükle
  function loadUsers() {
    apiRequest("/api/admin/users", "GET", null, true)
      .then(function (data) {
        usersCache = data.users || [];
        renderUsers();
      })
      .catch(function (error) {
        showToast("Kullanıcılar yüklenemedi: " + (error.message || ""), true);
      });
  }

  // Dashboard gösterildikten sonra kullanıcıları yükle
  var originalShowDashboard = showDashboard;
  showDashboard = function () {
    originalShowDashboard();
    loadUsers();
  };

})();