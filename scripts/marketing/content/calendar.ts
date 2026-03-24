import { supabase } from "../config";

// ── Types ──────────────────────────────────────────────────
interface ContentRow {
  id: string;
  content_type: string;
  segment: string;
  title: string;
  body: string;
  caption: string;
  hashtags: string[];
  scheduled_at: string;
  status: string;
}

interface ContentGap {
  date: string;
  dayOfWeek: string;
}

// ── Helpers ────────────────────────────────────────────────
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

const DAY_NAMES = [
  "Dimanche", "Lundi", "Mardi", "Mercredi",
  "Jeudi", "Vendredi", "Samedi",
];

// ── Upcoming content ───────────────────────────────────────
export async function getUpcomingContent(
  days: number = 7
): Promise<ContentRow[]> {
  const now = new Date();
  const end = new Date(now);
  end.setDate(end.getDate() + days);

  const { data, error } = await supabase
    .from("marketing_content")
    .select("*")
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", end.toISOString())
    .order("scheduled_at", { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch upcoming content: ${error.message}`);
  }

  return data as ContentRow[];
}

// ── Content gaps ───────────────────────────────────────────
export async function getContentGaps(
  days: number = 14
): Promise<ContentGap[]> {
  const upcoming = await getUpcomingContent(days);

  const scheduledDates = new Set(
    upcoming.map((row) => formatDate(new Date(row.scheduled_at)))
  );

  const gaps: ContentGap[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateStr = formatDate(date);

    if (!scheduledDates.has(dateStr)) {
      gaps.push({
        date: dateStr,
        dayOfWeek: DAY_NAMES[date.getDay()],
      });
    }
  }

  return gaps;
}

// ── Auto-schedule ──────────────────────────────────────────
interface UnscheduledPost {
  content_type: string;
  segment: string;
  title: string;
  body: string;
  caption: string;
  hashtags: string[];
}

export async function autoSchedule(
  posts: UnscheduledPost[],
  startDate: Date
): Promise<void> {
  if (posts.length === 0) return;

  // Build list of available slots: 1-2 posts per day, rotating hours
  const timeSlots = [10, 14]; // 10h and 14h
  const rows: Array<UnscheduledPost & { scheduled_at: string; status: string }> = [];

  let dayOffset = 0;
  let slotIndex = 0;

  for (const post of posts) {
    const scheduledAt = new Date(startDate);
    scheduledAt.setDate(scheduledAt.getDate() + dayOffset);
    scheduledAt.setHours(timeSlots[slotIndex], 0, 0, 0);

    rows.push({
      ...post,
      scheduled_at: scheduledAt.toISOString(),
      status: "draft",
    });

    slotIndex++;
    if (slotIndex >= timeSlots.length) {
      slotIndex = 0;
      dayOffset++;
    }
  }

  const { error } = await supabase.from("marketing_content").insert(rows);

  if (error) {
    throw new Error(`Failed to auto-schedule content: ${error.message}`);
  }

  console.log(
    `Scheduled ${rows.length} posts from ${formatDate(startDate)} to ${formatDate(
      new Date(startDate.getTime() + dayOffset * 86_400_000)
    )}`
  );
}
