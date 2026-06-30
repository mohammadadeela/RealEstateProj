const CURRENCY_SYMBOLS: Record<string, string> = {
  ILS: "₪",
  USD: "$",
  JOD: "د.أ",
};

export const formatPrice = (price: number, currency = "ILS") => {
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(price));
  const symbol = CURRENCY_SYMBOLS[currency] ?? "₪";
  return `${formatted} ${symbol}`;
};

export const formatNumber = (n: number) =>
  new Intl.NumberFormat("en-US").format(n);

/** Price per square meter (ILS), or null when size is unknown/zero. */
export const pricePerSqm = (price: number, size: number): number | null =>
  size > 0 ? price / size : null;

/** Absolute date in Arabic, e.g. "16 يونيو 2026" (Latin digits to match the rest of the UI). */
export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("ar-PS-u-nu-latn", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export const timeAgo = (iso: string): string => {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "الآن";
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`;
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`;
  if (diff < 86400 * 30) return `قبل ${Math.floor(diff / 86400)} يوم`;
  return d.toLocaleDateString("ar-PS-u-nu-latn");
};
