// This edge function is no longer needed — Supabase built-in emails handle auth emails directly.
// Custom email templates should be configured in Supabase Dashboard > Authentication > Email Templates.
//
// This file is kept as a stub so existing webhook configuration doesn't cause errors.
// You can safely remove the webhook from Supabase Dashboard > Authentication > Hooks
// and then delete this function entirely.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Return success so the webhook doesn't block auth flows during transition
  return new Response(
    JSON.stringify({ message: 'Email hook deprecated — using Supabase built-in emails' }),
    { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
