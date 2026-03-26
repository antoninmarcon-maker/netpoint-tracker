# Enrich Spot — Google Photos + Social Links (Full Auto)

Protocole automatique pour enrichir les spots de volley. Un sous-agent spécialisé sélectionne et valide les photos sans intervention humaine.

## Prérequis

Les variables sont dans `.env.local` (gitignored). Charger via `source .env.local` :
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_PLACES_API_KEY`

## Protocole

### Étape 0 — Empêcher la mise en veille

Lancer `caffeinate` en arrière-plan pour bloquer la mise en veille macOS pendant tout le processus :
```bash
caffeinate -dims &
CAFFEINATE_PID=$!
```
> À la fin du protocole (étape 3), tuer le processus : `kill $CAFFEINATE_PID`

### Étape 1 — Charger les spots à enrichir

```bash
source .env.local && npx tsx scripts/enrich-spot.ts --list --no-photos --limit=20
```

Options : `--type=club` / `--type=beach`, `--limit=N`

### Étape 2 — Pour chaque spot, lancer un sous-agent

Pour chaque spot de la liste, **lancer un Agent** (subagent_type: general-purpose) avec le prompt suivant. Traiter les spots **séquentiellement** (1 par 1) pour éviter de surcharger l'API Google.

Le sous-agent doit :

1. **Récupérer les photos candidates** :
```bash
source .env.local && npx tsx scripts/enrich-spot.ts <spotId>
```

2. **Analyser chaque photo candidate** en ouvrant le `previewUrl` (outil Read sur l'URL image) et évaluer sa pertinence selon ces critères :

**ACCEPTER (score 1-5, garder les meilleures) :**
- Terrain de volley / beach volley / filet visible → score 5
- Gymnase / salle avec terrain visible → score 4
- Vue d'ensemble du lieu (plage, parc, aire de jeux) avec espace sportif → score 3
- Vue aérienne / extérieure montrant le complexe sportif → score 2

**REJETER (score 0) :**
- Logos, menus, selfies, photos de nourriture
- Intérieur sans rapport (vestiaires, bureaux, couloirs)
- Photos floues, trop sombres, ou de mauvaise qualité
- Salles de fitness / musculation (pour clubs volley)
- Bâtiments génériques sans terrain visible
- Doublons visuels (même angle, même contenu)

3. **Sauvegarder les top 5 photos** (score >= 2, triées par score desc) :
```bash
source .env.local && npx tsx scripts/enrich-spot.ts --save-photo <spotId> "<photoUrl>"
```

4. **Pour les clubs** (`type=club` ou `source=ffvb_club`), chercher les RS :
- Si `websites` contient un site pertinent et `club_site_web` est vide → sauvegarder
- Rechercher via WebSearch : `"{nom}" volleyball instagram` et `"{nom}" volleyball facebook`
- Sauvegarder les liens trouvés :
```bash
source .env.local && npx tsx scripts/enrich-spot.ts --update-social <spotId> social_instagram "<url>"
source .env.local && npx tsx scripts/enrich-spot.ts --update-social <spotId> social_facebook "<url>"
source .env.local && npx tsx scripts/enrich-spot.ts --update-social <spotId> club_site_web "<url>"
```

5. **Générer un avis IA** si le spot n'a pas de description ou si la description est générique ("Importé automatiquement...") :
- Le JSON du script contient maintenant un champ `reviews` avec les Google Reviews
- Si des reviews existent, rédiger une description courte (2-3 phrases en français) qui résume : qualité du terrain, ambiance, points forts/faibles
- Si pas de reviews, rédiger une description basée sur le nom, type et adresse du spot (ex: "Terrain de beach volley situé à [adresse]. Accès libre.")
- Pour les clubs : mentionner le nom du club et sa localisation
- Sauvegarder :
```bash
source .env.local && npx tsx scripts/enrich-spot.ts --update-description <spotId> "La description ici"
```

6. **Retourner un résumé** : nom du spot, photos ajoutées (nombre), liens mis à jour, description générée (oui/non)

### Étape 3 — Résumé global

Après tous les spots :
1. Arrêter `caffeinate` : `kill $CAFFEINATE_PID`
2. Afficher un tableau récapitulatif :
| Spot | Type | Photos ajoutées | RS trouvés | Description IA |

## Règles

- Full automatique — pas de validation humaine
- Maximum 5 photos par spot, 0 si rien de pertinent
- Les URLs Google sont pérennes avec l'API key — pas de download
- Traiter séquentiellement pour respecter les quotas API Google
- Pour les clubs : toujours chercher les RS même si des photos ont été trouvées
- Ne jamais sauvegarder une photo de score 0 ou 1

## Arguments

$ARGUMENTS — Optionnel :
- Un `spotId` spécifique pour enrichir un seul spot
- `club` ou `beach` pour filtrer par type
- `all` pour traiter tous les spots sans photos
- Un nombre (ex: `10`) pour limiter
