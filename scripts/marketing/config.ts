import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.marketing from project root
config({ path: resolve(__dirname, "../../.env.marketing") });
// Also load main .env for VITE_SUPABASE_URL fallback
config({ path: resolve(__dirname, "../../.env") });

// ── Supabase ────────────────────────────────────────────────
const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
    "Create .env.marketing with:\n" +
    "  SUPABASE_URL=https://xxx.supabase.co\n" +
    "  SUPABASE_SERVICE_ROLE_KEY=eyJ...\n" +
    "  GEMINI_API_KEY=AIza..."
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// ── Gemini ──────────────────────────────────────────────────
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
export const CONTENT_MODEL = "gemini-2.5-flash";

// ── Segments ────────────────────────────────────────────────
export type Segment = "player" | "coach" | "club";

export const SEGMENTS: Record<Segment, { label: string; hashtags: string[] }> = {
  player: {
    label: "Joueur",
    hashtags: [
      "#volleyball", "#volleyballfrance", "#beachvolley",
      "#volley", "#volleylife", "#volleyballplayer",
    ],
  },
  coach: {
    label: "Coach / Entraîneur",
    hashtags: [
      "#coachvolley", "#volleycoach", "#entraineurvolley",
      "#tactiquevolley", "#volleyballcoach",
    ],
  },
  club: {
    label: "Club",
    hashtags: [
      "#clubvolley", "#ffvb", "#ligueaVolley",
      "#proavolley", "#probvolley", "#volleyclubfrance",
    ],
  },
};

// ── App URLs & Assets ───────────────────────────────────────
export const APP_URL = "https://my-volley.vercel.app";
export const APP_FEATURES = {
  map: `${APP_URL}/spots`,
  tournament: `${APP_URL}/tournaments`,
  match: `${APP_URL}`,
} as const;

// ── Content calendar ────────────────────────────────────────
export const POSTS_PER_WEEK = 5;
export const CONTENT_TYPES = ["tip", "feature_showcase", "stats_highlight", "behind_the_scenes", "community"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

// ── Scraper settings ────────────────────────────────────────
export const SCRAPER = {
  maxProfilesPerRun: 30,
  delayBetweenPages: 3000, // ms — stay polite
  headless: true,
};

// ── Meta Graph API ──────────────────────────────────────────
export const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
export const META_PAGE_ID = process.env.META_PAGE_ID;
export const META_IG_USER_ID = process.env.META_IG_USER_ID;

// ── TikTok API ──────────────────────────────────────────────
export const TIKTOK_ACCESS_TOKEN = process.env.TIKTOK_ACCESS_TOKEN;
