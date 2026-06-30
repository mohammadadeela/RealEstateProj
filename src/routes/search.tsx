import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, useCallback } from "react";
import { z } from "zod";
import {
  SlidersHorizontal,
  X,
  Map as MapIcon,
  LayoutGrid,
  Search as SearchIcon,
  Pencil,
  Eraser,
} from "lucide-react";
import { PropertyCard } from "@/components/PropertyCard";
import { CategoryBar } from "@/components/CategoryBar";
import { Reveal } from "@/components/Reveal";
import { SavedSearchButton } from "@/components/SavedSearchButton";
import { useListings, isLive } from "@/lib/listings";
import { useCities } from "@/lib/cities";
import {
  LISTING_TYPE_LABELS,
  PROPERTY_TYPE_LABELS,
  type ListingType,
  type PropertyType,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PropertyMapLazy } from "@/components/PropertyMapLazy";
import type { DrawnBounds } from "@/components/PropertyMap";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  area: z.string().optional(),
  propertyType: z.string().optional(),
  listingType: z.string().optional(),
  minPrice: z.string().optional(),
  maxPrice: z.string().optional(),
  minSize: z.string().optional(),
  maxSize: z.string().optional(),
  bedrooms: z.string().optional(),
  bathrooms: z.string().optional(),
  furnished: z.string().optional(),
  verified: z.string().optional(),
  featured: z.string().optional(),
  sort: z.enum(["newest", "cheapest", "expensive", "popular", "near", "cheapest_sqm", "expensive_sqm"]).optional(),
});

