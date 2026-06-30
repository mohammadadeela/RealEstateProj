import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { ClientOnly } from "@/components/ClientOnly";
import { MOCK_PROPERTIES } from "@/lib/mockData";
import { PropertyCard } from "@/components/PropertyCard";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/favorites")({
  head: () => ({ meta: [{ title: "المفضلة — عقاري" }] }),
  component: () => (
    <div className="container-page py-10">
      <h1 className="enter-up text-3xl font-extrabold">المفضلة</h1>
      <ClientOnly fallback={<div className="mt-6 h-32 animate-pulse rounded-2xl bg-muted" />}>
        <FavoritesList />
      </ClientOnly>
    </div>
  ),
});

function FavoritesList() {
  const { ids } = useFavorites();
  const items = MOCK_PROPERTIES.filter((p) => ids.includes(p.id));

  if (items.length === 0) {
    return (
      <div className="mt-10 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-muted">
          <Heart className="h-9 w-9 text-muted-foreground" />
        </div>
        <h3 className="mt-5 text-xl font-bold">لا توجد عقارات محفوظة</h3>
        <p className="mt-2 text-sm text-muted-foreground">ابدأ بتصفح العقارات واحفظ المفضلة لديك.</p>
        <Button asChild className="mt-5 rounded-full"><Link to="/search">تصفح العقارات</Link></Button>
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((p, i) => (
        <Reveal key={p.id} variant="up" delay={(i % 4) * 90}>
          <PropertyCard property={p} />
        </Reveal>
      ))}
    </div>
  );
}
