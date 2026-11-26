/* =========================================================
   NO.46 — Rütbeler ve sıralama (/rutbeler)
   ========================================================= */
(function () {
  "use strict";

  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x !== undefined) n.textContent = x; return n; }
  function clear(n) { if (n) n.textContent = ""; }
  function api(url) {
    return fetch(url, { credentials: "same-origin" }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok || d.ok === false) throw new Error(d.error || ("Hata (" + r.status + ")"));
        return d;
      });
    });
  }
  function avatarNode(av, initial, cls) {
    var b = el("span", cls);
    if (av) { var i = document.createElement("img"); i.src = "/assets/img/avatar-" + av + ".svg"; i.alt = ""; b.appendChild(i); }
    else b.textContent = (initial || "?").toLocaleUpperCase("tr-TR");
    return b;
  }

  var state = { donem: "genel", sayfa: 1 };

  function renderLadder(data) {
    var wrap = el("div", "ladder");
    data.ranks.slice().sort(function (a, b) { return b.seviye - a.seviye; }).forEach(function (r) {
      var row = el("div", "ladder-row" + (r.seviye === data.benimSeviyem ? " is-me" : ""));
      row.appendChild(el("div", "ladder-no", String(r.seviye).padStart(2, "0")));
      var mid = el("div");
      mid.appendChild(el("div", "ladder-title", r.ad));
      mid.appendChild(el("div", "ladder-region", r.bolge + " · " + r.puan + " puan"));
      row.appendChild(mid);
      var seat = el("div", "ladder-seat");
      if (r.seviye === 1) {
        seat.appendChild(el("div", "", "Herkesin başlangıç rütbesi, koltuk sınırı yok"));
      } else if (r.koltuk) {
        seat.appendChild(el("div", "", "🪑 " + r.koltuk.sahip));
      } else {
        seat.appendChild(el("div", "empty", "BOŞ KOLTUK"));
        if (r.siraAday) seat.appendChild(el("div", "", "Sıradaki: " + r.siraAday.username + " (" + r.siraAday.puan + ")"));
      }
      row.appendChild(seat);
      wrap.appendChild(row);
    });
    return wrap;
  }

  function renderLeader() {
    var box = el("div");
    box.appendChild(el("p", "muted", "Yükleniyor..."));
    api("/api/siralama?donem=" + state.donem + "&sayfa=" + state.sayfa).then(function (data) {
      clear(box);
      var tabs = el("div", "tabs");
      [["genel", "Genel"], ["hafta", "Bu hafta"]].forEach(function (t) {
        var b = el("button", "tab" + (state.donem === t[0] ? " is-active" : ""), t[1]); b.type = "button";
        b.addEventListener("click", function () { state.donem = t[0]; state.sayfa = 1; renderLeaderInto(box); });
        tabs.appendChild(b);
      });
      box.appendChild(tabs);
      data.liste.forEach(function (r) {
        var row = el("div", "leader-row" + (r.isMe ? " is-me" : ""));
        row.appendChild(el("div", "l-sira", "#" + r.sira));
        row.appendChild(avatarNode(r.avatar, r.username.charAt(0), "l-avatar"));
        var mid = el("div");
        mid.appendChild(el("div", "l-ad", r.username));
        mid.appendChild(el("div", "l-rutbe", r.seviye.ad + (r.koltuk ? "  🪑" : "")));
        row.appendChild(mid);
        row.appendChild(el("div", "l-puan", "✦ " + r.puan));
        box.appendChild(row);
      });
      if (data.sayfaSayisi > 1) {
        var pager = el("div", "pager");
        var prev = el("button", "btn", "← Önceki"); prev.type = "button"; prev.disabled = state.sayfa <= 1;
        prev.addEventListener("click", function () { state.sayfa--; renderLeaderInto(box); });
        var next = el("button", "btn", "Sonraki →"); next.type = "button"; next.disabled = state.sayfa >= data.sayfaSayisi;
        next.addEventListener("click", function () { state.sayfa++; renderLeaderInto(box); });
        pager.appendChild(prev); pager.appendChild(el("span", "muted", " " + state.sayfa + " / " + data.sayfaSayisi + " ")); pager.appendChild(next);
        box.appendChild(pager);
      }
    }).catch(function (e) { clear(box); box.appendChild(el("p", "form-error", e.message)); });
  }
  function renderLeaderInto(box) {
    var fresh = el("div");
    renderLeaderInto.target = box;
    // basit: içeriği yenile
    api("/api/siralama?donem=" + state.donem + "&sayfa=" + state.sayfa).then(function (data) {
      clear(box);
      var tabs = el("div", "tabs");
      [["genel", "Genel"], ["hafta", "Bu hafta"]].forEach(function (t) {
        var b = el("button", "tab" + (state.donem === t[0] ? " is-active" : ""), t[1]); b.type = "button";
        b.addEventListener("click", function () { state.donem = t[0]; state.sayfa = 1; renderLeaderInto(box); });
        tabs.appendChild(b);
      });
      box.appendChild(tabs);
      data.liste.forEach(function (r) {
        var row = el("div", "leader-row");
        row.appendChild(el("div", "l-sira", "#" + r.sira));
        row.appendChild(avatarNode(r.avatar, r.username.charAt(0), "l-avatar"));
        var mid = el("div"); mid.appendChild(el("div", "l-ad", r.username)); mid.appendChild(el("div", "l-rutbe", r.seviye.ad + (r.koltuk ? "  🪑" : "")));
        row.appendChild(mid); row.appendChild(el("div", "l-puan", "✦ " + r.puan));
        box.appendChild(row);
      });
      if (data.sayfaSayisi > 1) {
        var pager = el("div", "pager");
        var prev = el("button", "btn", "← Önceki"); prev.type = "button"; prev.disabled = state.sayfa <= 1;
        prev.addEventListener("click", function () { state.sayfa--; renderLeaderInto(box); });
        var next = el("button", "btn", "Sonraki →"); next.type = "button"; next.disabled = state.sayfa >= data.sayfaSayisi;
        next.addEventListener("click", function () { state.sayfa++; renderLeaderInto(box); });
        pager.appendChild(prev); pager.appendChild(el("span", "muted", " " + state.sayfa + " / " + data.sayfaSayisi + " ")); pager.appendChild(next);
        box.appendChild(pager);
      }
    });
  }

  function render() {
    var root = document.getElementById("rutbeler-root");
    if (!root) return;
    clear(root);
    root.appendChild(el("p", "muted", "Yükleniyor..."));
    api("/api/rutbeler").then(function (data) {
      clear(root);
      var ladderCard = el("div", "panel-card");
      ladderCard.appendChild(el("div", "panel-label", "Rütbe Merdiveni"));
      ladderCard.appendChild(renderLadder(data));
      root.appendChild(ladderCard);

      var leaderCard = el("div", "panel-card"); leaderCard.style.marginTop = "16px";
      leaderCard.appendChild(el("div", "panel-label", "Sıralama"));
      var leaderBox = el("div");
      leaderCard.appendChild(leaderBox);
      root.appendChild(leaderCard);
      renderLeaderInto(leaderBox);

      var rules = el("details", "panel-card rules-box"); rules.style.marginTop = "16px";
      var sum = el("summary", "", "Kurallar (kimse okumaz ama yazalım)"); sum.style.cursor = "pointer"; sum.style.color = "var(--yazi)";
      rules.appendChild(sum);
      rules.appendChild(el("h4", "", "Puan nasıl kazanılır?"));
      rules.appendChild(el("p", "", data.kurallar.puan));
      rules.appendChild(el("h4", "", "Koltuk kuralı"));
      rules.appendChild(el("p", "", data.kurallar.koltuk));
      rules.appendChild(el("h4", "", "3 gün kuralı"));
      rules.appendChild(el("p", "", data.kurallar["uc-gun"]));
      root.appendChild(rules);
    }).catch(function (e) { clear(root); root.appendChild(el("p", "form-error", e.message)); });
  }

  window.KF_RUTBELER = { render: render };
})();