import { useCurrency, CURRENCY_LIST } from "@/lib/currency";
import { cn } from "@/lib/utils";

export function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();
  return (
    <div className="flex items-center rounded-full border border-border bg-background p-0.5 text-xs font-bold gap-0.5">
      {CURRENCY_LIST.map((c) => (
        <button
          key={c.code}
          onClick={() => setCurrency(c.code)}
          title={c.label}
          className={cn(
            "rounded-full px-2.5 py-1 transition-colors min-w-[2rem] text-center",
            currency === c.code
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground hover:bg-muted",
          )}
        >
          {c.symbol}
        </button>
      ))}
    </div>
  );
}
