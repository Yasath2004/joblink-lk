import { Category, Job, PostedJob } from "./mockData";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import { timeAgo } from "./util";

const BUCKET = "job-images";

// ---------- helpers ---------------------------------------------------------
export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

// Upload a local image (from the image picker) to a public bucket, returns its URL.
export async function uploadImage(
  bucket: "job-images" | "avatars",
  uri: string,
  mimeType?: string | null
): Promise<string> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Please log in first");
  const mime = mimeType || "image/jpeg";
  const ext = mime.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  const path = `${uid}/${Date.now()}.${ext}`;
  const buf = await (await fetch(uri)).arrayBuffer();
  const up = await supabase.storage.from(bucket).upload(path, buf, { contentType: mime });
  if (up.error) throw new Error("Photo upload failed: " + up.error.message);
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export function rowToJob(r: any): Job {
  const emp = r.employer;
  return {
    id: r.id,
    title: r.title,
    category: r.category as Category,
    pay: Number(r.pay),
    payType: r.pay_type,
    location: r.location,
    distanceKm: 0,
    postedAgo: timeAgo(r.created_at),
    rating: 0,
    urgent: !!r.urgent,
    date: r.job_date
      ? new Date(r.job_date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
      : undefined,
    time: r.job_time ? String(r.job_time).slice(0, 5) : undefined,
    description: r.description,
    imageUrl: r.image_url ?? undefined,
    employerId: r.employer_id,
    workersNeeded: r.workers_needed ?? 1,
    filled: r.positions_filled ?? 0,
    rawDate: r.job_date ?? undefined,
    rawTime: r.job_time ? String(r.job_time).slice(0, 5) : undefined,
    lat: r.lat ?? null,
    lng: r.lng ?? null,
    employer: emp
      ? { name: emp.full_name || "Employer", rating: 0, reviews: 0, avatarUrl: emp.avatar_url ?? undefined }
      : undefined,
  };
}

const JOB_SELECT = "*, employer:profiles!jobs_employer_id_fkey(full_name, avatar_url)";

// ---------- jobs ------------------------------------------------------------
export async function fetchJobs(): Promise<Job[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from("jobs")
    .select(JOB_SELECT)
    .eq("status", "active")
    .order("urgent", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.warn("fetchJobs:", error.message);
    return [];
  }
  return (data ?? []).map(rowToJob);
}

export async function fetchMyJobs(): Promise<PostedJob[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const { data, error } = await supabase
    .from("jobs")
    .select(JOB_SELECT + ", applications(count)")
    .eq("employer_id", uid)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("fetchMyJobs:", error.message);
    return [];
  }
  return (data ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    category: r.category as Category,
    status: r.status,
    postedAgo: timeAgo(r.created_at),
    pay: Number(r.pay),
    applicants: r.applications?.[0]?.count ?? 0,
    imageUrl: r.image_url ?? undefined,
    job: rowToJob(r),
  }));
}

const two = (n: number) => String(n).padStart(2, "0");

export interface NewJob {
  title: string;
  category: string;
  description: string;
  pay: number;
  payType: string; // "Fixed" | "Per day" | "Per trip"
  location: string;
  date: Date | null;
  time: Date | null;
  urgent?: boolean;
  workersNeeded?: number;
  lat?: number | null;
  lng?: number | null;
  image?: { uri: string; mimeType?: string | null } | null;
}

export async function createJob(job: NewJob) {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured (.env missing)");
  const uid = await currentUserId();
  if (!uid) throw new Error("Please log in first.");

  const image_url = job.image ? await uploadImage(BUCKET, job.image.uri, job.image.mimeType) : null;
  const d = job.date;
  const t = job.time;
  const { error } = await supabase.from("jobs").insert({
    employer_id: uid,
    title: job.title.trim(),
    category: job.category,
    description: job.description.trim(),
    pay: job.pay,
    pay_type: job.payType.toLowerCase(),
    location: job.location.trim(),
    job_date: d ? `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}` : null,
    job_time: t ? `${two(t.getHours())}:${two(t.getMinutes())}` : null,
    urgent: !!job.urgent,
    workers_needed: Math.max(1, Math.min(100, job.workersNeeded ?? 1)),
    lat: job.lat ?? null,
    lng: job.lng ?? null,
    image_url,
  });
  if (error) throw new Error(error.message);
}

export async function setJobStatus(jobId: string, status: "active" | "closed" | "draft") {
  const { error } = await supabase.from("jobs").update({ status }).eq("id", jobId);
  if (error) throw new Error(error.message);
}

// ---------- applications (worker side) --------------------------------------
export type AppStatus = "pending" | "accepted" | "rejected";

// My application status for one job (null = I have not applied)
export async function getApplicationStatus(jobId: string): Promise<AppStatus | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const { data } = await supabase
    .from("applications")
    .select("status")
    .eq("job_id", jobId)
    .eq("worker_id", uid)
    .maybeSingle();
  return (data?.status as AppStatus) ?? null;
}

// My application status for every job I applied to: { jobId: status }
export async function fetchMyApplicationStatuses(): Promise<Record<string, AppStatus>> {
  const uid = await currentUserId();
  if (!uid) return {};
  const { data } = await supabase.from("applications").select("job_id, status").eq("worker_id", uid);
  const map: Record<string, AppStatus> = {};
  (data ?? []).forEach((a: any) => (map[a.job_id] = a.status));
  return map;
}