export const Route = createFileRoute("/search")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "البحث عن عقار — عقاري" },
      { name: "description", content: "ابحث في آلاف العقارات حسب المدينة، النوع، السعر، والمزيد." },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/search" });
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [drawMode, setDrawMode] = useState(false);
  const [drawnBounds, setDrawnBounds] = useState<DrawnBounds | null>(null);

  const update = (patch: Record<string, string | undefined>) => {
    navigate({
      search: (prev: Record<string, string | undefined>) => {
        const next: Record<string, string | undefined> = { ...prev, ...patch };
        Object.keys(next).forEach((k) => { if (!next[k]) delete next[k]; });
        return next;
      },
    });
  };

  const clearFilters = () =>
    navigate({
      search: (prev: Record<string, string | undefined>) => {
        const kept: Record<string, string | undefined> = {};
        if (prev.q) kept.q = prev.q;
        if (prev.sort) kept.sort = prev.sort;
        return kept;
      },
    });

  const handleDrawComplete = useCallback((b: DrawnBounds) => {
    setDrawnBounds(b);
    setDrawMode(false);
  }, []);

  const clearDraw = () => {
    setDrawnBounds(null);
    setDrawMode(false);
  };

  const allListings = useListings();
  const cities = useCities();

  const results = useMemo(() => {
    let list = allListings.filter(isLive);

    if (search.q) {
      const q = search.q.toLowerCase();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.city.includes(search.q!) ||
          p.area.includes(search.q!),
      );
    }
    if (search.city) list = list.filter((p) => p.city === search.city);
    if (search.area) list = list.filter((p) => p.area === search.area);
    if (search.propertyType) list = list.filter((p) => p.propertyType === search.propertyType);
    if (search.listingType) list = list.filter((p) => p.listingType === search.listingType);
    if (search.minPrice) list = list.filter((p) => p.price >= Number(search.minPrice));
    if (search.maxPrice) list = list.filter((p) => p.price <= Number(search.maxPrice));
    if (search.minSize) list = list.filter((p) => p.size >= Number(search.minSize));
    if (search.maxSize) list = list.filter((p) => p.size <= Number(search.maxSize));
    if (search.bedrooms) list = list.filter((p) => (p.bedrooms ?? 0) >= Number(search.bedrooms));
    if (search.bathrooms) list = list.filter((p) => (p.bathrooms ?? 0) >= Number(search.bathrooms));
    if (search.furnished === "1") list = list.filter((p) => p.furnished === true);
    if (search.verified === "1") list = list.filter((p) => p.isVerified);
    if (search.featured === "1") list = list.filter((p) => p.isFeatured);

    // Map-draw geographic filter
    if (drawnBounds) {
      list = list.filter(
        (p) =>
          p.lat >= drawnBounds.south &&
          p.lat <= drawnBounds.north &&
          p.lng >= drawnBounds.west &&
          p.lng <= drawnBounds.east,
      );
    }

    switch (search.sort) {
      case "cheapest":
        list.sort((a, b) => a.price - b.price);
        break;
      case "expensive":
        list.sort((a, b) => b.price - a.price);
        break;
      case "popular":
        list.sort((a, b) => b.views - a.views);
        break;
      case "cheapest_sqm":
        list.sort((a, b) => a.price / a.size - b.price / b.size);
        break;
      case "expensive_sqm":
        list.sort((a, b) => b.price / b.size - a.price / a.size);
        break;
      case "newest":
      default:
        list.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    }

    list = [...list.filter((p) => p.isUrgent), ...list.filter((p) => !p.isUrgent)];
    return list;
  }, [search, allListings, drawnBounds]);

  const activeFiltersCount = [
    search.city,
    search.area,
    search.propertyType,
    search.listingType,
    search.minPrice,
    search.maxPrice,
    search.minSize,
    search.maxSize,
    search.bedrooms,
    search.bathrooms,
    search.furnished,
    search.verified,
    search.featured,
  ].filter(Boolean).length;

  const selectedCity = search.city ? cities.find((c) => c.name === search.city) : undefined;

  return (
    <div>
      <CategoryBar activeKey={search.propertyType ?? undefined} />

      {/* Toolbar */}
      <div className="border-b border-border bg-background sticky top-16 z-30">
        <div className="container-page flex flex-wrap items-center justify-between gap-2 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowFilters(true)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-bold hover:bg-muted"
            >
              <SlidersHorizontal className="h-4 w-4" />
              الفلاتر
              {activeFiltersCount > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-background px-3.5 py-2 text-sm font-bold text-red-600 transition hover:bg-red-50"
              >
                <X className="h-4 w-4" />
                مسح الفلاتر
              </button>
            )}
            {drawnBounds && (
              <button
                onClick={clearDraw}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3.5 py-2 text-sm font-bold text-primary transition hover:bg-primary/10"
              >
                <Eraser className="h-4 w-4" />
                مسح المنطقة المرسومة
              </button>
            )}
            <div className="text-sm text-muted-foreground font-semibold">
              {results.length} عقار
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Save search alerts */}
            <SavedSearchButton params={search as Record<string, string>} />

            {/* Draw-on-map toggle (only available in map view) */}
            <button
              onClick={() => { setViewMode("map"); setDrawMode((v) => !v); }}
              className={cn(
                "hidden md:inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm font-bold transition",
                drawMode
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background hover:bg-muted",
              )}
              title="ارسم منطقة على الخريطة"
            >
              <Pencil className="h-4 w-4" />
              <span className="hidden lg:inline">رسم منطقة</span>
            </button>

            <select
              value={search.sort ?? "newest"}
              onChange={(e) => update({ sort: e.target.value })}
              className="rounded-full border border-border bg-background px-4 py-2.5 text-sm font-semibold"
            >
              <option value="newest">الأحدث</option>
              <option value="cheapest">الأقل سعراً</option>
              <option value="expensive">الأعلى سعراً</option>
              <option value="popular">الأكثر مشاهدة</option>
              <option value="cheapest_sqm">الأقل سعراً / م²</option>
              <option value="expensive_sqm">الأعلى سعراً / م²</option>
            </select>

            <div className="hidden md:inline-flex rounded-full border border-border bg-background p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold transition",
                  viewMode === "grid" ? "bg-foreground text-background" : "text-muted-foreground",
                )}
              >
                <LayoutGrid className="h-4 w-4" />
                قائمة
              </button>
              <button
                onClick={() => setViewMode("map")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold transition",
                  viewMode === "map" ? "bg-foreground text-background" : "text-muted-foreground",
                )}
              >
                <MapIcon className="h-4 w-4" />
                خريطة
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="container-page py-6">
        {results.length === 0 ? (
          <EmptyState onClear={() => { clearFilters(); clearDraw(); }} />
        ) : viewMode === "grid" ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
            <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((p, i) => (
                <Reveal key={p.id} variant="up" delay={(i % 6) * 70}>
                  <PropertyCard property={p} />
                </Reveal>
              ))}
            </div>
            <div className="hidden lg:block sticky top-36 h-[calc(100vh-10rem)]">
              <PropertyMapLazy
                properties={results}
                drawMode={drawMode}
                drawnBounds={drawnBounds}
                onDrawComplete={handleDrawComplete}
              />
            </div>
          </div>
        ) : (
          <div className="h-[calc(100vh-12rem)]">
            <PropertyMapLazy
              properties={results}
              drawMode={drawMode}
              drawnBounds={drawnBounds}
              onDrawComplete={handleDrawComplete}
            />
          </div>
        )}
      </div>

      {/* Filters drawer */}
      {showFilters && (
        <FiltersDrawer
          search={search}
          update={update}
          onClose={() => setShowFilters(false)}
          areas={selectedCity?.areas ?? []}
          onClear={clearFilters}
          resultsCount={results.length}
          activeCount={activeFiltersCount}
        />
      )}
    </div>
  );
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="enter-up mx-auto mt-10 max-w-md text-center">
      <div className="float-slow mx-auto grid h-20 w-20 place-items-center rounded-full bg-muted">
        <SearchIcon className="h-9 w-9 text-muted-foreground" />
      </div>
      <h3 className="mt-5 text-xl font-bold">لا توجد نتائج مطابقة</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        جرّب تخفيف الفلاتر أو ابحث في مدينة أخرى.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Button onClick={onClear} className="rounded-full">إعادة ضبط الفلاتر</Button>
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/">الرئيسية</Link>
        </Button>
      </div>
    </div>
  );
}

