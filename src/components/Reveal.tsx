import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type RevealVariant = "up" | "down" | "left" | "right" | "zoom" | "fade";

interface Props {
  children: ReactNode;
  className?: string;
  variant?: RevealVariant;
  delay?: number;
}

let sharedObserver: IntersectionObserver | null = null;
const callbacks = new WeakMap<Element, () => void>();

function getObserver(): IntersectionObserver | null {
  if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
    return null;
  }
  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const cb = callbacks.get(entry.target);
            if (cb) cb();
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -48px 0px" },
    );
  }
  return sharedObserver;
}

export function Reveal({ children, className, variant = "up", delay = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  // `ready` arms the hidden state (only client-side, never on SSR/first paint).
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const observer = getObserver();

    // No JS-observer support or reduced motion: keep content visible, no animation.
    if (reduce || !observer) {
      setVisible(true);
      return;
    }

    // Already in viewport on mount: show immediately to avoid a hide-then-show flash
    // (also keeps above-the-fold content visible for SSR/LCP).
    const rect = el.getBoundingClientRect();
    const inView = rect.top < window.innerHeight && rect.bottom > 0;
    if (inView) {
      setVisible(true);
      return;
    }

    // Below the fold: arm the hidden state, then reveal on scroll-in.
    setReady(true);
    const reveal = () => {
      setVisible(true);
      observer.unobserve(el);
      callbacks.delete(el);
    };
    callbacks.set(el, reveal);
    observer.observe(el);

    return () => {
      observer.unobserve(el);
      callbacks.delete(el);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "reveal",
        `reveal-${variant}`,
        ready && "reveal-ready",
        visible && "reveal-visible",
        className,
      )}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
