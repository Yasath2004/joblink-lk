import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { supabase } from "./supabase";

const isWeb = Platform.OS === "web";
const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Real (remote) push needs a physical phone and a development / production build.
// Expo Go on Android cannot receive remote pushes (SDK 53+), and the web cannot either.
export const remotePushAvailable = !isWeb && Device.isDevice && !(inExpoGo && Platform.OS === "android");

if (!isWeb) {
  // Show alerts even while the app is open
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

let lastToken: string | null = null;

async function ensureChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "JobLink",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#14B8A6",
  });
}

async function ensurePermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status === "granted") return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.status === "granted";
}

// Ask permission, get this phone's Expo push token and save it in the database for the logged-in user
export async function registerForPush(): Promise<string | null> {
  if (!remotePushAvailable) return null;
  try {
    await ensureChannel();
    if (!(await ensurePermission())) return null;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn("Push: no EAS projectId found. Run `eas init` once so it is added to app.json.");
      return null;
    }
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    const { error } = await supabase.rpc("register_push_token", { p_token: token, p_platform: Platform.OS });
    if (error) throw error;
    lastToken = token;
    return token;
  } catch (e) {
    console.warn("Push registration failed:", e);
    return null;
  }
}

// Called on log out
export async function unregisterPush() {
  if (!lastToken) return;
  try {
    await supabase.rpc("remove_push_token", { p_token: lastToken });
  } catch {}
  lastToken = null;
}

async function showLocal(title: string, body: string, data: Record<string, any>) {
  await Notifications.scheduleNotificationAsync({ content: { title, body, data, sound: true }, trigger: null });
}

// Fallback for Expo Go / emulators (no remote push): while the app is open, listen to the database live and
// show a normal phone notification for every new notification or chat message.
export function startLiveAlerts(uid: string): () => void {
  if (isWeb || remotePushAvailable) return () => {};
  ensureChannel().then(ensurePermission).catch(() => {});

  const channel = supabase
    .channel(`live-alerts-${uid}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${uid}` },
      (p: any) => showLocal(p.new.title, p.new.body, { type: p.new.type }).catch(() => {})
    )
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, async (p: any) => {
      if (p.new.sender_id === uid) return; // my own message
      const { data } = await supabase
        .from("profiles")
        .select("full_name, business_name")
        .eq("id", p.new.sender_id)
        .maybeSingle();
      showLocal(data?.business_name || data?.full_name || "New message", String(p.new.body).slice(0, 120), {
        type: "message",
        conversationId: p.new.conversation_id,
      }).catch(() => {});
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// What to open when the user taps a notification
export function openFromNotification(nav: any, data: any, title?: string | null) {
  if (data?.type === "message" && data.conversationId) {
    nav.navigate("Chat", { conversationId: data.conversationId, name: title || "Chat" });
  } else {
    nav.navigate("Notifications");
  }
}

export { Notifications };
