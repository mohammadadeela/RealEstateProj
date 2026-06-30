import { useEffect, useState } from "react";
import type { City } from "./types";

export const DEFAULT_CITIES: City[] = [
  { name: "رام الله", lat: 31.9038, lng: 35.2034, image: "/cities/ramallah.jpg", areas: ["الطيرة", "المصيون", "الإرسال", "بيتونيا", "البالوع", "وسط البلد"] },
  { name: "نابلس", lat: 32.2211, lng: 35.2544, image: "/cities/nablus.jpg", areas: ["رفيديا", "المخفية", "العامود", "البلدة القديمة", "جبل النصر"] },
  { name: "الخليل", lat: 31.5326, lng: 35.0998, image: "/cities/hebron.jpg", areas: ["وادي الهرية", "عين سارة", "رأس الجورة", "حلحول"] },
  { name: "بيت لحم", lat: 31.7054, lng: 35.2024, image: "/cities/bethlehem.jpg", areas: ["بيت ساحور", "بيت جالا", "الدوحة", "وسط المدينة"] },
  { name: "جنين", lat: 32.4609, lng: 35.3000, image: "/cities/jenin.jpg", areas: ["وسط البلد", "المنطقة الصناعية", "حي الزهراء"] },
  { name: "طولكرم", lat: 32.3104, lng: 35.0286, image: "/cities/tulkarm.jpg", areas: ["شويكة", "ذنابة", "وسط المدينة"] },
  { name: "قلقيلية", lat: 32.1899, lng: 34.9706, image: "/cities/qalqilya.jpg", areas: ["وسط المدينة", "كفر سابا"] },
  { name: "أريحا", lat: 31.8568, lng: 35.4606, image: "/cities/jericho.jpg", areas: ["وسط المدينة", "عين السلطان"] },
  { name: "القدس", lat: 31.7683, lng: 35.2137, image: "/cities/jerusalem.jpg", areas: ["بيت حنينا", "شعفاط", "صور باهر", "العيسوية", "الطور"] },
  { name: "غزة", lat: 31.5017, lng: 34.4668, image: "/cities/gaza.jpg", areas: ["الرمال", "النصر", "تل الهوا", "الزهراء"] },
];

const KEY = "aqari_cities";
const EVENT = "aqari_cities_change";

function isBrowser() {
  return typeof window !== "undefined";
}

function read(): City[] {
  if (!isBrowser()) return DEFAULT_CITIES;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_CITIES;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? (parsed as City[]) : DEFAULT_CITIES;
  } catch {
    return DEFAULT_CITIES;
  }
}

function write(cities: City[]): boolean {
  if (!isBrowser()) return false;
  try {
    localStorage.setItem(KEY, JSON.stringify(cities));
  } catch (e) {
    console.error("تعذر حفظ المدن (تجاوز حجم التخزين)", e);
    return false;
  }
  window.dispatchEvent(new CustomEvent(EVENT));
  return true;
}

/** Seed the store from the static list once. */
export function initCities() {
  if (!isBrowser()) return;
  if (!localStorage.getItem(KEY)) write(DEFAULT_CITIES);
}

export function getCities(): City[] {
  return read();
}

export function addCity(city: City): boolean {
  const cities = read();
  if (cities.some((c) => c.name === city.name)) return false;
  return write([...cities, city]);
}

export function updateCity(name: string, patch: Partial<City>): boolean {
  return write(read().map((c) => (c.name === name ? { ...c, ...patch } : c)));
}

export function deleteCity(name: string): boolean {
  return write(read().filter((c) => c.name !== name));
}

export { EVENT as CITIES_EVENT };

/** SSR-safe reactive hook: starts from defaults, hydrates from the store. */
export function useCities(): City[] {
  const [cities, setCities] = useState<City[]>(DEFAULT_CITIES);
  useEffect(() => {
    initCities();
    const refresh = () => setCities(getCities());
    refresh();
    window.addEventListener(EVENT, refresh);
    return () => window.removeEventListener(EVENT, refresh);
  }, []);
  return cities;
}

/** Static default list (use the store/useCities for live data). */
export const CITIES = DEFAULT_CITIES;
export const ALL_CITY_NAMES = DEFAULT_CITIES.map((c) => c.name);
export const cityByName = (name: string) => read().find((c) => c.name === name);
