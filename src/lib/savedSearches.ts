import { useEffect, useState } from "react";
import type { Property } from "./types";
import { addNotification } from "./notifications";

export type SearchParams = Record<string, string>;

export interface SavedSearch {
  id: string;
  userId: string;
  name: string;
  params: SearchParams;
  createdAt: string;
}

const KEY = "aqari_saved_searches";
const EVENT = "aqari_saved_searches_change";

function isBrowser() {
  return typeof window !== "undefined";
}

function read(): SavedSearch[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function write(items: SavedSearch[]) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch (e) {
    console.error("تعذر حفظ عمليات البحث", e);
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

function uid() {
  return "s-" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

/** True when a listing satisfies every constraint in a saved-search param set. */
export function listingMatchesParams(p: Property, s: SearchParams): boolean {
  if (s.q) {
    const q = s.q.toLowerCase();
    const hit =
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.city.includes(s.q) ||
      p.area.includes(s.q);
    if (!hit) return false;
  }
  if (s.city && p.city !== s.city) return false;
  if (s.area && p.area !== s.area) return false;
  if (s.propertyType && p.propertyType !== s.propertyType) return false;
  if (s.listingType && p.listingType !== s.listingType) return false;
  if (s.minPrice && p.price < Number(s.minPrice)) return false;
  if (s.maxPrice && p.price > Number(s.maxPrice)) return false;
  if (s.minSize && p.size < Number(s.minSize)) return false;
  if (s.maxSize && p.size > Number(s.maxSize)) return false;
  if (s.bedrooms && (p.bedrooms ?? 0) < Number(s.bedrooms)) return false;
  if (s.bathrooms && (p.bathrooms ?? 0) < Number(s.bathrooms)) return false;
  if (s.furnished === "1" && p.furnished !== true) return false;
  if (s.verified === "1" && !p.isVerified) return false;
  if (s.featured === "1" && !p.isFeatured) return false;
  return true;
}

const PARAM_LABELS: Record<string, string> = {
  city: "",
  area: "",
  propertyType: "",
  listingType: "",
};

/** Human-readable Arabic summary of a search, for list rows. */
export function describeSearch(
  s: SearchParams,
  labels: { property: Record<string, string>; listing: Record<string, string> },
): string {
  const parts: string[] = [];
  if (s.listingType) parts.push(labels.listing[s.listingType] ?? s.listingType);
  if (s.propertyType) parts.push(labels.property[s.propertyType] ?? s.propertyType);
  if (s.city) parts.push(`في ${s.city}`);
  if (s.area) parts.push(s.area);
  if (s.bedrooms) parts.push(`+${s.bedrooms} غرف`);
  if (s.maxPrice) parts.push(`حتى ${Number(s.maxPrice).toLocaleString("en-US")} ₪`);
  if (s.minPrice) parts.push(`من ${Number(s.minPrice).toLocaleString("en-US")} ₪`);
  if (s.q) parts.push(`"${s.q}"`);
  void PARAM_LABELS;
  return parts.length ? parts.join(" · ") : "كل العقارات";
}

export function getSavedSearchesFor(userId: string): SavedSearch[] {
  return read()
    .filter((s) => s.userId === userId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export function addSavedSearch(userId: string, name: string, params: SearchParams): SavedSearch {
  const items = read();
  const search: SavedSearch = {
    id: uid(),
    userId,
    name: name.trim() || "بحث محفوظ",
    params,
    createdAt: new Date().toISOString(),
  };
  items.unshift(search);
  write(items);
  return search;
}

export function deleteSavedSearch(id: string) {
  write(read().filter((s) => s.id !== id));
}

/** True if the user already saved an identical param set (avoids duplicates). */
export function hasSavedSearch(userId: string, params: SearchParams): boolean {
  const key = JSON.stringify(normalize(params));
  return read().some(
    (s) => s.userId === userId && JSON.stringify(normalize(s.params)) === key,
  );
}

function normalize(params: SearchParams): SearchParams {
  const out: SearchParams = {};
  Object.keys(params)
    .filter((k) => k !== "sort" && params[k])
    .sort()
    .forEach((k) => (out[k] = params[k]));
  return out;
}

/**
 * When a listing goes live, notify every user whose saved search it matches.
 * De-duplicated per (search, listing) so a user is alerted at most once.
 */
export function notifyMatchesForListing(listing: Property) {
  const searches = read();
  for (const s of searches) {
    if (listingMatchesParams(listing, s.params)) {
      addNotification({
        userId: s.userId,
        type: "new_match",
        title: "عقار جديد يطابق بحثك المحفوظ",
        body: `${listing.title} — ${s.name}`,
        link: { to: "/property/$id", params: { id: listing.id } },
        dedupeKey: `match:${s.id}:${listing.id}`,
      });
    }
  }
}

export { EVENT as SAVED_SEARCHES_EVENT };

export function useSavedSearches(userId: string | undefined): SavedSearch[] {
  const [items, setItems] = useState<SavedSearch[]>([]);
  useEffect(() => {
    const refresh = () => setItems(userId ? getSavedSearchesFor(userId) : []);
    refresh();
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [userId]);
  return items;
}
