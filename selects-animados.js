/* =========================================================
   selects-animados.js — IFCE LAB (práticas)

   O painel nativo de um <select> não pode ser animado com CSS
   (principalmente no Firefox). Este script coloca por cima de cada
   <select> uma lista própria, que abre com animação.

   - O <select> original continua na página, escondido, e recebe o
     valor escolhido + os eventos "input" e "change". Então tudo que o
     script.js já faz com ele continua funcionando.
   - Se a maioria das opções for nome de cor (Preto, Marrom, Vermelho…)
     a lista vira uma paleta de amostras.
   - Teclado: setas, Home/End, Enter/Espaço, Esc e digitar a inicial.

   Uso: no HTML, depois do script.js:
     <script src="selects-animados.js"></script>
   ========================================================= */
(function () {
  "use strict";


  /* ---------- estilo embutido ----------
     As listas animadas carregam o próprio CSS, então funcionam mesmo se o
     praticas.css estiver desatualizado ou guardado no cache do navegador. */
  (function injectCss() {
    if (document.getElementById("selects-animados-css")) return;
    var st = document.createElement("style");
    st.id = "selects-animados-css";
    st.textContent = `.sel {
    --surface-2: rgba(255, 255, 255, 0.08);
    --line: rgba(255, 255, 255, 0.1);
    --green-soft: #34d399;
    --dim: #93a89d;
}
/* =========================================================
   LISTAS DE ESCOLHA ANIMADAS  (precisa de selects-animados.js)
   Tudo desenhado em CSS: seta, marca de seleção e bolinhas.
   ========================================================= */

.sel { position: relative; width: 100%; }

/* o <select> original continua existindo, só fica escondido */
.sel > select.sel-native {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: 0;
    opacity: 0;
    overflow: hidden;
    pointer-events: none;
}

.sel-btn {
    all: unset;
    box-sizing: border-box;
    position: relative;
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    min-height: 46px;
    padding: 11px 44px 11px 14px;
    font-family: inherit;
    font-size: 15px;
    font-weight: 500;
    color: #fff;
    background: var(--surface-2);
    border: 1.5px solid var(--line);
    border-radius: 14px;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
}

.sel-btn:hover { border-color: rgba(255, 255, 255, 0.24); }

.sel-btn:focus-visible,
.sel[data-open] .sel-btn {
    background: rgba(255, 255, 255, 0.11);
    border-color: var(--tone, var(--green-soft));
    box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.07);
}

.sel-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.sel-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.sel-btn[data-empty] .sel-label { color: rgba(255, 255, 255, 0.4); }

/* seta: um quadrado com duas bordas, girado */
.sel-btn::after {
    content: "";
    position: absolute;
    right: 18px;
    top: 50%;
    width: 8px;
    height: 8px;
    border-right: 2px solid #d8f3e4;
    border-bottom: 2px solid #d8f3e4;
    transform: translateY(-75%) rotate(45deg);
    transition: transform 0.35s cubic-bezier(0.34, 1.36, 0.5, 1);
}

.sel[data-open] .sel-btn::after { transform: translateY(-25%) rotate(225deg); }

/* bolinha de cor (círculo + reflexo, só CSS) */
.sel-dot {
    flex: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background:
        radial-gradient(circle at 32% 28%, rgba(255, 255, 255, 0.55), transparent 42%),
        var(--c, #888);
    box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(255, 255, 255, 0.16);
}

/* ---- painel que abre ---- */
.sel-list {
    position: absolute;
    left: 0;
    right: 0;
    top: calc(100% + 8px);
    z-index: 40;
    max-height: 290px;
    margin: 0;
    padding: 6px;
    list-style: none;
    overflow-y: auto;
    background: #13201b;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 16px;
    box-shadow: 0 24px 48px -16px rgba(0, 0, 0, 0.85);
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
    transform-origin: 50% 0;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px) scaleY(0.82);
    transition:
        opacity 0.2s ease,
        transform 0.38s cubic-bezier(0.2, 0.8, 0.2, 1),
        visibility 0s linear 0.38s;
}

.sel[data-open] .sel-list {
    opacity: 1;
    visibility: visible;
    transform: none;
    transition-delay: 0s;
}

/* abre para cima quando não há espaço embaixo */
.sel[data-up] .sel-list {
    top: auto;
    bottom: calc(100% + 8px);
    transform-origin: 50% 100%;
    transform: translateY(10px) scaleY(0.82);
}
.sel[data-up][data-open] .sel-list { transform: none; }

/* cada opção entra em sequência */
.sel-item {
    position: relative;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    font-size: 15px;
    color: #e7f3ec;
    border-radius: 11px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
}

.sel[data-open] .sel-item {
    animation: selItem 0.38s cubic-bezier(0.2, 0.8, 0.2, 1) both;
    animation-delay: calc(var(--i, 0) * 30ms + 50ms);
}

@keyframes selItem {
    from { opacity: 0; transform: translateY(-9px); }
    to { opacity: 1; transform: none; }
}

.sel-item[data-active] { background: rgba(255, 255, 255, 0.09); }
.sel-item[data-ph] { color: var(--dim); }
.sel-item[aria-disabled="true"] { opacity: 0.4; cursor: not-allowed; }

.sel-item[aria-selected="true"] { color: #fff; font-weight: 700; }

/* marca de selecionado: um "L" girado (check), só bordas */
.sel-item[aria-selected="true"]:not([data-ph])::after {
    content: "";
    margin-left: auto;
    width: 6px;
    height: 11px;
    border-right: 2.5px solid var(--green-soft);
    border-bottom: 2.5px solid var(--green-soft);
    transform: rotate(40deg) translate(-2px, -2px);
}

/* ---- PALETA DE CORES do resistor (grade de amostras) ---- */
.sel[data-grid] .sel-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
    gap: 8px;
    width: max(100%, 300px);
    max-width: min(380px, 86vw);
    right: auto;
    padding: 10px;
    max-height: 340px;
}

.sel[data-grid][data-right] .sel-list { left: auto; right: 0; }

.sel[data-grid] .sel-item {
    flex-direction: column;
    justify-content: center;
    gap: 8px;
    padding: 14px 6px 10px;
    font-size: 12.5px;
    text-align: center;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.07);
    border-radius: 14px;
}

.sel[data-grid] .sel-item:hover,
.sel[data-grid] .sel-item[data-active] {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.22);
}

.sel[data-grid] .sel-dot {
    width: 36px;
    height: 36px;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.sel[data-grid] .sel-item:hover .sel-dot,
.sel[data-grid] .sel-item[data-active] .sel-dot { transform: scale(1.18); }

.sel[data-grid] .sel-item[data-ph] {
    grid-column: 1 / -1;
    flex-direction: row;
    padding: 8px;
    background: none;
    border-style: dashed;
}

.sel[data-grid] .sel-item[aria-selected="true"]:not([data-ph]) {
    border-color: var(--green-soft);
    background: rgba(52, 211, 153, 0.12);
}

/* no modo paleta, o check vai para o canto da amostra */
.sel[data-grid] .sel-item[aria-selected="true"]:not([data-ph])::after {
    position: absolute;
    top: 8px;
    right: 10px;
    margin: 0;
    width: 5px;
    height: 9px;
}

/* amostras "pulam" ao abrir, uma depois da outra */
.sel[data-grid][data-open] .sel-item {
    animation: selPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    animation-delay: calc(var(--i, 0) * 38ms + 60ms);
}

@keyframes selPop {
    0% { opacity: 0; transform: translateY(-10px) scale(0.55); }
    100% { opacity: 1; transform: none; }
}

/* o card com a lista aberta precisa ficar por cima dos outros */
.registro.sel-raise { z-index: 30; }

/* =========================================================
   FAIXAS DO RESISTOR: animam ao aparecer e ao trocar de cor
   ========================================================= */

.faixa-dinamica {
    transform-origin: 50% 50%;
    transition: background-color 0.5s ease, filter 0.3s ease;
    animation: faixaIn 0.6s cubic-bezier(0.2, 0.8, 0.2, 1) both;
}

.faixa-dinamica:nth-child(2) { animation-delay: 0.06s; }
.faixa-dinamica:nth-child(3) { animation-delay: 0.12s; }
.faixa-dinamica:nth-child(4) { animation-delay: 0.18s; }
.faixa-dinamica:nth-child(5) { animation-delay: 0.24s; }
.faixa-dinamica:nth-child(6) { animation-delay: 0.3s; }

@keyframes faixaIn {
    0% { opacity: 0; transform: scaleY(0); }
    60% { opacity: 1; transform: scaleY(1.14); }
    100% { opacity: 1; transform: scaleY(1); }
}

.resistor-dinamico { transition: transform 0.3s ease; }
.resistor-dinamico:hover { transform: translateY(-2px); }

@media (max-width: 768px) {
    .sel[data-grid] .sel-list { width: 100%; max-width: none; right: 0; }
}
`;
    document.head.appendChild(st);
  })();

  var COLORS = {
    preto: "#16181d", marrom: "#7b4a24", vermelho: "#e0382d", laranja: "#f58a1f",
    amarelo: "#f7d417", verde: "#2fa84f", azul: "#2f6fe0", violeta: "#8a47d0",
    roxo: "#8a47d0", cinza: "#8b919b", branco: "#f6f6f4", ouro: "#d4af37",
    dourado: "#d4af37", prata: "#c4c8d0", rosa: "#ee74ab"
  };

  function norm(t) {
    return (t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }

  function colorOf(opt) {
    if (!opt || opt.value === "") return null;
    var v = opt.value || "";
    if (/^#[0-9a-f]{3,8}$/i.test(v)) return v;
    var d = opt.getAttribute("data-cor") || opt.getAttribute("data-color");
    if (d) return d;
    if (opt.style && opt.style.backgroundColor) return opt.style.backgroundColor;
    var t = norm(opt.textContent);
    for (var k in COLORS) {
      if (new RegExp("(^|[^a-z])" + k).test(t)) return COLORS[k];
    }
    return null;
  }

  var all = [];
  var protoValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  var protoIndex = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "selectedIndex");

  function closeOthers(except) {
    all.forEach(function (s) { if (s !== except) s.close(); });
  }

  document.addEventListener("pointerdown", function (e) {
    all.forEach(function (s) { if (s.isOpen() && !s.el.contains(e.target)) s.close(); });
  });

  function enhance(sel) {
    if (sel.getAttribute("data-sel") || sel.multiple || sel.size > 1) return;
    sel.setAttribute("data-sel", "1");

    var wrap = document.createElement("div");
    wrap.className = "sel";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sel-btn";
    btn.setAttribute("aria-haspopup", "listbox");
    btn.setAttribute("aria-expanded", "false");
    var list = document.createElement("ul");
    list.className = "sel-list";
    list.setAttribute("role", "listbox");

    sel.parentNode.insertBefore(wrap, sel);
    wrap.appendChild(btn);
    wrap.appendChild(list);
    wrap.appendChild(sel);
    sel.classList.add("sel-native");
    sel.tabIndex = -1;

    var grid = false;
    var active = -1;
    var typed = "", typedTimer = 0, lowerTimer = 0;

    function card() { return wrap.closest(".registro"); }

    function build() {
      list.innerHTML = "";
      var opts = Array.prototype.slice.call(sel.options);
      var real = 0, cols = 0;
      opts.forEach(function (o) {
        if (o.value !== "") { real++; if (colorOf(o)) cols++; }
      });
      grid = real > 0 && cols / real >= 0.6;
      if (grid) wrap.setAttribute("data-grid", ""); else wrap.removeAttribute("data-grid");

      opts.forEach(function (o, i) {
        var li = document.createElement("li");
        li.className = "sel-item";
        li.setAttribute("role", "option");
        li.setAttribute("data-index", String(i));
        li.style.setProperty("--i", i);
        if (o.value === "") li.setAttribute("data-ph", "");
        if (o.disabled) li.setAttribute("aria-disabled", "true");
        var c = colorOf(o);
        if (c) {
          var dot = document.createElement("span");
          dot.className = "sel-dot";
          dot.style.setProperty("--c", c);
          li.appendChild(dot);
        }
        var tx = document.createElement("span");
        tx.textContent = o.textContent;
        li.appendChild(tx);
        list.appendChild(li);
      });
      sync();
    }

    function sync() {
      var i = protoIndex.get.call(sel);
      var o = sel.options[i];
      btn.innerHTML = "";
      var c = o ? colorOf(o) : null;
      if (c) {
        var dot = document.createElement("span");
        dot.className = "sel-dot";
        dot.style.setProperty("--c", c);
        btn.appendChild(dot);
      }
      var lab = document.createElement("span");
      lab.className = "sel-label";
      lab.textContent = o ? o.textContent : "";
      btn.appendChild(lab);
      if (!o || o.value === "") btn.setAttribute("data-empty", ""); else btn.removeAttribute("data-empty");
      btn.disabled = sel.disabled;
      Array.prototype.forEach.call(list.children, function (li, n) {
        li.setAttribute("aria-selected", String(n === i));
      });
    }

    function markActive(scroll) {
      Array.prototype.forEach.call(list.children, function (li, n) {
        if (n === active) {
          li.setAttribute("data-active", "");
          if (scroll) li.scrollIntoView({ block: "nearest" });
        } else li.removeAttribute("data-active");
      });
    }

    function isOpen() { return wrap.hasAttribute("data-open"); }

    function open() {
      if (sel.disabled || isOpen()) return;
      closeOthers(api);
      sync();
      window.clearTimeout(lowerTimer);

      var r = btn.getBoundingClientRect();
      var rows = Math.min(list.children.length, 6);
      var need = grid ? 330 : Math.min(290, rows * 44 + 16);
      var below = window.innerHeight - r.bottom;
      if (below < need + 16 && r.top > below) wrap.setAttribute("data-up", "");
      else wrap.removeAttribute("data-up");
      if (grid && r.left + 300 > window.innerWidth - 16) wrap.setAttribute("data-right", "");
      else wrap.removeAttribute("data-right");

      var reg = card();
      if (reg) reg.classList.add("sel-raise");
      wrap.setAttribute("data-open", "");
      btn.setAttribute("aria-expanded", "true");
      active = Math.max(0, protoIndex.get.call(sel));
      markActive(true);
    }

    function close() {
      if (!isOpen()) return;
      wrap.removeAttribute("data-open");
      btn.setAttribute("aria-expanded", "false");
      var reg = card();
      lowerTimer = window.setTimeout(function () {
        if (!isOpen() && reg) reg.classList.remove("sel-raise");
      }, 420);
    }

    function choose(i) {
      var o = sel.options[i];
      if (!o || o.disabled) return;
      var changed = protoIndex.get.call(sel) !== i;
      protoIndex.set.call(sel, i);
      sync();
      close();
      btn.focus();
      if (changed) {
        sel.dispatchEvent(new Event("input", { bubbles: true }));
        sel.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }

    function move(step) {
      var n = list.children.length;
      if (!n) return;
      var i = active;
      for (var tries = 0; tries < n; tries++) {
        i = (i + step + n) % n;
        if (!sel.options[i].disabled) break;
      }
      active = i;
      markActive(true);
    }

    btn.addEventListener("click", function () { if (isOpen()) close(); else open(); });

    btn.addEventListener("keydown", function (e) {
      var k = e.key;
      if (!isOpen()) {
        if (k === "ArrowDown" || k === "ArrowUp" || k === "Enter" || k === " ") {
          e.preventDefault(); open();
        }
        return;
      }
      if (k === "ArrowDown") { e.preventDefault(); move(1); }
      else if (k === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (k === "Home") { e.preventDefault(); active = 0; markActive(true); }
      else if (k === "End") { e.preventDefault(); active = list.children.length - 1; markActive(true); }
      else if (k === "Enter" || k === " ") { e.preventDefault(); choose(active); }
      else if (k === "Escape") { e.preventDefault(); close(); }
      else if (k === "Tab") close();
      else if (k.length === 1) {
        typed += norm(k);
        window.clearTimeout(typedTimer);
        typedTimer = window.setTimeout(function () { typed = ""; }, 600);
        for (var n = 0; n < sel.options.length; n++) {
          var idx = (active + 1 + n) % sel.options.length;
          if (norm(sel.options[idx].textContent).indexOf(typed) === 0 && !sel.options[idx].disabled) {
            active = idx; markActive(true); break;
          }
        }
      }
    });

    list.addEventListener("mouseover", function (e) {
      var li = e.target.closest(".sel-item");
      if (!li) return;
      active = Number(li.getAttribute("data-index"));
      markActive(false);
    });

    list.addEventListener("click", function (e) {
      var li = e.target.closest(".sel-item");
      if (li) choose(Number(li.getAttribute("data-index")));
    });

    /* mudanças feitas pelo script.js (valor, opções, desativar) acompanham */
    sel.addEventListener("change", sync);
    ["value", "selectedIndex"].forEach(function (prop) {
      var d = prop === "value" ? protoValue : protoIndex;
      Object.defineProperty(sel, prop, {
        configurable: true,
        get: function () { return d.get.call(sel); },
        set: function (v) { d.set.call(sel, v); sync(); }
      });
    });
    new MutationObserver(function (muts) {
      var rebuild = muts.some(function (m) { return m.type === "childList"; });
      if (rebuild) build(); else sync();
    }).observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled", "selected"] });

    build();

    var api = { el: wrap, isOpen: isOpen, close: close };
    all.push(api);
  }

  var scheduled = false;

  function scan() {
    scheduled = false;
    all = all.filter(function (s) { return document.body.contains(s.el); });
    var sels = document.querySelectorAll("select:not([data-sel])");
    for (var i = 0; i < sels.length; i++) enhance(sels[i]);
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