export async function applyToJob(jobId: string) {
  const uid = await currentUserId();
  if (!uid) throw new Error("Please log in first.");
  const { error } = await supabase.from("applications").insert({ job_id: jobId, worker_id: uid });
  if (error) {
    if (/duplicate key/i.test(error.message)) throw new Error("You already applied for this job.");
    throw new Error(error.message);
  }
}

export interface MyApplication {
  id: string;
  status: "Pending" | "Accepted" | "Declined";
  appliedAgo: string;
  employerName: string;
  job: Job;
}

const STATUS_LABEL: Record<string, MyApplication["status"]> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Declined",
};

export async function fetchMyApplications(): Promise<MyApplication[]> {
  const uid = await currentUserId();
  if (!uid) return [];
  const { data, error } = await supabase
    .from("applications")
    .select(`id, status, created_at, job:jobs!applications_job_id_fkey(${JOB_SELECT})`)
    .eq("worker_id", uid)
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("fetchMyApplications:", error.message);
    return [];
  }
  return (data ?? [])
    .filter((a: any) => a.job)
    .map((a: any) => {
      const job = rowToJob(a.job);
      return {
        id: a.id,
        status: STATUS_LABEL[a.status] ?? "Pending",
        appliedAgo: timeAgo(a.created_at),
        employerName: job.employer?.name ?? "Employer",
        job,
      };
    });
}

// ---------- applicants (employer side) --------------------------------------
export interface Applicant {
  applicationId: string;
  workerId: string;
  name: string;
  avatarUrl?: string;
  bio: string;
  skills: Category[];
  years: number;
  location?: string;
  rating: number;
  reviews: number;
  appliedAgo: string;
  status: "pending" | "accepted" | "rejected";
}

export async function fetchApplicants(jobId: string): Promise<Applicant[]> {
  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, status, created_at, worker:profiles!applications_worker_id_fkey(id, full_name, bio, skills, years_experience, location, avatar_url)"
    )
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("fetchApplicants:", error.message);
    return [];
  }
  const rows = (data ?? []).filter((a: any) => a.worker);
  const ids = rows.map((a: any) => a.worker.id);
  const ratings: Record<string, { avg: number; n: number }> = {};
  if (ids.length) {
    const { data: rs } = await supabase.from("user_ratings").select("*").in("user_id", ids);
    (rs ?? []).forEach((r: any) => (ratings[r.user_id] = { avg: Number(r.avg_rating), n: r.review_count }));
  }
  return rows.map((a: any) => ({
    applicationId: a.id,
    workerId: a.worker.id,
    name: a.worker.full_name || "Worker",
    avatarUrl: a.worker.avatar_url ?? undefined,
    bio: a.worker.bio || "",
    skills: (a.worker.skills ?? []) as Category[],
    years: a.worker.years_experience ?? 0,
    location: a.worker.location ?? undefined,
    rating: ratings[a.worker.id]?.avg ?? 0,
    reviews: ratings[a.worker.id]?.n ?? 0,
    appliedAgo: timeAgo(a.created_at),
    status: a.status,
  }));
}

export async function decideApplication(applicationId: string, status: "accepted" | "rejected") {
  const { error } = await supabase.from("applications").update({ status }).eq("id", applicationId);
  if (error) throw new Error(error.message);
}

// Latest status of one job (e.g. the database closes it automatically when all positions are filled)
export async function fetchJobStatus(jobId: string): Promise<string | null> {
  const { data } = await supabase.from("jobs").select("status").eq("id", jobId).maybeSingle();
  return data?.status ?? null;
}

// Edit an existing job. imageAction: "keep" the current photo, "remove" it, or "replace" it with job.image.
export async function updateJob(id: string, job: NewJob, imageAction: "keep" | "remove" | "replace") {
  const d = job.date;
  const t = job.time;
  const row: Record<string, any> = {
    title: job.title.trim(),
    category: job.category,
    description: job.description.trim(),
    pay: job.pay,
    pay_type: job.payType.toLowerCase(),
    location: job.location.trim(),
    job_date: d ? `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}` : null,
    job_time: t ? `${two(t.getHours())}:${two(t.getMinutes())}` : null,
    urgent: !!job.urgent,
    workers_needed: Math.max(1, Math.min(100, job.workersNeeded ?? 1)),
    lat: job.lat ?? null,
    lng: job.lng ?? null,
  };
  if (imageAction === "replace" && job.image) row.image_url = await uploadImage(BUCKET, job.image.uri, job.image.mimeType);
  if (imageAction === "remove") row.image_url = null;
  const { error } = await supabase.from("jobs").update(row).eq("id", id);
  if (error) {
    if (/jobs_filled_le_needed/.test(error.message)) throw new Error("Workers needed cannot be less than the workers already hired.");
    throw new Error(error.message);
  }
}

export async function fetchJobById(jobId: string): Promise<{ job: Job; status: string } | null> {
  const { data } = await supabase.from("jobs").select(JOB_SELECT).eq("id", jobId).maybeSingle();
  return data ? { job: rowToJob(data), status: data.status } : null;
}

export interface MarketStats {
  openJobs: number;
  urgentJobs: number;
  avgPay: number;
  openPositions: number;
}

// Live numbers for the Home screen, computed by the database (null if the SQL function is missing)
export async function fetchMarketStats(): Promise<MarketStats | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.rpc("job_market_stats");
  if (error || !data) return null;
  return {
    openJobs: Number(data.open_jobs ?? 0),
    urgentJobs: Number(data.urgent_jobs ?? 0),
    avgPay: Number(data.avg_pay ?? 0),
    openPositions: Number(data.open_positions ?? 0),
  };
}
