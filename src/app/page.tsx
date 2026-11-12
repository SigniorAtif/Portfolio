import { Footer } from "@/components/footer/Footer";
import { FooterCurtain } from "@/components/footer/FooterCurtain";
import { Hero } from "@/components/hero/Hero";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { SiteMark } from "@/components/nav/SiteMark";

export default function Home() {
  return (
    <SmoothScroll>
      <SiteMark />
      <main>
        <Hero />
        {/* Reel, Work and Myself land here next. */}
        <div id="work" className="h-[60svh]" />
      </main>
      <FooterCurtain />
      <Footer />
    </SmoothScroll>
  );
}
