/* Intelligence artificielle, trois niveaux qui jouent vraiment différemment.
   - Facile : joue un peu au hasard, rate parfois une victoire, ne bloque pas.
   - Moyen : gagne si possible, bloque les menaces évidentes, évite d'offrir la victoire.
   - Difficile : anticipe plusieurs coups (algorithme minimax avec élagage alpha-bêta).
   - Expert : même algorithme, un coup plus loin. */
(function (P4) {
  const E = P4.Engine;
  const ORDER = [3, 2, 4, 1, 5, 0, 6]; // le centre d'abord : il participe à plus d'alignements
  const WIN = 1000000;

  function winsAt(g, c, p) {
    const r = E.lowestRow(g, c);
    if (r < 0) return false;
    g[r][c] = p;
    const w = !!E.winningLine(g, r, c, p);
    g[r][c] = 0;
    return w;
  }

  function easy(g, me, cols) {
    const win = cols.find(c => winsAt(g, c, me));
    if (win !== undefined && Math.random() < 0.5) return win;
    const weights = cols.map(c => 1 + (3 - Math.abs(3 - c)) * 0.4);
    let x = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < cols.length; i++) { x -= weights[i]; if (x <= 0) return cols[i]; }
    return cols[cols.length - 1];
  }

  function medium(g, me, cols) {
    const opp = 3 - me;
    const win = cols.find(c => winsAt(g, c, me));
    if (win !== undefined) return win;
    const block = cols.find(c => winsAt(g, c, opp));
    if (block !== undefined) return block;
    // Évite de poser un jeton qui permet à l'adversaire de gagner juste au-dessus
    const safe = cols.filter(c => {
      const r = E.lowestRow(g, c);
      if (r === 0) return true;
      g[r][c] = me;
      const danger = winsAt(g, c, opp);
      g[r][c] = 0;
      return !danger;
    });
    const pool = safe.length ? safe : cols;
    let best = pool[0], bestScore = -Infinity;
    for (const c of pool) {
      const s = (3 - Math.abs(3 - c)) + Math.random() * 2.2;
      if (s > bestScore) { bestScore = s; best = c; }
    }
    return best;
  }

  // Évaluation d'une position pour le joueur "me" : on compte les fenêtres de 4 cases prometteuses
  function scoreWindow(a, b, c, d, me) {
    let mine = 0, theirs = 0, empty = 0;
    for (const v of [a, b, c, d]) { if (v === me) mine++; else if (v === 0) empty++; else theirs++; }
    if (mine === 3 && empty === 1) return 5;
    if (mine === 2 && empty === 2) return 2;
    if (theirs === 3 && empty === 1) return -6;
    if (theirs === 2 && empty === 2) return -2;
    return 0;
  }
  function evaluate(g, me) {
    let s = 0;
    for (let r = 0; r < 6; r++) {
      if (g[r][3] === me) s += 3; else if (g[r][3]) s -= 3;
      for (let c = 0; c < 4; c++) s += scoreWindow(g[r][c], g[r][c + 1], g[r][c + 2], g[r][c + 3], me);
    }
    for (let c = 0; c < 7; c++)
      for (let r = 0; r < 3; r++) s += scoreWindow(g[r][c], g[r + 1][c], g[r + 2][c], g[r + 3][c], me);
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 4; c++) {
        s += scoreWindow(g[r][c], g[r + 1][c + 1], g[r + 2][c + 2], g[r + 3][c + 3], me);
        s += scoreWindow(g[r + 3][c], g[r + 2][c + 1], g[r + 1][c + 2], g[r][c + 3], me);
      }
    return s;
  }

  // Negamax : le score d'une position pour le joueur qui doit jouer.
  // "useEval" = false sert au solveur exact (seules les victoires comptent).
  function negamax(g, depth, alpha, beta, p, ply, useEval) {
    let any = false, best = -Infinity;
    for (const c of ORDER) {
      if (g[0][c]) continue;
      any = true;
      const r = E.lowestRow(g, c);
      g[r][c] = p;
      let score;
      if (E.winningLine(g, r, c, p)) score = WIN - ply;
      else if (depth <= 1) score = useEval ? -evaluate(g, 3 - p) : 0;
      else score = -negamax(g, depth - 1, -beta, -alpha, 3 - p, ply + 1, useEval);
      g[r][c] = 0;
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return any ? best : 0; // plateau plein = nul
  }

  function hard(g, me, cols, depth) {
    const win = cols.find(c => winsAt(g, c, me));
    if (win !== undefined) return win;
    const work = E.clone(g);
    let bestScore = -Infinity, best = [];
    for (const c of ORDER) {
      if (!cols.includes(c)) continue;
      const r = E.lowestRow(work, c);
      work[r][c] = me;
      const score = -negamax(work, depth - 1, -Infinity, Infinity, 3 - me, 1, true);
      work[r][c] = 0;
      if (score > bestScore) { bestScore = score; best = [c]; }
      else if (score === bestScore) best.push(c);
    }
    return best[Math.floor(Math.random() * best.length)];
  }

  P4.AI = {
    LEVELS: { easy: "Facile", medium: "Moyen", hard: "Difficile", expert: "Expert" },

    // Choisit une colonne pour le joueur "me". "blocked" = colonne interdite ce tour-ci.
    choose(g, me, level, blocked = -1) {
      const cols = E.validCols(g, blocked);
      if (!cols.length) return -1;
      if (cols.length === 1) return cols[0];
      if (level === "easy") return easy(g, me, cols);
      if (level === "medium") return medium(g, me, cols);
      return hard(g, me, cols, level === "expert" ? 8 : 7);
    },

    // Conseil pour le joueur humain (mode Entraînement)
    hint(g, me, blocked = -1) { return this.choose(g, me, "hard", blocked); },

    // Solveur exact : le joueur p (qui a le trait) peut-il forcer la victoire en n coups maximum ?
    forcedWinIn(g, p, n) {
      const score = negamax(E.clone(g), 2 * n - 1, -Infinity, Infinity, p, 0, false);
      return score >= WIN - 100;
    }
  };
})(window.P4 = window.P4 || {});
