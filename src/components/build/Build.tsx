"use client";

import { useLayoutEffect, useRef, type ElementType, type ReactNode } from "react";
import { useConductor } from "./BuildConductor";

type Props = {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  /** Under the plain fade-up, bring the boxes in one after another instead of the whole block. */
  each?: boolean;
};

/**
 * One block of a build stage. Mark each box inside it `data-box` and the
 * element that draws the block's outline and hairlines `data-frame`. The block
 * holds its place the whole time, so nothing around it moves while it builds.
 */
export function Build({ as: Tag = "div", className, children, each = false }: Props) {
  const conductor = useConductor();
  const ref = useRef<HTMLElement>(null);

  // Before paint, so a block that waits to enter never flashes up first.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !conductor) return;
    conductor.register(el, { each });
    return () => conductor.unregister(el);
  }, [conductor, each]);

  return (
    <Tag ref={ref} className={`relative ${className ?? ""}`}>
      {children}
    </Tag>
  );
}
