import { createFileRoute, Link } from "@tanstack/react-router";
import { HeroSearch } from "@/components/HeroSearch";
import { CategoryBar } from "@/components/CategoryBar";
import { PropertyCard } from "@/components/PropertyCard";
import { Reveal } from "@/components/Reveal";
import { useListings, isLive } from "@/lib/listings";
import type { Property } from "@/lib/types";
import { useCities } from "@/lib/cities";
import {
  Search,
  Eye,
  MessageSquare,
  CalendarCheck,
  ShieldCheck,
  MapPin,
  ArrowLeft,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "عقاري — ابحث عن منزلك القادم بسهولة" },
      { name: "description", content: "أكبر منصة عقارية: منازل، شقق، أراضي، محلات ومكاتب للبيع والإيجار في كل المدن." },
      { property: "og:title", content: "عقاري — منصة العقارات الأولى" },
      { property: "og:description", content: "ابحث، قارن، وتواصل مباشرة مع أصحاب العقارات." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const all = useListings().filter(isLive);
  const cities = useCities();
  const featured = all.filter((p) => p.onHomepage).slice(0, 8);
  const verified = all.filter((p) => p.isVerified).slice(0, 8);
  const latest = [...all]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 8);

  return (
    <div>
      {/* Hero */}
      <section className="relative z-30 bg-gradient-to-bl from-primary/8 via-background to-surface">
        <div className="absolute inset-0 -z-10 overflow-hidden opacity-60">
          <div className="float-slow absolute top-20 -right-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
          <div className="float-slower absolute bottom-0 -left-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="container-page pt-12 pb-16 md:pt-20 md:pb-24">
          <div className="max-w-3xl">
            <span className="enter-up pill border-primary/30 bg-primary/8 text-primary" style={{ animationDelay: "0ms" }}>
              <ShieldCheck className="h-3.5 w-3.5" />
              منصة موثوقة · آلاف العقارات
            </span>
            <h1 className="enter-up mt-5 text-4xl font-extrabold leading-tight text-foreground sm:text-5xl md:text-6xl" style={{ animationDelay: "100ms" }}>
              ابحث عن منزلك القادم
              <br />
              <span className="text-primary">بسهولة وأمان</span>
            </h1>
            <p className="enter-up mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg" style={{ animationDelay: "200ms" }}>
              منازل، شقق، أراضي، محلات ومكاتب — للبيع، الإيجار والضمان — في جميع المدن.
            </p>
          </div>

          <div className="enter-up relative z-20 mt-8" style={{ animationDelay: "300ms" }}>
            <HeroSearch />
          </div>

          {/* Quick city chips */}
          <div className="enter-up mt-6 flex flex-wrap items-center gap-2" style={{ animationDelay: "400ms" }}>
            <span className="text-sm text-muted-foreground">المدن الأكثر بحثاً:</span>
            {cities.slice(0, 6).map((c) => (
              <Link
                key={c.name}
                to="/search"
                search={{ city: c.name }}
                className="press rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CategoryBar />

      {/* Featured */}
      <Section
        title="عقارات مميزة"
        subtitle="مختارة بعناية من قبل فريق عقاري"
        linkSearch={{ featured: "1" }}
      >
        <PropertyGrid items={featured} />
      </Section>

      {/* Verified */}
      <Section
        title="عقارات موثقة"
        subtitle="تحقق فريقنا من معلومات هذه العقارات"
        linkSearch={{ verified: "1" }}
      >
        <PropertyGrid items={verified} />
      </Section>

      {/* Latest */}
      <Section
        title="أحدث الإعلانات"
        subtitle="أُضيفت خلال الأيام الماضية"
        linkSearch={{ sort: "newest" }}
      >
        <PropertyGrid items={latest} />
      </Section>

      {/* How it works */}
      <section className="container-page py-16">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-extrabold text-foreground sm:text-4xl">
            كيف يعمل <span className="text-primary">عقاري</span>؟
          </h2>
          <p className="mt-3 text-muted-foreground">
            أربع خطوات بسيطة للوصول إلى منزلك أو استثمارك القادم.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-4">
          {[
            { icon: Search, title: "ابحث", desc: "حدد المدينة، النوع، والسعر للحصول على نتائج دقيقة." },
            { icon: Eye, title: "قارن", desc: "تصفح العقارات والصور والمواقع على الخريطة." },
            { icon: MessageSquare, title: "تواصل", desc: "تواصل مع المعلن عبر الواتساب أو الاتصال مباشرة." },
            { icon: CalendarCheck, title: "احجز زيارة", desc: "حدد موعد معاينة وتأكد قبل اتخاذ قرارك." },
          ].map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={i} variant="up" delay={i * 110}>
                <div className="group h-full rounded-2xl border border-border bg-card p-6 text-center card-hover">
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="mt-4 text-xs font-bold text-muted-foreground">الخطوة {i + 1}</div>
                  <h3 className="mt-1 text-lg font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* CTA add property */}
      <section className="container-page pb-16">
        <Reveal variant="zoom">
          <div className="animate-gradient shine overflow-hidden rounded-3xl bg-gradient-to-bl from-primary via-primary-hover to-primary px-6 py-12 sm:px-12 sm:py-16 text-primary-foreground shadow-floating">
            <div className="grid items-center gap-8 md:grid-cols-2">
              <div>
                <h2 className="text-3xl font-extrabold sm:text-4xl">
                  لديك عقار للبيع أو الإيجار؟
                </h2>
                <p className="mt-3 max-w-md text-primary-foreground/90">
                  انشر إعلانك على عقاري في دقائق وصل آلاف المهتمين في كل المدن.
                </p>
              </div>
              <div className="md:text-left">
                <Link
                  to="/add-property"
                  className="press group inline-flex items-center gap-2 rounded-full bg-background px-6 py-3 text-base font-bold text-foreground shadow-lg transition hover:scale-[1.03] hover:shadow-xl"
                >
                  أضف عقارك الآن
                  <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Cities map mini */}
      <section className="container-page pb-20">
        <Reveal className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">استكشف حسب المدينة</h2>
            <p className="mt-1 text-sm text-muted-foreground">انقر على المدينة لعرض كل العقارات فيها</p>
          </div>
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
          {cities.map((c, i) => (
            <Reveal key={c.name} variant="up" delay={(i % 5) * 80}>
              <Link
                to="/search"
                search={{ city: c.name }}
                className="press group relative block overflow-hidden rounded-2xl border border-border bg-card card-hover"
              >
                <div className="relative h-32 w-full overflow-hidden bg-muted">
                  {c.image ? (
                    <img
                      src={c.image}
                      alt={c.name}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center bg-primary/10 text-primary">
                      <MapPin className="h-7 w-7" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 right-0 p-3 text-right transition-transform duration-300 group-hover:-translate-y-1">
                    <div className="text-base font-extrabold text-white drop-shadow">{c.name}</div>
                    <div className="text-xs font-semibold text-white/85">
                      {all.filter((p) => p.city === c.name).length} عقار
                    </div>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}

function Section({
  title,
  subtitle,
  linkSearch,
  children,
}: {
  title: string;
  subtitle?: string;
  linkSearch?: Record<string, string>;
  children: React.ReactNode;
}) {
  return (
    <section className="container-page py-12">
      <Reveal className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-foreground sm:text-3xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {linkSearch && (
          <Link
            to="/search"
            search={linkSearch}
            className="group hidden sm:inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
          >
            عرض الكل
            <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
          </Link>
        )}
      </Reveal>
      {children}
    </section>
  );
}

function PropertyGrid({ items }: { items: Property[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/30 p-10 text-center text-muted-foreground">
        لا توجد عقارات حالياً
      </div>
    );
  }
  return (
    <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((p, i) => (
        <Reveal key={p.id} variant="up" delay={(i % 4) * 90}>
          <PropertyCard property={p} />
        </Reveal>
      ))}
    </div>
  );
}
