"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Sizes the box. It must hold its size while empty, or the page jumps as the contents come and go. */
  className?: string;
  /** How far outside the viewport the contents are already mounted, as a share of its height. */
  margin?: number;
};

/**
 * Mounts its children only while the box is on or near the screen. For
 * anything that draws every frame (the dot text, the toons): left running off
 * screen, a few canvases are enough to make the rest of the page drop frames.
 */
export function OnScreen({ children, className, margin = 0.5 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), {
      rootMargin: `${margin * 100}% 0px`,
    });
    observer.observe(box);
    return () => observer.disconnect();
  }, [margin]);

  return (
    <div ref={ref} className={className}>
      {near && children}
    </div>
  );
}
