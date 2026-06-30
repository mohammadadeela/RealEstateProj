import {
  ArrowUpDown, Car, Wind, Flame, ShieldCheck, Trees, Mountain,
  School, Landmark, Droplets, Sun, Waves, Sofa, Wifi, Building2,
  Layers, Snowflake, Star, Utensils, Laptop, Tv, WashingMachine,
  Shirt, AlarmSmoke, Siren, type LucideIcon,
} from "lucide-react";

const RULES: { match: string[]; icon: LucideIcon }[] = [
  { match: ["مصعد"], icon: ArrowUpDown },
  { match: ["موقف", "كراج", "كاراج", "سيارات"], icon: Car },
  { match: ["تكييف", "مكيف"], icon: Snowflake },
  { match: ["تدفئة"], icon: Flame },
  { match: ["حارس", "حماية", "أمن"], icon: ShieldCheck },
  { match: ["حديقة"], icon: Trees },
  { match: ["إطلالة جبلية", "جبلية", "جبل"], icon: Mountain },
  { match: ["إطلالة بحرية", "بحرية", "بحر"], icon: Waves },
  { match: ["مدارس", "جامعة", "مدرسة"], icon: School },
  { match: ["مساجد", "مسجد"], icon: Landmark },
  { match: ["خزان", "مياه", "ماء"], icon: Droplets },
  { match: ["شمسية", "ألواح", "طاقة"], icon: Sun },
  { match: ["مفروش", "فرش"], icon: Sofa },
  { match: ["إنترنت", "انترنت", "واي فاي"], icon: Wifi },
  { match: ["بلكونة", "شرفة"], icon: Building2 },
  { match: ["دوبلكس", "سطح", "طابق"], icon: Layers },
  { match: ["مسبح"], icon: Waves },
  { match: ["مطبخ"], icon: Utensils },
  { match: ["مساحة عمل", "مكتب منزلي"], icon: Laptop },
  { match: ["تلفاز", "تلفزيون", "شاشة"], icon: Tv },
  { match: ["غسالة"], icon: WashingMachine },
  { match: ["نشافة", "مجفف"], icon: Shirt },
  { match: ["إنذار الدخان", "دخان"], icon: AlarmSmoke },
  { match: ["أول أكسيد الكربون", "كربون"], icon: Siren },
];

export function featureIcon(label: string): LucideIcon {
  const normalized = label.trim();
  for (const rule of RULES) {
    if (rule.match.some((m) => normalized.includes(m))) return rule.icon;
  }
  return Star;
}

const EMOJI_RULES: { match: string[]; emoji: string }[] = [
  { match: ["مصعد"], emoji: "🛗" },
  { match: ["موقف", "كراج", "كاراج", "سيارات"], emoji: "🚗" },
  { match: ["تكييف", "مكيف"], emoji: "❄️" },
  { match: ["تدفئة"], emoji: "🔥" },
  { match: ["حارس", "حماية", "أمن"], emoji: "💂" },
  { match: ["حديقة"], emoji: "🌳" },
  { match: ["إطلالة جبلية", "جبلية", "جبل"], emoji: "⛰️" },
  { match: ["إطلالة بحرية", "بحرية", "بحر"], emoji: "🌊" },
  { match: ["مدارس", "جامعة", "مدرسة"], emoji: "🏫" },
  { match: ["مساجد", "مسجد"], emoji: "🕌" },
  { match: ["خزان", "مياه", "ماء"], emoji: "💧" },
  { match: ["شمسية", "ألواح", "طاقة"], emoji: "☀️" },
  { match: ["مفروش", "فرش"], emoji: "🛋️" },
  { match: ["إنترنت", "انترنت", "واي فاي"], emoji: "📶" },
  { match: ["بلكونة", "شرفة"], emoji: "🏡" },
  { match: ["دوبلكس", "سطح", "طابق"], emoji: "🏢" },
  { match: ["مسبح"], emoji: "🏊" },
  { match: ["مطبخ"], emoji: "🍳" },
  { match: ["مساحة عمل", "مكتب منزلي"], emoji: "💻" },
  { match: ["تلفاز", "تلفزيون", "شاشة"], emoji: "📺" },
  { match: ["غسالة"], emoji: "🫧" },
  { match: ["نشافة", "مجفف"], emoji: "👕" },
  { match: ["إنذار الدخان", "دخان"], emoji: "🚨" },
  { match: ["أول أكسيد الكربون", "كربون"], emoji: "⚠️" },
  { match: ["تشطيب", "ديلوكس", "فاخر"], emoji: "✨" },
  { match: ["مولد", "كهرباء"], emoji: "⚡" },
  { match: ["مستودع", "تخزين"], emoji: "📦" },
  { match: ["غرفة خادمة", "خادمة"], emoji: "🛏️" },
];

export function featureEmoji(label: string): string {
  const normalized = label.trim();
  for (const rule of EMOJI_RULES) {
    if (rule.match.some((m) => normalized.includes(m))) return rule.emoji;
  }
  return "⭐";
}
