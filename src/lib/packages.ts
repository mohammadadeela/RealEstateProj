import { useEffect, useState } from "react";

export interface PackageDef {
  id: string;
  name: string;
  price: number;
  maxPhotos: number;
  durationDays: number;
  features: string[];
  popular: boolean;
  isFeatured?: boolean;
  isUrgent?: boolean;
  onHomepage?: boolean;
}

export const DEFAULT_PACKAGES: PackageDef[] = [
  {
    id: "basic",
    name: "عادي",
    price: 20,
    maxPhotos: 5,
    durationDays: 30,
    features: ["إعلان لمدة 30 يوم", "حتى 5 صور"],
    popular: false,
  },
  {
    id: "featured",
    name: "مميز",
    price: 50,
    maxPhotos: 15,
    durationDays: 60,
    features: ["مدة 60 يوم", "حتى 15 صورة", "شارة مميز"],
    popular: true,
    isFeatured: true,
  },
  {
    id: "home",
    name: "في الصفحة الرئيسية",
    price: 120,
    maxPhotos: 15,
    durationDays: 60,
    features: ["مدة 60 يوم", "حتى 15 صورة", "يظهر في الصفحة الرئيسية"],
    popular: false,
    onHomepage: true,
  },
  {
    id: "urgent",
    name: "عاجل (أعلى النتائج)",
    price: 180,
    maxPhotos: 15,
    durationDays: 60,
    features: ["مدة 60 يوم", "حتى 15 صورة", "يظهر أعلى البحث", "شارة عاجل"],
    popular: false,
    isUrgent: true,
  },
];

const KEY = "aqari_package_prices";
const EVENT = "aqari_packages_change";

function isBrowser() {
  return typeof window !== "undefined";
}

/** Read admin price overrides keyed by package id. */
function readOverrides(): Record<string, number> {
  if (!isBrowser()) return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeOverrides(overrides: Record<string, number>) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(overrides));
  } catch (e) {
    console.error("تعذر حفظ أسعار الباقات", e);
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** Default packages merged with any admin price overrides. */
export function getPackages(): PackageDef[] {
  const overrides = readOverrides();
  return DEFAULT_PACKAGES.map((p) =>
    overrides[p.id] != null ? { ...p, price: overrides[p.id] } : p,
  );
}

export function getPackageById(id?: string): PackageDef | undefined {
  if (!id) return undefined;
  return getPackages().find((p) => p.id === id);
}

/** Admin: set a package price (null/undefined resets to default). */
export function updatePackagePrice(id: string, price: number | null) {
  const overrides = readOverrides();
  if (price == null || Number.isNaN(price)) {
    delete overrides[id];
  } else {
    overrides[id] = price;
  }
  writeOverrides(overrides);
}

export { EVENT as PACKAGES_EVENT };

/** SSR-safe hook: starts from defaults, then hydrates admin overrides. */
export function usePackages(): PackageDef[] {
  const [packages, setPackages] = useState<PackageDef[]>(DEFAULT_PACKAGES);

  useEffect(() => {
    const refresh = () => setPackages(getPackages());
    refresh();
    window.addEventListener(EVENT, refresh);
    return () => window.removeEventListener(EVENT, refresh);
  }, []);

  return packages;
}
