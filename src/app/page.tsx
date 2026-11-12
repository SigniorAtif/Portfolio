import { Footer } from "@/components/footer/Footer";
import { FooterCurtain } from "@/components/footer/FooterCurtain";
import { Hero } from "@/components/hero/Hero";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { SiteMark } from "@/components/nav/SiteMark";
import { Reel } from "@/components/reel/Reel";
import { Work } from "@/components/work/Work";
import { reel } from "@/content/reel";

export default function Home() {
  return (
    <SmoothScroll>
      <SiteMark />
      <main>
        <Hero />
        {reel.enabled && <Reel />}
        <Work />
      </main>
      <FooterCurtain />
      <Footer />
    </SmoothScroll>
  );
}
