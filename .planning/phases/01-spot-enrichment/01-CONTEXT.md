# Phase 1: Spot Enrichment — Google Photos + Social Links + Club Display

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Enrichir les spots existants avec des photos Google Places et des liens réseaux sociaux pour les clubs. Adapter l'affichage du SpotDetailModal selon le type de spot (club vs extérieur). Créer un protocole interactif Claude Code pour traiter les spots un par un avec validation humaine.

</domain>

<decisions>
## Implementation Decisions

### Source de photos — Google Places + Street View
- **D-01:** Combiner Google Places Photos API + Google Street View Static API en fallback
- **D-02:** Rechercher le `place_id` le plus proche du spot via `searchText` + coordonnées (rayon 200m)
- **D-03:** Mots-clés de recherche : "volleyball", "beach volley", "terrain", "gymnase" selon le type
- **D-04:** Récupérer jusqu'à 5 photos par spot, privilégier celles montrant des terrains
- **D-05:** Stocker l'URL Google directe dans `spot_photos.photo_url` (pas de téléchargement dans Storage)
- **D-06:** Si le spot a déjà un `google_place_id`, l'utiliser directement pour Place Details → photos
- **D-07:** Si pas assez de photos Places, ajouter une vue Street View comme fallback

### Sélection et validation des photos
- **D-08:** Protocole 1 par 1 : afficher les photos candidates (URLs preview) pour validation manuelle
- **D-09:** L'opérateur accepte/rejette chaque photo individuellement, ou skip le spot entier
- **D-10:** Minimum 1 photo acceptée pour considérer le spot comme "enrichi"
- **D-11:** Marquer les spots traités pour ne pas les reprocesser (champ `enrichment_status`)

### Recherche de liens sociaux pour les clubs
- **D-11:** Pour les spots `source = 'ffvb_club'`, rechercher les réseaux sociaux
- **D-12:** Stratégie : Google Search `"{nom du club}" volleyball instagram OR facebook`
- **D-13:** Extraire les URLs Instagram et Facebook des résultats
- **D-14:** Stocker dans `social_instagram` et `social_facebook` (champs existants)
- **D-15:** Validation manuelle : l'opérateur confirme que le lien correspond bien au club

### Adaptation affichage clubs dans SpotDetailModal
- **D-16:** Masquer la section "Disponibilité" (saison/mois) pour les spots de type `club`
- **D-17:** Masquer les badges équipement extérieur (acces_libre, eclairage) pour les clubs
- **D-18:** Ajouter un bloc "Infos club" dédié : site web, téléphone, email, fiche FFVB
- **D-19:** Afficher les réseaux sociaux dans ce bloc club (pas séparément)
- **D-20:** Afficher `ffvb_comite` et `ffvb_ligue` de manière plus visible (pas en texte muted)

### Protocole interactif — Skill Claude Code
- **D-21:** Créer un skill `/enrich-spot` invocable dans Claude Code
- **D-22:** Le skill charge les spots sans photos (ou avec enrichment_status = null)
- **D-23:** Traitement séquentiel : 1 spot à la fois, avec résumé affiché
- **D-24:** Pour chaque spot : afficher nom, type, coordonnées, photos existantes
- **D-25:** Proposer les photos Google, attendre validation
- **D-26:** Pour les clubs : proposer aussi les liens sociaux trouvés
- **D-27:** Après chaque spot : résumé des actions + passage au suivant
- **D-28:** Possibilité de filtrer par type, par zone géographique, ou par source

### Claude's Discretion
- Ordre de traitement des spots (par type, par date de création, aléatoire)
- Format exact du résumé affiché par spot
- Gestion des erreurs API (retry, skip, etc.)

</decisions>

<specifics>
## Specific Ideas

- Privilégier les photos où l'on voit un ou des terrains de volley — pas juste le bâtiment
- Pour les clubs indoor, chercher aussi "gymnase" ou "salle de sport" dans les recherches
- Le protocole doit être rapide : on doit pouvoir traiter 20-30 spots en une session
- Pour les réseaux sociaux des clubs, chercher aussi sur le site de la FFVB ou les pages comité
- Les photos Google Places expirent si on ne les stocke pas → toujours télécharger dans Supabase

</specifics>

<canonical_refs>
## Canonical References

### Google Places API (existant)
- `supabase/functions/import-spots/index.ts` — Intégration complète : searchText, photos download, Supabase Storage upload
- `supabase/migrations/20260311003400_spot_reviews_and_google.sql` — Schema google_place_id + spot_photos

### Affichage spots
- `src/components/spots/SpotDetailModal.tsx` — Modal détail spot, carousel photos, sections club/social
- `src/components/spots/SpotFormModal.tsx` — Formulaire création/édition spot
- `src/lib/spotTypes.ts` — Types de spots (club, beach, green_volley, outdoor_hard, outdoor_grass)

### Stockage photos
- `src/lib/uploadSpotPhoto.ts` — Upload helper existant
- Bucket Supabase Storage : `spot-photos` (public)

### Types et schema
- `src/integrations/supabase/types.ts:239-342` — Types Spot complets avec tous les champs

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **import-spots/index.ts:154-197** : Logique complète de download photo Google → Supabase Storage, réutilisable
- **import-spots/index.ts:67-78** : Appel Google Places searchText avec headers corrects
- **uploadSpotPhoto.ts** : Helper d'upload côté client (pour photos user)
- **SpotDetailModal.tsx:218-228** : Carousel photo horizontal avec snap scroll

### Established Patterns
- Photos stockées dans `spot-photos/{spotId}/{uuid}.jpg`
- Entrées dans table `spot_photos` avec `photo_url` = URL publique Supabase
- `user_id = '00000000-...'` pour les imports automatiques
- Google Places API v1 avec `X-Goog-Api-Key` header

### Integration Points
- `spots.google_place_id` — Lien spot ↔ Google Place (déjà en schema)
- `spots.social_instagram`, `spots.social_facebook` — Champs sociaux existants
- `spot_photos` table — Photos déjà affichées dans le carousel
- `SpotDetailModal.tsx` — Rendering conditionnel à ajouter pour clubs

</code_context>

<deferred>
## Deferred Ideas

- Enrichissement automatique en batch (sans validation manuelle) — phase ultérieure
- Ajout de reviews Google agrégées aux spots — déjà partiellement implémenté via Gemini
- Recherche WhatsApp group pour les clubs — trop complexe à automatiser
- Géolocalisation inverse pour corriger les adresses — pas dans le scope

</deferred>

---

*Phase: 01-spot-enrichment*
*Context gathered: 2026-03-25*
