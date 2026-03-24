import { type Segment, APP_URL, APP_FEATURES } from "../config";

// ── Types ───────────────────────────────────────────────────

type Platform = "instagram" | "tiktok";

export type MessageTemplate = {
  id: string;
  segment: Segment;
  platform: Platform;
  subject: string;
  message: string;
  variables: string[];
};

interface Interaction {
  template_id?: string;
  type?: string;
  sent_at?: string;
}

// ── Templates ───────────────────────────────────────────────

export const TEMPLATES: MessageTemplate[] = [
  // ─── Player — Instagram ─────────────────────────────────
  {
    id: "player-ig-discovery",
    segment: "player",
    platform: "instagram",
    subject: "Découverte carte des terrains",
    message:
      `Salut {{name}} ! 🏐\n\n` +
      `Tu cherches un terrain de volley près de chez toi ? ` +
      `On a référencé des centaines de terrains en France (indoor, beach, extérieur) sur une carte interactive.\n\n` +
      `Jette un œil → ${APP_FEATURES.map}\n\n` +
      `Si tu connais un terrain qui manque, tu peux l'ajouter directement !`,
    variables: ["name"],
  },
  {
    id: "player-ig-performance",
    segment: "player",
    platform: "instagram",
    subject: "Suivi stats et heatmaps",
    message:
      `Hey {{name}} ! 👋\n\n` +
      `Tu veux suivre tes stats de match en détail ? ` +
      `My Volley te donne des heatmaps, un suivi point par point et une analyse IA de tes performances.\n\n` +
      `Essaie gratuitement → ${APP_URL}\n\n` +
      `Dis-moi si tu as des questions, je suis dispo !`,
    variables: ["name"],
  },
  {
    id: "player-ig-community",
    segment: "player",
    platform: "instagram",
    subject: "Rejoindre la communauté",
    message:
      `Salut {{name}} !\n\n` +
      `On construit la première app complète pour les volleyeurs en France : ` +
      `carte des terrains, scoring en live, stats détaillées et tournois.\n\n` +
      `Rejoins la communauté → ${APP_URL}\n\n` +
      `On est déjà {{community_size}} à l'utiliser, ça serait cool de t'y retrouver 🤙`,
    variables: ["name", "community_size"],
  },

  // ─── Player — TikTok ────────────────────────────────────
  {
    id: "player-tt-discovery",
    segment: "player",
    platform: "tiktok",
    subject: "Découverte carte des terrains",
    message:
      `yo {{name}} ! t'as déjà galéré à trouver un terrain de volley ? 😅\n\n` +
      `on a fait une carte avec tous les terrains de France (beach, indoor, extérieur)\n\n` +
      `check ça → ${APP_FEATURES.map}`,
    variables: ["name"],
  },
  {
    id: "player-tt-performance",
    segment: "player",
    platform: "tiktok",
    subject: "Suivi stats et heatmaps",
    message:
      `{{name}} tes stats de volley méritent mieux qu'un carnet 📊\n\n` +
      `heatmaps, analyse IA, suivi de perf… tout est dans l'app\n\n` +
      `teste gratos → ${APP_URL}`,
    variables: ["name"],
  },
  {
    id: "player-tt-community",
    segment: "player",
    platform: "tiktok",
    subject: "Rejoindre la communauté",
    message:
      `{{name}} on est en train de construire LA app pour le volley en France 🏐\n\n` +
      `carte des terrains + stats + tournois, tout dedans\n\n` +
      `viens voir → ${APP_URL}`,
    variables: ["name"],
  },

  // ─── Coach — Instagram ──────────────────────────────────
  {
    id: "coach-ig-scouting",
    segment: "coach",
    platform: "instagram",
    subject: "Analyse performances joueurs",
    message:
      `Bonjour {{name}},\n\n` +
      `En tant qu'entraîneur, vous cherchez sûrement à analyser finement les performances de vos joueurs. ` +
      `My Volley propose des heatmaps de match et une analyse IA qui identifie les axes de progression.\n\n` +
      `Découvrir l'outil → ${APP_URL}\n\n` +
      `Je serais ravi d'échanger sur vos besoins si vous avez 5 min.`,
    variables: ["name"],
  },
  {
    id: "coach-ig-organization",
    segment: "coach",
    platform: "instagram",
    subject: "Gestion matchs et stats",
    message:
      `Bonjour {{name}},\n\n` +
      `Gérer les matchs, scorer en live et retrouver les stats après coup — ` +
      `c'est ce que My Volley fait pour les coachs de volley.\n\n` +
      `Exports Excel inclus pour partager avec votre staff.\n\n` +
      `Tester → ${APP_URL}`,
    variables: ["name"],
  },
  {
    id: "coach-ig-tournaments",
    segment: "coach",
    platform: "instagram",
    subject: "Organisation tournois",
    message:
      `Bonjour {{name}},\n\n` +
      `Vous organisez des tournois ? My Volley gère les poules, ` +
      `les phases éliminatoires et les classements automatiquement.\n\n` +
      `Plus besoin de tableurs → ${APP_FEATURES.tournament}\n\n` +
      `N'hésitez pas si vous avez des questions !`,
    variables: ["name"],
  },

  // ─── Coach — TikTok ─────────────────────────────────────
  {
    id: "coach-tt-scouting",
    segment: "coach",
    platform: "tiktok",
    subject: "Analyse performances joueurs",
    message:
      `{{name}} tu coaches du volley ? 🏐\n\n` +
      `on a une app avec heatmaps + analyse IA pour décortiquer les matchs de tes joueurs\n\n` +
      `regarde → ${APP_URL}`,
    variables: ["name"],
  },
  {
    id: "coach-tt-organization",
    segment: "coach",
    platform: "tiktok",
    subject: "Gestion matchs et stats",
    message:
      `{{name}} scorer tes matchs à la main c'est fini 📋\n\n` +
      `stats en live, heatmaps, export Excel — tout dans une app\n\n` +
      `essaie → ${APP_URL}`,
    variables: ["name"],
  },
  {
    id: "coach-tt-tournaments",
    segment: "coach",
    platform: "tiktok",
    subject: "Organisation tournois",
    message:
      `{{name}} organiser un tournoi sans galère c'est possible 🏆\n\n` +
      `poules, élimination, classements auto — zéro tableur\n\n` +
      `check → ${APP_FEATURES.tournament}`,
    variables: ["name"],
  },

  // ─── Club — Instagram ───────────────────────────────────
  {
    id: "club-ig-visibility",
    segment: "club",
    platform: "instagram",
    subject: "Référencement sur la carte",
    message:
      `Bonjour {{name}},\n\n` +
      `Des centaines de joueurs utilisent My Volley pour trouver où jouer près de chez eux. ` +
      `Référencez {{club_name}} sur notre carte interactive pour gagner en visibilité.\n\n` +
      `Voir la carte → ${APP_FEATURES.map}\n\n` +
      `C'est gratuit et ça prend 2 minutes !`,
    variables: ["name", "club_name"],
  },
  {
    id: "club-ig-events",
    segment: "club",
    platform: "instagram",
    subject: "Gestion tournois en ligne",
    message:
      `Bonjour {{name}},\n\n` +
      `{{club_name}} organise des tournois ? ` +
      `Avec My Volley, créez vos événements en ligne : poules, matchs, classements, stats — tout est automatisé.\n\n` +
      `Découvrir → ${APP_FEATURES.tournament}\n\n` +
      `Je peux vous faire une démo rapide si ça vous intéresse.`,
    variables: ["name", "club_name"],
  },
  {
    id: "club-ig-growth",
    segment: "club",
    platform: "instagram",
    subject: "Développer la communauté du club",
    message:
      `Bonjour {{name}},\n\n` +
      `My Volley aide les clubs comme {{club_name}} à fidéliser leurs joueurs : ` +
      `suivi des matchs, stats individuelles, tournois internes.\n\n` +
      `Vos adhérents vont adorer → ${APP_URL}\n\n` +
      `On en discute ?`,
    variables: ["name", "club_name"],
  },

  // ─── Club — TikTok ──────────────────────────────────────
  {
    id: "club-tt-visibility",
    segment: "club",
    platform: "tiktok",
    subject: "Référencement sur la carte",
    message:
      `{{name}} mettez {{club_name}} sur la carte du volley français 📍\n\n` +
      `des joueurs cherchent des clubs près de chez eux tous les jours sur My Volley\n\n` +
      `c'est gratuit → ${APP_FEATURES.map}`,
    variables: ["name", "club_name"],
  },
  {
    id: "club-tt-events",
    segment: "club",
    platform: "tiktok",
    subject: "Gestion tournois en ligne",
    message:
      `{{club_name}} organise des tournois ? 🏆\n\n` +
      `poules + matchs + classements en automatique, zéro prise de tête\n\n` +
      `testez → ${APP_FEATURES.tournament}`,
    variables: ["name", "club_name"],
  },
  {
    id: "club-tt-growth",
    segment: "club",
    platform: "tiktok",
    subject: "Développer la communauté du club",
    message:
      `{{name}} envie de booster {{club_name}} ? 🚀\n\n` +
      `stats, tournois, suivi des joueurs — tout dans une app pour vos adhérents\n\n` +
      `découvrez → ${APP_URL}`,
    variables: ["name", "club_name"],
  },
];

