/* Outils d'interface partagés : fenêtres, messages, icônes, cosmétiques, effets de particules. */
(function (P4) {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  const ICONS = {
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    double: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8.5" cy="12" r="6" fill="var(--p1)" stroke="var(--ink)" stroke-width="1.6"/><circle cx="15.5" cy="12" r="6" fill="var(--p1)" stroke="var(--ink)" stroke-width="1.6"/></svg>',
    bomb: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="14" r="7" fill="var(--ink)"/><path d="M15 8l2.5-2.5M18 3v2M21 6h-2M20.5 3.5l-1.4 1.4" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/></svg>',
    block: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="2" width="10" height="20" rx="3" fill="none" stroke="var(--ink)" stroke-width="2"/><path d="M5 19L19 5" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round"/></svg>',
    swap: '<svg viewBox="0 0 24 24" fill="none" stroke="var(--ink)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h14l-3-3M20 16H6l3 3"/></svg>',
    lockWhite: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2" fill="#fff"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>'
  };

  // --- Fenêtre (feuille) ---
  let onCloseCb = null, dismissible = true, lastFocus = null;
  function openSheet(html, opts = {}) {
    lastFocus = document.activeElement;
    $("sheetBody").innerHTML = html;
    $("sheet").hidden = false;
    onCloseCb = opts.onClose || null;
    dismissible = opts.dismissible !== false;
    const first = $("sheetBody").querySelector("[data-autofocus]") || $("sheetBody").querySelector("button");
    if (first) first.focus({ preventScroll: true });
  }
  function closeSheet() {
    if ($("sheet").hidden) return;
    $("sheet").hidden = true;
    $("sheetBody").innerHTML = "";
    const cb = onCloseCb; onCloseCb = null;
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    if (cb) cb();
  }
  $("sheet").addEventListener("click", e => { if (e.target === $("sheet") && dismissible) closeSheet(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("sheet").hidden && dismissible) closeSheet(); });

  let toastTimer;
  function toast(msg, ms = 2800) {
    const t = $("toast");
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }

  // --- Cosmétiques : on change seulement des variables CSS ---
  function applyCosmetics() {
    const Pr = P4.Progress, root = document.documentElement.style;
    const tok = Pr.equipped("tokens").data, brd = Pr.equipped("boards").data;
    root.setProperty("--p1", tok.c1[0]); root.setProperty("--p1-deep", tok.c1[1]);
    root.setProperty("--p2", tok.c2[0]); root.setProperty("--p2-deep", tok.c2[1]);
    root.setProperty("--board", brd.board); root.setProperty("--board-edge", brd.edge);
    const board = $("board");
    board.className = board.className.replace(/\bv-\w+/g, "").trim() + " v-" + Pr.equipped("victory").data.anim;
  }

  // Aperçu visuel d'un objet du catalogue (boutique, pass)
  function preview(item) {
    const d = item.data;
    const disc = (c) => `<span class="pd" style="background:radial-gradient(circle, ${c[0]} 50%, ${c[1]} 52%, ${c[1]} 58%, ${c[0]} 60%)"></span>`;
    switch (item.cat) {
      case "tokens": return `<div class="preview"><div class="pair">${disc(d.c1)}${disc(d.c2)}</div></div>`;
      case "boards": return `<div class="preview"><div class="mini-board" style="background:${d.board}">${"<i></i>".repeat(item.id ? 8 : 8)}</div></div>`;
      case "avatars": return `<div class="preview"><span class="emoji">${d.emoji}</span></div>`;
      case "victory": return `<div class="preview v-${d.anim}"><div class="vrow discs">${'<span class="disc p1 win"></span>'.repeat(4)}</div></div>`;
      case "effects": return `<div class="preview"><span class="pd fx-prev" style="background:radial-gradient(circle, var(--p2) 50%, var(--p2-deep) 52%, var(--p2-deep) 58%, var(--p2) 60%)"></span><small style="position:absolute;bottom:6px;font-weight:700;font-size:11px;color:var(--muted)">${esc(item.name)}</small></div>`;
    }
    return `<div class="preview"></div>`;
  }

  // --- Particules (confettis, feu d'artifice, feuilles, étincelles) ---
  const canvas = $("fx"), ctx = canvas.getContext("2d");
  let parts = [], running = false;
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  addEventListener("resize", resize); resize();
  function loop() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(p => p.life > 0);
    for (const p of parts) {
      p.vy += p.g; p.vx *= p.drag; p.vy *= p.drag;
      if (p.sway) p.vx += Math.sin(p.life / 9 + p.seed) * p.sway;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life--;
      ctx.save();
      ctx.globalAlpha = Math.min(1, p.life / 25);
      ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if (p.shape === "rect") ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      else if (p.shape === "leaf") { ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size / 2, 0, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    if (parts.length) requestAnimationFrame(loop);
    else { running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); }
  }
  function add(list) {
    if (reduceMotion()) return;
    parts.push(...list);
    if (!running) { running = true; requestAnimationFrame(loop); }
  }
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const base = o => ({ vr: 0, rot: 0, g: 0, drag: 1, life: 60, size: 6, shape: "dot", seed: Math.random() * 10, ...o });

  const FX = {
    burst(x, y, colors, n = 16, speed = 4.5) {
      add(Array.from({ length: n }, () => {
        const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random());
        return base({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 0.12, drag: 0.95, life: 30 + Math.random() * 20, size: 3 + Math.random() * 4, color: pick(colors) });
      }));
    },
    confetti(colors) {
      add(Array.from({ length: 140 }, () => base({
        x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.5, vx: (Math.random() - .5) * 2, vy: 2 + Math.random() * 3,
        g: 0.03, life: 200, size: 8 + Math.random() * 6, shape: "rect", vr: (Math.random() - .5) * .3, color: pick(colors)
      })));
    },
    fireworks(colors, rect) {
      for (let i = 0; i < 5; i++) setTimeout(() => {
        const x = rect.left + Math.random() * rect.width, y = rect.top + Math.random() * rect.height * 0.5;
        this.burst(x, y, colors.concat("#ffffff"), 40, 6);
      }, i * 280);
    },
    leaves() {
      const colors = ["#E07B1F", "#C46F25", "#B8912E", "#8F3B1B", "#F2A65A"];
      add(Array.from({ length: 50 }, () => base({
        x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.6, vx: 0, vy: 1.2 + Math.random(), sway: 0.08,
        life: 320, size: 9 + Math.random() * 5, shape: "leaf", vr: (Math.random() - .5) * .08, color: pick(colors)
      })));
    }
  };

  P4.UI = { $, esc, ICONS, openSheet, closeSheet, toast, applyCosmetics, preview, FX, reduceMotion, get sheetOpen() { return !$("sheet").hidden; } };
})(window.P4 = window.P4 || {});
