import { useEffect, useRef, useState } from "react";

export type NotificationType =
  | "listing_approved"
  | "listing_rejected"
  | "verification_approved"
  | "verification_rejected"
  | "new_message"
  | "new_match"
  | "price_drop"
  | "expiry_soon";

export interface NotificationLink {
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: NotificationLink;
  read: boolean;
  createdAt: string;
  /** Collapses repeat events (e.g. many messages in one thread) into a single unread item. */
  dedupeKey?: string;
}

const KEY = "aqari_notifications";
const EVENT = "aqari_notifications_change";

function isBrowser() {
  return typeof window !== "undefined";
}

function read(): AppNotification[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function write(items: AppNotification[]) {
  if (!isBrowser()) return;
  try {
    // Keep the store bounded so localStorage never fills up.
    localStorage.setItem(KEY, JSON.stringify(items.slice(0, 200)));
  } catch (e) {
    console.error("تعذر حفظ الإشعارات", e);
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

function uid() {
  return "n-" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

export function addNotification(n: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  link?: NotificationLink;
  dedupeKey?: string;
}) {
  if (!isBrowser() || !n.userId) return;
  const items = read();
  const now = new Date().toISOString();

  // If a still-unread notification with the same dedupe key exists, refresh it
  // in place instead of stacking duplicates.
  if (n.dedupeKey) {
    const idx = items.findIndex(
      (x) => x.userId === n.userId && x.dedupeKey === n.dedupeKey && !x.read,
    );
    if (idx !== -1) {
      items[idx] = { ...items[idx], title: n.title, body: n.body, link: n.link, createdAt: now };
      write(items);
      return;
    }
  }

  items.unshift({
    id: uid(),
    userId: n.userId,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    read: false,
    createdAt: now,
    dedupeKey: n.dedupeKey,
  });
  write(items);
}

export function getNotificationsFor(userId: string): AppNotification[] {
  return read()
    .filter((n) => n.userId === userId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export function unreadNotificationCount(userId: string): number {
  return read().filter((n) => n.userId === userId && !n.read).length;
}

export function markNotificationRead(id: string) {
  const items = read();
  const idx = items.findIndex((n) => n.id === id);
  if (idx === -1 || items[idx].read) return;
  items[idx] = { ...items[idx], read: true };
  write(items);
}

export function markAllNotificationsRead(userId: string) {
  const items = read();
  let changed = false;
  for (let i = 0; i < items.length; i++) {
    if (items[i].userId === userId && !items[i].read) {
      items[i] = { ...items[i], read: true };
      changed = true;
    }
  }
  if (changed) write(items);
}

export function clearNotifications(userId: string) {
  write(read().filter((n) => n.userId !== userId));
}

export { EVENT as NOTIFICATIONS_EVENT };

function useNotificationSync(onChange: () => void) {
  const cb = useRef(onChange);
  cb.current = onChange;
  useEffect(() => {
    const handler = () => cb.current();
    const storageHandler = (e: StorageEvent) => {
      if (e.key === KEY) cb.current();
    };
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", storageHandler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", storageHandler);
    };
  }, []);
}

export function useNotifications(userId: string | undefined): AppNotification[] {
  const [items, setItems] = useState<AppNotification[]>([]);
  const refresh = () => setItems(userId ? getNotificationsFor(userId) : []);
  useEffect(refresh, [userId]);
  useNotificationSync(refresh);
  return items;
}

export function useNotificationCount(userId: string | undefined): number {
  const [count, setCount] = useState(0);
  const refresh = () => setCount(userId ? unreadNotificationCount(userId) : 0);
  useEffect(refresh, [userId]);
  useNotificationSync(refresh);
  return count;
}
