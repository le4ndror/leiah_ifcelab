/* =========================================================
   pasta-grupo.js — IFCE LAB
   Transforma CADA atividade (.registro) de um grupo numa
   pasta de vidro própria: inclina no hover, abre ao clicar
   e as folhas sobem em leque. O card fica sempre visível na frente.

   Não recria nada: o card original (.registro), com seus
   links e botões, é apenas MOVIDO para dentro da pasta.
   Funciona sozinho, sem React. Basta incluir no HTML:
     <script src="pasta-grupo.js"></script>
   ========================================================= */
(function () {
  "use strict";

  var W = 340, H = 272, HEAD = 54, MAX = 4;
  var FRONT_H = H - 74;
  var BACK_PATH =
    "M0 56A22 22 0 0 1 22 34L146 34C170 34 172 0 198 0L318 0A22 22 0 0 1 340 22L340 250A22 22 0 0 1 318 272L22 272A22 22 0 0 1 0 250Z";
  var FRONT_PATH =
    "M0 22A22 22 0 0 1 22 0L118 0C144 0 146 32 172 32L318 32A22 22 0 0 1 340 54L340 " +
    (FRONT_H - 22) + "A22 22 0 0 1 318 " + FRONT_H + "L22 " + FRONT_H +
    "A22 22 0 0 1 0 " + (FRONT_H - 22) + "Z";

  /* arte do painel de trás: líquido verde reluzente */
  var RECIPE = {
    style: "marble",
    colors: ["#031a14", "#0b5a43", "#14b585", "#041f18", "#1fd6a0", "#7bf3cf", "#e6fff5"],
    scale: 0.62, warp: 3.2, angle: -0.5, gloss: 0.6, veins: 0.5
  };

  /* ---------- utilidades ---------- */
  function hexToRgb(hex) {
    var h = hex.trim().replace(/^#/, "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = /^[0-9a-f]{6}$/i.test(h) ? parseInt(h, 16) : 0x808080;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashString(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  }

  function fanSlot(index, count) {
    return count <= 1 ? 0 : (index / (count - 1)) * 2 - 1;
  }

  /* ---------- arte gerada (ruído com dobras, sombreado como líquido) ---------- */
  function makeFbm(seed) {
    var r = rng(seed);
    var perm = new Uint8Array(512);
    var grad = new Float32Array(512);
    var p = [];
    var i, j, t;
    for (i = 0; i < 256; i++) p.push(i);
    for (i = 255; i > 0; i--) {
      j = Math.floor(r() * (i + 1));
      t = p[i]; p[i] = p[j]; p[j] = t;
    }
    for (i = 0; i < 512; i++) perm[i] = p[i & 255];
    for (i = 0; i < 256; i++) {
      var a = r() * Math.PI * 2;
      grad[i * 2] = Math.cos(a);
      grad[i * 2 + 1] = Math.sin(a);
    }
    function noise(x, y) {
      var xi = Math.floor(x), yi = Math.floor(y);
      var xf = x - xi, yf = y - yi;
      var X = xi & 255, Y = yi & 255;
      var h00 = perm[X + perm[Y]] * 2;
      var h10 = perm[X + 1 + perm[Y]] * 2;
      var h01 = perm[X + perm[Y + 1]] * 2;
      var h11 = perm[X + 1 + perm[Y + 1]] * 2;
      var d00 = grad[h00] * xf + grad[h00 + 1] * yf;
      var d10 = grad[h10] * (xf - 1) + grad[h10 + 1] * yf;
      var d01 = grad[h01] * xf + grad[h01 + 1] * (yf - 1);
      var d11 = grad[h11] * (xf - 1) + grad[h11 + 1] * (yf - 1);
      var u = xf * xf * xf * (xf * (xf * 6 - 15) + 10);
      var v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
      return d00 + u * (d10 - d00) + v * (d01 - d00 + u * (d11 - d01 - d10 + d00));
    }
    return function (x, y, octaves) {
      var sum = 0, amp = 0.5;
      for (var k = 0; k < octaves; k++) {
        sum += amp * noise(x, y);
        var nx = 1.6 * x + 1.2 * y + 7.1;
        y = -1.2 * x + 1.6 * y + 3.3;
        x = nx;
        amp *= 0.5;
      }
      return sum;
    };
  }

  function createArtJob(width, height, recipe, seed) {
    var w = Math.max(1, Math.round(width));
    var h = Math.max(1, Math.round(height));
    var colors = recipe.colors;
    var stops = colors.map(function (c, i) { return { t: i / (colors.length - 1), c: hexToRgb(c) }; });
    var scale = recipe.scale, warp = recipe.warp, gloss = recipe.gloss, veins = recipe.veins;
    var streak = recipe.style === "streak";
    var fbm = makeFbm(seed * 977 + 13);
    var r = rng(seed + 1);
    var ox = r() * 50, oy = r() * 50;
    var angle = recipe.angle + (r() - 0.5) * 0.5;
    var ca = Math.cos(angle), sa = Math.sin(angle);
    var m = Math.min(w, h);
    var gw = Math.ceil(w / 2) + 3;
    var gh = Math.ceil(h / 2) + 3;
    var G = new Float32Array(gw * gh);
    var GQ = new Float32Array(gw * gh);
    var F = new Float32Array(w * h);
    var Q = new Float32Array(w * h);
    var pixels = new Uint8ClampedArray(w * h * 4);
    var row = 0;

    function field(gy) {
      for (var gx = 0; gx < gw; gx++) {
        var u = ((gx - 1) * 2 - w / 2) / m;
        var v = ((gy - 1) * 2 - h / 2) / m;
        var px = (u * ca - v * sa) * scale;
        var py = (u * sa + v * ca) * scale;
        if (streak) { px *= 0.14; py *= 2.2; }
        px += ox; py += oy;
        var qx = fbm(px, py, 3);
        var qy = fbm(px + 5.2, py + 1.3, 3);
        var rx = fbm(px + warp * qx + 1.7, py + warp * qy + 9.2, 3);
        var ry = fbm(px + warp * qx + 8.3, py + warp * qy + 2.8, 3);
        G[gy * gw + gx] = fbm(px + warp * rx, py + warp * ry, 4);
        GQ[gy * gw + gx] = Math.sqrt(qx * qx + qy * qy);
      }
    }

    function cr(a, b, c, d) { return (-a + 9 * b + 9 * c - d) / 16; }

    function upsample() {
      var T = new Float32Array(w * gh);
      var x, y, gy;
      for (gy = 0; gy < gh; gy++) {
        var rr = gy * gw;
        for (x = 0; x < w; x++) {
          var c = (x >> 1) + 1;
          T[gy * w + x] = x & 1 ? cr(G[rr + c - 1], G[rr + c], G[rr + c + 1], G[rr + c + 2]) : G[rr + c];
        }
      }
      for (y = 0; y < h; y++) {
        var cy = (y >> 1) + 1;
        for (x = 0; x < w; x++) {
          F[y * w + x] = y & 1
            ? cr(T[(cy - 1) * w + x], T[cy * w + x], T[(cy + 1) * w + x], T[(cy + 2) * w + x])
            : T[cy * w + x];
          var gx = (x >> 1) + 1;
          var q0 = GQ[cy * gw + gx];
          var qx = x & 1 ? (q0 + GQ[cy * gw + gx + 1]) / 2 : q0;
          var q1 = y & 1
            ? (x & 1 ? (GQ[(cy + 1) * gw + gx] + GQ[(cy + 1) * gw + gx + 1]) / 2 : GQ[(cy + 1) * gw + gx])
            : qx;
          Q[y * w + x] = (qx + q1) / 2;
        }
      }
    }

    function colorize() {
      var sample = [];
      var stride = Math.max(1, Math.floor(F.length / 4096));
      for (var s = 0; s < F.length; s += stride) sample.push(F[s]);
      sample.sort(function (a, b) { return a - b; });
      var lo = sample[Math.floor(sample.length * 0.02)];
      var hi = sample[Math.floor(sample.length * 0.98)];
      var k = 1 / (hi - lo || 1);
      var lx = -0.55, ly = -0.65, lz = 0.52;
      var slope = k * m * 0.012;
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          var i = y * w + x;
          var t = (F[i] - lo) * k;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          var j = 1;
          while (j < stops.length - 1 && stops[j].t < t) j++;
          var a = stops[j - 1], b = stops[j];
          var f = (t - a.t) / (b.t - a.t || 1);
          f = f < 0 ? 0 : f > 1 ? 1 : f;
          f = f * f * (3 - 2 * f);
          var gx = (F[x < w - 1 ? i + 1 : i] - F[x > 0 ? i - 1 : i]) * slope;
          var gy = (F[y < h - 1 ? i + w : i] - F[y > 0 ? i - w : i]) * slope;
          var nd = (-gx * lx - gy * ly + lz) / Math.sqrt(gx * gx + gy * gy + 1);
          var spec = Math.pow(nd > 0 ? nd : 0, 24) * gloss * 255;
          var silk = 1 + 0.035 * Math.sin(t * 150 + Q[i] * 24);
          var vein = veins * Math.max(0, 1 - Math.abs(Q[i] - 0.42) * 14) * 0.6;
          var lit = (0.82 + 0.28 * nd) * silk * (1 - vein);
          pixels[i * 4] = (a.c[0] + (b.c[0] - a.c[0]) * f) * lit + spec;
          pixels[i * 4 + 1] = (a.c[1] + (b.c[1] - a.c[1]) * f) * lit + spec;
          pixels[i * 4 + 2] = (a.c[2] + (b.c[2] - a.c[2]) * f) * lit + spec;
          pixels[i * 4 + 3] = 255;
        }
      }
    }

    function step(rows) {
      if (row >= gh) return true;
      var end = Math.min(gh, row + Math.max(1, rows));
      while (row < end) field(row++);
      if (row < gh) return false;
      upsample();
      colorize();
      return true;
    }

    return { width: w, height: h, pixels: pixels, step: step };
  }

  /* fila única: pinta pouco por quadro, sem travar a página */
  var queue = [], pumping = false, cache = {};

  function pump() {
    if (pumping) return;
    pumping = true;
    (function tick() {
      var until = performance.now() + 7;
      while (queue.length && performance.now() < until) {
        var head = queue[0];
        if (head.job.step(4)) {
          queue.shift();
          var c = document.createElement("canvas");
          c.width = head.job.width;
          c.height = head.job.height;
          c.getContext("2d").putImageData(new ImageData(head.job.pixels, c.width, c.height), 0, 0);
          head.done(c);
        }
      }
      if (queue.length) requestAnimationFrame(tick);
      else pumping = false;
    })();
  }

  function paint(recipe, seed, w, h, cb) {
    var key = JSON.stringify([recipe, seed, w, h]);
    if (!cache[key]) {
      cache[key] = new Promise(function (done) {
        queue.push({ job: createArtJob(w, h, recipe, seed), done: done });
        pump();
      });
    }
    cache[key].then(cb);
  }

  /* ---------- montagem: UMA pasta por atividade ---------- */
  var roots = [];

  function alive() {
    roots = roots.filter(function (r) { return document.body.contains(r.el); });
  }

  function closeAll(except) {
    alive();
    roots.forEach(function (r) { if (r !== except && r.isOpen()) r.setOpen(false); });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    alive();
    roots.forEach(function (r) {
      if (r.isOpen()) { r.setOpen(false); r.focusHit(); }
    });
  });

  document.addEventListener("pointerdown", function (e) {
    alive();
    roots.forEach(function (r) {
      if (r.isOpen() && !r.el.contains(e.target)) r.setOpen(false);
    });
  });

  /* nome e detalhe da pasta, tirados do texto do próprio card */
  function textLines(item) {
    var skip = Array.prototype.map.call(
      item.querySelectorAll("button, .btn-secundario, .btn-perigo"),
      function (b) { return b.textContent.replace(/\s+/g, " ").trim(); }
    );
    return (item.innerText || item.textContent || "")
      .split(/\n+/)
      .map(function (l) { return l.replace(/\s+/g, " ").trim(); })
      .filter(function (l) { return l && skip.indexOf(l) < 0; });
  }

  function makeSheet(color) {
    var s = document.createElement("div");
    s.className = "gf-sheet";
    s.setAttribute("data-c", String(color));
    return s;
  }

  function buildOne(panel, item, n, index) {
    var lines = textLines(item);
    var title = lines[0] || "Atividade " + n;

    var uid = "gf" + index + "-" + Math.floor(Math.random() * 1e6);
    var root = document.createElement("div");
    root.className = "gf-root";

    root.innerHTML =
      '<div class="gf-stage"><div class="gf-tilt">' +
        '<div class="gf-shadow" aria-hidden="true"></div>' +
        '<div class="gf-back" style="clip-path:path(\'' + BACK_PATH + '\')" aria-hidden="true">' +
          '<canvas class="gf-art"></canvas><div class="gf-back-sheen"></div>' +
        '</div>' +
        '<svg class="gf-rim gf-back-rim" viewBox="0 0 ' + W + " " + H + '" aria-hidden="true"><path d="' + BACK_PATH + '"/></svg>' +
        '<div class="gf-files" aria-hidden="true"></div>' +
        '<div class="gf-front" style="clip-path:path(\'' + FRONT_PATH + '\')">' +
          '<div class="gf-tint" aria-hidden="true"></div>' +
          '<div class="gf-spec" aria-hidden="true"></div>' +
          '<svg class="gf-rim gf-front-rim" viewBox="0 0 ' + W + " " + FRONT_H + '" aria-hidden="true">' +
            '<defs><linearGradient id="' + uid + '" x1="0" y1="0" x2="0" y2="1">' +
              '<stop offset="0" stop-color="#fff" stop-opacity="0.95"/>' +
              '<stop offset="0.35" stop-color="#fff" stop-opacity="0.35"/>' +
              '<stop offset="1" stop-color="#fff" stop-opacity="0.12"/>' +
            '</linearGradient></defs>' +
            '<path d="' + FRONT_PATH + '" stroke="url(#' + uid + ')"/>' +
          '</svg>' +
          '<button type="button" class="gf-hit" aria-expanded="false"></button>' +
          '<div class="gf-info"></div>' +
          '<button type="button" class="gf-toggle" tabindex="-1" aria-hidden="true">' +
            '<svg class="gf-chev" viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg>' +
          '</button>' +
        '</div>' +
      '</div></div>';

    var files = root.querySelector(".gf-files");
    var hit = root.querySelector(".gf-hit");
    var toggle = root.querySelector(".gf-toggle");
    var info = root.querySelector(".gf-info");
    var art = root.querySelector(".gf-art");

    /* três folhas coloridas atrás: só o efeito de leque ao abrir */
    var sheets = [
      { slot: -1, depth: 2, z: 1, jr: "-1.2deg", c: (n + 1) % 4 },
      { slot: 1, depth: 1, z: 2, jr: "1.4deg", c: (n + 2) % 4 },
      { slot: 0, depth: 0, z: 3, jr: "0deg", c: n % 4 }
    ];
    sheets.forEach(function (d) {
      var sh = makeSheet(d.c);
      sh.classList.add("gf-sheet--ghost");
      sh.style.setProperty("--gf-slot", d.slot);
      sh.style.setProperty("--gf-depth", d.depth);
      sh.style.setProperty("--gf-jr", d.jr);
      sh.style.zIndex = d.z;
      files.appendChild(sh);
    });

    /* o card original vai para a FRENTE do vidro (links e botões intactos) */
    panel.insertBefore(root, item);
    info.appendChild(item);

    /* ---- abrir / fechar ---- */
    var open = false;
    function setOpen(o) {
      open = o;
      if (o) root.setAttribute("data-open", "");
      else root.removeAttribute("data-open");
      hit.setAttribute("aria-expanded", String(o));
      hit.setAttribute("aria-label", (o ? "Fechar pasta: " : "Abrir pasta: ") + title);
    }
    function flip() {
      if (!open) closeAll(api);
      setOpen(!open);
    }
    hit.addEventListener("click", flip);
    toggle.addEventListener("click", flip);
    setOpen(false);

    /* ---- luz e paralaxe seguem o mouse ---- */
    var raf = 0, px = 0, py = 0;
    function write() {
      raf = 0;
      root.style.setProperty("--gf-px", px.toFixed(3));
      root.style.setProperty("--gf-py", py.toFixed(3));
    }
    root.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      var r = root.getBoundingClientRect();
      px = ((e.clientX - r.left) / r.width) * 2 - 1;
      py = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (!raf) raf = requestAnimationFrame(write);
    });
    root.addEventListener("pointerleave", function () {
      px = 0; py = 0;
      if (!raf) raf = requestAnimationFrame(write);
    });

    /* ---- escala: acompanha a largura da célula ---- */
    var k = 1;
    function resize() {
      var width = root.clientWidth || W;
      k = width / W;
      root.style.setProperty("--gf-k", k.toFixed(4));
    }
    resize();
    if (typeof ResizeObserver !== "undefined") new ResizeObserver(resize).observe(root);
    else window.addEventListener("resize", resize);

    /* ---- arte do painel de trás ---- */
    var dpr = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1));
    var density = dpr * Math.min(Math.max(k, 0.8), 1.1);
    paint(RECIPE, 3 + (index % 4), Math.round((W + 24) * density), Math.round((H + 24) * density), function (src) {
      art.width = src.width;
      art.height = src.height;
      art.getContext("2d").drawImage(src, 0, 0);
      art.setAttribute("data-ready", "");
    });

    /* ---- entrada: monta quando aparece na tela ---- */
    function enter() { root.setAttribute("data-entered", ""); }
    if (typeof IntersectionObserver === "undefined") enter();
    else {
      var io = new IntersectionObserver(function (entries) {
        if (!entries.some(function (e) { return e.isIntersecting; })) return;
        io.disconnect();
        window.setTimeout(enter, 80 + (n % 6) * 90);
      }, { threshold: 0.2 });
      io.observe(root);
    }

    var api = {
      el: root,
      isOpen: function () { return open; },
      setOpen: setOpen,
      focusHit: function () { hit.focus(); }
    };
    roots.push(api);
  }

  function build(panel) {
    panel.setAttribute("data-pasta", "1");
    var items = Array.prototype.slice.call(panel.querySelectorAll(":scope > .registro"));
    if (!items.length) items = Array.prototype.slice.call(panel.children);
    items.forEach(function (item, i) { buildOne(panel, item, i + 1, counter++); });
  }

  /* ---------- observa a lista: o script.js desenha os grupos depois ---------- */
  var counter = 0, scheduled = false;

  function scan() {
    scheduled = false;
    var panels = document.querySelectorAll(".grupo-card > div:not([data-pasta])");
    for (var i = 0; i < panels.length; i++) build(panels[i]);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(scan);
  }

  function start() {
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
    schedule();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();