# Session Report — Enrichment V2

**Date:** 2026-03-26
**Duration:** ~6 heures (agents séquentiels)

---

## Ce qui a été fait

### 1. Schema & Migration
- 9 nouvelles colonnes ajoutées (spots: 3, spot_photos: 6)
- Types TypeScript régénérés
- Migration appliquée en prod

### 2. Nouveaux composants UI
- **PhotoLightbox.tsx** — Viewer plein écran avec swipe, flèches, compteur, attribution
- **NavigationPicker.tsx** — Bottom sheet avec Google Maps, Waze, Apple Plans, copier adresse
- **sortSpotPhotos.ts** — Utilitaire de tri par catégorie + hero-first

### 3. Modifications UI
- **SpotDetailModal.tsx** : lightbox, dot indicators, lazy loading, placeholder thématique, Google Maps place link, contacts TikTok/YouTube, fix icône email
- **SpotFormModal.tsx** : gestion photos existantes (charger/supprimer/ajouter), champs contacts complets

### 4. Tests
- **19 tests unitaires** (Vitest) : PhotoLightbox (8), NavigationPicker (5), sortSpotPhotos (6)
- **5 tests E2E** (Playwright) : carousel, lightbox, nav picker, Google Maps link, contacts
- **Résultats** : 823 unit tests passent, 3/5 E2E passent (2 skippés data-dependent)

### 5. Script V2
- Réécriture complète avec 9 commandes
- Recherche concentrique (100m→300m→500m→1km)
- Scoring de confiance (distance × 0.5 + nom × 0.3 + type × 0.2)
- Upload vers Supabase Storage (permanent)
- Metadata complète (source_type, photo_category, confidence, is_hero, author_name)

### 6. Skills Claude Code
- `/enrich-spot` — Skill V2 avec 6 phases par spot, agent frais par spot
- `/enrich-spot-test` — 20 spots hardcodés pour test

### 7. Lessons Learned
- 4 nouvelles leçons ajoutées (rayon, stockage, descriptions, context isolation)

---

## Résultats enrichissement V2 — 20 spots

### Beach Spots (10)

| # | Spot | Photos | Description | Google Maps | V1 Cleanup | Confidence | Completeness |
|---|------|--------|-------------|-------------|------------|------------|--------------|
| 1 | VVF Vendes | 0 | Fallback | Non | 5 deprecated | 0.35 | 1 |
| 2 | Aire de loisirs Persac | 0 | Factuel | Non | 5 deprecated | 0.35 | 1 |
| 3 | Aire multisports Bellême | 0 | Factuel (FFVB+mairie) | Non | 5 deprecated | 0.38 | 1 |
| 4 | Collège Zola Kingersheim | 4 (vue_ext) | Reviews Google | Oui (Parc Gravières) | 5 deprecated | 0.68 | 6 |
| 5 | La Praille Mélisey | 4 (terrain+action+2×vue) | Web sources | Non | 5 deprecated | 0.70 | 5 |
| 6 | Camping Alberts Montgenèvre | 3 (terrain+vue+logo) | Web (camping) | Oui | 5 deprecated | 0.50 | 5 |
| 7 | Centre Loisirs St-Martial | 0 | Factuel (mairie) | Non | 5 deprecated | 0.30 | 1 |
| 8 | Lycée Saubrigues | 1 (vue_ext) | Factuel (FFVB+lycée) | Oui | 4 deprecated | 0.50 | 4 |
| 9 | Terrain sable Darnétal | 0 | Fallback | Non | 5 deprecated | 0.41 | 1 |
| 10 | Base Pigerolles Rosans | 0 | Fallback | Non | 5 deprecated | 0.30 | 1 |

**Beach summary:** 12 photos / 50 max. Les spots ruraux (7/10) n'ont pas de présence Google Places. La recherche web compensatoire a fonctionné pour Mélisey et Montgenèvre.

### Club Spots (10)

