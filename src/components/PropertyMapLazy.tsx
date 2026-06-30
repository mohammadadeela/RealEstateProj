import { lazy, Suspense } from "react";
import type { PropertyMapProps } from "./PropertyMap";

const PropertyMapInner = lazy(() =>
  import("./PropertyMap").then((m) => ({ default: m.PropertyMap }))
);

function MapSkeleton() {
  return <div className="h-full w-full animate-pulse rounded-2xl bg-muted" />;
}

export function PropertyMapLazy(props: PropertyMapProps) {
  return (
    <Suspense fallback={<MapSkeleton />}>
      <PropertyMapInner {...props} />
    </Suspense>
  );
}
