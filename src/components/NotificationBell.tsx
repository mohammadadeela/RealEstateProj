import { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell, CheckCircle2, XCircle, BadgeCheck, ShieldX, MessageCircle,
  Sparkles, TrendingDown, Clock, CheckCheck,
} from "lucide-react";
import {
  useNotifications, useNotificationCount, markNotificationRead,
  markAllNotificationsRead, type AppNotification, type NotificationType,
} from "@/lib/notifications";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICONS: Record<NotificationType, { icon: typeof Bell; cls: string }> = {
  listing_approved: { icon: CheckCircle2, cls: "bg-success/12 text-success" },
  listing_rejected: { icon: XCircle, cls: "bg-destructive/12 text-destructive" },
  verification_approved: { icon: BadgeCheck, cls: "bg-success/12 text-success" },
  verification_rejected: { icon: ShieldX, cls: "bg-destructive/12 text-destructive" },
  new_message: { icon: MessageCircle, cls: "bg-primary/12 text-primary" },
  new_match: { icon: Sparkles, cls: "bg-primary/12 text-primary" },
  price_drop: { icon: TrendingDown, cls: "bg-success/12 text-success" },
  expiry_soon: { icon: Clock, cls: "bg-warning/15 text-warning-foreground" },
};

export function NotificationBell({ userId }: { userId: string }) {
  const items = useNotifications(userId);
  const count = useNotificationCount(userId);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function openItem(n: AppNotification) {
    markNotificationRead(n.id);
    setOpen(false);
    if (n.link) {
      // TanStack's typed router can't verify a runtime-built target; cast through.
      navigate({ to: n.link.to, params: n.link.params, search: n.link.search } as never);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="الإشعارات"
        className="relative grid h-10 w-10 place-items-center rounded-full transition-colors hover:bg-muted hover:text-primary"
      >
        <Bell className="h-5 w-5 transition-transform duration-200 hover:scale-110" />
        {count > 0 && (
          <span className="absolute -top-0.5 -left-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-extrabold text-primary-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card shadow-lg overflow-hidden z-50">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-extrabold">الإشعارات</h3>
            {count > 0 && (
              <button
                onClick={() => markAllNotificationsRead(userId)}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" /> تعليم الكل كمقروء
              </button>
            )}
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
                  <Bell className="h-6 w-6" />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">لا توجد إشعارات بعد</p>
              </div>
            ) : (
              items.map((n) => {
                const meta = ICONS[n.type];
                const Icon = meta.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => openItem(n)}
                    className={cn(
                      "flex w-full items-start gap-3 border-b border-border/60 px-4 py-3 text-right transition hover:bg-muted/60",
                      !n.read && "bg-primary/[0.04]",
                    )}
                  >
                    <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full", meta.cls)}>
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="line-clamp-1 text-sm font-bold text-foreground">{n.title}</span>
                        {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                      </span>
                      {n.body && <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{n.body}</span>}
                      <span className="mt-1 block text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
