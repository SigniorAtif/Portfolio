"use client";

import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { useReducedMotion } from "@/lib/useReducedMotion";

/** Shimmering placeholder block. Pure CSS (`.skel` in globals.css). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={`skel ${className ?? ""}`} />;
}

type RevealProps = {
  /** Flip to true once the content has pixels to show. */
  loaded: boolean;
  children: ReactNode;
  className?: string;
  /** Placeholder shown until the wipe ends. Defaults to one full-size block. */
  skeleton?: ReactNode;
};

/**
 * Stacks a skeleton and the real content in one grid cell. When `loaded`
 * flips, the content wipes in through a moving mask; when the wipe ends the
 * mask and the skeleton are both removed (a permanent mask would flatten 3D
 * transforms inside the content, such as a card flip).
 */
export function SkeletonReveal({ loaded, children, className, skeleton }: RevealProps) {
  const [wiped, setWiped] = useState(false);
  const reduced = useReducedMotion();
  const done = wiped || (loaded && reduced);
  const state = done ? "done" : loaded ? "wiping" : "pending";

  return (
    <div className={`grid ${className ?? ""}`}>
      {!done && <div className="min-w-0 [grid-area:1/1]">{skeleton ?? <Skeleton className="h-full w-full" />}</div>}
      <div
        data-state={state}
        className="skel-content z-[1] min-w-0 [grid-area:1/1]"
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) setWiped(true);
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * True once the image has decoded or the video is actually playing, so a
 * reveal starts only when there are pixels behind it. Errors count as loaded:
 * a broken file must not leave the skeleton shimmering forever.
 */
export function useLoadedMedia(ref: RefObject<HTMLImageElement | HTMLVideoElement | null>): boolean {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let live = true;
    const finish = () => {
      if (live) setLoaded(true);
    };

    if (node instanceof HTMLImageElement) {
      const decode = () => node.decode().then(finish, finish);
      if (node.complete) decode();
      else {
        node.addEventListener("load", decode, { once: true });
        node.addEventListener("error", finish, { once: true });
      }
      return () => {
        live = false;
        node.removeEventListener("load", decode);
        node.removeEventListener("error", finish);
      };
    }

    if (!node.paused && node.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) finish();
    node.addEventListener("playing", finish, { once: true });
    node.addEventListener("error", finish, { once: true });
    return () => {
      live = false;
      node.removeEventListener("playing", finish);
      node.removeEventListener("error", finish);
    };
  }, [ref]);

  return loaded;
}
