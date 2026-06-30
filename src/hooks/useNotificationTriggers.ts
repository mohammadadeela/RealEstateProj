import { useEffect } from "react";
import type { AqariUser } from "@/lib/auth";
import { getUserListings, getListingById, isExpired, daysUntilExpiry, LISTINGS_EVENT } from "@/lib/listings";
import { addNotification } from "@/lib/notifications";

const SNAP_KEY = "aqari_fav_price_snapshot";
const FAV_KEY = "aqari:favorites";

/**
 * Surfaces event-driven notifications that aren't tied to a single user action:
 *  - owner reminders for listings expiring within 3 days
 *  - price-drop alerts for listings in the user's favorites
 * Runs on login and whenever listings change.
 */
export function useNotificationTriggers(user: AqariUser | null) {
  useEffect(() => {
    if (!user) return;
    const run = () => {
      // Expiry reminders for the owner's own live listings.
      for (const l of getUserListings(user.id)) {
        if (l.status !== "active" || isExpired(l)) continue;
        const d = daysUntilExpiry(l);
        if (d != null && d >= 0 && d <= 3) {
          addNotification({
            userId: user.id,
            type: "expiry_soon",
            title: "إعلانك على وشك الانتهاء",
            body: `يتبقّى ${d} يوم على انتهاء "${l.title}". جدّد الباقة لإبقائه ظاهراً.`,
            link: { to: "/my-listings" },
            dedupeKey: `expiry:${l.id}`,
          });
        }
      }

      // Price-drop watch on favorited listings (baseline captured on first run).
      try {
        const favs: string[] = JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]");
        const snap: Record<string, number> = JSON.parse(localStorage.getItem(SNAP_KEY) ?? "{}");
        const next: Record<string, number> = {};
        for (const id of favs) {
          const l = getListingById(id);
          if (!l) continue;
          const prev = snap[id];
          if (prev != null && l.price < prev) {
            addNotification({
              userId: user.id,
              type: "price_drop",
              title: "انخفض سعر عقار في مفضلتك",
              body: `${l.title}: من ${prev.toLocaleString("en-US")} ₪ إلى ${l.price.toLocaleString("en-US")} ₪`,
              link: { to: "/property/$id", params: { id } },
              dedupeKey: `pricedrop:${id}`,
            });
          }
          next[id] = l.price;
        }
        localStorage.setItem(SNAP_KEY, JSON.stringify(next));
      } catch {
        /* ignore corrupt snapshot */
      }
    };

    run();
    window.addEventListener(LISTINGS_EVENT, run);
    return () => window.removeEventListener(LISTINGS_EVENT, run);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
}
