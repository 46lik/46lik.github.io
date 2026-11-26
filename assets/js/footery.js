/* =========================================================
   NO.46 — Footer: yasal metinler + çerez ayarları
   ========================================================= */
(function () {
  "use strict";

  function el(t, c, x) { var n = document.createElement(t); if (c) n.className = c; if (x !== undefined) n.textContent = x; return n; }
  function clear(n) { if (n) n.textContent = ""; }

  var ICERIK = {
    kvkk: {
      kicker: "KVKK",
      title: "Kişisel Verilerin Korunması",
      body: [
        "NO.46 olarak kişisel verilerini ciddiye alıyoruz; çünkü başka türlüsü zaten ayıp olurdu.",
        "Sitemde yalnızca bir hesap oluştururken verdiğin kullanıcı adı, şifre (hash'lenmiş olarak saklanır, düz metin asla tutulmaz), avatar tercihi, uzmanlık etiketlerin ve kısa tanıtımın saklanır. Puanların, okuduğun yazılar ve koltuk durumun da sunucuda tutulur.",
        "Bu veriler yalnızca hesabını işletmek, puan/rütbe sistemini çalıştırmak ve sana bildirim göstermek için kullanılır. Üçüncü kişilerle pazarlama amaçlı paylaşılmaz.",
        "Verilerin, hesabını sildiğinde kalıcı olarak silinir. Silme işlemi Ayarlar > Hesabı sil bölümünden yapılır.",
        "İşbu metin bilgilendirme amaçlıdır; bağlayıcı bir hukuki metin değildir. Gerçek bir sorun yaşıyorsan bir uzmanla konuş."
      ]
    },
    aydinlatma: {
      kicker: "AYDINLATMA",
      title: "Aydınlatma Metni",
      body: [
        "Veri sorumlusu: NO.46 Dijital Karargâh (bir grup kafası kırık ama bir konuda iyi insan).",
        "İşlenen veriler: kullanıcı adı, şifre hash'i, avatar, uzmanlık etiketleri, tanıtım, puan hareketleri, okunan yazılar, koltuk ve bildirim kayıtları.",
        "İşleme amacı: üyelik, puan/rütbe/koltuk sistemi, bildirimler ve sitenin işleyişi.",
        "Hukuki sebep: sözleşmenin ifası ve meşru menfaat (sitgetActive güvenliği ve işleyişi).",
        "Hakların: verilerine erişme, düzeltme ve silme hakkın var. Bunları Ayarlar sayfasından veya hesabı silerek kullanabilirsin.",
        "Bu metin bilgilendirme amaçlıdır; bağlayıcı bir hukuki metin değildir."
      ]
    },
    cerez: {
      kicker: "ÇEREZ",
      title: "Çerez Ayarları",
      body: "Hangi çerezleri kabul ettiğini seç. Zorunlu çerezler sitenin çalışması için gereklidir ve kapatılamaz; diğerleri isteğe bağlıdır."
    }
  };

  function cookieGet() {
    try { return JSON.parse(localStorage.getItem("kf.cerez.v1") || "{}"); } catch (e) { return {}; }
  }
  function cookieSet(v) { try { localStorage.setItem("kf.cerez.v1", JSON.stringify(v)); } catch (e) {} }

  function cerezIcerik() {
    var wrap = el("div");
    var durum = cookieGet();
    var rows = [
      { key: "zorunlu", ad: "Zorunlu çerezler", aciklama: "Oturum ve güvenlik için gerekli. Kapatılamaz.", zorunlu: true },
      { key: "tercih", ad: "Tercih çerezleri", aciklama: "Görünüm ve animasyon tercihlerini hatırlar.", zorunlu: false },
      { key: "analitik", ad: "Analitik (opsiyonel)", aciklama: "Anonim kullanım istatistikleri. Şu an kapalı.", zorunlu: false }
    ];
    rows.forEach(function (r) {
      var row = el("div", "switch-row");
      var left = el("div");
      left.appendChild(el("div", "s-label", r.ad));
      left.appendChild(el("div", "page-meta", r.aciklama));
      row.appendChild(left);
      var sw = el("label", "switch");
      var inp = document.createElement("input"); inp.type = "checkbox";
      inp.checked = r.zorunlu ? true : (durum[r.key] === true);
      inp.disabled = !!r.zorunlu;
      var track = el("span", "track");
      sw.appendChild(inp); sw.appendChild(track);
      row.appendChild(sw);
      wrap.appendChild(row);
      inp.addEventListener("change", function () {
        var d = cookieGet(); d[r.key] = inp.checked; cookieSet(d);
      });
    });
    var note = el("p", "page-meta", "✓ Tercihler bu tarayıcıda saklanır.");
    wrap.appendChild(note);
    return wrap;
  }

  function open(anahtar) {
    var dlg = document.getElementById("legal-dialog");
    if (!dlg) return;
    var data = ICERIK[anahtar] || ICERIK.kvkk;
    document.getElementById("legal-kicker").textContent = data.kicker;
    document.getElementById("legal-title").textContent = data.title;
    var body = document.getElementById("legal-body");
    clear(body);
    if (anahtar === "cerez") {
      body.appendChild(cerezIcerik());
    } else {
      data.body.forEach(function (p) { body.appendChild(el("p", "", p)); });
    }
    dlg.showModal();
  }

  document.addEventListener("click", function (e) {
    var legalBtn = e.target.closest("[data-legal]");
    if (legalBtn) { e.preventDefault(); open(legalBtn.getAttribute("data-legal")); }
    if (e.target.closest("[data-legal-close]")) {
      var dlg = document.getElementById("legal-dialog");
      if (dlg) dlg.close();
    }
  });
})();