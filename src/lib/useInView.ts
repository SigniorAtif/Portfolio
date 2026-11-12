"use client";

import { useEffect, useRef, useState } from "react";

type Options = {
  /** Share of the element that must be visible, 0 to 1. */
  amount?: number;
  rootMargin?: string;
};

/**
 * One-shot visibility: flips to true the first time the element enters the
 * viewport and stays true. The observer disconnects after that.
 */
export function useInView<T extends Element>({ amount = 0, rootMargin = "0px" }: Options = {}) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: amount, rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [amount, rootMargin]);

  return [ref, inView] as const;
}
