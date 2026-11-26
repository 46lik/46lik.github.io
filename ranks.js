/* =========================================================
   NO.46 — rütbe, koltuk, geri alma oylaması ve görevler
   ========================================================= */

(function () {
  "use strict";

  var SEATS_KEY = "kf.seats.v1";
  var LAST_LOGIN_KEY = "kf.lastlogin.v1";
  var USER_SEATS_KEY = "kf.userseats.v1";
  var DENIED_KEY = "kf.deniedseats.v1";
  var RECLAIMS_KEY = "kf.reclaims.v1";
  var USERS_KEY = "kf.users.v1";
  var POINTS_KEY = "kf.points.v1";
  var RANK_POINTS_KEY = "kf.rankpoints.v1";
  var RANKS_KEY = "kf.rankdefs.v1";
  var EXPIRE_MS = 3 * 24 * 60 * 60 * 1000;

  var BASE_RANKS = [
    { key: "r1", level: 1, title: "Yeni Ataç Uzmanı", region: "Çekmecenin en dip köşesi", points: 0 },
    { key: "r2", level: 2, title: "Zımba Çırağı", region: "Zımba telinin bittiği yer", points: 120 },
    { key: "r3", level: 3, title: "Kaşe Bekçisi", region: "Mürekkebin kurumadığı son masa", points: 300 },
    { key: "r4", level: 4, title: "Çay Müfettişi", region: "Demliğin başı, bardağın dibi", points: 550 },
    { key: "r5", level: 5, title: "Vıraklama Memuru", region: "Gölün kenarı, nilüfer yaprağının altı", points: 850 },
    { key: "r6", level: 6, title: "Kurbağa Hakları Sözcüsü", region: "Kurbağa Hakları Derneği'nin ıslak zemini", points: 1200 },
    { key: "r7", level: 7, title: "Dergâh Mühürdarı", region: "Dergâh Ocakları'nın ocak başı", points: 1600 },
    { key: "r8", level: 8, title: "Evrak Kâhyası", region: "Kayıp evrakların bulunduğu karanlık arşiv", points: 2050 },
    { key: "r9", level: 9, title: "Başmüfettiş", region: "Kendini teftiş ettiği ayna karşısı", points: 2550 },
    { key: "r10", level: 10, title: "Hekim Baş", region: "Hem hasta hem doktor odası", points: 3100 },
    { key: "r11", level: 11, title: "Raporlar Efendisi", region: "Raporların raporunun raporu katı", points: 3700 },
    { key: "r12", level: 12, title: "Yüce Deli Müdür", region: "Göl ortası, koltuk yüzer, kimse ulaşamaz", points: 4400 }
  ];

  var TASKS = [
    "Nilüfer yaprağını üç kez ters çevirdi.",
    "Suya “vırak” diye seslenen herkese selam verdi.",
    "Bir taşı beş dakika boyunca süzdü.",
    "Kendi gölgesinden özür diledi.",
    "Islak zeminde kaydı ama suni bir denge kurdu.",
    "Bir kurbağaya “abi” diye hitap etti.",
    "Nilüferi suladı; nilüfer suyu beğenmedi.",
    "Vıraklamayı bırakıp iki dakika düşündü.",
    "Bir yaprağı “bugünlük bu kadar” diye katladı.",
    "Sazlığa “müsait misin?” diye sordu."
  ];

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

  function keyOf(value) {
    return String(value || "").trim().toLowerCase();
  }

  function pointsFor(username) {
    var map = readJSON(POINTS_KEY, {});
    var value = map && typeof map === "object" ? map[keyOf(username)] : 0;
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }

  function readSeats() {
    var seats = readJSON(SEATS_KEY, {});
    return seats && typeof seats === "object" && !Array.isArray(seats) ? seats : {};
  }

  function readUserSeats() {
    var seats = readJSON(USER_SEATS_KEY, {});
    return seats && typeof seats === "object" && !Array.isArray(seats) ? seats : {};
  }

  function backfillUserSeats(seats, userSeats) {
    Object.keys(seats).forEach(function (key) {
      var holder = seats[key];
      if (holder && !userSeats[holder]) userSeats[holder] = key;
    });
    return userSeats;
  }

  function readDenied() {
    var denied = readJSON(DENIED_KEY, {});
    return denied && typeof denied === "object" && !Array.isArray(denied) ? denied : {};
  }

  function readReclaims() {
    var requests = readJSON(RECLAIMS_KEY, {});
    return requests && typeof requests === "object" && !Array.isArray(requests) ? requests : {};
  }

  function readLastLogins() {
    var logins = readJSON(LAST_LOGIN_KEY, {});
    return logins && typeof logins === "object" && !Array.isArray(logins) ? logins : {};
  }

  function readRankDefs() {
    var defs = readJSON(RANKS_KEY, null);
    if (!Array.isArray(defs)) return null;
    return defs.map(function (rank) {
      return {
        key: String(rank.key || ("r-" + Math.random().toString(36).slice(2, 8))),
        title: String(rank.title || "İsimsiz Rütbe").slice(0, 60),
        region: String(rank.region || "").slice(0, 120),
        points: Math.max(0, Math.floor(Number(rank.points) || 0))
      };
    });
  }

  function getRanks() {
    var defs = readRankDefs();
    var source = defs === null ? BASE_RANKS : defs;
    return source.map(function (rank, index) {
      return {
        key: rank.key,
        level: index + 1,
        title: rank.title,
        region: rank.region,
        points: rank.points
      };
    });
  }

  function getRank(key) {
    var ranks = getRanks();
    for (var i = 0; i < ranks.length; i += 1) {
      if (ranks[i].key === key) return ranks[i];
    }
    return null;
  }

  function writeRankDefs(defs) {
    writeJSON(RANKS_KEY, defs);
    updateSeats();
  }

  function addRank(data) {
    var defs = getRanks().map(function (rank) {
      return { key: rank.key, title: rank.title, region: rank.region, points: rank.points };
    });
    var key = "r-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    defs.push({
      key: key,
      title: String((data && data.title) || "Yeni Rütbe").slice(0, 60),
      region: String((data && data.region) || "").slice(0, 120),
      points: Math.max(0, Math.floor(Number(data && data.points) || 0))
    });
    writeRankDefs(defs);
    return key;
  }

  function updateRank(key, changes) {
    var defs = getRanks().map(function (rank) {
      return { key: rank.key, title: rank.title, region: rank.region, points: rank.points };
    });
    var found = false;
    defs.forEach(function (rank) {
      if (rank.key !== key) return;
      found = true;
      if (changes && typeof changes.title === "string") rank.title = changes.title.slice(0, 60);
      if (changes && typeof changes.region === "string") rank.region = changes.region.slice(0, 120);
      if (changes && Number.isFinite(Number(changes.points))) {
        rank.points = Math.max(0, Math.floor(Number(changes.points)));
      }
    });
    if (!found) return;
    writeRankDefs(defs);
  }

  function setRankPoints(key, value) {
    var points = Math.max(0, Math.floor(Number(value) || 0));
    updateRank(key, { points: points });
    return points;
  }

  function deleteRank(key) {
    var defs = getRanks().map(function (rank) {
      return { key: rank.key, title: rank.title, region: rank.region, points: rank.points };
    }).filter(function (rank) { return rank.key !== key; });

    var seats = readSeats();
    delete seats[key];
    var userSeats = readUserSeats();
    Object.keys(userSeats).forEach(function (userKey) {
      if (userSeats[userKey] === key) delete userSeats[userKey];
    });
    var denied = readDenied();
    delete denied[key];
    var requests = readReclaims();
    Object.keys(requests).forEach(function (id) {
      if (requests[id] && requests[id].seatKey === key) delete requests[id];
    });

    writeJSON(SEATS_KEY, seats);
    writeJSON(USER_SEATS_KEY, userSeats);
    writeJSON(DENIED_KEY, denied);
    writeJSON(RECLAIMS_KEY, requests);
    writeRankDefs(defs);
  }

  function moveRank(key, direction) {
    var defs = getRanks().map(function (rank) {
      return { key: rank.key, title: rank.title, region: rank.region, points: rank.points };
    });
    var index = -1;
    for (var i = 0; i < defs.length; i += 1) {
      if (defs[i].key === key) { index = i; break; }
    }
    if (index === -1) return;
    var next = index + direction;
    if (next < 0 || next >= defs.length) return;
    var tmp = defs[index];
    defs[index] = defs[next];
    defs[next] = tmp;
    writeRankDefs(defs);
  }

  function lastLogin(username) {
    var value = readLastLogins()[keyOf(username)];
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }

  function touchLogin(username) {
    var key = keyOf(username);
    if (!key) return;
    var logins = readLastLogins();
    logins[key] = Date.now();
    writeJSON(LAST_LOGIN_KEY, logins);
  }

  function userByKey(users, key) {
    for (var i = 0; i < users.length; i += 1) {
      if (users[i] && users[i].usernameKey === key) return users[i];
    }
    return null;
  }

  function pendingSeatSet() {
    var pending = {};
    var requests = readReclaims();
    Object.keys(requests).forEach(function (id) {
      var request = requests[id];
      if (request && request.status === "pending") pending[request.seatKey] = true;
    });
    return pending;
  }

  function createReclaim(seatKey, usernameKey) {
    var requests = readReclaims();
    var pending = pendingSeatSet();
    if (pending[seatKey]) return null;

    var id = "rc-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
    requests[id] = {
      id: id,
      seatKey: seatKey,
      usernameKey: usernameKey,
      yes: [],
      no: [],
      created_at: new Date().toISOString(),
      status: "pending"
    };
    writeJSON(RECLAIMS_KEY, requests);
    return requests[id];
  }

  function addTask(usernameKey) {
    var users = readUsers();
    var user = userByKey(users, usernameKey);
    if (!user) return;
    if (!Array.isArray(user.tasks)) user.tasks = [];
    user.tasks.push(TASKS[Math.floor(Math.random() * TASKS.length)]);
    if (user.tasks.length > 20) user.tasks = user.tasks.slice(-20);
    writeUsers(users);
  }

  function writeUsers(users) {
    return writeJSON(USERS_KEY, users);
  }

  function resolveRequest(id, accepted) {
    var requests = readReclaims();
    var request = requests[id];
    if (!request || request.status !== "pending") return null;

    var seats = readSeats();
    var userSeats = readUserSeats();
    var denied = readDenied();

    if (accepted) {
      if (!seats[request.seatKey]) {
        seats[request.seatKey] = request.usernameKey;
        userSeats[request.usernameKey] = request.seatKey;
      }
      request.status = "accepted";
      var list = Array.isArray(denied[request.seatKey]) ? denied[request.seatKey] : [];
      denied[request.seatKey] = list.filter(function (key) { return key !== request.usernameKey; });
    } else {
      request.status = "rejected";
      var deniedList = Array.isArray(denied[request.seatKey]) ? denied[request.seatKey] : [];
      if (deniedList.indexOf(request.usernameKey) === -1) deniedList.push(request.usernameKey);
      denied[request.seatKey] = deniedList;
      addTask(request.usernameKey);
    }

    writeJSON(SEATS_KEY, seats);
    writeJSON(USER_SEATS_KEY, userSeats);
    writeJSON(DENIED_KEY, denied);
    writeJSON(RECLAIMS_KEY, requests);
    updateSeats();
    return request;
  }

  function vote(id, username, accept) {
    var key = keyOf(username);
    var requests = readReclaims();
    var request = requests[id];
    if (!request || request.status !== "pending" || key === request.usernameKey) return null;

    var yes = Array.isArray(request.yes) ? request.yes : [];
    var no = Array.isArray(request.no) ? request.no : [];
    yes = yes.filter(function (item) { return item !== key; });
    no = no.filter(function (item) { return item !== key; });

    if (accept) yes.push(key);
    else no.push(key);

    request.yes = yes;
    request.no = no;
    writeJSON(RECLAIMS_KEY, requests);

    if (yes.length > no.length) {
      resolveRequest(id, true);
      return { resolved: true, accepted: true, request: request };
    }
    if (no.length > yes.length) {
      resolveRequest(id, false);
      return { resolved: true, accepted: false, request: request };
    }
    return { resolved: false, accepted: null, request: request };
  }

  function updateSeats() {
    var seats = readSeats();
    var userSeats = backfillUserSeats(seats, readUserSeats());
    var now = Date.now();

    getRanks().forEach(function (rank) {
      var holder = seats[rank.key];
      if (!holder) return;
      var last = lastLogin(holder);
      if (!last || now - last > EXPIRE_MS) {
        seats[rank.key] = null;
      }
    });

    var users = readUsers();
    var seated = {};
    Object.keys(seats).forEach(function (key) {
      if (seats[key]) seated[seats[key]] = true;
    });

    var pending = pendingSeatSet();
    var denied = readDenied();

    getRanks().slice().sort(function (a, b) { return b.level - a.level; }).forEach(function (rank) {
      if (seats[rank.key] || pending[rank.key]) return;

      var deniedList = Array.isArray(denied[rank.key]) ? denied[rank.key] : [];
      var candidates = users.filter(function (user) {
        if (!user || !user.usernameKey || seated[user.usernameKey]) return false;
        if (deniedList.indexOf(user.usernameKey) !== -1) return false;
        var last = lastLogin(user.usernameKey);
        if (!last || now - last > EXPIRE_MS) return false;
        return pointsFor(user.username) >= rank.points;
      });

      candidates.sort(function (a, b) {
        return pointsFor(b.username) - pointsFor(a.username);
      });

      if (candidates.length) {
        seats[rank.key] = candidates[0].usernameKey;
        userSeats[candidates[0].usernameKey] = rank.key;
        seated[candidates[0].usernameKey] = true;
      }
    });

    writeJSON(SEATS_KEY, seats);
    writeJSON(USER_SEATS_KEY, userSeats);
    return seats;
  }

  function handleLogin(username) {
    var key = keyOf(username);
    if (!key) return;
    var previousLast = lastLogin(username);
    touchLogin(username);

    var seats = readSeats();
    var userSeats = backfillUserSeats(seats, readUserSeats());
    var lastSeat = userSeats[key];

    if (lastSeat && seats[lastSeat] === key && previousLast && Date.now() - previousLast > EXPIRE_MS) {
      seats[lastSeat] = null;
      writeJSON(SEATS_KEY, seats);
    }

    if (lastSeat && seats[lastSeat] !== key) {
      var denied = readDenied();
      var deniedList = Array.isArray(denied[lastSeat]) ? denied[lastSeat] : [];
      if (seats[lastSeat] == null && deniedList.indexOf(key) === -1) {
        createReclaim(lastSeat, key);
      }
    }

    updateSeats();
    return lastSeat || null;
  }

  function getSeatForUser(username) {
    var key = keyOf(username);
    if (!key) return null;
    var seats = readSeats();
    var ranks = getRanks();
    for (var i = 0; i < ranks.length; i += 1) {
      if (seats[ranks[i].key] === key) return ranks[i];
    }
    return null;
  }

  function getTasks(username) {
    var user = userByKey(readUsers(), keyOf(username));
    return user && Array.isArray(user.tasks) ? user.tasks : [];
  }

  function renderRankList(container, currentUsername) {
    if (!container) return;
    var seats = readSeats();
    var users = readUsers();
    var currentKey = keyOf(currentUsername);
    var ranks = getRanks();
    container.textContent = "";

    ranks.forEach(function (rank) {
      var holderKey = seats[rank.key];
      var holder = holderKey ? userByKey(users, holderKey) : null;
      var row = document.createElement("div");
      row.className = "rank-row";
      if (holderKey && holderKey === currentKey) row.classList.add("is-current");

      var seat = document.createElement("span");
      seat.className = "rank-seat";
      seat.textContent = String(rank.level).padStart(2, "0");

      var copy = document.createElement("span");
      copy.className = "rank-copy";
      var title = document.createElement("span");
      title.className = "rank-title";
      title.textContent = rank.title;
      var region = document.createElement("span");
      region.className = "rank-region";
      region.textContent = rank.region;
      copy.appendChild(title);
      copy.appendChild(region);

      var meta = document.createElement("span");
      meta.className = "rank-meta";
      var holderName = holder ? (holder.displayName || holder.username) : "Boş koltuk";
      meta.textContent = holderName + " · " + rank.points + " puan";

      row.appendChild(seat);
      row.appendChild(copy);
      row.appendChild(meta);
      container.appendChild(row);
    });
  }

  function renderReclaimPanel(container, currentUsername) {
    if (!container) return;
    var requests = readReclaims();
    var pending = Object.keys(requests).map(function (id) { return requests[id]; }).filter(function (request) {
      return request && request.status === "pending";
    });
    var users = readUsers();
    var currentKey = keyOf(currentUsername);
    container.textContent = "";
    container.hidden = pending.length === 0;
    if (!pending.length) return;

    pending.forEach(function (request) {
      var user = userByKey(users, request.usernameKey);
      var rank = getRank(request.seatKey);
      var card = document.createElement("div");
      card.className = "reclaim-card";

      var title = document.createElement("p");
      title.className = "reclaim-title";
      title.textContent = (user ? (user.displayName || user.username) : "Bir kullanıcı") + ", " +
        (rank ? rank.title : "eski koltuğunu") + " geri istiyor.";

      var text = document.createElement("p");
      text.className = "reclaim-text";
      text.textContent = "Koltuk verilsin mi? Mevcut kullanıcılar karar versin.";

      var counts = document.createElement("p");
      counts.className = "reclaim-counts";
      counts.textContent = "Verelim: " + request.yes.length + " · Vermeyelim: " + request.no.length;

      card.appendChild(title);
      card.appendChild(text);
      card.appendChild(counts);

      if (currentKey && currentKey === request.usernameKey) {
        var waiting = document.createElement("p");
        waiting.className = "reclaim-waiting";
        waiting.textContent = "Oylama sürüyor. Sonuç bekleniyor.";
        card.appendChild(waiting);
      } else if (currentKey) {
        var actions = document.createElement("div");
        actions.className = "reclaim-actions";

        var yes = document.createElement("button");
        yes.className = "btn btn-amber btn-sm";
        yes.type = "button";
        yes.textContent = "Verelim";
        yes.addEventListener("click", function () { castVote(request.id, currentKey, true); });

        var no = document.createElement("button");
        no.className = "btn btn-ghost btn-sm";
        no.type = "button";
        no.textContent = "Vermeyelim";
        no.addEventListener("click", function () { castVote(request.id, currentKey, false); });

        actions.appendChild(yes);
        actions.appendChild(no);
        card.appendChild(actions);
      }

      container.appendChild(card);
    });
  }

  function castVote(id, username, accept) {
    var result = vote(id, username, accept);
    if (!result) return null;
    if (result.resolved) {
      updateSeats();
      window.dispatchEvent(new CustomEvent("kf-reclaim-resolved", {
        detail: { accepted: result.accepted, request: result.request }
      }));
    } else {
      window.dispatchEvent(new CustomEvent("kf-reclaim-voted", { detail: result }));
    }
    return result;
  }

  window.KF_RANKS = {
    BASE_RANKS: BASE_RANKS,
    EXPIRE_MS: EXPIRE_MS,
    getRanks: getRanks,
    getRank: getRank,
    setRankPoints: setRankPoints,
    addRank: addRank,
    updateRank: updateRank,
    deleteRank: deleteRank,
    moveRank: moveRank,
    update: updateSeats,
    handleLogin: handleLogin,
    touchLogin: touchLogin,
    getSeatForUser: getSeatForUser,
    getTasks: getTasks,
    renderRankList: renderRankList,
    renderReclaimPanel: renderReclaimPanel,
    vote: castVote,
    pointsFor: pointsFor
  };
})();