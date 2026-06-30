export type ListingType = "sale" | "rent" | "guarantee";

export type PropertyType =
  | "house"
  | "apartment"
  | "land"
  | "shop"
  | "office"
  | "commercial"
  | "farm";

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  house: "منزل",
  apartment: "شقة",
  land: "أرض",
  shop: "محل",
  office: "مكتب",
  commercial: "تجاري",
  farm: "مزرعة / شاليه",
};

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  sale: "للبيع",
  rent: "للإيجار",
  guarantee: "للضمان",
};

export interface Property {
  id: string;
  title: string;
  description: string;
  listingType: ListingType;
  propertyType: PropertyType;
  price: number;
  currency: "ILS" | "USD" | "JOD";
  city: string;
  area: string;
  address?: string;
  lat: number;
  lng: number;
  hideExactLocation?: boolean;
  size: number; // m²
  bedrooms?: number;
  bathrooms?: number;
  floor?: number;
  ageYears?: number;
  furnished?: boolean;
  features: string[];
  images: string[];
  videoUrl?: string;
  ownerName: string;
  ownerPhone: string;
  ownerWhatsapp?: string;
  isVerified?: boolean;
  isFeatured?: boolean;
  isUrgent?: boolean;
  onHomepage?: boolean;
  expiresAt?: string; // ISO — when the listing stops being shown publicly
  views: number;
  createdAt: string; // ISO
}

export interface City {
  name: string;
  areas: string[];
  lat: number;
  lng: number;
  image?: string;
}
