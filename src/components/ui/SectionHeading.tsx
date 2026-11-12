import { Decode, Rise } from "@/components/motion/Text";

type Props = {
  /** Mono line above the title, e.g. "03 / Work". */
  kicker: string;
  title: string;
  className?: string;
};

/** Mono kicker over an h2. Shared by every section below the hero. */
export function SectionHeading({ kicker, title, className }: Props) {
  return (
    <header className={`flex flex-col gap-4 ${className ?? ""}`}>
      <Decode as="p" className="kicker">
        {kicker}
      </Decode>
      <Rise as="h2" className="text-[clamp(36px,5.2vw,76px)] font-medium leading-[1.02] tracking-[-0.035em]">
        {title}
      </Rise>
    </header>
  );
}
