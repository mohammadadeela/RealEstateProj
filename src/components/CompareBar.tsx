import { Link } from "@tanstack/react-router";
import { X, Scale, ChevronUp } from "lucide-react";
import { useCompare } from "@/lib/compare";
import { getListingById } from "@/lib/listings";
import { getPropertyById } from "@/lib/mockData";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function CompareBar() {
  const compare = useCompare();
  const [collapsed, setCollapsed] = useState(false);

  if (compare.ids.length === 0) return null;

  const items = compare.ids.map(
    (id) => getListingById(id) ?? getPropertyById(id),
  );

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300",
        collapsed && "translate-y-[calc(100%-44px)]",
      )}
    >
      <div className="mx-auto max-w-5xl px-4 pb-4">
        <div className="rounded-2xl border border-border bg-background shadow-floating overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-muted/60 px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Scale className="h-4 w-4 text-primary" />
              <span>المقارنة ({compare.ids.length})</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCollapsed((v) => !v)}
                className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-muted transition"
                aria-label={collapsed ? "توسيع" : "تصغير"}
              >
                <ChevronUp
                  className={cn(
                    "h-4 w-4 transition-transform duration-300",
                    collapsed && "rotate-180",
                  )}
                />
              </button>
              <button
                onClick={compare.clear}
                className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-red-50 hover:text-red-500 transition"
                aria-label="مسح المقارنة"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Items */}
          <div className="flex items-center gap-3 overflow-x-auto px-4 py-3">
            {items.map((item, i) => {
              if (!item)
                return (
                  <div
                    key={compare.ids[i]}
                    className="flex h-16 w-28 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-border text-xs text-muted-foreground"
                  >
                    غير متاح
                  </div>
                );
              return (
                <div
                  key={item.id}
                  className="relative flex w-32 shrink-0 flex-col gap-1"
                >
                  <button
                    onClick={() => compare.remove(item.id)}
                    className="absolute -right-1 -top-1 z-10 grid h-5 w-5 place-items-center rounded-full bg-foreground text-background shadow hover:bg-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <img
                    src={item.images[0]}
                    alt={item.title}
                    className="h-16 w-full rounded-xl object-cover"
                  />
                  <p className="line-clamp-1 text-[11px] font-bold text-foreground">
                    {item.title}
                  </p>
                </div>
              );
            })}

            {/* Placeholder slots */}
            {Array.from({ length: Math.max(0, 4 - compare.ids.length) }).map(
              (_, i) => (
                <div
                  key={`placeholder-${i}`}
                  className="flex h-16 w-32 shrink-0 items-center justify-center rounded-xl border-2 border-dashed border-border text-xs text-muted-foreground"
                >
                  + أضف عقاراً
                </div>
              ),
            )}

            <Link
              to="/compare"
              className="ms-auto shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary-hover transition-colors"
            >
              مقارنة الآن
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
