import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as webpush from "jsr:@negrel/webpush";
import { decodeBase64Url as b64Decode, encodeBase64Url as b64Encode } from "https://deno.land/std@0.224.0/encoding/base64url.ts";

const jsonHeaders = { "Content-Type": "application/json" };

const FRIDAY_VARIANTS = [
    {
        title: "Prêt pour ce week-end ? 🏐",
        body: "Utilise My Volley pour tracker les performances de ton équipe et gagner plus de sets !",
    },
    {
        title: "Match ce week-end ? 🔥",
        body: "N'oublie pas d'enregistrer tes stats pour voir ta progression et affiner ta tactique.",
    },
    {
        title: "Jour de match en approche ! 📊",
        body: "Prépare ton équipe et suis chaque point avec l'analyse IA de My Volley.",
    },
];

function rawKeysToJwk(publicKeyB64: string, privateKeyB64: string) {
    const pubBytes = b64Decode(publicKeyB64);
    const x = b64Encode(pubBytes.slice(1, 33));
    const y = b64Encode(pubBytes.slice(33, 65));
    const d = privateKeyB64;
    return {
        publicKey: { kty: "EC", crv: "P-256", x, y, ext: true, key_ops: [] } as JsonWebKey,
        privateKey: { kty: "EC", crv: "P-256", x, y, d, ext: true, key_ops: ["sign"] } as JsonWebKey,
    };
}

// Simple seeded PRNG based on the current week number
function getVariantForCurrentWeek(): { title: string; body: string } {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const diff = now.getTime() - start.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    const weekNumber = Math.floor(diff / oneWeek);
    return FRIDAY_VARIANTS[weekNumber % FRIDAY_VARIANTS.length];
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204 });

    try {
        const authHeader = req.headers.get("Authorization");
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        const token = authHeader?.replace("Bearer ", "") || "";
        if (token !== serviceRoleKey) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: jsonHeaders });
        }

        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const supabase = createClient(supabaseUrl, serviceRoleKey!);

        const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
        const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

        if (!vapidPublicKey || !vapidPrivateKey) {
            return new Response(JSON.stringify({ error: "VAPID keys not configured" }), { status: 500, headers: jsonHeaders });
        }

        const jwks = rawKeysToJwk(vapidPublicKey, vapidPrivateKey);
        const vapidKeys = await webpush.importVapidKeys(jwks, { extractable: false });

        const appServer = await webpush.ApplicationServer.new({
            contactInformation: "mailto:antonin.marcon@gmail.com",
            vapidKeys,
        });

        // Fetch all subscriptions
        const { data: subscriptions, error } = await supabase
            .from("push_subscriptions")
            .select("*");

        if (error) throw new Error(`DB query error: ${error.message}`);

        let sent = 0;
        let failed = 0;
        const errors: string[] = [];
        const message = getVariantForCurrentWeek();

        for (const sub of subscriptions || []) {
            try {
                const pushSubscription = {
                    endpoint: sub.endpoint,
                    keys: {
                        auth: sub.auth_key,
                        p256dh: sub.p256dh_key,
                    },
                };

                const subscriber = await appServer.subscribe(pushSubscription);

                const payload = JSON.stringify({
                    title: message.title,
                    body: message.body,
                    tag: "friday-weekend-push",
                });

                await subscriber.pushTextMessage(payload, {});
                sent++;
            } catch (pushErr: any) {
                failed++;
                const errMsg = pushErr?.message || String(pushErr);
                errors.push(`${sub.endpoint.slice(-20)}: ${errMsg}`);

                if (errMsg.includes("410") || errMsg.includes("Gone")) {
                    await supabase.from("push_subscriptions").delete().eq("id", sub.id);
                }
            }
        }

        return new Response(JSON.stringify({ success: true, sent, failed, errors: errors.slice(0, 5) }), { headers: jsonHeaders });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message || "Unknown error" }), { status: 500, headers: jsonHeaders });
    }
});
