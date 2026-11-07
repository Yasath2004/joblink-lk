// OPTIONAL: use this when you want to send OTP codes through a Sri Lankan SMS gateway
// (instead of Twilio / MessageBird / Vonage, which Supabase supports out of the box).
//
// Supabase Auth calls this function every time it needs to send an OTP ("Send SMS hook").
// 1. Deploy:   supabase functions deploy send-sms --no-verify-jwt
// 2. Secrets:  supabase secrets set SEND_SMS_HOOK_SECRET="v1,whsec_..." SMS_GATEWAY_URL="..." SMS_GATEWAY_KEY="..."
// 3. Dashboard: Authentication > Auth Hooks > Send SMS > HTTPS > URL of this function > generate secret
//    (paste the same secret into SEND_SMS_HOOK_SECRET above), then enable the Phone provider.
//
// Only sendViaGateway() has to be adjusted: copy the URL / parameters from your SMS provider's API docs.
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

async function sendViaGateway(phone: string, message: string) {
  const url = Deno.env.get("SMS_GATEWAY_URL");
  const key = Deno.env.get("SMS_GATEWAY_KEY");
  if (!url || !key) throw new Error("SMS_GATEWAY_URL / SMS_GATEWAY_KEY are not set");

  // EXAMPLE shape only. Change the body / headers to match your provider.
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ to: phone, message }),
  });
  if (!res.ok) throw new Error(`SMS gateway error ${res.status}: ${await res.text()}`);
}

Deno.serve(async (req) => {
  const payload = await req.text();
  const secret = (Deno.env.get("SEND_SMS_HOOK_SECRET") ?? "").replace("v1,whsec_", "");
  try {
    const wh = new Webhook(secret);
    // user.phone looks like "94771234567" (no "+"), sms.otp is the 6-digit code
    const { user, sms } = wh.verify(payload, Object.fromEntries(req.headers)) as any;
    await sendViaGateway(user.phone, `Your JobLink LK code is ${sms.otp}. Do not share it with anyone.`);
    return new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: { http_code: 500, message: String((e as Error).message ?? e) } }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
