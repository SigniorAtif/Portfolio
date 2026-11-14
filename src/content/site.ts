// Name, contact and navigation for the whole site. Contact details live here
// only, so moving the email to another address is a one-line change.

import { reel } from "./reel";

export const site = {
  name: "Atif Ahmed",
  /** The name split for the footer mark. */
  first: "ATIF",
  last: "AHMED",
  url: "https://www.ahmedatif.in",
  email: "mr.dimlit@gmail.com",
  location: "Bhubaneswar, IN",
  signOff: "Written at 3am from inside rury",
  description: "Atif Ahmed builds products, tools for agents and the Linux desktop he writes them on.",
  headline: "I build products, tools for agents and the desktop I write them on.",
  alumniOf: "Kalinga Institute of Industrial Technology",
} as const;

export type SiteLink = { label: string; href: string };

/** LinkedIn and the CV join this list when they exist. */
export const socials: SiteLink[] = [{ label: "GitHub", href: "https://github.com/SigniorAtif" }];

/** Sections of the landing page, in page order. The hero's scroll cue reads it. */
export const nav: SiteLink[] = [
  ...(reel.enabled ? [{ label: "Reel", href: "#reel" }] : []),
  { label: "Work", href: "#work" },
  { label: "Myself", href: "#myself" },
];

/** The pages besides home, for the mark on every page and the footer's rows. */
export const pages: SiteLink[] = [
  { label: "Work", href: "/work" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

/** Footer rows on every page: the pages, then the way back up. */
export const footerNav: SiteLink[] = [{ label: "Home", href: "/" }, ...pages, { label: "Top", href: "#top" }];
