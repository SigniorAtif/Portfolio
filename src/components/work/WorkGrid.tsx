import type { ReactNode } from "react";
import { FadeUp } from "@/components/motion/FadeUp";
import { Media } from "@/components/work/Media";
import type { Project } from "@/content/projects";

const two = (n: number) => String(n).padStart(2, "0");

const chip =
  "inline-flex h-7 items-center whitespace-nowrap rounded-[8px] border border-line px-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-body";

/** One cell of a row. The row's gaps show the line colour, so every cell paints the ground back. */
const cell = "flex min-w-0 flex-col gap-5 bg-ground p-[clamp(18px,1.6vw,24px)]";

/**
 * The tracks from xl up: name, what it is, how it works, what it measured, capture.
 * Every row has all five, so the rules line up down the page. The name track is
 * wide enough for the longest single word in a name ("QuExchange") and the longest
 * kicker on one line; the capture track holds the w-44 phone and its padding.
 */
const tracks = "xl:grid-cols-[15rem_minmax(0,9fr)_minmax(0,10fr)_minmax(0,10fr)_13rem]";

type Link = { href: string; label: string; says: string };

function linksOf(project: Project): Link[] {
  return [
    { href: project.live, label: "Live", says: "open the live site" },
    { href: project.source, label: "Source", says: "view the source" },
  ].filter((link): link is Link => !!link.href);
}

/**
 * The work page as a grid: a ledger strip, then every project as one row of
 * ruled columns that reads left to right: its name, what it is, how it works,
 * what it measured, and the capture when there is one.
 */
