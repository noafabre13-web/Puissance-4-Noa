/* Moteur du Puissance 4 : les règles pures, sans aucun affichage.
   Plateau = tableau de 6 lignes x 7 colonnes. 0 = vide, 1 = joueur 1, 2 = joueur 2.
   La ligne 0 est en haut, la ligne 5 en bas. */
(function (P4) {
  const ROWS = 6, COLS = 7;
  const DIRS = [[0, 1], [1, 0], [1, 1], [1, -1]];

  const inside = (r, c) => r >= 0 && r < ROWS && c >= 0 && c < COLS;

  const Engine = {
    ROWS, COLS,

    create() { return Array.from({ length: ROWS }, () => Array(COLS).fill(0)); },
    clone(g) { return g.map(row => row.slice()); },

    // Ligne où tomberait un jeton dans la colonne c, ou -1 si elle est pleine
    lowestRow(g, c) {
      for (let r = ROWS - 1; r >= 0; r--) if (!g[r][c]) return r;
      return -1;
    },

    // Colonnes jouables. "blocked" = colonne interdite (pouvoir Colonne bloquée)
    validCols(g, blocked = -1) {
      const out = [];
      for (let c = 0; c < COLS; c++) if (g[0][c] === 0 && c !== blocked) out.push(c);
      return out;
    },

    isFull(g) { return g[0].every(Boolean); },

    // Alignement de 4 (ou plus) passant par la case (r,c) pour le joueur p
    winningLine(g, r, c, p) {
      for (const [dr, dc] of DIRS) {
        const line = [[r, c]];
        for (const s of [1, -1]) {
          let rr = r + dr * s, cc = c + dc * s;
          while (inside(rr, cc) && g[rr][cc] === p) {
            line.push([rr, cc]); rr += dr * s; cc += dc * s;
          }
        }
        if (line.length >= 4) return line;
      }
      return null;
    },

    // Cherche un alignement n'importe où (utile après un pouvoir qui modifie plusieurs cases)
    findWin(g, p) {
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          if (g[r][c] === p) {
            const line = this.winningLine(g, r, c, p);
            if (line) return line;
          }
      return null;
    },

    countDiscs(g, p) { return g.flat().filter(v => v === p).length; },

    // Jeton explosif : retire le jeton (r,c), ceux du dessus tombent d'une case.
    // Renvoie la liste des déplacements pour l'animation.
    removeDisc(g, r, c) {
      const moves = [];
      for (let rr = r - 1; rr >= 0 && g[rr][c]; rr--) moves.push({ from: [rr, c], to: [rr + 1, c] });
      for (let rr = r; rr > 0; rr--) g[rr][c] = g[rr - 1][c];
      g[0][c] = 0;
      return moves;
    },

    // Permutation : deux jetons voisins (haut/bas/gauche/droite) de couleurs différentes.
    // Les deux cases sont occupées, donc la gravité reste respectée.
    canSwap(g, a, b) {
      const [r1, c1] = a, [r2, c2] = b;
      if (!inside(r1, c1) || !inside(r2, c2)) return false;
      if (Math.abs(r1 - r2) + Math.abs(c1 - c2) !== 1) return false;
      return g[r1][c1] !== 0 && g[r2][c2] !== 0 && g[r1][c1] !== g[r2][c2];
    },
    hasSwap(g) {
      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          if (this.canSwap(g, [r, c], [r, c + 1]) || this.canSwap(g, [r, c], [r + 1, c])) return true;
      return false;
    },
    swap(g, a, b) {
      const t = g[a[0]][a[1]];
      g[a[0]][a[1]] = g[b[0]][b[1]];
      g[b[0]][b[1]] = t;
    },

    // Plateau décrit en texte : "R" = joueur 1, "B" = joueur 2, "." = vide (ligne du haut en premier)
    fromRows(rows) { return rows.map(line => [...line].map(ch => ch === "R" ? 1 : ch === "B" ? 2 : 0)); },
    toRows(g) { return g.map(row => row.map(v => v === 1 ? "R" : v === 2 ? "B" : ".").join("")); },

    // Vérifie qu'un plateau respecte la gravité (aucun jeton ne flotte)
    isConsistent(g) {
      for (let c = 0; c < COLS; c++) {
        let seenEmptyBelow = false;
        for (let r = ROWS - 1; r >= 0; r--) {
          if (!g[r][c]) seenEmptyBelow = true;
          else if (seenEmptyBelow) return false;
        }
      }
      return true;
    }
  };

  P4.Engine = Engine;
})(window.P4 = window.P4 || {});
