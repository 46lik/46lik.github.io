/* =========================================================
   NO.46 — Profilim (/profil, /profil/:kullanici)
   ========================================================= */
(function () {
  "use strict";

  var AVATARS = [
    ["", "Harf"], ["kafa", "Kafa"], ["kurbağa", "Kurbağa"], ["çatlak", "Çatlak"],
    ["ataç", "Ataç"], ["mühür", "Mühür"], ["çay", "Çay"], ["zımba", "Zımba"]
  ];
  var BADGE_ICON = {
    "ilk-giris": "🚪", "seri-7": "🔥", "seri-30": "🗓️", "yazi-10": "📚",
    "yazi-50": "📖", "test-bitti": "🧪", "ilk-koltuk": "🪑",
    "koltuk-dustu": "🕳️", "profil-tamam": "🧩"
  };

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
  function avatarNode(av, initial, cls) {
    var b = el("span", cls);
    if (av) { var i = document.createElement("img"); i.src = "/assets/img/avatar-" + av + ".svg"; i.alt = ""; b.appendChild(i); }
    else b.textContent = (initial || "?").toLocaleUpperCase("tr-TR");
    return b;
  }

  function render(username) {
    var root = document.getElementById("profil-root");
    if (!root) return;
    clear(root);
    root.appendChild(el("p", "muted", "Yükleniyor..."));
    var url = username ? ("/api/profil/" + encodeURIComponent(username)) : "/api/profil/" + encodeURIComponent("kendim");
    // kendi profili için /api/profil/:ad yerine /api/ben kullan (daha zengin)
    var req = username ? api(url) : api("/api/ben").then(function (d) { return { own: true, profil: d.data }; });
    req.then(function (data) {
      clear(root);
      var own = data.own;
      var p = data.profil;
      var u = p.user || p;
      var isim = u.gorunen_ad || u.username || p.username;

      var head = el("div", "page-head");
      var pageAvatar = avatarNode(u.avatar, (u.username || isim).charAt(0), "page-avatar");
      head.appendChild(pageAvatar);
      var idb = el("div");
      idb.appendChild(el("div", "page-title", isim));
      var meta = el("div", "page-meta");
      meta.appendChild(document.createTextNode((p.seviye ? p.seviye.ad : "") + (p.seviye ? " · Görev bölgesi: " + p.seviye.bolge : "")));
      idb.appendChild(meta);
      var meta2 = el("div", "page-meta", "Katılma: " + fmt(u.created_at) + (p.koltuk ? " · Koltuk: " + p.koltuk.ad : " · Koltuk yok"));
      idb.appendChild(meta2);
      if (p.sira) idb.appendChild(el("div", "page-meta", "Sıralama: #" + p.sira + " · Toplam puan: " + p.puan));
      head.appendChild(idb);
      root.appendChild(head);

      if (own) {
        var editCard = el("div", "panel-card");
        editCard.appendChild(el("div", "panel-label", "Avatar seç"));
        var grid = el("div", "avatar-grid");
        var secili = u.avatar || "";
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
        editCard.appendChild(grid);

        var tags = Array.isArray(u.uzmanlik) ? u.uzmanlik : (u.uzmanlik ? JSON.parse(u.uzmanlik) : []);
        try { if (typeof u.uzmanlik === "string" && u.uzmanlik) tags = JSON.parse(u.uzmanlik); } catch (e) {}
        var tagWrap = el("div", "field-block");
        var tagLabel = el("label", "", "Uzmanlık alanım (en fazla 3)");
        tagLabel.style.marginTop = "4px";
        tagWrap.appendChild(tagLabel);
        var tagRow = el("div", "tag-row");
        var tagInput = el("input", "input"); tagInput.maxLength = 20;
        var addBtn = el("button", "btn", "Ekle"); addBtn.type = "button";
        function drawTags() {
          clear(tagRow);
          // giriş üstte, eklenen etiketler altta
          tagRow.appendChild(tagInput); tagRow.appendChild(addBtn);
          tags.forEach(function (t, idx) {
            var chip = el("span", "tag-chip", t);
            var rm = el("button", "", "×"); rm.type = "button";
            rm.addEventListener("click", function () { tags.splice(idx, 1); drawTags(); });
            chip.appendChild(rm); tagRow.appendChild(chip);
          });
        }
        addBtn.addEventListener("click", function () {
          var v = tagInput.value.trim();
          if (v && tags.length < 3 && tags.indexOf(v) === -1) { tags.push(v); tagInput.value = ""; drawTags(); }
        });
        drawTags();
        tagWrap.appendChild(tagRow);
        tagWrap.appendChild(el("small", "field-hint", "3'den fazla yazma. Yorma bizi..."));
        editCard.appendChild(tagWrap);

        var tan = el("div", "field-block");
        tan.appendChild(el("label", "", "Kısa tanıtım (en fazla 200) — “Kafam şu konuda kırık”"));
        var ta = el("textarea", "textarea"); ta.maxLength = 200; ta.value = u.tanitim || "";
        tan.appendChild(ta);
        editCard.appendChild(tan);

        var saveRow = el("div", "btn-row");
        var save = el("button", "btn btn-primary", "Kaydet"); save.type = "button";
        var note = el("span", "save-note", "");
        saveRow.appendChild(save); saveRow.appendChild(note);
        editCard.appendChild(saveRow);
        save.addEventListener("click", function () {
          note.textContent = ""; note.classList.remove("err"); save.disabled = true;
          api("/api/profil", { method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json", "x-csrf-token": csrf() }, body: JSON.stringify({ uzmanlik: tags, tanitim: ta.value, avatar: secili }) })
            .then(function () {
              note.textContent = "✓ Kaydedildi";
              // üstteki avatarı yenilemeden güncelle
              clear(pageAvatar);
              if (secili) { var im = document.createElement("img"); im.src = "/assets/img/avatar-" + secili + ".svg"; im.alt = ""; pageAvatar.appendChild(im); }
              else pageAvatar.textContent = (u.username || isim).charAt(0).toLocaleUpperCase("tr-TR");
              if (window.KF_KART) window.KF_KART.refresh();
              document.dispatchEvent(new CustomEvent("kf-team-refresh"));
            })
            .catch(function (e) { note.textContent = e.message; note.classList.add("err"); })
            .then(function () { save.disabled = false; });
        });
        root.appendChild(editCard);
      } else {
        var info = el("div", "panel-card");
        if (u.uzmanlik) {
          var tg = el("div", "tag-row");
          try { (Array.isArray(u.uzmanlik) ? u.uzmanlik : JSON.parse(u.uzmanlik)).forEach(function (t) { tg.appendChild(el("span", "tag-chip", t)); }); } catch (e) {}
          info.appendChild(tg);
        }
        if (u.tanitim) info.appendChild(el("p", "seat-note", u.tanitim));
        if (!u.tanitim && !u.uzmanlik) info.appendChild(el("p", "muted", "Bu çatlak henüz kendini anlatmamış."));
        root.appendChild(info);
      }

      // İstatistikler (sadece kendi)
      if (own) {
        var st = el("div", "panel-card"); st.style.marginTop = "16px";
        st.appendChild(el("div", "panel-label", "İstatistik"));
        var sg = el("div", "stat-grid");
        [["Toplam puan", p.puan], ["Bu hafta", p.haftalik], ["Okunan yazı", p.okunan], ["Test bitti", p.test || 0], ["Üst üste giriş", p.seri]].forEach(function (x) {
          var b = el("div", "stat-box"); b.appendChild(el("b", "", String(x[1]))); b.appendChild(el("span", "", x[0])); sg.appendChild(b);
        });
        st.appendChild(sg);
        root.appendChild(st);

        // Rozetler
        var bd = el("div", "panel-card"); bd.style.marginTop = "16px";
        bd.appendChild(el("div", "panel-label", "Rozetler"));
        var bg = el("div", "badge-grid");
        var kazanilan = {}; (p.rozetler || []).forEach(function (r) { kazanilan[r.rozet] = true; });
        (p.rozetKatalog || []).forEach(function (r) {
          var varMi = !!kazanilan[r.anahtar];
          var b = el("div", "badge" + (varMi ? "" : " locked"));
          b.appendChild(el("div", "b-icon", BADGE_ICON[r.anahtar] || "★"));
          b.appendChild(el("div", "b-name", r.ad));
          b.title = r.aciklama || "";
          bg.appendChild(b);
        });
        bd.appendChild(bg);
        root.appendChild(bd);

        // Puan geçmişi
        var hh = el("div", "panel-card"); hh.style.marginTop = "16px";
        hh.appendChild(el("div", "panel-label", "Puan geçmişi (son 20)"));
        var list = el("div");
        (p.history || []).forEach(function (h) {
          var row = el("div", "history-row");
          var left = el("span"); left.appendChild(document.createTextNode(h.aciklama || h.tur)); left.appendChild(el("small", "", " " + fmt(h.created_at)));
          row.appendChild(left);
          row.appendChild(el("span", "amt", "+" + h.miktar));
          list.appendChild(row);
        });
        if (!(p.history || []).length) list.appendChild(el("p", "muted", "Henüz puan hareketi yok."));
        hh.appendChild(list);
        root.appendChild(hh);
      }
    }).catch(function (e) {
      clear(root);
      root.appendChild(el("p", "form-error", e.message));
    });
  }

  window.KF_PROFIL = { render: render };
})();