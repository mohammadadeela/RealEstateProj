import { useEffect, useState } from "react";

export interface Review {
  id: string;
  /** The owner / agent being reviewed. */
  subjectId: string;
  authorId: string;
  authorName: string;
  rating: number; // 1..5
  text: string;
  createdAt: string;
}

export interface RatingSummary {
  average: number;
  count: number;
}

const KEY = "aqari_reviews";
const EVENT = "aqari_reviews_change";

function isBrowser() {
  return typeof window !== "undefined";
}

function read(): Review[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function write(items: Review[]) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch (e) {
    console.error("تعذر حفظ التقييمات", e);
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

function uid() {
  return "r-" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

export function getReviewsFor(subjectId: string): Review[] {
  return read()
    .filter((r) => r.subjectId === subjectId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export function getRatingSummary(subjectId: string): RatingSummary {
  const list = read().filter((r) => r.subjectId === subjectId);
  if (list.length === 0) return { average: 0, count: 0 };
  const sum = list.reduce((s, r) => s + r.rating, 0);
  return { average: sum / list.length, count: list.length };
}

/** Add or replace the author's review for a subject (one review per author). */
export function upsertReview(args: {
  subjectId: string;
  authorId: string;
  authorName: string;
  rating: number;
  text: string;
}) {
  if (!isBrowser()) return;
  const rating = Math.max(1, Math.min(5, Math.round(args.rating)));
  const items = read();
  const idx = items.findIndex(
    (r) => r.subjectId === args.subjectId && r.authorId === args.authorId,
  );
  const now = new Date().toISOString();
  if (idx !== -1) {
    items[idx] = { ...items[idx], rating, text: args.text.trim(), createdAt: now };
  } else {
    items.unshift({
      id: uid(),
      subjectId: args.subjectId,
      authorId: args.authorId,
      authorName: args.authorName,
      rating,
      text: args.text.trim(),
      createdAt: now,
    });
  }
  write(items);
}

export function deleteReview(id: string) {
  write(read().filter((r) => r.id !== id));
}

export function getOwnReview(subjectId: string, authorId: string): Review | undefined {
  return read().find((r) => r.subjectId === subjectId && r.authorId === authorId);
}

export { EVENT as REVIEWS_EVENT };

export function useReviews(subjectId: string | undefined) {
  const [items, setItems] = useState<Review[]>([]);
  useEffect(() => {
    const refresh = () => setItems(subjectId ? getReviewsFor(subjectId) : []);
    refresh();
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [subjectId]);
  return items;
}
