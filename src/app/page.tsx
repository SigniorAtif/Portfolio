import { Sparks } from "@/components/about/Sparks";
import { Footer } from "@/components/footer/Footer";
import { FooterCurtain } from "@/components/footer/FooterCurtain";
import { Hero } from "@/components/hero/Hero";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { Myself } from "@/components/myself/Myself";
import { SiteMark } from "@/components/nav/SiteMark";
import { Outro } from "@/components/outro/Outro";
import { Reel } from "@/components/reel/Reel";
import { Work } from "@/components/work/Work";
import { reel } from "@/content/reel";

export default function Home() {
  return (
    <SmoothScroll>
      <Sparks />
      <SiteMark />
      <main>
        <Hero />
        {reel.enabled && <Reel />}
        <Work />
        <Myself />
        <Outro id="outro" />
      </main>
      <FooterCurtain />
      <Footer />
    </SmoothScroll>
  );
}
