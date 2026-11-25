"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";

// Fetched on the first press only, so About carries none of it.
const ChessPuzzle = dynamic(() => import("./ChessPuzzle").then((mod) => mod.ChessPuzzle), { ssr: false });

/**
 * A hobby on About's "Also busy with" list that opens an egg when pressed:
 * the chess puzzle. It looks like the rest of the list;
 * only the pointer and the focus ring give it away. The egg is put on the
 * body, out from under the list's moving rows. Closing hands focus back.
 */
export function HobbyEgg({ egg, children }: { egg: "chess"; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    buttonRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <>
      <button ref={buttonRef} type="button" aria-haspopup="dialog" className="busy-egg" onClick={() => setOpen(true)}>
        {children}
      </button>
      {open && createPortal(egg === "chess" ? <ChessPuzzle onClose={close} /> : null, document.body)}
    </>
  );
}
