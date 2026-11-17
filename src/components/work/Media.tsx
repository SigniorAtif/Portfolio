"use client";

import { useRef } from "react";
import Image from "next/image";
import { SkeletonReveal, useLoadedMedia } from "@/components/ui/Skeleton";

/**
 * A project's 9:16 capture, image or video, behind a skeleton until it loads.
 * Pass `sizes` as the width the capture is drawn at, so the image request matches it.
 */
export function Media({ src, sizes = "(min-width: 640px) 256px, 240px" }: { src: string; sizes?: string }) {
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
          sizes={sizes}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      )}
    </SkeletonReveal>
  );
}
