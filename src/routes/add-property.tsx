import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
  CreditCard,
  Banknote,
  ImagePlus,
  AlertCircle,
  Lock,
  Ban,
  Tag,
  KeyRound,
  ShieldCheck,
  Building2,
  Home as HomeIcon,
  Landmark,
  ShoppingBag,
  Briefcase,
  Store,
  TreePine,
  MapPin,
  FileText,
  Phone,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PROPERTY_TYPE_LABELS, LISTING_TYPE_LABELS, type ListingType, type PropertyType } from "@/lib/types";
import { CURRENCY_LIST, type Currency } from "@/lib/currency";
import { useCities, cityByName } from "@/lib/cities";
import { FEATURES_POOL } from "@/lib/mockData";
import { featureEmoji } from "@/lib/featureIcons";
import { createListing } from "@/lib/listings";
import { usePackages, type PackageDef } from "@/lib/packages";
import { fileToCompressedDataUrl } from "@/lib/imageUtils";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/add-property")({
  head: () => ({ meta: [{ title: "أضف عقارك — عقاري" }] }),
  component: AddPropertyPage,
});

const STEPS = [
  "نوع الإعلان",
  "نوع العقار",
  "الموقع",
  "التفاصيل",
  "الصور",
  "التواصل",
  "الباقة والدفع",
];

const STEP_META: { icon: React.ReactNode; desc: string }[] = [
  { icon: <Tag className="h-5 w-5" />, desc: "هل تريد بيع أو تأجير عقارك؟" },
  { icon: <HomeIcon className="h-5 w-5" />, desc: "اختر نوع العقار الذي تريد عرضه" },
  { icon: <MapPin className="h-5 w-5" />, desc: "أين يقع العقار؟" },
  { icon: <FileText className="h-5 w-5" />, desc: "أضف تفاصيل ومواصفات العقار" },
  { icon: <ImagePlus className="h-5 w-5" />, desc: "أضف صوراً جذابة لعقارك" },
  { icon: <Phone className="h-5 w-5" />, desc: "كيف يتواصل المهتمون معك؟" },
  { icon: <Wallet className="h-5 w-5" />, desc: "اختر باقة النشر المناسبة" },
];

const LISTING_ICONS: Record<string, React.ReactNode> = {
  sale: <Tag className="h-5 w-5" />,
  rent: <KeyRound className="h-5 w-5" />,
  guarantee: <ShieldCheck className="h-5 w-5" />,
};

const PROPERTY_ICONS: Record<string, React.ReactNode> = {
  apartment: <Building2 className="h-5 w-5" />,
  house: <HomeIcon className="h-5 w-5" />,
  land: <Landmark className="h-5 w-5" />,
  shop: <ShoppingBag className="h-5 w-5" />,
  office: <Briefcase className="h-5 w-5" />,
  commercial: <Store className="h-5 w-5" />,
  farm: <TreePine className="h-5 w-5" />,
};

type SpecField = "bedrooms" | "bathrooms" | "floor" | "ageYears" | "furnished";

const TYPE_SPEC_FIELDS: Record<PropertyType, Record<SpecField, boolean>> = {
  house: { bedrooms: true, bathrooms: true, floor: true, ageYears: true, furnished: true },
  apartment: { bedrooms: true, bathrooms: true, floor: true, ageYears: true, furnished: true },
  farm: { bedrooms: true, bathrooms: true, floor: false, ageYears: true, furnished: true },
  office: { bedrooms: false, bathrooms: true, floor: true, ageYears: true, furnished: true },
  shop: { bedrooms: false, bathrooms: true, floor: true, ageYears: true, furnished: false },
  commercial: { bedrooms: false, bathrooms: true, floor: true, ageYears: true, furnished: false },
  land: { bedrooms: false, bathrooms: false, floor: false, ageYears: false, furnished: false },
};

const ALL_SPEC_FIELDS: Record<SpecField, boolean> = {
  bedrooms: true,
  bathrooms: true,
  floor: true,
  ageYears: true,
  furnished: true,
};

function specFieldsFor(propertyType: unknown): Record<SpecField, boolean> {
  if (typeof propertyType === "string" && propertyType in TYPE_SPEC_FIELDS) {
    return TYPE_SPEC_FIELDS[propertyType as PropertyType];
  }
  return ALL_SPEC_FIELDS;
}

