"use client";

import { useRef, type Ref } from "react";
import Image from "next/image";
import { SkeletonReveal, useLoadedMedia } from "@/components/ui/Skeleton";
import type { Project } from "@/content/projects";
import { site } from "@/content/site";

/** Where a card goes when clicked: the live site, else the source, else its row in the list. */
export function projectHref(project: Project): string {
  return project.live ?? project.source ?? `#project-${project.slug}`;
}

type Props = {
  project: Project;
  /** Copies two and three of the wheel: shown, but not announced or focusable. */
  copy: boolean;
  ref: Ref<HTMLAnchorElement>;
};

/** One card of the deck: the project on the front, the site's mark on the back. */
export function Card({ project, copy, ref }: Props) {
  const href = projectHref(project);
  const external = href.startsWith("http");
  const number = String(project.order).padStart(2, "0");

  return (
    <a
      ref={ref}
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-hidden={copy || undefined}
      tabIndex={copy ? -1 : undefined}
      draggable={false}
      className="deck-card"
    >
      <span aria-hidden="true" className="deck-frame" />
      <span className="deck-face deck-front">
        {project.media ? <Media src={project.media} /> : <Plate name={project.name} />}
        <span className="deck-caption absolute inset-x-0 bottom-0 flex items-baseline gap-2 bg-gradient-to-t from-ground/90 to-transparent px-3 pb-2.5 pt-8 font-mono text-[10px] uppercase tracking-[0.14em]">
          <span className="text-muted">{number}</span>
          <span className="truncate">{project.name}</span>
        </span>
        <span aria-hidden="true" className="deck-label">
          <b>{number}</b>
          <span>{project.name}</span>
          <i>↗</i>
        </span>
        <span className="sr-only">: {project.oneLiner}</span>
      </span>
      <span aria-hidden="true" className="deck-face deck-back dot-plate grid place-items-center">
        <span className="dot-ink text-center text-[26px] font-extrabold leading-[0.95] tracking-[-0.04em]">
          {site.name.split(" ")[0]}
          <br />
          {site.name.split(" ")[1]}.
        </span>
      </span>
    </a>
  );
}

function Media({ src }: { src: string }) {
  const imageRef = useRef<HTMLImageElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isVideo = /\.(mp4|webm)$/.test(src);
  const loaded = useLoadedMedia(isVideo ? videoRef : imageRef);

  // The deck plays and pauses videos itself (only cards near the top play),
  // so a video counts as ready straight away and shows its first frame.
  if (isVideo) {
    return <video ref={videoRef} src={src} muted loop playsInline preload="none" className="deck-media h-full w-full object-cover" />;
  }
  return (
    <SkeletonReveal loaded={loaded} className="h-full w-full">
      <Image
        ref={imageRef}
        src={src}
        alt=""
        width={336}
        height={596}
        sizes="(min-width: 640px) 230px, 165px"
        loading="lazy"
        draggable={false}
        className="deck-media h-full w-full object-cover"
      />
    </SkeletonReveal>
  );
}

/** Stands in for missing media: the dot plate with the project's name. */
function Plate({ name }: { name: string }) {
  return (
    <span aria-hidden="true" className="dot-plate absolute inset-0 grid place-items-center p-3">
      <span className="text-center text-[19px] font-semibold leading-[1.05] tracking-[-0.03em] text-body [overflow-wrap:anywhere]">
        {name}
      </span>
    </span>
  );
}
