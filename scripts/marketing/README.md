# My Volley — Marketing Automation

Pipeline automatisé pour promouvoir My Volley auprès de la communauté volley française (joueurs, coachs, clubs).

## Quick Start

```bash
# 1. Appliquer le schema CRM en base
#    → Copier le contenu de crm/schema.sql dans le SQL Editor de Supabase

# 2. Installer les dépendances
npm install playwright dotenv @supabase/supabase-js

# 3. Installer les navigateurs Playwright (nécessaire pour le scraper)
npx playwright install chromium

# 4. Configurer les variables d'environnement
#    → Remplir .env.marketing à la racine du projet (voir section Config)

# 5. Lancer le pipeline
npx tsx scripts/marketing/run.ts status
```

## Commandes

| Commande | Description |
|----------|-------------|
| `npx tsx scripts/marketing/run.ts generate` | Génère 5 posts pour la semaine via Gemini |
| `npx tsx scripts/marketing/run.ts publish` | Publie le contenu planifié (si APIs configurées) |
| `npx tsx scripts/marketing/run.ts scrape` | Scrape des profils volley sur Instagram |
| `npx tsx scripts/marketing/run.ts metrics` | Met à jour les métriques d'engagement |
| `npx tsx scripts/marketing/run.ts status` | Affiche l'état du CRM et du calendrier |
| `npx tsx scripts/marketing/run.ts all` | Exécute toutes les étapes ci-dessus |

---

## Architecture

```
scripts/marketing/
├── config.ts                   # Config centralisée (Supabase, Gemini, segments)
├── run.ts                      # CLI orchestrateur
├── crm/
│   ├── schema.sql              # Tables Supabase (contacts, interactions, content)
│   └── contacts.ts             # CRUD contacts + stats
├── content/
│   ├── generator.ts            # Génération IA via Gemini 2.5 Flash
│   ├── calendar.ts             # Calendrier éditorial + détection de gaps
│   └── templates/              # Templates Markdown par type de contenu
│       ├── tip.md
│       ├── feature-showcase.md
│       ├── stats-highlight.md
│       ├── behind-the-scenes.md
│       └── community.md
└── outreach/
    ├── templates.ts            # 18 messages personnalisés (3/segment × 2 plateformes)
    ├── scraper.ts              # Playwright scraper Instagram
    └── publisher.ts            # Publication Meta Graph API + TikTok API
```

---

## Config (.env.marketing)

```env
# Obligatoire
SUPABASE_URL="https://xxx.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJ..."
GEMINI_API_KEY="AIza..."

# Optionnel — publication Instagram
META_ACCESS_TOKEN=""
META_PAGE_ID=""
META_IG_USER_ID=""

# Optionnel — publication TikTok
TIKTOK_ACCESS_TOKEN=""
```

Ce fichier est dans `.gitignore`. Ne jamais le commiter.

---

## Modules détaillés

### 1. CRM (`crm/`)

**3 tables Supabase :**

| Table | Rôle |
|-------|------|
| `marketing_contacts` | Contacts scrappés ou ajoutés manuellement |
| `marketing_interactions` | Historique des DMs, comments, follows |
| `marketing_content` | Posts générés, planifiés, publiés |

**API TypeScript (`contacts.ts`) :**

```typescript
import { listContacts, addContact, markContacted, getStats } from './crm/contacts';

// Lister les contacts d'un segment
const coaches = await listContacts({ segment: 'coach', status: 'new' });

// Ajouter un contact manuellement
await addContact({ name: 'Jean Dupont', segment: 'player', handle_ig: 'jean.volley' });

// Marquer comme contacté + enregistrer l'interaction
await markContacted(contact.id, {
  platform: 'instagram',
  type: 'dm',
  message_sent: 'Salut Jean...'
});

// Stats globales
const stats = await getStats();
// → { total: 42, bySegment: { player: 20, coach: 12, club: 10 }, byStatus: { new: 30, contacted: 12 } }
```

### 2. Génération de contenu (`content/`)

**Pipeline :** Template Markdown → Prompt Gemini → JSON structuré → Sauvegarde Supabase

**5 types de contenu**, rotés automatiquement :
- `tip` — Conseil tactique volley
- `feature_showcase` — Présentation d'une feature de l'app
- `stats_highlight` — Insight statistique
- `behind_the_scenes` — Coulisses du développement
- `community` — Engagement communautaire

**3 segments cibles** avec hashtags dédiés :
- `player` — #volleyball #volleyballfrance #beachvolley...
- `coach` — #coachvolley #entraineurvolley #tactiquevolley...
- `club` — #clubvolley #ffvb #ligueaVolley...

**Calendrier éditorial :** 5 posts/semaine, planifiés à 10h/14h/18h en alternant segments et types.

```typescript
import { generatePost, generateWeeklyCalendar, saveGeneratedContent } from './content/generator';

// Générer un seul post
const post = await generatePost('tip', 'player', 'Contexte optionnel...');

// Générer le calendrier de la semaine
const posts = await generateWeeklyCalendar(new Date('2026-03-23'));
await saveGeneratedContent(posts);
```

**Gestion des gaps :**

```typescript
import { getUpcomingContent, getContentGaps, autoSchedule } from './content/calendar';

const upcoming = await getUpcomingContent(7);   // Posts des 7 prochains jours
const gaps = await getContentGaps(14);          // Jours sans contenu sur 14j
```

### 3. Message templates (`outreach/templates.ts`)

**18 templates** — 3 par segment × 2 plateformes (Instagram / TikTok).

| Segment | Templates | Ton |
|---------|-----------|-----|
| Joueur | discovery, performance, community | Tutoiement, dynamique, emojis |
| Coach | scouting, organization, tournaments | Vouvoiement (IG), professionnel |
| Club | visibility, events, growth | Formel, personnalisé avec `{{club_name}}` |

