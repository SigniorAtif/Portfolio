"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { FadeUp } from "@/components/motion/FadeUp";
import { SkeletonReveal, useLoadedMedia } from "@/components/ui/Skeleton";
import { SwapLabel } from "@/components/ui/SwapLabel";
import type { Project } from "@/content/projects";
import { ScrollTrigger } from "@/lib/gsap";
import { jumpTo } from "@/lib/scrollLock";

const two = (n: number) => String(n).padStart(2, "0");

/** Room kept above the list when a filter brings the page back to it. */
const LIST_TOP_PX = 96;

const tag = "inline-flex h-8 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 font-mono text-[11px] uppercase tracking-[0.12em]";

/**
 * The work index: one row of project types that filters the list in place and
 * stays under the top edge, then every project as a full entry. Each entry has
 * its own anchor (/work#tasks), so other pages can link straight to one.
 */
export function WorkIndex({ projects }: { projects: Project[] }) {
  const [kind, setKind] = useState<string | null>(null);
  const listRef = useRef<HTMLOListElement>(null);
  const mounted = useRef(false);

  const kinds = Array.from(new Set(projects.map((project) => project.kind)));
  const shown = kind ? projects.filter((project) => project.kind === kind) : projects;

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    // A shorter list can leave the page scrolled past it: come back to its top.
    const top = listRef.current?.getBoundingClientRect().top ?? 0;
    if (top < 0) jumpTo(top + window.scrollY - LIST_TOP_PX);
    // The page changed height under every trigger below the list.
    ScrollTrigger.refresh();
  }, [kind]);

  const options = [{ label: "All", value: null as string | null, count: projects.length }].concat(
    kinds.map((value) => ({ label: value, value, count: projects.filter((project) => project.kind === value).length })),
  );

  return (
    <section aria-label="Projects" className="px-[var(--gutter)]">
      {/* To the right, clear of the site mark, which holds the top left corner. */}
      <div
        role="group"
        aria-label="Filter by type"
        className="sticky top-3 z-20 ml-auto flex w-fit max-w-[calc(100%-4.5rem)] gap-1.5 overflow-x-auto rounded-full border border-line bg-ground/70 p-1.5 backdrop-blur-md [scrollbar-width:none]"
      >
        {options.map((option) => {
          const on = option.value === kind;
          return (
            <button
              key={option.label}
              type="button"
              aria-pressed={on}
              onClick={() => setKind(option.value)}
              className={`${tag} transition-colors duration-300 ease-[var(--ease-hover)] ${
                on ? "border-ink bg-ink text-ground" : "border-transparent text-body hover:border-line-strong hover:text-ink"
              }`}
            >
              {option.label}
              <span className={`tabular-nums ${on ? "opacity-60" : "text-muted"}`}>{two(option.count)}</span>
            </button>
          );
        })}
      </div>
      <p aria-live="polite" className="sr-only">
        {shown.length} of {projects.length} projects shown
      </p>

      {/* Keyed by the filter, so a new list arrives the way the first one did. */}
      <ol key={kind ?? "all"} ref={listRef} className="mt-[clamp(24px,4vw,56px)] flex flex-col border-t border-line">
        {shown.map((project) => (
          <Entry key={project.slug} project={project} />
        ))}
      </ol>
    </section>
  );
}

const pill =
  "inline-flex h-10 items-center rounded-full border border-line-strong px-4 font-mono text-[12px] uppercase tracking-[0.12em] transition-colors duration-300 ease-[var(--ease-hover)] hover:border-ink";

function Entry({ project }: { project: Project }) {
  const links = [
    { href: project.live, label: "Live", says: "open the live site" },
    { href: project.source, label: "Source", says: "view the source" },
  ].filter((link): link is { href: string; label: string; says: string } => !!link.href);

  return (
    <li
      id={project.slug}
      className="grid scroll-mt-24 gap-x-10 gap-y-8 border-b border-line py-[clamp(40px,6vw,88px)] last:border-b-0 lg:grid-cols-[minmax(0,5fr)_minmax(0,8fr)]"
    >
      {/* Holds while the right column scrolls past. */}
      <FadeUp className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        <p className="kicker tabular-nums">
          {two(project.order)} <span className="px-1.5">/</span> {project.kind}
        </p>
        <h2 className="text-[clamp(36px,4.6vw,68px)] font-medium leading-[1] tracking-[-0.035em]">{project.name}</h2>
        <p className="max-w-[34ch] text-[19px] leading-[1.4] text-body">{project.oneLiner}</p>
        <div className="flex flex-wrap gap-2 pt-2">
          {links.length ? (
            links.map((link) => (
              <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={`${project.name}: ${link.says}`} className={pill}>
                <SwapLabel>{link.label}</SwapLabel>
                <span aria-hidden="true" className="arrow">
                  ↗
                </span>
              </a>
            ))
          ) : (
            <span className={`${tag} border-line text-muted`}>Private</span>
          )}
        </div>
      </FadeUp>

      <FadeUp delay={0.08} className="grid min-w-0 items-start gap-x-8 gap-y-8 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
        <div className="relative aspect-[9/16] overflow-hidden rounded-[14px] border border-line bg-panel max-sm:max-w-[15rem]">
          {project.media ? <Media src={project.media} /> : <Plate name={project.name} />}
        </div>

        <div className="flex min-w-0 flex-col gap-8">
          <div className="flex flex-col gap-3">
            <p className="kicker">What it is</p>
            <p className="max-w-[52ch] text-[18px] leading-[1.55] text-body">{project.summary}</p>
          </div>
          <div className="flex flex-col gap-3">
            <p className="kicker">Built with</p>
            <ul className="flex flex-wrap gap-2">
              {project.stack.map((item) => (
                <li key={item} className={`${tag} border-line-strong text-body`}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          {project.facts.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-8 gap-y-6 border-t border-line pt-6">
              {project.facts.map((fact) => (
                <div key={fact.label} className="flex flex-col-reverse gap-1.5">
                  <dt className="text-[13px] leading-[1.4] text-muted">{fact.label}</dt>
                  <dd className="text-[clamp(28px,3vw,40px)] font-medium leading-none tracking-[-0.03em]">{fact.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {project.credit && <p className="font-mono text-[12px] tracking-[0.04em] text-muted">{project.credit}</p>}
        </div>
      </FadeUp>
    </li>
  );
}

function Media({ src }: { src: string }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = /\.(mp4|webm)$/.test(src);
  const loaded = useLoadedMedia(isVideo ? videoRef : imageRef);

  return (
    <SkeletonReveal loaded={loaded} className="h-full w-full">
      {isVideo ? (
        <video ref={videoRef} src={src} muted loop playsInline autoPlay className="h-full w-full object-cover" />
      ) : (
        <Image
          ref={imageRef}
          src={src}
          alt=""
          width={540}
          height={960}
          sizes="(min-width: 640px) 256px, 240px"
          loading="lazy"
          className="h-full w-full object-cover"
        />
      )}
    </SkeletonReveal>
  );
}

/** Stands in for missing media: the dot plate with the project's name. */
function Plate({ name }: { name: string }) {
  return (
    <span aria-hidden="true" className="dot-plate absolute inset-0 grid place-items-center p-4">
      <span className="text-center text-[30px] font-semibold leading-[1.05] tracking-[-0.03em] text-body [overflow-wrap:anywhere]">{name}</span>
    </span>
  );
}
