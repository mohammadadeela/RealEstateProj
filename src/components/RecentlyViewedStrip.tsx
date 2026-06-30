import { Link } from "@tanstack/react-router";
import { Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useRecentlyViewed } from "@/lib/recentlyViewed";
import { getListingById } from "@/lib/listings";
import { getPropertyById } from "@/lib/mockData";
import { formatPrice, formatNumber } from "@/lib/format";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import type { Property } from "@/lib/types";

export function RecentlyViewedStrip({ excludeId }: { excludeId?: string }) {
  const ids = useRecentlyViewed();
  const scrollRef = useRef<HTMLDivElement>(null);

  const items = ids
    .filter((id) => id !== excludeId)
    .map((id) => (getListingById(id) ?? getPropertyById(id)) as Property | undefined)
    .filter(Boolean)
    .slice(0, 10) as Property[];

  if (items.length === 0) return null;

  function scroll(dir: "left" | "right") {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "left" ? -260 : 260, behavior: "smooth" });
  }

  return (
    <section className="mt-16">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-extrabold">
          <Clock className="h-5 w-5 text-primary" />
          آخر ما شاهدته
        </h2>
        <div className="flex gap-1">
          <button
            onClick={() => scroll("right")}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background hover:bg-muted transition"
            aria-label="السابق"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll("left")}
            className="grid h-9 w-9 place-items-center rounded-full border border-border bg-background hover:bg-muted transition"
            aria-label="التالي"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
        style={{ scrollSnapType: "x mandatory" }}
      >
        {items.map((p) => (
          <Link
            key={p.id}
            to="/property/$id"
            params={{ id: p.id }}
            className={cn(
              "group flex w-52 shrink-0 flex-col gap-2 rounded-2xl border border-border bg-card p-2 transition hover:border-primary/40 hover:shadow-card-hover",
            )}
            style={{ scrollSnapAlign: "start" }}
          >
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
              <img
                src={p.images[0]}
                alt={p.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            <div className="px-1">
              <p className="line-clamp-1 text-[13px] font-bold group-hover:text-primary transition-colors">
                {p.title}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {p.area}، {p.city}
              </p>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[13px] font-extrabold text-foreground">
                  {formatPrice(p.price, p.currency)}
                </span>
                {p.size && (
                  <span className="text-[10px] text-muted-foreground">
                    {formatNumber(p.size)} م²
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
