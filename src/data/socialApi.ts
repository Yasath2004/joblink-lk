import { supabase } from "../lib/supabase";
import { currentUserId } from "./jobsApi";
import { shortTime, timeAgo } from "./util";

// ---------- notifications ---------------------------------------------------
export interface NotificationItem {
  id: string;
  type: "application" | "accepted" | "rejected" | "message" | "info";
  title: string;
  body: string;
  time: string;
  unread: boolean;
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.warn("fetchNotifications:", error.message);
    return [];
  }
  return (data ?? []).map((n: any) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    time: timeAgo(n.created_at),
    unread: !n.read,
  }));
}

export async function markAllNotificationsRead() {
  const uid = await currentUserId();
  if (!uid) return;
  await supabase.from("notifications").update({ read: true }).eq("user_id", uid).eq("read", false);
}

export async function unreadNotificationCount(): Promise<number> {
  const uid = await currentUserId();
  if (!uid) return 0;
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", uid)
    .eq("read", false);
  return count ?? 0;
}

// ---------- chat ------------------------------------------------------------
export interface ConversationItem {
  id: string;
  otherId: string;
  name: string;
  avatarUrl?: string;
  lastMessage: string;
  time: string;
  unread: number;
}

// Finds the chat between the logged-in user and `otherId`, creating it if needed.
export async function getOrCreateConversation(otherId: string): Promise<string> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Please log in first");
  if (uid === otherId) throw new Error("You can't message yourself");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", uid).maybeSingle();
  const employer_id = me?.role === "employer" ? uid : otherId;
  const worker_id = me?.role === "employer" ? otherId : uid;

  const existing = await supabase
    .from("conversations")
    .select("id")
    .eq("employer_id", employer_id)
    .eq("worker_id", worker_id)
    .maybeSingle();
  if (existing.data) return existing.data.id;

  const { data, error } = await supabase
    .from("conversations")
    .insert({ employer_id, worker_id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function fetchConversations(): Promise<ConversationItem[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const { data, error } = await supabase
    .from("conversations")
    .select(
      "id, employer_id, worker_id, last_message, last_message_at, employer:profiles!conversations_employer_id_fkey(full_name, avatar_url), worker:profiles!conversations_worker_id_fkey(full_name, avatar_url)"
    )
    .order("last_message_at", { ascending: false });
  if (error) {
    console.warn("fetchConversations:", error.message);
    return [];
  }
  const { data: unreadRows } = await supabase
    .from("messages")
    .select("conversation_id")
    .is("read_at", null)
    .neq("sender_id", uid);
  const unread: Record<string, number> = {};
  (unreadRows ?? []).forEach((m: any) => (unread[m.conversation_id] = (unread[m.conversation_id] ?? 0) + 1));

  return (data ?? [])
    .filter((c: any) => c.last_message) // hide chats with no messages yet
    .map((c: any) => {
      const iAmEmployer = c.employer_id === uid;
      const other = iAmEmployer ? c.worker : c.employer;
      return {
        id: c.id,
        otherId: iAmEmployer ? c.worker_id : c.employer_id,
        name: other?.full_name || "User",
        avatarUrl: other?.avatar_url ?? undefined,
        lastMessage: c.last_message,
        time: shortTime(c.last_message_at),
        unread: unread[c.id] ?? 0,
      };
    });
}

export interface ChatMsg {
  id: string;
  text: string;
  fromMe: boolean;
  time: string;
}

function toMsg(m: any, uid: string): ChatMsg {
  return { id: m.id, text: m.body, fromMe: m.sender_id === uid, time: shortTime(m.created_at) };
}

export async function fetchMessages(conversationId: string): Promise<ChatMsg[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((m: any) => toMsg(m, uid));
}

export async function sendMessage(conversationId: string, body: string): Promise<ChatMsg> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Please log in first");
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: uid, body: body.trim() })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return toMsg(data, uid);
}

export async function markConversationRead(conversationId: string) {
  const uid = await currentUserId();
  if (!uid) return;
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .is("read_at", null)
    .neq("sender_id", uid);
}

// Live updates: calls onNew for every new message in this conversation. Returns an unsubscribe fn.
export async function subscribeToMessages(conversationId: string, onNew: (m: ChatMsg) => void) {
  const uid = await currentUserId();
  const channel = supabase
    .channel(`chat-${conversationId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
      (payload) => uid && onNew(toMsg(payload.new, uid))
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
