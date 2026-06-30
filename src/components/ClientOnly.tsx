import { useEffect, useState, type ReactNode } from "react";

/**
 * Renders children only on the client (after mount). Avoids SSR for libraries
 * that touch `window` (e.g. Leaflet).
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <>{fallback}</>;
  return <>{children}</>;
}
