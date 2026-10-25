// Place search for Sri Lanka using OpenStreetMap (Nominatim). Free, no API key.
// Note: Nominatim's policy allows light use only. For a large production app use a paid
// provider (Google Places, Mapbox, ...) and keep this same function signature.

export interface Place {
  label: string; // e.g. "Anuradhapura, North Central Province"
  lat: number;
  lng: number;
}

export async function searchPlacesLK(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6" +
    "&countrycodes=lk&accept-language=en&q=" +
    encodeURIComponent(q);
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error("Place search failed");
  const rows: any[] = await res.json();

  const seen = new Set<string>();
  const out: Place[] = [];
  for (const r of rows) {
    const a = r.address || {};
    const main = r.name || a.city || a.town || a.village || a.suburb || a.hamlet || "";
    const area = a.city || a.town || a.village || a.suburb || a.county || a.state_district || "";
    const state = a.state || a.province || "";
    const parts = [main, area !== main ? area : "", state].filter(Boolean);
    const label = parts.length ? parts.join(", ") : String(r.display_name).split(",").slice(0, 3).join(",").trim();
    if (!label || seen.has(label.toLowerCase())) continue;
    seen.add(label.toLowerCase());
    out.push({ label, lat: Number(r.lat), lng: Number(r.lon) });
  }
  return out;
}
