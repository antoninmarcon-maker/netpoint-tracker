import { chromium, type Page } from "playwright";
import { supabase, SEGMENTS, SCRAPER, type Segment } from "../config";

// ── Types ───────────────────────────────────────────────────
interface ScrapedProfile {
  handle_ig: string;
  name: string;
  bio: string;
  followers_count: number;
  city?: string;
  segment: Segment;
  source: string;
}

// ── Segment detection from bio ──────────────────────────────
const SEGMENT_KEYWORDS: Record<Segment, RegExp[]> = {
  club: [
    /club/i, /association/i, /comit[ée]/i, /ligue/i, /ffvb/i,
    /volleyball\s*club/i, /vc\b/i, /avb\b/i,
  ],
  coach: [
    /coach/i, /entra[iî]neur/i, /formateur/i, /staff/i,
    /pr[ée]parateur/i, /directeur\s*(technique|sportif)/i,
  ],
  player: [
    /joueu[rs]e?/i, /volleyball/i, /volley/i, /beach/i,
    /opposite/i, /libero/i, /setter/i, /passeu[rs]/i,
    /central/i, /r[ée]ceptionneur/i, /pointu/i, /attaquant/i,
  ],
};

function detectSegment(bio: string): Segment {
  const scores: Record<Segment, number> = { club: 0, coach: 0, player: 0 };

  for (const [segment, patterns] of Object.entries(SEGMENT_KEYWORDS)) {
    for (const pattern of patterns) {
      if (pattern.test(bio)) scores[segment as Segment]++;
    }
  }

  const best = Object.entries(scores).sort(([, a], [, b]) => b - a)[0];
  return best[1] > 0 ? (best[0] as Segment) : "player";
}

// ── Extract city from bio ───────────────────────────────────
const FRENCH_CITIES = [
  "paris", "marseille", "lyon", "toulouse", "nice", "nantes",
  "montpellier", "strasbourg", "bordeaux", "lille", "rennes",
  "reims", "toulon", "grenoble", "dijon", "angers", "nîmes",
  "clermont", "tours", "limoges", "amiens", "perpignan",
  "brest", "metz", "besançon", "orléans", "rouen", "caen",
  "mulhouse", "nancy", "argenteuil", "poitiers", "dunkerque",
];

function extractCity(bio: string): string | undefined {
  const lower = bio.toLowerCase();
  return FRENCH_CITIES.find((city) => lower.includes(city));
}

// ── Scrape profiles from hashtag page ───────────────────────
async function scrapeHashtagProfiles(
  page: Page,
  hashtag: string,
  segment: Segment,
  maxProfiles: number
): Promise<ScrapedProfile[]> {
  const profiles: ScrapedProfile[] = [];
  const tag = hashtag.replace("#", "");
  const url = `https://www.instagram.com/explore/tags/${tag}/`;

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 15000 });
    await page.waitForTimeout(2000);

    // Get post links from the hashtag page
    const postLinks = await page.$$eval(
      'a[href*="/p/"]',
      (links) => links.map((a) => a.getAttribute("href")).filter(Boolean).slice(0, 20)
    );

    for (const postLink of postLinks.slice(0, maxProfiles)) {
      try {
        await page.goto(`https://www.instagram.com${postLink}`, {
          waitUntil: "networkidle",
          timeout: 10000,
        });
        await page.waitForTimeout(SCRAPER.delayBetweenPages);

        // Get the profile link from the post
        const profileHandle = await page.$eval(
          'header a[href*="/"]',
          (el) => el.getAttribute("href")?.replace(/\//g, "") ?? ""
        ).catch(() => "");

        if (!profileHandle) continue;

        // Visit the profile
        await page.goto(`https://www.instagram.com/${profileHandle}/`, {
          waitUntil: "networkidle",
          timeout: 10000,
        });
        await page.waitForTimeout(SCRAPER.delayBetweenPages);

        const profileData = await page.$$eval("header *", (elements) => {
          let name = "";
          let bio = "";
          let followers = "0";

          for (const el of elements) {
            const tag = el.tagName.toLowerCase();
            const text = el.textContent?.trim() ?? "";
            if ((tag === "h1" || tag === "h2") && !name) name = text;
            if (tag === "span" && text.includes("follower")) {
              const prev = el.previousElementSibling;
              if (prev) followers = prev.getAttribute("title") ?? prev.textContent ?? "0";
            }
          }

          const bioEl = document.querySelector("header section div span:not([class])");
          if (bioEl) bio = bioEl.textContent?.trim() ?? "";

          return { name, bio, followers };
        });

        const followersCount = parseInt(
          profileData.followers.replace(/[^\d]/g, ""),
          10
        ) || 0;

        const detectedSegment = detectSegment(profileData.bio);

        profiles.push({
          handle_ig: profileHandle,
          name: profileData.name || profileHandle,
          bio: profileData.bio,
          followers_count: followersCount,
          city: extractCity(profileData.bio),
          segment: detectedSegment,
          source: `hashtag:${tag}`,
        });

        console.log(`  [+] ${profileHandle} → ${detectedSegment} (${followersCount} followers)`);
      } catch {
        // Skip individual profile errors silently
      }
    }
  } catch (err) {
    console.error(`  [!] Failed to scrape hashtag ${hashtag}:`, err);
  }

  return profiles;
}

