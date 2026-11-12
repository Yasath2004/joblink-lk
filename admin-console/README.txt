JobLink LK - Admin console (web)
================================

1. Open config.js and paste your Supabase Project URL + anon public key (same values as the mobile app's .env).
   Never paste the service_role key here.
2. Run it locally:      npx serve .        (then open the address it prints)
   or put this whole folder on Netlify / Cloudflare Pages / Vercel (drag and drop the folder).
3. Sign in with the admin e-mail + password you created in Supabase (see the steps in the chat).

Files
  index.html, app.js, style.css   the console (plain HTML/JS, no build step)
  vendor/supabase.js              supabase-js 2.117.3 (kept inside the folder, no CDN)
  _headers                        security headers for Netlify / Cloudflare Pages
