import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import {
  BadgeCheck, ShieldQuestion, Clock, Lock, Eye, Plus,
  Building2, BarChart3, ListChecks, ChevronLeft, CalendarPlus, CalendarX, CalendarClock,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { getUserListings, initListings, isExpired, daysUntilExpiry, LISTINGS_EVENT, type Listing, type ListingStatus } from "@/lib/listings";
import { getPackageById } from "@/lib/packages";
import { LISTING_TYPE_LABELS, PROPERTY_TYPE_LABELS } from "@/lib/types";
import { formatPrice, formatNumber, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/Reveal";

export const Route = createFileRoute("/my-listings")({
  head: () => ({ meta: [{ title: "عقاراتي — عقاري" }] }),
  component: MyListingsPage,
});

const STATUS_LABEL: Record<ListingStatus, string> = {
  pending: "قيد المراجعة",
  active: "منشور",
  rejected: "مرفوض",
};

type FilterKey = "all" | ListingStatus;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "active", label: "منشورة" },
  { key: "pending", label: "قيد المراجعة" },
  { key: "rejected", label: "مرفوضة" },
];

function MyListingsPage() {
  const { user, isLoggedIn } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    if (!user) return;
    initListings();
    const refresh = () => setListings(getUserListings(user.id));
    refresh();
    window.addEventListener(LISTINGS_EVENT, refresh);
    return () => window.removeEventListener(LISTINGS_EVENT, refresh);
  }, [user]);

  const stats = useMemo(() => ({
    total: listings.length,
    active: listings.filter((l) => l.status === "active").length,
    pending: listings.filter((l) => l.status === "pending").length,
    rejected: listings.filter((l) => l.status === "rejected").length,
    views: listings.reduce((s, l) => s + (l.views ?? 0), 0),
  }), [listings]);

  const filtered = useMemo(
    () => (filter === "all" ? listings : listings.filter((l) => l.status === filter)),
    [listings, filter],
  );

  if (!isLoggedIn || !user) {
    return (
      <div className="container-page py-20 text-center max-w-md mx-auto">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
          <Lock className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-2xl font-extrabold">يجب تسجيل الدخول</h1>
        <p className="mt-2 text-muted-foreground">سجّل دخولك لعرض عقاراتك ومتابعة حالة إعلاناتك</p>
        <Button asChild className="mt-6 rounded-full px-8"><Link to="/auth">تسجيل الدخول</Link></Button>
      </div>
    );
  }

  return (
    <div className="container-page py-8 max-w-5xl">
      {/* Header */}
      <div className="enter-up flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold">عقاراتي</h1>
            <p className="text-sm text-muted-foreground mt-0.5">تابع جميع إعلاناتك وحالتها وعدد مشاهداتها</p>
          </div>
        </div>
        <Button asChild className="rounded-full gap-1.5">
          <Link to="/add-property"><Plus className="h-4 w-4" /> أضف عقاراً</Link>
        </Button>
      </div>

      {/* Stat cards */}
      <div className="enter-up mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={ListChecks} label="إجمالي الإعلانات" value={stats.total} tone="primary" />
        <StatCard icon={BadgeCheck} label="منشورة" value={stats.active} tone="success" />
        <StatCard icon={Clock} label="قيد المراجعة" value={stats.pending} tone="warning" />
        <StatCard icon={BarChart3} label="إجمالي المشاهدات" value={formatNumber(stats.views)} tone="sky" />
      </div>

      {/* Expiry reminder banner */}
      {(() => {
        const expiringSoon = listings.filter((l) => {
          if (l.status !== "active" || isExpired(l)) return false;
          const d = daysUntilExpiry(l);
          return d !== null && d <= 7;
        });
        const expired = listings.filter((l) => l.status === "active" && isExpired(l));
        if (expiringSoon.length === 0 && expired.length === 0) return null;
        return (
          <div className="enter-up mt-4 rounded-2xl border border-warning/40 bg-warning/10 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-warning/20 text-warning-foreground">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-warning-foreground">
                  {expired.length > 0 && expiringSoon.length > 0
                    ? `${expired.length} إعلان منتهي · ${expiringSoon.length} إعلان ينتهي قريباً`
                    : expired.length > 0
                    ? `${expired.length} إعلان ${expired.length === 1 ? "منتهي" : "منتهية"} — يجب التجديد`
                    : `${expiringSoon.length} إعلان ${expiringSoon.length === 1 ? "ينتهي" : "تنتهي"} خلال 7 أيام`}
                </p>
                <p className="text-sm text-warning-foreground/80 mt-0.5">
                  جدّد إعلاناتك لتبقى ظاهرة للمشترين.
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Filter tabs */}
      <Reveal className="mt-8 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count =
            f.key === "all" ? stats.total : stats[f.key as keyof typeof stats];
          const isActive = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "press inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px]",
                  isActive ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </Reveal>

      {/* Listings */}
      <div className="mt-5">
        {listings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/30 p-12 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
              <Building2 className="h-7 w-7" />
            </div>
            <p className="mt-4 font-bold">لا توجد عقارات بعد</p>
            <p className="mt-1 text-sm text-muted-foreground">أضف أول إعلان لك وستظهر حالته وعدد مشاهداته هنا.</p>
            <Button asChild className="mt-5 rounded-full gap-1.5">
              <Link to="/add-property"><Plus className="h-4 w-4" /> أضف عقاراً</Link>
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-muted/30 p-10 text-center text-muted-foreground">
            لا توجد إعلانات بهذه الحالة.
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((l, i) => (
              <Reveal key={l.id} variant="up" delay={(i % 6) * 70}>
              <div className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-3 transition-shadow hover:shadow-md">
                <Link
                  to="/property/$id"
                  params={{ id: l.id }}
                  className="h-20 w-24 sm:h-24 sm:w-32 shrink-0 overflow-hidden rounded-xl bg-muted"
                >
                  {l.images[0] && (
                    <img
                      src={l.images[0]}
                      alt={l.title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  )}
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to="/property/$id"
                      params={{ id: l.id }}
                      className="min-w-0 flex-1 block font-bold truncate hover:text-primary"
                    >
                      {l.title}
                    </Link>
                    <StatusBadge status={l.status} expired={isExpired(l)} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {PROPERTY_TYPE_LABELS[l.propertyType]} · {LISTING_TYPE_LABELS[l.listingType]} · {l.city}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-extrabold text-foreground text-sm">{formatPrice(l.price)}</span>
                    <span className="inline-flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" /> {formatNumber(l.views ?? 0)} مشاهدة
                    </span>
                  </div>
                  <ListingDates listing={l} />
                  {l.status === "rejected" && l.rejectionReason && (
                    <p className="mt-1.5 text-xs text-destructive">سبب الرفض: {l.rejectionReason}</p>
                  )}
                </div>
                <Link
                  to="/property/$id"
                  params={{ id: l.id }}
                  className="hidden sm:grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                  aria-label="عرض الإعلان"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Link>
              </div>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const TONES = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/12 text-success",
  warning: "bg-warning/15 text-warning-foreground",
  sky: "bg-sky-500/12 text-sky-600",
} as const;

function StatCard({
  icon: Icon, label, value, tone,
}: {
  icon: typeof ListChecks;
  label: string;
  value: string | number;
  tone: keyof typeof TONES;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className={cn("grid h-9 w-9 place-items-center rounded-xl", TONES[tone])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-3 text-2xl font-extrabold">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function ListingDates({ listing: l }: { listing: Listing }) {
  const expired = isExpired(l);
  const days = daysUntilExpiry(l);
  const durationDays = getPackageById(l.packageId)?.durationDays ?? 30;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
      {/* Date the post was added */}
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <CalendarPlus className="h-3.5 w-3.5" /> أُضيف: {formatDate(l.createdAt)}
      </span>

      {/* Pending: the clock hasn't started — show the package window */}
      {l.status === "pending" && (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" /> مدة النشر: {durationDays} يوم بعد الموافقة
        </span>
      )}

      {/* Active: show end date + remaining/expired state */}
      {l.status === "active" && l.expiresAt && (
        <>
          <span
            className={cn(
              "inline-flex items-center gap-1",
              expired ? "text-destructive font-bold" : "text-muted-foreground",
            )}
          >
            <CalendarX className="h-3.5 w-3.5" />
            {expired ? "انتهى في" : "ينتهي في"}: {formatDate(l.expiresAt)}
          </span>
          {!expired && days != null && (
            <span
              className={cn(
                "inline-flex items-center gap-1 font-bold",
                days <= 7 ? "text-warning-foreground" : "text-success",
              )}
            >
              <Clock className="h-3.5 w-3.5" /> متبقّي {days} يوم
            </span>
          )}
        </>
      )}
    </div>
  );
}

function StatusBadge({ status, expired }: { status: ListingStatus; expired: boolean }) {
  if (status === "active" && expired) {
    return (
      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
        <Clock className="h-3.5 w-3.5" /> منتهي
      </span>
    );
  }
  const map = {
    pending: { cls: "bg-warning/15 text-warning-foreground", icon: Clock },
    active: { cls: "bg-success/12 text-success", icon: BadgeCheck },
    rejected: { cls: "bg-destructive/12 text-destructive", icon: ShieldQuestion },
  } as const;
  const { cls, icon: Icon } = map[status];
  return (
    <span className={cn("shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold", cls)}>
      <Icon className="h-3.5 w-3.5" /> {STATUS_LABEL[status]}
    </span>
  );
}
