/* =========================================================
   No46 — Topluluk: No46 sözlük + Kim bu ekip?
   Sunucu API'si ile konuşur; tüm metinler textContent ile yazılır.
   ========================================================= */
(function () {
  "use strict";

  var CATEGORY_LABELS = {
    "genel": "Genel",
    "goygoy": "Goygoy",
    "ciddi": "Ciddi meseleler",
    "kurbağa": "Kurbağa",
    "gereksiz": "Gereksiz bilgi"
  };

  var me = null; // { id, username, ... } | null

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function clear(node) { if (node) node.textContent = ""; }
  function csrf() {
    var m = document.cookie.match(/(?:^|;\s*)no46_csrf=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : "";
  }
  function api(url, options) {
    options = options || { credentials: "same-origin" };
    var method = (options.method || "GET").toUpperCase();
    if (method !== "GET") {
      options.headers = Object.assign({ "x-csrf-token": csrf() }, options.headers || {});
    }
    return fetch(url, options).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        if (!r.ok || data.ok === false) {
          var err = new Error(data.error || ("Sunucu hatası (" + r.status + ")"));
          err.status = r.status;
          throw err;
        }
        return data;
      });
    });
  }
  function formatDate(seconds) {
    if (!seconds) return "";
    try {
      return new Date(seconds * 1000).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch (e) { return ""; }
  }
  function ensureMe() {
    if (me) return Promise.resolve(me);
    return api("/api/me").then(function (data) { me = data.user || null; return me; })
      .catch(function () { me = null; return null; });
  }

  function avatar(av, initial) {
    var box = el("span", "post-avatar");
    if (av) {
      var img = document.createElement("img");
      img.src = "/assets/img/avatar-" + av + ".svg";
      img.alt = "";
      box.appendChild(img);
      box.style.overflow = "hidden";
    } else {
      box.textContent = (initial || "?").toLocaleUpperCase("tr-TR");
    }
    return box;
  }

  /* -------------------- No46 sözlük -------------------- */
  function renderNo46() {
    var root = document.getElementById("no46-root");
    if (!root) return;
    clear(root);
    ensureMe().then(function () {
      var canPost = !!me;

      var chips = el("div", "ekip-chips no46-chips");
      root.appendChild(chips);

      if (canPost) {
        var compose = el("div", "no46-compose");
        var select = el("select", "no46-select");
        Object.keys(CATEGORY_LABELS).forEach(function (key) {
          var opt = el("option", "", CATEGORY_LABELS[key]);
          opt.value = key;
          select.appendChild(opt);
        });
        var ta = el("textarea", "no46-textarea");
        ta.placeholder = "Bir şey yaz. Kategori seç, kafana göre dök.";
        ta.maxLength = 2000;
        var actions = el("div", "no46-compose-actions");
        var submit = el("button", "btn btn-primary", "Yaz");
        submit.type = "button";
        var note = el("span", "no46-form-note", "");
        actions.appendChild(submit);
        actions.appendChild(note);
        compose.appendChild(select);
        compose.appendChild(ta);
        compose.appendChild(actions);
        root.appendChild(compose);

        submit.addEventListener("click", function () {
          var body = ta.value.trim();
          if (body.length < 2) { note.textContent = "En az 2 karakter yaz, çatlak boşluğa dayanamıyor."; return; }
          note.textContent = "";
          submit.disabled = true;
          api("/api/posts", {
            method: "POST", credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ category: select.value, body: body })
          }).then(function () {
            ta.value = "";
            loadPosts(chips, root);
          }).catch(function (error) {
            note.textContent = error.message;
          }).then(function () { submit.disabled = false; });
        });
      } else {
        root.appendChild(el("p", "no46-login-note", "Yazmak için giriş yapmalısın. Kapı orada duruyor."));
      }

      var list = el("div", "post-list");
      root.appendChild(list);
      loadPosts(chips, root);
    });
  }

  var activeCategory = "";
  function loadPosts(chips, root) {
    var list = root.querySelector(".post-list");
    if (!list) return;
    clear(list);
    list.appendChild(el("p", "muted", "Yükleniyor..."));
    var url = activeCategory ? ("/api/posts?category=" + encodeURIComponent(activeCategory)) : "/api/posts";
    api(url).then(function (data) {
      clear(list);
      renderChips(chips, data.categories || Object.keys(CATEGORY_LABELS));
      var posts = data.posts || [];
      if (!posts.length) {
        list.appendChild(el("p", "muted", "Bu kategoride henüz yazı yok. İlk çatlağı sen at."));
        return;
      }
      posts.forEach(function (post) { list.appendChild(postCard(post, root)); });
    }).catch(function (error) {
      clear(list);
      list.appendChild(el("p", "form-error", error.message));
    });
  }

  function renderChips(chips, categories) {
    clear(chips);
    var all = el("button", "category-chip" + (!activeCategory ? " is-active" : ""), "Tümü");
    all.type = "button";
    all.addEventListener("click", function () { activeCategory = ""; renderNo46(); });
    chips.appendChild(all);
    categories.forEach(function (key) {
      var b = el("button", "category-chip" + (key === activeCategory ? " is-active" : ""), CATEGORY_LABELS[key] || key);
      b.type = "button";
      b.addEventListener("click", function () {
        activeCategory = key;
        var root = document.getElementById("no46-root");
        if (root) loadPosts(chips, root);
        renderChips(chips, categories);
      });
      chips.appendChild(b);
    });
  }

  function postCard(post, root) {
    var card = el("div", "post-card");
    var head = el("div", "post-head");
    head.appendChild(avatar(post.avatar, post.initial));
    var idBlock = el("div", "post-id");
    idBlock.appendChild(el("span", "post-author", post.username));
    idBlock.appendChild(el("span", "post-date", formatDate(post.created_at)));
    head.appendChild(idBlock);
    head.appendChild(el("span", "post-tag", CATEGORY_LABELS[post.category] || post.category));
    card.appendChild(head);
    card.appendChild(el("p", "post-body", post.body));

    var toggle = el("button", "post-comments-toggle", "Yorumlar (" + (post.comment_count || 0) + ")");
    toggle.type = "button";
    card.appendChild(toggle);
    var commentsBox = el("div", "post-comments");
    commentsBox.hidden = true;
    card.appendChild(commentsBox);

    var loaded = false;
    toggle.addEventListener("click", function () {
      commentsBox.hidden = !commentsBox.hidden;
      toggle.setAttribute("aria-expanded", String(!commentsBox.hidden));
      if (!commentsBox.hidden && !loaded) { loaded = true; loadComments(post.id, commentsBox); }
    });
    return card;
  }

  function loadComments(postId, box) {
    clear(box);
    box.appendChild(el("p", "muted", "Yorumlar yükleniyor..."));
    ensureMe().then(function () {
      return api("/api/posts/" + postId + "/comments");
    }).then(function (data) {
      clear(box);
      var comments = data.comments || [];
      if (!comments.length) box.appendChild(el("p", "muted", "İlk yorumu sen yap. Kimse bakmazsa da yazı kalır."));
      comments.forEach(function (c) {
        var row = el("div", "comment");
        var meta = el("div", "comment-meta");
        meta.appendChild(el("span", "comment-author", c.username));
        meta.appendChild(el("span", "comment-date", formatDate(c.created_at)));
        row.appendChild(meta);
        row.appendChild(el("p", "comment-body", c.body));
        box.appendChild(row);
      });
      if (me) {
        var form = el("div", "comment-form");
        var ta = el("textarea", "no46-textarea comment-textarea");
        ta.placeholder = "Yorumunu yaz...";
        ta.maxLength = 1000;
        var btn = el("button", "btn", "Yorum yap");
        btn.type = "button";
        var note = el("span", "no46-form-note", "");
        var actions = el("div", "no46-compose-actions");
        actions.appendChild(btn);
        actions.appendChild(note);
        form.appendChild(ta);
        form.appendChild(actions);
        box.appendChild(form);
        btn.addEventListener("click", function () {
          var body = ta.value.trim();
          if (!body) { note.textContent = "Boş yorum olmaz, o da bir yazı sayılır."; return; }
          note.textContent = "";
          btn.disabled = true;
          api("/api/posts/" + postId + "/comments", {
            method: "POST", credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body: body })
          }).then(function () {
            ta.value = "";
            loadComments(postId, box);
          }).catch(function (error) { note.textContent = error.message; })
            .then(function () { btn.disabled = false; });
        });
      }
    }).catch(function (error) {
      clear(box);
      box.appendChild(el("p", "form-error", error.message));
    });
  }

  /* -------------------- Kim bu ekip? -------------------- */
  function renderTeam() {
    var root = document.getElementById("team-root");
    if (!root) return;
    clear(root);
    ensureMe().then(function () {
      var grid = el("div", "team-grid");
      root.appendChild(grid);
      grid.appendChild(el("p", "muted", "Yükleniyor..."));
      api("/api/team").then(function (data) {
        clear(grid);
        var members = data.members || [];
        if (!members.length) { grid.appendChild(el("p", "muted", "Ekip henüz kimse yok. Tuhaf.")); return; }
        members.forEach(function (m) { grid.appendChild(memberCard(m)); });
      }).catch(function (error) {
        clear(grid);
        grid.appendChild(el("p", "form-error", error.message));
      });
    });
  }

  function memberCard(member) {
    var card = el("div", "team-card");
    var head = el("div", "team-head");
    head.appendChild(avatar(member.avatar, member.initial));
    var idBlock = el("div", "team-id");
    idBlock.appendChild(el("span", "team-name", member.gorunen_ad || member.username));
    idBlock.appendChild(el("span", "team-date", "katıldı " + formatDate(member.created_at)));
    head.appendChild(idBlock);
    card.appendChild(head);

    var isMe = me && me.id === member.id;
    var bioText = (member.bio && member.bio.trim()) ? member.bio : "Henüz kendini anlatmamış. Çatlak ama yazmıyor.";
    card.appendChild(el("p", "team-bio", bioText));

    if (isMe) {
      var editBtn = el("button", "team-edit-btn", "Kendine bakışını düzenle");
      editBtn.type = "button";
      card.appendChild(editBtn);
      var editor = el("div", "team-editor");
      editor.hidden = true;
      var ta = el("textarea", "no46-textarea");
      ta.maxLength = 1000;
      ta.value = member.bio || "";
      ta.placeholder = "Kendine bakışını yaz...";
      var actions = el("div", "no46-compose-actions");
      var save = el("button", "btn btn-primary", "Kaydet");
      save.type = "button";
      var cancel = el("button", "btn", "Vazgeç");
      cancel.type = "button";
      var note = el("span", "no46-form-note", "");
      actions.appendChild(save);
      actions.appendChild(cancel);
      actions.appendChild(note);
      editor.appendChild(ta);
      editor.appendChild(actions);
      card.appendChild(editor);

      editBtn.addEventListener("click", function () {
        editor.hidden = !editor.hidden;
        if (!editor.hidden) ta.focus();
      });
      cancel.addEventListener("click", function () { editor.hidden = true; });
      save.addEventListener("click", function () {
        var bio = ta.value.trim();
        note.textContent = "";
        save.disabled = true;
        api("/api/me/bio", {
          method: "PUT", credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bio: bio })
        }).then(function () {
          var bioEl = card.querySelector(".team-bio");
          if (bioEl) bioEl.textContent = bio || "Henüz kendini anlatmamış. Çatlak ama yazmıyor.";
          editor.hidden = true;
        }).catch(function (error) { note.textContent = error.message; })
          .then(function () { save.disabled = false; });
      });
    }
    return card;
  }

  window.KF_COMMUNITY = { renderNo46: renderNo46, renderTeam: renderTeam };
  document.addEventListener("kf-team-refresh", function () {
    var view = document.getElementById("view-team");
    var root = document.getElementById("team-root");
    if (root && view && !view.hidden) renderTeam();
    var nv = document.getElementById("view-no46");
    if (nv && !nv.hidden) renderNo46();
  });
})();