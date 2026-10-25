import { Category } from "./mockData";
import { supabase } from "../lib/supabase";
import { currentUserId, uploadImage } from "./jobsApi";
import { timeAgo } from "./util";

export interface Profile {
  id: string;
  role: "worker" | "employer" | null;
  fullName: string;
  location?: string;
  bio?: string;
  skills: Category[];
  years: number;
  avatarUrl?: string;
  joined?: string;
}

function toProfile(r: any): Profile {
  return {
    id: r.id,
    role: r.role,
    fullName: r.full_name || "",
    location: r.location ?? undefined,
    bio: r.bio ?? undefined,
    skills: (r.skills ?? []) as Category[],
    years: r.years_experience ?? 0,
    avatarUrl: r.avatar_url ?? undefined,
    joined: r.created_at ?? undefined,
  };
}

export async function fetchMyProfile(): Promise<Profile | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
  return data ? toProfile(data) : null;
}

export async function updateMyProfile(patch: {
  location?: string;
  bio?: string;
  skills?: string[];
  years?: number;
  avatar?: { uri: string; mimeType?: string | null } | null;
}) {
  const uid = await currentUserId();
  if (!uid) throw new Error("Please log in first");
  const row: Record<string, any> = {};
  if (patch.location !== undefined) row.location = patch.location.trim();
  if (patch.bio !== undefined) row.bio = patch.bio.trim();
  if (patch.skills !== undefined) row.skills = patch.skills;
  if (patch.years !== undefined) row.years_experience = patch.years;
  if (patch.avatar) row.avatar_url = await uploadImage("avatars", patch.avatar.uri, patch.avatar.mimeType);
  if (!Object.keys(row).length) return;
  const { error } = await supabase.from("profiles").update(row).eq("id", uid);
  if (error) throw new Error(error.message);
}

export async function fetchUserRating(userId: string): Promise<{ rating: number; reviews: number }> {
  const { data } = await supabase.from("user_ratings").select("*").eq("user_id", userId).maybeSingle();
  return { rating: data ? Number(data.avg_rating) : 0, reviews: data?.review_count ?? 0 };
}

export interface ReviewItem {
  id: string;
  name: string;
  rating: number;
  date: string;
  text: string;
}

export async function fetchReviews(userId: string): Promise<ReviewItem[]> {
  const { data } = await supabase
    .from("reviews")
    .select("id, rating, comment, created_at, reviewer:profiles!reviews_reviewer_id_fkey(full_name)")
    .eq("reviewee_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.reviewer?.full_name || "User",
    rating: r.rating,
    date: timeAgo(r.created_at),
    text: r.comment || "",
  }));
}

export interface ProfileStats {
  workerAccepted: number; // jobs a worker got accepted for
  employerPosted: number; // jobs an employer posted
  employerHired: number; // accepted applications on an employer's jobs
}

export async function fetchStats(userId: string): Promise<ProfileStats> {
  const [a, p, h] = await Promise.all([
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("worker_id", userId).eq("status", "accepted"),
    supabase.from("jobs").select("id", { count: "exact", head: true }).eq("employer_id", userId),
    supabase
      .from("applications")
      .select("id, job:jobs!applications_job_id_fkey!inner(employer_id)", { count: "exact", head: true })
      .eq("status", "accepted")
      .eq("job.employer_id", userId),
  ]);
  return { workerAccepted: a.count ?? 0, employerPosted: p.count ?? 0, employerHired: h.count ?? 0 };
}

export async function submitReview(jobId: string, revieweeId: string, rating: number, comment: string) {
  const uid = await currentUserId();
  if (!uid) throw new Error("Please log in first");
  const { error } = await supabase.from("reviews").insert({
    job_id: jobId,
    reviewer_id: uid,
    reviewee_id: revieweeId,
    rating,
    comment: comment.trim() || null,
  });
  if (error) {
    if (/duplicate key/i.test(error.message)) throw new Error("You already rated this job.");
    throw new Error(error.message);
  }
}

export async function fetchProfileById(userId: string): Promise<Profile | null> {
  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return data ? toProfile(data) : null;
}

// How many jobs this worker has been accepted for (works for any worker, not only my own)
export async function fetchAcceptedCount(userId: string): Promise<number> {
  const { data } = await supabase.rpc("accepted_jobs_count", { p_user: userId });
  return typeof data === "number" ? data : 0;
}
