"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { footerNav } from "@/content/site";
import { reducedMotion } from "@/lib/motion";
import { jumpTo, lockScroll, unlockScroll } from "@/lib/scrollLock";
import { endHomeIntro, isHomeIntro, loadFraction, onLoads, resetLoads, setNavigator, setStage, type Point } from "@/lib/stage";
import { createEngine, GREETINGS, greetingGridFor, gridFor, type EngineEvent, type Glyphs, type Grid, type HostMessage, type Size } from "./veilEngine";

// One sheet of dots over the whole site, the same material as the portrait.
//
// Direct home load: greetings appear in dots; Welcome gathers into the portrait's ring.
// Other direct loads show the page name and open with the usual entry ripple.
//
// Between pages: a ripple of dots spreads from the pressed link until it covers
// the page, the name of the next page lights up in the matrix while the route
// changes behind it, and a second ripple opens the sheet on the new page.
//
// The stage (see lib/stage) opens during the tail of the reveal, which is what
// every page's own intro waits for.
//
// The sheet is drawn by veilEngine, in a worker where the browser can hand the
// canvas to one, so the greetings keep their pace while the page below boots. This
// component is the engine's host: it owns the DOM, the router and the fonts.

type Pen = CanvasRenderingContext2D;
type Port = { post: (message: HostMessage, transfer?: Transferable[]) => void; close: () => void };
type Host = { canvas: HTMLCanvasElement; go: (href: string, from?: Point) => boolean; arrived: (pathname: string) => void; dispose: () => void };

function labelFor(pathname: string): string {
  const known = footerNav.find((link) => link.href === pathname);
  const name = known?.label ?? pathname.split("/").filter(Boolean)[0] ?? "Home";
  return name.toUpperCase();
}

/** A dot lights where the text covers its cell, one level (0 to 255) per cell. */
function levels(pixels: Uint8ClampedArray, out: Uint8Array, offset: number, cells: number) {
  for (let i = 0; i < cells; i++) {
    const alpha = pixels[i * 4 + 3];
    out[offset + i] = alpha > 48 ? Math.round(Math.min(1, alpha / 190) * 255) : 0;
  }
}

/** Text is drawn one pixel per dot. */
function prepare(pen: Pen, grid: Grid, font: string) {
  pen.canvas.width = grid.cols;
  pen.canvas.height = grid.rows;
  pen.fillStyle = "#fff";
  pen.textAlign = "center";
  pen.textBaseline = "middle";
  pen.font = font;
}

/** The same open, round-dot lettering as page titles, at an intro-specific scale. */
function greetingGlyphs(pen: Pen, viewport: Size, family: string): Glyphs {
  const { cell, cols, rows, left, top } = greetingGridFor(viewport.width, viewport.height);
  let size = Math.min(240, viewport.height * 0.24, viewport.width * 0.16) / cell;
  pen.canvas.width = cols;
  pen.canvas.height = rows;
  pen.fillStyle = "#fff";
  pen.textAlign = "center";
  pen.textBaseline = "alphabetic";
  pen.font = `800 ${size}px ${family}`;
  const words = GREETINGS.map(({ text }) => text.toUpperCase());
  const longest = Math.max(...words.map((text) => pen.measureText(text).width));
  // Every language shares a cap height and baseline, without resizing per word.
  size *= Math.min(1, viewport.width * 0.78 / (longest * cell));
  pen.font = `800 ${size}px ${family}`;
  const metrics = pen.measureText("HELLO");
  const baseline = (rows + metrics.actualBoundingBoxAscent - metrics.actualBoundingBoxDescent) / 2;

  return {
    greetings: words.map((text) => {
      pen.clearRect(0, 0, cols, rows);
      pen.fillText(text, cols / 2, baseline);
      const pixels = pen.getImageData(0, 0, cols, rows).data;
      const dots: number[] = [];
      for (let i = 0; i < cols * rows; i++) {
        const alpha = pixels[i * 4 + 3] / 255;
        if (alpha <= 48 / 255) continue;
        // Viewport-relative positions survive a resize during the ring morph.
        dots.push(
          (left + (i % cols) * cell) / viewport.width,
          (top + Math.floor(i / cols) * cell) / viewport.height,
          Math.min(1, alpha / (190 / 255)),
        );
      }
      return { dots: new Float32Array(dots), radius: cell * 0.36 };
    }),
  };
}