type PhotoItem = { id: string; url: string; name: string; size: number; file: File };
type PayView = "packages" | "payment" | "processing" | "done";

function AddPropertyPage() {
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const cities = useCities();
  const packages = usePackages();

  const [step, setStep] = useState(0);
  const [data, setData] = useState<Record<string, any>>({ features: [], currency: "ILS" });
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [payView, setPayView] = useState<PayView>("packages");
  const [payMethod, setPayMethod] = useState<"card" | "transfer">("card");
  const [cardData, setCardData] = useState({ holder: "", number: "", expiry: "", cvv: "" });
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

  const set = (patch: Record<string, any>) => setData((d) => ({ ...d, ...patch }));

  useEffect(() => {
    return () => {
      photos.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, []);

  useEffect(() => {
    if (!user) return;
    setData((d) => ({
      ...d,
      name: d.name ?? user.name ?? "",
      phone: d.phone ?? user.phone ?? "",
      email: d.email ?? user.email ?? "",
    }));
  }, [user]);

  function addFiles(files: FileList | File[]) {
    const maxPhotos =
      packages.find((p) => p.id === data.package)?.maxPhotos ?? 15;
    const arr = Array.from(files);
    const newItems: PhotoItem[] = [];
    const errs: string[] = [];

    for (const file of arr) {
      if (!file.type.startsWith("image/")) {
        errs.push(`"${file.name}" ليس ملف صورة`);
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        errs.push(`"${file.name}" يتجاوز الحد الأقصى 5MB`);
        continue;
      }
      if (photos.length + newItems.length >= maxPhotos) {
        errs.push(`وصلت للحد الأقصى (${maxPhotos} صور)`);
        break;
      }
      newItems.push({
        id: Math.random().toString(36).slice(2),
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        file,
      });
    }

    if (errs.length > 0) {
      setErrors((e) => ({ ...e, photos: errs.join(" · ") }));
    } else {
      setErrors((e) => { const n = { ...e }; delete n.photos; return n; });
    }
    setPhotos((prev) => [...prev, ...newItems]);
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.url);
      return prev.filter((p) => p.id !== id);
    });
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }, [photos, data.package]);

  function validate(s: number): boolean {
    const e: Record<string, string> = {};
    if (s === 0 && !data.listingType) e.listingType = "اختر نوع الإعلان";
    if (s === 1 && !data.propertyType) e.propertyType = "اختر نوع العقار";
    if (s === 2 && !data.city) e.city = "اختر المدينة";
    if (s === 3) {
      if (!data.title?.trim()) e.title = "أدخل عنوان الإعلان";
      if (!data.price) e.price = "أدخل السعر";
      if (!data.size) e.size = "أدخل المساحة";
    }
    if (s === 4 && photos.length === 0) e.photos = "أضف صورة واحدة على الأقل";
    if (s === 5) {
      if (!data.name?.trim()) e.name = "أدخل الاسم الكامل";
      if (!data.phone?.trim()) e.phone = "أدخل رقم الهاتف";
      else if (!/^05\d{8}$/.test(data.phone.replace(/\s/g, ""))) e.phone = "رقم الجوال يجب أن يبدأ بـ 05 ويتكون من 10 أرقام";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (!validate(step)) return;
    if (step === 6) {
      if (!data.package) {
        setErrors({ package: "اختر باقة أولاً" });
        return;
      }
      setPayView("payment");
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function prev() {
    if (step === 6 && payView !== "packages") {
      setPayView("packages");
      return;
    }
    setStep((s) => Math.max(s - 1, 0));
  }

  function goToStep(target: number) {
    if (target >= step) return; // only jump back to already-completed steps
    if (payView !== "packages") setPayView("packages");
    setErrors({});
    setStep(target);
  }

  function validateCard(): boolean {
    const e: Record<string, string> = {};
    if (!cardData.holder.trim()) e.holder = "أدخل اسم حامل البطاقة";
    const num = cardData.number.replace(/\s/g, "");
    if (num.length !== 16) e.number = "رقم البطاقة يجب أن يكون 16 رقماً";
    if (!/^\d{2}\/\d{2}$/.test(cardData.expiry)) e.expiry = "أدخل تاريخ الانتهاء بصيغة MM/YY";
    if (!/^\d{3,4}$/.test(cardData.cvv)) e.cvv = "CVV غير صحيح";
    setCardErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submitPayment() {
    if (payMethod === "card" && !validateCard()) return;
    setPayView("processing");
    try {
      const images = await Promise.all(
        photos.map((p) => fileToCompressedDataUrl(p.file)),
      );
      const coords = cityByName(data.city);
      const jitter = () => (Math.random() - 0.5) * 0.02;
      const pkg = packages.find((p) => p.id === data.package);
      const specFields = specFieldsFor(data.propertyType);
      createListing({
        title: data.title.trim(),
        description: data.description?.trim() ?? "",
        listingType: data.listingType as ListingType,
        propertyType: data.propertyType as PropertyType,
        price: Number(data.price),
        currency: (data.currency ?? "ILS") as Currency,
        city: data.city,
        area: data.area?.trim() || data.city,
        address: data.address?.trim() || undefined,
        lat: coords ? coords.lat + jitter() : 31.9038,
        lng: coords ? coords.lng + jitter() : 35.2034,
        hideExactLocation: !!data.hideExact,
        size: Number(data.size),
        bedrooms: specFields.bedrooms && data.bedrooms ? Number(data.bedrooms) : undefined,
        bathrooms: specFields.bathrooms && data.bathrooms ? Number(data.bathrooms) : undefined,
        floor: specFields.floor && data.floor ? Number(data.floor) : undefined,
        ageYears: specFields.ageYears && data.ageYears !== undefined && data.ageYears !== "" ? Number(data.ageYears) : undefined,
        furnished: specFields.furnished ? !!data.furnished : undefined,
        features: data.features ?? [],
        images,
        ownerName: data.name?.trim() || user?.name || "",
        ownerPhone: (data.phone || user?.phone || "").replace(/\s/g, ""),
        ownerWhatsapp: data.whatsapp?.replace(/\s/g, "") || undefined,
        ownerId: user?.id,
        ownerEmail: user?.email,
        packageId: data.package,
        packagePrice: pkg?.price,
        isFeatured: !!pkg?.isFeatured,
        isUrgent: !!pkg?.isUrgent,
        onHomepage: !!pkg?.onHomepage,
      });
      setPayView("done");
    } catch (e) {
      console.error(e);
      setErrors((er) => ({ ...er, photos: "تعذر حفظ الصور، حاول مرة أخرى" }));
      setPayView("payment");
    }
  }

  if (payView === "done") {
    const pkg = packages.find((p) => p.id === data.package);
    return (
      <div className="container-page py-20 text-center max-w-lg mx-auto">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-green-100 text-green-600">
          <Check className="h-10 w-10" />
        </div>
        <h1 className="mt-6 text-3xl font-extrabold">تم استلام إعلانك!</h1>
        <p className="mt-3 text-muted-foreground">
          تم استلام إعلانك وتأكيد الدفع بنجاح. سيتم مراجعة الإعلان ونشره خلال 24 ساعة.
        </p>
        {pkg && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-bold text-primary">
            باقة {pkg.name} · {pkg.price} ₪
          </div>
        )}
        <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
          <Button asChild className="rounded-full px-8">
            <Link to="/">الصفحة الرئيسية</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full px-8">
            <Link to="/search">تصفح العقارات</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="container-page py-20 text-center max-w-md mx-auto">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
          <Lock className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-2xl font-extrabold">يجب تسجيل الدخول أولاً</h1>
        <p className="mt-2 text-muted-foreground">لإضافة عقار يجب أن يكون لديك حساب في عقاري</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild className="rounded-full px-8">
            <Link to="/auth">تسجيل الدخول</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (user?.blocked) {
    return (
      <div className="container-page py-20 text-center max-w-md mx-auto">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-destructive/10 text-destructive">
          <Ban className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-2xl font-extrabold">حسابك محظور</h1>
        <p className="mt-2 text-muted-foreground">لا يمكنك إضافة إعلانات حالياً. يرجى التواصل مع إدارة عقاري.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild variant="outline" className="rounded-full px-8">
            <Link to="/">الصفحة الرئيسية</Link>
          </Button>
        </div>
      </div>
    );
  }

  const selectedPkg = packages.find((p) => p.id === data.package);

  return (
    <div className="container-page py-8 max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            {STEP_META[step].icon}
          </div>
          <div>
            <h1 className="text-xl font-extrabold leading-tight sm:text-2xl">{STEPS[step]}</h1>
            <p className="text-sm text-muted-foreground">{STEP_META[step].desc}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground">
          الخطوة {step + 1} من {STEPS.length}
        </span>
      </div>

      <div className="mb-8 flex items-start overflow-x-auto pb-1">
        {STEPS.map((label, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <div
              key={i}
              className={cn("flex items-start", i < STEPS.length - 1 && "flex-1")}
            >
              <button
                type="button"
                onClick={() => goToStep(i)}
                disabled={!done}
                aria-label={done ? `العودة إلى: ${label}` : label}
                aria-current={current ? "step" : undefined}
                className={cn(
                  "group flex w-12 shrink-0 flex-col items-center gap-1.5 transition-all press sm:w-16",
                  done ? "cursor-pointer" : "cursor-default",
                )}
              >
                <span
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-full text-xs font-bold transition-all",
                    done && "bg-green-500 text-white group-hover:bg-green-600",
                    current && "bg-primary text-primary-foreground ring-4 ring-primary/15",
                    i > step && "bg-muted text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "text-center text-[11px] font-semibold leading-tight transition-colors sm:text-xs",
                    current ? "text-foreground" : "text-muted-foreground",
                    done && "group-hover:text-primary",
                  )}
                >
                  {label}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <span
                  className={cn(
                    "mt-[18px] h-0.5 min-w-3 flex-1 rounded-full transition-colors",
                    done ? "bg-green-500" : "bg-border",
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      <div key={`${step}-${payView}`} className="enter-up rounded-3xl border border-border bg-card p-6 sm:p-8">
        {step === 6 && payView === "payment" ? (
          <PaymentForm
            pkg={selectedPkg!}
            method={payMethod}
            setMethod={setPayMethod}
            cardData={cardData}
            setCardData={setCardData}
            cardErrors={cardErrors}
            onSubmit={submitPayment}
            onBack={() => setPayView("packages")}
            userName={user?.name ?? ""}
          />
        ) : step === 6 && payView === "processing" ? (
          <div className="py-16 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-6 text-lg font-bold">جاري معالجة الدفع...</p>
            <p className="mt-1 text-sm text-muted-foreground">يرجى الانتظار، لا تغلق الصفحة</p>
          </div>
        ) : (
          <>
            <div className="space-y-5">
              {step === 0 && (
                <>
                  <Pick
                    value={data.listingType}
                    onChange={(v) => { set({ listingType: v }); setErrors((e) => { const n = {...e}; delete n.listingType; return n; }); }}
                    options={Object.entries(LISTING_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                    icons={LISTING_ICONS}
                  />
                  {errors.listingType && <Err msg={errors.listingType} />}
                </>
              )}

              {step === 1 && (
                <>
                  <Pick
                    value={data.propertyType}
                    onChange={(v) => {
                      const f = specFieldsFor(v);
                      set({
                        propertyType: v,
                        bedrooms: f.bedrooms ? data.bedrooms : undefined,
                        bathrooms: f.bathrooms ? data.bathrooms : undefined,
                        floor: f.floor ? data.floor : undefined,
                        ageYears: f.ageYears ? data.ageYears : undefined,
                        furnished: f.furnished ? data.furnished : false,
                      });
                      setErrors((e) => { const n = {...e}; delete n.propertyType; return n; });
                    }}
                    options={Object.entries(PROPERTY_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
                    icons={PROPERTY_ICONS}
                  />
                  {errors.propertyType && <Err msg={errors.propertyType} />}
                </>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <Field label="المدينة *">
                    <select
                      className={inputCls(!!errors.city)}
                      value={data.city ?? ""}
                      onChange={(e) => { set({ city: e.target.value }); setErrors((err) => { const n = {...err}; delete n.city; return n; }); }}
                    >
                      <option value="">اختر مدينة</option>
                      {cities.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                    {errors.city && <Err msg={errors.city} />}
                  </Field>
                  <Field label="المنطقة / الحي">
                    <input className={inputCls(false)} value={data.area ?? ""} onChange={(e) => set({ area: e.target.value })} placeholder="مثلاً: الطيرة، الإرسال" />
                  </Field>
                  <Field label="العنوان التفصيلي (اختياري)">
                    <input className={inputCls(false)} value={data.address ?? ""} onChange={(e) => set({ address: e.target.value })} placeholder="الشارع، رقم المبنى..." />
                  </Field>
                  <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                    <input type="checkbox" className="accent-primary h-4 w-4" checked={!!data.hideExact} onChange={(e) => set({ hideExact: e.target.checked })} />
                    إخفاء الموقع الدقيق على الخريطة (إظهار موقع تقريبي فقط)
                  </label>
                </div>
              )}

              {step === 3 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="عنوان الإعلان *" className="sm:col-span-2">
                    <input
                      className={inputCls(!!errors.title)}
                      value={data.title ?? ""}
                      onChange={(e) => { set({ title: e.target.value }); setErrors((err) => { const n = {...err}; delete n.title; return n; }); }}
                      placeholder={data.propertyType === "land"
                        ? "مثلاً: قطعة أرض 500م² في رام الله - الطيرة"
                        : data.propertyType === "shop" || data.propertyType === "commercial"
                        ? "مثلاً: محل تجاري في وسط البلد - رام الله"
                        : data.propertyType === "office"
                        ? "مثلاً: مكتب 80م² في رام الله - الماصيون"
                        : "مثلاً: شقة 3 غرف في رام الله - الطيرة"}
                      maxLength={100}
                    />
                    {errors.title && <Err msg={errors.title} />}
                  </Field>
                  <Field label="السعر *">
                    <div className="flex gap-2">
                      <div className="flex rounded-xl border border-border bg-background overflow-hidden shrink-0">
                        {CURRENCY_LIST.map((c) => (
                          <button
                            key={c.code}
                            type="button"
                            onClick={() => set({ currency: c.code })}
                            className={cn(
                              "px-3 py-2 text-sm font-bold transition-colors",
                              data.currency === c.code
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted",
                            )}
                          >
                            {c.symbol}
                          </button>
                        ))}
                      </div>
                      <NumInput value={data.price} onChange={(v) => { set({ price: v }); setErrors((err) => { const n = {...err}; delete n.price; return n; }); }} />
                    </div>
                    {errors.price && <Err msg={errors.price} />}
                  </Field>
                  <Field label="المساحة (م²) *">
                    <NumInput value={data.size} onChange={(v) => { set({ size: v }); setErrors((err) => { const n = {...err}; delete n.size; return n; }); }} error={errors.size} />
                  </Field>
                  {specFieldsFor(data.propertyType).bedrooms && (
                    <Field label="عدد الغرف">
                      <NumInput value={data.bedrooms} onChange={(v) => set({ bedrooms: v })} />
                    </Field>
                  )}
                  {specFieldsFor(data.propertyType).bathrooms && (
                    <Field label="عدد الحمامات">
                      <NumInput value={data.bathrooms} onChange={(v) => set({ bathrooms: v })} />
                    </Field>
                  )}
                  {specFieldsFor(data.propertyType).floor && (
                    <Field label="الطابق">
                      <NumInput value={data.floor} onChange={(v) => set({ floor: v })} />
                    </Field>
                  )}
                  {specFieldsFor(data.propertyType).ageYears && (
                    <Field label="عمر البناء (سنة)">
                      <NumInput value={data.ageYears} onChange={(v) => set({ ageYears: v })} />
                    </Field>
                  )}
                  {specFieldsFor(data.propertyType).furnished && (
                    <label className="flex items-center gap-2 text-sm sm:col-span-2 cursor-pointer select-none">
                      <input type="checkbox" className="accent-primary h-4 w-4" checked={!!data.furnished} onChange={(e) => set({ furnished: e.target.checked })} />
                      العقار مفروش
                    </label>
                  )}
                  <Field label="المميزات والخدمات" className="sm:col-span-2">
                    <div className="flex flex-wrap gap-2 mt-1">
                      {FEATURES_POOL.map((f) => {
                        const active = (data.features ?? []).includes(f);
                        return (
                          <button key={f} type="button"
                            onClick={() => set({ features: active ? data.features.filter((x: string) => x !== f) : [...(data.features ?? []), f] })}
                            className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition",
                              active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-foreground/30")}>
                            <span>{featureEmoji(f)}</span>
                            {f}
                          </button>
                        );
                      })}
                    </div>
                  </Field>
                  <Field label="وصف تفصيلي" className="sm:col-span-2">
                    <textarea
                      className={cn(inputCls(false), "min-h-[120px] resize-y")}
                      value={data.description ?? ""}
                      onChange={(e) => set({ description: e.target.value })}
                      maxLength={1500}
                      placeholder="اوصف العقار، موقعه، مميزاته الإضافية..."
                    />
                    <p className="mt-1 text-xs text-muted-foreground text-left">{(data.description ?? "").length}/1500</p>
                  </Field>
                </div>
              )}

              {step === 4 && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files && addFiles(e.target.files)}
                  />
                  <div
                    className={cn(
                      "rounded-2xl border-2 border-dashed p-8 text-center transition",
                      dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30",
                    )}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                  >
                    <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-background border border-border">
                      <ImagePlus className="h-6 w-6 text-primary" />
                    </div>
                    <p className="mt-3 font-bold">اسحب الصور هنا أو انقر للرفع</p>
                    <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WebP · حد أقصى 5MB للصورة · حتى 15 صورة</p>
                    <Button className="mt-4 rounded-full" type="button" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="h-4 w-4 me-2" /> اختر الصور
                    </Button>
                  </div>

                  {errors.photos && <Err msg={errors.photos} />}

                  {photos.length > 0 && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-sm font-bold">{photos.length} صورة مرفوعة</p>
                        <button
                          type="button"
                          onClick={() => { photos.forEach((p) => URL.revokeObjectURL(p.url)); setPhotos([]); }}
                          className="text-xs text-red-500 hover:underline"
                        >
                          حذف الكل
                        </button>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        {photos.map((photo, idx) => (
                          <div key={photo.id} className="group relative aspect-square rounded-xl overflow-hidden border border-border">
                            <img src={photo.url} alt={photo.name} className="h-full w-full object-cover" />
                            {idx === 0 && (
                              <div className="absolute bottom-1 right-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] text-white font-bold">
                                رئيسية
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => removePhoto(photo.id)}
                              className="absolute top-1 left-1 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="aspect-square rounded-xl border-2 border-dashed border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition"
                        >
                          <Plus className="h-6 w-6" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {step === 5 && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="الاسم الكامل *">
                    <input
                      className={inputCls(!!errors.name)}
                      value={data.name ?? ""}
                      onChange={(e) => { set({ name: e.target.value }); setErrors((err) => { const n = {...err}; delete n.name; return n; }); }}
                      placeholder="محمد أحمد"
                    />
                    {errors.name && <Err msg={errors.name} />}
                  </Field>
                  <Field label="رقم الهاتف *">
                    <input
                      className={inputCls(!!errors.phone)}
                      inputMode="tel"
                      value={data.phone ?? ""}
                      onChange={(e) => { set({ phone: e.target.value }); setErrors((err) => { const n = {...err}; delete n.phone; return n; }); }}
                      placeholder="0599000000"
                    />
                    {errors.phone && <Err msg={errors.phone} />}
                  </Field>
                  <Field label="واتساب (اختياري)">
                    <input className={inputCls(false)} inputMode="tel" value={data.whatsapp ?? ""} onChange={(e) => set({ whatsapp: e.target.value })} placeholder="0599000000" />
                  </Field>
                  <Field label="البريد الإلكتروني (اختياري)">
                    <input className={inputCls(false)} type="email" value={data.email ?? ""} onChange={(e) => set({ email: e.target.value })} />
                  </Field>
                </div>
              )}

              {step === 6 && payView === "packages" && (
                <div>
                  <p className="text-sm text-muted-foreground mb-4">اختر الباقة المناسبة لإعلانك</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {packages.map((pkg) => (
                      <button
                        key={pkg.id}
                        type="button"
                        onClick={() => { set({ package: pkg.id }); setErrors((err) => { const n = {...err}; delete n.package; return n; }); }}
                        className={cn(
                          "press text-right rounded-2xl border-2 p-5 transition-all relative",
                          data.package === pkg.id
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border bg-card hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md",
                        )}
                      >
                        {pkg.popular && (
                          <div className="absolute -top-3 right-4 rounded-full bg-primary px-3 py-0.5 text-[10px] font-bold text-primary-foreground shadow-sm">
                            الأكثر اختياراً
                          </div>
                        )}
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-extrabold text-base">{pkg.name}</div>
                          </div>
                          <div className="text-xl font-extrabold text-primary">{pkg.price} ₪</div>
                        </div>
                        <ul className="mt-3 space-y-1">
                          {pkg.features.map((f) => (
                            <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Check className="h-3 w-3 text-green-500 shrink-0" /> {f}
                            </li>
                          ))}
                        </ul>
                        {data.package === pkg.id && (
                          <div className="mt-3 flex items-center gap-1 text-xs font-bold text-primary">
                            <Check className="h-3.5 w-3.5" /> تم الاختيار
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  {errors.package && <Err msg={errors.package} />}
                </div>
              )}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <Button type="button" variant="ghost" onClick={prev} disabled={step === 0} className="rounded-full gap-1">
                <ChevronRight className="h-4 w-4" /> السابق
              </Button>
              {step < STEPS.length - 1 ? (
                <Button type="button" onClick={next} className="rounded-full px-6 gap-1">
                  التالي <ChevronLeft className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={next}
                  className="rounded-full px-6 gap-1"
                  disabled={!data.package}
                >
                  المتابعة للدفع <ChevronLeft className="h-4 w-4" />
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      <style>{`
        .input-field {
          width: 100%;
          border: 1px solid var(--color-border);
          background: var(--color-background);
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 14px;
          font-family: inherit;
        }
        .input-field:focus {
          outline: none;
          border-color: var(--color-primary);
        }
        .input-field.error {
          border-color: #ef4444;
          background: #fef2f2;
        }
      `}</style>
    </div>
  );
}

function PaymentForm({
  pkg,
  method,
  setMethod,
  cardData,
  setCardData,
  cardErrors,
  onSubmit,
  onBack,
  userName,
}: {
  pkg: PackageDef;
  method: "card" | "transfer";
  setMethod: (m: "card" | "transfer") => void;
  cardData: { holder: string; number: string; expiry: string; cvv: string };
  setCardData: React.Dispatch<React.SetStateAction<typeof cardData>>;
  cardErrors: Record<string, string>;
  onSubmit: () => void;
  onBack: () => void;
  userName: string;
}) {
  function formatCardNumber(v: string) {
    return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  }
  function formatExpiry(v: string) {
    const d = v.replace(/\D/g, "").slice(0, 4);
    if (d.length >= 3) return d.slice(0, 2) + "/" + d.slice(2);
    return d;
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-3">
        <button type="button" onClick={onBack} className="text-muted-foreground hover:text-foreground transition">
          <ChevronRight className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-2xl font-extrabold">إتمام الدفع</h2>
          <p className="text-sm text-muted-foreground mt-0.5">باقة {pkg.name} · {pkg.price} ₪</p>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-border bg-muted/30 p-4 flex items-center justify-between">
        <div>
          <div className="font-bold">{pkg.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{pkg.features.join(" · ")}</div>
        </div>
        <div className="text-2xl font-extrabold text-primary">{pkg.price} ₪</div>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          type="button"
          onClick={() => setMethod("card")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-bold transition",
            method === "card" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-foreground/30",
          )}
        >
          <CreditCard className="h-4 w-4" /> بطاقة ائتمان
        </button>
        <button
          type="button"
          onClick={() => setMethod("transfer")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-bold transition",
            method === "transfer" ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-foreground/30",
          )}
        >
          <Banknote className="h-4 w-4" /> تحويل بنكي
        </button>
      </div>

      {method === "card" ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-5 text-primary-foreground mb-2">
            <div className="flex justify-between items-start">
              <div className="text-xs opacity-70">بطاقة الدفع</div>
              <CreditCard className="h-6 w-6 opacity-80" />
            </div>
            <div className="mt-4 text-xl font-mono tracking-widest">
              {cardData.number || "•••• •••• •••• ••••"}
            </div>
            <div className="mt-3 flex justify-between items-end">
              <div>
                <div className="text-[10px] opacity-70 uppercase">اسم الحامل</div>
                <div className="text-sm font-bold">{cardData.holder || userName || "الاسم الكامل"}</div>
              </div>
              <div>
                <div className="text-[10px] opacity-70 uppercase">انتهاء</div>
                <div className="text-sm font-bold">{cardData.expiry || "MM/YY"}</div>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-bold">اسم حامل البطاقة</label>
            <input
              className={inputCls(!!cardErrors.holder)}
              value={cardData.holder}
              onChange={(e) => setCardData((d) => ({ ...d, holder: e.target.value }))}
              placeholder="الاسم كما هو على البطاقة"
            />
            {cardErrors.holder && <Err msg={cardErrors.holder} />}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-bold">رقم البطاقة</label>
            <input
              className={cn(inputCls(!!cardErrors.number), "font-mono tracking-widest")}
              value={cardData.number}
              onChange={(e) => setCardData((d) => ({ ...d, number: formatCardNumber(e.target.value) }))}
              placeholder="1234 5678 9012 3456"
              inputMode="numeric"
              maxLength={19}
            />
            {cardErrors.number && <Err msg={cardErrors.number} />}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-bold">تاريخ الانتهاء</label>
              <input
                className={inputCls(!!cardErrors.expiry)}
                value={cardData.expiry}
                onChange={(e) => setCardData((d) => ({ ...d, expiry: formatExpiry(e.target.value) }))}
                placeholder="MM/YY"
                inputMode="numeric"
                maxLength={5}
              />
              {cardErrors.expiry && <Err msg={cardErrors.expiry} />}
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-bold">CVV</label>
              <input
                className={inputCls(!!cardErrors.cvv)}
                value={cardData.cvv}
                onChange={(e) => setCardData((d) => ({ ...d, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                placeholder="•••"
                inputMode="numeric"
                maxLength={4}
                type="password"
              />
              {cardErrors.cvv && <Err msg={cardErrors.cvv} />}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground rounded-xl bg-muted/50 p-3">
            <Lock className="h-3.5 w-3.5 shrink-0" />
            معلوماتك مشفرة وآمنة. لن يتم حفظ بيانات بطاقتك.
          </div>

          <Button type="button" onClick={onSubmit} className="w-full rounded-full h-11 font-bold text-base mt-2">
            ادفع {pkg.price} ₪ الآن
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-border bg-muted/30 p-5 space-y-3">
            <h3 className="font-bold text-base">تفاصيل التحويل البنكي</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">البنك</span>
                <span className="font-bold">بنك فلسطين</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">اسم الحساب</span>
                <span className="font-bold">شركة عقاري للتطوير</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">رقم الحساب</span>
                <span className="font-bold font-mono">123456789012</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">IBAN</span>
                <span className="font-bold font-mono text-xs">PS92PALS000000000123456789012</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">المبلغ</span>
                <span className="font-extrabold text-primary">{pkg.price} ₪</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            <strong>مهم:</strong> أرسل صورة من إيصال التحويل على واتساب: <strong>0599000000</strong> مع ذكر اسمك واسم المدينة لتفعيل الإعلان.
          </div>

          <Button type="button" onClick={onSubmit} className="w-full rounded-full h-11 font-bold text-base">
            أكّد التحويل البنكي
          </Button>
        </div>
      )}
    </div>
  );
}

function Err({ msg }: { msg: string }) {
  return (
    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
      {msg}
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <div className="mb-1.5 text-sm font-bold text-foreground">{label}</div>
      {children}
    </label>
  );
}

function NumInput({ value, onChange, error }: { value: any; onChange: (v: string) => void; error?: string }) {
  return (
    <>
      <input
        className={inputCls(!!error)}
        inputMode="numeric"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value.replace(/[^0-9]/g, ""))}
      />
      {error && <Err msg={error} />}
    </>
  );
}

function Pick({
  value,
  onChange,
  options,
  icons,
}: {
  value: any;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  icons?: Record<string, React.ReactNode>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "group press relative flex items-center gap-3 rounded-2xl border-2 p-4 text-right transition-all",
              active
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card hover:border-primary/40 hover:bg-primary/[0.03]",
            )}
          >
            {icons?.[o.value] && (
              <span
                className={cn(
                  "grid h-11 w-11 shrink-0 place-items-center rounded-xl transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground group-hover:text-primary",
                )}
              >
                {icons[o.value]}
              </span>
            )}
            <span className="font-bold">{o.label}</span>
            <span
              className={cn(
                "ms-auto grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition-all",
                active ? "border-primary bg-primary text-primary-foreground" : "border-border",
              )}
            >
              {active && <Check className="h-3 w-3" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return cn(
    "w-full rounded-xl border bg-background px-4 py-3 text-sm transition-colors focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 font-inherit",
    hasError ? "border-red-400 bg-red-50" : "border-border hover:border-foreground/20",
  );
}

function Plus({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  );
}
