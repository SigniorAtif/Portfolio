import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // An easter egg: the castle's name in the address bar finds the castle.
  redirects() {
    return [{ source: "/howl", destination: "/contact?from=howl", permanent: false }];
  },
  // An easter egg for whoever reads the network tab.
  headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Hi-Human", value: "You read headers. Say hi: note@ahmedatif.in" }],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