| # | Club | Photos | Social | Description | Google Maps | Addr Fix | Confidence | Completeness |
|---|------|--------|--------|-------------|-------------|----------|------------|--------------|
| 1 | Narbonne Volley | 5 (toutes cat.) | IG+FB+YT+site+tel | Pro (sources web) | Oui | Non | 0.46 | 12 |
| 2 | ASEB St Denis | 2 (terrain+vue) | IG+FB+site+tel+email | Factuel (site) | Oui | Oui (gymnase) | 0.50 | 9 |
| 3 | AS Lagnieu | 0 | tel | Factuel (équip.) | Oui | Oui (gymnase) | 0.50 | 3 |
| 4 | Carcassonne Volley | 5 (toutes cat.) | IG+FB+TT+YT+tel+email+site | Pro (site club) | Oui | Oui (gymnase) | 0.95 | 14 |
| 5 | VC Meximieux | 4 (groupe+action+logo+terrain) | IG+FB+site+tel | Factuel (Clubeo) | Oui | Oui | 0.84 | 11 |
| 6 | Bourg Volley | 5 (via V1 recatég.) | FB+email+tel | Factuel (corrigé) | Oui | Oui | 0.70 | 9 |
| 7 | COSMO Cuxac | 5 (vue+terrain+action) | IG+FB+email+tel | Factuel (mairie) | Oui | Oui (coords!) | 0.65 | 11 |
| 8 | L'Envolley 01 | 5 (logo+groupe+action+terrain) | IG+FB+site+email | Pro (site club) | Oui | Oui | 0.85 | 12 |
| 9 | VBC Corbières | 3 (vue_ext) | FB | Factuel (sources) | Oui | Oui | 0.70 | 6 |
| 10 | AS Arbent VB | 3 (logo+terrain+vue) | IG+site+email+tel | Factuel (site) | Oui | Oui (coords) | 0.75 | 9 |

**Club summary:** 37 photos / 50 max. 10/10 ont un lien Google Maps. 8/10 ont leur adresse corrigée vers le gymnase. 2 clubs avec 14 et 12 de completeness (max théorique ~14).

---

## Bugs corrigés pendant l'enrichissement

1. **COSMO Cuxac** — coordonnées au centre de la France (46.6, 1.9) → corrigées vers Saint-Marcel-sur-Aude (43.25, 2.92)
2. **Bourg Volley** — description et RS confondus avec ASEB (autre club même ville) → corrigés
3. **AS Arbent** — coordonnées décalées de 2.6km → corrigées vers le gymnase
4. **VBC Corbières** — 5 photos V1 de clubs différents (Gruissan, Perpignan) → supprimées, remplacées par photos de la salle de Fitou
5. **Plusieurs clubs** — adresses malformées ("1000 BOURG EN BRESSE") → remplacées par adresses précises du gymnase

---

## Estimation coût API Google Places

| Type | Appels estimés | Coût unitaire | Total |
|------|---------------|---------------|-------|
| searchText | ~120 (20 spots × 3 queries × 2 radii avg) | $0.032 | ~$3.84 |
| Photos download | ~60 | $0.007 | ~$0.42 |
| **Total** | | | **~$4.26** |

Largement dans le free tier ($200/mois).

---

## V1 vs V2 — Comparaison

| Aspect | V1 | V2 |
|--------|----|----|
| Rayon recherche | 200m fixe | 100m→1km concentrique |
| Photos par spot | 5 max (même lieu) | 1 par catégorie (diversité) |
| Stockage photos | URL Google (expire) | Supabase Storage (permanent) |
| Descriptions | Inventées | Factuelles, sources vérifiées |
| Contacts clubs | Basiques | Complets (phone, email, 5 RS) |
| Adresse clubs | Siège social | Gymnase d'entraînement |
| Google Maps link | Coordonnées GPS | Place ID (lieu exact) |
| Context | Partagé entre spots | Agent frais par spot |
| Confiance | Aucune | Score 0-1 avec flags |

---

## Prochaines étapes recommandées

1. **Vérifier visuellement** les 20 spots dans l'app (photos, descriptions, liens)
2. **Tester le lightbox et le nav picker** sur mobile
3. **Lancer sur les 3000+ spots** avec `/enrich-spot all` (estimer ~$600 d'API, ~2 jours)
4. **Ajouter les photos manquantes** pour les spots ruraux via upload utilisateur
