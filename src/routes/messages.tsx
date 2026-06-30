import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import {
  MessageCircle, Send, ChevronLeft, ChevronRight, Lock, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  useConversations, useConversation, sendMessage, markConversationRead,
  hasUnread, otherParty, type Conversation,
} from "@/lib/messages";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const searchSchema = z.object({ c: z.string().optional() });

export const Route = createFileRoute("/messages")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [{ title: "الرسائل — عقاري" }],
  }),
  component: MessagesPage,
});

function MessagesPage() {
  const { user, isLoggedIn } = useAuth();
  const { c: activeId } = Route.useSearch();
  const navigate = useNavigate();
  const conversations = useConversations(user?.id);

  if (!isLoggedIn || !user) {
    return (
      <div className="container-page py-20 text-center max-w-md mx-auto">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
          <Lock className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-2xl font-extrabold">يجب تسجيل الدخول</h1>
        <p className="mt-2 text-muted-foreground">سجّل دخولك لعرض رسائلك والتواصل مع المعلنين</p>
        <Button asChild className="mt-6 rounded-full px-8"><Link to="/auth">تسجيل الدخول</Link></Button>
      </div>
    );
  }

  const openConvo = (id: string) =>
    navigate({ to: "/messages", search: { c: id } });

  const closeConvo = () => navigate({ to: "/messages", search: {} });

  return (
    <div className="container-page py-6 max-w-5xl">
      <h1 className="mb-4 flex items-center gap-2 text-2xl font-extrabold">
        <MessageCircle className="h-6 w-6 text-primary" /> الرسائل
      </h1>

      <div className="grid gap-4 md:grid-cols-[320px_1fr] rounded-3xl border border-border bg-card overflow-hidden min-h-[60vh]">
        {/* Conversation list — hidden on mobile when a thread is open */}
        <aside
          className={cn(
            "border-border md:border-l md:block",
            activeId ? "hidden" : "block",
          )}
        >
          {conversations.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              لا توجد رسائل بعد. ابدأ محادثة من صفحة أي عقار عبر زر «رسالة داخل الموقع».
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {conversations.map((convo) => (
                <ConversationRow
                  key={convo.id}
                  convo={convo}
                  userId={user.id}
                  active={convo.id === activeId}
                  onClick={() => openConvo(convo.id)}
                />
              ))}
            </ul>
          )}
        </aside>

        {/* Active thread */}
        <section className={cn("min-w-0", activeId ? "block" : "hidden md:block")}>
          {activeId ? (
            <ChatThread conversationId={activeId} userId={user.id} onBack={closeConvo} />
          ) : (
            <div className="flex h-full min-h-[40vh] flex-col items-center justify-center p-8 text-center text-muted-foreground">
              <MessageCircle className="h-12 w-12 text-muted-foreground/40" />
              <p className="mt-3">اختر محادثة لعرضها</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ConversationRow({
  convo, userId, active, onClick,
}: {
  convo: Conversation;
  userId: string;
  active: boolean;
  onClick: () => void;
}) {
  const other = otherParty(convo, userId);
  const last = convo.messages.at(-1);
  const unread = hasUnread(convo, userId);
  return (
    <li>
      <button
        onClick={onClick}
        className={cn(
          "flex w-full items-center gap-3 p-3 text-right transition hover:bg-muted",
          active && "bg-muted",
        )}
      >
        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted">
          {convo.listingImage && (
            <img src={convo.listingImage} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-bold">{other.name}</span>
            {last && (
              <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(last.createdAt)}</span>
            )}
          </div>
          <p className="truncate text-xs text-muted-foreground">{convo.listingTitle}</p>
          <p className={cn("truncate text-xs", unread ? "font-bold text-foreground" : "text-muted-foreground")}>
            {last ? last.text : "ابدأ المحادثة..."}
          </p>
        </div>
        {unread && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />}
      </button>
    </li>
  );
}

function ChatThread({
  conversationId, userId, onBack,
}: {
  conversationId: string;
  userId: string;
  onBack: () => void;
}) {
  const convo = useConversation(conversationId, userId);
  const [text, setText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Mark read whenever the thread or its messages change.
  useEffect(() => {
    if (convo) markConversationRead(conversationId, userId);
  }, [conversationId, userId, convo?.messages.length]);

  // Auto-scroll to the newest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [convo?.messages.length]);

  if (!convo) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-muted-foreground">
        لم يتم العثور على المحادثة
      </div>
    );
  }

  const other = otherParty(convo, userId);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(conversationId, userId, text);
    setText("");
  }

  return (
    <div className="flex h-full flex-col">
      {/* Thread header */}
      <div className="flex items-center gap-3 border-b border-border p-3">
        <button
          onClick={onBack}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:bg-muted md:hidden"
          aria-label="رجوع"
        >
          <ArrowRight className="h-5 w-5" />
        </button>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary">
          {other.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{other.name}</p>
          <Link
            to="/property/$id"
            params={{ id: convo.listingId }}
            className="flex items-center gap-1 truncate text-xs text-muted-foreground hover:text-primary"
          >
            {convo.listingTitle} <ChevronLeft className="h-3 w-3 shrink-0" />
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-2 overflow-y-auto p-4 min-h-[40vh] max-h-[55vh] bg-muted/20">
        {convo.messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-muted-foreground">
            لا توجد رسائل بعد — أرسل أول رسالة 👋
          </div>
        ) : (
          convo.messages.map((m) => {
            const mine = m.senderId === userId;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-start" : "justify-end")}>
                <div
                  className={cn(
                    "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm animate-in fade-in slide-in-from-bottom-1 duration-200",
                    mine
                      ? "bg-primary text-primary-foreground rounded-tr-md"
                      : "bg-card border border-border rounded-tl-md",
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <span className={cn("mt-1 block text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {timeAgo(m.createdAt)}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-border p-3">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="اكتب رسالتك..."
          className="min-w-0 flex-1 rounded-full border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="إرسال"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition duration-200 hover:scale-110 active:scale-90 disabled:opacity-40 disabled:hover:scale-100"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  );
}
