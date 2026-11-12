"use client";

import { Fragment } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";

const OUT = { duration: 0.22, ease: [0.5, 0, 0.75, 0] } as const;
const IN = { duration: 0.7, ease: [0.16, 1, 0.3, 1] } as const;
const STAGGER = 0.022; // between one word and the next, seconds

type Props = {
  /** Changes when the text does; the old text leaves before the new one arrives. */
  id: string;
  text: string;
  className?: string;
  /** Seconds the arriving words wait, so one block can follow another. */
  delay?: number;
};

/**
 * Text that changes in place. Every word sits behind its own mask: the old
 * words leave upward together, the new ones rise from below one after another.
 */
export function SwapText({ id, text, className, delay = 0 }: Props) {
  const words = text.split(" ");
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait" initial={false}>
        <motion.p key={id} className={className} initial="below" animate="in" exit="above">
          {words.map((word, i) => (
            <Fragment key={i}>
              <span className="swap-word">
                <motion.span
                  className="inline-block"
                  variants={{
                    below: { y: "115%" },
                    in: { y: "0%", transition: { ...IN, delay: delay + i * STAGGER } },
                    above: { y: "-115%", transition: OUT },
                  }}
                >
                  {word}
                </motion.span>
              </span>
              {i < words.length - 1 && " "}
            </Fragment>
          ))}
        </motion.p>
      </AnimatePresence>
    </MotionConfig>
  );
}
