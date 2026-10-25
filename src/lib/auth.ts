import { isSupabaseConfigured, supabase } from "./supabase";

export type Role = "worker" | "employer";

// Supabase phone login needs an SMS provider, so we sign in with phone + password
// by mapping the phone number to a fake email. Turn OFF "Confirm email" in Supabase.
const phoneToEmail = (phone: string) => `${phone.replace(/\s/g, "")}@joblink.lk`;

const NOT_CONFIGURED = "Supabase is not configured (.env missing)";

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

export async function signIn(
  phone: string,
  password: string
): Promise<{ error?: string; role?: Role | null }> {
  if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };
  const { error } = await supabase.auth.signInWithPassword({
    email: phoneToEmail(phone),
    password,
  });
  if (error) {
    return {
      error: /invalid login credentials/i.test(error.message)
        ? "Incorrect phone number or password"
        : error.message,
    };
  }
  return { role: await getMyRole() };
}

export async function register(opts: {
  name: string;
  phone: string;
  password: string;
  role: Role;
}): Promise<{ error?: string }> {
  if (!isSupabaseConfigured) return { error: NOT_CONFIGURED };
  const { data, error } = await supabase.auth.signUp({
    email: phoneToEmail(opts.phone),
    password: opts.password,
  });
  if (error) {
    return {
      error: /already registered/i.test(error.message)
        ? "This phone number is already registered. Please log in."
        : error.message,
    };
  }
  if (!data.session || !data.user) {
    return { error: "Turn off 'Confirm email' in Supabase (Authentication > Providers > Email)" };
  }
  const { error: pErr } = await supabase.from("profiles").upsert({
    id: data.user.id,
    role: opts.role,
    full_name: opts.name.trim(),
  });
  if (pErr) return { error: pErr.message };
  return {};
}

export async function signOut() {
  await supabase.auth.signOut();
}

// Log out and go back to the role-selection screen (clears the whole navigation history).
export async function logoutAndReset(navigation: any) {
  await signOut();
  let nav = navigation;
  while (nav.getParent?.()) nav = nav.getParent();
  nav.reset({ index: 0, routes: [{ name: "RoleSelect" }] });
}
