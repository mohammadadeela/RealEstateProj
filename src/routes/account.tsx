import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  BadgeCheck, ShieldQuestion, Clock, XCircle, Lock, Eye, Hourglass,
  CheckCircle2, Ban, Plus, FileCheck2, Upload, FileText, Building2, ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { requestVerification, type VerificationStatus } from "@/lib/auth";
import { fileToCompressedDataUrl } from "@/lib/imageUtils";
import { getUserListings, initListings, LISTINGS_EVENT, type Listing } from "@/lib/listings";
import { LISTING_TYPE_LABELS, PROPERTY_TYPE_LABELS } from "@/lib/types";
import { formatPrice, formatNumber, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/Reveal";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "حسابي — عقاري" }] }),
  component: AccountPage,
});

const STATUS_LABEL: Record<Listing["status"], string> = {
  pending: "قيد المراجعة",
  active: "منشور",
  rejected: "مرفوض",
};

function AccountPage() {
  const { user, isLoggedIn } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [note, setNote] = useState("");
  const [idDoc, setIdDoc] = useState("");
  const [licenseDoc, setLicenseDoc] = useState("");
  const [uploading, setUploading] = useState<null | "id" | "license">(null);
  const [uploadError, setUploadError] = useState("");

  useEffect(() => {
    if (!user) return;
    initListings();
    const refresh = () => setListings(getUserListings(user.id));
    refresh();
    window.addEventListener(LISTINGS_EVENT, refresh);
    return () => window.removeEventListener(LISTINGS_EVENT, refresh);
  }, [user]);

  if (!isLoggedIn || !user) {
    return (
      <div className="container-page py-20 text-center max-w-md mx-auto">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
          <Lock className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-2xl font-extrabold">يجب تسجيل الدخول</h1>
        <p className="mt-2 text-muted-foreground">سجّل دخولك لعرض حسابك وإعلاناتك</p>
        <Button asChild className="mt-6 rounded-full px-8"><Link to="/auth">تسجيل الدخول</Link></Button>
      </div>
    );
  }

  const status: VerificationStatus = user.verificationStatus ?? "none";

  async function handleUpload(kind: "id" | "license", file: File | undefined) {
    if (!file) return;
    setUploadError("");
    setUploading(kind);
    try {
      const dataUrl = await fileToCompressedDataUrl(file, 1600, 0.8);
      if (kind === "id") setIdDoc(dataUrl);
      else setLicenseDoc(dataUrl);
    } catch {
      setUploadError("تعذّر رفع الملف، حاول مرة أخرى");
    } finally {
      setUploading(null);
    }
  }

  function submitVerification() {
    if (!note.trim() || !idDoc || !user) return;
    requestVerification(user.id, note.trim(), {
      idDoc,
      licenseDoc: licenseDoc || undefined,
    });
    setNote("");
    setIdDoc("");
    setLicenseDoc("");
  }

  const stats = {
    total: listings.length,
    active: listings.filter((l) => l.status === "active").length,
    pending: listings.filter((l) => l.status === "pending").length,
    views: listings.reduce((s, l) => s + (l.views ?? 0), 0),
  };

  return (
    <div className="container-page py-8 max-w-4xl">
      {/* Profile header */}
      <div className="enter-up rounded-3xl border border-border bg-gradient-to-bl from-primary/8 to-card p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary text-primary-foreground text-2xl font-extrabold">
            {user.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-extrabold">{user.name}</h1>
              {user.verified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-0.5 text-xs font-bold text-success">
                  <BadgeCheck className="h-3.5 w-3.5" /> حساب موثّق
                </span>
              )}
              {user.blocked && (
                <span className="inline-flex items-center gap-1 rounded-full bg-destructive/12 px-2.5 py-0.5 text-xs font-bold text-destructive">
                  <Ban className="h-3.5 w-3.5" /> محظور
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{user.email} · {user.phone}</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatBox label="إجمالي الإعلانات" value={stats.total} />
          <StatBox label="منشورة" value={stats.active} />
          <StatBox label="قيد المراجعة" value={stats.pending} />
          <StatBox label="إجمالي المشاهدات" value={formatNumber(stats.views)} />
        </div>
      </div>

      {/* Verification */}
      <Reveal variant="up" className="mt-6">
      <section className="rounded-3xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <FileCheck2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-extrabold">توثيق الحساب</h2>
        </div>

        {user.verified ? (
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-success/8 p-4">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-success" />
            <div>
              <p className="font-bold text-success">حسابك موثّق ✓</p>
              <p className="text-sm text-muted-foreground">تظهر شارة التوثيق على إعلاناتك وملفك، ما يزيد ثقة الباحثين.</p>
            </div>
          </div>
        ) : status === "pending" ? (
          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-warning/10 p-4">
            <Hourglass className="h-6 w-6 shrink-0 text-warning-foreground" />
            <div>
              <p className="font-bold">طلب التوثيق قيد المراجعة</p>
              <p className="text-sm text-muted-foreground">سيقوم فريق عقاري بمراجعة طلبك والرد عليك قريباً.</p>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            {status === "rejected" && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-destructive/8 px-4 py-3 text-sm text-destructive">
                <XCircle className="h-4 w-4" /> تم رفض طلب التوثيق السابق. يمكنك إرسال طلب جديد بمعلومات أوضح.
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              وثّق حسابك لتحصل على شارة الثقة. اشرح من أنت (مالك / مكتب عقاري / وسيط) وأرفق صورة إثبات الهوية.
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثلاً: أنا مكتب عقارات الأمل في رام الله، مرخّص منذ 2018..."
              className="mt-3 w-full rounded-xl border border-border bg-background p-3 text-sm min-h-[90px] resize-y focus:outline-none focus:border-primary"
              maxLength={500}
            />

            {/* Passport / ID upload — required */}
            <DocUpload
              label="صورة جواز السفر أو الهوية"
              hint="مطلوب لتوثيق الحساب"
              required
              icon={FileText}
              value={idDoc}
              busy={uploading === "id"}
              onPick={(f) => handleUpload("id", f)}
              onClear={() => setIdDoc("")}
            />

            {/* Company / municipality license upload — optional */}
            <DocUpload
              label="ترخيص شركة مرخّصة أو ترخيص من البلدية"
              hint="اختياري"
              icon={Building2}
              value={licenseDoc}
              busy={uploading === "license"}
              onPick={(f) => handleUpload("license", f)}
              onClear={() => setLicenseDoc("")}
            />

            {uploadError && (
              <p className="mt-2 text-sm text-destructive">{uploadError}</p>
            )}

            <Button
              onClick={submitVerification}
              disabled={!note.trim() || !idDoc || uploading !== null}
              className="mt-4 rounded-full px-6"
            >
              إرسال طلب التوثيق
            </Button>
          </div>
        )}
      </section>
      </Reveal>

      {/* My listings */}
      <section className="mt-6">
        <Reveal className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold">إعلاناتي</h2>
          <Button asChild size="sm" className="rounded-full gap-1">
            <Link to="/add-property"><Plus className="h-4 w-4" /> إعلان جديد</Link>
          </Button>
        </Reveal>
        {listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center text-muted-foreground">
            لا توجد إعلانات بعد. أضف أول إعلان لك!
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map((l, i) => (
              <Reveal key={l.id} variant="up" delay={(i % 6) * 80}>
              <Link
                to="/property/$id"
                params={{ id: l.id }}
                className="group flex items-start gap-3 rounded-2xl border border-border bg-card p-3 transition hover:border-primary/40 hover:shadow-md"
              >
                <div className="h-20 w-24 sm:w-28 shrink-0 overflow-hidden rounded-xl bg-muted">
                  {l.images[0] && <img src={l.images[0]} alt="" className="h-full w-full object-cover transition group-hover:scale-105" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 flex-1 block font-bold truncate group-hover:text-primary">
                      {l.title}
                    </span>
                    <StatusBadge status={l.status} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {PROPERTY_TYPE_LABELS[l.propertyType]} · {LISTING_TYPE_LABELS[l.listingType]} · {l.city}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-bold text-foreground">{formatPrice(l.price)}</span>
                    <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {formatNumber(l.views ?? 0)}</span>
                    <span>· {timeAgo(l.createdAt)}</span>
                  </div>
                  {l.status === "rejected" && l.rejectionReason && (
                    <p className="mt-1 text-xs text-destructive">سبب الرفض: {l.rejectionReason}</p>
                  )}
                </div>
                <ChevronLeft className="h-5 w-5 shrink-0 self-center text-muted-foreground transition group-hover:text-primary" />
              </Link>
              </Reveal>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function DocUpload({
  label,
  hint,
  required,
  icon: Icon,
  value,
  busy,
  onPick,
  onClear,
}: {
  label: string;
  hint: string;
  required?: boolean;
  icon: typeof FileText;
  value: string;
  busy: boolean;
  onPick: (file: File | undefined) => void;
  onClear: () => void;
}) {
  return (
    <div className="mt-3">
      <div className="flex items-center gap-1.5 text-sm font-bold">
        <Icon className="h-4 w-4 text-primary" />
        {label}
        {required && <span className="text-destructive">*</span>}
        {!required && <span className="text-xs font-normal text-muted-foreground">({hint})</span>}
      </div>
      {value ? (
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-border bg-background p-2">
          <img src={value} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-sm font-bold text-success">
              <CheckCircle2 className="h-4 w-4" /> تم الرفع
            </p>
            <p className="text-xs text-muted-foreground">{hint}</p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-destructive"
            aria-label="حذف الملف"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background px-4 py-3.5 text-sm font-bold text-muted-foreground transition hover:border-primary hover:text-primary">
          <Upload className="h-4 w-4" />
          {busy ? "جارٍ الرفع..." : "رفع صورة"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy}
            onChange={(e) => onPick(e.target.files?.[0])}
          />
        </label>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border bg-background p-3 text-center">
      <div className="text-xl font-extrabold">{value}</div>
      <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: Listing["status"] }) {
  const map = {
    pending: { cls: "bg-warning/12 text-warning-foreground", icon: Clock },
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
