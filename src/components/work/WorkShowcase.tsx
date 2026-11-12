"use client";

import { useState } from "react";
import type { Project } from "@/content/projects";
import { WorkDetails } from "./WorkDetails";
import { WorkIntro, type Backdrop } from "./WorkIntro";

/** The work opening and the details under it, sharing which project is on top of the wheel. */
export function WorkShowcase({ projects, backdrop }: { projects: Project[]; backdrop: Backdrop }) {
  const [focused, setFocused] = useState(0);

  return (
    <>
      <WorkIntro projects={projects} backdrop={backdrop} handoff onFocusChange={setFocused} />
      <div className="relative z-10 bg-ground px-[var(--gutter)] pb-[clamp(72px,11vh,140px)] pt-[clamp(40px,6vh,72px)]">
        <WorkDetails projects={projects} focused={focused} />
      </div>
    </>
  );
}
