import type { Metadata } from "next";
import { Sparks } from "@/components/about/Sparks";
import { EggList } from "@/components/eggs/EggList";
import { Footer } from "@/components/footer/Footer";
import { FooterCurtain } from "@/components/footer/FooterCurtain";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { SiteMark } from "@/components/nav/SiteMark";

export const metadata: Metadata = {
  title: "Eggs",
  description: "The easter eggs you have found on this site.",
  robots: { index: false, follow: false },
};

/** The easter eggs a visitor has found, and blanks for the rest. Not linked from the site's pages, and not in the sitemap. */
export default function EggsPage() {
  return (
    <SmoothScroll>
      <Sparks />
      <SiteMark page="/eggs" />
      <main id="top">
        <EggList />
      </main>
      <FooterCurtain />
      <Footer />
    </SmoothScroll>
  );
}
