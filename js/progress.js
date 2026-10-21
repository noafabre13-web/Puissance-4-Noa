/* Profil du joueur : pièces, niveau, succès, missions, récompenses, objets, statistiques.
   Tout est enregistré dans le navigateur (localStorage). Rien n'est envoyé sur Internet. */
(function (P4) {
  const C = P4.CONFIG, Cat = P4.Catalog, D = P4.Daily;
  const KEY = "p4noa:profil:v1";

  // --- Stockage protégé : si le navigateur refuse (navigation privée), on garde tout en mémoire ---
  const Storage = {
    read() { try { return JSON.parse(localStorage.getItem(KEY)); } catch (e) { return null; } },
    write(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* mémoire seulement */ } },
    clear() { try { localStorage.removeItem(KEY); } catch (e) { } }
  };

  const wdl = () => ({ win: 0, loss: 0, draw: 0 });
  function defaults() {
    return {
      coins: C.rewards.welcomeCoins,
      xp: 0,
      seasonXp: 0,
      owned: {},            // id -> "coins" | "store" | "test" | "season"
      equipped: { ...Cat.DEFAULTS },
      premium: null,        // null ou { source: "store" | "test", since }
      pass: null,           // idem pour le pass de saison
      seasonClaimed: { free: [], premium: [] },
      stats: {
        games: 0,
        vsAI: { easy: wdl(), medium: wdl(), hard: wdl() },
        local: { p1: 0, p2: 0, draw: 0 },
        byMode: { classic: 0, powers: 0, chrono: 0, training: 0, daily: 0 },
        streak: 0, bestStreak: 0,
        winMoves: [],       // nombre de coups des victoires contre l'IA (pour la moyenne)
        powers: {},         // pouvoir -> nombre d'utilisations
        quickWin: false
      },
      history: [],
      achievements: {},
      login: { last: null, streak: 0 },
      missions: { date: null, list: [] },
      challenge: { results: {}, wins: 0, streak: 0, lastWin: null },
      testMode: false,
      names: { p1: "", p2: "" }
    };
  }

  // Fusion prudente : un ancien profil garde toutes ses données et reçoit les nouveaux champs
  const isObj = v => v && typeof v === "object" && !Array.isArray(v);
  function merge(base, saved) {
    if (!isObj(saved)) return base;
    for (const k of Object.keys(saved)) {
      base[k] = isObj(base[k]) && isObj(saved[k]) ? merge(base[k], saved[k]) : saved[k];
    }
    return base;
  }

  let S = merge(defaults(), Storage.read());
  const listeners = [];
  function changed() { Storage.write(S); listeners.forEach(fn => fn(S)); }

  const ACHIEVEMENTS = [
    { id: "first_game", name: "Premier jeton", desc: "Termine ta première partie.", coins: 20, test: s => s.stats.games >= 1 },
    { id: "first_win", name: "Première victoire", desc: "Bats l'ordinateur une fois.", coins: 30, test: s => aiWins(s) >= 1 },
    { id: "beat_medium", name: "Ça devient sérieux", desc: "Bats l'ordinateur en niveau Moyen.", coins: 40, test: s => s.stats.vsAI.medium.win >= 1 },
    { id: "beat_hard", name: "Maître de l'IA", desc: "Bats l'ordinateur en niveau Difficile.", coins: 100, test: s => s.stats.vsAI.hard.win >= 1 },
    { id: "games_10", name: "Habitué", desc: "Termine 10 parties.", coins: 50, test: s => s.stats.games >= 10 },
    { id: "games_50", name: "Passionné", desc: "Termine 50 parties.", coins: 150, test: s => s.stats.games >= 50 },
    { id: "streak_3", name: "En série", desc: "Gagne 3 parties d'affilée contre l'ordinateur.", coins: 60, test: s => s.stats.bestStreak >= 3 },
    { id: "quick_win", name: "Éclair", desc: "Bats l'ordinateur en 6 coups ou moins.", coins: 50, test: s => s.stats.quickWin },
    { id: "arsenal", name: "Arsenal complet", desc: "Utilise les 4 pouvoirs au moins une fois.", coins: 60, test: s => Object.keys(s.stats.powers).length >= 4 },
    { id: "chrono_1", name: "Sang-froid", desc: "Termine une partie Chrono.", coins: 30, test: s => s.stats.byMode.chrono >= 1 },
    { id: "daily_1", name: "Défi relevé", desc: "Réussis un défi quotidien.", coins: 40, test: s => s.challenge.wins >= 1 },
    { id: "daily_perfect", name: "Parfait", desc: "Réussis un défi quotidien avec 3 étoiles.", coins: 60, test: s => Object.values(s.challenge.results).some(r => r.stars === 3) },
    { id: "daily_streak3", name: "Régulier", desc: "Réussis le défi quotidien 3 jours de suite.", coins: 100, test: s => s.challenge.streak >= 3 },
    { id: "collector", name: "Collectionneur", desc: "Possède 5 objets cosmétiques débloqués.", coins: 80, test: s => Object.keys(s.owned).length >= 5 }
  ];

  const MISSIONS = [
    { id: "play3", name: "Joue 3 parties", event: "play", goal: 3, coins: 25 },
    { id: "winAI", name: "Gagne une partie contre l'ordinateur", event: "winAI", goal: 1, coins: 30 },
    { id: "winAIHard", name: "Bats l'ordinateur en Moyen ou Difficile", event: "winAIHard", goal: 1, coins: 50 },
    { id: "power2", name: "Utilise 2 pouvoirs", event: "power", goal: 2, coins: 30 },
    { id: "chrono1", name: "Termine une partie Chrono", event: "chrono", goal: 1, coins: 30 },
    { id: "daily", name: "Réussis le défi du jour", event: "dailyWin", goal: 1, coins: 40 },
    { id: "training", name: "Termine une partie d'entraînement", event: "training", goal: 1, coins: 20 },
    { id: "play5", name: "Joue 5 parties", event: "play", goal: 5, coins: 40 }
  ];

  function aiWins(s) { return ["easy", "medium", "hard"].reduce((n, l) => n + s.stats.vsAI[l].win, 0); }

  function checkAchievements() {
    const unlocked = [];
    for (const a of ACHIEVEMENTS) {
      if (!S.achievements[a.id] && a.test(S)) {
        S.achievements[a.id] = Date.now();
        S.coins += a.coins;
        unlocked.push(a);
      }
    }
    return unlocked;
  }

  function addXp(n) {
    const before = P.level();
    S.xp += n;
    S.seasonXp += n;
    return P.level() > before;
  }

  function bump(event, n = 1) {
    P.ensureMissions();
    for (const m of S.missions.list) {
      const def = MISSIONS.find(x => x.id === m.id);
      if (def && def.event === event) m.progress = Math.min(def.goal, m.progress + n);
    }
  }

  const P = {
    ACHIEVEMENTS, MISSIONS,
    get state() { return S; },
    onChange(fn) { listeners.push(fn); },
    save: changed,

    // --- Niveau ---
    level() { return Math.floor(S.xp / C.xp.perLevel) + 1; },
    levelProgress() { return (S.xp % C.xp.perLevel) / C.xp.perLevel; },

    // --- Abonnements ---
    isPremium() { return !!S.premium; },
    hasPass() { return !!S.pass; },

    // --- Objets ---
    owns(id) {
      const item = Cat.get(id);
      if (!item) return false;
      if (Cat.isFree(item)) return true;
      if (item.price.premium) return this.isPremium();
      return !!S.owned[id];
    },
    ownedSource(id) { return S.owned[id] || null; },
    grant(id, source) { if (Cat.get(id) && !S.owned[id]) S.owned[id] = source; },
    grantPack(packId, source) { Cat.pack(packId).contains.forEach(id => this.grant(id, source)); },
    buyWithCoins(id) {
      const item = Cat.get(id);
      if (!item || !item.price || !item.price.coins) return { ok: false, message: "Cet objet ne s'achète pas avec des pièces." };
      if (this.owns(id)) return { ok: false, message: "Tu possèdes déjà cet objet." };
      if (S.coins < item.price.coins) return { ok: false, message: `Il te manque ${item.price.coins - S.coins} pièces. Joue quelques parties pour en gagner.` };
      S.coins -= item.price.coins;
      this.grant(id, "coins");
      const ach = checkAchievements();
      changed();
      return { ok: true, achievements: ach };
    },
    equip(id) {
      const item = Cat.get(id);
      if (!item || !this.owns(id)) return false;
      S.equipped[item.cat] = id;
      changed();
      return true;
    },
    // Objet équipé, avec retour à l'objet par défaut si on ne le possède plus (fin d'abonnement, achat test retiré)
    equipped(cat) {
      const id = S.equipped[cat];
      return Cat.get(id && this.owns(id) ? id : Cat.DEFAULTS[cat]);
    },

    // --- Récompense de connexion quotidienne ---
    canClaimLogin() { return S.login.last !== D.today(); },
    loginReward() {
      const streak = S.login.last === D.addDays(D.today(), -1) ? S.login.streak + 1 : 1;
      const table = C.rewards.dailyLogin;
      return { streak, coins: table[Math.min(streak, table.length) - 1] };
    },
    claimLogin() {
      if (!this.canClaimLogin()) return null;
      const r = this.loginReward();
      S.login = { last: D.today(), streak: r.streak };
      S.coins += r.coins;
      changed();
      return r;
    },

    // --- Missions du jour (3 missions choisies d'après la date) ---
    ensureMissions() {
      const day = D.today();
      if (S.missions.date === day) return;
      const n = D.dayNumber(day);
      const picked = [], events = new Set();
      for (let i = 0; picked.length < 3 && i < 50; i++) {
        const m = MISSIONS[(n * 5 + i * 3) % MISSIONS.length];
        if (events.has(m.event) || picked.includes(m)) continue;
        picked.push(m); events.add(m.event);
      }
      S.missions = { date: day, list: picked.map(m => ({ id: m.id, progress: 0, claimed: false })) };
      Storage.write(S);
    },
    missions() {
      this.ensureMissions();
      return S.missions.list.map(m => ({ ...MISSIONS.find(x => x.id === m.id), ...m }));
    },
    claimMission(id) {
      this.ensureMissions();
      const m = S.missions.list.find(x => x.id === id);
      const def = MISSIONS.find(x => x.id === id);
      if (!m || m.claimed || m.progress < def.goal) return null;
      m.claimed = true;
      S.coins += def.coins;
      addXp(C.xp.mission);
      changed();
      return def.coins;
    },
    trackPower(kind) {
      S.stats.powers[kind] = (S.stats.powers[kind] || 0) + 1;
      bump("power");
      const ach = checkAchievements();
      changed();
      return ach;
    },

    // --- Fin de partie ---
    // info = { mode, vsAI, level, winner (0 nul, 1, 2), myMoves, timeout }
    recordGame(info) {
      const R = C.rewards, st = S.stats;
      let coins = 0, outcome = null;
      st.games++;
      st.byMode[info.mode] = (st.byMode[info.mode] || 0) + 1;
      bump("play");

      if (info.vsAI) {
        outcome = info.winner === 0 ? "draw" : info.winner === 1 ? "win" : "loss";
        st.vsAI[info.level][outcome]++;
        if (outcome === "win") {
          st.streak++;
          st.bestStreak = Math.max(st.bestStreak, st.streak);
          st.winMoves.push(info.myMoves);
          if (st.winMoves.length > 100) st.winMoves.shift();
          if (info.myMoves <= 6) st.quickWin = true;
          bump("winAI");
          if (info.level !== "easy") bump("winAIHard");
        } else st.streak = 0;
        coins = info.mode === "training" ? R.training
          : outcome === "win" ? R.winVsAI[info.level] : outcome === "draw" ? R.draw : R.lossVsAI;
      } else {
        st.local[info.winner === 0 ? "draw" : "p" + info.winner]++;
        coins = R.localGame;
      }
      if (info.mode === "chrono") { coins += R.chronoBonus; bump("chrono"); }
      if (info.mode === "training") bump("training");

      S.coins += coins;
      const levelUp = addXp(C.xp.game + (outcome === "win" ? C.xp.win : 0));
      S.history.unshift({
        t: Date.now(), mode: info.mode, opp: info.vsAI ? info.level : "local",
        result: outcome || (info.winner === 0 ? "draw" : "p" + info.winner),
        moves: info.myMoves, timeout: !!info.timeout
      });
      if (S.history.length > 50) S.history.length = 50;
      const achievements = checkAchievements();
      changed();
      return { coins, levelUp, achievements, outcome };
    },

    // --- Défi quotidien ---
    challengeResult(date) { return S.challenge.results[date] || null; },
    recordChallenge(date, won, moves, par) {
      const ch = S.challenge;
      const prev = ch.results[date] || { stars: 0, best: null, tries: 0 };
      prev.tries++;
      let coins = 0, stars = 0;
      if (won) {
        stars = D.stars(moves, par);
        const R = C.rewards.dailyChallenge;
        if (!prev.stars) {
          coins = R.base + R.perStar * stars;
          ch.wins++;
          ch.streak = ch.lastWin === D.addDays(date, -1) ? ch.streak + 1 : 1;
          ch.lastWin = date;
          bump("dailyWin");
          addXp(C.xp.daily);
        } else if (stars > prev.stars) {
          coins = R.perStar * (stars - prev.stars);
        }
        prev.stars = Math.max(prev.stars, stars);
        prev.best = prev.best ? Math.min(prev.best, moves) : moves;
      }
      ch.results[date] = prev;
      S.coins += coins;
      S.stats.byMode.daily++;
      const achievements = checkAchievements();
      changed();
      return { coins, stars, achievements };
    },

    // --- Pass de saison ---
    seasonTier() { return Math.min(C.season.tiers, Math.floor(S.seasonXp / C.season.xpPerTier)); },
    seasonTierProgress() { return (S.seasonXp % C.season.xpPerTier) / C.season.xpPerTier; },
    canClaimSeason(track, tier) {
      const table = track === "free" ? Cat.SEASON_FREE : Cat.SEASON_PREMIUM;
      if (!table[tier] || tier > this.seasonTier() || S.seasonClaimed[track].includes(tier)) return false;
      return track === "free" || this.hasPass();
    },
    claimSeason(track, tier) {
      if (!this.canClaimSeason(track, tier)) return null;
      const reward = (track === "free" ? Cat.SEASON_FREE : Cat.SEASON_PREMIUM)[tier];
      S.seasonClaimed[track].push(tier);
      if (reward.coins) S.coins += reward.coins;
      if (reward.item) this.grant(reward.item, "season");
      checkAchievements();
      changed();
      return reward;
    },

    // --- Achats réels (appelé uniquement après confirmation du fournisseur ou en mode test) ---
    applyPurchase(productId, source) {
      if (productId === "premium_monthly") S.premium = { source, since: Date.now() };
      else if (productId === "season_pass_s1") S.pass = { source, since: Date.now() };
      else if (Cat.pack(productId)) this.grantPack(productId, source);
      else {
        const item = Cat.ITEMS.find(i => i.price && i.price.product === productId);
        if (item) this.grant(item.id, source);
      }
      checkAchievements();
      changed();
    },

    // Récompense publicitaire : à appeler UNIQUEMENT si la régie a confirmé une vue complète (ou en mode test)
    grantAdReward(source) {
      S.coins += C.rewards.rewardedAd;
      changed();
      return { coins: C.rewards.rewardedAd, source };
    },

    // --- Réglages ---
    setTestMode(on) { S.testMode = !!on; changed(); },
    clearTestPurchases() {
      for (const [id, src] of Object.entries(S.owned)) if (src === "test") delete S.owned[id];
      if (S.premium && S.premium.source === "test") S.premium = null;
      if (S.pass && S.pass.source === "test") S.pass = null;
      changed();
    },
    setNames(p1, p2) { S.names = { p1: p1.slice(0, 14), p2: p2.slice(0, 14) }; changed(); },
    resetAll() { Storage.clear(); S = defaults(); changed(); },

    // --- Statistiques détaillées ---
    summary() {
      const st = S.stats;
      const w = aiWins(S);
      const l = ["easy", "medium", "hard"].reduce((n, k) => n + st.vsAI[k].loss, 0);
      const d = ["easy", "medium", "hard"].reduce((n, k) => n + st.vsAI[k].draw, 0);
      const played = w + l + d;
      const avg = st.winMoves.length ? st.winMoves.reduce((a, b) => a + b, 0) / st.winMoves.length : null;
      return { games: st.games, wins: w, losses: l, draws: d, rate: played ? Math.round(100 * w / played) : null, bestStreak: st.bestStreak, avgWinMoves: avg };
    }
  };

  P4.Progress = P;
})(window.P4 = window.P4 || {});
