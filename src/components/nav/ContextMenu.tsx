"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { usePathname } from "next/navigation";
import { PageLink } from "@/components/transition/PageLink";
import { pages, site, socials } from "@/content/site";
import { glideTo } from "@/lib/scrollLock";
import { stageOpen } from "@/lib/stage";

// The site's own right-click menu, on every page. Styles are `.cmenu` in globals.css.
//
// It opens where the pointer asked for it, spreading out from that point like
// the veil does, and holds the pages, a few copies, and the link under the
// pointer when there is one. The browser's menu stays one step away: Shift +
// right-click, text fields, selected text, images and touch screens all get it
// as before.

/** Right-clicks on these keep the browser's own menu. */
const NATIVE = "input, textarea, select, [contenteditable]:not([contenteditable='false']), img, video, picture";
const EDGE = 8; // least gap between the menu and the viewport's edges, in px
const LEAVE_MS = 140; // the fade out, as in .cmenu[data-leaving]
const DONE_MS = 700; // how long "Copied" shows before the menu closes

const PLACES = [{ label: "Home", href: "/" }, ...pages];
const ITEMS = '[role="menuitem"]:not([aria-disabled="true"])';

/** The link that was right-clicked, if any. */
type Target = { href: string; label: string; mail: boolean };
type Menu = { id: number; x: number; y: number; keyboard: boolean; link: Target | null; scrolled: boolean };
type Done = { id: string; ok: boolean };

function describe(anchor: HTMLAnchorElement): Target {
  const url = new URL(anchor.href);
  if (url.protocol === "mailto:") return { href: anchor.href, label: decodeURIComponent(url.pathname), mail: true };
  const path = (url.pathname === "/" ? "" : url.pathname) + url.hash;
  return { href: anchor.href, label: url.origin === window.location.origin ? path || "/" : url.host + path, mail: false };
}

/** Mouse hover moves focus, so the pointer and the arrow keys share one active row. */
function hover(event: ReactPointerEvent<HTMLElement>) {
  if (event.pointerType === "mouse" && document.activeElement !== event.currentTarget) {
    event.currentTarget.focus({ preventScroll: true });
  }
}

