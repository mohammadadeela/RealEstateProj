import { useState, useMemo } from "react";
import { Calculator, Info } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface Props {
  defaultPrice?: number;
}

export function MortgageCalculator({ defaultPrice = 0 }: Props) {
  const [price, setPrice] = useState(defaultPrice);
  const [down, setDown] = useState(Math.round(defaultPrice * 0.2));
  const [years, setYears] = useState(20);
  const [rate, setRate] = useState(6.5);
  const [currency, setCurrency] = useState<"ILS" | "USD" | "JOD">("ILS");

  const CURRENCIES = { ILS: "₪", USD: "$", JOD: "د.أ" };
  const RATES = { ILS: 1, USD: 0.273, JOD: 0.198 };

  const convert = (ils: number) => ils * RATES[currency];
  const fmt = (n: number) =>
    `${CURRENCIES[currency]} ${formatNumber(Math.round(convert(n)))}`;

  const { monthly, total, interest } = useMemo(() => {
    const principal = Math.max(0, price - down);
    if (principal === 0) return { monthly: 0, total: 0, interest: 0 };
    const monthlyRate = rate / 100 / 12;
    const n = years * 12;
    const monthly =
      monthlyRate === 0
        ? principal / n
        : (principal * monthlyRate * Math.pow(1 + monthlyRate, n)) /
          (Math.pow(1 + monthlyRate, n) - 1);
    const total = monthly * n;
    const interest = total - principal;
    return { monthly, total, interest };
  }, [price, down, years, rate]);

  const downPercent = price > 0 ? Math.round((down / price) * 100) : 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
      <div className="flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
          <Calculator className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-extrabold">حاسبة القرض العقاري</h2>
        <div className="ms-auto flex gap-1 rounded-full border border-border bg-muted/50 p-0.5">
          {(Object.keys(CURRENCIES) as (keyof typeof CURRENCIES)[]).map((c) => (
            <button
              key={c}
              onClick={() => setCurrency(c)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-bold transition",
                currency === c
                  ? "bg-background shadow text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {CURRENCIES[c]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Price */}
        <div>
          <div className="mb-1.5 flex justify-between text-sm">
            <label className="font-bold">سعر العقار</label>
            <span className="font-mono font-bold text-primary">{fmt(price)}</span>
          </div>
          <input
            type="range"
            min={50000}
            max={2000000}
            step={10000}
            value={price}
            onChange={(e) => {
              const p = Number(e.target.value);
              setPrice(p);
              setDown(Math.round(p * (downPercent / 100)));
            }}
            className="slider w-full"
          />
          <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
            <span>{fmt(50000)}</span><span>{fmt(2000000)}</span>
          </div>
        </div>

        {/* Down payment */}
        <div>
          <div className="mb-1.5 flex justify-between text-sm">
            <label className="font-bold">الدفعة الأولى ({downPercent}%)</label>
            <span className="font-mono font-bold text-primary">{fmt(down)}</span>
          </div>
          <input
            type="range"
            min={0}
            max={price}
            step={5000}
            value={down}
            onChange={(e) => setDown(Number(e.target.value))}
            className="slider w-full"
          />
          <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
            <span>0%</span><span>100%</span>
          </div>
        </div>

        {/* Years */}
        <div>
          <div className="mb-1.5 flex justify-between text-sm">
            <label className="font-bold">مدة القرض</label>
            <span className="font-mono font-bold text-primary">{years} سنة</span>
          </div>
          <input
            type="range"
            min={5}
            max={30}
            step={1}
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            className="slider w-full"
          />
          <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
            <span>5 سنوات</span><span>30 سنة</span>
          </div>
        </div>

        {/* Interest rate */}
        <div>
          <div className="mb-1.5 flex justify-between text-sm">
            <label className="font-bold">نسبة الفائدة السنوية</label>
            <span className="font-mono font-bold text-primary">{rate}%</span>
          </div>
          <input
            type="range"
            min={3}
            max={15}
            step={0.25}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="slider w-full"
          />
          <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
            <span>3%</span><span>15%</span>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl bg-primary/8 p-4 text-center">
          <div className="text-[11px] font-semibold text-muted-foreground mb-1">القسط الشهري</div>
          <div className="text-xl font-extrabold text-primary">{fmt(monthly)}</div>
        </div>
        <div className="rounded-2xl bg-muted/60 p-4 text-center">
          <div className="text-[11px] font-semibold text-muted-foreground mb-1">مجموع المدفوعات</div>
          <div className="text-lg font-extrabold">{fmt(total)}</div>
        </div>
        <div className="rounded-2xl bg-muted/60 p-4 text-center">
          <div className="text-[11px] font-semibold text-muted-foreground mb-1">إجمالي الفائدة</div>
          <div className="text-lg font-extrabold text-warning-foreground">{fmt(interest)}</div>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-[12px] text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
        <span>
          هذه الحاسبة للاستئناس فقط. تواصل مع البنك المعني للحصول على عرض سعر رسمي يراعي وضعك المالي.
        </span>
      </div>
    </div>
  );
}
