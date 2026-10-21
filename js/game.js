/* Contrôleur de partie : un seul plateau, cinq modes.
   Le jeu classique d'origine est conservé (gravité, victoires, scores, nouvelle partie, clavier) ;
   les modes ajoutent des règles par-dessus sans toucher au moteur. */
(function (P4) {
  const E = P4.Engine, AI = P4.AI, Pr = P4.Progress, D = P4.Daily, UI = P4.UI;
  const { $, esc, ICONS } = UI;
  const ROWS = 6, COLS = 7;

  const MODES = {
    classic: {
      name: "Classique", tagline: "Les règles que tout le monde connaît.",
      rules: [
        "Chacun son tour, lâche un jeton dans une colonne : il tombe tout en bas.",
        "Le premier qui aligne 4 jetons gagne, à l'horizontale, à la verticale ou en diagonale.",
        "Plateau plein sans alignement : match nul.",
        "Le joueur qui commence change à chaque partie."
      ],
      options: ["opponent", "level"]
    },
    powers: {
      name: "Pouvoirs", tagline: "Quatre capacités spéciales, une seule utilisation chacune.",
      rules: [
        "Règles classiques, et chaque joueur dispose de 4 pouvoirs utilisables une fois par partie, un seul par tour.",
        "Double coup : tu poses 2 jetons d'affilée, dans deux colonnes différentes.",
        "Jeton explosif : tu retires un jeton adverse, ceux du dessus tombent d'une case. Si la chute crée un alignement, il compte, même pour ton adversaire. Cela remplace ton coup.",
        "Colonne bloquée : ton adversaire ne peut pas jouer dans cette colonne à son prochain tour. Tu joues ensuite normalement.",
        "Permutation : tu échanges deux jetons voisins de couleurs différentes (haut, bas, gauche ou droite). Cela remplace ton coup.",
        "Chaque pouvoir demande une confirmation, puis le choix de la cible. Tu peux annuler jusqu'au dernier moment."
      ],
      options: []
    },
    chrono: {
      name: "Chrono", tagline: "Réfléchis vite : chaque joueur a son propre temps.",
      rules: [
        "Règles classiques, plus une réserve de temps par joueur pour toute la partie.",
        "Ton horloge tourne seulement pendant ton tour, et s'arrête si tu ouvres les règles.",
        "Si ton temps tombe à zéro, tu perds la partie.",
        "Sous 10 secondes, ton horloge passe en rouge."
      ],
      options: ["opponent", "level", "time"]
    },
    daily: {
      name: "Défi du jour", tagline: "Une position à résoudre, la même pour tout le monde aujourd'hui.",
      rules: [
        "Tu joues les jetons du joueur 1 à partir d'une position déjà commencée.",
        "Objectif : gagner en un nombre de coups maximum, contre l'ordinateur qui défend au mieux.",
        "3 étoiles si tu réussis dans l'objectif, 2 étoiles avec jusqu'à 2 coups de plus, 1 étoile au-delà.",
        "Tu peux réessayer autant que tu veux. Les pièces sont données à la première réussite, puis si tu améliores tes étoiles.",
        "Un nouveau défi apparaît chaque jour à minuit."
      ],
      options: []
    },
    training: {
      name: "Entraînement", tagline: "Progresse contre l'ordinateur, avec conseils et retour en arrière.",
      rules: [
        "Tu joues contre l'ordinateur, au niveau de ton choix.",
        "Facile : il joue de façon accessible et laisse passer des occasions.",
        "Moyen : il gagne quand il peut et bloque les menaces évidentes.",
        "Difficile : il anticipe plusieurs coups à l'avance et prépare des pièges.",
        "Conseil : l'ordinateur te montre le meilleur coup. Annuler : tu reviens avant ton dernier coup."
      ],
      options: ["level"]
    }
  };

  const POWERS = {
    double: { name: "Double coup", desc: "Tu vas poser 2 jetons d'affilée, dans deux colonnes différentes. Si ton premier jeton aligne 4, tu gagnes tout de suite." },
    bomb: { name: "Jeton explosif", desc: "Choisis un jeton adverse : il disparaît et les jetons du dessus tombent d'une case. Attention, si la chute aligne 4 jetons adverses, ton adversaire gagne. Cela remplace ton coup." },
    block: { name: "Colonne bloquée", desc: "Choisis une colonne : ton adversaire ne pourra pas y jouer à son prochain tour. Tu joues ensuite normalement." },
    swap: { name: "Permutation", desc: "Choisis deux jetons voisins de couleurs différentes (haut, bas, gauche ou droite) : ils échangent leur place. Cela remplace ton coup." }
  };

  // ---------- État de la partie ----------
  const G = {
    mode: "classic", vsAI: false, level: "medium", chronoSecs: 180,
    grid: E.create(), current: 1, starter: 1, over: false, busy: false, gen: 0,
    scores: { 1: 0, 2: 0 }, moves: { 1: 0, 2: 0 },
    stack: [], hintCol: -1,
    powers: null, powerThisTurn: false, extraDrop: 0, doubleFirstCol: -1,
    blocked: null,       // { col, player } : colonne interdite au joueur "player" pendant son prochain tour
    targeting: null,     // { kind, sel: [] }
    clocks: { 1: 0, 2: 0 },
    puzzle: null, dailyDate: null,
    hoverCol: 3
  };

  // ---------- Construction du plateau (comme la version d'origine) ----------
  const discsEl = $("discs"), frontEl = $("front"), colsEl = $("cols"), boardEl = $("board");
  const ghost = $("ghost"), statusEl = $("status"), bannerEl = $("banner"), blockLayer = $("blockLayer");
  const slots = [];
  for (let r = 0; r < ROWS; r++) {
    slots.push([]);
    for (let c = 0; c < COLS; c++) {
      const s = document.createElement("div");
      s.className = "slot";
      s.addEventListener("click", () => onSlotClick(r, c));
      discsEl.appendChild(s);
      slots[r].push(s);
      const h = document.createElement("div");
      h.className = "hole";
      frontEl.appendChild(h);
    }
  }
  const colBtns = [];
  for (let c = 0; c < COLS; c++) {
    const b = document.createElement("button");
    b.className = "col";
    b.setAttribute("aria-label", "Colonne " + (c + 1));
    b.addEventListener("click", () => onColumn(c));
    b.addEventListener("pointerenter", () => setHover(c));
    b.addEventListener("focus", () => setHover(c));
    colsEl.appendChild(b);
    colBtns.push(b);
  }

  const discEl = (r, c) => slots[r][c].firstChild;
  const human = p => !(G.vsAI && p === 2);
  const blockedFor = p => (G.blocked && G.blocked.player === p ? G.blocked.col : -1);

  // ---------- Démarrage ----------
  function setup(mode, opts = {}) {
    G.mode = mode;
    G.vsAI = mode === "training" || mode === "daily" || ((mode === "classic" || mode === "chrono") && opts.opponent === "ai");
    G.level = mode === "daily" ? "hard" : (opts.level || "medium");
    G.chronoSecs = opts.time || 180;
    G.scores = { 1: 0, 2: 0 };
    G.starter = 1;
    $("modeTitle").textContent = MODES[mode].name;
    $("powersPanel").hidden = mode !== "powers";
    $("trainingPanel").hidden = mode !== "training";
    $("dailyPanel").hidden = mode !== "daily";
    ["clock1", "clock2"].forEach(id => $(id).hidden = mode !== "chrono");
    ["score1", "score2"].forEach(id => $(id).hidden = mode === "daily");
    $("resetScore").hidden = mode === "daily";
    $("newGame").textContent = mode === "daily" ? "Recommencer le défi" : "Nouvelle partie";
    newGame();
  }

  function newGame() {
    G.gen++;
    G.over = false; G.busy = false;
    G.moves = { 1: 0, 2: 0 };
    G.stack = []; G.hintCol = -1;
    G.powers = { 1: { double: 1, bomb: 1, block: 1, swap: 1 }, 2: { double: 1, bomb: 1, block: 1, swap: 1 } };
    G.powerThisTurn = false; G.extraDrop = 0; G.doubleFirstCol = -1;
    G.blocked = null; G.targeting = null;
    G.clocks = { 1: G.chronoSecs * 1000, 2: G.chronoSecs * 1000 };
    if (G.mode === "daily") {
      G.dailyDate = D.today();
      G.puzzle = D.forDate(G.dailyDate);
      G.grid = E.fromRows(G.puzzle.rows);
      G.current = 1;
    } else {
      G.grid = E.create();
      G.current = G.starter;
      G.starter = G.starter === 1 ? 2 : 1; // on alterne qui commence
    }
    boardEl.classList.remove("over");
    hideBanner();
    renderDiscs();
    render();
    maybeAI();
  }

  // ---------- Coups ----------
  function onColumn(c) {
    if (G.targeting && G.targeting.kind === "block") return pickBlockColumn(c);
    humanPlay(c);
  }

  function humanPlay(c) {
    if (G.over || G.busy || G.targeting || !human(G.current) || UI.sheetOpen) return;
    if (c === blockedFor(G.current)) return say("Cette colonne est bloquée pour ce tour.");
    if (c === G.doubleFirstCol) return say("Double coup : choisis une autre colonne pour ton 2e jeton.");
    play(c);
  }

  function play(c) {
    const r = E.lowestRow(G.grid, c);
    if (r < 0) return say("Cette colonne est pleine, choisis-en une autre.");
    if (G.mode === "training") G.stack.push({ grid: E.clone(G.grid), current: G.current, moves: { ...G.moves } });
    G.busy = true;
    G.hintCol = -1;
    const p = G.current;
    G.grid[r][c] = p;
    G.moves[p]++;
    const t = animateDrop(r, c, p);
    render();
    const gen = G.gen;
    setTimeout(() => { if (gen === G.gen) afterDrop(r, c); }, UI.reduceMotion() ? 50 : (t + 0.2) * 1000);
  }

  function animateDrop(r, c, p, fromRows = r + 1.3) {
    const d = document.createElement("div");
    const fx = Pr.equipped("effects").data.fx;
    d.className = `disc p${p} drop` + (fx === "trail" ? " trail" : fx === "comet" ? " comet" : "");
    d.style.setProperty("--from", `calc(${-fromRows} * var(--cell))`);
    const t = 0.22 + 0.06 * Math.min(r, fromRows);
    d.style.setProperty("--t", t + "s");
    slots[r][c].innerHTML = "";
    slots[r][c].appendChild(d);
    setTimeout(() => landingFx(d, p, fx), t * 1000);
    settle(d, t + 0.25);
    return t;
  }

  // Une fois tombé, le jeton perd sa classe d'animation : il est posé à sa place quoi qu'il arrive
  function settle(d, seconds) {
    setTimeout(() => d.classList.remove("drop", "trail", "comet"), seconds * 1000);
  }

  function landingFx(d, p, fx) {
    if (fx === "shake") { boardEl.classList.remove("shake"); void boardEl.offsetWidth; boardEl.classList.add("shake"); }
    if (fx === "sparkle" || fx === "gold" || fx === "comet") {
      const b = d.getBoundingClientRect();
      const colors = fx === "gold" ? ["#F5D547", "#F2CE6B", "#FFF3B0"] : [cssVar(`--p${p}`), cssVar(`--p${p}-deep`), "#ffffff"];
      UI.FX.burst(b.left + b.width / 2, b.bottom - 4, colors, fx === "gold" ? 22 : 14);
    }
  }
  const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  function afterDrop(r, c) {
    const p = G.current;
    const line = E.winningLine(G.grid, r, c, p);
    if (line) return endGame(p, line);
    if (E.isFull(G.grid)) return endGame(0);
    if (G.extraDrop > 0) {
      G.extraDrop--;
      G.doubleFirstCol = c;
      const left = E.validCols(G.grid, blockedFor(p)).filter(x => x !== c);
      if (left.length) {
        G.busy = false;
        showBanner(`Double coup : pose ton 2e jeton, dans une autre colonne que la ${c + 1}.`);
        render();
        return;
      }
      UI.toast("Aucune autre colonne libre : le 2e jeton du double coup est perdu.");
    }
    endTurn();
  }

  function endTurn() {
    const p = G.current;
    if (G.blocked && G.blocked.player === p) G.blocked = null; // le blocage dure un tour
    G.doubleFirstCol = -1; G.extraDrop = 0; G.powerThisTurn = false;
    hideBanner();
    G.current = 3 - p;
    // Sécurité : si la colonne bloquée était le seul coup possible, on la libère
    if (G.blocked && G.blocked.player === G.current && !E.validCols(G.grid, G.blocked.col).length) {
      G.blocked = null;
      UI.toast("Colonne débloquée : c'était le seul coup possible.");
    }
    G.busy = false;
    render();
    maybeAI();
  }

  function maybeAI() {
    if (G.over || !G.vsAI || G.current !== 2) return;
    G.busy = true;
    render();
    const gen = G.gen;
    setTimeout(() => {
      if (gen !== G.gen || G.over) return;
      const c = AI.choose(G.grid, 2, G.level, blockedFor(2));
      G.busy = false;
      if (c >= 0) play(c);
    }, 450);
  }

  // ---------- Fin de partie ----------
  function endGame(winner, line, reason) {
    G.over = true; G.busy = false; G.targeting = null;
    hideBanner();
    if (winner) G.scores[winner]++;
    if (line) {
      line.forEach(([r, c]) => discEl(r, c) && discEl(r, c).classList.add("win"));
      boardEl.classList.add("over");
      victoryFx(winner);
    }
    statusEl.innerHTML = endText(winner, reason);
    render();

    let summary;
    if (G.mode === "daily") summary = Pr.recordChallenge(G.dailyDate, winner === 1, G.moves[1], G.puzzle.par);
    else summary = Pr.recordGame({ mode: G.mode, vsAI: G.vsAI, level: G.level, winner, myMoves: G.moves[1], timeout: reason === "time" });
    const gen = G.gen;
    setTimeout(() => { if (gen === G.gen && P4.App.current === "game") showResult(winner, reason, summary); }, line ? 1200 : 600);
  }

  function victoryFx(winner) {
    const anim = Pr.equipped("victory").data.anim;
    const colors = [cssVar(`--p${winner}`), cssVar(`--p${winner}-deep`), cssVar("--accent")];
    if (anim === "confetti") UI.FX.confetti(colors);
    if (anim === "fireworks") UI.FX.fireworks(colors, boardEl.getBoundingClientRect());
    if (anim === "leaves") UI.FX.leaves();
  }

  function colorName(p) { const t = Pr.equipped("tokens").data; return p === 1 ? t.n1 : t.n2; }
  function customName(p) { return Pr.isPremium() ? (Pr.state.names["p" + p] || "").trim() : ""; }
  function playerName(p) {
    if (G.vsAI) return p === 1 ? (customName(1) || "Toi") : "Ordi · " + AI.LEVELS[G.level];
    return customName(p) || "Joueur " + colorName(p);
  }
  const span = (p, txt) => `<span class="t${p}">${esc(txt)}</span>`;
  function turnText() {
    const p = G.current;
    if (G.vsAI) return p === 1 ? span(1, "À toi de jouer") : span(2, "L'ordi réfléchit…");
    const n = customName(p);
    return span(p, n ? `Au tour de ${n}` : `Au tour du joueur ${colorName(p)}`);
  }
  function winnerText(p) {
    if (G.vsAI) return p === 1 ? "Tu gagnes !" : "L'ordi gagne";
    const n = customName(p);
    return n ? `${n} gagne !` : `Le joueur ${colorName(p)} gagne !`;
  }
  function endText(winner, reason) {
    if (reason === "time") return span(winner, `Temps écoulé : ${winnerText(winner).replace(" !", "")} !`);
    if (reason === "double") return "Double alignement : match nul.";
    if (!winner) return "Match nul, le plateau est plein.";
    return span(winner, winnerText(winner));
  }

  function showResult(winner, reason, summary) {
    const solo = G.vsAI;
    let title, sub;
    if (G.mode === "daily") {
      title = winner === 1 ? "Défi réussi !" : "Défi raté";
      sub = winner === 1
        ? `Gagné en ${G.moves[1]} coup${G.moves[1] > 1 ? "s" : ""}, pour un objectif de ${G.puzzle.par}.`
        : `L'ordinateur a tenu. Objectif : gagner en ${G.puzzle.par} coups. Réessaie, la solution existe.`;
    } else if (solo) {
      title = winner === 1 ? "Victoire !" : winner === 2 ? "Défaite" : "Match nul";
      sub = reason === "time" ? "Le temps est écoulé." : winner === 2 ? "L'ordinateur a aligné 4 jetons. La prochaine sera la bonne." : winner === 1 ? `Gagné en ${G.moves[1]} coups contre le niveau ${AI.LEVELS[G.level]}.` : "Personne n'a réussi à aligner 4 jetons.";
    } else {
      title = winner ? winnerText(winner) : "Match nul";
      sub = reason === "time" ? "Le temps de l'adversaire est écoulé." : reason === "double" ? "Les deux joueurs ont aligné 4 jetons en même temps." : `Score : ${G.scores[1]} à ${G.scores[2]}.`;
    }
    const stars = G.mode === "daily" && winner === 1
      ? `<div class="big-stars" aria-label="${summary.stars} étoiles sur 3">${"★".repeat(summary.stars)}<span class="off">${"★".repeat(3 - summary.stars)}</span></div>` : "";
    const items = [];
    if (summary.coins) items.push(`<li><span class="coin"></span>+${summary.coins} pièces</li>`);
    if (summary.levelUp) items.push(`<li>Niveau ${Pr.level()} atteint</li>`);
    (summary.achievements || []).forEach(a => items.push(`<li>Succès débloqué : ${esc(a.name)} (+${a.coins} pièces)</li>`));
    if (G.mode === "daily" && winner === 1 && !summary.coins) items.push(`<li>Déjà réussi aujourd'hui : améliore tes étoiles pour gagner plus.</li>`);

    UI.openSheet(`
      <h2 id="sheetTitle">${esc(title)}</h2>
      <p class="sub">${esc(sub)}</p>
      ${stars}
      ${items.length ? `<ul class="rewards">${items.join("")}</ul>` : ""}
      ${solo ? `<div id="resultAd"></div>` : ""}
      <div class="actions">
        <button class="btn" data-autofocus id="againBtn">${G.mode === "daily" ? "Réessayer" : "Rejouer"}</button>
        <button class="btn secondary" id="toModesBtn">Changer de mode</button>
      </div>`);
    $("againBtn").onclick = () => { UI.closeSheet(); newGame(); };
    $("toModesBtn").onclick = () => { UI.closeSheet(); P4.App.show("home"); };
    if (solo) P4.App.renderAdBlock($("resultAd"), "fin_de_partie");
    P4.App.refresh();
  }

  // ---------- Pouvoirs ----------
  function powerAvailable(kind, p) {
    if (G.mode !== "powers" || G.over || G.busy || G.targeting || G.extraDrop || G.powerThisTurn) return false;
    if (!G.powers[p][kind]) return false;
    const g = G.grid;
    if (kind === "double") return E.validCols(g, blockedFor(p)).length >= 2;
    if (kind === "bomb") return E.countDiscs(g, 3 - p) > 0;
    if (kind === "block") return !G.blocked && E.validCols(g).length >= 2;
    if (kind === "swap") return E.hasSwap(g);
    return false;
  }

  function requestPower(kind) {
    const p = G.current;
    if (!powerAvailable(kind, p)) return;
    const pw = POWERS[kind];
    UI.openSheet(`
      <h2 id="sheetTitle">${esc(pw.name)}</h2>
      <p class="sub">${esc(pw.desc)}</p>
      <p class="sub"><b>Une seule utilisation par partie.</b> ${kind === "double" ? "Il prend effet dès que tu confirmes." : "Après confirmation, tu choisis la cible et tu peux encore annuler."}</p>
      <div class="actions">
        <button class="btn" id="usePower">Utiliser ${esc(pw.name.toLowerCase())}</button>
        <button class="btn secondary" id="cancelPower" data-autofocus>Annuler</button>
      </div>`);
    $("cancelPower").onclick = UI.closeSheet;
    $("usePower").onclick = () => { UI.closeSheet(); activatePower(kind); };
  }

  function activatePower(kind) {
    const p = G.current;
    if (!powerAvailable(kind, p)) return;
    if (kind === "double") {
      G.powers[p].double--;
      G.powerThisTurn = true;
      G.extraDrop = 1;
      track("double");
      showBanner("Double coup activé : pose ton 1er jeton.");
      render();
      return;
    }
    G.targeting = { kind, sel: [] };
    updateTargeting();
  }

  function track(kind) {
    const ach = Pr.trackPower(kind);
    ach.forEach(a => UI.toast(`Succès débloqué : ${a.name} (+${a.coins} pièces)`));
    P4.App.refreshTop();
  }

  function cancelTargeting() {
    G.targeting = null;
    hideBanner();
    render();
  }

  function onSlotClick(r, c) {
    const T = G.targeting;
    if (!T || G.busy) return;
    const opp = 3 - G.current;
    if (T.kind === "bomb") {
      if (G.grid[r][c] !== opp) return say("Choisis un jeton de ton adversaire.");
      T.sel = [[r, c]];
    } else if (T.kind === "swap") {
      if (!G.grid[r][c]) return;
      const first = T.sel[0];
      if (!first || T.sel.length === 2) T.sel = [[r, c]];
      else if (first[0] === r && first[1] === c) T.sel = [];
      else if (E.canSwap(G.grid, first, [r, c])) T.sel = [first, [r, c]];
      else T.sel = [[r, c]];
    }
    updateTargeting();
  }

  function pickBlockColumn(c) {
    const T = G.targeting;
    if (!T || G.busy) return;
    if (G.grid[0][c]) return say("Cette colonne est déjà pleine.");
    if (!E.validCols(G.grid, c).length) return say("Ton adversaire doit garder au moins une colonne libre.");
    T.sel = [c];
    updateTargeting();
  }

  // Bandeau d'instructions + surlignage des cibles possibles
  function updateTargeting() {
    const T = G.targeting;
    clearMarks();
    if (!T) return;
    const opp = 3 - G.current;
    let text, ready = false, label = "";
    if (T.kind === "bomb") {
      forEachDisc((r, c, v) => { if (v === opp) { discEl(r, c).classList.add(T.sel[0] && T.sel[0][0] === r && T.sel[0][1] === c ? "selected" : "target"); slots[r][c].classList.add("pickable"); } });
      ready = T.sel.length === 1;
      text = ready ? "Jeton choisi. Confirme l'explosion, ou choisis-en un autre." : "Jeton explosif : touche le jeton adverse à retirer.";
      label = "Faire exploser";
    } else if (T.kind === "swap") {
      const [a] = T.sel;
      forEachDisc((r, c) => {
        const isSel = T.sel.some(s => s[0] === r && s[1] === c);
        const ok = a ? E.canSwap(G.grid, a, [r, c]) : hasNeighbourSwap(r, c);
        if (isSel) discEl(r, c).classList.add("selected");
        else if (ok) discEl(r, c).classList.add("target");
        slots[r][c].classList.add("pickable");
      });
      ready = T.sel.length === 2;
      text = ready ? "Deux jetons choisis. Confirme l'échange." : a ? "Touche un jeton voisin de l'autre couleur." : "Permutation : touche le premier jeton à échanger.";
      label = "Échanger";
    } else if (T.kind === "block") {
      if (T.sel.length) drawBlock(T.sel[0], true);
      ready = T.sel.length === 1;
      text = ready ? `Colonne ${T.sel[0] + 1} choisie. Confirme le blocage.` : "Colonne bloquée : touche la colonne à interdire à ton adversaire.";
      label = "Bloquer";
    }
    colsEl.classList.toggle("off", T.kind !== "block");
    showBanner(text, [
      ready ? { label, primary: true, onClick: confirmTarget } : null,
      { label: "Annuler", onClick: cancelTargeting }
    ]);
    render();
  }

  function hasNeighbourSwap(r, c) {
    return [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dr, dc]) => E.canSwap(G.grid, [r, c], [r + dr, c + dc]));
  }
  function forEachDisc(fn) { for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (G.grid[r][c]) fn(r, c, G.grid[r][c]); }
  function clearMarks() {
    discsEl.querySelectorAll(".target, .selected").forEach(d => d.classList.remove("target", "selected"));
    discsEl.querySelectorAll(".pickable").forEach(s => s.classList.remove("pickable"));
    blockLayer.innerHTML = "";
  }

  function confirmTarget() {
    const T = G.targeting, p = G.current;
    if (!T) return;
    G.targeting = null;
    clearMarks();
    hideBanner();
    colsEl.classList.remove("off");
    G.powers[p][T.kind]--;
    G.powerThisTurn = true;
    track(T.kind);
    const gen = G.gen;
    if (T.kind === "block") {
      G.blocked = { col: T.sel[0], player: 3 - p };
      UI.toast(`Colonne ${T.sel[0] + 1} bloquée pour le prochain tour adverse. À toi de jouer.`);
      render();
      return;
    }
    G.busy = true;
    render();
    if (T.kind === "bomb") {
      const [r, c] = T.sel[0];
      const d = discEl(r, c), b = d.getBoundingClientRect();
      d.classList.add("explode");
      UI.FX.burst(b.left + b.width / 2, b.top + b.height / 2, ["#F5B83D", "#E4572E", "#ffffff"], 26, 6);
      setTimeout(() => {
        if (gen !== G.gen) return;
        const moves = E.removeDisc(G.grid, r, c);
        renderDiscs();
        moves.forEach(m => {
          const [tr, tc] = m.to;
          slots[tr][tc].innerHTML = "";
          const nd = document.createElement("div");
          nd.className = `disc p${G.grid[tr][tc]} drop`;
          nd.style.setProperty("--from", "calc(-1 * var(--cell))");
          nd.style.setProperty("--t", ".2s");
          slots[tr][tc].appendChild(nd);
          settle(nd, 0.45);
        });
        setTimeout(() => { if (gen === G.gen) resolveAfterPower(); }, moves.length ? 450 : 100);
      }, 380);
    } else if (T.kind === "swap") {
      const [a, b2] = T.sel;
      const da = discEl(a[0], a[1]), db = discEl(b2[0], b2[1]);
      const dx = b2[1] - a[1], dy = b2[0] - a[0];
      [da, db].forEach(d => d.classList.add("moving"));
      requestAnimationFrame(() => {
        da.style.transform = `translate(calc(${dx} * var(--cell)), calc(${dy} * var(--cell)))`;
        db.style.transform = `translate(calc(${-dx} * var(--cell)), calc(${-dy} * var(--cell)))`;
      });
      setTimeout(() => {
        if (gen !== G.gen) return;
        E.swap(G.grid, a, b2);
        renderDiscs();
        resolveAfterPower();
      }, 420);
    }
  }

  // Après une explosion ou une permutation, plusieurs cases ont changé : on vérifie les deux joueurs
  function resolveAfterPower() {
    G.moves[G.current]++;
    const w1 = E.findWin(G.grid, 1), w2 = E.findWin(G.grid, 2);
    if (w1 && w2) return endGame(0, null, "double");
    if (w1 || w2) return endGame(w1 ? 1 : 2, w1 || w2);
    if (E.isFull(G.grid)) return endGame(0);
    endTurn();
  }

  // ---------- Entraînement ----------
  function hint() {
    if (G.mode !== "training" || G.over || G.busy || G.current !== 1) return;
    G.hintCol = AI.hint(G.grid, 1);
    setHover(G.hintCol);
    render();
    say(`Conseil : joue dans la colonne ${G.hintCol + 1}.`);
  }
  function undo() {
    if (G.mode !== "training" || G.over || G.busy || !G.stack.length) return;
    let snap = null;
    while (G.stack.length) { const s = G.stack.pop(); if (s.current === 1) { snap = s; break; } }
    if (!snap) return;
    G.grid = snap.grid; G.current = 1; G.moves = snap.moves; G.hintCol = -1;
    renderDiscs();
    render();
    say("Coup annulé : à toi de rejouer.");
  }

  // ---------- Chrono ----------
  let lastTick = performance.now();
  setInterval(() => {
    const now = performance.now(), dt = now - lastTick;
    lastTick = now;
    if (G.mode !== "chrono" || G.over || P4.App.current !== "game" || UI.sheetOpen) return;
    G.clocks[G.current] = Math.max(0, G.clocks[G.current] - dt);
    renderClocks();
    if (G.clocks[G.current] <= 0) endGame(3 - G.current, null, "time");
  }, 100);
  function fmt(ms) { const s = Math.ceil(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
  function renderClocks() {
    for (const p of [1, 2]) {
      const el = $("clock" + p);
      el.textContent = fmt(G.clocks[p]);
      el.classList.toggle("low", G.clocks[p] < 10000 && !G.over && G.current === p);
    }
  }

  // ---------- Affichage ----------
  function renderDiscs() {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        slots[r][c].innerHTML = "";
        if (G.grid[r][c]) {
          const d = document.createElement("div");
          d.className = "disc p" + G.grid[r][c];
          slots[r][c].appendChild(d);
        }
      }
  }

  function drawBlock(col, preview) {
    const m = document.createElement("div");
    m.className = "block-mark" + (preview ? " preview" : "");
    m.style.left = `calc(var(--pad) + ${col} * var(--cell))`;
    m.innerHTML = ICONS.lockWhite;
    blockLayer.appendChild(m);
  }

  function render() {
    // Joueurs
    $("score1").textContent = G.scores[1];
    $("score2").textContent = G.scores[2];
    $("name1").textContent = playerName(1);
    $("name2").textContent = playerName(2);
    $("ava1").textContent = Pr.equipped("avatars").data.emoji;
    $("ava2").textContent = G.vsAI ? "🤖" : "🙂";
    $("p1").classList.toggle("active", !G.over && G.current === 1);
    $("p2").classList.toggle("active", !G.over && G.current === 2);
    document.querySelectorAll(".x2").forEach(x => x.remove());
    if (G.extraDrop || G.doubleFirstCol >= 0) {
      const tag = document.createElement("span");
      tag.className = "x2"; tag.textContent = "×2";
      $("ava" + G.current).appendChild(tag);
    }
    if (G.mode === "chrono") renderClocks();
    if (!G.over && !G.targeting) statusEl.innerHTML = turnText();

    // Colonnes jouables
    const myBlock = blockedFor(G.current);
    colBtns.forEach((b, c) => {
      b.disabled = G.over || (G.targeting && G.targeting.kind === "block" ? !!G.grid[0][c] : (G.grid[0][c] !== 0 || c === myBlock || c === G.doubleFirstCol));
    });
    colsEl.classList.toggle("off", !!G.targeting && G.targeting.kind !== "block");
    if (!G.targeting) {
      blockLayer.innerHTML = "";
      if (G.blocked && !G.over) drawBlock(G.blocked.col, false);
    }

    // Jeton fantôme
    ghost.firstChild.className = "disc p" + G.current;
    ghost.classList.toggle("hint", G.hintCol >= 0);
    ghost.style.opacity = !G.over && !G.busy && !G.targeting && human(G.current) ? 1 : 0;
    setHover(G.hoverCol);

    renderPowers();
    if (G.mode === "training") {
      $("hintBtn").disabled = G.over || G.busy || G.current !== 1;
      $("undoBtn").disabled = G.over || G.busy || !G.stack.some(s => s.current === 1);
      $("trainingNote").textContent = `Niveau ${AI.LEVELS[G.level]} · change-le avec le bouton ? en haut.`;
    }
    if (G.mode === "daily") {
      const res = Pr.challengeResult(G.dailyDate);
      $("dailyPanel").innerHTML = `<div class="card objective">
        <div>Défi n°${G.puzzle.number}</div>
        <div><span>Objectif :</span> gagner en ${G.puzzle.par} coups</div>
        <div><span>Coups joués :</span> ${G.moves[1]}</div>
        ${res && res.stars ? `<div><span>Meilleur :</span> <span class="stars">${"★".repeat(res.stars)}</span></div>` : ""}
      </div>`;
    }
  }

  function renderPowers() {
    if (G.mode !== "powers") return;
    const p = G.current;
    const btns = Object.keys(POWERS).map(k => `
      <button class="power" data-power="${k}" ${powerAvailable(k, p) ? "" : "disabled"} aria-label="${POWERS[k].name}, ${G.powers[p][k]} utilisation restante">
        ${ICONS[k]}<span class="lbl">${POWERS[k].name}</span><span class="left">${G.powers[p][k]}</span>
      </button>`).join("");
    $("powersPanel").innerHTML = `<div class="powers">${btns}</div>
      <p class="panel-note">Pouvoirs ${customName(p) ? "de " + esc(customName(p)) : "du joueur " + esc(colorName(p))}${G.powerThisTurn ? " · un pouvoir déjà utilisé ce tour" : ""}</p>`;
    $("powersPanel").querySelectorAll("[data-power]").forEach(b => b.onclick = () => requestPower(b.dataset.power));
  }

  function setHover(c) {
    G.hoverCol = c;
    ghost.style.transform = `translateX(calc(${c} * var(--cell)))`;
  }

  function showBanner(text, buttons = []) {
    bannerEl.hidden = false;
    bannerEl.innerHTML = `<span>${esc(text)}</span>`;
    buttons.filter(Boolean).forEach(b => {
      const el = document.createElement("button");
      el.className = "btn small" + (b.primary ? "" : " secondary");
      el.textContent = b.label;
      el.onclick = b.onClick;
      bannerEl.appendChild(el);
    });
  }
  function hideBanner() { bannerEl.hidden = true; bannerEl.innerHTML = ""; colsEl.classList.remove("off"); }

  let sayTimer;
  function say(msg) {
    statusEl.textContent = msg;
    clearTimeout(sayTimer);
    sayTimer = setTimeout(() => { if (!G.over && !G.targeting) statusEl.innerHTML = turnText(); }, 2200);
  }

  // ---------- Commandes ----------
  $("newGame").addEventListener("click", newGame);
  $("resetScore").addEventListener("click", () => { G.scores = { 1: 0, 2: 0 }; render(); });
  $("hintBtn").addEventListener("click", hint);
  $("undoBtn").addEventListener("click", undo);

  document.addEventListener("keydown", e => {
    if (P4.App.current !== "game" || UI.sheetOpen) return;
    if (e.target.closest && e.target.closest(".controls, .gamebar, .mode-panel, .banner")) return;
    if (e.key === "Escape" && G.targeting) return cancelTargeting();
    if (/^[1-7]$/.test(e.key)) { setHover(+e.key - 1); onColumn(+e.key - 1); }
    else if (e.key === "ArrowLeft") { setHover(Math.max(0, G.hoverCol - 1)); e.preventDefault(); }
    else if (e.key === "ArrowRight") { setHover(Math.min(COLS - 1, G.hoverCol + 1)); e.preventDefault(); }
    else if ((e.key === "Enter" || e.key === " " || e.key === "ArrowDown") && !e.target.classList.contains("col")) { onColumn(G.hoverCol); e.preventDefault(); }
  });

  P4.Game = { MODES, POWERS, setup, newGame, render, state: G, refreshCosmetics() { renderDiscs(); render(); } };
})(window.P4 = window.P4 || {});
