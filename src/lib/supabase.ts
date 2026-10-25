import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

// Clean the URL: keep only "https://PROJECT.supabase.co" (removes quotes, spaces,
// a trailing "/" or a pasted path such as "/rest/v1/" which causes
// "Invalid path specified in request URL").
function cleanUrl(raw: string) {
  const v = raw.trim().replace(/^["']|["']$/g, "");
  if (!v) return "";
  try {
    return new URL(v).origin;
  } catch {
    return v;
  }
}

const url = cleanUrl(process.env.EXPO_PUBLIC_SUPABASE_URL ?? "");
const key = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "").trim().replace(/^["']|["']$/g, "");

export const isSupabaseConfigured = !!url && !!key;

// createClient throws on an empty URL, so use placeholders when .env is missing
// (the app still runs with mock data in that case).
export const supabase = createClient(url || "http://localhost", key || "anon", {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
