import { useEffect, useState } from "react";

const KEY = "aqari:favorites";

const read = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};

const write = (ids: string[]) => {
  localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent("aqari:favorites-changed"));
};

export function useFavorites() {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(read());
    const sync = () => setIds(read());
    window.addEventListener("aqari:favorites-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("aqari:favorites-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = (id: string) => {
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
    write(next);
    setIds(next);
  };

  const has = (id: string) => ids.includes(id);

  return { ids, toggle, has };
}
