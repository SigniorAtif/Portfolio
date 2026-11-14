"use client";

import { useRef, type ComponentProps } from "react";
import Link from "next/link";
import { travel, type Point } from "@/lib/stage";

/**
 * `next/link` for a link to another page of the site. The veil covers the page
 * first, starting from where the link was pressed, and the route changes
 * behind it. Links within the same page, and modified clicks (new tab), go
 * through untouched.
 */
export function PageLink({ href, onClick, ...rest }: ComponentProps<typeof Link>) {
  const from = useRef<Point | undefined>(undefined);

  return (
    <Link
      href={href}
      {...rest}
      onClick={(event) => {
        // A keyboard "click" has no position: start from the link itself.
        if (event.detail === 0) {
          const box = event.currentTarget.getBoundingClientRect();
          from.current = { x: box.left + box.width / 2, y: box.top + box.height / 2 };
        } else {
          from.current = { x: event.clientX, y: event.clientY };
        }
        onClick?.(event);
      }}
      onNavigate={(event) => {
        if (typeof href === "string" && travel(href, from.current)) event.preventDefault();
      }}
    />
  );
}
