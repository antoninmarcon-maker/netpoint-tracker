# Bugs post-match — Plan de fix

## Bug 1 : Header iPhone — haut de page inaccessible
**Fichier** : `src/pages/Index.tsx:329-348`
**Cause** : `<nav sticky top-[49px]>` hardcodé ne tient pas compte du safe-area iPhone. Le header fait `pt-[max(0.75rem,env(safe-area-inset-top))]` → hauteur dynamique. Sur iPhone avec notch, la nav chevauche le header.
**Fix** : Fusionner header + nav dans un seul bloc sticky pour qu'ils restent solidaires.

### Protocole de test
- [ ] Ouvrir l'app sur iPhone (Safari) avec notch/Dynamic Island
- [ ] Vérifier que le bouton retour (←) est cliquable
- [ ] Vérifier que le bouton aide (?) est cliquable
- [ ] Vérifier que les onglets Match/Stats sont cliquables
- [ ] Tester en mode standalone (PWA) si applicable
- [ ] Tester sur Android pour non-régression

---

## Bug 2 : Timeout demande d'assigner un joueur
**Fichiers** : `src/lib/actionsConfig.ts`, `src/lib/matchRules.ts:27-30`
**Cause** : Timeout est `neutral` → `isEligibleForInput=true` → `needsAssignToPlayer=true`. Aucune exception config. Le default `assignToPlayer: true` dans ScoreBoard.tsx s'applique.
**Fix** : Ajouter `'timeout': { assignToPlayer: false }` dans `defaultActionsConfig` de actionsConfig.ts.

### Protocole de test
- [ ] Créer un match avec des joueurs dans le roster
- [ ] Aller dans Actions neutres → Temps mort
- [ ] Vérifier qu'aucun sélecteur de joueur n'apparaît
- [ ] Vérifier que le temps mort est bien enregistré dans l'historique
- [ ] Vérifier que les autres actions neutres (réception, etc.) demandent toujours un joueur

---

## Bug 3 : Notations absentes des statistiques
**Fichier** : `src/components/ScoreBoard.tsx:125`
**Cause** : `hasRating` default à `false` dans `handleActionSelect`. Même avec `enableRatings: true` global, la notation n'est jamais demandée sauf si l'action a explicitement `hasRating: true` dans sa config.
**Fix** : Dans ScoreBoard.tsx `handleActionSelect`, changer le default de `hasRating` : si `metadata?.enableRatings` est true, default à `true` au lieu de `false`.

### Protocole de test
- [ ] Créer un match avec "Notations" activé dans les réglages
- [ ] Marquer un point (attaque, ace, etc.)
- [ ] Vérifier que le sélecteur de notation (positive/neutre/négative) apparaît
- [ ] Aller dans l'onglet Stats
- [ ] Activer le toggle "Notations"
- [ ] Vérifier que les pastilles colorées apparaissent dans les stats joueur
- [ ] Vérifier qu'avec "Notations" désactivé dans les réglages, aucune notation n'est demandée

---

## Bug 4 : Analyse IA — non-2xx status
**Fichier** : `supabase/functions/analyze-match/index.ts:112`
**Cause probable** : Le modèle `claude-haiku-4-5-20251001` peut avoir un ID invalide ou l'API key est expirée/manquante. L'erreur Anthropic est masquée par le wrapper Supabase qui retourne juste "non-2xx".
**Fix** :
1. Vérifier/mettre à jour le model ID (utiliser `claude-haiku-4-5-20251001` ou le bon ID actuel)
2. Ajouter un meilleur logging côté edge function
3. Côté client, afficher le vrai message d'erreur au lieu du générique

### Protocole de test
- [ ] Vérifier que `ANTHROPIC_API_KEY` est configuré dans les secrets Supabase
- [ ] Tester l'edge function directement via curl ou Supabase dashboard
- [ ] Lancer une analyse depuis l'app sur un match terminé
- [ ] Vérifier que l'analyse s'affiche correctement
- [ ] Tester le rate-limiting (plusieurs analyses rapides)

---

## Bug 5 : Match terminé non reflété dans le menu principal
**Fichiers** : `src/hooks/useMatchState.ts:540-567`, `src/pages/Home.tsx:254-276`
**Cause** : `finishMatch()` sauvegarde `finished: true` en localStorage mais ne notifie pas Home.tsx. Home charge les matchs uniquement au mount initial et au changement d'auth. Pas de reload au retour de navigation.
**Fix** : Ajouter un reload des matchs dans Home.tsx quand la page redevient visible (event `visibilitychange`) ou quand le composant se re-mount via navigation.

### Protocole de test
- [ ] Créer un match, jouer quelques points
- [ ] Terminer le match depuis l'interface de match
- [ ] Revenir au menu principal
- [ ] Vérifier que le match apparaît comme "Terminé" (pas comme actif)
- [ ] Vérifier qu'il n'y a pas de bouton "Terminer" redondant
- [ ] Tester la navigation aller-retour plusieurs fois
