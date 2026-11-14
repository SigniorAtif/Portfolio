import type { Metadata } from "next";
import { PageLink } from "@/components/transition/PageLink";
import { AsciiMug, AsciiToon } from "@/components/notfound/AsciiToon";
import { DotText } from "@/components/notfound/DotText";
import { SwapLabel } from "@/components/ui/SwapLabel";
import { site } from "@/content/site";

export const metadata: Metadata = {
  title: "Not found",
  robots: { index: false, follow: false },
};

const links = [
  { label: "Back home", href: "/" },
  { label: "Work", href: "/#work" },
];

const button =
  "inline-flex h-12 items-center rounded-full border px-6 text-[17px] transition-colors duration-300 ease-[var(--ease-hover)]";

/** The 404: the number in dots that never quite finish assembling, with the toons for company. */
export default function NotFound() {
  return (
    <main className="relative flex min-h-svh flex-col overflow-clip px-[var(--gutter)]">
      {/* The old portfolio's company, out at the edges where the page is empty. */}
      <AsciiToon
        id="ufo"
        className="pointer-events-none absolute left-0 top-[8svh] w-[clamp(140px,24vw,330px)] md:left-[2%]"
      />
      <div className="pointer-events-none absolute right-0 top-[10svh] w-[clamp(170px,26vw,400px)]">
        <AsciiToon id="astronaut" sharpness={2} />
        <AsciiMug className="absolute left-0 top-[-8%] w-[21%]" />
      </div>
      <AsciiToon
        id="dino"
        className="pointer-events-none absolute bottom-0 right-[-4%] w-[clamp(200px,32vw,520px)]"
      />
      {/* One more of them, swimming in the bottom left corner. */}
      <AsciiToon
        id="shrimp"
        className="pointer-events-none absolute bottom-[5svh] left-[1%] w-[clamp(170px,25vw,400px)]"
      />
      <header className="py-6">
        <PageLink href="/" className="text-[26px] font-semibold tracking-tight">
          {site.name}.
        </PageLink>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-[clamp(28px,5vh,56px)] pb-[8svh]">
        <DotText text="404" weight={800} dots={2600} className="h-[clamp(150px,28vw,400px)] w-full max-w-[1200px]" />

        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-[clamp(30px,3.4vw,48px)] font-medium leading-[1.05] tracking-[-0.03em]">
            This page didn&apos;t assemble.
          </h1>
          <p className="text-[clamp(17px,1.4vw,19px)] leading-[1.5] text-body">
            The address is wrong, or the page moved.
          </p>
          <nav aria-label="Ways out" className="flex flex-wrap justify-center gap-3 pt-2">
            {links.map((link, i) => (
              <PageLink
                key={link.href}
                href={link.href}
                className={`${button} ${
                  i === 0 ? "border-ink bg-ink text-ground hover:border-white hover:bg-white" : "border-line-strong hover:border-ink"
                }`}
              >
                <SwapLabel>{link.label}</SwapLabel>
              </PageLink>
            ))}
          </nav>
        </div>
      </div>
    </main>
  );
}
