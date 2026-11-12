import { Hero } from "@/components/hero/Hero";

export default function Home() {
  return (
    <main>
      <Hero />
      {/* Work, Desk and About sections land here next. */}
      <div id="work" className="h-[60svh]" />
    </main>
  );
}
