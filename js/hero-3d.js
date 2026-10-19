/*
  Hero 3D — bintang geometris delapan titik (motif khatam) sebagai garis tipis
  di atas foto hero. Murni Canvas 2D dengan proyeksi perspektif sederhana:
  tanpa library, tanpa unduhan tambahan, dan tidak mengubah isi situs.

  - Gerakan sangat pelan; berhenti saat hero tidak terlihat atau tab disembunyikan.
  - Hormati prefers-reduced-motion (digambar satu kali, tanpa animasi).
  - Jika Canvas tidak tersedia, halaman tetap tampil normal.
*/
(function () {
  'use strict';

  var hero = document.getElementById('hero');
  if (!hero) return;

  var canvas = document.createElement('canvas');
  canvas.className = 'hero-3d';
  canvas.setAttribute('aria-hidden', 'true');
  var ctx = canvas.getContext && canvas.getContext('2d');
  if (!ctx) return;

  var art = hero.querySelector('.hero-art');
  if (art && art.parentNode === hero) hero.insertBefore(canvas, art.nextSibling);
  else hero.appendChild(canvas);

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var IVORY = '255,249,232';
  var GOLD = '255,214,130';

  /* Empat lapis bintang: [radius, warna, alpha, kedalaman z, kecepatan putar] */
  var LAYERS = [
    [2.7, IVORY, 0.5, 0.0, 1],
    [2.1, IVORY, 0.32, 0.45, -1.4],
    [1.5, GOLD, 0.55, -0.45, 1.8],
    [0.95, IVORY, 0.32, 0.9, -2.2]
  ];

  function starSegments(r) {
    var seg = [];
    for (var k = 0; k < 2; k++) {
      var off = k * Math.PI / 4;
      for (var i = 0; i < 4; i++) {
        var a1 = off + i * Math.PI / 2;
        var a2 = off + (i + 1) * Math.PI / 2;
        seg.push([Math.cos(a1) * r, Math.sin(a1) * r, Math.cos(a2) * r, Math.sin(a2) * r]);
      }
    }
    return seg;
  }
  var STARS = LAYERS.map(function (l) { return starSegments(l[0]); });

  var RING = [];
  for (var i = 0; i < 8; i++) {
    var a = i * Math.PI / 4 + Math.PI / 8;
    RING.push([Math.cos(a) * 3.15, Math.sin(a) * 3.15]);
  }

  /* Debu cahaya */
  var DUST = [];
  function seedDust(n) {
    DUST.length = 0;
    for (var d = 0; d < n; d++) {
      var r = 3.6 + Math.random() * 4;
      var th = Math.random() * Math.PI * 2;
      var ph = Math.acos(2 * Math.random() - 1);
      DUST.push({
        x: r * Math.sin(ph) * Math.cos(th),
        y: r * Math.sin(ph) * Math.sin(th) * 0.75,
        z: r * Math.cos(ph),
        s: 0.7 + Math.random() * 1.1,
        gold: Math.random() < 0.3
      });
    }
  }

  var w = 0, h = 0, dpr = 1, narrow = false;
  var px = 0, py = 0, tx = 0, ty = 0;
  var running = false, visible = true, raf = 0;

  function resize() {
    var rect = hero.getBoundingClientRect();
    w = Math.max(1, rect.width);
    h = Math.max(1, rect.height);
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    narrow = w < 640;
    seedDust(narrow ? 28 : 55);
    if (!running) draw(performance.now());
  }

  function scrollTilt() {
    var r = hero.getBoundingClientRect();
    var p = -r.top / Math.max(1, r.height);
    return Math.max(-0.5, Math.min(1.5, p));
  }

  function draw(t) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    var time = reduce ? 0 : t;
    px += (tx - px) * 0.05;
    py += (ty - py) * 0.05;

    var ry = Math.sin(time * 0.00014) * 0.45 + px * 0.18 + scrollTilt() * 0.5;
    var rx = -0.22 + py * 0.1;
    var cy_ = Math.cos(ry), sy_ = Math.sin(ry), cx_ = Math.cos(rx), sx_ = Math.sin(rx);

    var R = narrow ? w * 0.2 : Math.max(110, Math.min(h * 0.34, w * 0.2));
    var unit = R / 2.7;
    var cx = narrow ? w * 0.8 : w * 0.77;
    var cy = narrow ? h * 0.24 : h * 0.46;
    var D = 9;

    function project(x, y, z) {
      var x1 = x * cy_ + z * sy_;
      var z1 = -x * sy_ + z * cy_;
      var y1 = y * cx_ - z1 * sx_;
      var z2 = y * sx_ + z1 * cx_;
      var s = D / (D - z2);
      return [cx + x1 * s * unit, cy + y1 * s * unit, s];
    }

    ctx.lineJoin = 'round';
    ctx.shadowColor = 'rgba(20, 45, 28, 0.35)';
    ctx.shadowBlur = narrow ? 0 : 6;

    /* Cincin segi delapan */
    ctx.beginPath();
    for (var i = 0; i < RING.length; i++) {
      var p = project(RING[i][0], RING[i][1], 0);
      if (i === 0) ctx.moveTo(p[0], p[1]); else ctx.lineTo(p[0], p[1]);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(' + IVORY + ',0.26)';
    ctx.lineWidth = 1;
    ctx.stroke();

    /* Lapisan bintang */
    for (var L = 0; L < LAYERS.length; L++) {
      var layer = LAYERS[L];
      var ang = time * 0.00003 * layer[4] + scrollTilt() * 0.35 * layer[4];
      var ca = Math.cos(ang), sa = Math.sin(ang);
      ctx.beginPath();
      var segs = STARS[L];
      for (var s = 0; s < segs.length; s++) {
        var q = segs[s];
        var a1 = project(q[0] * ca - q[1] * sa, q[0] * sa + q[1] * ca, layer[3]);
        var a2 = project(q[2] * ca - q[3] * sa, q[2] * sa + q[3] * ca, layer[3]);
        ctx.moveTo(a1[0], a1[1]);
        ctx.lineTo(a2[0], a2[1]);
      }
      ctx.strokeStyle = 'rgba(' + layer[1] + ',' + layer[2] + ')';
      ctx.lineWidth = L === 0 ? 1.4 : 1.1;
      ctx.stroke();
    }

    ctx.shadowBlur = 0;

    /* Debu cahaya berputar sangat pelan */
    var dr = time * 0.000008;
    var cd = Math.cos(dr), sd = Math.sin(dr);
    for (var d = 0; d < DUST.length; d++) {
      var o = DUST[d];
      var dp = project(o.x * cd + o.z * sd, o.y, -o.x * sd + o.z * cd);
      var rad = o.s * dp[2];
      ctx.beginPath();
      ctx.arc(dp[0], dp[1], rad, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + (o.gold ? GOLD : IVORY) + ',0.38)';
      ctx.fill();
    }
  }

  function loop(t) {
    if (!running) return;
    draw(t);
    raf = requestAnimationFrame(loop);
  }
  function start() {
    if (reduce || running || !visible || document.hidden) return;
    running = true;
    raf = requestAnimationFrame(loop);
  }
  function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
  }

  hero.addEventListener('pointermove', function (e) {
    var r = hero.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    ty = ((e.clientY - r.top) / r.height) * 2 - 1;
    if (reduce) draw(0);
  }, { passive: true });

  window.addEventListener('resize', resize);
  window.addEventListener('scroll', function () { if (reduce || !running) draw(performance.now()); }, { passive: true });
  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      visible = entries[0].isIntersecting;
      if (visible) start(); else stop();
    }).observe(hero);
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(hero);

  resize();
  start();
})();
