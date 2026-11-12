# Atif Ahmed: portfolio

The site at [ahmedatif.in](https://www.ahmedatif.in). Next.js (App Router), React, Tailwind, three.js for the dot portrait, GSAP and Lenis for scroll motion, Motion for layout transitions.

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build
pnpm exec tsc --noEmit && pnpm lint
```

## Where things are

- `src/content/` holds every word and link: `site.ts` (name, contact, nav), `projects.ts` (the work deck), `reel.ts` (showreel files and chapters; `enabled: false` drops the section), `quotes.ts` (the closing quotes; one is picked per load).
- `src/components/<section>/` holds one folder per section: `hero`, `reel`, `work`, `myself`, `outro`, `footer`, `notfound`.
- `src/lib/motion.ts` and the motion tokens in `src/app/globals.css` are the house eases and durations. Change both together.
- `tools/bust/` bakes the portrait's points from the source model.

## Credits

- The 404 toons (`src/components/notfound/toons/`) are ported from Iuri de Paula's portfolio, <https://github.com/iuridepaula/portfolio>, MIT License, Copyright (c) 2019 Iuri de Paula. The full notice is in `src/components/notfound/toons/index.ts`.
- rury is forked from [end-4/dots-hyprland](https://github.com/end-4/dots-hyprland) (GPL v3).
