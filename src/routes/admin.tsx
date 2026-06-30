import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Users, Building2, TrendingUp, ShieldCheck, Trash2,
  Eye, CheckCircle, XCircle, Search, LayoutDashboard,
  BadgeDollarSign, Clock, ArrowRight, LogOut, Ban, Undo2,
  BadgeCheck, X, ChevronLeft, ChevronRight, MapPin, Phone,
  MessageCircle, Mail, FileCheck2, Hourglass, Star, Zap,
  BedDouble, Bath, Maximize2, Layers, Calendar, Sofa, Image as ImageIcon,
  Map as MapIcon, Plus, Upload, Pencil, Save,
  ChevronDown, ArrowDownUp, Home, RotateCcw,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  getAllUsers, deleteUser, logout, blockUser, unblockUser,
  setUserVerified, getVerificationRequests, reviewVerification,
  AUTH_EVENT, type AqariUser,
} from "@/lib/auth";
import {
  getAllListings, updateListingStatus, deleteListing, setListingFlags,
  LISTINGS_EVENT, type Listing, type ListingStatus,
} from "@/lib/listings";
import {
  useCities, addCity, updateCity, deleteCity,
} from "@/lib/cities";
import { usePackages, updatePackagePrice, DEFAULT_PACKAGES } from "@/lib/packages";
import { fileToCompressedDataUrl } from "@/lib/imageUtils";
import {
  LISTING_TYPE_LABELS, PROPERTY_TYPE_LABELS,
  type City, type ListingType as PropListingType, type PropertyType,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type Tab = "overview" | "listings" | "users" | "verifications" | "cities" | "packages";

function safeHttpUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function fmt(n: number) {
  return n.toLocaleString("en-US");
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("ar-PS-u-nu-latn", { year: "numeric", month: "short", day: "numeric" });
}

const STATUS_CONFIG: Record<ListingStatus, { label: string; cls: string }> = {
  active: { label: "منشور", cls: "bg-emerald-100 text-emerald-700" },
  pending: { label: "قيد المراجعة", cls: "bg-amber-100 text-amber-700" },
  rejected: { label: "مرفوض", cls: "bg-red-100 text-red-700" },
};

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 flex items-start gap-4">
      <div className={`rounded-xl p-3 ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-extrabold mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

type ListingSort = "newest" | "oldest" | "views" | "priceHigh" | "priceLow";
type ListingPromo = "all" | "featured" | "urgent" | "homepage";
type UserFilter = "all" | "verified" | "unverified" | "blocked" | "pending";
type UserSort = "newest" | "oldest" | "name";

function FilterSelect({
  value, onChange, options, icon,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  icon?: React.ReactNode;
}) {
  return (
    <div className="relative">
      {icon && (
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {icon}
        </span>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "appearance-none cursor-pointer rounded-xl border border-border bg-background py-2.5 pl-8 text-sm font-bold focus:border-primary focus:outline-none",
          icon ? "pr-9" : "pr-3",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    </div>
  );
}

function AdminPage() {
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("overview");
  const [users, setUsers] = useState<AqariUser[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [userFilter, setUserFilter] = useState<UserFilter>("all");
  const [userSort, setUserSort] = useState<UserSort>("newest");
  const [listingSearch, setListingSearch] = useState("");
  const [listingFilter, setListingFilter] = useState<ListingStatus | "all">("all");
  const [listingSort, setListingSort] = useState<ListingSort>("newest");
  const [listingType, setListingType] = useState<PropListingType | "all">("all");
  const [listingPropType, setListingPropType] = useState<PropertyType | "all">("all");
  const [listingCity, setListingCity] = useState<string>("all");
  const [listingPromo, setListingPromo] = useState<ListingPromo>("all");
  const [verifSearch, setVerifSearch] = useState("");
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<string | null>(null);
  const [review, setReview] = useState<Listing | null>(null);

  useEffect(() => {
    if (isLoggedIn === false) return;
    if (user && user.role !== "admin") navigate({ to: "/" });
  }, [user, isLoggedIn, navigate]);

  useEffect(() => {
    const refreshUsers = () => setUsers(getAllUsers());
    const refreshListings = () => setListings(getAllListings());
    refreshUsers();
    refreshListings();
    window.addEventListener(AUTH_EVENT, refreshUsers);
    window.addEventListener(LISTINGS_EVENT, refreshListings);
    return () => {
      window.removeEventListener(AUTH_EVENT, refreshUsers);
      window.removeEventListener(LISTINGS_EVENT, refreshListings);
    };
  }, []);

  // keep the open review modal in sync after status changes
  useEffect(() => {
    if (!review) return;
    const fresh = listings.find((l) => l.id === review.id);
    if (fresh && fresh !== review) setReview(fresh);
  }, [listings]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user || user.role !== "admin") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <ShieldCheck className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-bold">غير مصرح لك بالدخول</p>
          <p className="text-sm text-muted-foreground mt-1">هذه الصفحة للمديرين فقط</p>
        </div>
      </div>
    );
  }

  const regularUsers = users.filter((u) => u.role !== "admin");
  const activeCount = listings.filter((l) => l.status === "active").length;
  const pendingCount = listings.filter((l) => l.status === "pending").length;
  const rejectedCount = listings.filter((l) => l.status === "rejected").length;
  const totalViews = listings.reduce((s, l) => s + (l.views ?? 0), 0);
  const revenue = listings.reduce((s, l) => s + (l.packagePrice ?? 0), 0);
  const verifReqs = getVerificationRequests();
  const verifiedCount = regularUsers.filter((u) => u.verified).length;
  const blockedCount = regularUsers.filter((u) => u.blocked).length;

  const unverifiedCount = regularUsers.length - verifiedCount;
  const pendingVerifCount = regularUsers.filter((u) => u.verificationStatus === "pending").length;

  const filteredUsers = regularUsers
    .filter((u) => {
      const matchSearch =
        !userSearch ||
        u.name.includes(userSearch) ||
        u.email.includes(userSearch) ||
        u.phone.includes(userSearch);
      const matchFilter =
        userFilter === "all" ||
        (userFilter === "verified" && u.verified) ||
        (userFilter === "unverified" && !u.verified) ||
        (userFilter === "blocked" && u.blocked) ||
        (userFilter === "pending" && u.verificationStatus === "pending");
      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      if (userSort === "name") return a.name.localeCompare(b.name, "ar");
      const da = +new Date(a.createdAt);
      const db = +new Date(b.createdAt);
      return userSort === "oldest" ? da - db : db - da;
    });

  const cityOptions = Array.from(new Set(listings.map((l) => l.city))).sort((a, b) => a.localeCompare(b, "ar"));

  const filteredListings = listings
    .filter((l) => {
      const matchSearch =
        !listingSearch ||
        l.title.includes(listingSearch) ||
        l.city.includes(listingSearch) ||
        l.ownerName.includes(listingSearch);
      const matchStatus = listingFilter === "all" || l.status === listingFilter;
      const matchType = listingType === "all" || l.listingType === listingType;
      const matchProp = listingPropType === "all" || l.propertyType === listingPropType;
      const matchCity = listingCity === "all" || l.city === listingCity;
      const matchPromo =
        listingPromo === "all" ||
        (listingPromo === "featured" && !!l.isFeatured) ||
        (listingPromo === "urgent" && !!l.isUrgent) ||
        (listingPromo === "homepage" && !!l.onHomepage);
      return matchSearch && matchStatus && matchType && matchProp && matchCity && matchPromo;
    })
    .sort((a, b) => {
      switch (listingSort) {
        case "oldest": return +new Date(a.createdAt) - +new Date(b.createdAt);
        case "views": return (b.views ?? 0) - (a.views ?? 0);
        case "priceHigh": return b.price - a.price;
        case "priceLow": return a.price - b.price;
        default: return +new Date(b.createdAt) - +new Date(a.createdAt);
      }
    });

  const listingFiltersActive =
    listingType !== "all" || listingPropType !== "all" || listingCity !== "all" ||
    listingPromo !== "all" || listingSort !== "newest" || listingFilter !== "all" ||
    listingSearch !== "";

  function resetListingFilters() {
    setListingSearch("");
    setListingFilter("all");
    setListingSort("newest");
    setListingType("all");
    setListingPropType("all");
    setListingCity("all");
    setListingPromo("all");
  }

  const filteredVerifReqs = verifReqs.filter(
    (u) =>
      !verifSearch ||
      u.name.includes(verifSearch) ||
      u.email.includes(verifSearch) ||
      u.phone.includes(verifSearch),
  );

  function accept(id: string) {
    updateListingStatus(id, "active");
  }
  function reject(id: string, reason: string) {
    updateListingStatus(id, "rejected", reason);
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: "overview", label: "نظرة عامة", icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: "listings", label: "الإعلانات", icon: <Building2 className="h-4 w-4" />, badge: pendingCount },
    { id: "users", label: "المستخدمون", icon: <Users className="h-4 w-4" /> },
    { id: "verifications", label: "طلبات التوثيق", icon: <FileCheck2 className="h-4 w-4" />, badge: verifReqs.length },
    { id: "cities", label: "المدن", icon: <MapIcon className="h-4 w-4" /> },
    { id: "packages", label: "الباقات", icon: <BadgeDollarSign className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container-page py-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground">
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold">لوحة تحكم عقاري</h1>
                <p className="text-xs text-muted-foreground">مرحباً، {user.name} · تحكّم كامل بالموقع</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/" className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold hover:bg-muted transition">
                الرئيسية <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <button
                onClick={() => { logout(); navigate({ to: "/" }); }}
                className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
              >
                <LogOut className="h-4 w-4" /> خروج
              </button>
            </div>
          </div>

          <div className="mt-5 -mx-1 flex gap-1 overflow-x-auto px-1 pb-1 scrollbar-none">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2.5 text-sm font-bold transition",
                  tab === t.id ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground",
                )}
              >
                {t.icon} {t.label}
                {!!t.badge && t.badge > 0 && (
                  <span className={cn(
                    "grid h-5 min-w-5 place-items-center rounded-full px-1 text-[10px] font-extrabold",
                    tab === t.id ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground",
                  )}>
                    {t.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container-page py-6">
        {/* ===== OVERVIEW ===== */}
        {tab === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={<Users className="h-5 w-5 text-blue-600" />} label="المستخدمون" value={regularUsers.length} sub={`${verifiedCount} موثّق · ${blockedCount} محظور`} color="bg-blue-50" />
              <StatCard icon={<Building2 className="h-5 w-5 text-emerald-600" />} label="الإعلانات النشطة" value={activeCount} sub={`من أصل ${listings.length}`} color="bg-emerald-50" />
              <StatCard icon={<Clock className="h-5 w-5 text-amber-600" />} label="قيد المراجعة" value={pendingCount} sub="تنتظر قرارك" color="bg-amber-50" />
              <StatCard icon={<Eye className="h-5 w-5 text-indigo-600" />} label="إجمالي المشاهدات" value={fmt(totalViews)} sub="على كل الإعلانات" color="bg-indigo-50" />
              <StatCard icon={<BadgeDollarSign className="h-5 w-5 text-purple-600" />} label="الإيرادات" value={`${fmt(revenue)} ₪`} sub="من الباقات المدفوعة" color="bg-purple-50" />
              <StatCard icon={<FileCheck2 className="h-5 w-5 text-rose-600" />} label="طلبات التوثيق" value={verifReqs.length} sub="بانتظار المراجعة" color="bg-rose-50" />
              <StatCard icon={<BadgeCheck className="h-5 w-5 text-teal-600" />} label="حسابات موثّقة" value={verifiedCount} sub="مستخدم موثّق" color="bg-teal-50" />
              <StatCard icon={<XCircle className="h-5 w-5 text-red-600" />} label="إعلانات مرفوضة" value={rejectedCount} sub="تم رفضها" color="bg-red-50" />
            </div>

            {/* Pending queue */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold flex items-center gap-2">
                  <Hourglass className="h-4 w-4 text-amber-600" /> إعلانات تنتظر المراجعة
                </h2>
                {pendingCount > 0 && (
                  <button onClick={() => { setTab("listings"); setListingFilter("pending"); }} className="text-sm font-bold text-primary hover:underline">
                    عرض الكل ←
                  </button>
                )}
              </div>
              {pendingCount === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">لا توجد إعلانات بانتظار المراجعة 🎉</p>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {listings.filter((l) => l.status === "pending").slice(0, 6).map((l) => (
                    <button key={l.id} onClick={() => setReview(l)} className="text-right flex gap-3 rounded-xl border border-border p-2 hover:border-primary transition">
                      <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {l.images[0] && <img src={l.images[0]} alt="" className="h-full w-full object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">{l.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{l.ownerName} · {l.city}</p>
                        <p className="text-xs font-bold text-primary mt-0.5">{fmt(l.price)} ₪</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h2 className="font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> توزيع حالات الإعلانات
              </h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                {(["active", "pending", "rejected"] as ListingStatus[]).map((s) => {
                  const count = listings.filter((l) => l.status === s).length;
                  const pct = listings.length ? Math.round((count / listings.length) * 100) : 0;
                  return (
                    <div key={s} className={cn("rounded-xl p-4", STATUS_CONFIG[s].cls)}>
                      <p className="text-2xl font-extrabold">{count}</p>
                      <p className="text-sm font-bold mt-0.5">{STATUS_CONFIG[s].label}</p>
                      <div className="mt-2 h-1.5 rounded-full bg-black/10">
                        <div className="h-full rounded-full bg-current opacity-50" style={{ width: `${pct}%` }} />
                      </div>
                      <p className="text-xs mt-1 opacity-70">{pct}%</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===== LISTINGS ===== */}
        {tab === "listings" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={listingSearch}
                  onChange={(e) => setListingSearch(e.target.value)}
                  placeholder="ابحث بالعنوان أو المدينة أو المالك..."
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm pr-9 focus:outline-none focus:border-primary"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {(["all", "pending", "active", "rejected"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setListingFilter(s)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-bold transition",
                      listingFilter === s ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted",
                    )}
                  >
                    {s === "all" ? `الكل (${listings.length})` : `${STATUS_CONFIG[s].label} (${listings.filter((l) => l.status === s).length})`}
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <FilterSelect
                value={listingSort}
                onChange={(v) => setListingSort(v as ListingSort)}
                icon={<ArrowDownUp className="h-4 w-4" />}
                options={[
                  { value: "newest", label: "الأحدث" },
                  { value: "oldest", label: "الأقدم" },
                  { value: "views", label: "الأكثر مشاهدة" },
                  { value: "priceHigh", label: "الأعلى سعراً" },
                  { value: "priceLow", label: "الأقل سعراً" },
                ]}
              />
              <FilterSelect
                value={listingType}
                onChange={(v) => setListingType(v as PropListingType | "all")}
                options={[
                  { value: "all", label: "كل أنواع العروض" },
                  ...Object.entries(LISTING_TYPE_LABELS).map(([value, label]) => ({ value, label })),
                ]}
              />
              <FilterSelect
                value={listingPropType}
                onChange={(v) => setListingPropType(v as PropertyType | "all")}
                options={[
                  { value: "all", label: "كل أنواع العقارات" },
                  ...Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => ({ value, label })),
                ]}
              />
              <FilterSelect
                value={listingCity}
                onChange={setListingCity}
                icon={<MapPin className="h-4 w-4" />}
                options={[
                  { value: "all", label: "كل المدن" },
                  ...cityOptions.map((c) => ({ value: c, label: c })),
                ]}
              />
              <div className="flex gap-1">
                {([
                  ["all", "الكل", null],
                  ["featured", "مميز", <Star key="s" className="h-3 w-3" />],
                  ["urgent", "عاجل", <Zap key="z" className="h-3 w-3" />],
                  ["homepage", "الرئيسية", <Home key="h" className="h-3 w-3" />],
                ] as const).map(([key, label, icon]) => (
                  <button
                    key={key}
                    onClick={() => setListingPromo(key)}
                    className={cn(
                      "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-bold transition",
                      listingPromo === key ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted",
                    )}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
              {listingFiltersActive && (
                <button
                  onClick={resetListingFilters}
                  className="flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-muted transition"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> مسح الفلاتر
                </button>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              عرض <b className="text-foreground">{filteredListings.length}</b> من أصل {listings.length} إعلان
            </p>

            {filteredListings.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
                لا توجد إعلانات مطابقة
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredListings.map((l) => (
                  <div key={l.id} className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
                    <div className="relative h-40 bg-muted">
                      {l.images[0] ? (
                        <img src={l.images[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center text-muted-foreground"><ImageIcon className="h-8 w-8" /></div>
                      )}
                      <span className={cn("absolute top-2 right-2 rounded-full px-2.5 py-0.5 text-xs font-bold", STATUS_CONFIG[l.status].cls)}>
                        {STATUS_CONFIG[l.status].label}
                      </span>
                      <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" /> {l.images.length}
                      </span>
                      {(l.isFeatured || l.isUrgent) && (
                        <div className="absolute bottom-2 left-2 flex gap-1">
                          {l.isFeatured && <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">مميز</span>}
                          {l.isUrgent && <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">عاجل</span>}
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <p className="font-bold truncate">{l.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {PROPERTY_TYPE_LABELS[l.propertyType]} · {LISTING_TYPE_LABELS[l.listingType]} · {l.city}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-extrabold text-primary">{fmt(l.price)} ₪</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {fmt(l.views ?? 0)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{l.ownerName} · {fmtDate(l.createdAt)}</p>
                      <div className="mt-3 flex gap-2 pt-3 border-t border-border">
                        <button onClick={() => setReview(l)} className="flex-1 rounded-lg bg-foreground px-3 py-2 text-xs font-bold text-background hover:opacity-90 transition">
                          مراجعة كاملة
                        </button>
                        {l.status !== "active" && (
                          <button onClick={() => accept(l.id)} title="قبول" className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition">
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        )}
                        {l.status !== "rejected" && (
                          <button onClick={() => setReview(l)} title="رفض" className="grid h-9 w-9 place-items-center rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition">
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== USERS ===== */}
        {tab === "users" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="ابحث بالاسم أو البريد أو الجوال..."
                  className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm pr-9 focus:outline-none focus:border-primary"
                />
              </div>
              <FilterSelect
                value={userSort}
                onChange={(v) => setUserSort(v as UserSort)}
                icon={<ArrowDownUp className="h-4 w-4" />}
                options={[
                  { value: "newest", label: "الأحدث تسجيلاً" },
                  { value: "oldest", label: "الأقدم تسجيلاً" },
                  { value: "name", label: "الاسم (أ-ي)" },
                ]}
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1 flex-wrap">
                {([
                  ["all", "الكل", regularUsers.length],
                  ["verified", "موثّق", verifiedCount],
                  ["unverified", "غير موثّق", unverifiedCount],
                  ["pending", "طلب توثيق", pendingVerifCount],
                  ["blocked", "محظور", blockedCount],
                ] as const).map(([key, label, count]) => (
                  <button
                    key={key}
                    onClick={() => setUserFilter(key)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs font-bold transition",
                      userFilter === key ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted",
                    )}
                  >
                    {label} ({count})
                  </button>
                ))}
              </div>
              <span className="text-sm text-muted-foreground mr-auto">
                عرض <b className="text-foreground">{filteredUsers.length}</b> مستخدم
              </span>
            </div>

            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-right">
                      <th className="px-4 py-3 font-bold">المستخدم</th>
                      <th className="px-4 py-3 font-bold">التواصل</th>
                      <th className="px-4 py-3 font-bold">الحالة</th>
                      <th className="px-4 py-3 font-bold">التسجيل</th>
                      <th className="px-4 py-3 font-bold">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">{userSearch || userFilter !== "all" ? "لا توجد نتائج مطابقة" : "لا يوجد مستخدمون بعد"}</td></tr>
                    ) : (
                      filteredUsers.map((u) => (
                        <tr key={u.id} className={cn("border-b border-border last:border-0 transition", u.blocked ? "bg-red-50/40" : "hover:bg-muted/30")}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">
                                {u.name[0]}
                              </div>
                              <div>
                                <span className="font-bold flex items-center gap-1">
                                  {u.name}
                                  {u.verified && <BadgeCheck className="h-3.5 w-3.5 text-success" />}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <div className="truncate max-w-[180px]">{u.email}</div>
                            <div dir="ltr" className="text-xs text-right">{u.phone}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {u.blocked ? (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">محظور</span>
                              ) : (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">نشط</span>
                              )}
                              {u.verified && <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-700">موثّق</span>}
                              {u.verificationStatus === "pending" && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">طلب توثيق</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">{fmtDate(u.createdAt)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 flex-wrap">
                              {u.blocked ? (
                                <button onClick={() => unblockUser(u.id)} className="flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs text-emerald-700 hover:bg-emerald-50 transition">
                                  <Undo2 className="h-3.5 w-3.5" /> رفع الحظر
                                </button>
                              ) : (
                                <button onClick={() => blockUser(u.id)} className="flex items-center gap-1 rounded-lg border border-orange-200 px-2.5 py-1.5 text-xs text-orange-600 hover:bg-orange-50 transition">
                                  <Ban className="h-3.5 w-3.5" /> حظر
                                </button>
                              )}
                              <button onClick={() => setUserVerified(u.id, !u.verified)} className={cn("flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs transition", u.verified ? "border-border text-muted-foreground hover:bg-muted" : "border-teal-200 text-teal-700 hover:bg-teal-50")}>
                                <BadgeCheck className="h-3.5 w-3.5" /> {u.verified ? "إلغاء التوثيق" : "توثيق"}
                              </button>
                              {confirmDeleteUser === u.id ? (
                                <span className="flex items-center gap-1">
                                  <button onClick={() => { deleteUser(u.id); setConfirmDeleteUser(null); }} className="rounded-lg bg-red-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-red-700">تأكيد</button>
                                  <button onClick={() => setConfirmDeleteUser(null)} className="rounded-lg border border-border px-2.5 py-1.5 text-xs hover:bg-muted">إلغاء</button>
                                </span>
                              ) : (
                                <button onClick={() => setConfirmDeleteUser(u.id)} className="grid h-8 w-8 place-items-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===== VERIFICATIONS ===== */}
        {tab === "verifications" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <h2 className="font-bold flex items-center gap-2">
                <FileCheck2 className="h-5 w-5 text-primary" /> طلبات توثيق الحسابات
              </h2>
              {verifReqs.length > 0 && (
                <div className="relative min-w-[220px]">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    value={verifSearch}
                    onChange={(e) => setVerifSearch(e.target.value)}
                    placeholder="ابحث بالاسم أو البريد أو الجوال..."
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm pr-9 focus:outline-none focus:border-primary"
                  />
                </div>
              )}
            </div>
            {verifReqs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
                لا توجد طلبات توثيق حالياً
              </div>
            ) : filteredVerifReqs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
                لا توجد طلبات مطابقة للبحث
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {filteredVerifReqs.map((u) => (
                  <div key={u.id} className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-center gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-full bg-primary/10 text-primary font-extrabold">{u.name[0]}</div>
                      <div className="min-w-0">
                        <p className="font-bold truncate">{u.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email} · {u.phone}</p>
                      </div>
                    </div>
                    {u.verificationNote && (
                      <div className="mt-3 rounded-xl bg-muted/50 p-3 text-sm text-foreground/90">{u.verificationNote}</div>
                    )}
                    {(u.verificationIdDoc || u.verificationLicenseDoc) && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {u.verificationIdDoc && (
                          <a href={u.verificationIdDoc} target="_blank" rel="noopener noreferrer" className="group block overflow-hidden rounded-xl border border-border">
                            <img src={u.verificationIdDoc} alt="إثبات الهوية" className="h-28 w-full object-cover transition group-hover:scale-105" />
                            <span className="block bg-muted/50 px-2 py-1 text-center text-[11px] font-bold">جواز السفر / الهوية</span>
                          </a>
                        )}
                        {u.verificationLicenseDoc && (
                          <a href={u.verificationLicenseDoc} target="_blank" rel="noopener noreferrer" className="group block overflow-hidden rounded-xl border border-border">
                            <img src={u.verificationLicenseDoc} alt="الترخيص" className="h-28 w-full object-cover transition group-hover:scale-105" />
                            <span className="block bg-muted/50 px-2 py-1 text-center text-[11px] font-bold">ترخيص شركة / بلدية</span>
                          </a>
                        )}
                      </div>
                    )}
                    {u.verificationDoc && (
                      safeHttpUrl(u.verificationDoc) ? (
                        <a href={safeHttpUrl(u.verificationDoc)} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-bold text-primary hover:underline break-all">
                          رابط الإثبات: {u.verificationDoc}
                        </a>
                      ) : (
                        <p className="mt-2 text-xs text-muted-foreground break-all">رابط الإثبات: {u.verificationDoc}</p>
                      )
                    )}
                    <div className="mt-4 flex gap-2">
                      <button onClick={() => reviewVerification(u.id, true)} className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 transition">
                        <CheckCircle className="h-4 w-4" /> توثيق الحساب
                      </button>
                      <button onClick={() => reviewVerification(u.id, false)} className="flex-1 flex items-center justify-center gap-1.5 rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 transition">
                        <XCircle className="h-4 w-4" /> رفض
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===== CITIES ===== */}
        {tab === "cities" && <CitiesPanel listings={listings} />}

        {/* ===== PACKAGES ===== */}
        {tab === "packages" && <PackagesPanel listings={listings} />}
      </div>

      {review && (
        <ReviewModal
          listing={review}
          onClose={() => setReview(null)}
          onAccept={() => accept(review.id)}
          onReject={(reason) => reject(review.id, reason)}
          onDelete={() => { deleteListing(review.id); setReview(null); }}
          onToggleFlag={(flag) => setListingFlags(review.id, { [flag]: !review[flag] })}
        />
      )}
    </div>
  );
}

function ReviewModal({
  listing: l, onClose, onAccept, onReject, onDelete, onToggleFlag,
}: {
  listing: Listing;
  onClose: () => void;
  onAccept: () => void;
  onReject: (reason: string) => void;
  onDelete: () => void;
  onToggleFlag: (flag: "isFeatured" | "isUrgent" | "isVerified") => void;
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const [showReject, setShowReject] = useState(false);
  const [reason, setReason] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const facts: { icon: typeof BedDouble; label: string; value: string }[] = [
    { icon: Maximize2, label: "المساحة", value: `${fmt(l.size)} م²` },
    ...(l.bedrooms != null ? [{ icon: BedDouble, label: "غرف", value: String(l.bedrooms) }] : []),
    ...(l.bathrooms != null ? [{ icon: Bath, label: "حمامات", value: String(l.bathrooms) }] : []),
    ...(l.floor != null ? [{ icon: Layers, label: "الطابق", value: String(l.floor) }] : []),
    ...(l.ageYears != null ? [{ icon: Calendar, label: "عمر البناء", value: l.ageYears === 0 ? "جديد" : `${l.ageYears} سنة` }] : []),
    ...(l.furnished != null ? [{ icon: Sofa, label: "الفرش", value: l.furnished ? "مفروش" : "غير مفروش" }] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4" onClick={onClose}>
      <div
        className="relative w-full sm:max-w-4xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* sticky header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card/95 backdrop-blur px-5 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold truncate">{l.title}</h2>
              <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold", STATUS_CONFIG[l.status].cls)}>
                {STATUS_CONFIG[l.status].label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">رقم الإعلان: {l.id}</p>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Gallery */}
          <div>
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-muted">
              {l.images.length > 0 ? (
                <img src={l.images[imgIdx]} alt="" className="h-full w-full object-contain bg-black/5" />
              ) : (
                <div className="grid h-full place-items-center text-muted-foreground"><ImageIcon className="h-10 w-10" /></div>
              )}
              {l.images.length > 1 && (
                <>
                  <button onClick={() => setImgIdx((i) => (i === 0 ? l.images.length - 1 : i - 1))} className="absolute right-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-background/90 shadow hover:bg-background">
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <button onClick={() => setImgIdx((i) => (i === l.images.length - 1 ? 0 : i + 1))} className="absolute left-3 top-1/2 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full bg-background/90 shadow hover:bg-background">
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white">
                    {imgIdx + 1} / {l.images.length}
                  </div>
                </>
              )}
            </div>
            {l.images.length > 1 && (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {l.images.map((src, i) => (
                  <button key={i} onClick={() => setImgIdx(i)} className={cn("h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2", i === imgIdx ? "border-primary" : "border-transparent")}>
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Price + meta */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-2xl font-extrabold text-primary">{fmt(l.price)} ₪
              {l.listingType === "rent" && <span className="text-sm font-medium text-muted-foreground"> / شهر</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{LISTING_TYPE_LABELS[l.listingType]}</span>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">{PROPERTY_TYPE_LABELS[l.propertyType]}</span>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {fmt(l.views ?? 0)} مشاهدة</span>
            </div>
          </div>

          {/* Facts */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-2xl border border-border p-4">
            {facts.map((f) => (
              <div key={f.label} className="flex items-center gap-2">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted"><f.icon className="h-4 w-4" /></div>
                <div>
                  <div className="text-[11px] text-muted-foreground">{f.label}</div>
                  <div className="text-sm font-bold">{f.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Location */}
          <div className="rounded-2xl border border-border p-4">
            <h3 className="font-bold text-sm flex items-center gap-1.5 mb-1"><MapPin className="h-4 w-4 text-primary" /> الموقع</h3>
            <p className="text-sm text-muted-foreground">{l.address ? `${l.address} — ` : ""}{l.area}، {l.city}</p>
            {l.hideExactLocation && <p className="text-xs text-amber-600 mt-1">* طلب المعلن إخفاء الموقع الدقيق</p>}
          </div>

          {/* Description */}
          {l.description && (
            <div>
              <h3 className="font-bold text-sm mb-1">الوصف</h3>
              <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">{l.description}</p>
            </div>
          )}

          {/* Features */}
          {l.features.length > 0 && (
            <div>
              <h3 className="font-bold text-sm mb-2">المميزات</h3>
              <div className="flex flex-wrap gap-2">
                {l.features.map((f) => <span key={f} className="rounded-full border border-border px-3 py-1 text-xs">{f}</span>)}
              </div>
            </div>
          )}

          {/* Owner */}
          <div className="rounded-2xl border border-border p-4">
            <h3 className="font-bold text-sm mb-3">معلومات المعلن</h3>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /> {l.ownerName}</div>
              <a href={`tel:${l.ownerPhone}`} dir="ltr" className="flex items-center gap-2 justify-end sm:justify-start hover:text-primary"><Phone className="h-4 w-4 text-muted-foreground" /> {l.ownerPhone}</a>
              {l.ownerWhatsapp && <a href={`https://wa.me/${l.ownerWhatsapp}`} target="_blank" rel="noopener noreferrer" dir="ltr" className="flex items-center gap-2 hover:text-success"><MessageCircle className="h-4 w-4 text-muted-foreground" /> {l.ownerWhatsapp}</a>}
              {l.ownerEmail && <div className="flex items-center gap-2 truncate"><Mail className="h-4 w-4 text-muted-foreground" /> {l.ownerEmail}</div>}
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground border-t border-border pt-3">
              {l.packageId && <span>الباقة: <b className="text-foreground">{l.packageId}</b>{l.packagePrice ? ` (${l.packagePrice} ₪)` : ""}</span>}
              <span>تاريخ الإرسال: <b className="text-foreground">{fmtDate(l.submittedAt ?? l.createdAt)}</b></span>
            </div>
          </div>

          {/* Promotion flags */}
          <div className="rounded-2xl border border-border p-4">
            <h3 className="font-bold text-sm mb-2">إبراز الإعلان</h3>
            <div className="flex flex-wrap gap-2">
              <FlagToggle active={!!l.isFeatured} icon={Star} label="مميز" onClick={() => onToggleFlag("isFeatured")} />
              <FlagToggle active={!!l.isUrgent} icon={Zap} label="عاجل" onClick={() => onToggleFlag("isUrgent")} />
              <FlagToggle active={!!l.isVerified} icon={ShieldCheck} label="موثّق" onClick={() => onToggleFlag("isVerified")} />
            </div>
          </div>

          {l.status === "rejected" && l.rejectionReason && (
            <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">سبب الرفض الحالي: {l.rejectionReason}</div>
          )}
        </div>

        {/* sticky footer actions */}
        <div className="sticky bottom-0 border-t border-border bg-card/95 backdrop-blur px-5 py-3">
          {showReject ? (
            <div className="space-y-2">
              <input
                autoFocus
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="سبب الرفض (يظهر للمعلن)..."
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
              />
              <div className="flex gap-2">
                <button onClick={() => { onReject(reason.trim() || "لم يستوفِ شروط النشر"); setShowReject(false); }} className="flex-1 rounded-full bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700">
                  تأكيد الرفض
                </button>
                <button onClick={() => setShowReject(false)} className="rounded-full border border-border px-5 py-2.5 text-sm font-bold hover:bg-muted">إلغاء</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {l.status !== "active" && (
                <button onClick={onAccept} className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition">
                  <CheckCircle className="h-4 w-4" /> قبول ونشر الإعلان
                </button>
              )}
              {l.status !== "rejected" && (
                <button onClick={() => setShowReject(true)} className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 rounded-full border border-red-200 px-4 py-2.5 text-sm font-bold text-red-600 hover:bg-red-50 transition">
                  <XCircle className="h-4 w-4" /> رفض الإعلان
                </button>
              )}
              <button onClick={onDelete} className="grid h-10 w-10 place-items-center rounded-full border border-border text-muted-foreground hover:bg-red-50 hover:text-red-600 transition" title="حذف نهائي">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FlagToggle({ active, icon: Icon, label, onClick }: {
  active: boolean; icon: typeof Star; label: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition",
        active ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted",
      )}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </button>
  );
}

type CityDraft = { name: string; lat: string; lng: string; areas: string; image?: string };

const EMPTY_DRAFT: CityDraft = { name: "", lat: "", lng: "", areas: "", image: "" };

function PackagesPanel({ listings }: { listings: Listing[] }) {
  const packages = usePackages();
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const countFor = (id: string) =>
    listings.filter((l) => l.packageId === id).length;

  function save(id: string) {
    const raw = drafts[id];
    if (raw == null || raw.trim() === "") return;
    const n = Number(raw);
    if (Number.isNaN(n) || n < 0) return;
    updatePackagePrice(id, n);
    setDrafts((d) => { const next = { ...d }; delete next[id]; return next; });
  }

  function reset(id: string) {
    updatePackagePrice(id, null);
    setDrafts((d) => { const next = { ...d }; delete next[id]; return next; });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-extrabold">باقات النشر</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          عدّل أسعار الباقات التي يدفعها أصحاب الإعلانات. تنطبق التغييرات على الإعلانات الجديدة فوراً.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {packages.map((pkg) => {
          const def = DEFAULT_PACKAGES.find((d) => d.id === pkg.id);
          const changed = def && def.price !== pkg.price;
          const draft = drafts[pkg.id] ?? String(pkg.price);
          return (
            <div key={pkg.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold">{pkg.name}</h3>
                    {pkg.popular && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">الأكثر طلباً</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {pkg.durationDays} يوم · {countFor(pkg.id)} إعلان
                  </p>
                </div>
                <BadgeDollarSign className="h-5 w-5 text-purple-500 shrink-0" />
              </div>

              <ul className="mt-3 space-y-1">
                {pkg.features.map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle className="h-3 w-3 text-emerald-500 shrink-0" /> {f}
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex items-end gap-2">
                <label className="flex-1">
                  <span className="text-xs font-bold text-muted-foreground">السعر (₪)</span>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={draft}
                    onChange={(e) => setDrafts((d) => ({ ...d, [pkg.id]: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-bold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                <button
                  onClick={() => save(pkg.id)}
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition hover:opacity-90"
                >
                  <Save className="h-4 w-4" /> حفظ
                </button>
              </div>
              {changed && (
                <button
                  onClick={() => reset(pkg.id)}
                  className="mt-2 flex items-center gap-1 text-xs font-bold text-muted-foreground transition hover:text-foreground"
                >
                  <Undo2 className="h-3 w-3" /> استرجاع السعر الأصلي ({def!.price} ₪)
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CitiesPanel({ listings }: { listings: Listing[] }) {
  const cities = useCities();
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<CityDraft>(EMPTY_DRAFT);
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState<CityDraft>(EMPTY_DRAFT);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [editError, setEditError] = useState<string>("");
  const [search, setSearch] = useState("");

  const shownCities = cities.filter(
    (c) =>
      !search ||
      c.name.includes(search) ||
      c.areas.some((a) => a.includes(search)),
  );

  function startEdit(c: City) {
    setEditing(c.name);
    setDraft({
      name: c.name,
      lat: String(c.lat),
      lng: String(c.lng),
      areas: c.areas.join("، "),
      image: c.image ?? "",
    });
  }

  function parseAreas(s: string): string[] {
    return s
      .split(/[،,\n]/)
      .map((a) => a.trim())
      .filter(Boolean);
  }

  function saveEdit(originalName: string) {
    setEditError("");
    const ok = updateCity(originalName, {
      areas: parseAreas(draft.areas),
      image: draft.image || undefined,
      lat: Number(draft.lat) || 0,
      lng: Number(draft.lng) || 0,
    });
    if (!ok) { setEditError("تعذّر حفظ التعديلات (قد تكون مساحة التخزين ممتلئة)"); return; }
    setEditing(null);
  }

  function submitAdd() {
    setError("");
    const name = addDraft.name.trim();
    if (!name) { setError("اسم المدينة مطلوب"); return; }
    if (!addDraft.image) { setError("صورة المدينة مطلوبة"); return; }
    if (cities.some((c) => c.name === name)) { setError("هذه المدينة موجودة بالفعل"); return; }
    const ok = addCity({
      name,
      lat: Number(addDraft.lat) || 31.9,
      lng: Number(addDraft.lng) || 35.2,
      areas: parseAreas(addDraft.areas),
      image: addDraft.image,
    });
    if (!ok) { setError("تعذّر إضافة المدينة (قد تكون مساحة التخزين ممتلئة)"); return; }
    setAdding(false);
    setAddDraft(EMPTY_DRAFT);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-extrabold">إدارة المدن</h2>
          <p className="text-sm text-muted-foreground">
            أضف المدن، عدّل صورها ومناطقها، أو احذف ما لا تريد ظهوره · {cities.length} مدينة
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative min-w-[200px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن مدينة أو منطقة..."
              className="w-full rounded-xl border border-border bg-background px-4 py-2 text-sm pr-9 focus:outline-none focus:border-primary"
            />
          </div>
          {!adding && (
            <button
              onClick={() => { setAdding(true); setAddDraft(EMPTY_DRAFT); setError(""); }}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-hover transition shrink-0"
            >
              <Plus className="h-4 w-4" /> إضافة مدينة
            </button>
          )}
        </div>
      </div>

      {adding && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">مدينة جديدة</h3>
            <button onClick={() => setAdding(false)} className="grid h-8 w-8 place-items-center rounded-full hover:bg-muted">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <CityImageField
              image={addDraft.image}
              onChange={(img) => setAddDraft((d) => ({ ...d, image: img }))}
            />
            <div className="space-y-3">
              <CityInput label="اسم المدينة *" value={addDraft.name} onChange={(v) => setAddDraft((d) => ({ ...d, name: v }))} placeholder="مثال: سلفيت" />
              <div className="grid grid-cols-2 gap-3">
                <CityInput label="خط العرض (lat)" value={addDraft.lat} onChange={(v) => setAddDraft((d) => ({ ...d, lat: v }))} placeholder="31.90" />
                <CityInput label="خط الطول (lng)" value={addDraft.lng} onChange={(v) => setAddDraft((d) => ({ ...d, lng: v }))} placeholder="35.20" />
              </div>
              <CityInput label="المناطق (افصل بفاصلة)" value={addDraft.areas} onChange={(v) => setAddDraft((d) => ({ ...d, areas: v }))} placeholder="الحي الشرقي، وسط البلد" />
            </div>
          </div>
          {error && <p className="text-sm font-bold text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={submitAdd} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-hover transition">
              <Save className="h-4 w-4" /> حفظ المدينة
            </button>
            <button onClick={() => setAdding(false)} className="rounded-full border border-border px-5 py-2 text-sm font-bold hover:bg-muted transition">
              إلغاء
            </button>
          </div>
        </div>
      )}

      {shownCities.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          لا توجد مدن مطابقة للبحث
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {shownCities.map((c) => {
          const count = listings.filter((l) => l.city === c.name).length;
          const isEditing = editing === c.name;
          return (
            <div key={c.name} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="relative h-36 w-full bg-muted">
                {(isEditing ? draft.image : c.image) ? (
                  <img src={isEditing ? draft.image : c.image} alt={c.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center text-muted-foreground">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-2 right-3 text-white">
                  <div className="text-base font-extrabold drop-shadow">{c.name}</div>
                  <div className="text-xs font-semibold text-white/85">{count} عقار · {c.areas.length} منطقة</div>
                </div>
              </div>

              {isEditing ? (
                <div className="p-4 space-y-3">
                  <CityImageField image={draft.image} onChange={(img) => setDraft((d) => ({ ...d, image: img }))} />
                  <div className="grid grid-cols-2 gap-2">
                    <CityInput label="lat" value={draft.lat} onChange={(v) => setDraft((d) => ({ ...d, lat: v }))} />
                    <CityInput label="lng" value={draft.lng} onChange={(v) => setDraft((d) => ({ ...d, lng: v }))} />
                  </div>
                  <CityInput label="المناطق (افصل بفاصلة)" value={draft.areas} onChange={(v) => setDraft((d) => ({ ...d, areas: v }))} />
                  {editError && <p className="text-xs font-bold text-red-600">{editError}</p>}
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => saveEdit(c.name)} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary-hover transition">
                      <Save className="h-4 w-4" /> حفظ
                    </button>
                    <button onClick={() => { setEditing(null); setEditError(""); }} className="rounded-full border border-border px-4 py-2 text-sm font-bold hover:bg-muted transition">
                      إلغاء
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  {c.areas.length > 0 && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{c.areas.join("، ")}</p>
                  )}
                  {confirmDelete === c.name ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-red-600">تأكيد الحذف؟</span>
                      <button onClick={() => { deleteCity(c.name); setConfirmDelete(null); }} className="rounded-full bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition">
                        نعم، احذف
                      </button>
                      <button onClick={() => setConfirmDelete(null)} className="rounded-full border border-border px-3 py-1.5 text-xs font-bold hover:bg-muted transition">
                        تراجع
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(c)} className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-bold hover:bg-muted transition">
                        <Pencil className="h-3.5 w-3.5" /> تعديل
                      </button>
                      <button onClick={() => setConfirmDelete(c.name)} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 transition">
                        <Trash2 className="h-3.5 w-3.5" /> حذف
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CityInput({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-primary"
      />
    </label>
  );
}

function CityImageField({ image, onChange }: { image?: string; onChange: (img: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      onChange(dataUrl);
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <span className="mb-1 block text-xs font-bold text-muted-foreground">صورة المدينة</span>
      <div className="relative h-32 w-full overflow-hidden rounded-xl border border-dashed border-border bg-muted/40">
        {image ? (
          <img src={image} alt="معاينة" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">
            <ImageIcon className="h-7 w-7" />
          </div>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute inset-x-2 bottom-2 inline-flex items-center justify-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-bold shadow hover:bg-background transition"
        >
          <Upload className="h-3.5 w-3.5" /> {busy ? "جارٍ الرفع..." : image ? "تغيير الصورة" : "رفع صورة"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
