import type { Metadata } from "next";
import { Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import { ContextMenu } from "@/components/nav/ContextMenu";
import { Veil } from "@/components/transition/Veil";
import { site, socials } from "@/content/site";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
});

const code = JetBrains_Mono({
  variable: "--font-code",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
  applicationName: site.name,
  authors: [{ name: site.name, url: site.url }],
  creator: site.name,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  // The image itself comes from opengraph-image.png beside this file.
  openGraph: {
    type: "website",
    url: "/",
    siteName: site.name,
    title: site.name,
    description: site.description,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: site.name,
    description: site.description,
  },
};

// Who the site is about, for search engines and agents.
const person = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: site.name,
  url: site.url,
  description: site.description,
  email: `mailto:${site.email}`,
  sameAs: socials.map((link) => link.href),
  alumniOf: { "@type": "CollegeOrUniversity", name: site.alumniOf },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${code.variable} h-full antialiased`}>
      <body className="min-h-full font-sans" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(person).replace(/</g, "\\u003c") }}
        />
        {children}
        <ContextMenu />
        <Veil />
        {/* Without scripts nothing would ever lift the veil. */}
        <noscript>
          <style>{".veil{display:none}"}</style>
        </noscript>
      </body>
    </html>
  );
}
