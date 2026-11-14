"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FRAMED_AT, heroProgress } from "@/components/hero/progress";
import { pages, site } from "@/content/site";

/** Pixels the hero may scroll away before the name folds. */
const FOLD_AFTER_PX = 24;
/** The mark steps aside once the footer's top edge is this close to the viewport's. */
const FOOTER_CLEAR_PX = 96;

type State = "name" | "full" | "mark" | "gone";

/**
 * The name in the top-left corner, fixed for the whole page. Styles are
 * `.site-mark` in globals.css.
 *
 * Over the hero it is the plain name, joined by the links to the pages once
 * the frame has closed. Past the hero it folds to its initial on a frosted chip,
 * so it stays readable over whatever scrolls beneath. Hover, keyboard focus
 * or a tap unfolds the name and links again and blurs the whole page behind them.
 *
 * Home passes nothing. Any other page passes its own route as `page`: there is
 * no hero there, so the name and the links show at the top and fold as soon as
 * the page scrolls.
 */
export function SiteMark({ page }: { page?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const touchRef = useRef(false);
  const [state, setState] = useState<State>("name");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const hero = page ? null : document.getElementById("top");
    const footer = document.querySelector("footer");

    let frame = 0;
    const update = () => {
      frame = 0;
      if (footer && footer.getBoundingClientRect().top < FOOTER_CLEAR_PX) return setState("gone");
      if (page) return setState(window.scrollY > FOLD_AFTER_PX ? "mark" : "full");
      if (!hero) return setState("mark");
      const { p, past } = heroProgress(hero);
      setState(past > FOLD_AFTER_PX ? "mark" : p > FRAMED_AT ? "full" : "name");
    };
    const onScroll = () => {
      // A tap has no "leave": scrolling on is what closes it.
      if (touchRef.current) setOpen(false);
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [page]);

  // Opened by tap: a tap anywhere else closes it.
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const folded = state === "mark" && !open;
  // The name goes home from any other page, and to the top of home itself.
  const Name = page ? Link : "a";
  const closeOnTap = () => {
    if (touchRef.current) setOpen(false);
  };

  return (
    <div ref={rootRef} className="site-mark" data-state={state} data-open={open}>
      <div aria-hidden="true" className="site-mark-frost" />
      <header
        className="site-mark-bar"
        onPointerDown={(event) => {
          touchRef.current = event.pointerType !== "mouse";
        }}
        onPointerEnter={(event) => {
          if (event.pointerType === "mouse") setOpen(true);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") setOpen(false);
        }}
        onFocus={(event) => {
          if (event.target.matches(":focus-visible")) setOpen(true);
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
        }}
      >
        <Name
          href={page ? "/" : "#top"}
          aria-label={site.name}
          aria-expanded={state === "mark" ? open : undefined}
          className="site-mark-name"
          onClick={(event) => {
            // On touch the folded initial is the handle: the first tap unfolds it.
            if (touchRef.current && folded) {
              event.preventDefault();
              setOpen(true);
            } else if (touchRef.current) {
              setOpen(false);
            }
          }}
        >
          <span aria-hidden="true">{site.name[0]}</span>
          <span aria-hidden="true" className="site-mark-fold">
            <span>{site.name.slice(1)}</span>
          </span>
          <span aria-hidden="true">.</span>
        </Name>
        <nav aria-label="Primary" className="site-mark-fold site-mark-links">
          <div>
            {pages.map((link) => (
              <Link key={link.href} href={link.href} aria-current={link.href === page ? "page" : undefined} onClick={closeOnTap}>
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
    </div>
  );
}
