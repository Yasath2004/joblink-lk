import { isSupabaseConfigured, supabase } from "./supabase";
import { unregisterPush } from "./push";

export type Role = "worker" | "employer";

const NOT_CONFIGURED = "Supabase is not configured (.env missing)";

// ---------- phone numbers ----------
// Sri Lankan mobile: 07X XXX XXXX  ->  +947XXXXXXXX (the format Supabase / SMS gateways need)
export function toE164(input: string): string | null {
  const s = input.replace(/[\s-]/g, "");
  if (/^07\d{8}$/.test(s)) return "+94" + s.slice(1);
  if (/^\+947\d{8}$/.test(s)) return s;
  if (/^947\d{8}$/.test(s)) return "+" + s;
  return null;
}

export const isLkMobile = (input: string) => toE164(input) !== null;

// +94771234567 -> "+94 77 123 4567"
export function formatPhone(input: string): string {
  const e = toE164(input);
  if (!e) return input;
  const d = e.slice(1);
  return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
}

// ---------- session / role ----------
export async function getMyRole(): Promise<Role | null> {
  if (!isSupabaseConfigured) return null;
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data } = await supabase.from("profiles").select("role").eq("id", u.user.id).maybeSingle();
  return (data?.role as Role) ?? null;
}

// Is someone already logged in (saved session)? Used by the splash screen.
export async function getSessionRole(): Promise<Role | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  return getMyRole();
}

// ---------- OTP login ----------
function friendlyOtpError(msg: string): string {
  if (/signups? not allowed|user not found/i.test(msg)) return "No account found for this number. Please sign up first.";
  if (/rate limit|only request this (after|once)|security purposes|too many/i.test(msg))
    return "Please wait a minute before asking for another code.";
  if (/phone.*(provider|disabled|not enabled)|unsupported phone|sms.*(fail|provider)|twilio|messagebird|vonage|hook/i.test(msg))
    return "The SMS could not be sent. Please check the Phone / SMS provider settings in Supabase.";
  if (/invalid.*phone|phone.*invalid/i.test(msg)) return "That phone number does not look right.";
  return msg;
}

// Step 1: send a 6-digit code by SMS. mode "login" only works for existing accounts.
export async function sendOtp(phone: string, mode: "login" | "register"): Promise<{ error?: string }> {
  if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };
  const e164 = toE164(phone);
  if (!e164) return { error: "Enter a valid mobile number (07X XXX XXXX)" };
  const { error } = await supabase.auth.signInWithOtp({
    phone: e164,
    options: { shouldCreateUser: mode === "register", channel: "sms" },
  });
  return error ? { error: friendlyOtpError(error.message) } : {};
}

// Step 2: check the code. On success the user is logged in; role is null for a brand new account.
export async function verifyOtp(phone: string, code: string): Promise<{ error?: string; role?: Role | null }> {
  const e164 = toE164(phone);
  if (!e164) return { error: "Enter a valid mobile number (07X XXX XXXX)" };
  const { data, error } = await supabase.auth.verifyOtp({ phone: e164, token: code.trim(), type: "sms" });
  if (error || !data.session) {
    const msg = error?.message ?? "";
    return { error: /expired|invalid/i.test(msg) || !msg ? "That code is wrong or has expired. Please try again." : msg };
  }
  return { role: await getMyRole() };
}

// First login of a new account: create its profile (name + role)
export async function createProfile(name: string, role: Role) {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Please log in first");
  const { error } = await supabase.from("profiles").upsert({ id: data.user.id, role, full_name: name.trim() });
  if (error) throw new Error(error.message);
}

export async function signOut() {
  await supabase.auth.signOut();
}

// Log out and go back to the role-selection screen (clears the whole navigation history).
export async function logoutAndReset(navigation: any) {
  await unregisterPush(); // this phone stops receiving this user's notifications
  await signOut();
  let nav = navigation;
  while (nav.getParent?.()) nav = nav.getParent();
  nav.reset({ index: 0, routes: [{ name: "RoleSelect" }] });
}
