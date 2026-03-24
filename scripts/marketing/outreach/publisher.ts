import {
  supabase,
  META_ACCESS_TOKEN,
  META_IG_USER_ID,
  TIKTOK_ACCESS_TOKEN,
} from "../config";

// ── Types ───────────────────────────────────────────────────
interface ContentPost {
  id: string;
  title: string;
  caption: string;
  media_url?: string;
  platform: "instagram" | "tiktok" | "both";
}

interface PublishResult {
  platform: string;
  success: boolean;
  postId?: string;
  error?: string;
}

// ── Instagram Publishing (Meta Graph API) ───────────────────
// Requires: Instagram Business Account + Facebook Page
// Setup: https://developers.facebook.com/docs/instagram-api/getting-started

async function publishToInstagram(post: ContentPost): Promise<PublishResult> {
  if (!META_ACCESS_TOKEN || !META_IG_USER_ID) {
    return { platform: "instagram", success: false, error: "Meta API credentials not configured" };
  }

  try {
    // Step 1: Create media container
    const containerUrl = `https://graph.facebook.com/v19.0/${META_IG_USER_ID}/media`;
    const containerParams: Record<string, string> = {
      caption: post.caption,
      access_token: META_ACCESS_TOKEN,
    };

    if (post.media_url) {
      containerParams.image_url = post.media_url;
    } else {
      // Text-only posts aren't supported on IG — need at least an image
      return { platform: "instagram", success: false, error: "Instagram requires an image or video" };
    }

    const containerRes = await fetch(containerUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(containerParams),
    });
    const containerData = await containerRes.json() as { id?: string; error?: { message: string } };

    if (!containerData.id) {
      return { platform: "instagram", success: false, error: containerData.error?.message ?? "Container creation failed" };
    }

    // Step 2: Publish the container
    const publishUrl = `https://graph.facebook.com/v19.0/${META_IG_USER_ID}/media_publish`;
    const publishRes = await fetch(publishUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creation_id: containerData.id,
        access_token: META_ACCESS_TOKEN,
      }),
    });
    const publishData = await publishRes.json() as { id?: string; error?: { message: string } };

    if (!publishData.id) {
      return { platform: "instagram", success: false, error: publishData.error?.message ?? "Publish failed" };
    }

    return { platform: "instagram", success: true, postId: publishData.id };
  } catch (err) {
    return { platform: "instagram", success: false, error: String(err) };
  }
}

// ── TikTok Publishing (Content Posting API) ─────────────────
// Requires: TikTok Developer Account + Content Posting API access
// Setup: https://developers.tiktok.com/doc/content-posting-api-get-started

async function publishToTikTok(post: ContentPost): Promise<PublishResult> {
  if (!TIKTOK_ACCESS_TOKEN) {
    return { platform: "tiktok", success: false, error: "TikTok API credentials not configured" };
  }

  try {
    // TikTok Content Posting API — direct post (requires video URL)
    if (!post.media_url) {
      return { platform: "tiktok", success: false, error: "TikTok requires a video URL" };
    }

    const res = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TIKTOK_ACCESS_TOKEN}`,
        "Content-Type": "application/json; charset=UTF-8",
      },
      body: JSON.stringify({
        post_info: {
          title: post.caption.slice(0, 150),
          privacy_level: "PUBLIC_TO_EVERYONE",
          disable_duet: false,
          disable_comment: false,
          disable_stitch: false,
        },
        source_info: {
          source: "PULL_FROM_URL",
          video_url: post.media_url,
        },
      }),
    });

    const data = await res.json() as {
      data?: { publish_id: string };
      error?: { code: string; message: string };
    };

    if (data.error) {
      return { platform: "tiktok", success: false, error: data.error.message };
    }

    return { platform: "tiktok", success: true, postId: data.data?.publish_id };
  } catch (err) {
    return { platform: "tiktok", success: false, error: String(err) };
  }
}

// ── Publish scheduled content ───────────────────────────────
export async function publishScheduledContent(): Promise<PublishResult[]> {
  const now = new Date().toISOString();

  // Get content that's scheduled and due
  const { data: posts, error } = await supabase
    .from("marketing_content")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true });

  if (error || !posts?.length) {
    console.log(error ? `Error: ${error.message}` : "No content due for publishing.");
    return [];
  }

  console.log(`Publishing ${posts.length} scheduled post(s)...\n`);

  const results: PublishResult[] = [];

  for (const post of posts) {
    const contentPost: ContentPost = {
      id: post.id,
      title: post.title,
      caption: post.caption ?? post.body,
      media_url: post.media_url,
      platform: post.platform ?? "both",
    };

    console.log(`  Publishing: "${post.title}" → ${contentPost.platform}`);

    if (contentPost.platform === "instagram" || contentPost.platform === "both") {
      const igResult = await publishToInstagram(contentPost);
      results.push(igResult);
      console.log(`    Instagram: ${igResult.success ? "OK" : igResult.error}`);
    }

    if (contentPost.platform === "tiktok" || contentPost.platform === "both") {
      const ttResult = await publishToTikTok(contentPost);
      results.push(ttResult);
      console.log(`    TikTok: ${ttResult.success ? "OK" : ttResult.error}`);
    }

    // Update status in DB
    const anySuccess = results.some((r) => r.success);
    await supabase
      .from("marketing_content")
      .update({
        status: anySuccess ? "published" : "draft",
        published_at: anySuccess ? now : null,
      })
      .eq("id", post.id);
  }

  return results;
}

// ── Fetch engagement metrics ────────────────────────────────
export async function updateEngagementMetrics(): Promise<void> {
  if (!META_ACCESS_TOKEN) {
    console.log("Meta API not configured — skipping metrics update.");
    return;
  }

  const { data: published } = await supabase
    .from("marketing_content")
    .select("id, title")
    .eq("status", "published")
    .not("published_at", "is", null);

  if (!published?.length) return;

  console.log(`Updating metrics for ${published.length} published posts...`);
  // Note: Full implementation would query Meta Graph API /media/{id}/insights
  // and TikTok /v2/video/query for each published post.
  // This is a placeholder for the actual API integration.
}

// ── Run standalone ──────────────────────────────────────────
const isMainModule = process.argv[1] && import.meta.url.endsWith(process.argv[1].split("/").pop()!);
if (isMainModule) {
  publishScheduledContent()
    .then((results) => {
      const success = results.filter((r) => r.success).length;
      console.log(`\nDone: ${success}/${results.length} published successfully.`);
    })
    .catch(console.error);
}
