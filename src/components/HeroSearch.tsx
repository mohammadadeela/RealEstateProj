import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Search, MapPin, Home as HomeIcon, Tag, BadgeDollarSign,
  ChevronDown, X, Check, Building2, Landmark, ShoppingBag,
  Briefcase, Store, TreePine, BedDouble,
} from "lucide-react";
import { type ListingType, type PropertyType } from "@/lib/types";
import { useCities } from "@/lib/cities";

const PROPERTY_OPTIONS: { value: PropertyType; label: string; icon: React.ReactNode }[] = [
  { value: "apartment", label: "شقة",          icon: <Building2 className="h-5 w-5" /> },
  { value: "house",     label: "منزل",          icon: <HomeIcon  className="h-5 w-5" /> },
  { value: "land",      label: "أرض",           icon: <Landmark  className="h-5 w-5" /> },
  { value: "shop",      label: "محل",           icon: <ShoppingBag className="h-5 w-5" /> },
  { value: "office",    label: "مكتب",          icon: <Briefcase className="h-5 w-5" /> },
  { value: "commercial",label: "تجاري",         icon: <Store     className="h-5 w-5" /> },
  { value: "farm",      label: "مزرعة / شاليه", icon: <TreePine  className="h-5 w-5" /> },
];

const LISTING_OPTIONS: { value: ListingType; label: string; color: string }[] = [
  { value: "sale",      label: "للبيع",   color: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100" },
  { value: "rent",      label: "للإيجار", color: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100" },
  { value: "guarantee", label: "للضمان",  color: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100" },
];

const PRICE_PRESETS = [
  { label: "500 ₪",       value: "500" },
  { label: "1,000 ₪",    value: "1000" },
  { label: "2,000 ₪",    value: "2000" },
  { label: "5,000 ₪",    value: "5000" },
  { label: "10,000 ₪",   value: "10000" },
  { label: "50,000 ₪",   value: "50000" },
  { label: "100,000 ₪",  value: "100000" },
  { label: "500,000 ₪",  value: "500000" },
];

function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return { open, setOpen, ref };
}

interface DropTriggerProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  placeholder: string;
  open: boolean;
  onOpen: () => void;
  onClear?: () => void;
}

function DropTrigger({ icon, label, value, placeholder, open, onOpen, onClear }: DropTriggerProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-right transition-all ${
        open ? "bg-primary/5 ring-2 ring-primary/20" : "hover:bg-muted/60"
      }`}
    >
      <span className={`shrink-0 transition-colors ${open || value ? "text-primary" : "text-muted-foreground"}`}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold text-foreground tracking-wide">{label}</div>
        <div className={`mt-0.5 truncate text-sm ${value ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
          {value || placeholder}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {value && onClear && (
          <span
            role="button"
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="grid h-5 w-5 place-items-center rounded-full bg-muted text-muted-foreground hover:bg-border hover:text-foreground transition"
          >
            <X className="h-3 w-3" />
          </span>
        )}
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </div>
    </button>
  );
}

function Panel({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`absolute top-[calc(100%+8px)] z-50 w-full min-w-[240px] origin-top rounded-2xl border border-border bg-card shadow-xl transition-all duration-200 ${
        open ? "scale-100 opacity-100 pointer-events-auto" : "scale-95 opacity-0 pointer-events-none"
      }`}
    >
      {children}
    </div>
  );
}

