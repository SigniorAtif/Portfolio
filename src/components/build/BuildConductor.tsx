"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { whenStageOpen } from "@/lib/stage";
import { Conductor } from "./conductor";

const ConductorContext = createContext<Conductor | null>(null);

/** The conductor of the nearest build stage, or null outside one. */
export function useConductor(): Conductor | null {
  return useContext(ConductorContext);
}

/**
 * A stretch of page that agent cursors put together as it scrolls in. Each
 * `Build` inside is one block; the cursors fly over the stage's whole area.
 *
 * With a mouse and at least 900px of width the cursors drag each box out and
 * fill it in. Touch and narrow screens get the plain fade-up, and under
 * reduced motion or without JavaScript the page is simply there.
 */
export function BuildConductor({ className, children }: { className?: string; children: ReactNode }) {
  const [conductor] = useState(() => new Conductor());
  const layerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const layer = layerRef.current;
    if (!layer) return;
    conductor.attach(layer);
    let live = true;
    void whenStageOpen().then(() => {
      if (live) conductor.open();
    });
    return () => {
      live = false;
      conductor.destroy();
    };
  }, [conductor]);

  return (
    <ConductorContext.Provider value={conductor}>
      <div className={`relative ${className ?? ""}`}>
        {children}
        <div ref={layerRef} aria-hidden="true" className="build-layer" />
      </div>
    </ConductorContext.Provider>
  );
}
