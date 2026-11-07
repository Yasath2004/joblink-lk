import { supabase } from "../lib/supabase";
import { currentUserId } from "./jobsApi";

export type VerifyStatus = "unverified" | "pending" | "verified" | "rejected";

export interface ProgressItem {
  key: string;
  label: string;
  weight: number;
  done: boolean;
}

export interface Progress {
  percent: number;
  status: VerifyStatus;
  role: "worker" | "employer" | null;
  reviewNote: string | null;
  items: ProgressItem[];
}

// Profile completion % and checklist, calculated by the database (different list for workers / employers)
export async function fetchProgress(): Promise<Progress | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const { data, error } = await supabase.rpc("my_profile_progress");
  if (error || !data) return null;
  return {
    percent: Number(data.percent ?? 0),
    status: (data.status ?? "unverified") as VerifyStatus,
    role: data.role ?? null,
    reviewNote: data.review_note ?? null,
    items: (data.items ?? []) as ProgressItem[],
  };
}

// Which wizard step fixes a checklist item
export const STEP_OF: Record<string, number> = {
  photo: 0,
  location: 0,
  skills: 0,
  bio: 0,
  availability: 0,
  business_name: 0,
  business_type: 0,
  about: 0,
  email: 1,
  nic: 1,
  emergency: 1,
  address: 1,
  docs: 2,
};

// ---------- private details (only the owner can read these) ----------
export interface PrivateInfo {
  email?: string | null;
  nicNumber?: string | null;
  dateOfBirth?: string | null;
  gender?: "male" | "female" | null;
  address?: string | null;
  emergencyName?: string | null;
  emergencyPhone?: string | null;
  nicFrontPath?: string | null;
  nicBackPath?: string | null;
  selfiePath?: string | null;
}

export async function fetchMyPrivate(): Promise<PrivateInfo> {
  const uid = await currentUserId();
  if (!uid) return {};
  const { data } = await supabase.from("profile_private").select("*").eq("user_id", uid).maybeSingle();
  if (!data) return {};
  return {
    email: data.email,
    nicNumber: data.nic_number,
    dateOfBirth: data.date_of_birth,
    gender: data.gender,
    address: data.address,
    emergencyName: data.emergency_name,
    emergencyPhone: data.emergency_phone,
    nicFrontPath: data.nic_front_path,
    nicBackPath: data.nic_back_path,
    selfiePath: data.selfie_path,
  };
}

const COLS: Record<keyof PrivateInfo, string> = {
  email: "email",
  nicNumber: "nic_number",
  dateOfBirth: "date_of_birth",
  gender: "gender",
  address: "address",
  emergencyName: "emergency_name",
  emergencyPhone: "emergency_phone",
  nicFrontPath: "nic_front_path",
  nicBackPath: "nic_back_path",
  selfiePath: "selfie_path",
};

export async function savePrivate(patch: PrivateInfo) {
  const uid = await currentUserId();
  if (!uid) throw new Error("Please log in first");
  const row: Record<string, any> = { user_id: uid };
  (Object.keys(patch) as (keyof PrivateInfo)[]).forEach((k) => {
    if (patch[k] !== undefined) row[COLS[k]] = patch[k] === "" ? null : patch[k];
  });
  const { error } = await supabase.from("profile_private").upsert(row, { onConflict: "user_id" });
  if (error) {
    if (/profile_private_nic_key/.test(error.message)) throw new Error("This NIC number is already registered with another account.");
    if (/date_of_birth_check/.test(error.message)) throw new Error("You must be at least 18 years old.");
    if (/email_check/.test(error.message)) throw new Error("Enter a valid email address.");
    if (/nic_number_check/.test(error.message)) throw new Error("Enter a valid NIC number.");
    throw new Error(error.message);
  }
}

// ---------- private photos (NIC front / back, selfie) ----------
export type DocKind = "nic_front" | "nic_back" | "selfie";

export async function uploadPrivateDoc(kind: DocKind, uri: string, mimeType?: string | null): Promise<string> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Please log in first");
  const mime = mimeType || "image/jpeg";
  const ext = mime.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
  const path = `${uid}/${kind}-${Date.now()}.${ext}`;
  const buf = await (await fetch(uri)).arrayBuffer();
  const { error } = await supabase.storage.from("verification-docs").upload(path, buf, { contentType: mime });
  if (error) throw new Error("Photo upload failed: " + error.message);
  return path;
}

// Short-lived link so the owner can preview their own private photo
export async function signedDocUrl(path: string): Promise<string | undefined> {
  const { data } = await supabase.storage.from("verification-docs").createSignedUrl(path, 3600);
  return data?.signedUrl;
}

export async function submitVerification() {
  const { error } = await supabase.rpc("submit_verification");
  if (error) throw new Error(error.message);
}

// ---------- validation helpers ----------
export const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.trim());
export const isLkPhone = (s: string) => /^0\d{9}$/.test(s.replace(/\s/g, ""));

export interface NicInfo {
  dob: string; // YYYY-MM-DD
  gender: "male" | "female";
  age: number;
}

// Reads the birth date and gender out of a Sri Lankan NIC (old: 9 digits + V/X, new: 12 digits)
export function parseNIC(raw: string): NicInfo | null {
  const n = raw.replace(/\s/g, "").toUpperCase();
  let year: number;
  let days: number;
  if (/^\d{9}[VX]$/.test(n)) {
    year = 1900 + Number(n.slice(0, 2));
    days = Number(n.slice(2, 5));
  } else if (/^\d{12}$/.test(n)) {
    year = Number(n.slice(0, 4));
    days = Number(n.slice(4, 7));
  } else return null;

  let gender: "male" | "female" = "male";
  if (days > 500) {
    gender = "female";
    days -= 500;
  }
  if (days < 1 || days > 366) return null;
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  // NICs count 29 February in every year
  if (!leap) {
    if (days === 60) return null;
    if (days > 60) days -= 1;
  }
  const d = new Date(Date.UTC(year, 0, days));
  const dob = d.toISOString().slice(0, 10);
  const now = new Date();
  let age = now.getFullYear() - year;
  const birthdayPassed =
    now.getMonth() > d.getUTCMonth() || (now.getMonth() === d.getUTCMonth() && now.getDate() >= d.getUTCDate());
  if (!birthdayPassed) age -= 1;
  return { dob, gender, age };
}
