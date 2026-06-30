import { useEffect, useState } from "react";

interface ListingStat {
  /** ISO date strings (yyyy-mm-dd) -> view count that day. */
  viewsByDay: Record<string, number>;
  saves: number;
  contacts: number;
}

export interface ListingAnalytics {
  totalViews: number;
  saves: number;
  contacts: number;
  /** Last 7 days, oldest -> newest. */
  last7: { date: string; label: string; count: number }[];
}

const KEY = "aqari_analytics";
const EVENT = "aqari_analytics_change";

function isBrowser() {
  return typeof window !== "undefined";
}

function read(): Record<string, ListingStat> {
  if (!isBrowser()) return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

function write(data: Record<string, ListingStat>) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) {
    console.error("تعذر حفظ الإحصائيات", e);
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function ensure(data: Record<string, ListingStat>, id: string): ListingStat {
  if (!data[id]) data[id] = { viewsByDay: {}, saves: 0, contacts: 0 };
  return data[id];
}

export function recordView(id: string) {
  if (!isBrowser()) return;
  const data = read();
  const stat = ensure(data, id);
  const k = dayKey(new Date());
  stat.viewsByDay[k] = (stat.viewsByDay[k] ?? 0) + 1;
  write(data);
}

export function recordSave(id: string, delta: number) {
  if (!isBrowser()) return;
  const data = read();
  const stat = ensure(data, id);
  stat.saves = Math.max(0, stat.saves + delta);
  write(data);
}

export function recordContact(id: string) {
  if (!isBrowser()) return;
  const data = read();
  const stat = ensure(data, id);
  stat.contacts += 1;
  write(data);
}

const WEEKDAYS = ["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"];

export function getAnalytics(id: string, fallbackViews = 0): ListingAnalytics {
  const stat = read()[id];
  const last7: ListingAnalytics["last7"] = [];
  let recordedTotal = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = dayKey(d);
    const count = stat?.viewsByDay[k] ?? 0;
    last7.push({ date: k, label: WEEKDAYS[d.getDay()], count });
  }
  if (stat) {
    for (const v of Object.values(stat.viewsByDay)) recordedTotal += v;
  }
  return {
    // The listing's own `views` counter is the source of truth for the lifetime
    // total; recorded daily views may have started accruing later.
    totalViews: Math.max(fallbackViews, recordedTotal),
    saves: stat?.saves ?? 0,
    contacts: stat?.contacts ?? 0,
    last7,
  };
}

export { EVENT as ANALYTICS_EVENT };

export function useAnalytics(id: string | undefined, fallbackViews = 0): ListingAnalytics {
  const [data, setData] = useState<ListingAnalytics>(() => getAnalytics(id ?? "", fallbackViews));
  useEffect(() => {
    const refresh = () => setData(getAnalytics(id ?? "", fallbackViews));
    refresh();
    window.addEventListener(EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [id, fallbackViews]);
  return data;
}
