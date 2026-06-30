import { useEffect, useState } from "react";

const KEY = "aqari_recently_viewed";
const EVENT = "aqari_recently_viewed_change";
const MAX = 12;

function isBrowser() {
  return typeof window !== "undefined";
}

function read(): string[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function write(ids: string[]) {
  if (!isBrowser()) return;
  localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Record a viewed listing, most-recent first, de-duplicated and capped. */
export function pushRecentlyViewed(id: string) {
  if (!isBrowser()) return;
  const next = [id, ...read().filter((x) => x !== id)].slice(0, MAX);
  write(next);
}

export function getRecentlyViewed(): string[] {
  return read();
}

export { EVENT as RECENTLY_VIEWED_EVENT };

export function useRecentlyViewed(): string[] {
  const [ids, setIds] = useState<string[]>([]);
  useEffect(() => {
    setIds(read());
    const sync = () => setIds(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return ids;
}
