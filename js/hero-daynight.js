/*
  Hero siang → senja → malam (scroll-driven).

  Foto rumah lamin asli tetap menjadi dasar. Script ini hanya menambahkan
  lapisan cahaya tipis DI DALAM .hero-bg (jadi ikut animasi drift foto):
    glow   – cahaya matahari menguat (screen)
    dusk   – gradasi senja hangat → ungu (multiply)
    night  – biru navy (multiply) + cahaya bulan (screen)
    moon   – bulan kecil di area langit, bintang samar, lampu keemasan di rumah

  Progres scroll (0–1) dihitung dari posisi hero; nilainya ditulis sebagai
  CSS variable di #hero dan setiap lapisan memakai opacity (murah untuk GPU).
  Tanpa JavaScript / tanpa foto: tidak ada yang berubah, hero tampil seperti biasa.
*/
(function () {
  'use strict';

  var hero = document.getElementById('hero');
  if (!hero) return;
  var bg = hero.querySelector('.hero-bg');
  if (!bg) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Ukuran asli foto + titik penting dalam koordinat foto (px). */
  var PHOTO = { w: 1600, h: 1067 };
  var SUN = [1190, 235];
  var MOON = [1185, 285];  /* celah langit terang tempat matahari bersinar */
  var LAMPS = [[720, 505, 1], [520, 515, 0.8], [880, 565, 0.85], [1255, 650, 0.6]];

  var built = false;
  var layers = {};
  var startY = 0, endY = 1, maxShift = 0;
  var PARALLAX = reduce ? 0 : 0.6;
  var target = 0, cur = -1, shiftT = 0, shiftC = -1, raf = 0;

  function el(cls) {
    var d = document.createElement('div');
    d.className = 'dn-layer ' + cls;
    d.setAttribute('aria-hidden', 'true');
    bg.appendChild(d);
    return d;
  }

  function build() {
    if (built) return;
    built = true;
    layers.glow = el('dn-glow');
    layers.dusk = el('dn-dusk');
    layers.night = el('dn-night');
    layers.moonlight = el('dn-moonlight');
    layers.lamps = el('dn-lamps');
    layers.stars = el('dn-stars');
    layers.moon = el('dn-moon');
    hero.classList.add('dn-on');
    measure();
  }

  /* Petakan titik foto ke kotak .hero-bg (background-size: cover; position: center). */
  function mapper(W, H) {
    var s = Math.max(W / PHOTO.w, H / PHOTO.h);
    var ox = (W - PHOTO.w * s) / 2;
    var oy = (H - PHOTO.h * s) / 2;
    return { s: s, x: function (px) { return ox + px * s; }, y: function (py) { return oy + py * s; } };
  }

  function rand(seed) {
    var x = Math.sin(seed * 9301 + 49297) * 233280;
    return x - Math.floor(x);
  }

  function measure() {
    var W = bg.offsetWidth, H = bg.offsetHeight;
    if (!W || !H) return;
    var m = mapper(W, H);

    /* Matahari */
    var sx = m.x(SUN[0]), sy = m.y(SUN[1]);
    hero.style.setProperty('--dn-sun-x', sx.toFixed(1) + 'px');
    hero.style.setProperty('--dn-sun-y', sy.toFixed(1) + 'px');

    /* Bulan: di langit dekat posisi matahari; digeser masuk bila foto terpotong. */
    var r = Math.max(13, Math.min(30, W * 0.022));
    var mx = m.x(MOON[0]), my = m.y(MOON[1]);
    mx = Math.min(W - r * 3, Math.max(W * 0.55, mx));
    hero.style.setProperty('--dn-moon-x', mx.toFixed(1) + 'px');
    hero.style.setProperty('--dn-moon-y', my.toFixed(1) + 'px');
    hero.style.setProperty('--dn-moon-r', r.toFixed(1) + 'px');

    /* Lampu keemasan di beranda rumah dan papan nama */
    var g = [];
    for (var i = 0; i < LAMPS.length; i++) {
      var L = LAMPS[i];
      var lx = m.x(L[0]), ly = m.y(L[1]);
      if (lx < -40 || lx > W + 40) continue;
      var rad = Math.max(30, 70 * m.s) * L[2];
      g.push('radial-gradient(' + rad.toFixed(0) + 'px ' + (rad * 0.8).toFixed(0) + 'px at ' +
        lx.toFixed(0) + 'px ' + ly.toFixed(0) + 'px, rgba(255, 200, 115, 0.7) 0%, rgba(255, 170, 80, 0.26) 34%, rgba(255, 170, 80, 0) 100%)');
    }
    if (layers.lamps) layers.lamps.style.backgroundImage = g.join(',') || 'none';

    /* Bintang samar: sisi kanan, sepertiga atas, menghindari judul */
    if (layers.stars) {
      var n = W < 640 ? 14 : 26, sh = [];
      for (var k = 0; k < n; k++) {
        var x = W * (0.5 + rand(k + 1) * 0.48);
        var y = my - H * 0.28 + rand(k + 101) * H * 0.32;
        if (Math.abs(x - mx) < r * 3 && Math.abs(y - my) < r * 3) continue;
        var a = (0.35 + rand(k + 201) * 0.55).toFixed(2);
        sh.push(x.toFixed(0) + 'px ' + y.toFixed(0) + 'px 0 ' + (rand(k + 301) < 0.2 ? '0.6px' : '0') + ' rgba(255, 252, 235, ' + a + ')');
      }
      layers.stars.style.boxShadow = sh.join(',');
    }

    /* Rentang scroll: malam penuh saat ~42% tinggi hero tergulir, jadi rumah
       masih terlihat. Parallax 0.6 menahan foto (dan langitnya) di layar. */
    var rect = hero.getBoundingClientRect();
    startY = 0;
    endY = Math.max(200, rect.height * 0.42);
    maxShift = rect.height * 0.5;

    readScroll();
    schedule();
  }

  function smooth(a, b, x) {
    var t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  }

  function readScroll() {
    var y = window.scrollY;
    target = Math.min(1, Math.max(0, (y - startY) / (endY - startY)));
    shiftT = Math.min(maxShift, Math.max(0, y)) * PARALLAX;
  }

  function apply(p) {
    var glow = smooth(0.08, 0.32, p) * (1 - smooth(0.4, 0.62, p));
    var dusk = smooth(0.28, 0.52, p) * (1 - smooth(0.66, 0.92, p));
    var night = smooth(0.48, 0.9, p);
    var moon = smooth(0.68, 0.96, p);
    var lamp = smooth(0.62, 0.94, p);
    var s = hero.style;
    s.setProperty('--dn-p', p.toFixed(4));
    s.setProperty('--dn-glow', glow.toFixed(4));
    s.setProperty('--dn-dusk', dusk.toFixed(4));
    s.setProperty('--dn-night', night.toFixed(4));
    s.setProperty('--dn-moon', moon.toFixed(4));
    s.setProperty('--dn-lamp', lamp.toFixed(4));
    s.setProperty('--dn-zoom', reduce ? '1' : (1 + 0.12 * glow).toFixed(4));
  }

  function tick() {
    raf = 0;
    if (cur < 0 || reduce) { cur = target; shiftC = shiftT; }
    else { cur += (target - cur) * 0.14; shiftC += (shiftT - shiftC) * 0.2; }
    if (Math.abs(target - cur) < 0.0008) cur = target;
    if (Math.abs(shiftT - shiftC) < 0.3) shiftC = shiftT;
    apply(cur);
    hero.style.setProperty('--dn-shift', shiftC.toFixed(1) + 'px');
    if (cur !== target || shiftC !== shiftT) schedule();
  }

  function schedule() {
    if (!built || raf) return;
    raf = requestAnimationFrame(tick);
  }

  function activate() {
    if (hero.classList.contains('has-photo')) build();
  }

  window.addEventListener('scroll', function () { readScroll(); schedule(); }, { passive: true });
  window.addEventListener('resize', function () { if (built) measure(); });
  window.addEventListener('load', function () { if (built) measure(); });
  if ('ResizeObserver' in window) {
    new ResizeObserver(function () { if (built) measure(); }).observe(hero);
  }
  if ('MutationObserver' in window) {
    new MutationObserver(activate).observe(hero, { attributes: true, attributeFilter: ['class'] });
  }
  activate();
})();
