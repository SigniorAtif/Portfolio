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
} as const;

export type SiteLink = { label: string; href: string };

/** LinkedIn and the CV join this list when they exist. */
export const socials: SiteLink[] = [{ label: "GitHub", href: "https://github.com/SigniorAtif" }];

/** Sections of the landing page, in page order. */
export const nav: SiteLink[] = [
  ...(reel.enabled ? [{ label: "Reel", href: "#reel" }] : []),
  { label: "Work", href: "#work" },
  { label: "Myself", href: "#myself" },
];

/** Footer rows: the sections, then the way back up. About joins when the page exists. */
export const footerNav: SiteLink[] = [...nav, { label: "Top", href: "#top" }];
