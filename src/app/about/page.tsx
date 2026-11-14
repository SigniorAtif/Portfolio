import type { Metadata } from "next";
import { AboutContact } from "@/components/about/AboutContact";
import { AboutDesk } from "@/components/about/AboutDesk";
import { AboutLanguages } from "@/components/about/AboutLanguages";
import { AboutMarquee } from "@/components/about/AboutMarquee";
import { AboutOpening } from "@/components/about/AboutOpening";
import { AboutSkills } from "@/components/about/AboutSkills";
import { AboutStrands } from "@/components/about/AboutStrands";
import { AboutYears } from "@/components/about/AboutYears";
import { Sparks } from "@/components/about/Sparks";
import { TiltPortrait } from "@/components/about/TiltPortrait";
import { FadeUp } from "@/components/motion/FadeUp";
import { Footer } from "@/components/footer/Footer";
import { FooterCurtain } from "@/components/footer/FooterCurtain";
import { SmoothScroll } from "@/components/motion/SmoothScroll";
import { Decode, Lines, Rise } from "@/components/motion/Text";
import { AsciiMug, AsciiToon } from "@/components/notfound/AsciiToon";
import { SiteMark } from "@/components/nav/SiteMark";
import { OnScreen } from "@/components/ui/OnScreen";
import { busy, chapters, homeTown, skills, statement, story, strands } from "@/content/about";
import { featured } from "@/content/projects";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "About",
  description: "Atif Ahmed has written code since 2015 and ranks 9th globally at the International Codewars Olympiad. What he builds, what he builds it with, and the rest.",
  alternates: { canonical: "/about" },
};

const facts = [
  { label: "Based in", value: site.location },
  { label: "From", value: homeTown },
  { label: "Studied at", value: site.alumniOf },
  { label: "Ranked", value: "9th globally, International Codewars Olympiad" },
];

const proof = strands.map((strand) => ({
  title: strand.title,
  text: strand.text,
  projects: featured.filter((project) => strand.kinds.includes(project.kind)).map(({ slug, name }) => ({ slug, name })),
}));

const stack = Array.from(new Set(featured.flatMap((project) => project.stack)));

/**
 * The about page: the name in dots, the short version, the years, what he
 * does, what he does it with, the desk, the rest of his time, and the ask.
 */
export default function AboutPage() {
  return (
    <SmoothScroll>
      <Sparks />
      <SiteMark page="/about" />

      <main className="overflow-x-clip">
        <AboutOpening facts={facts} />

        <section aria-labelledby="story-title" className="grid items-start gap-x-[clamp(32px,6vw,96px)] gap-y-12 px-[var(--gutter)] py-[clamp(88px,14vh,180px)] lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)]">
          <TiltPortrait
            src="/myself/atif.webp"
            alt="Atif in glasses and a red shirt, straightening his collar with both hands."
            className="w-full max-w-[420px] max-lg:mx-auto lg:sticky lg:top-[14svh]"
          />
          <div className="flex flex-col gap-8">
            <Decode as="p" className="kicker">
              01 / The short version
            </Decode>
            <h2 id="story-title" className="sr-only">
              The short version
            </h2>
            <Lines as="p" className="text-[clamp(26px,3vw,46px)] font-semibold leading-[1.14] tracking-[-0.03em]">
              {statement}
            </Lines>
            <div className="grid gap-x-10 gap-y-6 pt-2 sm:grid-cols-2">
              {story.map((paragraph) => (
                <Lines key={paragraph} as="p" className="text-[18px] leading-[1.55] text-body">
                  {paragraph}
                </Lines>
              ))}
            </div>
          </div>
        </section>

        <AboutYears chapters={chapters} />

        <AboutStrands strands={proof} />

        <section aria-label="Toolbox" className="py-[clamp(88px,14vh,180px)]">
          <div className="flex flex-col gap-4 px-[var(--gutter)] pb-[clamp(32px,5vw,72px)]">
            <Decode as="p" className="kicker">
              04 / Toolbox
            </Decode>
            <Rise as="h2" className="text-[clamp(36px,5.2vw,76px)] font-medium leading-[1.02] tracking-[-0.035em]">
              What I reach for.
            </Rise>
          </div>
          <AboutMarquee items={stack} />
          <div className="px-[var(--gutter)] pt-[clamp(56px,8vw,120px)]">
            <AboutSkills skills={skills} />
          </div>
        </section>

        <AboutDesk />

        <section aria-label="Off the clock" className="px-[var(--gutter)] py-[clamp(88px,14vh,180px)]">
          <div className="flex flex-col gap-4 pb-[clamp(32px,5vw,72px)]">
            <Decode as="p" className="kicker">
              06 / Off the clock
            </Decode>
            <Rise as="h2" className="text-[clamp(36px,5.2vw,76px)] font-medium leading-[1.02] tracking-[-0.035em]">
              Not all of it is code.
            </Rise>
          </div>

          {/* One bento: the list on the left, the old portfolio's toons boxed on the right, the languages along the bottom.
              The toons are unmounted off screen: they draw every frame. */}
          <FadeUp each="cards" className="about-bento">
            <div className="about-tile flex flex-col gap-4 p-[clamp(20px,2.4vw,36px)] [grid-area:busy]">
              <p className="kicker">Also busy with</p>
              <ol className="about-busy flex flex-1 flex-col border-t border-line">
                {busy.map((item, i) => (
                  <li key={item} className="flex flex-1 items-baseline gap-5 border-b border-line py-[clamp(10px,1.3vw,18px)] last:border-b-0">
                    <span className="kicker w-8 tabular-nums">0{i + 1}</span>
                    <span className="text-[clamp(30px,4.6vw,72px)] font-medium leading-[1] tracking-[-0.04em]">{item}</span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="about-tile grid min-h-[200px] place-items-center [grid-area:ufo]">
              <OnScreen className="aspect-[4/5] w-[min(74%,190px)]">
                <AsciiToon id="ufo" />
              </OnScreen>
            </div>
            <div className="about-tile grid min-h-[200px] place-items-center [grid-area:astro]">
              <OnScreen className="relative aspect-[4/3] w-[min(86%,340px)]">
                <AsciiToon id="astronaut" sharpness={2} />
                <AsciiMug className="absolute left-[2%] top-[-4%] w-[18%]" />
              </OnScreen>
            </div>
            <div className="about-tile grid min-h-[220px] place-items-end justify-items-center [grid-area:dino]">
              <OnScreen className="aspect-[4/3] w-[min(72%,420px)]">
                <AsciiToon id="dino" />
              </OnScreen>
            </div>

            <AboutLanguages />
          </FadeUp>
        </section>

        <AboutContact />
      </main>

      <FooterCurtain />
      <Footer />
    </SmoothScroll>
  );
}
