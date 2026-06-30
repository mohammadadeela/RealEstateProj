import { createFileRoute, Link } from "@tanstack/react-router";
import { Scale, X, BedDouble, Bath, Maximize2, MapPin, Check, Minus } from "lucide-react";
import { useCompare } from "@/lib/compare";
import { getListingById } from "@/lib/listings";
import { getPropertyById } from "@/lib/mockData";
import { formatPrice, formatNumber } from "@/lib/format";
import { PROPERTY_TYPE_LABELS, LISTING_TYPE_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { Property } from "@/lib/types";

export const Route = createFileRoute("/compare")({
  component: ComparePage,
});

function ComparePage() {
  const compare = useCompare();
  const properties = compare.ids.map(
    (id) => (getListingById(id) ?? getPropertyById(id)) as Property | undefined,
  ).filter(Boolean) as Property[];

  if (properties.length === 0) {
    return (
      <div className="container-page py-24 text-center max-w-md mx-auto">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary/10 text-primary">
          <Scale className="h-10 w-10" />
        </div>
        <h1 className="mt-6 text-2xl font-extrabold">لا توجد عقارات للمقارنة</h1>
        <p className="mt-2 text-muted-foreground">
          أضف عقارات للمقارنة بالضغط على زر المقارنة في بطاقة كل عقار
        </p>
        <Link
          to="/search"
          className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-sm font-bold text-primary-foreground hover:bg-primary-hover"
        >
          تصفح العقارات
        </Link>
      </div>
    );
  }

  const rows: { label: string; key: keyof Property; render?: (v: unknown) => string }[] = [
    { label: "السعر", key: "price" },
    { label: "النوع", key: "propertyType" },
    { label: "نوع الإعلان", key: "listingType" },
    { label: "المدينة", key: "city" },
    { label: "الحي", key: "area" },
    { label: "المساحة", key: "size", render: (v) => `${formatNumber(v as number)} م²` },
    { label: "غرف النوم", key: "bedrooms" },
    { label: "الحمامات", key: "bathrooms" },
    { label: "الطابق", key: "floor" },
    { label: "عمر البناء", key: "ageYears", render: (v) => v === 0 ? "جديد" : `${v} سنة` },
    { label: "الفرش", key: "furnished", render: (v) => v ? "مفروش" : "غير مفروش" },
    { label: "موثّق", key: "isVerified" },
    { label: "عاجل", key: "isUrgent" },
  ];

  const colCount = properties.length;
  const gridStyle = `grid-cols-[180px_repeat(${colCount},1fr)]`;

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" /> مقارنة العقارات
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            مقارنة {properties.length} عقارات جنباً إلى جنب
          </p>
        </div>
        <button
          onClick={compare.clear}
          className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-bold text-destructive hover:bg-red-50 transition"
        >
          <X className="h-4 w-4" /> مسح الكل
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border">
        {/* Image row */}
        <div className={cn("grid min-w-[600px]", gridStyle)}>
          <div className="border-b border-border bg-muted/50 p-4 font-bold text-muted-foreground text-sm">
            العقار
          </div>
          {properties.map((p) => (
            <div key={p.id} className="relative border-b border-r border-border bg-card p-4">
              <button
                onClick={() => compare.remove(p.id)}
                className="absolute top-2 left-2 grid h-7 w-7 place-items-center rounded-full bg-background/80 backdrop-blur text-muted-foreground hover:text-destructive hover:bg-red-50 transition"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <Link to="/property/$id" params={{ id: p.id }}>
                <img
                  src={p.images[0]}
                  alt={p.title}
                  className="aspect-[4/3] w-full rounded-xl object-cover hover:opacity-90 transition"
                />
                <p className="mt-2 line-clamp-2 text-sm font-bold hover:text-primary transition-colors">
                  {p.title}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {p.area}، {p.city}
                </p>
              </Link>
            </div>
          ))}
        </div>

        {/* Data rows */}
        {rows.map((row, ri) => {
          const values = properties.map((p) => p[row.key]);
          const allSame = values.every((v) => v === values[0]);

          return (
            <div
              key={row.key}
              className={cn(
                "grid min-w-[600px]",
                gridStyle,
                ri % 2 === 0 ? "bg-background" : "bg-muted/30",
              )}
            >
              <div className="flex items-center border-r border-border p-4 text-sm font-bold text-muted-foreground">
                {row.label}
              </div>
              {properties.map((p, pi) => {
                const val = p[row.key];
                let display: React.ReactNode;

                if (val === null || val === undefined) {
                  display = <Minus className="h-4 w-4 text-muted-foreground/40" />;
                } else if (row.key === "price") {
                  display = (
                    <span className="text-base font-extrabold text-foreground">
                      {formatPrice(val as number, p.currency)}
                      {p.listingType === "rent" && (
                        <span className="text-xs font-normal text-muted-foreground"> /شهر</span>
                      )}
                    </span>
                  );
                } else if (row.key === "propertyType") {
                  display = PROPERTY_TYPE_LABELS[val as keyof typeof PROPERTY_TYPE_LABELS];
                } else if (row.key === "listingType") {
                  display = (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                      {LISTING_TYPE_LABELS[val as keyof typeof LISTING_TYPE_LABELS]}
                    </span>
                  );
                } else if (typeof val === "boolean") {
                  display = val ? (
                    <Check className="h-5 w-5 text-success" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground/40" />
                  );
                } else if (row.render) {
                  display = row.render(val);
                } else {
                  display = String(val);
                }

                const isBest =
                  !allSame &&
                  row.key === "price" &&
                  (val as number) === Math.min(...values.filter((v) => v != null) as number[]);

                return (
                  <div
                    key={pi}
                    className={cn(
                      "flex items-center border-r border-border p-4 text-sm font-semibold",
                      isBest && "bg-success/5 text-success",
                      !allSame && val === values[0] && "font-extrabold",
                    )}
                  >
                    {display}
                    {isBest && (
                      <span className="ms-2 rounded-full bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success">
                        الأرخص
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Features comparison */}
        <div className={cn("grid min-w-[600px] bg-muted/30", gridStyle)}>
          <div className="flex items-center border-r border-border p-4 text-sm font-bold text-muted-foreground">
            المميزات
          </div>
          {properties.map((p, pi) => (
            <div key={pi} className="border-r border-border p-4">
              {p.features.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {p.features.slice(0, 5).map((f) => (
                    <span
                      key={f}
                      className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold"
                    >
                      {f}
                    </span>
                  ))}
                  {p.features.length > 5 && (
                    <span className="text-[10px] text-muted-foreground">
                      +{p.features.length - 5}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </div>
          ))}
        </div>

        {/* CTA row */}
        <div className={cn("grid min-w-[600px] border-t border-border", gridStyle)}>
          <div className="p-4" />
          {properties.map((p) => (
            <div key={p.id} className="border-r border-border p-4">
              <Link
                to="/property/$id"
                params={{ id: p.id }}
                className="flex w-full items-center justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover transition-colors"
              >
                عرض التفاصيل
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
