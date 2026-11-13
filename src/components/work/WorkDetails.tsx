"use client";

import { useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { AnimatePresence, MotionConfig, motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { SwapLabel } from "@/components/ui/SwapLabel";
import type { Project } from "@/content/projects";

const number = (project: Project) => String(project.order).padStart(2, "0");

const FINE = "(hover: hover) and (pointer: fine) and (min-width: 900px)";
const GAP = 28; // between the pointer and the card that follows it
const EASE = [0.16, 1, 0.3, 1] as const;
const SPRING = { stiffness: 220, damping: 26, mass: 0.6 };

function watchPointer(notify: () => void) {
  const query = window.matchMedia(FINE);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
}

/**
 * What sits under the wheel: the plain list of every project, which is the
 * whole section for anyone without the wheel. With a mouse, a card for the
 * row under the pointer follows it.
 */
export function WorkDetails({ projects, focused }: { projects: Project[]; focused: number }) {
  const reduced = useReducedMotion();
  const fine = useSyncExternalStore(
    watchPointer,
    () => window.matchMedia(FINE).matches,
    () => false,
  );
  const [hot, setHot] = useState<Project | null>(null);
  // Row under the mouse or holding keyboard focus; the highlight goes back to the wheel's card without one.
  const [pointed, setPointed] = useState<number | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const followX = useSpring(x, SPRING);
  const followY = useSpring(y, SPRING);

  const place = (event: React.PointerEvent, jump = false) => {
    const width = Math.min(400, Math.max(280, window.innerWidth * 0.26));
    const height = (width * 9) / 16;
    // Beside the pointer; on the other side of it when the screen edge is in the way.
    const right = event.clientX + GAP;
    const left = right + width > window.innerWidth - 16 ? event.clientX - GAP - width : right;
    const top = Math.min(Math.max(event.clientY - height / 2, 16), window.innerHeight - height - 16);
    x.set(left);
    y.set(top);
    if (jump) {
      followX.jump(left);
      followY.jump(top);
    }
  };

  const lit = pointed ?? focused;

  return (
    <MotionConfig reducedMotion="user">
      {/* One grid for the header and every row (each is a subgrid), so the columns line up down the list. */}
      <div
        className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:gap-x-6 lg:grid-cols-[3rem_minmax(0,15rem)_minmax(0,1fr)_auto_auto]"
        onPointerMove={place}
        onPointerLeave={() => {
          setHot(null);
          setPointed(null);
        }}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPointed(null);
        }}
      >
        <div aria-hidden="true" className="col-span-full grid grid-cols-subgrid pb-3 max-sm:hidden">
          <span className="kicker">No.</span>
          <span className="kicker">Project</span>
          <span className="kicker max-lg:hidden">About</span>
          <span className="kicker max-lg:hidden">Type</span>
          <span className="kicker justify-self-end">Links</span>
        </div>

        <ol className="col-span-full grid grid-cols-subgrid border-t border-line">
          {projects.map((project, i) => {
            const href = project.live ?? project.source;
            const on = i === lit;
            const links = [
              { href: project.live, label: "Live", says: "open the live site" },
              { href: project.source, label: "Source", says: "view the source" },
            ].filter((link): link is { href: string; label: string; says: string } => !!link.href);
            return (
              <li
                key={project.slug}
                id={`project-${project.slug}`}
                onPointerEnter={(event) => {
                  if (event.pointerType !== "mouse") return;
                  // The card opens where the pointer is, not where it last was.
                  if (!hot) place(event, true);
                  setHot(project);
                  setPointed(i);
                }}
                onFocus={() => setPointed(i)}
                className="relative isolate col-span-full grid scroll-mt-24 grid-cols-subgrid items-baseline gap-y-1 border-b border-line py-4 sm:py-5"
              >
                {on && (
                  // One highlight that slides from row to row: the row under the pointer or
                  // keyboard, else the card on top of the wheel.
                  <motion.span
                    layoutId="work-row"
                    aria-hidden="true"
                    className="absolute inset-x-[calc(var(--gutter)*-0.5)] inset-y-0 -z-10 rounded-[14px] bg-panel"
                    transition={{ type: "spring", stiffness: 380, damping: 36 }}
                  />
                )}
                {href && (
                  // The whole row opens the project for a pointer; keyboards and screen readers use the named links.
                  <a href={href} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true" className="absolute inset-0" />
                )}
                <span className={`kicker tabular-nums transition-colors duration-300 ${on ? "!text-ink" : ""}`}>{number(project)}</span>
                <span className="text-[19px] font-medium leading-tight tracking-[-0.02em] sm:text-[20px]">{project.name}</span>
                {/* Under the name until there is room for a column of its own. */}
                <span className={`max-w-[62ch] transition-colors duration-300 max-lg:[grid-column:2/-1] ${on ? "text-body" : "text-muted"}`}>
                  {project.oneLiner}
                </span>
                <span className="kicker whitespace-nowrap max-lg:hidden">{project.kind}</span>
                <span className="relative z-10 flex gap-5 font-mono text-[12px] uppercase tracking-[0.12em] max-sm:col-start-2 max-sm:mt-1 sm:justify-self-end sm:max-lg:col-start-3 sm:max-lg:row-start-1">
                  {links.length ? (
                    links.map((link) => (
                      <a
                        key={link.label}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${project.name}: ${link.says}`}
                        className="link-line -my-3 inline-flex items-baseline py-3 text-body transition-colors duration-300 hover:text-ink"
                      >
                        <SwapLabel>{link.label}</SwapLabel>
                        <span aria-hidden="true" className="arrow">
                          ↗
                        </span>
                      </a>
                    ))
                  ) : (
                    <span className="text-muted">Private</span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      {fine && !reduced && (
        <AnimatePresence>
          {hot && (
            <motion.div
              key="peek"
              aria-hidden="true"
              className="work-peek"
              style={{ x: followX, y: followY }}
              initial={{ clipPath: "inset(0 0 100% 0 round 16px)", scale: 0.96 }}
              animate={{ clipPath: "inset(0 0 0% 0 round 16px)", scale: 1 }}
              exit={{ clipPath: "inset(100% 0 0 0 round 16px)", scale: 0.96 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              <AnimatePresence initial={false}>
                <motion.div
                  key={hot.slug}
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: 1.06 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: EASE }}
                >
                  <Peek project={hot} />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </MotionConfig>
  );
}

/** The face of the following card: the project's picture, or the dot plate with its name. */
function Peek({ project }: { project: Project }) {
  const media = project.media;
  return (
    <>
      {!media ? (
        <span className="dot-plate absolute inset-0 grid place-items-center p-4">
          <span className="text-center text-[22px] font-semibold leading-[1.05] tracking-[-0.03em] text-body [overflow-wrap:anywhere]">
            {project.name}
          </span>
        </span>
      ) : /\.(mp4|webm)$/.test(media) ? (
        <video src={media} muted loop playsInline autoPlay className="h-full w-full object-cover object-top" />
      ) : (
        <Image src={media} alt="" width={336} height={596} sizes="400px" className="h-full w-full object-cover object-top" />
      )}
      <span className="absolute inset-x-0 bottom-0 flex items-baseline gap-2 bg-gradient-to-t from-ground/90 to-transparent px-3.5 pb-3 pt-10 font-mono text-[10px] uppercase tracking-[0.14em]">
        <span className="text-muted">{number(project)}</span>
        <span className="truncate">{project.kind}</span>
      </span>
    </>
  );
}
