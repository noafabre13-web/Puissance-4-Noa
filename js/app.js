/* Navigation et écrans : accueil (menu des modes), boutique, pass de saison, profil. */
(function (P4) {
  const Pr = P4.Progress, Cat = P4.Catalog, UI = P4.UI, C = P4.CONFIG, D = P4.Daily, AI = P4.AI;
  const { $, esc, ICONS } = UI;
  const price = v => P4.formatPrice(v);
  const coinLabel = n => `<span class="coin" aria-hidden="true"></span>${n}`;

  // Derniers réglages choisis (adversaire, niveau, temps), mémorisés sur l'appareil
  const PREF_KEY = "p4noa:reglages";
  let prefs = { opponent: "local", level: "medium", time: 180 };
  try { Object.assign(prefs, JSON.parse(localStorage.getItem(PREF_KEY)) || {}); } catch (e) { }
  const savePrefs = () => { try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (e) { } };

  const SCREENS = ["home", "game", "shop", "pass", "profile"];
  let shopCat = "tokens", lastCoins = Pr.state.coins;

  const App = {
    current: "home",

    show(name) {
      App.current = name;
      SCREENS.forEach(s => $("screen-" + s).hidden = s !== name);
      $("tabbar").hidden = name === "game";
      $("app").classList.toggle("in-game", name === "game");
      document.querySelectorAll(".tab").forEach(t => t.toggleAttribute("aria-current", t.dataset.tab === name));
      document.querySelectorAll(".tab[aria-current]").forEach(t => t.setAttribute("aria-current", "page"));
      App.refresh();
      window.scrollTo(0, 0);
    },

    refresh() {
      App.refreshTop();
      if (App.current === "home") renderHome();
      if (App.current === "shop") renderShop();
      if (App.current === "pass") renderPass();
      if (App.current === "profile") renderProfile();
    },

    refreshTop() {
      const S = Pr.state;
      $("topAvatar").textContent = Pr.equipped("avatars").data.emoji;
      $("topLevel").textContent = `Niveau ${Pr.level()}`;
      $("topLevelBar").style.width = Math.round(Pr.levelProgress() * 100) + "%";
      $("coinCount").textContent = S.coins;
      if (S.coins > lastCoins) { $("topCoins").classList.remove("bump"); void $("topCoins").offsetWidth; $("topCoins").classList.add("bump"); }
      lastCoins = S.coins;
    },

    // Emplacement de publicité récompensée : jamais pendant une partie
    renderAdBlock(el, placement) {
      el.innerHTML = `
        <div class="ad-card">
          <div class="txt"><b>Bonus vidéo : +${C.rewards.rewardedAd} pièces</b>
          <span>Facultatif. Une courte publicité, uniquement entre deux parties.</span></div>
          <button class="btn secondary small" data-ad>Regarder</button>
        </div>
        <div data-admsg></div>`;
      const msg = el.querySelector("[data-admsg]");
      el.querySelector("[data-ad]").onclick = async () => {
        const r = await P4.Ads.showRewarded(placement);
        if (r.status === "completed") {
          const g = Pr.grantAdReward("store");
          msg.innerHTML = `<div class="notice">Merci ! +${g.coins} pièces ajoutées.</div>`;
        } else if (r.status === "unavailable") {
          msg.innerHTML = `<div class="notice">Aucune publicité disponible : la régie publicitaire n'est pas encore connectée. Aucune pièce n'a été ajoutée.
            ${Pr.state.testMode ? `<div style="margin-top:8px"><button class="btn small dark" data-adtest>Simuler une vue complète (test)</button></div>` : ""}</div>`;
          const t = msg.querySelector("[data-adtest]");
          if (t) t.onclick = () => {
            const g = Pr.grantAdReward("test");
            msg.innerHTML = `<div class="notice"><span class="tag test">Test</span> Simulation : +${g.coins} pièces ajoutées, sans publicité réelle.</div>`;
          };
        } else {
          msg.innerHTML = `<div class="notice error">Publicité interrompue : pas de récompense cette fois.</div>`;
        }
      };
    }
  };
  P4.App = App;

  // ---------- Accueil ----------
  const ART = {
    classic: `<svg viewBox="0 0 44 44" aria-hidden="true">${[[8, 36], [17, 27], [26, 18], [35, 9]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.5" fill="var(--p1)"/>`).join("")}<circle cx="17" cy="36" r="6.5" fill="var(--p2)"/><circle cx="26" cy="36" r="6.5" fill="var(--p2)"/><circle cx="26" cy="27" r="6.5" fill="var(--p2)"/></svg>`,
    powers: `<svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="17" fill="var(--p1)"/><path d="M25 6L13 25h8l-3 13 13-20h-8z" fill="var(--accent)" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
    chrono: `<svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="24" r="15" fill="var(--card)"/><rect x="18" y="3" width="8" height="5" rx="2" fill="var(--card)"/><path d="M22 24V14M22 24l7 4" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/></svg>`,
    daily: (n) => `<svg viewBox="0 0 44 44" aria-hidden="true"><rect x="5" y="8" width="34" height="31" rx="5" fill="var(--card)"/><rect x="5" y="8" width="34" height="9" rx="4" fill="var(--accent)"/><text x="22" y="34" text-anchor="middle" font-family="Big Shoulders Display, Impact, sans-serif" font-weight="900" font-size="16" fill="var(--ink)">${n}</text></svg>`,
    popout: `<svg viewBox="0 0 44 44" aria-hidden="true"><rect x="13" y="4" width="18" height="28" rx="3" fill="var(--card)" opacity=".25"/><circle cx="22" cy="11" r="6" fill="var(--p2)"/><circle cx="22" cy="24" r="6" fill="var(--p1)"/><circle cx="22" cy="38" r="5" fill="var(--p1)" opacity=".7"/><path d="M31 33l4 4-4 4" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    training: `<svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="17" fill="var(--card)"/><circle cx="22" cy="22" r="11" fill="var(--p2)"/><circle cx="22" cy="22" r="5" fill="var(--card)"/><circle cx="22" cy="22" r="2" fill="var(--accent)"/></svg>`
  };

  function renderHome() {
    const lb = $("loginBanner");
    if (Pr.canClaimLogin()) {
      const r = Pr.loginReward();
      lb.hidden = false;
      lb.innerHTML = `<span class="coin" style="width:30px;height:30px"></span>
        <div><b>Récompense du jour</b><span>Jour ${r.streak} d'affilée · +${r.coins} pièces</span></div><span class="go">Récupérer</span>`;
      lb.onclick = () => { const g = Pr.claimLogin(); if (g) UI.toast(`+${g.coins} pièces. Reviens demain pour le jour ${g.streak + 1} !`); App.refresh(); };
    } else lb.hidden = true;

    const today = D.today(), pz = D.forDate(today), res = Pr.challengeResult(today);
    const dailyMeta = res && res.stars ? `Réussi <span class="stars">${"★".repeat(res.stars)}${"☆".repeat(3 - res.stars)}</span>` : `Objectif : gagner en ${pz.par} coups`;
    const card = (mode, title, text, meta, wide) => `
      <button class="mode-card${wide ? " wide" : ""}" data-mode="${mode}">
        <span class="mode-art">${typeof ART[mode] === "function" ? ART[mode](new Date().getDate()) : ART[mode]}</span>
        <span style="display:flex;flex-direction:column;gap:6px;min-width:0">
          <h3>${title}</h3><p>${text}</p>${meta ? `<span class="meta">${meta}</span>` : ""}
        </span>
      </button>`;
    $("modeCards").innerHTML =
      card("daily", "Défi du jour", `Défi n°${pz.number} : une position à résoudre, la même pour tout le monde aujourd'hui.`, dailyMeta, true) +
      card("classic", "Classique", "À deux ou contre l'ordi.", "") +
      card("powers", "Pouvoirs", "4 capacités spéciales, à deux.", "") +
      card("chrono", "Chrono", "Une horloge par joueur.", "") +
      card("popout", "Pop Out", "Lâche un jeton ou retire l'un des tiens par le bas.", "") +
      card("training", "Entraînement", "4 niveaux d'IA, conseils et retour en arrière.", "", true);
    $("modeCards").querySelectorAll("[data-mode]").forEach(b => b.onclick = () => openModeIntro(b.dataset.mode, false));

    $("missionList").innerHTML = Pr.missions().map(m => {
      const done = m.progress >= m.goal;
      const side = m.claimed ? `<span class="done-check">✓ Récupéré</span>`
        : done ? `<button class="btn small" data-claim="${m.id}">Récupérer ${coinLabel(m.coins)}</button>`
        : `<span>${m.progress}/${m.goal}</span><span>· ${coinLabel(m.coins)}</span>`;
      return `<div class="mission"><span class="name">${esc(m.name)}</span>
        <div class="side">${side}</div>
        <div class="bar"><i style="width:${Math.round(100 * m.progress / m.goal)}%"></i></div></div>`;
    }).join("");
    $("missionList").querySelectorAll("[data-claim]").forEach(b => b.onclick = () => {
      const c = Pr.claimMission(b.dataset.claim);
      if (c) UI.toast(`Mission accomplie : +${c} pièces`);
      App.refresh();
    });

    App.renderAdBlock($("adCard"), "accueil");
  }

  // ---------- Présentation d'un mode (affichée à chaque entrée) ----------
  function openModeIntro(mode, inGame) {
    const M = P4.Game.MODES[mode];
    const opts = { ...prefs };
    const extra = mode === "daily" ? (() => { const pz = D.forDate(D.today()); return `<div class="notice">Défi n°${pz.number} · objectif : gagner en ${pz.par} coups.</div>`; })()
      : mode === "powers" || mode === "popout" ? `<div class="notice">Mode à deux joueurs sur le même appareil.</div>` : "";

    function draw() {
      const seg = (key, label, choices) => `
        <div class="opt"><div class="opt-label">${label}</div>
          <div class="seg" role="group" aria-label="${label}">${choices.map(([v, l]) =>
            `<button data-opt="${key}" data-val="${v}" aria-pressed="${String(opts[key]) === String(v)}">${l}</button>`).join("")}</div></div>`;
      let options = "";
      if (M.options.includes("opponent")) options += seg("opponent", "Adversaire", [["local", "2 joueurs"], ["ai", "Contre l'ordi"]]);
      if (M.options.includes("level") && (mode === "training" || opts.opponent === "ai"))
        options += seg("level", "Niveau de l'ordinateur", Object.entries(AI.LEVELS));
      if (M.options.includes("time")) options += seg("time", "Temps par joueur", [[60, "1 min"], [180, "3 min"], [300, "5 min"]]);

      UI.openSheet(`
        <h2 id="sheetTitle">${M.name}</h2>
        <p class="sub">${esc(M.tagline)}</p>
        <ul class="rules">${M.rules.map(r => `<li>${esc(r)}</li>`).join("")}</ul>
        ${extra}
        ${options ? `<div style="margin-top:14px">${options}</div>` : ""}
        <div class="actions">
          <button class="btn" id="startMode" data-autofocus>${inGame ? (M.options.length ? "Appliquer et recommencer" : "Recommencer") : "Commencer"}</button>
          <button class="btn secondary" id="closeMode">${inGame ? "Continuer la partie" : "Retour"}</button>
        </div>`);
      $("sheetBody").querySelectorAll("[data-opt]").forEach(b => b.onclick = () => {
        opts[b.dataset.opt] = b.dataset.opt === "time" ? Number(b.dataset.val) : b.dataset.val;
        draw();
      });
      $("closeMode").onclick = UI.closeSheet;
      $("startMode").onclick = () => {
        Object.assign(prefs, opts); savePrefs();
        UI.closeSheet();
        if (App.current !== "game") App.show("game");
        P4.Game.setup(mode, opts);
      };
    }
    draw();
  }
  $("rulesBtn").onclick = () => openModeIntro(P4.Game.state.mode, true);
  $("backBtn").onclick = () => App.show("home");

  // ---------- Achats ----------
  // Achat en argent réel : passe UNIQUEMENT par P4.Payments. Sans fournisseur, rien n'est accordé.
  function purchaseFlow(productId, after) {
    const prod = P4.Payments.PRODUCTS[productId];
    const configured = P4.Payments.isConfigured();
    UI.openSheet(`
      <h2 id="sheetTitle">${esc(prod.name)}</h2>
      <p class="sub">${price(prod.price)} TTC${prod.type === "abonnement mensuel" ? " par mois, sans engagement" : ", paiement unique"}. Objets cosmétiques uniquement.</p>
      ${configured ? "" : `<div class="notice"><b>Version de démonstration.</b> Aucun moyen de paiement n'est encore connecté : ce bouton n'encaisse rien et n'ajoute rien.</div>`}
      <div id="payMsg"></div>
      <div class="actions">
        <button class="btn" id="payBtn">Payer ${price(prod.price)}</button>
        <button class="btn secondary" id="payCancel" data-autofocus>Annuler</button>
      </div>
      ${Pr.state.testMode ? `<div class="actions"><button class="btn dark block" id="payTest">Simuler l'achat (mode test, gratuit)</button></div>` : ""}`);
    $("payCancel").onclick = UI.closeSheet;
    $("payBtn").onclick = async () => {
      $("payBtn").disabled = true;
      const r = await P4.Payments.purchase(productId);
      $("payBtn").disabled = false;
      if (r.status === "paid") {
        Pr.applyPurchase(productId, "store");
        UI.closeSheet(); UI.toast("Achat confirmé. Merci !"); after && after(); App.refresh();
      } else if (r.status === "unavailable") {
        $("payMsg").innerHTML = `<div class="notice error">Paiement indisponible : aucun fournisseur de paiement n'est connecté à cette version. Rien n'a été débité, rien n'a été ajouté.${Pr.state.testMode ? "" : " Pour tester l'interface, active le mode test dans Profil > Réglages."}</div>`;
      } else if (r.status === "cancelled") {
        $("payMsg").innerHTML = `<div class="notice">Achat annulé. Rien n'a été débité.</div>`;
      } else {
        $("payMsg").innerHTML = `<div class="notice error">${esc(r.message || "Le paiement n'a pas abouti.")}</div>`;
      }
    };
    if ($("payTest")) $("payTest").onclick = () => {
      Pr.applyPurchase(productId, "test");
      UI.closeSheet();
      UI.toast("Achat de test enregistré : marqué TEST, aucun paiement réel.");
      UI.applyCosmetics(); after && after(); App.refresh();
    };
  }

  function buyWithCoins(item) {
    UI.openSheet(`
      <h2 id="sheetTitle">${esc(item.name)}</h2>
      ${UI.preview(item)}
      <p class="sub" style="margin-top:12px">Acheter cet objet pour ${item.price.coins} pièces ? Il te restera ${Pr.state.coins - item.price.coins} pièces.</p>
      <div class="actions">
        <button class="btn" id="coinBuy" ${Pr.state.coins < item.price.coins ? "disabled" : ""}>Acheter ${coinLabel(item.price.coins)}</button>
        <button class="btn secondary" id="coinCancel" data-autofocus>Annuler</button>
      </div>
      ${Pr.state.coins < item.price.coins ? `<div class="notice">Il te manque ${item.price.coins - Pr.state.coins} pièces. Joue, relève le défi du jour ou termine tes missions pour en gagner.</div>` : ""}`);
    $("coinCancel").onclick = UI.closeSheet;
    $("coinBuy").onclick = () => {
      const r = Pr.buyWithCoins(item.id);
      if (!r.ok) return UI.toast(r.message);
      Pr.equip(item.id);
      UI.applyCosmetics();
      UI.closeSheet();
      UI.toast(`${item.name} acheté et équipé.`);
      (r.achievements || []).forEach(a => setTimeout(() => UI.toast(`Succès débloqué : ${a.name} (+${a.coins} pièces)`), 2900));
      App.refresh();
    };
  }

  // ---------- Boutique ----------
  function itemButton(item) {
    const p = item.price || {};
    if (Pr.owns(item.id)) {
      const on = Pr.equipped(item.cat).id === item.id;
      return on ? `<button class="btn small dark" disabled>Équipé ✓</button>` : `<button class="btn small secondary" data-equip="${item.id}">Équiper</button>`;
    }
    if (p.coins) return `<button class="btn small" data-buy="${item.id}">${coinLabel(p.coins)}</button>`;
    if (p.eur) return `<button class="btn small" data-pay="${p.product}">${price(C.prices[p.eur])}</button>`;
    if (p.pack) return `<button class="btn small secondary" data-gopack>Dans le ${esc(Cat.pack(p.pack).name)}</button>`;
    if (p.premium) return `<button class="btn small secondary" data-gopremium>Inclus dans Premium</button>`;
    if (p.season) return `<button class="btn small secondary" data-gopass>Pass de saison</button>`;
    return "";
  }

  function renderShop() {
    $("shopTabs").innerHTML = Cat.CATEGORIES.map(c => `<button class="chip-btn" data-cat="${c.id}" aria-pressed="${c.id === shopCat}">${c.name}</button>`).join("");
    $("shopTabs").querySelectorAll("[data-cat]").forEach(b => b.onclick = () => { shopCat = b.dataset.cat; renderShop(); });

    if (shopCat === "packs") {
      $("shopGrid").innerHTML = `<div class="grid" style="grid-template-columns:1fr">${Cat.PACKS.map(pk => {
        const owned = pk.contains.every(id => Pr.owns(id));
        const test = pk.contains.some(id => Pr.ownedSource(id) === "test");
        return `<div class="item pack-card">
          <div class="name">${esc(pk.name)} ${owned ? `<span class="tag">Possédé</span>` : ""} ${test ? `<span class="tag test">Test</span>` : ""}</div>
          <p class="desc">${esc(pk.desc)} Contenu exclusif, introuvable ailleurs.</p>
          <div class="pack-items">${pk.contains.map(id => UI.preview(Cat.get(id))).join("")}</div>
          ${owned ? "" : `<button class="btn" data-pay="${pk.product}">Acheter · ${price(C.prices[pk.tier])}</button>`}
        </div>`;
      }).join("")}</div>`;
    } else {
      $("shopGrid").innerHTML = `<div class="grid">${Cat.inCategory(shopCat).map(item => {
        const on = Pr.owns(item.id) && Pr.equipped(item.cat).id === item.id;
        const test = Pr.ownedSource(item.id) === "test";
        const state = on ? "Sélectionné" : Pr.owns(item.id) ? "Possédé" : "Disponible";
        return `<div class="item${on ? " equipped" : ""}">
          ${UI.preview(item)}
          <div class="name">${esc(item.name)} ${test ? `<span class="tag test">Test</span>` : ""}</div>
          <p class="desc">${state}${item.desc ? " · " + esc(item.desc) : ""}</p>
          ${itemButton(item)}
        </div>`;
      }).join("")}</div>`;
    }
    const grid = $("shopGrid");
    grid.querySelectorAll("[data-equip]").forEach(b => b.onclick = () => { Pr.equip(b.dataset.equip); UI.applyCosmetics(); P4.Game.refreshCosmetics(); renderShop(); App.refreshTop(); });
    grid.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => buyWithCoins(Cat.get(b.dataset.buy)));
    grid.querySelectorAll("[data-pay]").forEach(b => b.onclick = () => purchaseFlow(b.dataset.pay));
    grid.querySelectorAll("[data-gopack]").forEach(b => b.onclick = () => { shopCat = "packs"; renderShop(); });
    grid.querySelectorAll("[data-gopremium]").forEach(b => b.onclick = () => App.show("profile"));
    grid.querySelectorAll("[data-gopass]").forEach(b => b.onclick = () => App.show("pass"));

    const R = C.rewards;
    $("shopInfo").innerHTML = `<b>Gagner des pièces en jouant :</b> victoire contre l'ordinateur ${R.winVsAI.easy} à ${R.winVsAI.expert} pièces, défi du jour jusqu'à ${R.dailyChallenge.base + 3 * R.dailyChallenge.perStar}, missions, récompense quotidienne et succès.
      Les pièces sont virtuelles : elles ne s'achètent pas et ne se convertissent jamais en argent réel.<br><br>
      <b>Prix en euros :</b> exemples de démonstration, aucun paiement n'est encore connecté.`;
  }

  // ---------- Pass de saison ----------
  function rewardCell(track, tier) {
    const table = track === "free" ? Cat.SEASON_FREE : Cat.SEASON_PREMIUM;
    const rw = table[tier];
    if (!rw) return `<div class="reward empty${track === "premium" ? " premium" : ""}"></div>`;
    const item = rw.item && Cat.get(rw.item);
    const what = rw.coins ? `+${rw.coins} pièces` : `${esc(item.name)}<br><small style="color:var(--muted)">${Cat.CATEGORIES.find(c => c.id === item.cat).name}</small>`;
    const ico = rw.coins ? `<span class="coin" style="width:26px;height:26px"></span>`
      : item.cat === "avatars" ? item.data.emoji
      : item.cat === "tokens" ? `<span class="ico" style="background:${item.data.c1[0]};border:3px solid ${item.data.c2[0]}"></span>`
      : item.cat === "boards" ? `<span class="ico" style="background:${item.data.board}"></span>` : "✦";
    const claimed = Pr.state.seasonClaimed[track].includes(tier);
    let state = "";
    if (claimed) state = `<span class="state done-check">✓</span>`;
    else if (Pr.canClaimSeason(track, tier)) state = `<button class="btn small" data-claim="${track}:${tier}">Récupérer</button>`;
    else if (track === "premium" && !Pr.hasPass()) state = `<span class="state" style="color:var(--lock);width:18px">${ICONS.lock}</span>`;
    return `<div class="reward${track === "premium" ? " premium" : ""}"><span class="ico">${ico}</span><span class="what">${what}</span>${state}</div>`;
  }

  function renderPass() {
    const S = C.season, tier = Pr.seasonTier(), X = C.xp;
    const ends = new Date(S.ends + "T23:59:59").toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
    $("passLead").textContent = `Progresse en jouant : +${X.game} XP par partie, +${X.win} par victoire contre l'ordi, +${X.daily} par défi du jour réussi, +${X.mission} par mission. La piste gratuite est ouverte à tous. La piste Premium ajoute des objets exclusifs, sans accélérer la progression.`;
    const passState = Pr.hasPass()
      ? `<div><b>Piste Premium débloquée</b> ${Pr.state.pass.source === "test" ? `<span class="tag test">Test</span>` : ""}</div>`
      : `<button class="btn" id="buyPass">Débloquer la piste Premium · ${price(C.prices.seasonPass)}</button>`;
    $("passHead").innerHTML = `
      <div class="row"><b>${esc(S.name)}</b><span style="color:var(--muted);font-size:13px">Se termine le ${ends}</span></div>
      <div class="row"><span class="tier-num">Palier ${tier}/${S.tiers}</span>
        <span style="font-size:13px;color:var(--muted)">${tier < S.tiers ? `${Pr.state.seasonXp % S.xpPerTier}/${S.xpPerTier} XP vers le palier ${tier + 1}` : "Saison terminée, bravo !"}</span></div>
      <div class="bar"><i style="width:${tier < S.tiers ? Math.round(Pr.seasonTierProgress() * 100) : 100}%"></i></div>
      ${passState}`;
    if ($("buyPass")) $("buyPass").onclick = () => purchaseFlow("season_pass_s1");

    let rows = `<div class="tiers-head"><span></span><span>Gratuit</span><span>Premium</span></div>`;
    for (let t = 1; t <= S.tiers; t++) {
      rows += `<div class="tier${t <= tier ? " reached" : ""}"><span class="n">${t}</span>${rewardCell("free", t)}${rewardCell("premium", t)}</div>`;
    }
    $("tierList").innerHTML = rows;
    $("tierList").querySelectorAll("[data-claim]").forEach(b => b.onclick = () => {
      const [track, t] = b.dataset.claim.split(":");
      const rw = Pr.claimSeason(track, Number(t));
      if (rw) UI.toast(rw.coins ? `+${rw.coins} pièces` : `${Cat.get(rw.item).name} débloqué : équipe-le dans la boutique.`);
      App.refresh();
    });
  }

  // ---------- Profil ----------
  function renderProfile() {
    const S = Pr.state, sum = Pr.summary(), prem = Pr.isPremium(), st = S.stats;
    const stat = (v, l) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`;
    const stars = Object.values(S.challenge.results).reduce((n, r) => n + (r.stars || 0), 0);
    const lvl = Object.keys(AI.LEVELS).map(k => {
      const r = st.vsAI[k], n = r.win + r.loss + r.draw;
      return `<tr><td>${AI.LEVELS[k]}</td><td>${r.win}</td><td>${r.loss}</td><td>${r.draw}</td><td>${n ? Math.round(100 * r.win / n) + " %" : "–"}</td></tr>`;
    }).join("");
    const modes = Object.entries(st.byMode).map(([k, v]) => `<tr><td>${P4.Game.MODES[k].name}</td><td>${v}</td></tr>`).join("");
    const powers = Object.keys(P4.Game.POWERS).map(k => `${P4.Game.POWERS[k].name} : ${st.powers[k] || 0}`).join(" · ");
    const veil = (txt) => prem ? "" : `<div class="veil"><span class="tag premium">Premium</span><b>${txt}</b><button class="btn small" data-gopremium>Voir l'offre</button></div>`;
    const resLabel = h => h.result === "win" ? `<span class="res-win">Victoire</span>` : h.result === "loss" ? `<span class="res-loss">Défaite</span>` : h.result === "draw" ? `<span class="res-draw">Nul</span>` : `<span class="res-draw">${h.result === "p1" ? "Joueur 1" : "Joueur 2"} gagne</span>`;
    const history = S.history.length ? S.history.slice(0, 15).map(h => `<li><span>${new Date(h.t).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} · ${P4.Game.MODES[h.mode].name} · ${h.opp === "local" ? "à deux" : "IA " + AI.LEVELS[h.opp]}</span>${resLabel(h)}</li>`).join("")
      : `<li><span>Aucune partie pour l'instant.</span></li>`;

    $("profileBody").innerHTML = `
      <div class="profile-head">
        <span class="big-ava">${Pr.equipped("avatars").data.emoji}</span>
        <div class="who">
          <h1 class="screen-title" style="font-size:30px">${esc((prem && S.names.p1) || "Mon profil")}</h1>
          <span style="font-weight:700">Niveau ${Pr.level()} · ${S.xp % C.xp.perLevel}/${C.xp.perLevel} XP ${prem ? `<span class="tag premium">Premium</span>` : ""} ${S.premium && S.premium.source === "test" ? `<span class="tag test">Test</span>` : ""}</span>
          <div class="bar"><i style="width:${Math.round(Pr.levelProgress() * 100)}%"></i></div>
        </div>
      </div>

      <h2 class="section-title">Statistiques</h2>
      <div class="stat-grid">
        ${stat(sum.games, "parties jouées")}${stat(sum.wins, "victoires contre l'IA")}${stat(sum.losses, "défaites contre l'IA")}
        ${stat(sum.draws, "matchs nuls")}${stat(sum.rate === null ? "–" : sum.rate + " %", "taux de victoire")}${stat(sum.bestStreak, "meilleure série")}
        ${stat(S.challenge.wins, "défis réussis")}${stat(stars, "étoiles de défi")}
      </div>
      <p class="lead" style="margin-top:10px">Parties à deux sur le même appareil : ${st.local.p1} victoire(s) du joueur 1, ${st.local.p2} du joueur 2, ${st.local.draw} nul(s).</p>

      <h2 class="section-title">Statistiques détaillées</h2>
      <div class="locked-box"><div class="card">
        <div class="table-wrap"><table><thead><tr><th>Contre l'IA</th><th>V</th><th>D</th><th>N</th><th>Taux</th></tr></thead><tbody>${prem ? lvl : lvl.replace(/\d+( %)?/g, "•")}</tbody></table></div>
        <div class="table-wrap" style="margin-top:10px"><table><thead><tr><th>Mode</th><th>Parties</th></tr></thead><tbody>${prem ? modes : modes.replace(/<td>\d+<\/td>/g, "<td>•</td>")}</tbody></table></div>
        <p class="lead" style="margin:10px 0 0">Coups moyens pour gagner : ${prem ? (sum.avgWinMoves ? sum.avgWinMoves.toFixed(1) : "–") : "•"}<br>Pouvoirs utilisés : ${prem ? powers : "•"}</p>
      </div>${veil("Statistiques détaillées")}</div>

      <h2 class="section-title">Historique des parties</h2>
      <div class="locked-box"><div class="card history"><ul>${prem ? history : "<li><span>••••••••</span><span>••••</span></li>".repeat(3)}</ul></div>${veil("Historique des 50 dernières parties")}</div>

      <h2 class="section-title">Succès</h2>
      <div class="ach-grid">${Pr.ACHIEVEMENTS.map(a => `
        <div class="ach${S.achievements[a.id] ? " on" : ""}"><span class="medal">${S.achievements[a.id] ? "★" : "?"}</span>
          <div><b>${esc(a.name)}</b><span>${esc(a.desc)}</span><span>${coinLabel(a.coins)}</span></div></div>`).join("")}</div>

      <h2 class="section-title" id="premiumSection">Premium</h2>
      <div class="card premium-card">
        ${prem ? `<b style="font-size:18px">Premium actif</b> ${S.premium.source === "test" ? `<span class="tag test">Test</span>` : ""}
          <p style="margin:8px 0 0;line-height:1.5">Merci ! Statistiques détaillées, historique, thèmes exclusifs et noms personnalisés sont débloqués.</p>`
        : `<span class="price">${price(C.prices.premiumMonthly)}</span> <span>/ mois, sans engagement</span>
          <ul><li>Statistiques détaillées par niveau et par mode</li><li>Historique des 50 dernières parties</li><li>2 plateaux exclusifs : Minuit violet et Océan</li><li>Noms de joueurs personnalisés</li></ul>
          <button class="btn" id="buyPremium">S'abonner</button>
          <p style="margin:12px 0 0;font-size:13px;opacity:.8">La version gratuite garde tous les modes de jeu, la boutique, le pass gratuit et la progression.</p>`}
      </div>

      <h2 class="section-title">Personnalisation</h2>
      <div class="locked-box"><div class="card">
        <div class="fields">
          <label class="field">Nom du joueur 1<input id="nameP1" maxlength="14" value="${esc(S.names.p1)}" ${prem ? "" : "disabled"} placeholder="Toi"></label>
          <label class="field">Nom du joueur 2<input id="nameP2" maxlength="14" value="${esc(S.names.p2)}" ${prem ? "" : "disabled"} placeholder="Joueur 2"></label>
        </div>
        <button class="btn small secondary" id="saveNames" ${prem ? "" : "disabled"}>Enregistrer les noms</button>
      </div>${veil("Noms personnalisés")}</div>

      <h2 class="section-title">Réglages</h2>
      <div class="card">
        <div class="setting"><div><b>Thème</b><p>Clair, sombre, ou comme ton appareil.</p></div>
          <div class="seg" role="group" aria-label="Thème" style="flex:none">${[["auto", "Auto"], ["light", "Clair"], ["dark", "Sombre"]].map(([v, l]) =>
            `<button data-theme-opt="${v}" aria-pressed="${UI.settings.theme === v}">${l}</button>`).join("")}</div></div>
        <div class="setting"><div><b>Sons</b><p>Bruitages des jetons et de fin de partie.</p></div>
          <label class="switch"><input type="checkbox" id="optSound" ${UI.settings.sound ? "checked" : ""} aria-label="Sons"><span></span></label></div>
        <div class="setting"><div><b>Vibrations</b><p>Sur téléphone, une petite vibration à chaque jeton.</p></div>
          <label class="switch"><input type="checkbox" id="optVibrate" ${UI.settings.vibrate ? "checked" : ""} aria-label="Vibrations"><span></span></label></div>
        <div class="setting"><div><b>Mode test des achats</b><p>Pour les développeurs : permet de simuler un achat ou une publicité afin de tester l'interface. Les objets obtenus sont marqués TEST. Aucun paiement réel.</p></div>
          <label class="switch"><input type="checkbox" id="testMode" ${S.testMode ? "checked" : ""} aria-label="Mode test des achats"><span></span></label></div>
        <div class="setting"><div><b>Retirer les achats de test</b><p>Supprime tout ce qui a été obtenu en mode test (objets, Premium, pass).</p></div>
          <button class="btn small secondary" id="clearTest">Retirer</button></div>
        <div class="setting"><div><b>Réinitialiser ma progression</b><p>Efface pièces, objets, succès et statistiques sur cet appareil.</p></div>
          <button class="btn small secondary" id="resetAll">Effacer</button></div>
      </div>

      <h2 class="section-title">Données et confidentialité</h2>
      <div class="card info-card" style="margin-top:0">Ta progression est enregistrée uniquement dans ce navigateur. Aucun compte, aucune donnée personnelle envoyée, aucun traceur publicitaire.
        Si un service de paiement ou de publicité est ajouté, une demande de consentement apparaîtra avant toute collecte.</div>`;

    const body = $("profileBody");
    body.querySelectorAll("[data-gopremium]").forEach(b => b.onclick = () => $("premiumSection").scrollIntoView({ behavior: "smooth" }));
    if ($("buyPremium")) $("buyPremium").onclick = () => purchaseFlow("premium_monthly");
    $("saveNames").onclick = () => { Pr.setNames($("nameP1").value, $("nameP2").value); UI.toast("Noms enregistrés."); renderProfile(); };
    body.querySelectorAll("[data-theme-opt]").forEach(b => b.onclick = () => { UI.setSetting("theme", b.dataset.themeOpt); renderProfile(); });
    $("optSound").onchange = e => { UI.setSetting("sound", e.target.checked); UI.Sound.coin(); };
    $("optVibrate").onchange = e => UI.setSetting("vibrate", e.target.checked);
    $("testMode").onchange = e => { Pr.setTestMode(e.target.checked); UI.toast(e.target.checked ? "Mode test activé : les simulations sont marquées TEST." : "Mode test désactivé."); };
    $("clearTest").onclick = () => { Pr.clearTestPurchases(); UI.applyCosmetics(); UI.toast("Achats de test retirés."); renderProfile(); App.refreshTop(); };
    $("resetAll").onclick = () => {
      UI.openSheet(`<h2 id="sheetTitle">Tout effacer ?</h2><p class="sub">Pièces, objets, succès, statistiques et progression du pass seront supprimés de cet appareil. Cette action est définitive.</p>
        <div class="actions"><button class="btn" id="confirmReset">Oui, tout effacer</button><button class="btn secondary" id="cancelReset" data-autofocus>Annuler</button></div>`);
      $("cancelReset").onclick = UI.closeSheet;
      $("confirmReset").onclick = () => { Pr.resetAll(); UI.applyCosmetics(); UI.closeSheet(); UI.toast("Progression effacée."); App.refresh(); };
    };
  }

  // ---------- Démarrage ----------
  document.querySelectorAll(".tab").forEach(t => t.onclick = () => App.show(t.dataset.tab));
  $("topAvatar").onclick = () => App.show("profile");
  Pr.onChange(() => App.refreshTop());
  UI.applyCosmetics();
  P4.Game.setup("classic", prefs); // prépare un plateau en arrière-plan, sans lancer de mode
  App.show("home");

  // Installable sur téléphone et jouable hors ligne (ignoré si on ouvre le fichier directement)
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => { });
})(window.P4 = window.P4 || {});
