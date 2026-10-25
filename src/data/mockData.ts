export type Category =
  | "Gardening"
  | "Cleaning"
  | "Painting"
  | "Driving"
  | "Tutoring"
  | "Moving"
  | "Event Help"
  | "Plumbing"
  | "Electrical"
  | "Pet Care";

export const categories: Category[] = [
  "Gardening",
  "Cleaning",
  "Painting",
  "Driving",
  "Tutoring",
  "Moving",
  "Event Help",
  "Plumbing",
  "Electrical",
  "Pet Care",
];

export const categoryIcon: Record<Category, string> = {
  Gardening: "leaf",
  Cleaning: "sparkles",
  Painting: "color-palette",
  Driving: "car",
  Tutoring: "book",
  Moving: "cube",
  "Event Help": "balloon",
  Plumbing: "water",
  Electrical: "flash",
  "Pet Care": "paw",
};

export const categoryColor: Record<Category, string> = {
  Gardening: "#22C55E",
  Cleaning: "#3B82F6",
  Painting: "#A855F7",
  Driving: "#F97316",
  Tutoring: "#EC4899",
  Moving: "#F59E0B",
  "Event Help": "#06B6D4",
  Plumbing: "#0EA5E9",
  Electrical: "#EAB308",
  "Pet Care": "#84CC16",
};

export interface Job {
  id: string;
  title: string;
  category: Category;
  pay: number;
  payType: "per day" | "per trip" | "fixed";
  location: string;
  distanceKm: number;
  postedAgo: string;
  rating: number;
  urgent?: boolean;
  date?: string;
  time?: string;
  description?: string;
  requirements?: string[];
  employerId?: string;
  employer?: { name: string; rating: number; reviews: number; avatarUrl?: string };
  imageUrl?: string;
  workersNeeded?: number;
  filled?: number;
  rawDate?: string; // YYYY-MM-DD
  rawTime?: string; // HH:MM
  lat?: number | null;
  lng?: number | null;
}

export interface PostedJob {
  id: string;
  title: string;
  category: Category;
  status: "active" | "closed" | "draft";
  postedAgo: string;
  pay: number;
  applicants: number;
  imageUrl?: string;
  job: Job;
}
