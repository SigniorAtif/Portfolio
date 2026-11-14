import type { Metadata } from "next";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { WorkIntroLab } from "@/components/work/WorkIntroLab";

export const metadata: Metadata = {
  title: "Work opening test",
  robots: { index: false, follow: false },
};

/** Scratch page for trying the selected-work opening against different backdrops. Not linked from anywhere. */
export default function Test() {
  return (
    <SmoothScroll>
      <WorkIntroLab />
    </SmoothScroll>
  );
}