export function HeroSearch() {
  const navigate = useNavigate();
  const [city, setCity] = useState<string>("");
  const [citySearch, setCitySearch] = useState("");
  const [propertyType, setPropertyType] = useState<PropertyType | "">("");
  const [listingType, setListingType] = useState<ListingType | "">("");
  const [maxPrice, setMaxPrice] = useState<string>("");

  const cityDrop    = useDropdown();
  const propDrop    = useDropdown();
  const listDrop    = useDropdown();
  const priceDrop   = useDropdown();

  const cityNames = useCities().map((c) => c.name);
  const filteredCities = cityNames.filter((c) =>
    !citySearch || c.includes(citySearch),
  );

  const submit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const s: Record<string, string> = {};
    if (city)        s.city        = city;
    if (propertyType) s.propertyType = propertyType;
    if (listingType)  s.listingType  = listingType;
    if (maxPrice)     s.maxPrice     = maxPrice;
    navigate({ to: "/search", search: s });
  }, [city, propertyType, listingType, maxPrice, navigate]);

  return (
    <form
      onSubmit={submit}
      className="w-full rounded-3xl bg-background/95 backdrop-blur shadow-floating ring-1 ring-border/60 p-2 sm:p-2.5"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr_auto] divide-y sm:divide-y-0 sm:divide-s divide-border">

        {/* ── City ── */}
        <div className="relative" ref={cityDrop.ref}>
          <DropTrigger
            icon={<MapPin className="h-5 w-5" />}
            label="المدينة"
            value={city}
            placeholder="أي مدينة"
            open={cityDrop.open}
            onOpen={() => { cityDrop.setOpen((v) => !v); setCitySearch(""); }}
            onClear={() => { setCity(""); cityDrop.setOpen(false); }}
          />
          <Panel open={cityDrop.open}>
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={citySearch}
                  onChange={(e) => setCitySearch(e.target.value)}
                  placeholder="ابحث عن مدينة..."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 pr-8 text-sm focus:outline-none focus:border-primary"
                  autoFocus
                />
              </div>
            </div>
            <div className="max-h-56 overflow-y-auto p-1.5">
              <button
                type="button"
                onClick={() => { setCity(""); cityDrop.setOpen(false); }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition hover:bg-muted ${!city ? "font-bold text-primary" : ""}`}
              >
                {!city && <Check className="h-3.5 w-3.5 text-primary" />}
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                أي مدينة
              </button>
              {filteredCities.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setCity(c); cityDrop.setOpen(false); }}
                  className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition hover:bg-muted ${city === c ? "bg-primary/8 font-bold text-primary" : ""}`}
                >
                  {city === c && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  <span className="truncate">{c}</span>
                </button>
              ))}
              {filteredCities.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">لا توجد نتائج</p>
              )}
            </div>
          </Panel>
        </div>

        {/* ── Property Type ── */}
        <div className="relative" ref={propDrop.ref}>
          <DropTrigger
            icon={<HomeIcon className="h-5 w-5" />}
            label="نوع العقار"
            value={propertyType ? (PROPERTY_OPTIONS.find((o) => o.value === propertyType)?.label ?? "") : ""}
            placeholder="الكل"
            open={propDrop.open}
            onOpen={() => propDrop.setOpen((v) => !v)}
            onClear={() => { setPropertyType(""); propDrop.setOpen(false); }}
          />
          <Panel open={propDrop.open}>
            <div className="p-3">
              <button
                type="button"
                onClick={() => { setPropertyType(""); propDrop.setOpen(false); }}
                className={`mb-2 flex w-full items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition ${
                  !propertyType
                    ? "border-primary bg-primary/8 font-bold text-primary"
                    : "border-border hover:bg-muted"
                }`}
              >
                <BedDouble className="h-4 w-4" />
                جميع الأنواع
                {!propertyType && <Check className="h-3.5 w-3.5 ms-auto" />}
              </button>
              <div className="grid grid-cols-2 gap-1.5">
                {PROPERTY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { setPropertyType(opt.value); propDrop.setOpen(false); }}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition ${
                      propertyType === opt.value
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border hover:border-primary/40 hover:bg-primary/5"
                    }`}
                  >
                    <span className="shrink-0">{opt.icon}</span>
                    <span>{opt.label}</span>
                    {propertyType === opt.value && <Check className="h-3.5 w-3.5 ms-auto shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          </Panel>
        </div>

        {/* ── Listing Type ── */}
        <div className="relative" ref={listDrop.ref}>
          <DropTrigger
            icon={<Tag className="h-5 w-5" />}
            label="العرض"
            value={listingType ? (LISTING_OPTIONS.find((o) => o.value === listingType)?.label ?? "") : ""}
            placeholder="بيع أو إيجار"
            open={listDrop.open}
            onOpen={() => listDrop.setOpen((v) => !v)}
            onClear={() => { setListingType(""); listDrop.setOpen(false); }}
          />
          <Panel open={listDrop.open}>
            <div className="p-3 space-y-1.5">
              <button
                type="button"
                onClick={() => { setListingType(""); listDrop.setOpen(false); }}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold transition ${
                  !listingType
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted"
                }`}
              >
                الكل
                {!listingType && <Check className="h-4 w-4" />}
              </button>
              {LISTING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { setListingType(opt.value); listDrop.setOpen(false); }}
                  className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-bold transition ${
                    listingType === opt.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : `${opt.color} border`
                  }`}
                >
                  {opt.label}
                  {listingType === opt.value && <Check className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </Panel>
        </div>

        {/* ── Max Price ── */}
        <div className="relative" ref={priceDrop.ref}>
          <DropTrigger
            icon={<BadgeDollarSign className="h-5 w-5" />}
            label="حتى سعر"
            value={maxPrice ? `${Number(maxPrice).toLocaleString("en-US")} ₪` : ""}
            placeholder="بدون حد"
            open={priceDrop.open}
            onOpen={() => priceDrop.setOpen((v) => !v)}
            onClear={() => { setMaxPrice(""); priceDrop.setOpen(false); }}
          />
          <Panel open={priceDrop.open}>
            <div className="p-3">
              <div className="mb-3">
                <label className="mb-1.5 block text-xs font-bold text-muted-foreground">أدخل الحد الأقصى للسعر</label>
                <div className="relative">
                  <input
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value.replace(/[^0-9]/g, ""))}
                    placeholder="مثال: 200000"
                    inputMode="numeric"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 pe-8 text-sm focus:outline-none focus:border-primary"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">₪</span>
                </div>
              </div>
              <p className="mb-2 text-[11px] font-bold text-muted-foreground">اختيارات سريعة</p>
              <div className="grid grid-cols-2 gap-1.5">
                {PRICE_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => { setMaxPrice(p.value); priceDrop.setOpen(false); }}
                    className={`rounded-xl border px-3 py-2 text-center text-sm font-bold transition ${
                      maxPrice === p.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/40 hover:bg-primary/5"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </Panel>
        </div>

        {/* ── Submit ── */}
        <div className="flex items-center justify-center p-2">
          <button
            type="submit"
            className="inline-flex h-14 w-full sm:w-14 items-center justify-center gap-2 rounded-2xl bg-primary text-primary-foreground font-bold transition hover:bg-primary-hover"
            aria-label="بحث"
          >
            <Search className="h-5 w-5" />
            <span className="sm:hidden">بحث</span>
          </button>
        </div>
      </div>
    </form>
  );
}
