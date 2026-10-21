/* Paiements et publicités : points de branchement, AUCUN fournisseur n'est connecté.

   Tant que "provider" vaut null :
   - aucun paiement n'est encaissé, aucun objet payant n'est accordé ;
   - aucune publicité n'est affichée, aucune récompense publicitaire n'est accordée.

   Le "mode test" (Profil > Réglages) permet seulement de simuler un achat pour vérifier l'interface.
   Les objets obtenus ainsi portent la mention TEST et peuvent être retirés d'un clic.
   Voir MONETISATION.md pour brancher de vrais fournisseurs. */
(function (P4) {
  const C = P4.CONFIG;

  // Produits payants. Les identifiants doivent correspondre à ceux déclarés chez le fournisseur.
  const PRODUCTS = {
    tokens_metal: { name: "Jetons Or & argent", price: C.prices.small, type: "unique" },
    pack_decouverte: { name: "Pack Découverte", price: C.prices.small, type: "unique" },
    pack_neon: { name: "Pack Néon", price: C.prices.standard, type: "unique" },
    pack_prestige: { name: "Pack Prestige", price: C.prices.premium, type: "unique" },
    season_pass_s1: { name: "Pass de saison", price: C.prices.seasonPass, type: "unique" },
    premium_monthly: { name: "Premium", price: C.prices.premiumMonthly, type: "abonnement mensuel" }
  };

  P4.Payments = {
    PRODUCTS,
    // À remplacer par un adaptateur réel : { purchase(productId) -> Promise<{ status: "paid", receipt } | { status: "cancelled" }> }
    // Important : en production, le reçu doit être vérifié par un serveur avant d'accorder l'objet.
    provider: null,
    isConfigured() { return !!this.provider; },
    async purchase(productId) {
      if (!PRODUCTS[productId]) return { status: "error", message: "Produit inconnu." };
      if (!this.provider) return { status: "unavailable" };
      try { return await this.provider.purchase(productId); }
      catch (e) { return { status: "error", message: "Le paiement n'a pas abouti." }; }
    }
  };

  P4.Ads = {
    // À remplacer par un adaptateur réel : { showRewarded(placement) -> Promise<{ status: "completed" | "dismissed" | "error" }> }
    // Le consentement publicitaire (RGPD) doit être recueilli avant le premier affichage.
    provider: null,
    isConfigured() { return !!this.provider; },
    async showRewarded(placement) {
      if (!this.provider) return { status: "unavailable" };
      try { return await this.provider.showRewarded(placement); }
      catch (e) { return { status: "error" }; }
    }
  };
})(window.P4 = window.P4 || {});
