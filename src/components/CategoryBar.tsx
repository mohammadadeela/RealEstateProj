import { Link } from "@tanstack/react-router";
import {
  Home,
  Building2,
  LandPlot,
  Store,
  Building,
  TreePalm,
  Warehouse,
  Sparkles,
  ShieldCheck,
  Flame,
  Navigation,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { key: "house", label: "منازل", icon: Home, anim: "anim-bounce", params: { propertyType: "house" } },
  { key: "apartment", label: "شقق", icon: Building2, anim: "anim-rise", params: { propertyType: "apartment" } },
  { key: "land", label: "أراضي", icon: LandPlot, anim: "anim-pop", params: { propertyType: "land" } },
  { key: "shop", label: "محلات", icon: Store, anim: "anim-swing", params: { propertyType: "shop" } },
  { key: "office", label: "مكاتب", icon: Building, anim: "anim-rise", params: { propertyType: "office" } },
  { key: "farm", label: "مزارع وشاليهات", icon: TreePalm, anim: "anim-sway", params: { propertyType: "farm" } },
  { key: "commercial", label: "تجاري", icon: Warehouse, anim: "anim-pop", params: { propertyType: "commercial" } },
  { key: "new", label: "جديد", icon: Sparkles, anim: "anim-pop", params: { sort: "newest" } },
  { key: "verified", label: "موثق فقط", icon: ShieldCheck, anim: "anim-pulse", params: { verified: "1" } },
  { key: "popular", label: "الأكثر مشاهدة", icon: Flame, anim: "anim-flicker", params: { sort: "popular" } },
  { key: "near", label: "قريب مني", icon: Navigation, anim: "anim-wiggle", params: { sort: "near" } },
];

export function CategoryBar({ activeKey }: { activeKey?: string }) {
  return (
    <div className="border-b border-border bg-background">
      <div className="container-page">
        <div className="flex gap-2 overflow-x-auto py-4 scrollbar-none [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const active = c.key === activeKey;
            return (
              <Link
                key={c.key}
                to="/search"
                search={c.params}
                className={cn(
                  "cat-item group flex shrink-0 flex-col items-center gap-1.5 border-b-2 px-4 pb-2.5 pt-1 text-[12px] font-semibold transition-colors",
                  active
                    ? "is-active border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
              >
                <Icon className={cn("cat-icon h-6 w-6", c.anim)} strokeWidth={1.7} />
                <span className="whitespace-nowrap">{c.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
