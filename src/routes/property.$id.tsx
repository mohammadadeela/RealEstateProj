import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  Heart, MapPin, BedDouble, Bath, Maximize2, Layers, Calendar, Sofa,
  ShieldCheck, Phone, MessageCircle, Share2, Flag, ChevronLeft, ChevronRight,
  X, Eye, AlertTriangle,
} from "lucide-react";
import { getPropertyById, getSimilarProperties } from "@/lib/mockData";
import { getListingById, incrementViews, initListings, getActiveListings } from "@/lib/listings";
import { LISTING_TYPE_LABELS, PROPERTY_TYPE_LABELS, type Property } from "@/lib/types";
import { formatNumber, formatPrice, timeAgo, pricePerSqm } from "@/lib/format";
import { featureEmoji } from "@/lib/featureIcons";
import { getOrCreateConversation } from "@/lib/messages";
import { useAuth } from "@/hooks/useAuth";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyMapLazy } from "@/components/PropertyMapLazy";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/useFavorites";
import { pushRecentlyViewed } from "@/lib/recentlyViewed";
import { recordView, recordContact } from "@/lib/analytics";
import { MortgageCalculator } from "@/components/MortgageCalculator";
import { ReviewSection } from "@/components/ReviewSection";
import { RecentlyViewedStrip } from "@/components/RecentlyViewedStrip";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/property/$id")({
  loader: ({ params }): { property: Property | null; id: string } => {
    return { property: getPropertyById(params.id) ?? null, id: params.id };
  },
  head: ({ loaderData }) => {
    const p = (loaderData as { property: Property | null; id: string } | undefined)?.property;
    if (!p) return { meta: [{ title: "عقار — عقاري" }] };
    const img = p.images?.[0] ?? "";
    const desc = p.description?.slice(0, 200) ?? "";
    return {
      meta: [
        { title: `${p.title} — عقاري` },
        { name: "description", content: desc },
        { property: "og:title", content: p.title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:site_name", content: "عقاري — منصة العقارات" },
        ...(img ? [{ property: "og:image", content: img }] : []),
        { name: "twitter:card", content: img ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: p.title },
        { name: "twitter:description", content: desc },
        ...(img ? [{ name: "twitter:image", content: img }] : []),
      ],
    };
  },
  errorComponent: ({ error }) => (
    <div className="container-page py-20 text-center">
      <h2 className="text-xl font-bold">حصل خطأ</h2>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
    </div>
  ),
  component: PropertyPage,
});

