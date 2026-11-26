/* =========================================================
   NO.46 — Ayarlar (/ayarlar)
   ========================================================= */
(function () {
  "use strict";

  var AVATARS = [["", "Harf"], ["kafa", "Kafa"], ["kurbağa", "Kurbağa"], ["çatlak", "Çatlak"], ["ataç", "Ataç"], ["mühür", "Mühür"], ["çay", "Çay"], ["zımba", "Zımba"]];

  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x !== undefined) n.textContent = x; return n; }
  function clear(n) { if (n) n.textContent = ""; }
  function api(url, opts) {
    return fetch(url, opts || { credentials: "same-origin" }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok || d.ok === false) throw new Error(d.error || ("Hata (" + r.status + ")"));
        return d;
      });
    });
  }
  function csrf() { var m = document.cookie.match(/(?:^|;\s*)no46_csrf=([^;]+)/); return m ? decodeURIComponent(m[1]) : ""; }
  function avatarNode(av, initial, cls) {
    var b = el("span", cls);
    if (av) { var i = document.createElement("img"); i.src = "/assets/img/avatar-" + av + ".svg"; i.alt = ""; b.appendChild(i); }
    else b.textContent = (initial || "?").toLocaleUpperCase("tr-TR");
    return b;
  }
  function switchRow(label, checked, onChange) {
    var row = el("div", "switch-row");
    row.appendChild(el("span", "s-label", label));
    var sw = el("label", "switch");
    var inp = document.createElement("input"); inp.type = "checkbox"; inp.checked = !!checked;
    var track = el("span", "track");
    sw.appendChild(inp); sw.appendChild(track);
    inp.addEventListener("change", function () { onChange(inp.checked); });
    row.appendChild(sw);
    return row;
  }
  function noteEl() { return el("span", "save-note", ""); }
  function setNote(n, msg, err) { n.textContent = msg; n.classList.toggle("err", !!err); }

  function render() {
    var root = document.getElementById("ayarlar-root");
    if (!root) return;
    clear(root);
    root.appendChild(el("p", "muted", "Yükleniyor..."));
    api("/api/ben").then(function (d) {
      var u = d.data.user;
      clear(root);

      // Görünüm
      var gorunum = el("div", "settings-section");
      gorunum.appendChild(el("h3", "", "Görünüm"));
      var azalt = localStorage.getItem("kf.anim.azalt") === "1";
      gorunum.appendChild(switchRow("Animasyonları azalt", azalt, function (on) {
        localStorage.setItem("kf.anim.azalt", on ? "1" : "0");
        document.documentElement.classList.toggle("azalt-anim", on);
      }));
      document.documentElement.classList.toggle("azalt-anim", azalt);
      root.appendChild(gorunum);

      // Profil görünümü
      var pg = el("div", "settings-section");
      pg.appendChild(el("h3", "", "Profil görünümü"));
      var adBlock = el("div", "field-block");
      adBlock.appendChild(el("label", "", "Görünen ad (benzersiz, 3–20, ayda 1 kez)"));
      var adInput = el("input", "input"); adInput.value = u.gorunen_ad || u.username; adInput.maxLength = 20;
      adBlock.appendChild(adInput);
      pg.appendChild(adBlock);

      var avBlock = el("div", "field-block");
      avBlock.appendChild(el("label", "", "Avatar"));
      var grid = el("div", "avatar-grid"); var secili = u.avatar || "";
      AVATARS.forEach(function (a) {
        var opt = el("div", "avatar-opt" + (a[0] === secili ? " is-active" : ""));
        opt.appendChild(a[0] ? avatarNode(a[0], "", "avatar-initial") : el("span", "avatar-initial", (u.username || "?").charAt(0).toLocaleUpperCase("tr-TR")));
        opt.title = a[1];
        opt.addEventListener("click", function () {
          secili = a[0];
          Array.prototype.forEach.call(grid.children, function (c) { c.classList.remove("is-active"); });
          opt.classList.add("is-active");
        });
        grid.appendChild(opt);
      });
      avBlock.appendChild(grid);
      pg.appendChild(avBlock);

      pg.appendChild(switchRow("Sıralamada anonim görün", u.anonim, function () {}));
      var pgNote = noteEl();
      var pgSave = el("div", "btn-row");
      var pgBtn = el("button", "btn btn-primary", "Kaydet"); pgBtn.type = "button";
      pgSave.appendChild(pgBtn); pgSave.appendChild(pgNote);
      pg.appendChild(pgSave);
      pgBtn.addEventListener("click", function () {
        var anonim = pg.querySelector(".switch input").checked;
        setNote(pgNote, ""); pgBtn.disabled = true;
        api("/api/ayarlar", { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json", "x-csrf-token": csrf() }, body: JSON.stringify({ gorunen_ad: adInput.value, avatar: secili, anonim: anonim }) })
          .then(function () { setNote(pgNote, "✓ Kaydedildi"); if (window.KF_KART) window.KF_KART.refresh(); document.dispatchEvent(new CustomEvent("kf-team-refresh")); })
          .catch(function (e) { setNote(pgNote, e.message, true); })
          .then(function () { pgBtn.disabled = false; });
      });
      root.appendChild(pg);

      // Güvenlik
      var guven = el("div", "settings-section");
      guven.appendChild(el("h3", "", "Güvenlik"));
      var eski = el("input", "input"); eski.type = "password"; eski.placeholder = "Eski şifre";
      var yeni = el("input", "input"); yeni.type = "password"; yeni.placeholder = "Yeni şifre (en az 10)";
      var tekrar = el("input", "input"); tekrar.type = "password"; tekrar.placeholder = "Yeni şifre tekrar";
      [eski, yeni, tekrar].forEach(function (i) { var b = el("div", "field-block"); b.appendChild(i); guven.appendChild(b); });
      var sifreNote = noteEl();
      var sifreRow = el("div", "btn-row");
      var sifreBtn = el("button", "btn", "Şifre değiştir"); sifreBtn.type = "button";
      sifreRow.appendChild(sifreBtn); sifreRow.appendChild(sifreNote);
      guven.appendChild(sifreRow);
      sifreBtn.addEventListener("click", function () {
        setNote(sifreNote, "");
        if (yeni.value !== tekrar.value) { setNote(sifreNote, "Yeni şifreler eşleşmiyor.", true); return; }
        sifreBtn.disabled = true;
        api("/api/sifre-degistir", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json", "x-csrf-token": csrf() }, body: JSON.stringify({ eski: eski.value, yeni: yeni.value }) })
          .then(function () { setNote(sifreNote, "✓ Kaydedildi. Diğer oturumlar kapatıldı."); eski.value = yeni.value = tekrar.value = ""; })
          .catch(function (e) { setNote(sifreNote, e.message, true); })
          .then(function () { sifreBtn.disabled = false; });
      });
      var cikisRow = el("div", "btn-row");
      var tumBtn = el("button", "btn btn-danger", "Tüm cihazlardan çıkış yap"); tumBtn.type = "button";
      tumBtn.addEventListener("click", function () {
        api("/api/tum-oturumlari-kapat", { method: "POST", credentials: "same-origin", headers: { "x-csrf-token": csrf() } })
          .catch(function () {}).then(function () { window.location.href = "/login"; });
      });
      cikisRow.appendChild(tumBtn);
      guven.appendChild(cikisRow);
      root.appendChild(guven);

      // Bildirimler
      var bild = el("div", "settings-section");
      bild.appendChild(el("h3", "", "Bildirimler"));
      var siteIci = localStorage.getItem("kf.bildirim.site") !== "0";
      bild.appendChild(switchRow("Site içi bildirimler (koltuk, rütbe)", siteIci, function (on) {
        localStorage.setItem("kf.bildirim.site", on ? "1" : "0");
      }));
      bild.appendChild(el("p", "page-meta", "E-posta bildirimi yok. Çatlak e-posta atmıyor."));
      root.appendChild(bild);

      // Hesabı sil
      var sil = el("div", "settings-section danger-zone");
      sil.appendChild(el("h3", "", "Hesabı sil"));
      sil.appendChild(el("p", "", "Hesabını kalıcı olarak silmek için şifreni ve kullanıcı adını gir. Bu işlem geri alınamaz; puanların, profilin, bildirimlerin ve rozetlerin silinir, koltuğun boşaltılır."));
      var silAd = el("input", "input"); silAd.placeholder = "Kullanıcı adını yaz";
      var silSifre = el("input", "input"); silSifre.type = "password"; silSifre.placeholder = "Şifre";
      [silAd, silSifre].forEach(function (i) { var b = el("div", "field-block"); b.appendChild(i); sil.appendChild(b); });
      var silNote = noteEl();
      var silRow = el("div", "btn-row");
      var silBtn = el("button", "btn btn-danger", "Hesabımı kalıcı olarak sil"); silBtn.type = "button";
      silRow.appendChild(silBtn); silRow.appendChild(silNote);
      sil.appendChild(silRow);
      silBtn.addEventListener("click", function () {
        setNote(silNote, "");
        if (silAd.value.trim().toLowerCase() !== (u.username || "").toLowerCase()) { setNote(silNote, "Kullanıcı adı eşleşmiyor.", true); return; }
        silBtn.disabled = true;
        api("/api/hesap", { method: "DELETE", credentials: "same-origin", headers: { "Content-Type": "application/json", "x-csrf-token": csrf() }, body: JSON.stringify({ username: silAd.value, sifre: silSifre.value }) })
          .catch(function (e) { setNote(silNote, e.message, true); silBtn.disabled = false; })
          .then(function (r) { if (r) window.location.href = "/login"; });
      });
      root.appendChild(sil);
    }).catch(function (e) { clear(root); root.appendChild(el("p", "form-error", e.message)); });
  }

  window.KF_AYARLAR = { render: render };
})();