/** The name of the page being opened, as wide as fits. */
function labelGlyphs(pen: Pen, grid: Grid, family: string, text: string): Glyphs {
  const { cols, rows } = grid;
  let size = rows * 0.3;
  prepare(pen, grid, `800 ${size}px ${family}`);
  size *= Math.min(1, (cols * 0.82) / pen.measureText(text).width);
  pen.font = `800 ${size}px ${family}`;
  pen.fillText(text, cols / 2, rows / 2);
  const label = new Uint8Array(cols * rows);
  levels(pen.getImageData(0, 0, cols, rows).data, label, 0, cols * rows);
  return { label };
}

/** Run the engine in a worker when the canvas can be handed to one, and here otherwise. */
function connect(canvas: HTMLCanvasElement, onEvent: (event: EngineEvent) => void): { port: Port; offscreen?: OffscreenCanvas } | null {
  if (typeof Worker !== "undefined" && typeof canvas.transferControlToOffscreen === "function") {
    let worker: Worker | null = null;
    try {
      worker = new Worker(new URL("./veil.worker.ts", import.meta.url), { type: "module" });
      const offscreen = canvas.transferControlToOffscreen();
      const running = worker;
      running.onmessage = (event: MessageEvent<EngineEvent>) => onEvent(event.data);
      running.onerror = () => onEvent({ type: "fail" });
      return { port: { post: (message, transfer = []) => running.postMessage(message, transfer), close: () => running.terminate() }, offscreen };
    } catch {
      worker?.terminate();
    }
  }
  const engine = createEngine(canvas, onEvent, { request: (callback) => requestAnimationFrame(callback), cancel: (id) => cancelAnimationFrame(id) });
  return engine ? { port: { post: (message) => engine.handle(message), close: engine.stop } } : null;
}

