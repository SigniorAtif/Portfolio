"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { timeZone } from "@/content/contact";
import { pages } from "@/content/site";
import { found } from "@/lib/eggs";
import { travel } from "@/lib/stage";

const LEAVE_MS = 260; // the slide out, as in .rury[data-leaving]

const WORKSPACES = [{ label: "Home", href: "/" }, ...pages];
const EDITABLE = "input, textarea, select, [contenteditable]:not([contenteditable='false'])";

const clock = new Intl.DateTimeFormat("en-GB", {
  timeZone: timeZone.id,
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/**
 * Typing "rury" drops the bar of rury, the Hyprland desktop this site was
 * written in: a workspace per page with this one lit, the window title, the
 * clock in Atif's time zone, and a battery that only ever reads 3am.
 *
 * It stays up across pages until "rury" is typed again or the page reloads,
 * and the site mark in the top-left corner steps aside for it while it is up.
 * A workspace, or Alt+1 to 4, changes page through the veil. It never takes
 * focus by itself; if focus went into it, it goes back where it was when the
 * bar goes. Styles are `.rury` in globals.css.
 */
export function RuryBar({ open, onClosed }: { open: boolean; onClosed: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const barRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<Element | null>(null);
  const [time, setTime] = useState(() => clock.format(new Date()));

  const go = useCallback(
    (index: number) => {
      const place = WORKSPACES[index];
      if (!place || place.href === pathname) return;
      const box = barRef.current?.querySelector(`[data-workspace="${index}"]`)?.getBoundingClientRect();
      const from = box ? { x: box.left + box.width / 2, y: box.top + box.height / 2 } : undefined;
      if (!travel(place.href, from)) router.push(place.href);
    },
    [pathname, router],
  );

  // Count the find and keep the clock going.
  useEffect(() => {
    backRef.current = document.activeElement;
    found("rury");
    const tick = window.setInterval(() => setTime(clock.format(new Date())), 15_000);
    return () => {
      window.clearInterval(tick);
      document.documentElement.removeAttribute("data-rury");
    };
  }, []);

  // The site mark steps aside while the bar is up, and comes back as it slides away.
  useEffect(() => {
    document.documentElement.toggleAttribute("data-rury", open);
  }, [open]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(EDITABLE) || target?.closest(".cmenu")) return;
      const index = Number(event.key) - 1;
      if (Number.isInteger(index) && index >= 0 && index < WORKSPACES.length) {
        event.preventDefault();
        go(index);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  // Down: slide away, give focus back if it was in here, then unmount.
  useEffect(() => {
    if (open) return;
    if (barRef.current?.contains(document.activeElement) && backRef.current instanceof HTMLElement) {
      backRef.current.focus({ preventScroll: true });
    }
    const done = window.setTimeout(onClosed, LEAVE_MS);
    return () => window.clearTimeout(done);
  }, [open, onClosed]);

  const path = pathname === "/" ? "" : pathname;

  return (
    <div ref={barRef} role="region" aria-label="rury bar" className="rury" data-leaving={open ? undefined : true}>
      <nav aria-label="Workspaces" className="rury-workspaces">
        {WORKSPACES.map((place, index) => {
          const here = place.href === pathname;
          return (
            <button
              key={place.href}
              type="button"
              data-workspace={index}
              aria-current={here ? "page" : undefined}
              aria-label={`${index + 1}: ${place.label}`}
              aria-keyshortcuts={`Alt+${index + 1}`}
              className="rury-workspace"
              onClick={() => go(index)}
            >
              <span aria-hidden="true">{index + 1}</span>
              <span aria-hidden="true" className="rury-label">
                {place.label.toLowerCase()}
              </span>
            </button>
          );
        })}
      </nav>
      <p className="rury-title">atif@rury: ~/portfolio{path}</p>
      <p className="rury-status">
        <span className="rury-battery">
          <span aria-hidden="true" className="rury-cell" />
          <span className="sr-only">Battery: </span>
          3am
        </span>
        <span className="tabular-nums">
          {time} {timeZone.short}
        </span>
      </p>
    </div>
  );
}
