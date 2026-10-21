/* Défi quotidien, sans serveur.
   Le défi du jour est choisi à partir de la date de l'appareil : tout le monde voit le même défi le même jour.
   Limites d'une version sans serveur : changer l'heure de l'appareil change le défi, et il n'y a pas
   de classement entre joueurs. Un serveur deviendra utile pour un classement ou des défis inédits.

   Chaque position a été vérifiée par un solveur exact (voir tests/regles.html) :
   les roses ont le trait et peuvent forcer la victoire en "par" coups, pas moins, même contre une défense parfaite. */
(function (P4) {
  const PUZZLES = [
    { par: 2, rows: ["...B...", "...R...", "..RB...", "..BB...", "..RB...", "..RR..."] },
    { par: 3, rows: [".......", "...B...", "..BR...", "..RR...", "..BBR..", "..RBBR."] },
    { par: 2, rows: ["...R...", "..BR...", "..RBB..", "..BBR..", ".RBRR..", "BRBBR.."] },
    { par: 3, rows: ["...B...", "...B...", "...B...", "...RR..", ".R.BB..", "BRRRB.R"] },
    { par: 2, rows: ["...RB..", "...BR..", "...RB..", "...RB..", "...BB..", "...RR.."] },
    { par: 3, rows: ["...B...", "...R...", "...BB..", "...RR..", "..RBRB.", "B.BRRBR"] },
    { par: 2, rows: [".......", "...B...", "..BR...", "..BB...", "..RR...", "RBRBR.."] },
    { par: 3, rows: [".......", ".......", "..B....", "..RB.R.", "..RR.B.", ".BRBBR."] },
    { par: 2, rows: ["...BR..", "...RR..", "...BB..", "B.BRR..", "RBBBR..", "RBRBR.."] },
    { par: 3, rows: ["..BB...", "..RB...", "..BRB..", "..RBB..", "..RBRR.", "..RRBR."] },
    { par: 2, rows: ["...B...", "...B...", "...B...", "R..R...", "BRBRR..", "BRRBBR."] },
    { par: 3, rows: ["...R...", "...B...", ".B.RB..", ".B.RR..", "BR.BRR.", "BBRRBRB"] },
    { par: 2, rows: [".......", "...B...", "...R...", "...R...", "B.BB...", "B.RR..R"] },
    { par: 3, rows: ["...R...", "..BB...", "..RB...", "..RR...", ".BBR...", "BBRBR.R"] }
  ];

  const pad = n => String(n).padStart(2, "0");
  const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

  // Nombre de jours depuis le 1er janvier 2026, en date locale
  function dayNumber(dateStr) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(2026, 0, 1)) / 86400000);
  }
  function addDays(dateStr, n) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const t = new Date(Date.UTC(y, m - 1, d + n));
    return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
  }

  P4.Daily = {
    PUZZLES,
    today,
    addDays,
    dayNumber,
    indexFor(dateStr) { const n = dayNumber(dateStr) % PUZZLES.length; return n < 0 ? n + PUZZLES.length : n; },
    forDate(dateStr) { const i = this.indexFor(dateStr); return { ...PUZZLES[i], number: dayNumber(dateStr) + 1, index: i }; },
    // Étoiles : 3 si on gagne dans le nombre de coups visé, 2 avec jusqu'à 2 coups de plus, 1 sinon
    stars(moves, par) { return moves <= par ? 3 : moves <= par + 2 ? 2 : 1; }
  };
})(window.P4 = window.P4 || {});
