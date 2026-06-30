import { Link } from "@tanstack/react-router";
import { Heart, MapPin, BedDouble, Bath, Maximize2, ShieldCheck, Flame, Scale, Check } from "lucide-react";
import type { Property } from "@/lib/types";
import { LISTING_TYPE_LABELS, PROPERTY_TYPE_LABELS } from "@/lib/types";
import { formatNumber, formatPrice, pricePerSqm } from "@/lib/format";
import { useFavorites } from "@/hooks/useFavorites";
import { useCompare } from "@/lib/compare";
import { recordSave } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface Props {
  property: Property;
  compact?: boolean;
}

export function PropertyCard({ property, compact }: Props) {
  const { has, toggle } = useFavorites();
  const compare = useCompare();
  const isFav = has(property.id);
  const inCompare = compare.has(property.id);

  const priceLabel =
    property.listingType === "rent"
      ? `${formatPrice(property.price, property.currency)} / شهر`
      : formatPrice(property.price, property.currency);
  const perSqm = pricePerSqm(property.price, property.size);

  return (
    <Link
      to="/property/$id"
      params={{ id: property.id }}
      className="group block overflow-hidden rounded-2xl bg-card card-hover"
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
        <img
          src={property.images[0]}
          alt={property.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggle(property.id);
              recordSave(property.id, isFav ? -1 : 1);
            }}
            aria-label="حفظ في المفضلة"
            className="grid h-10 w-10 place-items-center rounded-full bg-background/85 backdrop-blur transition active:scale-90 hover:scale-110 hover:bg-background"
          >
            <Heart
              className={cn(
                "h-5 w-5 transition-all duration-200",
                isFav ? "scale-110 fill-primary stroke-primary" : "stroke-foreground group-hover:stroke-primary",
              )}
            />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              compare.toggle(property.id);
            }}
            aria-label="إضافة للمقارنة"
            title={inCompare ? "في المقارنة" : compare.isFull ? "وصلت للحد الأقصى (4)" : "أضف للمقارنة"}
            className={cn(
              "grid h-10 w-10 place-items-center rounded-full backdrop-blur transition active:scale-90 hover:scale-110",
              inCompare
                ? "bg-primary text-primary-foreground"
                : "bg-background/85 text-foreground hover:bg-background",
            )}
          >
            {inCompare ? <Check className="h-5 w-5" /> : <Scale className="h-5 w-5" />}
          </button>
        </div>
        <div className="absolute top-3 right-3 flex flex-wrap gap-1.5">
          {property.isUrgent && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-primary-foreground shadow">
              <Flame className="h-3 w-3 anim-flicker" /> عاجل
            </span>
          )}
          {property.isFeatured && !property.isUrgent && (
            <span className="rounded-full bg-foreground/85 px-2.5 py-1 text-[11px] font-bold text-background shadow">
              مميز
            </span>
          )}
        </div>
      </div>

      <div className={cn("px-1 py-3", compact && "py-2")}>
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 text-[15px] font-bold text-foreground transition-colors group-hover:text-primary">
            {property.title}
          </h3>
          {property.isVerified && (
            <span
              title="عقار موثق"
              className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold text-success"
            >
              <ShieldCheck className="h-3 w-3" /> موثق
            </span>
          )}
        </div>

        <div className="mt-1 flex items-center gap-1 text-[13px] text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span className="line-clamp-1">
            {property.area}، {property.city}
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[12px] font-semibold text-foreground/80">
          {property.bedrooms != null && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/70 px-2 py-1">
              <BedDouble className="h-3.5 w-3.5 text-primary" /> {property.bedrooms}
            </span>
          )}
          {property.bathrooms != null && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/70 px-2 py-1">
              <Bath className="h-3.5 w-3.5 text-primary" /> {property.bathrooms}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted/70 px-2 py-1">
            <Maximize2 className="h-3.5 w-3.5 text-primary" /> {formatNumber(property.size)} م²
          </span>
        </div>

        <div className="mt-3 flex items-end justify-between border-t border-border/60 pt-3">
          <div>
            <div className="text-[17px] font-extrabold text-foreground">
              {priceLabel}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {PROPERTY_TYPE_LABELS[property.propertyType]} · {LISTING_TYPE_LABELS[property.listingType]}
            </div>
          </div>
          {perSqm != null && (
            <div className="text-left">
              <div className="text-[13px] font-bold text-foreground/90">{formatPrice(perSqm, property.currency)}</div>
              <div className="text-[10px] text-muted-foreground">لكل م²</div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
