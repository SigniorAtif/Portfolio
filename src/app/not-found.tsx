import type { Metadata } from "next";
import Link from "next/link";
import { AsciiToon } from "@/components/notfound/AsciiToon";
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

/** The 404: the number in dots that never quite finish assembling, and a toon for company. */
export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col px-[var(--gutter)]">
      <header className="py-6">
        <Link href="/" className="text-[26px] font-semibold tracking-tight">
          {site.name}.
        </Link>
      </header>

      <div className="flex flex-1 flex-col justify-center pb-[8svh]">
        <div className="flex flex-col items-center gap-x-[4vw] gap-y-2 md:flex-row md:justify-center">
          <DotText text="404" className="h-[clamp(150px,30vw,340px)] w-full max-w-[760px] md:flex-[1.9]" />
          <AsciiToon className="w-[min(72vw,340px)] md:w-auto md:max-w-[380px] md:flex-1" />
        </div>

        <div className="mt-[clamp(28px,5vh,56px)] flex flex-col gap-4">
          <p className="kicker">Error 404</p>
          <h1 className="text-[clamp(32px,4.6vw,64px)] font-medium leading-[1.05] tracking-[-0.035em]">
            This page didn&apos;t assemble.
          </h1>
          <p className="max-w-[48ch] text-[17px] leading-[1.5] text-body">
            The address points at nothing: a page that moved, or one that was never built. The rest of the site is
            where you left it.
          </p>
          <nav aria-label="Ways out" className="mt-2 flex flex-wrap gap-x-8 gap-y-3 font-mono text-sm uppercase tracking-[0.12em]">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="link-line">
                <SwapLabel>{link.label}</SwapLabel>
                <span aria-hidden="true" className="arrow">
                  ↗
                </span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </main>
  );
}
