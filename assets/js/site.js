(function () {
  "use strict";

  var state = {
    articles: null,
    random: null,
    test: null,
    lastShown: [],
    testIndex: 0,
    testAnswers: []
  };

  var API_BASE = (window.KF_CONFIG && window.KF_CONFIG.cloud && window.KF_CONFIG.cloud.apiBase)
    ? String(window.KF_CONFIG.cloud.apiBase).replace(/\/+$/, "")
    : "";

  var CATEGORY_LABELS = {
    "psikoloji": "Psikoloji",
    "hayvan-bilim": "Hayvan bilim",
    "kriminoloji": "Kriminoloji",
    "bilisim": "Bilişim",
    "film": "Film",
    "dizi": "Dizi",
    "fizik-tedavi": "Fizik tedavi",
    "osb": "OSB",
    "gereksiz-bilgiler": "Gereksiz bilgiler"
  };

  var PLACEHOLDERS = {
    "/bolumler": {
      kicker: "BÖLÜMLER",
      title: "Bölümler hâlâ kırık.",
      text: "Burası yapım aşamasında. Kafalar hâlâ kırık, ama bölüm başlıkları düzgün duruyor. Biraz daha kurcalayınca açılacak."
    },
    "/projeler": {
      kicker: "PROJELER",
      title: "Projeler masada, ayakları yok.",
      text: "Bir şeyler kurcalıyoruz. Bazısı çalışıyor, bazısı sadece masada duruyor. Proje dosyaları gelince burası dolacak."
    },
    "/gelistirmeler": {
      kicker: "GELİŞTİRMELER",
      title: "Kırık yerleri yamıyoruz.",
      text: "Yamalar da kırık olabilir. Geliştirmeler burada listelenecek; şimdilik sadece iyi niyet var."
    }
  };

  var EKIP_ENTRIES = [
    {
      title: "herbokolog uz",
      entries: [
        { nick: "çatlak_46", date: "25.11.2026", text: "Her konuda goygoy yapar, yeri geldiğinde ciddi ciddi konuşur ama o ciddiyet bile bir tık şüpheli. Ekibin bilgi kaynağı değil, bilgi kirliliğinin de kaynağı değil; arada bir yerde durur." },
        { nick: "gözlemci", date: "24.11.2026", text: "Bir şey anlatırken anlattığından emin olamazsın ama anlattığı şey genelde işe yarar. Not: Kendisi bu maddeyi okursa 'ben böyle değilim' diyecek, o yüzden böyleyim." }
      ]
    },
    {
      title: "kurbağacı",
      entries: [
        { nick: "nilüfer", date: "23.11.2026", text: "Kurbağa felsefesine gereğinden fazla ilgi duyan kişi. Bir kurbağaya baktığında diğerleri bir problem görür, o bir vizyon görür. Vizyonun ne olduğu hâlâ net değil." },
        { nick: "çatlak_46", date: "22.11.2026", text: "Ekibe 'şu konuda biraz durup düşünelim' dediğinde herkes aynı şeyi düşünür: kurbağa. Bu bir tesadüf değil, artık bir yönetmelik." }
      ]
    },
    {
      title: "pırlanta ustası",
      entries: [
        { nick: "gözlemci", date: "21.11.2026", text: "Kimsenin anlamadığı bir işi, kimsenin anlamayacağı bir incelikle yapar. Sonuç güzeldir ama nasıl olduğunu sorduğunda cevap bir başka soru olur." },
        { nick: "yönetmen_yetmez", date: "20.11.2026", text: "Bir projeye 'hadi yapalım' diyen kişidir. Proje bazen biter, bazen masada kalır. Masada kalanlar da bir yere kadar sanat eseri sayılır." }
      ]
    },
    {
      title: "çatlak kafa sendromu (ekip geneli)",
      entries: [
        { nick: "sistem", date: "19.11.2026", text: "Kafası kırık ama bir konuda iyi. Boş yapmayı da bir uzmanlık olarak icra eder. Ortak özellik: herkes bir şeyi kendi emeğiyle, kurcalaya kurcalaya öğrenmiş. Kimse öğretmedi, merak etti, bozdu, öğrendi." }
      ]
    }
  ];

  function $(selector, scope) { return (scope || document).querySelector(selector); }
  function $all(selector, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(selector)); }
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function clear(node) { if (node) node.textContent = ""; }
  function navigate(path) {
    if (history.pushState) history.pushState({}, "", path);
    $all(".nav-item.open").forEach(function (item) {
      item.classList.remove("open");
      var t = item.querySelector(".nav-chevron");
      if (t) t.setAttribute("aria-expanded", "false");
    });
    renderRoute();
    window.scrollTo(0, 0);
  }
  function bridgeFrogSession(user) {
    if (!user) return;
    // API tabanlı oturum; sahte localStorage yazısı yapma
  }
  function refreshUser() {
    if (!API_BASE) return;
    fetch(API_BASE + "?action=me", { credentials: "include" }).then(function (response) {
      if (!response.ok) {
        return null;
      }
      return response.json();
    }).then(function (result) {
      if (result && result.user) {
        window.__KF_USER = result.user;
        if (window.KF_AUTH_SET_USER) window.KF_AUTH_SET_USER(result.user);
        if (window.KF_KART) {
          if (!window.__KF_KART_MOUNTED) { window.KF_KART.mount(); window.__KF_KART_MOUNTED = true; }
          else window.KF_KART.refresh();
        }
        if (new URLSearchParams(location.search).get("to") === "kurbağa") {
          window.location.replace("/kurbağa.html?bridged=1");
        }
      }
    }).catch(function () {});
  }
  function loadData() {
    return Promise.all([
      fetch("/data/articles.json", { credentials: "same-origin" }).then(function (r) { return r.json(); }),
      fetch("/data/random.json", { credentials: "same-origin" }).then(function (r) { return r.json(); }),
      fetch("/data/test.json", { credentials: "same-origin" }).then(function (r) { return r.json(); })
    ]).then(function (values) {
      var rawArticles = values[0];
      if (Array.isArray(rawArticles)) {
        state.articles = rawArticles;
      } else {
        state.articles = Object.keys(rawArticles || {}).reduce(function (all, key) {
          return all.concat(Array.isArray(rawArticles[key]) ? rawArticles[key] : []);
        }, []);
      }
      state.random = values[1];
      state.test = values[2];
    }).catch(function (error) {
      console.error(error);
    });
  }

  function showView(name) {
    ["home", "placeholder", "culture", "article", "no46", "team", "profil", "rutbeler", "ayarlar", "gelistirmeler"].forEach(function (view) {
      var node = document.getElementById("view-" + view);
      if (!node) return;
      node.hidden = view !== name;
      if (view === name) {
        node.classList.remove("view-enter");
        void node.offsetWidth;
        node.classList.add("view-enter");
      }
    });
  }

  function initReveal() {
    var nodes = $all(".reveal");
    if (!("IntersectionObserver" in window)) {
      nodes.forEach(function (node) { node.classList.add("is-visible"); });
      return;
    }
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -4% 0px" });
    nodes.forEach(function (node) { observer.observe(node); });
  }

  function renderHome() {
    showView("home");
    document.title = "NO.46 — Dijital Karargâh";
  }

  function renderPlaceholder(path) {
    var data = PLACEHOLDERS[path] || PLACEHOLDERS["/bolumler"];
    $("#placeholder-kicker").textContent = data.kicker;
    $("#placeholder-title").textContent = data.title;
    $("#placeholder-text").textContent = data.text;
    showView("placeholder");
    document.title = data.title + " — NO.46";
  }

  function renderNo46() {
    showView("no46");
    document.title = "No46 — NO.46";
    if (window.KF_COMMUNITY) window.KF_COMMUNITY.renderNo46();
  }

  function renderTeam() {
    showView("team");
    document.title = "Kim bu ekip? — NO.46";
    if (window.KF_COMMUNITY) window.KF_COMMUNITY.renderTeam();
  }

  function renderProfil(username) {
    showView("profil");
    document.title = "Profil — NO.46";
    if (window.KF_PROFIL) window.KF_PROFIL.render(username || null);
  }
  function renderRutbeler() {
    showView("rutbeler");
    document.title = "Rütbeler — NO.46";
    if (window.KF_RUTBELER) window.KF_RUTBELER.render();
  }
  function renderAyarlar() {
    showView("ayarlar");
    document.title = "Ayarlar — NO.46";
    if (window.KF_AYARLAR) window.KF_AYARLAR.render();
  }
  function renderGelistirmeler() {
    showView("gelistirmeler");
    document.title = "Geliştirmeler — NO.46";
    if (window.KF_GELISTIRMELER) window.KF_GELISTIRMELER.render();
  }

  function renderCulture(category) {
    showView("culture");
    var articles = state.articles || [];
    var categories = Object.keys(CATEGORY_LABELS);
    var grid = $("#category-grid");
    var list = $("#article-list");
    clear(grid);
    clear(list);
    if (!category) category = "psikoloji";

    categories.forEach(function (key) {
      var button = el("button", "category-chip" + (key === category ? " is-active" : ""), CATEGORY_LABELS[key]);
      button.type = "button";
      button.addEventListener("click", function () { navigate("/kulturel/" + key); });
      grid.appendChild(button);
    });

    articles.filter(function (article) { return article.category === category; }).forEach(function (article) {
      var row = el("a", "article-row");
      row.href = "/kulturel/" + article.category + "/" + article.id;
      row.setAttribute("data-route", row.getAttribute("href"));
      var copy = el("div");
      copy.appendChild(el("h3", "", article.title));
      copy.appendChild(el("p", "", article.summary));
      row.appendChild(copy);
      row.appendChild(el("span", "muted", "Oku →"));
      list.appendChild(row);
    });

    document.title = CATEGORY_LABELS[category] + " — NO.46 Kültürel";
  }

  function renderArticle(category, id) {
    var article = (state.articles || []).filter(function (item) {
      return item.category === category && item.id === id;
    })[0];
    if (!article) return renderCulture(category);
    showView("article");
    $("#article-category").textContent = (CATEGORY_LABELS[category] || category).toLocaleUpperCase("tr-TR");
    $("#article-title").textContent = article.title;
    $("#article-summary").textContent = article.summary;
    var body = $("#article-body");
    clear(body);
    String(article.body).split(/\n\s*\n/).forEach(function (paragraph) {
      if (paragraph.trim()) body.appendChild(el("p", "", paragraph.trim()));
    });
    var source = $("#article-source");
    clear(source);
    source.appendChild(document.createTextNode("Kaynak: "));
    if (article.sourceUrl) {
      var link = el("a", "", article.source || article.sourceUrl);
      link.href = article.sourceUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      source.appendChild(link);
    } else {
      source.appendChild(document.createTextNode(article.source || "—"));
    }
    document.title = article.title + " — NO.46";
  }

  function setActive(path) {
    $all(".nav a[data-route]").forEach(function (a) {
      var r = a.getAttribute("data-route");
      var on = r === path
        || (r === "/kulturel" && path.indexOf("/kulturel") === 0)
        || (r === "/ekip/kim-bu-ekip" && path.indexOf("/ekip") === 0);
      if (on) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  function renderRoute() {
    var path = decodeURIComponent(location.pathname);
    setActive(path);
    if (path === "/" || path === "") return renderHome();
    if (path === "/no46") return renderNo46();
    if (path === "/ekip/kim-bu-ekip" || path === "/ekip/kim-bu-ekip/") return renderTeam();
    if (path === "/profil" || path === "/profil/") return renderProfil(null);
    var profilMatch = path.match(/^\/profil\/([^\/]+)$/);
    if (profilMatch) return renderProfil(profilMatch[1]);
    if (path === "/rutbeler" || path === "/rutbeler/") return renderRutbeler();
    if (path === "/ayarlar" || path === "/ayarlar/") return renderAyarlar();
    if (path === "/gelistirmeler" || path === "/gelistirmeler/") return renderGelistirmeler();
    if (PLACEHOLDERS[path]) return renderPlaceholder(path);
    if (path === "/kulturel") return renderCulture("psikoloji");
    var cultureMatch = path.match(/^\/kulturel\/([^/]+)$/);
    if (cultureMatch) return renderCulture(cultureMatch[1]);
    var articleMatch = path.match(/^\/kulturel\/([^/]+)\/([^/]+)$/);
    if (articleMatch) return renderArticle(articleMatch[1], articleMatch[2]);
    return renderPlaceholder("/bolumler");
  }

  function pickRandom() {
    if (!state.random) return "";
    var lines = state.random.lines || [];
    var openers = state.random.openers || [];
    var topics = state.random.topics || [];
    var comments = state.random.comments || [];
    var closers = state.random.closers || [];
    var text = "";
    var attempts = 0;
    var useLine = lines.length && (Math.random() < 0.72 || !openers.length || !topics.length || !comments.length || !closers.length);
    do {
      if (useLine) {
        text = lines[Math.floor(Math.random() * lines.length)];
      } else {
        text = openers[Math.floor(Math.random() * openers.length)] + " " +
          topics[Math.floor(Math.random() * topics.length)] + " " +
          comments[Math.floor(Math.random() * comments.length)] + " " +
          closers[Math.floor(Math.random() * closers.length)];
      }
      attempts += 1;
    } while (state.lastShown.indexOf(text) !== -1 && attempts < 20);
    state.lastShown.push(text);
    if (state.lastShown.length > 20) state.lastShown.shift();
    return text;
  }

  function showRandom() {
    var text = pickRandom();
    var node = $("#random-text");
    if (!node || !text) return;
    node.textContent = text;
  }

  function openTest() {
    if (!state.test) return;
    state.testIndex = 0;
    state.testAnswers = [];
    $("#test-overlay").hidden = false;
    renderTestQuestion();
  }
  function closeTest() {
    $("#test-overlay").hidden = true;
  }
  function renderTestQuestion() {
    var card = $("#test-card");
    clear(card);
    var questions = state.test.questions || [];
    var question = questions[state.testIndex];
    if (!question) return renderTestResult();

    var top = el("div", "test-top");
    top.appendChild(el("p", "kicker", "NEYİM VAR?"));
    var close = el("button", "close-test", "Kapat");
    close.type = "button";
    close.addEventListener("click", closeTest);
    top.appendChild(close);
    card.appendChild(top);

    var progress = el("div", "test-progress");
    var bar = el("span");
    bar.style.width = Math.round((state.testIndex / questions.length) * 100) + "%";
    progress.appendChild(bar);
    card.appendChild(progress);
    card.appendChild(el("p", "muted", (state.testIndex + 1) + " / " + questions.length));
    card.appendChild(el("h2", "test-question", question.text));

    var options = el("div", "test-options");
    question.options.forEach(function (option, index) {
      var label = el("label", "test-option");
      var input = document.createElement("input");
      input.type = "radio";
      input.name = "test-q";
      input.value = String(index);
      label.appendChild(input);
      label.appendChild(document.createTextNode(option.label));
      options.appendChild(label);
    });
    card.appendChild(options);

    var actions = el("div", "test-actions");
    var next = el("button", "btn btn-primary", state.testIndex === questions.length - 1 ? "Sonucu gör" : "Sonraki");
    next.type = "button";
    next.disabled = true;
    next.addEventListener("click", function () {
      var selected = options.querySelector("input:checked");
      if (!selected) return;
      state.testAnswers.push(question.options[Number(selected.value)].score);
      state.testIndex += 1;
      if (state.testIndex >= questions.length) renderTestResult();
      else renderTestQuestion();
    });
    options.addEventListener("change", function () { next.disabled = false; });
    actions.appendChild(next);
    card.appendChild(actions);
  }
  function renderTestResult() {
    var card = $("#test-card");
    clear(card);
    var questions = state.test.questions || [];
    var total = state.testAnswers.reduce(function (sum, score) { return sum + score; }, 0);
    var results = state.test.results || [];
    var result = results.filter(function (item) { return total >= item.min && total <= item.max; })[0] || results[results.length - 1];
    var top = el("div", "test-top");
    top.appendChild(el("p", "kicker", "RAPOR HAZIR"));
    var close = el("button", "close-test", "Kapat");
    close.type = "button";
    close.addEventListener("click", closeTest);
    top.appendChild(close);
    card.appendChild(top);
    card.appendChild(el("h2", "test-result", result ? result.title : "Rapor kayıp."));
    card.appendChild(el("p", "section-sub", result ? result.text : "Sonuç bulunamadı. Bürokrasi yine yaptı yapacağını."));
    card.appendChild(el("p", "test-note", state.test.note));
    var actions = el("div", "test-actions");
    var retry = el("button", "btn", "Baştan dene");
    retry.type = "button";
    retry.addEventListener("click", openTest);
    var closeButton = el("button", "btn btn-primary", "Kapat");
    closeButton.type = "button";
    closeButton.addEventListener("click", closeTest);
    actions.appendChild(retry);
    actions.appendChild(closeButton);
    card.appendChild(actions);
  }

  function init3D() {
    if (!window.matchMedia || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!window.matchMedia || !window.matchMedia("(hover: hover)").matches) return;

    $all(".card").forEach(function (card) {
      card.addEventListener("pointermove", function (event) {
        if (event.pointerType && event.pointerType !== "mouse") return;
        const rect = card.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = "perspective(900px) rotateX(" + (-y * 6).toFixed(2) + "deg) rotateY(" + (x * 6).toFixed(2) + "deg) translateY(-3px)";
      });
      card.addEventListener("pointerleave", function () {
        card.style.transform = "";
      });
    });

    const art = $(".hero-art");
    if (art) {
      art.addEventListener("pointermove", function (event) {
        if (event.pointerType && event.pointerType !== "mouse") return;
        const rect = art.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        art.style.transform = "rotateX(" + (-y * 4).toFixed(2) + "deg) rotateY(" + (x * 5).toFixed(2) + "deg)";
      });
      art.addEventListener("pointerleave", function () {
        art.style.transform = "";
      });
    }
  }

  function bindEvents() {
    document.addEventListener("click", function (event) {
      var routeLink = event.target.closest("[data-route]");
      if (routeLink) {
        event.preventDefault();
        navigate(routeLink.getAttribute("data-route"));
        return;
      }
      if (!event.target.closest(".nav-item")) {
        $all(".nav-item.open").forEach(function (item) {
          item.classList.remove("open");
          var trigger = item.querySelector(".nav-chevron");
          if (trigger) trigger.setAttribute("aria-expanded", "false");
        });
      }
    });

    function bindChevron(buttonId) {
      var button = $("#" + buttonId);
      if (!button) return;
      button.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var item = button.closest(".nav-item");
        if (!item) return;
        var acik = !item.classList.contains("open");
        // diğer açık menüleri kapat
        $all(".nav-item.open").forEach(function (other) {
          if (other === item) return;
          other.classList.remove("open");
          var t = other.querySelector(".nav-chevron");
          if (t) t.setAttribute("aria-expanded", "false");
        });
        item.classList.toggle("open", acik);
        button.setAttribute("aria-expanded", String(acik));
      });
    }
    bindChevron("culture-menu-button");
    bindChevron("ekip-menu-button");

    var menuToggle = $("#menu-toggle");
    if (menuToggle) {
      menuToggle.addEventListener("click", function () {
        var nav = $("#mobile-nav");
        if (nav) nav.hidden = !nav.hidden;
      });
    }

    var randomButton = $("#random-button");
    if (randomButton) randomButton.addEventListener("click", showRandom);
    var testOpen = $("#test-open");
    if (testOpen) testOpen.addEventListener("click", openTest);

    var logout = $("#logout-button");
    if (logout) {
      logout.addEventListener("click", function () {
        try { window.localStorage.removeItem("kf.session.v1"); } catch (error) {}
        if (API_BASE) {
          fetch(API_BASE + "?action=logout", { method: "POST", credentials: "include" }).catch(function () {});
        }
        window.location.href = "/";
      });
    }

    window.addEventListener("popstate", renderRoute);
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      $all(".nav-item.open").forEach(function (item) {
        item.classList.remove("open");
        var t = item.querySelector(".nav-chevron");
        if (t) t.setAttribute("aria-expanded", "false");
      });
    });
  }

  bindEvents();
  init3D();
  initReveal();
  refreshUser();
  loadData().then(renderRoute);
})();