function createHost(
  wrap: HTMLDivElement,
  canvas: HTMLCanvasElement,
  status: HTMLElement,
  push: (href: string) => void,
  prefetch: (href: string) => void,
): Host | null {
  const pen = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!pen) return null;

  const plain = reducedMotion(); // reduced motion: the sheet only fades
  const css = getComputedStyle(wrap);
  const family = css.fontFamily;
  const viewport = (): Size => ({ width: window.innerWidth, height: window.innerHeight, dpr: Math.min(window.devicePixelRatio || 1, 2) });
  let size = viewport();
  let grid = gridFor(size.width, size.height);
  let again = false;
  try {
    again = sessionStorage.getItem("veil-seen") === "1";
  } catch {}

  // boot: the first-load greetings. covering: on the way to a page, until the
  // reveal lets the page start. opening: the rest of the reveal.
  const homeIntro = isHomeIntro();
  let phase: "boot" | "covering" | "opening" | "idle" = homeIntro ? "boot" : "covering";
  let target = "";
  let keepScroll = false;
  let label = homeIntro ? "" : labelFor(window.location.pathname);
  let fontsIn = 0;
  let pageIn = document.readyState === "complete" ? 1 : 0;
  let alive = true;
  let failed = false;
  let port: Port | null = null;

  const send = (message: HostMessage, transfer: Transferable[] = []) => port?.post(message, transfer);
  const buffers = (glyphs: Glyphs) => [glyphs.label?.buffer, ...(glyphs.greetings?.map(({ dots }) => dots.buffer) ?? [])].filter((buffer): buffer is ArrayBuffer => !!buffer);
  /** The text the sheet may need to spell next, measured for the current grid. */
  const glyphs = (): Glyphs => ({
    ...(phase === "boot" && !plain ? greetingGlyphs(pen, size, family) : {}),
    ...(label ? labelGlyphs(pen, grid, family, label) : {}),
  });

  const progress = () => {
    const loads = loadFraction();
    send({ type: "progress", real: 0.2 * fontsIn + 0.2 * pageIn + 0.6 * loads, loads });
  };

  const show = () => {
    wrap.style.visibility = "visible";
    wrap.style.pointerEvents = "auto";
  };

  const leaveBoot = () => {
    try {
      sessionStorage.setItem("veil-seen", "1");
    } catch {}
    // On home the lit dots become the ring the portrait assembles from.
    const bust = plain ? null : document.querySelector("[data-bust]");
    if (bust) {
      const box = bust.getBoundingClientRect();
      const x = box.left + box.width / 2;
      const y = box.top + box.height / 2;
      if (box.width > 0 && Math.abs(x - size.width / 2) < size.width * 0.25 && Math.abs(y - size.height / 2) < size.height * 0.25) {
        send({ type: "ring", x, y });
        return;
      }
    }
    send({ type: "open" });
  };

  const giveUp = () => {
    // The engine could not start: step aside and let the page play.
    failed = true;
    phase = "idle";
    wrap.dataset.live = "";
    wrap.style.visibility = "hidden";
    wrap.style.pointerEvents = "none";
    status.textContent = "";
    setStage(true);
    unlockScroll();
  };

  const onEvent = (event: EngineEvent) => {
    switch (event.type) {
      case "drawn":
        // From here the canvas paints the ground, not the wrapper.
        wrap.dataset.live = "";
        send({ type: "live" });
        break;
      case "full":
        leaveBoot();
        break;
      case "covered":
        // Closed only once nothing shows: the old page's text would blink out otherwise.
        setStage(false);
        push(target);
        break;
      case "open":
        phase = "opening";
        setStage(true);
        unlockScroll();
        wrap.style.pointerEvents = "none";
        break;
      case "rest":
        phase = "idle";
        label = "";
        wrap.style.visibility = "hidden";
        wrap.style.pointerEvents = "none";
        status.textContent = "";
        break;
      case "fail":
        giveUp();
        break;
    }
  };

  const connection = connect(canvas, onEvent);
  if (!connection) return null;
  port = connection.port;

  let resizing = 0;
  const onResize = () => {
    if (resizing) return;
    resizing = requestAnimationFrame(() => {
      resizing = 0;
      size = viewport();
      grid = gridFor(size.width, size.height);
      const text = glyphs();
      send({ type: "resize", size, glyphs: text }, buffers(text));
    });
  };
  const onLoad = () => {
    pageIn = 1;
    progress();
  };
  window.addEventListener("load", onLoad);
  window.addEventListener("resize", onResize);
  const stopLoads = onLoads(progress);
  void document.fonts.ready.then(() => {
    if (!alive) return;
    fontsIn = 1;
    progress();
    // The text was measured in a fallback font until now.
    const text = glyphs();
    if (text.greetings || text.label) send({ type: "glyphs", glyphs: text }, buffers(text));
  });

  lockScroll();
  status.textContent = homeIntro ? "Loading" : `Opening ${label.toLowerCase()}`;
  // Away from home the label rides with the snap below, so it is measured once.
  const first: Glyphs = homeIntro ? glyphs() : {};
  const loads = loadFraction();
  const { offscreen } = connection;
  const init: Extract<HostMessage, { type: "init" }> = {
    type: "init",
    size,
    ground: css.getPropertyValue("--ground").trim() || "#19191b",
    dot: css.getPropertyValue("--dot").trim() || "#ffffff",
    plain,
    again,
    real: 0.2 * fontsIn + 0.2 * pageIn + 0.6 * loads,
    loads,
    glyphs: first,
  };
  send({ ...init, canvas: offscreen }, offscreen ? [offscreen, ...buffers(first)] : buffers(first));
  if (!homeIntro) {
    // Reuse the entry half of a history transition; there is no outgoing page.
    const text = glyphs();
    send({ type: "snap", glyphs: text }, buffers(text));
  }

  return {
    canvas,
    go(href, from) {
      if (failed) return false;
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return false;
      // Mid-transition: swallow the press instead of starting a second one.
      if (phase !== "idle") return true;
      endHomeIntro();
      phase = "covering";
      target = href;
      keepScroll = url.hash !== "";
      label = labelFor(url.pathname);
      const text = labelGlyphs(pen, grid, family, label);
      resetLoads();
      prefetch(href);
      lockScroll();
      show();
      status.textContent = `Opening ${label.toLowerCase()}`;
      const origin = from ? { x: from.x / window.innerWidth, y: from.y / window.innerHeight } : { x: 0.5, y: 0.5 };
      send({ type: "cover", origin, glyphs: text }, buffers(text));
      return true;
    },
    arrived(pathname) {
      endHomeIntro();
      if (failed) return;
      if (phase === "covering") {
        // On the next frame, once the new page has taken over the scroll.
        if (!keepScroll) requestAnimationFrame(() => jumpTo(0));
        send({ type: "arrived" });
        return;
      }
      if (phase !== "idle") return;
      // Back or forward: the page has already changed. The wrapper's flat
      // ground covers it before it paints, until the canvas has drawn the sheet.
      phase = "covering";
      keepScroll = true;
      label = labelFor(pathname);
      delete wrap.dataset.live;
      lockScroll();
      show();
      setStage(false);
      const text = labelGlyphs(pen, grid, family, label);
      send({ type: "snap", glyphs: text }, buffers(text));
    },
    dispose() {
      alive = false;
      connection.port.close();
      cancelAnimationFrame(resizing);
      window.removeEventListener("load", onLoad);
      window.removeEventListener("resize", onResize);
      stopLoads();
      if (phase !== "idle") unlockScroll();
    },
  };
}

