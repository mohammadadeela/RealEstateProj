import { useEffect, useState } from "react";

const KEY = "aqari_compare";
const EVENT = "aqari_compare_change";
export const COMPARE_MAX = 4;

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

export function getCompareIds(): string[] {
  return read();
}

export { EVENT as COMPARE_EVENT };

/**
 * Compare-selection state. Up to COMPARE_MAX listings; toggling a 5th is a no-op
 * (the caller can surface a hint via `isFull`).
 */
export function useCompare() {
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

  const has = (id: string) => ids.includes(id);

  const toggle = (id: string) => {
    const current = read();
    let next: string[];
    if (current.includes(id)) {
      next = current.filter((x) => x !== id);
    } else {
      if (current.length >= COMPARE_MAX) return; // capacity reached
      next = [...current, id];
    }
    write(next);
    setIds(next);
  };

  const remove = (id: string) => {
    const next = read().filter((x) => x !== id);
    write(next);
    setIds(next);
  };

  const clear = () => {
    write([]);
    setIds([]);
  };

  return { ids, has, toggle, remove, clear, isFull: ids.length >= COMPARE_MAX };
}
