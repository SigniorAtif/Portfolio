"use client";

import { useRef } from "react";
import { summon } from "@/lib/eggs";

/** How long a press on the mark has to last. */
const HOLD_MS = 600;

/**
 * The footer's "End //" label. An easter egg for screens with no keyboard: a
 * long press on it opens the terminal, the way the backtick does elsewhere.
 * The press is held from becoming a text selection or the site's own menu.
 */
export function EndMark() {
  const timer = useRef(0);
  const cancel = () => window.clearTimeout(timer.current);

  return (
    <span
      className="kicker end-mark !text-ink"
      onPointerDown={() => {
        cancel();
        timer.current = window.setTimeout(() => summon("terminal"), HOLD_MS);
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      End //
    </span>
  );
}
