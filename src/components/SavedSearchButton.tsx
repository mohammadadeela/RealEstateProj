import { useState, useRef, useEffect } from "react";
import { Bookmark, BookmarkCheck, Trash2, ChevronDown, Bell, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "@tanstack/react-router";
import {
  useSavedSearches,
  addSavedSearch,
  deleteSavedSearch,
  hasSavedSearch,
  describeSearch,
  type SearchParams,
} from "@/lib/savedSearches";
import { LISTING_TYPE_LABELS, PROPERTY_TYPE_LABELS } from "@/lib/types";
import { timeAgo } from "@/lib/format";
import { toast } from "sonner";

export function SavedSearchButton({ params }: { params: SearchParams }) {
  const { user, isLoggedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const savedSearches = useSavedSearches(user?.id);

  const hasFilters = Object.entries(params).some(
    ([k, v]) => k !== "sort" && v,
  );
  const alreadySaved = isLoggedIn && user
    ? hasSavedSearch(user.id, params)
    : false;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleSave() {
    if (!user) return;
    const name = describeSearch(params, {
      property: PROPERTY_TYPE_LABELS as Record<string, string>,
      listing: LISTING_TYPE_LABELS as Record<string, string>,
    });
    addSavedSearch(user.id, name, params);
    toast.success("تم حفظ البحث", {
      description: "ستتلقّى إشعاراً عند توفر عقار جديد يطابقه",
    });
  }

  function handleNavigate(p: SearchParams) {
    setOpen(false);
    navigate({ to: "/search", search: p as any });
  }

  if (!isLoggedIn) return null;

  return (
    <div className="relative flex items-center gap-1" ref={ref}>
      {hasFilters && !alreadySaved && (
        <button
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3.5 py-2 text-sm font-bold transition hover:bg-muted hover:border-primary/40"
        >
          <Bookmark className="h-4 w-4" />
          <span className="hidden sm:inline">حفظ البحث</span>
        </button>
      )}
      {hasFilters && alreadySaved && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3.5 py-2 text-sm font-bold text-primary">
          <BookmarkCheck className="h-4 w-4" />
          <span className="hidden sm:inline">محفوظ</span>
        </span>
      )}

      {savedSearches.length > 0 && (
        <button
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-2 text-sm font-bold transition hover:bg-muted"
        >
          <Bell className="h-4 w-4" />
          <span className="hidden sm:inline">تنبيهاتي</span>
          <span className="ms-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
            {savedSearches.length}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      )}

      {open && (
        <div className="absolute left-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card shadow-xl overflow-hidden z-50">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-extrabold">البحث المحفوظة والتنبيهات</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              إشعار تلقائي عند توفر عقار مطابق
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
            {savedSearches.length === 0 ? (
              <div className="py-10 text-center">
                <div className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
                  <Search className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  لا توجد عمليات بحث محفوظة
                </p>
              </div>
            ) : (
              savedSearches.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-2 px-4 py-3 hover:bg-muted/60 transition"
                >
                  <button
                    className="flex min-w-0 flex-1 flex-col items-start text-right"
                    onClick={() => handleNavigate(s.params)}
                  >
                    <span className="line-clamp-1 text-sm font-bold text-foreground">
                      {s.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {timeAgo(s.createdAt)}
                    </span>
                  </button>
                  <button
                    onClick={() => deleteSavedSearch(s.id)}
                    className="shrink-0 grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    aria-label="حذف"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