// ── Template renderer ───────────────────────────────────────

export function renderTemplate(
  templateId: string,
  variables: Record<string, string>
): string {
  const template = TEMPLATES.find((t) => t.id === templateId);
  if (!template) throw new Error(`Template "${templateId}" not found`);

  let rendered = template.message;
  for (const key of template.variables) {
    const value = variables[key];
    if (value === undefined) {
      throw new Error(
        `Missing variable "{{${key}}}" for template "${templateId}"`
      );
    }
    rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }

  return rendered;
}

// ── Template selector ───────────────────────────────────────

/**
 * Picks the best template for a contact based on segment, platform,
 * and prior interactions. Avoids resending the same template.
 */
export function selectTemplate(
  segment: Segment,
  platform: Platform,
  contactHistory: Interaction[] = []
): MessageTemplate {
  const candidates = TEMPLATES.filter(
    (t) => t.segment === segment && t.platform === platform
  );

  if (candidates.length === 0) {
    throw new Error(
      `No templates found for segment="${segment}", platform="${platform}"`
    );
  }

  const usedIds = new Set(
    contactHistory
      .filter((i) => i.template_id)
      .map((i) => i.template_id!)
  );

  const unused = candidates.filter((t) => !usedIds.has(t.id));

  // If all templates have been used, cycle back to the first one
  return unused.length > 0 ? unused[0] : candidates[0];
}

// ── Utilities ───────────────────────────────────────────────

/** Returns all templates for a given segment. */
export function getTemplatesForSegment(segment: Segment): MessageTemplate[] {
  return TEMPLATES.filter((t) => t.segment === segment);
}

/** Returns all template IDs, useful for validation. */
export function getTemplateIds(): string[] {
  return TEMPLATES.map((t) => t.id);
}
