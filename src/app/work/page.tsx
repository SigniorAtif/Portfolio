import type { Metadata } from "next";
import { PageLink } from "@/components/transition/PageLink";
import { Sparks } from "@/components/about/Sparks";
import { Build } from "@/components/build/Build";
import { BuildConductor } from "@/components/build/BuildConductor";
import { Footer } from "@/components/footer/Footer";
import { FooterCurtain } from "@/components/footer/FooterCurtain";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { Decode, Lines, Rise } from "@/components/motion/Text";
import { SiteMark } from "@/components/nav/SiteMark";
import { WorkGrid } from "@/components/work/WorkGrid";
import { featured } from "@/content/projects";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Work",
  description: "Every project by Atif Ahmed: what each one is, what it is built with, and where to open it.",
  alternates: { canonical: "/work" },
};

const door =
  "group flex flex-col gap-4 rounded-[20px] border border-line p-[clamp(20px,2.4vw,36px)] transition-colors duration-300 ease-[var(--ease-hover)] hover:border-ink";

/**
 * The work index: every project as one ruled row on one page. Home has the
 * show (the wheel); this page is for reading.
 */
export default function WorkPage() {
  return (
    <SmoothScroll>
      <Sparks />
      <SiteMark page="/work" />
      <main>
        <section
          id="top"
          aria-labelledby="work-title"
          className="grid items-end gap-x-10 gap-y-8 px-[var(--gutter)] pb-[clamp(40px,6vw,88px)] pt-[clamp(136px,24vh,260px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]"
        >
          <div className="flex flex-col gap-4">
            <Decode as="p" className="kicker">
              Work / Index
            </Decode>
            <h1 id="work-title" className="flex items-start gap-[0.12em] text-[clamp(56px,11vw,176px)] font-medium leading-[0.92] tracking-[-0.045em]">
              <Rise as="span" at={1}>
                All work
              </Rise>
              <span className="pt-[0.5em] font-mono text-[max(11px,0.13em)] tracking-normal text-muted">({String(featured.length).padStart(2, "0")})</span>
            </h1>
          </div>
          <Lines as="p" at={1} delay={0.3} className="pb-3 text-[19px] leading-[1.5] text-body">
            Everything here was built to be used. Each entry says what it is, what it is made of, and where to open it.
          </Lines>
        </section>

        {/* Below the rows heading, agent cursors put the page together as it scrolls in. */}
        <BuildConductor>
          <WorkGrid projects={featured} />

          {/* The page does not end on a list: two doors on. */}
          <section aria-label="Where next" className="px-[var(--gutter)] pb-[clamp(88px,14vh,180px)] pt-[clamp(56px,8vw,120px)]">
            <Build each className="grid gap-3 sm:grid-cols-2">
              <PageLink href="/about" data-box className={door}>
                <span data-type className="kicker">Next</span>
                <span data-type className="text-[clamp(40px,6vw,96px)] font-medium leading-none tracking-[-0.04em]">
                  About
                  <span aria-hidden="true" className="arrow">
                    ↗
                  </span>
                </span>
              </PageLink>
              <a href={`mailto:${site.email}`} data-box className={door}>
                <span data-type className="kicker">Say hello</span>
                <span data-type className="mt-auto text-[clamp(22px,2.8vw,44px)] font-medium leading-[1.05] tracking-[-0.03em] [overflow-wrap:anywhere]">
                  {site.email}
                  <span aria-hidden="true" className="arrow">
                    ↗
                  </span>
                </span>
              </a>
            </Build>
          </section>
        </BuildConductor>
      </main>
      <FooterCurtain />
      <Footer />
    </SmoothScroll>
  );
}
