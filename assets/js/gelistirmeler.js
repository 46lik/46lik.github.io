/* =========================================================
   NO.46 — Geliştirmeler: durum takibi + kullanıcı önerileri
   ========================================================= */
(function () {
  "use strict";

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
  function fmt(ts) { try { return new Date(ts * 1000).toLocaleDateString("tr-TR"); } catch (e) { return ""; } }
  function auth(url, method, body) {
    return api(url, { method: method, credentials: "same-origin", headers: { "Content-Type": "application/json", "x-csrf-token": csrf() }, body: body ? JSON.stringify(body) : undefined });
  }

  var TUR = [
    ["Anasayfa", "Çatlak ekibin vitrini; manifestosu ve rastgele cümle burada."],
    ["No46", "Ekibin kendini anlattığı yazı alanı; kategori seç, yaz, yorum yap."],
    ["Ekip", "Kim bu ekip? Her üyenin kendine bakışı ve rozetleri."],
    ["Kültürel", "Psikoloji, kriminoloji, film, bilim... komik ama bilgilendirici yazılar."],
    ["Rütbeler", "12 kademe, koltuklar ve haftalık/genel sıralama."],
    ["Profil", "Avatar, uzmanlık, tanıtım, rozetler ve puan geçmişi."],
    ["Ayarlar", "Görünüm, güvenlik, bildirimler ve hesabı sil."]
  ];

  var state = { filtre: "tumu" };

  function render() {
    var root = document.getElementById("gelistirmeler-root");
    if (!root) return;
    clear(root);
    root.appendChild(el("p", "muted", "Yükleniyor..."));
    api("/api/gelistirmeler").then(function (data) {
      clear(root);
      var grid = el("div", "gel-grid");

      // SOL: geliştirme listesi
      var left = el("div", "gel-col");
      left.appendChild(el("div", "panel-label", "Yapılacaklar"));
      var tabs = el("div", "gel-tabs");
      [["tumu", "Tümü"], ["planlandi", "Planlandı"], ["gelistiriliyor", "Geliştiriliyor"]].forEach(function (t) {
        var b = el("button", "tab" + (state.filtre === t[0] ? " is-active" : ""), t[1]); b.type = "button";
        b.addEventListener("click", function () { state.filtre = t[0]; render(); });
        tabs.appendChild(b);
      });
      left.appendChild(tabs);

      var list = el("div", "gel-list");
      var filt = data.items.filter(function (it) { return state.filtre === "tumu" || it.durum === state.filtre; });
      if (!filt.length) list.appendChild(el("p", "muted", "Bu listede bir şey yok. Çatlak boşluğu sevmez."));
      filt.forEach(function (it) { list.appendChild(itemCard(it, data.isAdmin)); });
      left.appendChild(list);

      if (data.isAdmin) {
        var add = el("div", "gel-add");
        var inp = el("input", "input"); inp.placeholder = "Yeni geliştirme maddesi..."; inp.maxLength = 200;
        var btn = el("button", "btn", "Ekle"); btn.type = "button";
        var note = el("span", "save-note", "");
        var row = el("div", "btn-row"); row.appendChild(btn); row.appendChild(note);
        add.appendChild(inp); add.appendChild(row);
        btn.addEventListener("click", function () {
          var v = inp.value.trim(); if (v.length < 2) { note.textContent = "Başlık çok kısa."; return; }
          btn.disabled = true;
          auth("/api/gelistirmeler", "POST", { baslik: v }).then(function () { render(); }).catch(function (e) { note.textContent = e.message; btn.disabled = false; });
        });
        left.appendChild(add);
      }
      grid.appendChild(left);

      // SAĞ: öneri alanı
      var right = el("div", "gel-col");
      right.appendChild(el("div", "panel-label", "Geliştirme öner"));
      var intro = el("div", "gel-sugg");
      intro.appendChild(el("p", "", "Aşağıdaki butona bas, siteyi kısa bir tur ile tanı, sonra önerini yaz. Kaydedince öneriler listesine eklenir."));
      var openBtn = el("button", "btn btn-primary", "Geliştirme öner"); openBtn.type = "button";
      openBtn.addEventListener("click", function () { openOneri(); });
      intro.appendChild(openBtn);
      right.appendChild(intro);

      var yeni = data.oneriler.filter(function (o) { return o.durum === "yeni"; });
      var oneriList = el("div", "gel-list");
      var oneriWrap = el("div"); oneriWrap.appendChild(el("div", "panel-label", "Öneriler (" + yeni.length + ")"));
      if (!yeni.length) oneriWrap.appendChild(el("p", "muted", "Bekleyen öneri yok. Çatlak tüm önerileri plana aldı."));
      yeni.forEach(function (o) {
        var c = el("div", "gel-item");
        var top = el("div", "gel-item-top");
        top.appendChild(el("span", "gel-nick", o.username));
        top.appendChild(el("span", "gel-date", fmt(o.created_at)));
        c.appendChild(top);
        c.appendChild(el("p", "gel-text", o.metin));
        if (o.durum === "planlandi") c.appendChild(el("span", "gel-badge planlandi", "Planlandı"));
        if (data.isAdmin && o.durum !== "planlandi") {
          var b = el("button", "gel-planla", "Planlandı'ya çek"); b.type = "button";
          b.addEventListener("click", function () { auth("/api/oneriler/" + o.id + "/planla", "POST").then(function () { render(); }).catch(function (e) { alert(e.message); }); });
          c.appendChild(b);
        }
        oneriWrap.appendChild(c);
      });
      oneriList.appendChild(oneriWrap);
      right.appendChild(oneriList);

      grid.appendChild(right);
      root.appendChild(grid);
    }).catch(function (e) { clear(root); root.appendChild(el("p", "form-error", e.message)); });
  }

  function itemCard(it, isAdmin) {
    var c = el("div", "gel-item");
    var top = el("div", "gel-item-top");
    top.appendChild(el("span", "gel-status " + it.durum, it.durum === "gelistiriliyor" ? "Geliştiriliyor" : "Planlandı"));
    top.appendChild(el("span", "gel-date", fmt(it.created_at)));
    c.appendChild(top);
    c.appendChild(el("p", "gel-text", it.baslik));
    if (it.admin_not) c.appendChild(el("p", "gel-note", "Not: " + it.admin_not));
    if (isAdmin) {
      var ctrl = el("div", "gel-admin");
      var sel = el("select", "input gel-mini"); sel.style.maxWidth = "130px";
      [["planlandi", "Planlandı"], ["gelistiriliyor", "Geliştiriliyor"]].forEach(function (o) { var op = el("option", "", o[1]); op.value = o[0]; sel.appendChild(op); });
      sel.value = it.durum;
      var notInp = el("input", "input gel-mini"); notInp.value = it.admin_not || ""; notInp.placeholder = "Admin notu"; notInp.maxLength = 500;
      var save = el("button", "btn gel-mini-btn", "Kaydet"); save.type = "button";
      var row = el("div", "gel-admin-row"); row.appendChild(sel); row.appendChild(notInp); row.appendChild(save);
      save.addEventListener("click", function () {
        save.disabled = true;
        auth("/api/gelistirmeler/" + it.id, "PUT", { durum: sel.value, not: notInp.value }).then(function () { render(); }).catch(function (e) { alert(e.message); save.disabled = false; });
      });
      ctrl.appendChild(row);
      c.appendChild(ctrl);
    }
    return c;
  }

  function openOneri() {
    var dlg = document.getElementById("gel-oneri-dialog");
    if (!dlg) { buildDialog(); dlg = document.getElementById("gel-oneri-dialog"); }
    var body = document.getElementById("gel-oneri-body"); clear(body);
    TUR.forEach(function (t) {
      var row = el("div", "gel-tour-row");
      row.appendChild(el("b", "", t[0]));
      row.appendChild(el("span", "", t[1]));
      body.appendChild(row);
    });
    var ta = el("textarea", "textarea"); ta.placeholder = "Önerini yaz..."; ta.maxLength = 1000;
    var note = el("span", "save-note", "");
    var save = el("button", "btn btn-primary", "Kaydet"); save.type = "button";
    var row = el("div", "btn-row"); row.appendChild(save); row.appendChild(note);
    body.appendChild(ta); body.appendChild(row);
    save.addEventListener("click", function () {
      var v = ta.value.trim();
      if (v.length < 2) { note.textContent = "Öneri çok kısa."; return; }
      save.disabled = true; note.textContent = "";
      auth("/api/oneriler", "POST", { metin: v }).then(function () { dlg.close(); render(); }).catch(function (e) { note.textContent = e.message; save.disabled = false; });
    });
    dlg.showModal();
  }

  function buildDialog() {
    var dlg = el("dialog", "legal-dialog"); dlg.id = "gel-oneri-dialog";
    dlg.setAttribute("aria-labelledby", "gel-oneri-title");
    var inner = el("div", "legal-inner");
    var close = el("button", "dialog-close", "×"); close.type = "button"; close.setAttribute("data-legal-close", "");
    close.addEventListener("click", function () { dlg.close(); });
    inner.appendChild(close);
    inner.appendChild(el("p", "kicker", "ÖNERİ"));
    var h = el("h2", "", "Siteyi tanı, sonra önerini yaz"); h.id = "gel-oneri-title";
    inner.appendChild(h);
    var b = el("div", "legal-body"); b.id = "gel-oneri-body";
    inner.appendChild(b);
    dlg.appendChild(inner);
    document.body.appendChild(dlg);
  }

  window.KF_GELISTIRMELER = { render: render };
})();