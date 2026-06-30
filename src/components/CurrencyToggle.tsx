import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Coins } from "lucide-react";
import { useCurrency, CURRENCY_LIST, type Currency } from "@/lib/currency";
import { cn } from "@/lib/utils";

export function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const active = CURRENCY_LIST.find((c) => c.code === currency)!;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="تغيير العملة"
        className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 h-10 text-sm font-bold hover:bg-muted transition"
      >
        <Coins className="h-4 w-4 text-primary" />
        <span className="min-w-[1.25rem] text-center">{active.symbol}</span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-44 rounded-2xl border border-border bg-card shadow-lg overflow-hidden z-50">
          <div className="px-3 py-2 text-[11px] font-bold text-muted-foreground border-b border-border">
            عرض الأسعار بـ
          </div>
          {CURRENCY_LIST.map((c) => (
            <button
              key={c.code}
              onClick={() => {
                setCurrency(c.code as Currency);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-sm transition hover:bg-muted",
                c.code === currency && "font-bold text-primary",
              )}
            >
              <span className="flex items-center gap-2">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-muted text-xs font-bold">{c.symbol}</span>
                {c.label}
              </span>
              {c.code === currency && <Check className="h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