**Variables dynamiques :** `{{name}}`, `{{club_name}}`, `{{community_size}}`

```typescript
import { renderTemplate, selectTemplate } from './outreach/templates';

// Sélection automatique (évite les doublons)
const template = selectTemplate('player', 'instagram', contactHistory);

// Rendu avec variables
const message = renderTemplate(template.id, {
  name: 'Jean',
});
// → "Salut Jean ! 🏐\nTu cherches un terrain de volley près de chez toi ?..."
```

### 4. Scraper Playwright (`outreach/scraper.ts`)

Scrape les profils publics Instagram via les hashtags volley.

**Fonctionnement :**
1. Ouvre un navigateur headless (Chromium)
2. Navigue sur les pages hashtags (#volleyball, #coachvolley, etc.)
3. Visite chaque post → profile → extrait nom, bio, followers, ville
4. Détecte automatiquement le segment via mots-clés dans la bio
5. Sauvegarde les nouveaux contacts dans le CRM (dédupliqués par handle)

**Config :**
```typescript
// config.ts
SCRAPER = {
  maxProfilesPerRun: 30,     // Max profils par exécution
  delayBetweenPages: 3000,   // Délai entre pages (ms) — pour rester poli
  headless: true,             // true = pas de fenêtre visible
};
```

**Détection de segment :** La bio est analysée avec des regex pour détecter les mots-clés :
- Club : "club", "association", "comité", "ligue", "ffvb"...
- Coach : "coach", "entraîneur", "formateur", "staff"...
- Joueur : "joueur", "libero", "setter", "passeur", "attaquant"...

**Détection de ville :** Les 33 plus grandes villes françaises sont matchées dans la bio.

### 5. Publisher (`outreach/publisher.ts`)

Publie le contenu planifié sur Instagram et TikTok via leurs APIs officielles.

**Instagram (Meta Graph API) :**
- Nécessite un compte Business + une Facebook Page liée
- Process : Créer un media container → Publier le container
- Requiert une image ou vidéo (pas de post texte seul)

**TikTok (Content Posting API) :**
- Nécessite un compte Developer TikTok
- Publie des vidéos via URL (pull from URL)

Le publisher marque automatiquement le contenu comme `published` en DB après succès.

---

## Workflow quotidien recommandé

```
Lundi     → npx tsx scripts/marketing/run.ts generate   # Contenu de la semaine
Tous les jours → npx tsx scripts/marketing/run.ts publish    # Publie ce qui est dû
Mercredi  → npx tsx scripts/marketing/run.ts scrape      # Nouveaux contacts
Vendredi  → npx tsx scripts/marketing/run.ts status      # Revue hebdo
```

Ou un seul `run.ts all` quotidien qui fait tout.

---

## Setup APIs (optionnel)

### Instagram Business Account
1. Créer une Page Facebook pour My Volley
2. Lier un compte Instagram Business à la Page
3. Créer une app sur [developers.facebook.com](https://developers.facebook.com)
4. Obtenir un access token avec les permissions `instagram_basic`, `instagram_content_publish`
5. Trouver l'IG User ID via l'API Graph Explorer
6. Remplir `META_ACCESS_TOKEN`, `META_PAGE_ID`, `META_IG_USER_ID` dans `.env.marketing`

### TikTok Developer Account
1. Créer un compte sur [developers.tiktok.com](https://developers.tiktok.com)
2. Créer une app avec l'accès "Content Posting API"
3. Obtenir un access token via OAuth
4. Remplir `TIKTOK_ACCESS_TOKEN` dans `.env.marketing`

---

## Base de données

### marketing_contacts

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid (PK) | Auto-généré |
| name | text | Nom du contact |
| handle_ig | text | Handle Instagram |
| handle_tiktok | text | Handle TikTok |
| segment | text | `player` / `coach` / `club` |
| source | text | Origine (ex: `hashtag:volleyball`) |
| status | text | `new` / `contacted` / `replied` / `converted` / `ignored` |
| city | text | Ville détectée |
| club_name | text | Nom du club (pour les clubs) |
| followers_count | integer | Nombre de followers |
| bio | text | Bio du profil |
| notes | text | Notes manuelles |
| created_at | timestamptz | Date de création |
| updated_at | timestamptz | Auto-mis à jour |

### marketing_interactions

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid (PK) | Auto-généré |
| contact_id | uuid (FK) | → marketing_contacts |
| platform | text | `instagram` / `tiktok` |
| type | text | `dm` / `comment` / `follow` / `like` / `mention` |
| message_sent | text | Message envoyé |
| response | text | Réponse reçue |
| sent_at | timestamptz | Date d'envoi |
| responded_at | timestamptz | Date de réponse |

### marketing_content

| Colonne | Type | Description |
|---------|------|-------------|
| id | uuid (PK) | Auto-généré |
| content_type | text | `tip` / `feature_showcase` / `stats_highlight` / `behind_the_scenes` / `community` |
| segment | text | `player` / `coach` / `club` / `all` |
| title | text | Titre du post |
| body | text | Corps complet (Markdown) |
| caption | text | Texte court pour les réseaux |
| media_url | text | URL de l'image/vidéo |
| platform | text | `instagram` / `tiktok` / `both` |
| status | text | `draft` / `scheduled` / `published` |
| scheduled_at | timestamptz | Date de publication prévue |
| published_at | timestamptz | Date de publication effective |
| engagement_likes | integer | Nombre de likes |
| engagement_comments | integer | Nombre de commentaires |
| engagement_shares | integer | Nombre de partages |
| created_at | timestamptz | Date de création |
