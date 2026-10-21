/* Catalogue des objets cosmétiques et récompenses du pass de saison.
   Tout est purement visuel : aucun objet ne donne d'avantage en jeu.

   Façons d'obtenir un objet ("price") :
   - rien          : gratuit, possédé dès le départ
   - { coins: n }  : s'achète avec les pièces gagnées en jouant
   - { eur: "small" | "standard" | "premium", product: "id" } : achat réel (prix dans config.js)
   - { pack: "id" }      : contenu d'un pack payant
   - { premium: true }   : inclus dans l'abonnement Premium
   - { season: "free" | "premium" } : récompense du pass de saison */
(function (P4) {
  const CATEGORIES = [
    { id: "tokens", name: "Jetons" },
    { id: "boards", name: "Plateaux" },
    { id: "victory", name: "Victoires" },
    { id: "avatars", name: "Avatars" },
    { id: "effects", name: "Effets" },
    { id: "packs", name: "Packs" }
  ];

  const tok = (id, name, n1, c1, n2, c2, price) => ({ id, cat: "tokens", name, price, data: { n1, c1, n2, c2 } });
  const brd = (id, name, board, edge, price) => ({ id, cat: "boards", name, price, data: { board, edge } });
  const vic = (id, name, anim, price, desc) => ({ id, cat: "victory", name, price, desc, data: { anim } });
  const ava = (id, name, emoji, price) => ({ id, cat: "avatars", name, price, data: { emoji } });
  const fx = (id, name, effect, price, desc) => ({ id, cat: "effects", name, price, desc, data: { fx: effect } });

  const ITEMS = [
    tok("tok_classic", "Rose & bleu", "rose", ["#F3B6B4", "#D98F8D"], "bleu", ["#4C8DF0", "#2F67C4"]),
    tok("tok_agrumes", "Agrumes", "orange", ["#FFB36B", "#E07B1F"], "vert", ["#B5DB5A", "#7FA82B"], { coins: 150 }),
    tok("tok_menthe", "Menthe & framboise", "menthe", ["#9EE0C9", "#4FAF8E"], "framboise", ["#F07A9A", "#C24868"], { coins: 250 }),
    tok("tok_lune", "Soleil & lune", "soleil", ["#FFD86B", "#D9A82A"], "lune", ["#A98BF0", "#7354C9"], { coins: 300 }),
    tok("tok_metal", "Or & argent", "or", ["#F2CE6B", "#B8912E"], "argent", ["#D5DAE3", "#98A0B0"], { eur: "small", product: "tokens_metal" }),
    tok("tok_neon", "Néon", "fuchsia", ["#FF5FA2", "#C2246B"], "cyan", ["#38E1F5", "#0F9DB3"], { pack: "pack_neon" }),
    tok("tok_automne", "Feuilles d'automne", "potiron", ["#F2A65A", "#C46F25"], "olive", ["#C9B458", "#8F7C27"], { season: "free" }),
    tok("tok_braise", "Braise & cendre", "braise", ["#FF7B54", "#C9431C"], "cendre", ["#8A98A8", "#5B6878"], { season: "premium" }),

    brd("brd_marine", "Marine", "#1F2A63", "#151D49"),
    brd("brd_foret", "Forêt", "#2E6B45", "#1F4D31", { coins: 200 }),
    brd("brd_bordeaux", "Bordeaux", "#6B2338", "#4C1726", { coins: 250 }),
    brd("brd_ardoise", "Ardoise", "#3A4250", "#272D37", { coins: 300 }),
    brd("brd_sable", "Sable", "#B98F55", "#8F6B38", { pack: "pack_decouverte" }),
    brd("brd_neon", "Néon nuit", "#17173A", "#0B0B22", { pack: "pack_neon" }),
    brd("brd_onyx", "Onyx", "#16181D", "#050608", { pack: "pack_prestige" }),
    brd("brd_minuit", "Minuit violet", "#2E2266", "#1C1445", { premium: true }),
    brd("brd_ocean", "Océan", "#0F4C5C", "#093540", { premium: true }),
    brd("brd_automne", "Automne", "#7A3E1D", "#5A2C13", { season: "free" }),
    brd("brd_crepuscule", "Crépuscule", "#5B2A63", "#3F1C45", { season: "premium" }),

    vic("vic_pulse", "Pulsation", "pulse", undefined, "Les jetons gagnants battent comme un cœur."),
    vic("vic_spin", "Toupie", "spin", { coins: 150 }, "Les jetons gagnants tournent sur eux-mêmes."),
    vic("vic_glow", "Halo", "glow", { coins: 250 }, "Un halo lumineux entoure l'alignement."),
    vic("vic_confetti", "Confettis", "confetti", { coins: 400 }, "Une pluie de confettis aux couleurs du gagnant."),
    vic("vic_fireworks", "Feu d'artifice", "fireworks", { pack: "pack_prestige" }, "Des gerbes d'étincelles au-dessus du plateau."),
    vic("vic_leaves", "Pluie de feuilles", "leaves", { season: "premium" }, "Des feuilles d'automne tombent sur le plateau."),

    ava("av_smile", "Sourire", "🙂"),
    ava("av_fox", "Renard", "🦊", { coins: 60 }),
    ava("av_panda", "Panda", "🐼", { coins: 60 }),
    ava("av_octo", "Poulpe", "🐙", { coins: 80 }),
    ava("av_cat", "Chat", "🐱", { coins: 80 }),
    ava("av_truck", "Poids lourd", "🚚", { coins: 120 }),
    ava("av_rocket", "Fusée", "🚀", { coins: 120 }),
    ava("av_star", "Étoile", "⭐", { pack: "pack_decouverte" }),
    ava("av_alien", "Extraterrestre", "👾", { pack: "pack_neon" }),
    ava("av_crown", "Couronne", "👑", { pack: "pack_prestige" }),
    ava("av_leaf", "Érable", "🍁", { season: "free" }),
    ava("av_owl", "Hibou", "🦉", { season: "premium" }),
    ava("av_dragon", "Dragon", "🐉", { season: "premium" }),

    fx("fx_none", "Sobre", "none", undefined, "Aucun effet, juste la chute."),
    fx("fx_shake", "Secousse", "shake", { coins: 120 }, "Le plateau tremble à l'arrivée du jeton."),
    fx("fx_trail", "Traînée", "trail", { coins: 180 }, "Le jeton laisse une traînée en tombant."),
    fx("fx_sparkle", "Étincelles", "sparkle", { coins: 250 }, "Une gerbe d'étincelles à l'atterrissage."),
    fx("fx_gold", "Poussière d'or", "gold", { pack: "pack_prestige" }, "Des paillettes dorées à chaque coup."),
    fx("fx_comet", "Comète", "comet", { season: "premium" }, "Le jeton tombe comme une comète.")
  ];

  const PACKS = [
    { id: "pack_decouverte", name: "Pack Découverte", tier: "small", product: "pack_decouverte",
      desc: "Un plateau couleur sable et un avatar étoile.", contains: ["brd_sable", "av_star"] },
    { id: "pack_neon", name: "Pack Néon", tier: "standard", product: "pack_neon",
      desc: "Jetons fluo, plateau nuit et avatar extraterrestre.", contains: ["tok_neon", "brd_neon", "av_alien"] },
    { id: "pack_prestige", name: "Pack Prestige", tier: "premium", product: "pack_prestige",
      desc: "Plateau onyx, feu d'artifice, poussière d'or et couronne.", contains: ["brd_onyx", "vic_fireworks", "fx_gold", "av_crown"] }
  ];

  // Récompenses du pass, par palier. "coins" = pièces, "item" = objet du catalogue
  const SEASON_FREE = {
    1: { coins: 50 }, 3: { coins: 50 }, 5: { item: "tok_automne" }, 7: { coins: 75 }, 10: { item: "av_leaf" },
    12: { coins: 100 }, 15: { item: "brd_automne" }, 18: { coins: 150 }, 20: { coins: 200 }
  };
  const SEASON_PREMIUM = {
    1: { coins: 100 }, 2: { item: "av_owl" }, 4: { item: "tok_braise" }, 6: { coins: 150 }, 8: { coins: 150 },
    10: { item: "brd_crepuscule" }, 12: { item: "fx_comet" }, 14: { coins: 200 }, 16: { item: "vic_leaves" },
    18: { coins: 250 }, 20: { item: "av_dragon" }
  };

  const byId = Object.fromEntries(ITEMS.map(i => [i.id, i]));
  const DEFAULTS = { tokens: "tok_classic", boards: "brd_marine", victory: "vic_pulse", avatars: "av_smile", effects: "fx_none" };

  P4.Catalog = {
    CATEGORIES, ITEMS, PACKS, SEASON_FREE, SEASON_PREMIUM, DEFAULTS,
    get: id => byId[id],
    pack: id => PACKS.find(p => p.id === id),
    inCategory: cat => ITEMS.filter(i => i.cat === cat),
    isFree: item => !item.price
  };
})(window.P4 = window.P4 || {});
