"use client";

import { useEffect, useRef, useState } from "react";
import { PageLink } from "@/components/transition/PageLink";
import { FRAMED_AT, heroProgress } from "@/components/hero/progress";
import { pages, site, socials } from "@/content/site";
import { hasGlyph, SocialIcon } from "./SocialIcon";

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
 * The profiles show as icons with the links. Over the full bar they sit in the
 * top-right corner; in the folded chip they ride inside it, after the links,
 * so the hover that opened it can reach them.
 *
 * Home passes nothing. Any other page passes its own route as `page`: there is
 * no hero there, so the name and the links show at the top and fold as soon as
 * the page scrolls.
 */
export function SiteMark({ page }: { page?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLElement>(null);
  const touchRef = useRef(false);
  // Opened by a mouse on the bar, rather than by a tap or the keyboard.
  const hoverRef = useRef(false);
  const [state, setState] = useState<State>("name");
  const [open, setOpen] = useState(false);

  /** Whether a pointer at this height is level with the bar. */
  const inBarHeight = (y: number) => y <= (barRef.current?.getBoundingClientRect().bottom ?? 0);

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
      // A tap has no "leave": scrolling on is what closes it. So does scrolling
      // a bar the hero held open (below) out from under a mouse that isn't on it.
      if (touchRef.current || (hoverRef.current && !barRef.current?.matches(":hover"))) setOpen(false);
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

  // Over the home hero the bar starts as the name alone, and the icons it opens
  // are a screen's width away in the far corner. So a bar a mouse opened there
  // stays open while the pointer keeps to the bar's own height, across the
  // whole width, and closes once it drops below that or leaves the window.
  useEffect(() => {
    if (!open || state !== "name") return;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || !hoverRef.current) return;
      if (!inBarHeight(event.clientY)) setOpen(false);
    };
    const onOut = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && hoverRef.current && !event.relatedTarget) setOpen(false);
    };
    window.addEventListener("pointermove", onMove);
    document.addEventListener("pointerout", onOut);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onOut);
    };
  }, [open, state]);

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
  const Name = page ? PageLink : "a";
  const closeOnTap = () => {
    if (touchRef.current) setOpen(false);
  };
  const iconLinks = socials
    .filter((link) => hasGlyph(link.label))
    .map((link) => (
      <a
        key={link.href}
        href={link.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={link.label}
        title={link.label}
        onClick={closeOnTap}
        className="hit"
      >
        <SocialIcon label={link.label} />
      </a>
    ));

  return (
    <div
      ref={rootRef}
      className="site-mark"
      data-state={state}
      data-open={open}
      // On the root, not the bar, so Tab can go on from the links to the
      // icons on phones, which sit outside the bar, without folding it.
      onFocus={(event) => {
        if (!event.target.matches(":focus-visible")) return;
        hoverRef.current = false;
        setOpen(true);
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <div aria-hidden="true" className="site-mark-frost" />
      <header
        ref={barRef}
        className="site-mark-bar"
        onPointerDown={(event) => {
          touchRef.current = event.pointerType !== "mouse";
          if (touchRef.current) hoverRef.current = false;
        }}
        onPointerEnter={(event) => {
          if (event.pointerType !== "mouse") return;
          hoverRef.current = true;
          setOpen(true);
        }}
        onPointerLeave={(event) => {
          if (event.pointerType !== "mouse") return;
          // Over the hero, still level with the bar: on the way to the icons.
          if (state === "name" && inBarHeight(event.clientY)) return;
          setOpen(false);
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
              <PageLink
                key={link.href}
                href={link.href}
                aria-current={link.href === page ? "page" : undefined}
                onClick={closeOnTap}
                className="hit"
              >
                {link.label}
              </PageLink>
            ))}
            {/* In the folded chip the icons ride here; over the full bar, in the corner. */}
            <span className="site-mark-inline">
              <span aria-hidden="true" className="site-mark-sep" />
              {iconLinks}
            </span>
          </div>
        </nav>
      </header>
      <nav aria-label="Elsewhere" className="site-mark-socials">
        {iconLinks}
      </nav>
    </div>
  );
}
