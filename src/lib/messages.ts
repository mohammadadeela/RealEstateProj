import { useEffect, useRef, useState } from "react";
import { addNotification } from "./notifications";

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImage?: string;
  ownerId: string;
  ownerName: string;
  customerId: string;
  customerName: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  /** userId -> ISO timestamp of the last time they opened this conversation. */
  readAt: Record<string, string>;
}

const KEY = "aqari_conversations";
const EVENT = "aqari_conversations_change";

function isBrowser() {
  return typeof window !== "undefined";
}

function read(): Conversation[] {
  if (!isBrowser()) return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

function write(convos: Conversation[]) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(convos));
  } catch (e) {
    console.error("تعذر حفظ المحادثات (تجاوز حجم التخزين)", e);
  }
  // Same-tab listeners (storage event only fires in *other* tabs).
  window.dispatchEvent(new CustomEvent(EVENT));
}

function uid(prefix: string) {
  return prefix + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
}

function sortByActivity(a: Conversation, b: Conversation) {
  return +new Date(b.updatedAt) - +new Date(a.updatedAt);
}

/** Conversations the given user takes part in (as host or customer). */
export function getConversationsFor(userId: string): Conversation[] {
  return read()
    .filter((c) => c.ownerId === userId || c.customerId === userId)
    .sort(sortByActivity);
}

export function getConversationById(id: string): Conversation | undefined {
  return read().find((c) => c.id === id);
}

/** True when the user is a participant (host or customer) in the conversation. */
function isParticipant(convo: Conversation, userId: string): boolean {
  return convo.ownerId === userId || convo.customerId === userId;
}

/**
 * Fetch a conversation by id ONLY if the given user is a participant.
 * Prevents reading another user's thread via /messages?c=<foreign-id>.
 */
export function getConversationByIdForUser(
  id: string,
  userId: string | undefined,
): Conversation | undefined {
  if (!userId) return undefined;
  const convo = read().find((c) => c.id === id);
  return convo && isParticipant(convo, userId) ? convo : undefined;
}

/** Find an existing thread for this listing+customer, or create a fresh one. */
export function getOrCreateConversation(args: {
  listingId: string;
  listingTitle: string;
  listingImage?: string;
  ownerId: string;
  ownerName: string;
  customerId: string;
  customerName: string;
}): Conversation {
  const convos = read();
  const existing = convos.find(
    (c) =>
      c.listingId === args.listingId &&
      c.customerId === args.customerId &&
      c.ownerId === args.ownerId,
  );
  if (existing) return existing;

  const now = new Date().toISOString();
  const convo: Conversation = {
    id: uid("c-"),
    listingId: args.listingId,
    listingTitle: args.listingTitle,
    listingImage: args.listingImage,
    ownerId: args.ownerId,
    ownerName: args.ownerName,
    customerId: args.customerId,
    customerName: args.customerName,
    messages: [],
    createdAt: now,
    updatedAt: now,
    readAt: {},
  };
  convos.unshift(convo);
  write(convos);
  return convo;
}

export function sendMessage(conversationId: string, senderId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const convos = read();
  const idx = convos.findIndex((c) => c.id === conversationId);
  if (idx === -1) return;
  // Only participants may post into a conversation.
  if (!isParticipant(convos[idx], senderId)) return;
  const now = new Date().toISOString();
  const msg: ChatMessage = { id: uid("m-"), senderId, text: trimmed, createdAt: now };
  convos[idx] = {
    ...convos[idx],
    messages: [...convos[idx].messages, msg],
    updatedAt: now,
    readAt: { ...convos[idx].readAt, [senderId]: now },
  };
  write(convos);

  // Notify the recipient. Collapse repeat messages in one thread into a single
  // unread notification via the conversation-scoped dedupe key.
  const recipient = otherParty(convos[idx], senderId);
  const sender =
    convos[idx].ownerId === senderId ? convos[idx].ownerName : convos[idx].customerName;
  addNotification({
    userId: recipient.id,
    type: "new_message",
    title: `رسالة جديدة من ${sender}`,
    body: trimmed.length > 60 ? trimmed.slice(0, 60) + "…" : trimmed,
    link: { to: "/messages", search: { c: conversationId } },
    dedupeKey: `msg:${conversationId}`,
  });
}

/** Mark a conversation as read by the given user (clears its unread state). */
export function markConversationRead(conversationId: string, userId: string) {
  const convos = read();
  const idx = convos.findIndex((c) => c.id === conversationId);
  if (idx === -1) return;
  // Only participants affect a conversation's read state.
  if (!isParticipant(convos[idx], userId)) return;
  const last = convos[idx].messages.at(-1);
  // Nothing new from the other side -> avoid a needless write/event loop.
  if (!last || last.senderId === userId) {
    if (convos[idx].readAt[userId]) return;
  }
  convos[idx] = {
    ...convos[idx],
    readAt: { ...convos[idx].readAt, [userId]: new Date().toISOString() },
  };
  write(convos);
}

/** True when the conversation has messages from the other party newer than this user's last read. */
export function hasUnread(convo: Conversation, userId: string): boolean {
  const last = convo.messages.at(-1);
  if (!last || last.senderId === userId) return false;
  const readAt = convo.readAt[userId];
  if (!readAt) return true;
  return +new Date(last.createdAt) > +new Date(readAt);
}

export function unreadCountFor(userId: string): number {
  return getConversationsFor(userId).filter((c) => hasUnread(c, userId)).length;
}

export function otherParty(convo: Conversation, userId: string): { id: string; name: string } {
  return convo.ownerId === userId
    ? { id: convo.customerId, name: convo.customerName }
    : { id: convo.ownerId, name: convo.ownerName };
}

export { EVENT as CONVERSATIONS_EVENT };

/**
 * Subscribe to conversation changes in this tab AND other tabs (live sync).
 * Keeps the latest callback in a ref so listeners always run against current
 * state (e.g. after login/userId changes) without re-binding on every render.
 */
function useConversationSync(onChange: () => void) {
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

/** Live list of a user's conversations. */
export function useConversations(userId: string | undefined): Conversation[] {
  const [convos, setConvos] = useState<Conversation[]>([]);
  const refresh = () => setConvos(userId ? getConversationsFor(userId) : []);
  useEffect(refresh, [userId]);
  useConversationSync(refresh);
  return convos;
}

/** Live single conversation by id, scoped to a participant user (returns undefined otherwise). */
export function useConversation(
  id: string | undefined,
  userId: string | undefined,
): Conversation | undefined {
  const [convo, setConvo] = useState<Conversation | undefined>();
  const refresh = () => setConvo(id ? getConversationByIdForUser(id, userId) : undefined);
  useEffect(refresh, [id, userId]);
  useConversationSync(refresh);
  return convo;
}

/** Live unread-conversation count for header badges. */
export function useUnreadCount(userId: string | undefined): number {
  const [count, setCount] = useState(0);
  const refresh = () => setCount(userId ? unreadCountFor(userId) : 0);
  useEffect(refresh, [userId]);
  useConversationSync(refresh);
  return count;
}
