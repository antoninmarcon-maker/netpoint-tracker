# My Volley — Redesign Monochrome

**Date:** 2026-03-20
**Status:** Review
**Scope:** Logo, palette, composants UI, carte map, navigation, animations

---

## 1. Direction

Passer d'un design bleu sportif classique à une identité **monochrome premium** — fond noir profond, quasi noir et blanc, seul l'accent doré apporte de la couleur. Inspiré Linear, Raycast. Dark mode par défaut, light mode disponible dans les réglages.

## 2. Logo

### Concept
Ballon de volleyball réduit à ses **3 coutures essentielles** (traits SVG fins, stroke-width 1.2-1.8). Un **point doré** en haut à droite — signature de la marque. Le logo fonctionne en monochrome pur (sans le point) pour les usages secondaires.

### Wordmark
`my` en blanc/noir + `volley` en doré (#eab308 dark, #ca8a04 light). Minuscules, font-weight 700, letter-spacing -0.03em.

### Déclinaisons
- **App icon (PWA)** : 512×512, fond #09090b, bordure #27272a, border-radius 22%, SVG centré
- **Favicon** : 32×32, même concept, stroke-width augmenté pour lisibilité
- **Header inline** : 28×28 icon + wordmark

### Format
SVG pour le logo (remplace le PNG actuel). PNG exports générés pour les PWA icons.

## 3. Palette de couleurs

Le projet utilise le système de tokens shadcn/ui en **HSL sans wrapper** (ex: `220 14% 10%`) consommés via `hsl(var(...))` dans Tailwind. Toutes les valeurs ci-dessous sont en HSL.

### Token migration map (shadcn → nouveaux design tokens)

Les noms de tokens shadcn sont conservés. Voici le mapping conceptuel pour comprendre le spec :

| Nom dans le spec | Token shadcn existant | Notes |
|------|-------|-------|
| "background" | `--background` | Fond principal |
| "surface" | `--card`, `--popover` | Conteneurs, dialogs, sheets |
| "elevated" | `--secondary`, `--muted` | Badges, chips, éléments surélevés |
| "border" | `--border`, `--input`, `--sidebar-border` | Séparateurs |
| "text" | `--foreground`, `--card-foreground`, `--popover-foreground` | Texte principal |
| "text-secondary" | `--muted-foreground` | Texte secondaire |
| "accent" | `--accent` | Doré |

### Dark mode (défaut) — valeurs CSS complètes

```css
.dark {
  --background: 240 6% 4%;          /* #09090b */
  --foreground: 0 0% 98%;           /* #fafafa */

  --card: 240 5% 7%;                /* #111113 */
  --card-foreground: 0 0% 98%;      /* #fafafa */

  --popover: 240 5% 7%;             /* #111113 */
  --popover-foreground: 0 0% 98%;   /* #fafafa */

  --primary: 0 0% 98%;              /* #fafafa — boutons CTA inversés */
  --primary-foreground: 240 6% 4%;  /* #09090b */

  --secondary: 240 4% 10%;          /* #18181b */
  --secondary-foreground: 0 0% 98%; /* #fafafa */

  --muted: 240 4% 10%;              /* #18181b */
  --muted-foreground: 240 4% 46%;   /* #71717a */

  --accent: 45 93% 47%;             /* #eab308 */
  --accent-foreground: 0 0% 100%;   /* #ffffff */

  --destructive: 0 84% 60%;         /* #ef4444 */
  --destructive-foreground: 0 0% 100%;

  --border: 240 4% 16%;             /* #27272a */
  --input: 240 4% 16%;              /* #27272a */
  --ring: 45 93% 47%;               /* #eab308 — focus ring doré */

  --radius: 0.875rem;

  --team-blue: 217 91% 60%;         /* #3b82f6 */
  --team-blue-foreground: 0 0% 100%;
  --team-blue-glow: 217 91% 60% / 0.25;

  --team-red: 0 84% 60%;            /* #ef4444 — inchangé */
  --team-red-foreground: 0 0% 100%;
  --team-red-glow: 0 84% 60% / 0.25;

  --action-scored: 152 69% 45%;     /* #22c55e — inchangé */
  --action-scored-foreground: 0 0% 100%;
  --action-fault: 25 95% 53%;       /* #f97316 — inchangé */
  --action-fault-foreground: 0 0% 100%;

  --action-cta: 0 0% 98%;           /* blanc — aligné avec primary */
  --action-cta-end: 0 0% 90%;

  --court: 142 50% 35%;             /* inchangé */
  --court-line: 0 0% 100%;
  --court-bg: 142 40% 28%;

  --sidebar-background: 240 6% 4%;
  --sidebar-foreground: 0 0% 98%;
  --sidebar-primary: 45 93% 47%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 240 4% 10%;
  --sidebar-accent-foreground: 0 0% 98%;
  --sidebar-border: 240 4% 16%;
  --sidebar-ring: 45 93% 47%;
}
```

### Light mode — valeurs CSS complètes

```css
:root {
  --background: 0 0% 98%;           /* #fafafa */
  --foreground: 240 6% 10%;         /* #18181b */

  --card: 0 0% 100%;                /* #ffffff */
  --card-foreground: 240 6% 10%;

  --popover: 0 0% 100%;
  --popover-foreground: 240 6% 10%;

  --primary: 240 6% 10%;            /* #18181b — boutons CTA inversés */
  --primary-foreground: 0 0% 98%;   /* #fafafa */

  --secondary: 240 5% 96%;          /* #f4f4f5 */
  --secondary-foreground: 240 6% 10%;

  --muted: 240 5% 96%;              /* #f4f4f5 */
  --muted-foreground: 240 4% 46%;   /* #71717a */

  --accent: 46 97% 40%;             /* #a16207 — doré assombri, 4.8:1 contraste */
  --accent-foreground: 0 0% 100%;

  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;

  --border: 240 6% 90%;             /* #e4e4e7 */
  --input: 240 6% 87%;
  --ring: 46 97% 40%;               /* doré */

  --radius: 0.875rem;

  --team-blue: 217 91% 60%;
  --team-blue-foreground: 0 0% 100%;
  --team-blue-glow: 217 91% 60% / 0.25;

  --team-red: 0 84% 60%;
  --team-red-foreground: 0 0% 100%;
  --team-red-glow: 0 84% 60% / 0.25;

  --action-scored: 152 69% 45%;
  --action-scored-foreground: 0 0% 100%;
  --action-fault: 25 95% 53%;
  --action-fault-foreground: 0 0% 100%;

  --action-cta: 240 6% 10%;
  --action-cta-end: 240 6% 20%;

  --court: 142 50% 35%;
  --court-line: 0 0% 100%;
  --court-bg: 142 40% 28%;

  --sidebar-background: 0 0% 96%;
  --sidebar-foreground: 240 6% 10%;
  --sidebar-primary: 46 97% 40%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 240 5% 96%;
  --sidebar-accent-foreground: 240 6% 10%;
  --sidebar-border: 240 6% 87%;
  --sidebar-ring: 46 97% 40%;
}
```

### Couleurs sémantiques — conservation intentionnelle

Les noms `--team-blue` / `--team-red` sont **conservés** (pas renommés en team-a/team-b) pour éviter un refactoring inutile. Les valeurs restent identiques. `--action-fault` reste orange (#f97316), `--action-scored` reste vert (#22c55e) — pas de changement.

### Accessibilité

- `--muted-foreground` (#71717a) sur `--background` (#09090b) donne un ratio de ~4.6:1 → WCAG AA ✓
- Les textes en `--border` color (#27272a) sont **décoratifs uniquement** (chevrons, séparateurs) — jamais de texte lisible
- `--accent` light mode (#a16207) sur fond blanc donne ~4.8:1 → WCAG AA ✓

### Typographie
Conserver **Sora** (headings, letter-spacing -0.02em) + **DM Sans** (body). Renforcer le contraste : bold pour les titres, muted-foreground pour les labels secondaires. `font-variant-numeric: tabular-nums` pour tous les scores.

## 4. Composants UI

### Principe général
Remplacer les **Card wrapping** par des **listes flat avec séparateurs fins** (#18181b dark, #e4e4e7 light). Les conteneurs sont des blocs avec border + border-radius 14px, pas des shadows.

### Liste de matchs
- Chaque match = une row avec séparateur `border-bottom: 1px solid var(--border)`
- Nom des équipes en `--text` (font-weight 500)
- Métadonnées (sport, date) en `--text-faint` (font-size 11px), séparées par `·`
- Score : gagnant en `--text` bold 700, perdant en `--text-muted`. `font-variant-numeric: tabular-nums`
- Match live : score en `--accent`, badge "Live" avec dot pulsant + background `rgba(234,179,8,0.1)` + border `rgba(234,179,8,0.2)`
- Chevron `›` en `--border`, passe en `--text` au hover

### Boutons
| Type | Style |
|------|-------|
| **Primary CTA** | `bg: --text, color: --background` (inversé). border-radius 12px |
| **Secondary** | `border: 1px solid --border, color: --text-secondary`. Transparent |
| **Accent** | `bg: rgba(234,179,8,0.1), color: --accent, border: rgba(234,179,8,0.2)` |
| **Ghost** | `color: --text-muted`. Transparent, pas de bordure |

Pas de gradients. Hover = opacity 0.9. Active = scale 0.98 (80ms).

### Tournois
Même pattern flat list. Badge status : vert translucide (ouvert), gris translucide (terminé), doré translucide (en cours).

### Settings
Sections groupées iOS-style — un seul conteneur avec séparateurs internes. Chaque row : icône (--text-muted) + label (--text-secondary) + valeur/chevron à droite. Toggle switch : track doré quand activé.

## 5. Carte communautaire (Spots)

### Tiles
**CARTO Dark Matter** (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`). Fond navy-noir, routes en gris, labels discrets. Gratuit.

### Markers
- **Spots** : cercle blanc (#fafafa) 36px, border 2px #09090b, emoji sport centré, box-shadow `0 2px 12px rgba(0,0,0,0.5)`
- **Clusters** : cercle blanc 42px, count en font-weight 700 noir
- **Position utilisateur** : point doré (#eab308) 14px, border 3px #09090b, halo pulsant `box-shadow: 0 0 0 6px rgba(234,179,8,0.15)` avec animation pulse 2s

### Top bar
Glass morphism : `background: rgba(9,9,11,0.85); backdrop-filter: blur(12px)`. Bouton retour + barre de recherche. Border-radius 10px, border 1px --border.

**Fallback** : sur les navigateurs sans `backdrop-filter` (anciens Android WebViews), utiliser `background: rgba(9,9,11,0.95)` sans blur.

### Bottom dock
3 boutons glass : recentrer (◎), vue liste (☰), ajouter (+). Le bouton + utilise le style accent (doré translucide).

### Bottom sheet / Sidebar terrain
- Mobile : bottom sheet translucide avec backdrop-blur, slide-up depuis le bas
- Desktop : sidebar 380px à droite
- Contenu : photo carrousel en haut, détails en key-value flat list, badges équipement en `--elevated`, étoiles dorées, avis en flat list
- CTA "Y aller" : bouton primary (blanc)

### Vue liste
Toggle tri : Distance (défaut), Type, Nom. Chips actif = `--elevated` + `--text-muted`, inactif = transparent. Chaque item : emoji sport + nom + métadonnées + étoile dorée.

## 6. Navigation

### Header (fixe)
- Hauteur : 56px
- Gauche : logo mini (28×28) + wordmark "myvolley"
- Droite : avatar initiales (32px circle, --elevated + --border)
- Bordure bottom : `1px solid --border`. Pas de backdrop-blur

### Bottom tab bar
- 5 items : Home (House), Tournois (Trophy), [+] Nouveau match (Plus), Carte (MapPin), Réglages (Settings)
- Icônes **Lucide** stroke-width 1.5, taille 20px
- **Pas de labels**
- Item actif : icône `--foreground` (blanc) + trait indicateur 2px × 20px en haut, border-radius bottom 2px
- Item inactif : icône `--border` (zinc-800)
- Le **[+] central** a la même taille et le même style que les autres — c'est un Plus icon standard Lucide, 22px, couleur `--muted-foreground`. Pas surélevé, pas de fond spécial. Il prend le trait indicateur comme les autres quand actif (ouvre le dialog de création de match)
- Le trait indicateur **slide horizontalement** avec transition 200ms spring quand on change de tab
- Hauteur : ~50px + safe-area bottom padding (`padding-bottom: env(safe-area-inset-bottom)`)
- Background : `--background`, border-top `1px solid --border`

### Page transitions
Crossfade + slide-up 8px, 120ms ease-out. Page sortante fade-out en montant, nouvelle page fade-in depuis en dessous.

### Theme transition
200ms sur `background-color` et `color` à la racine. Le thème est appliqué dans un script bloquant en `<head>` (pas de flash).

## 7. Animations enrichies

| Animation | Spec |
|-----------|------|
| **Score pop** | Scale 1→1.15→1, cubic-bezier(0.34,1.56,0.64,1), 300ms. Flash doré 400ms sur le chiffre après un point |
| **List stagger** | Chaque item : fade-in + translate-y 8px→0, 200ms ease-out, délai +50ms par item |
| **Page transition** | Crossfade + translate-y 8px, 120ms ease-out |
| **Tab indicator** | Transform translateX, 200ms spring (cubic-bezier 0.34,1.56,0.64,1) |
| **Hover rows** | Border-color brightens vers zinc-700, 150ms |
| **Press** | Scale 0.98, 80ms ease-out |
| **Live pulse** | Opacity 1→0.4→1 sur le dot, 2s infinite |
| **User location** | Box-shadow halo pulse 0→8px→0, 2s infinite |
| **Theme switch** | background-color + color, 200ms ease |
| **Bottom sheet** | Transform translate-y, 300ms cubic-bezier(0.32,0.72,0,1) |

## 8. PWA

- Mettre à jour `theme_color` et `background_color` dans le manifest : `#09090b`
- Générer les nouveaux icons PWA (192×192, 512×512) depuis le SVG logo
- Favicon : SVG inline (plus net que PNG à petite taille)

## 9. Toasts & Notifications

Les toasts (Sonner) s'adaptent automatiquement via les tokens shadcn. Ajuster le style Sonner pour matcher :
- `toastOptions.className` : `bg-card border-border text-foreground`
- Success : bordure gauche `--action-scored`
- Error : bordure gauche `--destructive`
- Info : bordure gauche `--accent`

## 10. Hors scope

- Refonte du scoring/match tracking (gameplay) — seulement les couleurs s'adaptent
- Nouvelles fonctionnalités
- Changement de stack technique
- Refonte du data model