export function WorkGrid({ projects }: { projects: Project[] }) {
  const ledger = [
    { value: projects.length, label: "Projects on this page" },
    { value: projects.filter((project) => project.live).length, label: "Live, open them now" },
    { value: projects.filter((project) => project.source).length, label: "With public source" },
    { value: new Set(projects.map((project) => project.kind)).size, label: "Kinds of thing" },
  ];

  return (
    <div className="flex flex-col gap-[clamp(72px,10vw,160px)] px-[var(--gutter)]">
      {/* Hairlines come from the gaps: the line colour shows between the cells. */}
      <FadeUp as="dl" className="grid grid-cols-2 gap-px border-y border-line bg-line lg:grid-cols-4">
        {ledger.map((entry) => (
          <div key={entry.label} className="flex flex-col-reverse justify-end gap-3 bg-ground px-[clamp(12px,2vw,32px)] py-[clamp(24px,3vw,44px)]">
            <dt className="kicker">{entry.label}</dt>
            <dd className="text-[clamp(40px,5vw,72px)] font-medium leading-none tracking-[-0.04em] tabular-nums">{two(entry.value)}</dd>
          </div>
        ))}
      </FadeUp>

      <section aria-labelledby="rows-title" className="flex flex-col gap-[clamp(24px,3vw,44px)]">
        <FadeUp className="grid items-end gap-x-10 gap-y-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
          <h2 id="rows-title" className="max-w-[18ch] text-[clamp(32px,4.2vw,64px)] font-medium leading-[1.02] tracking-[-0.035em]">
            What it is, how it works, what it measured.
          </h2>
          <p className="text-[17px] leading-[1.5] text-body">
            One row per project, read left to right. The numbers come from each project&apos;s own tests or docs.
          </p>
        </FadeUp>
        {/* From xl up every row takes the height of the tallest, so the stack reads as one set. */}
        <ol className="flex flex-col gap-3 xl:grid xl:auto-rows-fr">
          {projects.map((project) => (
            <li key={project.slug} id={project.slug} className="scroll-mt-24">
              <Row project={project} />
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

/** A cell's label, with a rule running out to the cell's edge. */
function Label({ children }: { children: ReactNode }) {
  return (
    <p className="kicker flex items-center gap-3">
      {children}
      <span aria-hidden="true" className="h-px grow bg-line" />
    </p>
  );
}

function Row({ project }: { project: Project }) {
  const links = linksOf(project);
  const [lead, ...rest] = project.facts;
  // From xl up a missing column is taken by the cell to its left: how it works runs
  // on into the numbers' track, the numbers into the capture's. In the two-column
  // sizes the cells pair up (the name with what it is, how it works with the numbers
  // or else the capture), and a cell left without a partner spans both. Either way
  // no empty slot shows the line colour.
  const howSpan = lead ? "" : project.media ? "xl:col-span-2" : "md:col-span-2 xl:col-span-3";
  const numbersSpan = project.media ? "" : "xl:col-span-2";
  const mediaSpan = lead ? "md:col-span-2 xl:col-span-1" : "";

  return (
    <FadeUp className="h-full">
      {/* The height floor clears a capture (the w-44 phone and its padding), so rows with and without one match. */}
      <div
        className={`grid h-full gap-px overflow-hidden rounded-[20px] border border-line bg-line transition-colors duration-300 ease-[var(--ease-hover)] hover:border-line-strong has-[:focus-visible]:border-line-strong md:grid-cols-2 xl:min-h-[clamp(352px,25vw,400px)] ${tracks}`}
      >
        <div className={cell}>
          <p className="kicker tabular-nums">
            {two(project.order)} <span className="px-1.5">/</span> {project.kind}
          </p>
          <div className="mt-auto flex flex-col gap-3 pt-6">
            <h3 className="text-[clamp(26px,2.1vw,32px)] font-medium leading-[1.02] tracking-[-0.03em] [overflow-wrap:anywhere]">{project.name}</h3>
            <div className="flex flex-wrap gap-x-5 gap-y-1 font-mono text-[12px] uppercase tracking-[0.12em]">
              {links.length ? (
                links.map((link) => (
                  <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={`${project.name}: ${link.says}`} className="link-line hit py-1">
                    {link.label}
                    <span aria-hidden="true" className="arrow">
                      ↗
                    </span>
                  </a>
                ))
              ) : (
                <span className="py-1 text-muted">Private</span>
              )}
            </div>
          </div>
        </div>

        <div className={cell}>
          <Label>What it is</Label>
          <p className="text-[clamp(21px,1.75vw,27px)] font-medium leading-[1.2] tracking-[-0.02em]">{project.oneLiner}</p>
        </div>

        <div className={`${cell} ${howSpan}`}>
          <Label>How it works</Label>
          {/* Capped for the rows where this cell runs on across an empty track. */}
          <p className="max-w-[60ch] text-[16px] leading-[1.55] text-body">{project.summary}</p>
          <ul className="flex flex-wrap gap-1.5">
            {project.stack.map((item) => (
              <li key={item} className={chip}>
                {item}
              </li>
            ))}
          </ul>
          {project.credit && <p className="mt-auto font-mono text-[12px] tracking-[0.04em] text-muted">{project.credit}</p>}
        </div>

        {lead && (
          <div className={`${cell} @container ${numbersSpan}`}>
            <Label>What it measured</Label>
            {/* The lead fact runs across the top. The cell is a container, so the lesser facts take two
                columns only where their phrase labels have room; an odd one out at the end takes the
                full width rather than sit beside an empty half. */}
            <dl className="grid gap-x-4 @[13rem]:grid-cols-2">
              <div className={`col-span-full flex flex-col-reverse gap-2 ${rest.length ? "pb-5" : ""}`}>
                <dt className="text-[13px] leading-[1.4] text-muted">{lead.label}</dt>
                <dd className="text-[clamp(48px,4.4vw,68px)] font-medium leading-none tracking-[-0.04em]">{lead.value}</dd>
              </div>
              {rest.map((fact, index) => (
                <div
                  key={fact.label}
                  className={`flex flex-col-reverse justify-end gap-1.5 border-t border-line py-3 ${rest.length % 2 && index === rest.length - 1 ? "col-span-full" : ""}`}
                >
                  <dt className="text-[13px] leading-[1.4] text-muted">{fact.label}</dt>
                  <dd className="text-[clamp(22px,1.9vw,28px)] font-medium leading-none tracking-[-0.03em]">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {project.media && (
          <div className={`dot-plate grid place-items-center p-4 ${mediaSpan}`}>
            <div className="aspect-[9/16] w-44 max-w-full overflow-hidden rounded-[14px] border border-line-strong bg-ground">
              {/* The phone is w-44 at every size, so ask for an image that wide and no wider. */}
              <Media src={project.media} sizes="176px" />
            </div>
          </div>
        )}
      </div>
    </FadeUp>
  );
}
