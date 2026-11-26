/* =========================================================
   Kurbağa Felsefesi — oturum, giriş ekranı ve puan
   cPanel API bağlantılı sürüm
   ========================================================= */

(function () {
  "use strict";

  var API_BASE = (window.KF_CONFIG && window.KF_CONFIG.cloud && window.KF_CONFIG.cloud.apiBase)
    ? String(window.KF_CONFIG.cloud.apiBase).replace(/\/+$/, "")
    : "";

  var SESSION_KEY = "kf.session.v1";
  var POINTS_KEY = "kf.points.v1";
  var TICK_KEY = "kf.pointtick.v1";
  var POINT_INTERVAL = 10000;

  var BADGES = {
    star: { icon: "⭐", label: "Yıldız" },
    skull: { icon: "💀", label: "Kurukafa" },
    medicine: { icon: "💊", label: "İlaç" },
    mushroom: { icon: "🍄", label: "Mantar" },
    whiskey: { icon: "🥃", label: "Viski" },
    cigarette: { icon: "🚬", label: "Sigara" }
  };

  var $ = function (selector, scope) { return (scope || document).querySelector(selector); };
  var $$ = function (selector, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(selector)); };
  var page = document.body.getAttribute("data-auth-page") || "home";

  var gate = $("#auth-gate");
  var form = $("#auth-form");
  var usernameInput = $("#auth-username");
  var passwordInput = $("#auth-password");
  var errorEl = $("#auth-error");
  var submit = $("#auth-submit");
  var submitLabel = submit ? $(".btn-label", submit) : null;
  var welcome = $("#auth-welcome");
  var registerInfo = $("#auth-register-info");
  var userChip = $("#user-chip");
  var userName = $("#user-name");
  var userPoints = $("#user-points");
  var userAvatar = $("#user-avatar");
  var userBadges = $("#user-badges");
  var userRank = $("#user-rank");
  var userTask = $("#user-task");
  var profileSettings = $("#profile-settings");
  var accountDialog = $("#account-dialog");
  var rankList = $("#rank-list");
  var reclaimPanel = $("#reclaim-panel");
  var toast = $("#toast");
  var toastText = $("#toast-text");
  var toastTimer = null;
  var logoutButton = $("#logout-button");
  var modeButtons = Array.prototype.slice.call(document.querySelectorAll("[data-auth-mode]"));

  var currentUser = null;
  var authToken = null;
  var pointsTimer = null;
  var bumpTimer = null;

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

  function pointsMap() {
    var value = readJSON(POINTS_KEY, {});
    return value && typeof value === "object" ? value : {};
  }

  function pointsFor(username) {
    var value = pointsMap()[String(username || "").trim().toLowerCase()];
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }

  function addPoint(username) {
    var key = String(username || "").trim().toLowerCase();
    var map = pointsMap();
    map[key] = pointsFor(username) + 1;
    if (!writeJSON(POINTS_KEY, map)) return;
    if (window.KF_RANKS) {
      window.KF_RANKS.update();
      if (rankList) window.KF_RANKS.renderRankList(rankList, currentUser ? currentUser.username : username);
    }
    if (currentUser && currentUser.usernameKey === key) updateChip(true);
  }
