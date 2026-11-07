import { useEffect } from "react";
import { Platform } from "react-native";
import { supabase } from "../lib/supabase";
import { Notifications, openFromNotification, registerForPush, startLiveAlerts } from "../lib/push";

// Invisible component: registers this phone for push notifications after login, shows live alerts in Expo Go,
// and opens the right screen when a notification is tapped.
export default function PushSetup({ navRef }: { navRef: any }) {
  useEffect(() => {
    if (Platform.OS === "web") return;

    let stopLive: (() => void) | undefined;
    let currentUid: string | null = null;

    const apply = (uid: string | null) => {
      if (uid === currentUid) return; // the auth event fires again on token refresh / app focus
      currentUid = uid;
      stopLive?.();
      stopLive = undefined;
      if (uid) {
        registerForPush();
        stopLive = startLiveAlerts(uid);
      }
    };

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => apply(session?.user.id ?? null));

    // Tapping a notification
    const handled = new Set<string>();
    const open = (resp: any) => {
      const id = resp?.notification?.request?.identifier;
      if (!resp || (id && handled.has(id))) return;
      if (id) handled.add(id);
      const data = resp.notification.request.content.data;
      const title = resp.notification.request.content.title;
      let tries = 0;
      const go = () => {
        if (navRef.isReady()) openFromNotification(navRef, data, title);
        else if (tries++ < 10) setTimeout(go, 500); // app is still starting
      };
      go();
    };
    const respSub = Notifications.addNotificationResponseReceivedListener(open);
    Notifications.getLastNotificationResponseAsync().then((r) => r && open(r)); // app was opened by a tap

    return () => {
      sub.subscription.unsubscribe();
      respSub.remove();
      stopLive?.();
    };
  }, [navRef]);

  return null;
}
