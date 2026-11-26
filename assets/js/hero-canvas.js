(function () {
  "use strict";

  var canvas = document.getElementById("hero-canvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var hero = canvas.closest(".hero") || canvas.parentElement;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var width = 0;
  var height = 0;
  var dpr = 1;
  var points = [];
  var pointer = { x: 0, y: 0 };
  var target = { x: 0, y: 0 };
  var raf = null;
  var start = null;

  function makePoints() {
    var count = Math.max(180, Math.min(900, Math.floor((width * height) / 1900)));
    points = [];
    for (var i = 0; i < count; i += 1) {
      points.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: 0.25 + Math.random() * 0.75,
        red: Math.random() > 0.82,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  function resize() {
    var rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    makePoints();
    if (reduce) draw(performance.now());
  }

  function draw(now) {
    if (start === null) start = now;
    var t = (now - start) / 1000;
    pointer.x += (target.x - pointer.x) * 0.05;
  pointer.y += (target.y - pointer.y) * 0.05;

    ctx.clearRect(0, 0, width, height);

    var cx = width * 0.62;
    var cy = height * 0.5;
    var radius = Math.min(width, height) * 0.34;
    var scan = reduce ? 0.35 : (Math.sin(t * 0.55) * 0.5 + 0.5);
    var scanY = cy - radius + scan * radius * 2;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    var glow = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20);
    glow.addColorStop(0, "rgba(255,59,48,0)");
    glow.addColorStop(0.45, "rgba(255,59,48,.08)");
    glow.addColorStop(0.5, "rgba(255,59,48,.38)");
    glow.addColorStop(0.55, "rgba(255,59,48,.08)");
    glow.addColorStop(1, "rgba(255,59,48,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(cx - radius, scanY - 20, radius * 2, 40);

    for (var i = 0; i < points.length; i += 1) {
      var p = points[i];
      var drift = reduce ? 0 : Math.sin(t * 0.35 + p.phase) * 8 * p.z;
      var x = p.x + pointer.x * 26 * p.z + drift;
      var y = p.y + pointer.y * 18 * p.z + drift * 0.4;
      var size = 0.6 + p.z * 1.6;
      var alpha = 0.1 + p.z * 0.32;
      ctx.fillStyle = p.red && p.z > 0.72
        ? "rgba(255,59,48," + alpha.toFixed(2) + ")"
        : "rgba(184,181,174," + (alpha * 0.45).toFixed(2) + ")";
      ctx.fillRect(x, y, size, size);
    }

    ctx.strokeStyle = "rgba(255,59,48,.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - radius * 0.55, cy - radius);
    ctx.lineTo(cx - radius * 0.3, cy - radius * 0.35);
    ctx.lineTo(cx - radius * 0.5, cy + radius * 0.2);
    ctx.lineTo(cx - radius * 0.25, cy + radius * 0.8);
    ctx.stroke();

    ctx.restore();

    ctx.strokeStyle = "rgba(255,59,48,.16)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(184,181,174,.08)";
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 18, 0, Math.PI * 2);
  ctx.stroke();

    if (!reduce) raf = window.requestAnimationFrame(draw);
  }

  function onPointer(event) {
    if (!hero) return;
    var rect = hero.getBoundingClientRect();
    target.x = (event.clientX - rect.left) / rect.width - 0.5;
    target.y = (event.clientY - rect.top) / rect.height - 0.5;
  }
  function resetPointer() {
    target.x = 0;
    target.y = 0;
  }

  if (window.ResizeObserver) {
    new ResizeObserver(resize).observe(hero || canvas);
  } else {
    window.addEventListener("resize", resize);
  }
  if (window.matchMedia && window.matchMedia("(hover: hover)").matches) {
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("pointerleave", resetPointer);
  }
  resize();
  draw(performance.now());
  if (!reduce && !raf) raf = window.requestAnimationFrame(draw);
})();