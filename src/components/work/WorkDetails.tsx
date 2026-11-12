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

  return (
    <MotionConfig reducedMotion="user">
      <ol className="border-t border-line" onPointerMove={place} onPointerLeave={() => setHot(null)}>
        {projects.map((project, i) => {
          const href = project.live ?? project.source;
          return (
            <li
              key={project.slug}
              id={`project-${project.slug}`}
              onPointerEnter={(event) => {
                if (event.pointerType !== "mouse") return;
                // The card opens where the pointer is, not where it last was.
                if (!hot) place(event, true);
                setHot(project);
              }}
              className="relative isolate grid scroll-mt-24 grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 border-b border-line py-4 sm:grid-cols-[3rem_minmax(0,14rem)_minmax(0,1fr)_auto]"
            >
              {i === focused && (
                // One highlight that slides from row to row as the wheel turns.
                <motion.span
                  layoutId="work-row"
                  aria-hidden="true"
                  className="absolute inset-x-[calc(var(--gutter)*-0.5)] inset-y-0 -z-10 rounded-[14px] bg-panel"
                  transition={{ type: "spring", stiffness: 380, damping: 36 }}
                />
              )}
              <span className="kicker">{number(project)}</span>
              <span className="text-[19px] font-medium tracking-[-0.02em]">{project.name}</span>
              <span className="text-body max-sm:col-span-2 max-sm:col-start-2 max-sm:row-start-2">{project.oneLiner}</span>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${project.name}: ${project.live ? "open the live site" : "view the source"}`}
                  className="link-line font-mono text-[12px] uppercase tracking-[0.12em] text-muted hover:text-ink max-sm:col-start-3 max-sm:row-start-1"
                >
                  <SwapLabel>{project.live ? "Live" : "Source"}</SwapLabel>
                  <span aria-hidden="true" className="arrow">
                    ↗
                  </span>
                </a>
              ) : (
                <span className="font-mono text-[12px] uppercase tracking-[0.12em] text-line-strong max-sm:col-start-3 max-sm:row-start-1">
                  Private
                </span>
              )}
            </li>
          );
        })}
      </ol>

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
