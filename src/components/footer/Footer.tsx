import { SwapLabel } from "@/components/ui/SwapLabel";
import { footerNav, site, socials } from "@/content/site";
import { FooterMark } from "./FooterMark";
import { SpaceField } from "./SpaceField";

// Reading the clock is not allowed during prerender, so the year is a cached
// value: stamped at build time and refreshed by the default cache lifetime.
async function currentYear() {
  "use cache";
  return new Date().getFullYear();
}

/**
 * Closes the page: a mono rule line, the email as one huge link, the sections
 * as numbered rows, and the name rising out of the bottom edge. The name is
 * the only thing that animates in; the rest is simply there.
 *
 * The backdrop is the hero's drifting dust, fixed to the viewport. `clip-path`
 * on the footer shows it only through the footer.
 *
 * The footer slides up over the held, blurred page (see FooterCurtain), so it
 * has an opaque ground and sits above the curtain's veil.
 */
export async function Footer() {
  const year = await currentYear();
  return (
    <footer className="relative isolate z-20 border-t border-line bg-ground [clip-path:inset(0)]">
      <SpaceField />

      {/* Container and type sizes are BluePeak's: 90rem wide at most, 10px mono labels. */}
      <div className="mx-auto max-w-[90rem] px-[clamp(1rem,4vw,3rem)] pt-[clamp(2rem,3.5vw,3.5rem)] [&_.kicker]:text-[10px]">
        <div className="flex items-center gap-4">
          <span className="kicker !text-ink">End //</span>
          <a href="#top" className="text-[15px] font-semibold tracking-tight">
            {site.name}.
          </a>
          <span aria-hidden="true" className="h-px flex-1 bg-line-strong" />
          <span className="kicker max-sm:hidden">{site.location}</span>
        </div>

        <div className="mt-[clamp(1.75rem,3vw,2.75rem)] grid gap-x-[clamp(2rem,6vw,7rem)] gap-y-12 min-[960px]:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="grid content-start justify-items-start gap-5">
            <p className="kicker">Say hello</p>
            <p className="text-[clamp(1.625rem,1rem+3.6vw,4rem)] font-semibold leading-[0.98] tracking-[-0.035em] [overflow-wrap:anywhere]">
              <a href={`mailto:${site.email}`} className="link-line">
                {site.email}
                <span aria-hidden="true" className="arrow">
                  ↗
                </span>
              </a>
            </p>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-sm tracking-[0.06em] text-muted">
              {socials.map((link) => (
                <li key={link.href}>
                  <a href={link.href} target="_blank" rel="noopener noreferrer" className="link-line hover:text-ink">
                    <SwapLabel>{link.label}</SwapLabel>
                    <span aria-hidden="true" className="arrow">
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <nav aria-label="Footer" className="grid content-start self-start border-t border-line-strong">
            {footerNav.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                className="flex items-baseline gap-4 border-b border-line-strong py-3.5 text-[17px]"
              >
                <span className="kicker">{String(i + 1).padStart(2, "0")}</span>
                <SwapLabel className="flex-1">{link.label}</SwapLabel>
                <span aria-hidden="true" className="arrow text-sm text-muted">
                  ↗
                </span>
              </a>
            ))}
          </nav>
        </div>

        <div className="mt-[clamp(2rem,4vw,3.5rem)] flex flex-wrap justify-between gap-x-6 gap-y-2">
          <p className="kicker">
            © {year} {site.name}
          </p>
          <p className="kicker">{site.signOff}</p>
        </div>
      </div>

      <FooterMark />
    </footer>
  );
}