// ── Save profiles to Supabase ───────────────────────────────
async function saveProfiles(profiles: ScrapedProfile[]): Promise<number> {
  let saved = 0;

  for (const profile of profiles) {
    // Skip if already exists
    const { data: existing } = await supabase
      .from("marketing_contacts")
      .select("id")
      .eq("handle_ig", profile.handle_ig)
      .maybeSingle();

    if (existing) continue;

    const { error } = await supabase.from("marketing_contacts").insert({
      name: profile.name,
      handle_ig: profile.handle_ig,
      segment: profile.segment,
      source: profile.source,
      bio: profile.bio,
      city: profile.city,
      followers_count: profile.followers_count,
      status: "new",
    });

    if (!error) saved++;
  }

  return saved;
}

// ── Main scraper ────────────────────────────────────────────
export async function scrapeVolleyballContacts(
  targetSegments?: Segment[]
): Promise<{ total: number; saved: number }> {
  const segments = targetSegments ?? (Object.keys(SEGMENTS) as Segment[]);
  const allProfiles: ScrapedProfile[] = [];

  console.log("Starting volleyball contact scraper...\n");

  const browser = await chromium.launch({ headless: SCRAPER.headless });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "fr-FR",
  });
  const page = await context.newPage();

  try {
    for (const segment of segments) {
      const { hashtags, label } = SEGMENTS[segment];
      console.log(`\nSegment: ${label}`);

      for (const hashtag of hashtags.slice(0, 3)) {
        console.log(`  Scraping ${hashtag}...`);

        const profilesPerHashtag = Math.ceil(
          SCRAPER.maxProfilesPerRun / (segments.length * 3)
        );

        const profiles = await scrapeHashtagProfiles(
          page,
          hashtag,
          segment,
          profilesPerHashtag
        );
        allProfiles.push(...profiles);
      }
    }
  } finally {
    await browser.close();
  }

  // Deduplicate by handle
  const unique = new Map<string, ScrapedProfile>();
  for (const p of allProfiles) {
    if (!unique.has(p.handle_ig)) unique.set(p.handle_ig, p);
  }

  const uniqueProfiles = [...unique.values()];
  console.log(`\nFound ${uniqueProfiles.length} unique profiles`);

  const saved = await saveProfiles(uniqueProfiles);
  console.log(`Saved ${saved} new contacts to CRM\n`);

  return { total: uniqueProfiles.length, saved };
}

// ── Run standalone ──────────────────────────────────────────
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop()!);
if (isMainModule) {
  scrapeVolleyballContacts()
    .then(({ total, saved }) => {
      console.log(`Done: ${total} found, ${saved} saved.`);
    })
    .catch(console.error);
}
