import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import {
  GEMINI_API_KEY,
  CONTENT_MODEL,
  SEGMENTS,
  CONTENT_TYPES,
  POSTS_PER_WEEK,
  supabase,
  type Segment,
  type ContentType,
} from "../config";

// ── Types ──────────────────────────────────────────────────
interface GeneratedPost {
  title: string;
  body: string;
  caption: string;
  hashtags: string[];
}

interface ScheduledPost extends GeneratedPost {
  contentType: ContentType;
  segment: Segment;
  scheduledAt: string;
}

// ── Gemini API ─────────────────────────────────────────────
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${CONTENT_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

async function callGemini(prompt: string): Promise<string> {
  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.9,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${err}`);
  }

  const data = await res.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini");
  return text;
}

// ── Template loading ───────────────────────────────────────
const TEMPLATE_DIR = join(__dirname, "templates");

const TEMPLATE_FILES: Record<ContentType, string> = {
  tip: "tip.md",
  feature_showcase: "feature-showcase.md",
  stats_highlight: "stats-highlight.md",
  behind_the_scenes: "behind-the-scenes.md",
  community: "community.md",
};

function loadTemplate(contentType: ContentType): string {
  const filePath = join(TEMPLATE_DIR, TEMPLATE_FILES[contentType]);
  return readFileSync(filePath, "utf-8");
}

// ── Content generation ─────────────────────────────────────
export async function generatePost(
  contentType: ContentType,
  segment: Segment,
  context?: string
): Promise<GeneratedPost> {
  const template = loadTemplate(contentType);
  const segmentConfig = SEGMENTS[segment];

  const prompt = `Tu es un community manager expert en volleyball et en réseaux sociaux (Instagram, TikTok).
Tu écris TOUJOURS en français.

Segment cible : ${segmentConfig.label}
Type de contenu : ${contentType.replace(/_/g, " ")}
Hashtags du segment : ${segmentConfig.hashtags.join(" ")}
${context ? `Contexte supplémentaire : ${context}` : ""}

Voici le template markdown à remplir. Remplace chaque variable {{...}} par du contenu engageant.
Le caption (texte court pour les réseaux) doit faire MOINS de 300 caractères.
Utilise des emojis pertinents pour le volleyball et le sport.
Sois dynamique, motivant, et adapté à la culture volley française.

Template :
${template}

Réponds UNIQUEMENT en JSON valide avec ce format :
{
  "title": "titre du post",
  "body": "le template rempli (markdown complet)",
  "caption": "texte court < 300 chars pour Instagram/TikTok",
  "hashtags": ["liste", "des", "hashtags"]
}`;

  const text = await callGemini(prompt);

  // Gemini wraps JSON in ```json ... ``` — extract the block
  const codeBlockMatch = text.match(/```json\s*([\s\S]*?)```/);
  const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();

  try {
    return JSON.parse(jsonStr) as GeneratedPost;
  } catch {
    // Fallback: try to find any JSON object
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Failed to parse Gemini response as JSON: ${text.slice(0, 200)}...`);
    }
    return JSON.parse(jsonMatch[0]) as GeneratedPost;
  }
}

// ── Weekly calendar generation ─────────────────────────────
export async function generateWeeklyCalendar(
  weekStartDate: Date
): Promise<ScheduledPost[]> {
  const segments = Object.keys(SEGMENTS) as Segment[];
  const posts: ScheduledPost[] = [];

  for (let i = 0; i < POSTS_PER_WEEK; i++) {
    const contentType = CONTENT_TYPES[i % CONTENT_TYPES.length];
    const segment = segments[i % segments.length];

    const scheduledAt = new Date(weekStartDate);
    scheduledAt.setDate(scheduledAt.getDate() + Math.floor((i * 7) / POSTS_PER_WEEK));
    scheduledAt.setHours(10 + (i % 3) * 4, 0, 0, 0); // 10h, 14h, 18h rotation

    const generated = await generatePost(contentType, segment);

    posts.push({
      ...generated,
      contentType,
      segment,
      scheduledAt: scheduledAt.toISOString(),
    });
  }

  return posts;
}

// ── Persistence ────────────────────────────────────────────
export async function saveGeneratedContent(
  posts: ScheduledPost[]
): Promise<void> {
  const rows = posts.map((post) => ({
    content_type: post.contentType,
    segment: post.segment,
    title: post.title,
    body: post.body,
    caption: `${post.caption}\n\n${post.hashtags.join(" ")}`,
    scheduled_at: post.scheduledAt,
    status: "scheduled",
    platform: "both",
  }));

  const { error } = await supabase.from("marketing_content").insert(rows);

  if (error) {
    throw new Error(`Failed to save content: ${error.message}`);
  }

  console.log(`Saved ${posts.length} posts to marketing_content`);
}