function FiltersDrawer({
  search, update, onClose, onClear, areas, resultsCount, activeCount,
}: {
  search: z.infer<typeof searchSchema>;
  update: (p: Record<string, string | undefined>) => void;
  onClose: () => void;
  onClear: () => void;
  areas: string[];
  resultsCount: number;
  activeCount: number;
}) {
  const cityNames = useCities().map((c) => c.name);
  return (
    <div className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold">الفلاتر</h3>
            {activeCount > 0 && (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                {activeCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {activeCount > 0 && (
              <button
                onClick={onClear}
                className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-bold text-red-600 hover:bg-red-50"
              >
                <X className="h-4 w-4" /> مسح الفلاتر
              </button>
            )}
            <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          <FilterGroup label="نوع العرض">
            <ChipGroup
              value={search.listingType}
              onChange={(v) => update({ listingType: v })}
              options={Object.entries(LISTING_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
            />
          </FilterGroup>
          <FilterGroup label="نوع العقار">
            <ChipGroup
              value={search.propertyType}
              onChange={(v) => update({ propertyType: v })}
              options={Object.entries(PROPERTY_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v }))}
            />
          </FilterGroup>
          <FilterGroup label="المدينة">
            <Select
              value={search.city ?? ""}
              onChange={(v) => update({ city: v, area: undefined })}
              options={[{ value: "", label: "أي مدينة" }, ...cityNames.map((c) => ({ value: c, label: c }))]}
            />
          </FilterGroup>
          {areas.length > 0 && (
            <FilterGroup label="المنطقة">
              <Select
                value={search.area ?? ""}
                onChange={(v) => update({ area: v })}
                options={[{ value: "", label: "كل المناطق" }, ...areas.map((a) => ({ value: a, label: a }))]}
              />
            </FilterGroup>
          )}
          <FilterGroup label="السعر (₪)">
            <div className="grid grid-cols-2 gap-2">
              <NumInput value={search.minPrice} onChange={(v) => update({ minPrice: v })} placeholder="من" />
              <NumInput value={search.maxPrice} onChange={(v) => update({ maxPrice: v })} placeholder="إلى" />
            </div>
          </FilterGroup>
          <FilterGroup label="المساحة (م²)">
            <div className="grid grid-cols-2 gap-2">
              <NumInput value={search.minSize} onChange={(v) => update({ minSize: v })} placeholder="من" />
              <NumInput value={search.maxSize} onChange={(v) => update({ maxSize: v })} placeholder="إلى" />
            </div>
          </FilterGroup>
          <FilterGroup label="عدد الغرف (الحد الأدنى)">
            <ChipGroup
              value={search.bedrooms}
              onChange={(v) => update({ bedrooms: v })}
              options={["1", "2", "3", "4", "5"].map((n) => ({ value: n, label: `+${n}` }))}
            />
          </FilterGroup>
          <FilterGroup label="عدد الحمامات (الحد الأدنى)">
            <ChipGroup
              value={search.bathrooms}
              onChange={(v) => update({ bathrooms: v })}
              options={["1", "2", "3", "4"].map((n) => ({ value: n, label: `+${n}` }))}
            />
          </FilterGroup>
          <FilterGroup label="خيارات إضافية">
            <div className="space-y-2">
              <CheckRow checked={search.furnished === "1"} onChange={(v) => update({ furnished: v ? "1" : undefined })} label="مفروش فقط" />
              <CheckRow checked={search.verified === "1"} onChange={(v) => update({ verified: v ? "1" : undefined })} label="عقار موثق فقط" />
              <CheckRow checked={search.featured === "1"} onChange={(v) => update({ featured: v ? "1" : undefined })} label="مميز فقط" />
            </div>
          </FilterGroup>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-5 py-4">
          <Button variant="ghost" onClick={onClear} disabled={activeCount === 0} className="rounded-full disabled:opacity-40">
            مسح الكل{activeCount > 0 ? ` (${activeCount})` : ""}
          </Button>
          <Button onClick={onClose} className="rounded-full px-6">
            عرض {resultsCount} نتيجة
          </Button>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-sm font-bold text-foreground">{label}</div>
      {children}
    </div>
  );
}

function ChipGroup({ value, onChange, options }: { value: string | undefined; onChange: (v: string | undefined) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(active ? undefined : o.value)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-semibold transition",
              active ? "border-foreground bg-foreground text-background" : "border-border bg-background text-foreground hover:bg-muted",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function NumInput({ value, onChange, placeholder }: { value: string | undefined; onChange: (v: string | undefined) => void; placeholder: string }) {
  return (
    <input
      inputMode="numeric"
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ""); onChange(v || undefined); }}
      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm"
    />
  );
}

function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 cursor-pointer hover:bg-muted">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-primary" />
      <span className="text-sm font-semibold">{label}</span>
    </label>
  );
}
