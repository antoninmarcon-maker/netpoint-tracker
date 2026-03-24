import { POSTS_PER_WEEK } from "./config";
import { generateWeeklyCalendar, saveGeneratedContent } from "./content/generator";
import { getContentGaps, getUpcomingContent } from "./content/calendar";
import { getStats } from "./crm/contacts";
import { scrapeVolleyballContacts } from "./outreach/scraper";
import { publishScheduledContent, updateEngagementMetrics } from "./outreach/publisher";

// ── CLI ─────────────────────────────────────────────────────
const COMMANDS = {
  all: "Run full pipeline: generate → schedule → publish → scrape",
  generate: "Generate content for the week",
  publish: "Publish due scheduled content",
  scrape: "Scrape new volleyball contacts from Instagram",
  metrics: "Update engagement metrics on published content",
  status: "Show CRM stats and content pipeline status",
} as const;

type Command = keyof typeof COMMANDS;

function printUsage() {
  console.log("\nMy Volley — Marketing Automation\n");
  console.log("Usage: bun run scripts/marketing/run.ts <command>\n");
  console.log("Commands:");
  for (const [cmd, desc] of Object.entries(COMMANDS)) {
    console.log(`  ${cmd.padEnd(12)} ${desc}`);
  }
  console.log();
}

// ── Commands ────────────────────────────────────────────────
async function runGenerate() {
  console.log("\n=== Content Generation ===\n");

  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);

  console.log(`Generating ${POSTS_PER_WEEK} posts for week of ${monday.toISOString().slice(0, 10)}...`);
  const posts = await generateWeeklyCalendar(monday);

  console.log(`Generated ${posts.length} posts. Saving to DB...`);
  await saveGeneratedContent(posts);

  console.log("Done!\n");
}

async function runPublish() {
  console.log("\n=== Content Publishing ===\n");
  const results = await publishScheduledContent();

  const success = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`\nResults: ${success} published, ${failed} failed.`);
}

async function runScrape() {
  console.log("\n=== Contact Scraping ===\n");
  const { total, saved } = await scrapeVolleyballContacts();
  console.log(`Found ${total} profiles, saved ${saved} new contacts.`);
}

async function runMetrics() {
  console.log("\n=== Engagement Metrics ===\n");
  await updateEngagementMetrics();
  console.log("Done!");
}

async function runStatus() {
  console.log("\n=== Pipeline Status ===\n");

  // CRM stats
  const stats = await getStats();
  console.log("CRM Contacts:");
  console.log(`  Total: ${stats.total}`);
  console.log(`  By segment: ${Object.entries(stats.bySegment).map(([k, v]) => `${k}=${v}`).join(", ") || "none"}`);
  console.log(`  By status: ${Object.entries(stats.byStatus).map(([k, v]) => `${k}=${v}`).join(", ") || "none"}`);

  // Content pipeline
  const upcoming = await getUpcomingContent(7);
  const gaps = await getContentGaps();

  console.log(`\nContent Pipeline:`);
  console.log(`  Upcoming (7 days): ${upcoming.length} posts`);
  console.log(`  Content gaps: ${gaps.length} days without content`);

  if (upcoming.length > 0) {
    console.log("\n  Upcoming posts:");
    for (const post of upcoming.slice(0, 5)) {
      const date = new Date(post.scheduled_at).toLocaleDateString("fr-FR");
      console.log(`    ${date} | ${post.content_type} | ${post.segment} | "${post.title}"`);
    }
  }

  console.log();
}

async function runAll() {
  await runGenerate();
  await runPublish();
  await runScrape();
  await runMetrics();
  await runStatus();
}

// ── Main ────────────────────────────────────────────────────
const command = process.argv[2] as Command | undefined;

if (!command || !(command in COMMANDS)) {
  printUsage();
  process.exit(command ? 1 : 0);
}

const runners: Record<Command, () => Promise<void>> = {
  all: runAll,
  generate: runGenerate,
  publish: runPublish,
  scrape: runScrape,
  metrics: runMetrics,
  status: runStatus,
};

runners[command]().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
