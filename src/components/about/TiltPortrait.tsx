"use client";

import { useRef } from "react";
import Image from "next/image";
import { SkeletonReveal, useLoadedMedia } from "@/components/ui/Skeleton";
import { gsap } from "@/lib/gsap";
import { EASE, reducedMotion } from "@/lib/motion";
import { Twinkles } from "./Sparks";

const TILT_DEG = 13;
const SHIFT_PX = 16; // how far the cut-out slides against the tilt, for depth

/**
 * The portrait as a card that leans towards the mouse: it tilts in 3D, a soft
 * light follows the pointer across it, and the cut-out slides a little
 * against the plate behind. Stars wink round its corners. Still on touch and
 * under reduced motion.
 */
export function TiltPortrait({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const cardRef = useRef<HTMLDivElement>(null);
  const cutRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const loaded = useLoadedMedia(imageRef);

  const lean = (event: React.PointerEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card || event.pointerType !== "mouse" || reducedMotion()) return;
    const box = event.currentTarget.getBoundingClientRect();
    const nx = (event.clientX - box.left) / box.width - 0.5;
    const ny = (event.clientY - box.top) / box.height - 0.5;
    card.dataset.lit = "";
    card.style.setProperty("--gx", `${(nx + 0.5) * 100}%`);
    card.style.setProperty("--gy", `${(ny + 0.5) * 100}%`);
    gsap.to(card, { rotateY: nx * TILT_DEG * 2, rotateX: -ny * TILT_DEG * 2, duration: 0.5, ease: EASE.out, overwrite: true });
    gsap.to(cutRef.current, { x: -nx * SHIFT_PX * 2, y: -ny * SHIFT_PX * 2, duration: 0.5, ease: EASE.out, overwrite: true });
  };

  const settle = () => {
    const card = cardRef.current;
    if (!card) return;
    delete card.dataset.lit;
    gsap.to([card, cutRef.current], { rotateX: 0, rotateY: 0, x: 0, y: 0, duration: 1, ease: EASE.out, overwrite: true });
  };

  return (
    <div className={`about-tilt relative ${className ?? ""}`} onPointerMove={lean} onPointerLeave={settle}>
      <div ref={cardRef} className="about-tilt-card aspect-[4/5]">
        <div aria-hidden="true" className="dot-plate absolute inset-0" />
        <div ref={cutRef} className="absolute inset-[-4%]">
          <SkeletonReveal loaded={loaded} className="absolute inset-0">
            <Image
              ref={imageRef}
              src={src}
              alt={alt}
              width={1200}
              height={900}
              sizes="(min-width: 1024px) 45vw, 120vw"
              className="h-full w-full object-cover object-[62%_100%]"
            />
          </SkeletonReveal>
        </div>
      </div>
      <Twinkles
        stars={[
          { x: "-5%", y: "6%", size: 20 },
          { x: "96%", y: "-3%", size: 14 },
          { x: "102%", y: "58%", size: 10 },
          { x: "-8%", y: "82%", size: 12 },
        ]}
      />
    </div>
  );
}
