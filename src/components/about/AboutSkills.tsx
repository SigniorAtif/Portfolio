"use client";

import { useState } from "react";
import { MotionConfig, motion } from "motion/react";
import { FadeUp } from "@/components/motion/FadeUp";
import type { Skill } from "@/content/about";

const two = (n: number) => String(n).padStart(2, "0");

/**
 * The main skills, in the row language of home's project table: number, the
 * field in large type, what he uses for it, and how many. One highlight
 * slides to the row under the pointer, and that row's tools come up to full ink.
 */
export function AboutSkills({ skills }: { skills: Skill[] }) {
  const [lit, setLit] = useState<number | null>(null);

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 sm:grid-cols-[3rem_minmax(0,1fr)_auto] sm:gap-x-6 lg:grid-cols-[3rem_minmax(0,24rem)_minmax(0,1fr)_auto]"
        onPointerLeave={() => setLit(null)}
      >
        <div aria-hidden="true" className="col-span-full grid grid-cols-subgrid pb-3 max-sm:hidden">
          <span className="kicker">No.</span>
          <span className="kicker">Field</span>
          <span className="kicker max-lg:hidden">Works with</span>
          <span className="kicker justify-self-end">Count</span>
        </div>

        <FadeUp as="ol" each="cards" className="col-span-full grid grid-cols-subgrid border-t border-line">
          {skills.map((skill, i) => {
            const on = i === lit;
            return (
              <li
                key={skill.name}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse") setLit(i);
                }}
                className="relative isolate col-span-full grid grid-cols-subgrid items-baseline gap-y-3 border-b border-line py-6 sm:py-8"
              >
                {on && (
                  <motion.span
                    layoutId="skill-row"
                    aria-hidden="true"
                    className="absolute inset-x-[calc(var(--gutter)*-0.5)] inset-y-0 -z-10 rounded-[14px] bg-panel"
                    transition={{ type: "spring", stiffness: 380, damping: 36 }}
                  />
                )}
                <span className={`kicker tabular-nums transition-colors duration-300 ${on ? "!text-ink" : ""}`}>{two(i + 1)}</span>
                <h3
                  className={`text-[clamp(26px,3.2vw,48px)] font-medium leading-[1.02] tracking-[-0.03em] transition-transform duration-500 ease-[var(--ease-out)] ${on ? "translate-x-2" : ""}`}
                >
                  {skill.name}
                </h3>
                <ul
                  className={`flex flex-wrap gap-x-2 gap-y-1 text-[17px] leading-[1.45] transition-colors duration-300 max-lg:[grid-column:2/-1] max-lg:[grid-row:2] ${on ? "text-ink" : "text-muted [@media(hover:none)]:text-body"}`}
                >
                  {skill.tools.map((tool, n) => (
                    <li key={tool}>
                      {tool}
                      {n < skill.tools.length - 1 && <span aria-hidden="true" className="pl-2 text-line-strong">/</span>}
                    </li>
                  ))}
                </ul>
                <span className="kicker justify-self-end tabular-nums max-sm:hidden">{two(skill.tools.length)}</span>
              </li>
            );
          })}
        </FadeUp>
      </div>
    </MotionConfig>
  );
}
