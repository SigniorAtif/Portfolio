import type { Metadata } from "next";
import { Sparks } from "@/components/about/Sparks";
import { QFound } from "@/components/eggs/QFound";
import { Footer } from "@/components/footer/Footer";
import { FooterCurtain } from "@/components/footer/FooterCurtain";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { SiteMark } from "@/components/nav/SiteMark";
import { PageLink } from "@/components/transition/PageLink";
import { SwapLabel } from "@/components/ui/SwapLabel";
import { projects } from "@/content/projects";

export const metadata: Metadata = {
  title: "Read through the air",
  description: "Where the QR code in the portrait's dust leads.",
  robots: { index: false, follow: false },
};

const quexchange = projects.find((project) => project.slug === "quexchange");

/**
 * Where the QR code the hero's dust forms leads (components/hero/BustStage).
 * Reaching it records the egg on the device that scanned. Not linked from the
 * site's pages, and not in the sitemap.
 */
export default function QPage() {
  return (
    <SmoothScroll>
      <QFound />
      <Sparks />
      <SiteMark page="/q" />
      <main id="top">
        <section
          aria-labelledby="q-title"
          className="flex min-h-svh flex-col justify-center gap-8 px-[var(--gutter)] pb-[clamp(88px,14vh,180px)] pt-[clamp(136px,24vh,260px)]"
        >
          <p className="kicker">Q / Read through the air</p>
          <h1
            id="q-title"
            className="max-w-[14ch] text-[clamp(44px,8vw,128px)] font-medium leading-[0.95] tracking-[-0.045em]"
          >
            You just read a file through the air.
          </h1>
          <p className="max-w-[34rem] text-[19px] leading-[1.5] text-body">
            QuExchange works the same. One screen plays a file as QR frames, another reads them with its camera. No
            network at all.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[clamp(18px,1.6vw,24px)]">
            {quexchange?.live && (
              <a href={quexchange.live} target="_blank" rel="noopener noreferrer" className="link-line hit">
                <SwapLabel>Try QuExchange</SwapLabel>
                <span aria-hidden="true" className="arrow">
                  ↗
                </span>
              </a>
            )}
            <PageLink href="/work" className="link-line hit">
              <SwapLabel>See the work</SwapLabel>
            </PageLink>
          </div>
        </section>
      </main>
      <FooterCurtain />
      <Footer />
    </SmoothScroll>
  );
}
