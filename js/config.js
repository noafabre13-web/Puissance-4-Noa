/* Réglages centraux : prix, récompenses, saison.
   Tous les prix sont des EXEMPLES, à modifier ici uniquement. */
(function (P4) {
  P4.CONFIG = {
    // Prix indicatifs en euros TTC
    prices: {
      small: 0.99,          // petit pack
      standard: 2.99,       // pack standard
      premium: 4.99,        // pack premium
      seasonPass: 3.99,     // pass de saison
      premiumMonthly: 2.99  // abonnement Premium, par mois
    },

    // Pièces virtuelles gagnées en jouant. Elles ne s'achètent pas et ne se convertissent jamais en argent réel.
    rewards: {
      welcomeCoins: 100,
      winVsAI: { easy: 10, medium: 20, hard: 40 },
      lossVsAI: 5,
      draw: 10,
      localGame: 10,        // partie à deux sur le même appareil
      training: 5,
      chronoBonus: 5,
      dailyChallenge: { base: 30, perStar: 10 },
      dailyLogin: [20, 25, 30, 40, 50, 60, 100], // jours 1 à 7 d'affilée, puis on reste à 100
      rewardedAd: 30        // uniquement si une vraie régie publicitaire confirme la vue complète
    },

    xp: { game: 20, win: 15, daily: 40, mission: 30, perLevel: 120 },

    season: {
      id: "s1",
      name: "Saison 1 · Automne",
      ends: "2026-12-31",
      tiers: 20,
      xpPerTier: 100
    }
  };

  P4.formatPrice = v => v.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
})(window.P4 = window.P4 || {});
