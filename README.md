# 🏐 Netpoint Tracker

**Application de scouting et de statistiques sportives pour le volleyball et le basketball.**

> Conçue pour les clubs amateurs qui veulent des outils de niveau professionnel.

[![Live App](https://img.shields.io/badge/Live-my--volley.com-blue)](https://www.my-volley.com)

---

## 🎯 Features for Coaches & Scouts

Netpoint Tracker is designed to bridge the gap between amateur recording and professional scouting:

- **Multi-Sport Logic**: Specialized scoring for Volleyball (sets, rotations, service tracking) and Basketball (1, 2, 3 points zones).
- **Visual Scouting**: Clickable court interface to record exact ball impact locations.
- **Player-Specific Data**: Attribute every action (Ace, Attack, Block, Fault) to a specific roster member.
- **Tactical Heatmaps**: Built-in visual analytics to identify weak zones and opponent patterns.
- **Professional Exports**: Generate multi-sheet Excel reports for post-match debriefing.
- **AI-Powered Analysis**: Get tactical insights and performance summaries powered by AI.
- **Cloud Sync**: Matches sync to the cloud when logged in. Works offline as a PWA.

---

## 📊 Fonctionnalités détaillées

### Volleyball
- Comptage des points avec suivi du service
- Actions : Ace, Attaque, Block, Bidouille, Seconde main
- Fautes : Out, Filet, Service loupé, Block Out
- Gestion des sets avec inversion automatique des côtés

### Basketball
- Gestion des paniers à 1 (lancer franc), 2 et 3 points selon la zone du terrain
- Suivi des tirs manqués, pertes de balle et fautes commises
- Gestion des quart-temps

### Analyse & Export
- Statistiques individuelles par joueur avec efficacité
- Heatmap interactive des zones d'impact
- Export PNG des statistiques et du terrain
- Export Excel structuré avec un onglet par set/QT et résumé global
- Partage du score via WhatsApp, Telegram, X

### Technologie
- **PWA** (Progressive Web App) fonctionnant sans connexion après installation
- Authentification Google, Apple et email/mot de passe
- Synchronisation cloud des matchs entre appareils
- Analyse IA des performances (nécessite connexion)

---

## 🛠 Stack technique

- [React](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) + [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)
- [Tailwind CSS](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/)
- [Supabase](https://supabase.com/) (Auth, Database, Edge Functions)
- [Lovable AI Gateway](https://docs.lovable.dev/features/ai) (Analyse tactique)

---

## 🚀 Getting Started

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to the project directory
cd netpoint-tracker

# Install dependencies
npm i

# Start the development server
npm run dev
```

---

## 📄 License

Made with ❤️ by [Volleyball Capbreton](https://www.my-volley.com)
