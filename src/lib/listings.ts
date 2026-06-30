import { useEffect, useState } from "react";
import { MOCK_PROPERTIES } from "./mockData";
import { getPackageById } from "./packages";
import { addNotification } from "./notifications";
import { notifyMatchesForListing } from "./savedSearches";
import type { Property } from "./types";

export type ListingStatus = "pending" | "active" | "rejected";

export interface Listing extends Property {
  status: ListingStatus;
  ownerId?: string;
  ownerEmail?: string;
  packageId?: string;
  packagePrice?: number;
  rejectionReason?: string;
  reviewedAt?: string;
  submittedAt?: string;
}

const KEY = "aqari_listings";
const EVENT = "aqari_listings_change";

function isBrowser() {
  return typeof window !== "undefined";
}

function read(): Listing[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function write(listings: Listing[]) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(listings));
  } catch (e) {
    console.error("تعذر حفظ الإعلانات (تجاوز حجم التخزين)", e);
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** True when a listing has passed its package expiry date. */
export function isExpired(p: { expiresAt?: string }): boolean {
  return !!p.expiresAt && +new Date(p.expiresAt) < Date.now();
}

/**
 * Whole days left until a listing expires (rounded up). Negative once expired,
 * null when the expiry clock hasn't started yet (e.g. still pending review).
 */
export function daysUntilExpiry(p: { expiresAt?: string }): number | null {
  if (!p.expiresAt) return null;
  return Math.ceil((+new Date(p.expiresAt) - Date.now()) / 86400000);
}

/** Active, non-expired listings — what the public should actually see. */
export function isLive(l: Listing): boolean {
  return l.status === "active" && !isExpired(l);
}

/** Seed the store from the static catalog once, marking them as active. */
export function initListings() {
  if (!isBrowser()) return;
  if (localStorage.getItem(KEY)) return;
  const seeded: Listing[] = MOCK_PROPERTIES.map((p) => ({
    ...p,
    status: "active",
    onHomepage: p.onHomepage ?? p.isFeatured,
    submittedAt: p.createdAt,
    reviewedAt: p.createdAt,
  }));
  write(seeded);
}

export function getAllListings(): Listing[] {
  return read().sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export function getActiveListings(): Listing[] {
  return getAllListings().filter(isLive);
}

export function getListingById(id: string): Listing | undefined {
  return read().find((l) => l.id === id);
}

export function getUserListings(ownerId: string): Listing[] {
  return getAllListings().filter((l) => l.ownerId === ownerId);
}

export function createListing(
  data: Omit<Listing, "id" | "status" | "views" | "createdAt"> &
    Partial<Pick<Listing, "views" | "createdAt">>,
): Listing {
  const listings = read();
  const now = new Date().toISOString();
  const listing: Listing = {
    ...data,
    id: "u-" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4),
    status: "pending",
    views: data.views ?? 0,
    createdAt: data.createdAt ?? now,
    submittedAt: now,
  };
  listings.unshift(listing);
  write(listings);
  return listing;
}

export function updateListingStatus(
  id: string,
  status: ListingStatus,
  rejectionReason?: string,
) {
  const listings = read();
  const idx = listings.findIndex((l) => l.id === id);
  if (idx === -1) return;
  const current = listings[idx];
  // Start the paid duration clock when the listing actually goes live,
  // so review delay never eats into the package's 30/60-day window.
  let expiresAt = current.expiresAt;
  if (status === "active") {
    const days = getPackageById(current.packageId)?.durationDays ?? 30;
    expiresAt = new Date(Date.now() + days * 86400000).toISOString();
  }
  const updated: Listing = {
    ...current,
    status,
    expiresAt,
    rejectionReason: status === "rejected" ? rejectionReason : undefined,
    reviewedAt: new Date().toISOString(),
  };
  listings[idx] = updated;
  write(listings);

  // Tell the owner about the review outcome.
  if (updated.ownerId && current.status !== status) {
    if (status === "active") {
      addNotification({
        userId: updated.ownerId,
        type: "listing_approved",
        title: "تمت الموافقة على إعلانك ✓",
        body: `أصبح إعلان "${updated.title}" منشوراً الآن.`,
        link: { to: "/property/$id", params: { id: updated.id } },
        dedupeKey: `listing_status:${updated.id}`,
      });
    } else if (status === "rejected") {
      addNotification({
        userId: updated.ownerId,
        type: "listing_rejected",
        title: "لم تتم الموافقة على إعلانك",
        body: rejectionReason ? `السبب: ${rejectionReason}` : `إعلان "${updated.title}"`,
        link: { to: "/my-listings" },
        dedupeKey: `listing_status:${updated.id}`,
      });
    }
  }

  // Newly live listing → alert anyone whose saved search it matches.
  if (status === "active" && current.status !== "active") {
    notifyMatchesForListing(updated);
  }
}

export function deleteListing(id: string) {
  write(read().filter((l) => l.id !== id));
}

export function setListingFlags(
  id: string,
  flags: Partial<Pick<Listing, "isFeatured" | "isUrgent" | "isVerified">>,
) {
  const listings = read();
  const idx = listings.findIndex((l) => l.id === id);
  if (idx === -1) return;
  listings[idx] = { ...listings[idx], ...flags };
  write(listings);
}

export function incrementViews(id: string) {
  const listings = read();
  const idx = listings.findIndex((l) => l.id === id);
  if (idx === -1) return;
  listings[idx] = { ...listings[idx], views: (listings[idx].views ?? 0) + 1 };
  write(listings);
}

export { EVENT as LISTINGS_EVENT };

/** SSR-safe hook: starts from the static catalog, then hydrates from the store. */
export function useListings() {
  const [listings, setListings] = useState<Listing[]>(() =>
    MOCK_PROPERTIES.map((p) => ({
      ...p,
      status: "active" as ListingStatus,
      onHomepage: p.onHomepage ?? p.isFeatured,
    })),
  );

  useEffect(() => {
    initListings();
    const refresh = () => setListings(getAllListings());
    refresh();
    window.addEventListener(EVENT, refresh);
    return () => window.removeEventListener(EVENT, refresh);
  }, []);

  return listings;
}