/** The loader and the page transition. Mounted once, in the root layout. */
export function Veil() {
  const pathname = usePathname();
  const router = useRouter();
  const routerRef = useRef(router);
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const host = useRef<Host | null>(null);
  const closing = useRef(0);
  const seen = useRef(pathname);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const status = statusRef.current;
    if (!wrap || !canvas || !status) return;
    window.clearTimeout(closing.current);
    // A canvas hands its drawing to a worker only once, and Strict Mode runs
    // this effect twice on the same canvas: keep the host made the first time.
    let made = host.current?.canvas === canvas ? host.current : null;
    if (!made) {
      made = createHost(
        wrap,
        canvas,
        status,
        (href) => routerRef.current.push(href),
        (href) => routerRef.current.prefetch(href),
      );
      if (!made) {
        // No canvas: step aside and let the page play.
        wrap.style.visibility = "hidden";
        setStage(true);
        return;
      }
      host.current = made;
    }
    const current = made;
    setNavigator(current.go);
    return () => {
      setNavigator(null);
      // Put away only when nothing takes it straight back, as Strict Mode does.
      closing.current = window.setTimeout(() => {
        current.dispose();
        if (host.current === current) host.current = null;
      }, 0);
    };
  }, []);

  // Before paint, so a page reached with back or forward never shows uncovered.
  useLayoutEffect(() => {
    if (seen.current === pathname) return;
    seen.current = pathname;
    host.current?.arrived(pathname);
  }, [pathname]);

  return (
    <div ref={wrapRef} className="veil font-sans">
      <canvas ref={canvasRef} aria-hidden="true" className="relative block h-full w-full" />
      <p ref={statusRef} role="status" className="sr-only">
        Loading
      </p>
    </div>
  );
}
