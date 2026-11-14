import { spoken } from "@/content/about";

/** The languages in the bento: one box, with a box inside it for each level. */
export function AboutLanguages() {
  return (
    <div className="about-tile flex flex-col gap-[clamp(16px,2vw,28px)] p-[clamp(20px,2.4vw,36px)] [grid-area:lang]">
      <p className="kicker">Languages</p>
      <ul className="grid gap-3 sm:grid-cols-3">
        {spoken.map((group) => (
          <li key={group.level} className="flex flex-col gap-5 rounded-[14px] border border-line bg-panel p-[clamp(16px,1.8vw,26px)]">
            <p className="flex items-center justify-between gap-3">
              <span className="font-mono text-[13px] text-muted">
                {"// "}
                {group.level}
              </span>
              <span aria-hidden="true" className="flex gap-1.5">
                {[1, 2, 3].map((dot) => (
                  <span key={dot} className={`size-2 rounded-full ${dot <= group.strength ? "bg-dot" : "bg-line-strong"}`} />
                ))}
              </span>
            </p>
            <ul className="flex flex-col gap-1.5">
              {group.languages.map((language) => (
                <li key={language.code} className="flex items-baseline gap-4">
                  <span className="w-12 font-mono text-[13px] text-muted">{language.code}</span>
                  <span className="text-[clamp(24px,2.6vw,36px)] font-medium leading-[1.1] tracking-[-0.025em]">{language.name}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
