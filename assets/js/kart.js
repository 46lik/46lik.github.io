/* =========================================================
   NO.46 — Kullanıcı kartı (hap + açılır panel)
   Veri: GET /api/ben
   ========================================================= */
(function () {
  "use strict";

  var chip = null, panel = null, cache = null;
  var RING_R = 17, RING_C = 2 * Math.PI * 17;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function clear(n) { if (n) n.textContent = ""; }
  function api(url, opts) {
    return fetch(url, opts || { credentials: "same-origin" }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok || d.ok === false) throw new Error(d.error || ("Hata (" + r.status + ")"));
        return d;
      });
    });
  }
  function csrf() {
    var m = document.cookie.match(/(?:^|;\s*)no46_csrf=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : "";
  }
  function avatarNode(avatar, initial, cls) {
    var box = el("span", cls);
    if (avatar) {
      var img = document.createElement("img");
      img.src = "/assets/img/avatar-" + avatar + ".svg";
      img.alt = "";
      box.appendChild(img);
    } else {
      box.textContent = (initial || "?").toLocaleUpperCase("tr-TR");
    }
    return box;
  }
  function ring(percent) {
    var wrap = el("span", "chip-ring");
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 40 40");
    var bg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    bg.setAttribute("class", "ring-bg"); bg.setAttribute("cx", "20"); bg.setAttribute("cy", "20"); bg.setAttribute("r", String(RING_R));
    var fg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    fg.setAttribute("class", "ring-fg"); fg.setAttribute("cx", "20"); fg.setAttribute("cy", "20"); fg.setAttribute("r", String(RING_R));
    fg.setAttribute("stroke-dasharray", String(RING_C));
    var off = RING_C * (1 - Math.max(0, Math.min(100, percent)) / 100);
    fg.setAttribute("stroke-dashoffset", String(off));
    svg.appendChild(bg); svg.appendChild(fg);
    wrap.appendChild(svg);
    return wrap;
  }

  function renderChip(d) {
    clear(chip);
    chip.hidden = false;
    chip.classList.add("chip");
    var u = d.user;
    var r = ring(d.yuzde);
    r.appendChild(avatarNode(u.avatar, u.username.charAt(0), "chip-avatar"));
    if (d.okunmamis > 0) r.appendChild(el("span", "chip-dot"));
    chip.appendChild(r);
    var text = el("span", "chip-text");
    text.appendChild(el("span", "chip-name", u.gorunen_ad));
    text.appendChild(el("span", "chip-rank", d.seviye.ad));
    chip.appendChild(text);
    chip.appendChild(el("span", "chip-points", "✦ " + d.puan + " puan"));
    chip.appendChild(el("span", "chip-arrow", "▾"));
    chip.setAttribute("aria-expanded", "false");
  }

  function buildPanel() {
    panel = el("div", "user-panel");
    panel.hidden = true;
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Kullanıcı paneli");
    document.body.appendChild(panel);
  }

  function section(label) {
    var s = el("div", "panel-section");
    s.appendChild(el("div", "panel-label", label));
    return s;
  }

  function renderPanel(d) {
    clear(panel);
    var u = d.user;
    var head = el("div", "panel-head");
    head.appendChild(avatarNode(u.avatar, u.username.charAt(0), "panel-avatar"));
    var id = el("div", "panel-id");
    id.appendChild(el("div", "panel-name", u.gorunen_ad));
    id.appendChild(el("div", "panel-rank", d.seviye.ad + " · " + d.seviye.bolge));
    id.appendChild(el("div", "panel-kademe", "KADEME " + d.seviye.seviye + " / 12"));
    head.appendChild(id);
    head.appendChild(el("div", "stamp", "ONAYLANDI"));
    panel.appendChild(head);

    // İlerleme
    var prog = section("Rütbe ilerlemesi");
    if (d.sonraki) {
      var top = el("div", "progress-top");
      var left = el("span"); left.appendChild(document.createTextNode("Sonraki: ")); left.appendChild(el("b", "", d.sonraki.ad));
      top.appendChild(left);
      top.appendChild(el("span", "", "✦ " + d.puan + " / " + d.hedef));
      prog.appendChild(top);
      var bar = el("div", "bar"); var fill = el("span"); fill.style.width = d.yuzde + "%"; bar.appendChild(fill);
      prog.appendChild(bar);
      prog.appendChild(el("div", "progress-note", d.kalan + " puan kaldı. " + (d.kalan > 0 ? "Çatlak genişliyor, az kaldı." : "")));
    } else {
      prog.appendChild(el("div", "seat-note", "Zirvedesin. Koltuk senin, göl senin, kimse ulaşamaz."));
    }
    panel.appendChild(prog);

    // İstatistik
    var st = section("İstatistik");
    var sg = el("div", "panel-stats");
    [["#", d.sira], ["Bu hafta", d.haftalik], ["Okunan", d.okunan]].forEach(function (x) {
      var b = el("div", "stat-box"); b.appendChild(el("b", "", String(x[1]))); b.appendChild(el("span", "", x[0])); sg.appendChild(b);
    });
    st.appendChild(sg);
    panel.appendChild(st);

    // Koltuk
    var seat = section(d.koltuk ? "Koltuk sigortası" : "Sıradaki koltuk");
    if (d.koltukBilgi && d.koltukBilgi.tur === "sigorta") {
      var bars = el("div", "seat-bars");
      for (var i = 0; i < d.koltukBilgi.sinir; i++) { var b = el("span", i < d.koltukBilgi.kalanGun ? "on" : ""); bars.appendChild(b); }
      seat.appendChild(bars);
      seat.appendChild(el("div", "seat-note", d.koltukBilgi.kalanGun + " / " + d.koltukBilgi.sinir + " gün. 3 gün girmezsen koltuk düşer, nilüfer yaprağı seni bekler."));
    } else if (d.koltukBilgi && d.koltukBilgi.tur === "siradaki") {
      var dur = d.koltukBilgi.durum;
      var t = d.koltukBilgi.rütbe + ": " + (dur && dur.dolu ? (dur.sahip + " tutuyor.") : "BOŞ KOLTUK.");
      seat.appendChild(el("div", "seat-note", t + " Puanın yetince kapı açık."));
    }
    panel.appendChild(seat);

    // Haberler
    var news = section("Haberler");
    if (!d.bildirimler.length) {
      news.appendChild(el("div", "seat-note", "Haber yok. Çatlak sessiz, bu iyiye işaret değil."));
    } else {
      d.bildirimler.forEach(function (b) {
        var row = el("div", "news-item" + (b.okundu ? " read" : ""));
        row.appendChild(el("span", "dot"));
        row.appendChild(document.createTextNode(b.metin));
        news.appendChild(row);
      });
    }
    panel.appendChild(news);

    // Hızlı işlemler
    var q = section("Hızlı işlemler");
    var qb = el("div", "quick");
    var links = [["Profilim", "/profil"], ["Rütbeler ve sıralama", "/rutbeler"], ["Ayarlar", "/ayarlar"]];
    links.forEach(function (l) {
      var a = el("a", "", l[0]); a.href = l[1]; a.setAttribute("data-route", l[1]); qb.appendChild(a);
    });
    var out = el("button", "danger", "Çıkış yap"); out.type = "button";
    out.addEventListener("click", function () {
      api("/api/logout", { method: "POST", credentials: "same-origin", headers: { "x-csrf-token": csrf() } })
        .catch(function () {}).then(function () { window.location.href = "/login"; });
    });
    qb.appendChild(out);
    q.appendChild(qb);
    panel.appendChild(q);
  }

  function openPanel() {
    if (!cache) return;
    renderPanel(cache);
    panel.hidden = false;
    chip.setAttribute("aria-expanded", "true");
    // okundu işaretle
    api("/api/bildirimler/okundu", { method: "POST", credentials: "same-origin", headers: { "x-csrf-token": csrf() } }).catch(function () {});
  }
  function closePanel() {
    if (!panel) return;
    panel.hidden = true;
    if (chip) chip.setAttribute("aria-expanded", "false");
  }
  function refresh() {
    return api("/api/ben").then(function (d) {
      cache = d.data;
      renderChip(cache);
      if (panel && !panel.hidden) renderPanel(cache);
    }).catch(function () {});
  }

  function mount() {
    chip = document.getElementById("user-chip");
    if (!chip) return;
    chip.classList.remove("profile-card");
    buildPanel();
    chip.addEventListener("click", function (e) {
      e.preventDefault();
      if (panel.hidden) { refresh().then(openPanel); } else { closePanel(); }
    });
    document.addEventListener("click", function (e) {
      if (!panel || panel.hidden) return;
      if (panel.contains(e.target) || chip.contains(e.target)) return;
      closePanel();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closePanel();
    });
    refresh();
  }

  window.KF_KART = { mount: mount, refresh: refresh };
})();