export function ContextMenu() {
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLElement | null>(null);
  const timer = useRef(0);
  const opened = useRef(0);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [dot, setDot] = useState<{ y: number; on: boolean } | null>(null);

  const shut = useCallback(() => {
    window.clearTimeout(timer.current);
    setMenu(null);
    setLeaving(false);
    setDone(null);
    setDot(null);
  }, []);

  /** Fade out. `restore` hands focus back to where it was before the menu took it. */
  const close = useCallback(
    (restore = false) => {
      window.clearTimeout(timer.current);
      setLeaving(true);
      if (restore) backRef.current?.focus({ preventScroll: true });
      timer.current = window.setTimeout(shut, LEAVE_MS);
    },
    [shut],
  );

  useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)");
    const onContextMenu = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(".cmenu")) return event.preventDefault();
      if (event.defaultPrevented || event.shiftKey || !stageOpen()) return;
      // The event says what asked for it ("" is the context-menu key). Browsers
      // that still send a plain MouseEvent get a guess from the primary pointer.
      const kind = event instanceof PointerEvent ? event.pointerType : fine.matches ? "mouse" : "touch";
      if (kind === "touch" || kind === "pen") return;
      if (target?.closest(NATIVE) || window.getSelection()?.toString().trim()) return;
      event.preventDefault();

      const keyboard = kind === "" || event.button !== 2;
      let x = event.clientX;
      let y = event.clientY;
      if (keyboard) {
        // No pointer: open under the focused element, or near the middle.
        const page = !target || target === document.body || target === document.documentElement;
        const box = page ? null : target.getBoundingClientRect();
        x = box ? box.left + Math.min(box.width / 2, 24) : window.innerWidth / 2;
        y = box ? box.bottom : window.innerHeight / 3;
      }
      const active = document.activeElement;
      if (active instanceof HTMLElement && active !== document.body && !rootRef.current?.contains(active)) {
        backRef.current = active;
      } else if (!rootRef.current?.contains(active)) {
        backRef.current = null;
      }
      const anchor = target?.closest<HTMLAnchorElement>("a[href]");
      window.clearTimeout(timer.current);
      setLeaving(false);
      setDone(null);
      setDot(null);
      setMenu({
        id: ++opened.current,
        x,
        y,
        keyboard,
        link: anchor ? describe(anchor) : null,
        scrolled: window.scrollY > window.innerHeight / 2,
      });
    };
    document.addEventListener("contextmenu", onContextMenu);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      window.clearTimeout(timer.current);
    };
  }, []);

  // Place it before it paints: flip away from edges it would cross, and start
  // the ripple from exactly where it was asked for.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!menu || !root) return;
    const { width, height } = root.getBoundingClientRect();
    const right = document.documentElement.clientWidth - EDGE;
    const bottom = window.innerHeight - EDGE;
    const left = Math.max(EDGE, Math.min(menu.x + width > right ? menu.x - width : menu.x, right - width));
    const top = Math.max(EDGE, Math.min(menu.y + height > bottom ? menu.y - height : menu.y, bottom - height));
    const ox = Math.min(width, Math.max(0, menu.x - left));
    const oy = Math.min(height, Math.max(0, menu.y - top));
    root.style.setProperty("--left", `${left}px`);
    root.style.setProperty("--top", `${top}px`);
    root.style.setProperty("--ox", `${ox}px`);
    root.style.setProperty("--oy", `${oy}px`);
    root.style.setProperty("--reach", `${Math.hypot(Math.max(ox, width - ox), Math.max(oy, height - oy)) + 2}px`);
    const first = menu.keyboard ? root.querySelector<HTMLElement>(ITEMS) : null;
    (first ?? root).focus({ preventScroll: true });
  }, [menu]);

  const open = menu !== null;
  useEffect(() => {
    if (!open) return;
    const onDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") close(true);
    };
    const away = () => close();
    document.addEventListener("pointerdown", onDown, true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("wheel", away, { passive: true });
    window.addEventListener("resize", away);
    window.addEventListener("blur", away);
    window.addEventListener("popstate", away);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("wheel", away);
      window.removeEventListener("resize", away);
      window.removeEventListener("blur", away);
      window.removeEventListener("popstate", away);
    };
  }, [open, close]);

  if (!menu) return null;

  const copy = (id: string, text: string) => {
    window.clearTimeout(timer.current);
    // writeText is missing outside secure contexts: that is a failure too.
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(text))
      .then(
        () => true,
        () => false,
      )
      .then((ok) => {
        setDone({ id, ok });
        timer.current = window.setTimeout(() => close(), DONE_MS);
      });
  };
  const said = (id: string, label: string) => (done?.id === id ? (done.ok ? "Copied" : "Couldn't copy") : label);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>(ITEMS)];
    const at = items.indexOf(document.activeElement as HTMLElement);
    const go = (index: number) => items[(index + items.length) % items.length]?.focus({ preventScroll: true });
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        return go(at + 1);
      case "ArrowUp":
        event.preventDefault();
        return go(at < 0 ? -1 : at - 1);
      case "Home":
        event.preventDefault();
        return go(0);
      case "End":
        event.preventDefault();
        return go(-1);
      case "Tab":
        event.preventDefault();
        return close(true);
      case " ":
        // Buttons click on Space by themselves; links need the help.
        if (document.activeElement instanceof HTMLAnchorElement) {
          event.preventDefault();
          document.activeElement.click();
        }
        return;
    }
    // 1 to 4 go straight to a page, as numbered in the menu.
    const place = Number(event.key);
    if (Number.isInteger(place) && place >= 1 && place <= PLACES.length) {
      event.preventDefault();
      const row = event.currentTarget.querySelector<HTMLElement>(`[data-place="${place}"]`);
      if (row?.getAttribute("aria-disabled") === "true") close(true);
      else row?.click();
      return;
    }
    // Type-ahead: a letter moves to the next row starting with it.
    if (event.key.length === 1 && /\p{L}/u.test(event.key)) {
      const letter = event.key.toLowerCase();
      const order = [...items.slice(at + 1), ...items.slice(0, at + 1)];
      order.find((item) => item.dataset.label?.toLowerCase().startsWith(letter))?.focus({ preventScroll: true });
    }
  };

  const row = { role: "menuitem", tabIndex: -1, className: "cmenu-item", onPointerMove: hover } as const;
  const link = menu.link;

  return (
    <div
      key={menu.id}
      ref={rootRef}
      role="menu"
      aria-label="Site menu"
      tabIndex={-1}
      className="cmenu"
      data-leaving={leaving || undefined}
      data-done={done?.ok || undefined}
      onKeyDown={onKeyDown}
      onFocus={(event) => {
        const item = event.target.closest<HTMLElement>('[role="menuitem"]');
        if (item && item.getAttribute("aria-disabled") !== "true") {
          setDot({ y: item.offsetTop + item.offsetHeight / 2, on: true });
        } else {
          setDot((current) => current && { ...current, on: false });
        }
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse" && !done) rootRef.current?.focus({ preventScroll: true });
      }}
    >
      {dot && (
        <span
          aria-hidden="true"
          className="cmenu-dot"
          data-on={dot.on || undefined}
          style={{ "--dot-y": `${dot.y}px` } as CSSProperties}
        />
      )}

      {link && (
        <>
          <div role="group" aria-label={`Link to ${link.label}`}>
            <p aria-hidden="true" className="cmenu-kicker">
              {link.label}
            </p>
            {!link.mail && (
              <button
                type="button"
                {...row}
                data-label="Open in new tab"
                onClick={() => {
                  window.open(link.href, "_blank", "noopener,noreferrer");
                  close();
                }}
              >
                Open in new tab
                <span aria-hidden="true" className="cmenu-hint">
                  ↗
                </span>
              </button>
            )}
            <button
              type="button"
              {...row}
              data-label="Copy"
              onClick={() => copy("link", link.mail ? link.label : link.href)}
            >
              {said("link", link.mail ? "Copy address" : "Copy link address")}
            </button>
          </div>
          <hr className="cmenu-rule" />
        </>
      )}

      <div role="group" aria-label="Pages">
        {PLACES.map((place, index) =>
          place.href === pathname ? (
            <span
              key={place.href}
              role="menuitem"
              tabIndex={-1}
              aria-disabled="true"
              aria-current="page"
              className="cmenu-item"
              data-place={index + 1}
              data-label={place.label}
            >
              {place.label}
              <span className="cmenu-hint">Here</span>
            </span>
          ) : (
            <PageLink
              key={place.href}
              href={place.href}
              {...row}
              data-place={index + 1}
              data-label={place.label}
              onClick={shut}
            >
              {place.label}
              <span aria-hidden="true" className="cmenu-hint">
                {index + 1}
              </span>
            </PageLink>
          ),
        )}
      </div>

      <hr className="cmenu-rule" />

      <div role="group" aria-label="More">
        <button type="button" {...row} data-label="Copy email" onClick={() => copy("email", site.email)}>
          {said("email", "Copy email")}
        </button>
        <button
          type="button"
          {...row}
          data-label="Copy page link"
          onClick={() => copy("page", window.location.origin + window.location.pathname)}
        >
          {said("page", "Copy page link")}
        </button>
        {menu.scrolled && (
          <button
            type="button"
            {...row}
            data-label="Back to top"
            onClick={() => {
              close();
              glideTo(0);
            }}
          >
            Back to top
          </button>
        )}
        {socials.map((social) => (
          <a
            key={social.href}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            {...row}
            data-label={social.label}
            onClick={() => close()}
          >
            {social.label}
            <span aria-hidden="true" className="cmenu-hint">
              ↗
            </span>
          </a>
        ))}
      </div>

      <p aria-hidden="true" className="cmenu-foot">
        Hold <kbd>Shift</kbd> for the browser&rsquo;s menu
      </p>
      <span role="status" className="sr-only">
        {done ? (done.ok ? "Copied" : "Couldn't copy") : ""}
      </span>
    </div>
  );
}
