import type { Metadata } from "next";
import { Sparks } from "@/components/about/Sparks";
import { ContactNote } from "@/components/contact/ContactNote";
import { Footer } from "@/components/footer/Footer";
import { FooterCurtain } from "@/components/footer/FooterCurtain";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { SiteMark } from "@/components/nav/SiteMark";

export const metadata: Metadata = {
  title: "Contact",
  description: "Write to Atif Ahmed: fill in the blanks of a short note and send it.",
  alternates: { canonical: "/contact" },
};

/** The contact page: one note with blanks in it, then the direct lines. */
export default function ContactPage() {
  return (
    <SmoothScroll>
      <Sparks />
      <SiteMark page="/contact" />
      <main id="top" className="pt-[clamp(112px,18vh,200px)]">
        <ContactNote />
      </main>
      <FooterCurtain />
      <Footer />
    </SmoothScroll>
  );
}