function PropertyPage() {
  const { property: initial, id } = Route.useLoaderData() as {
    property: Property | null;
    id: string;
  };
  const [p, setP] = useState<Property | null>(initial);
  const [resolved, setResolved] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState<number | null>(null);
  const { has, toggle } = useFavorites();
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    initListings();
    const stored = getListingById(id);
    if (stored) {
      if (stored.status === "active") {
        incrementViews(id);
        recordView(id);
        pushRecentlyViewed(id);
        setP(getListingById(id) ?? stored);
      } else {
        setP(null);
      }
    } else if (initial) {
      recordView(id);
      pushRecentlyViewed(id);
    }
    setResolved(true);
  }, [id]);

  if (!p) {
    if (!resolved && !initial) {
      return (
        <div className="container-page py-20 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      );
    }
    return (
      <div className="container-page py-20 text-center">
        <h2 className="text-2xl font-bold">العقار غير موجود</h2>
        <p className="mt-2 text-muted-foreground">قد يكون قد تم حذفه أو لم تتم الموافقة عليه بعد.</p>
        <Button asChild className="mt-6 rounded-full"><Link to="/search">عرض كل العقارات</Link></Button>
      </div>
    );
  }

  const isFav = has(p.id);
  const fromStore = getActiveListings();
  const similar = (fromStore.length
    ? fromStore.filter((x) => x.id !== p.id && x.propertyType === p.propertyType).slice(0, 4)
    : getSimilarProperties(p)) as Property[];

  const waMessage = encodeURIComponent(
    `مرحباً، أنا مهتم بإعلان العقار: ${p.title} على موقع عقاري.`,
  );

  const ownerId = (p as Property & { ownerId?: string }).ownerId ?? `owner-${p.id}`;
  const isOwnListing = isLoggedIn && user?.id === ownerId;
  const perSqm = pricePerSqm(p.price, p.size);

  function startConversation() {
    if (!isLoggedIn || !user || !p) {
      navigate({ to: "/auth" });
      return;
    }
    recordContact(p.id);
    const convo = getOrCreateConversation({
      listingId: p.id,
      listingTitle: p.title,
      listingImage: p.images[0],
      ownerId,
      ownerName: p.ownerName,
      customerId: user.id,
      customerName: user.name,
    });
    navigate({ to: "/messages", search: { c: convo.id } });
  }

  return (
    <div className="container-page py-6">
      {/* Header row */}
      <div className="enter-up mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold sm:text-3xl">{p.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-4 w-4" /> {p.area}، {p.city}
            </span>
            {p.isVerified && (
              <span className="inline-flex items-center gap-1 text-success font-semibold">
                <ShieldCheck className="h-4 w-4" /> عقار موثق
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Eye className="h-4 w-4" /> {formatNumber(p.views)} مشاهدة
            </span>
            <span>· {timeAgo(p.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggle(p.id)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-bold hover:bg-muted"
          >
            <Heart className={cn("h-4 w-4", isFav && "fill-primary stroke-primary")} />
            {isFav ? "محفوظ" : "حفظ"}
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: p.title, url: window.location.href }).catch(() => {});
              } else {
                navigator.clipboard?.writeText(window.location.href);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-bold hover:bg-muted"
          >
            <Share2 className="h-4 w-4" /> مشاركة
          </button>
        </div>
      </div>

      {/* Gallery */}
      <div className="grid min-h-[240px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-3xl sm:min-h-[340px] md:min-h-[420px]">
        <button
          onClick={() => setGalleryIdx(0)}
          className="col-span-4 md:col-span-2 row-span-2 relative overflow-hidden bg-muted"
        >
          <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover hover:scale-105 transition-transform duration-500" />
        </button>
        {p.images.slice(1, 5).map((src, i) => (
          <button
            key={i}
            onClick={() => setGalleryIdx(i + 1)}
            className={cn(
              "hidden md:block relative overflow-hidden bg-muted",
              i === 3 && "relative",
            )}
          >
            <img src={src} alt="" className="h-full w-full object-cover hover:scale-105 transition-transform duration-500" />
            {i === 3 && p.images.length > 5 && (
              <div className="absolute inset-0 grid place-items-center bg-foreground/40 text-background font-bold">
                +{p.images.length - 5} صورة
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Left column */}
        <div className="min-w-0 space-y-8">
          {/* Quick facts */}
          <Reveal variant="up">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                {LISTING_TYPE_LABELS[p.listingType]}
              </span>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold">
                {PROPERTY_TYPE_LABELS[p.propertyType]}
              </span>
              {perSqm != null && (
                <span className="rounded-full bg-muted/80 px-3 py-1 text-xs font-semibold text-muted-foreground">
                  {formatPrice(perSqm, p.currency)} / م²
                </span>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Fact icon={Maximize2} label="المساحة" value={`${formatNumber(p.size)} م²`} />
              {p.bedrooms != null && <Fact icon={BedDouble} label="غرف نوم" value={String(p.bedrooms)} />}
              {p.bathrooms != null && <Fact icon={Bath} label="حمامات" value={String(p.bathrooms)} />}
              {p.floor != null && <Fact icon={Layers} label="الطابق" value={String(p.floor)} />}
              {p.ageYears != null && <Fact icon={Calendar} label="عمر البناء" value={p.ageYears === 0 ? "جديد" : `${p.ageYears} سنة`} />}
              {p.furnished != null && <Fact icon={Sofa} label="الفرش" value={p.furnished ? "مفروش" : "غير مفروش"} />}
            </div>
          </div>
          </Reveal>

          {/* Description */}
          <Reveal variant="up">
          <section>
            <h2 className="text-xl font-bold">وصف العقار</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-foreground/90 whitespace-pre-line">
              {p.description}
            </p>
          </section>
          </Reveal>

          {/* Features */}
          {p.features.length > 0 && (
            <Reveal variant="up">
            <section>
              <h2 className="text-xl font-bold">المميزات</h2>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {p.features.map((f) => (
                  <div
                    key={f}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:shadow-sm"
                  >
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-xl">
                      {featureEmoji(f)}
                    </span>
                    <span className="text-sm font-bold">{f}</span>
                  </div>
                ))}
              </div>
            </section>
            </Reveal>
          )}

          {/* Map */}
          <Reveal variant="fade">
          <section>
            <h2 className="text-xl font-bold">الموقع على الخريطة</h2>
            <div className="mt-3 h-[360px]">
              <PropertyMapLazy properties={[p]} singleMode />
            </div>
            {p.hideExactLocation && (
              <p className="mt-2 text-xs text-muted-foreground">
                * يعرض الموقع بشكل تقريبي حفاظاً على خصوصية المعلن.
              </p>
            )}
          </section>
          </Reveal>

          {/* Mortgage calculator */}
          {p.listingType === "sale" && (
            <Reveal variant="up">
              <MortgageCalculator defaultPrice={p.price} />
            </Reveal>
          )}

          {/* Reviews */}
          <Reveal variant="up">
            <ReviewSection ownerId={ownerId} ownerName={p.ownerName} />
          </Reveal>

          {/* Disclaimer */}
          <Reveal variant="up">
          <div className="rounded-2xl border border-warning/40 bg-warning/8 p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-warning-foreground" />
            <p className="text-sm text-foreground/90">
              <strong>تنبيه:</strong> تأكد من زيارة العقار والتحقق من المعلومات قبل دفع أي مبالغ. عقاري وسيط عرض ولا يتحمل مسؤولية المعاملات المباشرة بين الأطراف.
            </p>
          </div>
          </Reveal>

          {/* Report */}
          <div>
            <button className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-destructive">
              <Flag className="h-4 w-4" /> الإبلاغ عن إعلان غير صحيح
            </button>
          </div>
        </div>

        {/* Right column - sticky contact */}
        <aside className="lg:sticky lg:top-24 lg:self-start space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="text-3xl font-extrabold text-foreground">
              {formatPrice(p.price, p.currency)}
              {p.listingType === "rent" && (
                <span className="text-base font-medium text-muted-foreground"> / شهر</span>
              )}
            </div>
            {perSqm != null && (
              <div className="mt-1 text-sm font-semibold text-muted-foreground">
                {formatPrice(perSqm, p.currency)} لكل م²
              </div>
            )}
            <div className="mt-1 text-sm text-muted-foreground">
              {PROPERTY_TYPE_LABELS[p.propertyType]} · {LISTING_TYPE_LABELS[p.listingType]}
            </div>

            <div className="mt-5 border-t border-border pt-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary font-bold">
                  {p.ownerName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="font-bold truncate">{p.ownerName}</div>
                  <div className="text-xs text-muted-foreground">معلن منذ 2024</div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {p.ownerWhatsapp && (
                  <a
                    href={`https://wa.me/${p.ownerWhatsapp}?text=${waMessage}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-2 rounded-full bg-success px-4 py-3 text-sm font-bold text-success-foreground hover:opacity-90"
                  >
                    <MessageCircle className="h-4 w-4" />
                    تواصل عبر واتساب
                  </a>
                )}
                <a
                  href={`tel:${p.ownerPhone}`}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-foreground px-4 py-3 text-sm font-bold text-background hover:opacity-90"
                >
                  <Phone className="h-4 w-4" /> اتصال {p.ownerPhone}
                </a>
                {!isOwnListing && (
                  <button
                    onClick={startConversation}
                    className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-background px-4 py-3 text-sm font-bold transition hover:bg-muted hover:border-primary/40"
                  >
                    <MessageCircle className="h-4 w-4" /> رسالة داخل الموقع
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">
            رقم الإعلان: <span className="font-mono font-bold text-foreground">{p.id}</span>
          </div>
        </aside>
      </div>

      {/* Similar */}
      {similar.length > 0 && (
        <section className="mt-16">
          <Reveal>
            <h2 className="text-2xl font-extrabold">عقارات مشابهة</h2>
          </Reveal>
          <div className="mt-6 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {similar.map((s, i) => (
              <Reveal key={s.id} variant="up" delay={(i % 4) * 90}>
                <PropertyCard property={s} />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Recently viewed */}
      <RecentlyViewedStrip excludeId={p.id} />

      {/* Full-screen gallery */}
      {galleryIdx !== null && (
        <GalleryOverlay
          images={p.images}
          start={galleryIdx}
          onClose={() => setGalleryIdx(null)}
        />
      )}
    </div>
  );
}

function Fact({
  icon: Icon, label, value,
}: { icon: typeof Maximize2; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-foreground">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="text-sm font-bold truncate">{value}</div>
      </div>
    </div>
  );
}

function GalleryOverlay({
  images, start, onClose,
}: { images: string[]; start: number; onClose: () => void }) {
  const [idx, setIdx] = useState(start);

  const prev = () => setIdx((i) => (i === 0 ? images.length - 1 : i - 1));
  const next = () => setIdx((i) => (i === images.length - 1 ? 0 : i + 1));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") next();
      else if (e.key === "ArrowRight") prev();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [images.length]);

  const btnBase =
    "grid place-items-center rounded-full bg-background/90 text-foreground shadow-lg transition duration-200 hover:scale-110 hover:bg-background active:scale-90 focus:outline-none";

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/95 animate-in fade-in duration-200"
    >
      <button
        onClick={onClose}
        aria-label="إغلاق"
        className={cn(btnBase, "absolute top-4 right-4 h-11 w-11 hover:rotate-90")}
      >
        <X className="h-5 w-5" />
      </button>
      <button
        onClick={prev}
        aria-label="السابق"
        className={cn(btnBase, "absolute right-4 top-1/2 -translate-y-1/2 h-12 w-12 hover:-translate-x-0.5")}
      >
        <ChevronRight className="h-6 w-6" />
      </button>
      <button
        onClick={next}
        aria-label="التالي"
        className={cn(btnBase, "absolute left-4 top-1/2 -translate-y-1/2 h-12 w-12 hover:translate-x-0.5")}
      >
        <ChevronLeft className="h-6 w-6" />
      </button>
      <img
        key={idx}
        src={images[idx]}
        alt=""
        className="max-h-[90vh] max-w-[92vw] object-contain animate-in fade-in zoom-in-95 duration-300"
      />
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-background/95 px-4 py-1.5 text-sm font-bold text-foreground shadow-lg">
        {idx + 1} / {images.length}
      </div>
    </div>
  );
}
