import { useEffect, useRef, useState } from "react";

export type Currency = "ILS" | "USD" | "JOD";

interface CurrencyMeta {
  code: Currency;
  symbol: string;
  label: string;
  /** How many units of this currency equal 1 ₪ (ILS is the base, stored value). */
  perILS: number;
}

/** Approximate, fixed reference rates — this is a prototype with no live FX feed. */
export const CURRENCIES: Record<Currency, CurrencyMeta> = {
  ILS: { code: "ILS", symbol: "₪", label: "شيكل", perILS: 1 },
  USD: { code: "USD", symbol: "$", label: "دولار", perILS: 0.27 },
  JOD: { code: "JOD", symbol: "د.أ", label: "دينار", perILS: 0.19 },
};

export const CURRENCY_LIST = Object.values(CURRENCIES);

const KEY = "aqari_currency";
const EVENT = "aqari_currency_change";

function isBrowser() {
  return typeof window !== "undefined";
}

export function getCurrency(): Currency {
  if (!isBrowser()) return "ILS";
  const v = localStorage.getItem(KEY);
  return v === "USD" || v === "JOD" ? v : "ILS";
}

export function setCurrency(c: Currency) {
  if (!isBrowser()) return;
  localStorage.setItem(KEY, c);
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function convertFromILS(ils: number, c: Currency): number {
  return ils * CURRENCIES[c].perILS;
}

/** Format an ILS-stored amount in the given display currency. */
export function formatInCurrency(ils: number, c: Currency): string {
  const meta = CURRENCIES[c];
  const value = ils * meta.perILS;
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
  return `${formatted} ${meta.symbol}`;
}

export { EVENT as CURRENCY_EVENT };

/**
 * Reactive currency hook. Returns the selected currency, a setter, and a
 * `format` helper that converts an ILS-stored amount to the active currency.
 */
export function useCurrency() {
  const [currency, setCur] = useState<Currency>("ILS");
  const cb = useRef<() => void>(() => {});
  cb.current = () => setCur(getCurrency());

  useEffect(() => {
    setCur(getCurrency());
    const handler = () => cb.current();
    const storageHandler = (e: StorageEvent) => {
      if (e.key === KEY) cb.current();
    };
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", storageHandler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", storageHandler);
    };
  }, []);

  return {
    currency,
    setCurrency: (c: Currency) => {
      setCurrency(c);
      setCur(c);
    },
    format: (ils: number) => formatInCurrency(ils, currency),
  };
}
