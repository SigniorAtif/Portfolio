"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence, MotionConfig, motion, type Variants } from "motion/react";
import { Twinkles } from "@/components/about/Sparks";
import { CastleDots, FLIGHT } from "@/components/contact/CastleDots";
import { FadeUp } from "@/components/motion/FadeUp";
import { Decode } from "@/components/motion/Text";
import { OnScreen } from "@/components/ui/OnScreen";
import { SwapLabel } from "@/components/ui/SwapLabel";
import { personal } from "@/content/about";
import { asks, deadlines, delivery, hints, moods, thanks, timeZone } from "@/content/contact";
import { site, socials } from "@/content/site";
import { sendNote } from "@/lib/sendNote";

const EMAIL = /^\S+@\S+\.\S+$/;
const BLANKS = ["name", "thing", "email"] as const;
type BlankId = (typeof BLANKS)[number];
const EMPTY: Record<BlankId, string> = { name: "", thing: "", email: "" };

/** Where the note stands. `failed` is still the note, with a line saying it did not go. */
type Phase = "writing" | "sending" | "failed" | "sent";

const OUT = { duration: 0.18, ease: [0.5, 0, 0.75, 0] } as const;
const IN = { duration: 0.55, ease: [0.16, 1, 0.3, 1] } as const;

const wait = (seconds: number) => new Promise((resolve) => setTimeout(resolve, seconds * 1000));

/** The sheet the note and the castle share. By the time it goes, both have already left it. */
const page: Variants = {
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { duration: 0.7, ease: IN.ease } },
  gone: { opacity: 0, transition: { duration: 0.2 } },
};
/** The words go out as the castle crosses over them; they return if the note did not go. */
const words: Variants = {
  here: { opacity: 1, transition: { duration: 0.5, ease: "easeOut" } },
  taken: { opacity: 0, transition: { delay: 0.75, duration: 0.9, ease: "easeInOut" } },
};
/**
 * The thank-you, opened like BluePeak's last words: the screen holds empty, then the
 * line fades in at its centre without moving. After it, each part in its own turn:
 * the small line, its two hairlines growing out from it, the rule drawn from its
 * middle, what was sent rising under the rule, and the buttons last.
 */
const SOFT = [0.22, 1, 0.36, 1] as const;
const fade = (delay: number, duration: number): Variants => ({
  hidden: { opacity: 0 },
  shown: { opacity: 1, transition: { delay, duration, ease: "easeOut" } },
});
const draw = (delay: number, duration: number): Variants => ({
  hidden: { scaleX: 0 },
  shown: { scaleX: 1, transition: { delay, duration, ease: SOFT } },
});
const rise = (delay: number): Variants => ({
  hidden: { opacity: 0, y: 14 },
  shown: { opacity: 1, y: 0, transition: { delay, duration: 0.9, ease: SOFT } },
});
const THANKS = {
  line: fade(0.2, 1.4),
  sign: fade(1.0, 0.9),
  hair: draw(1.15, 0.9),
  rule: draw(1.6, 1.1),
  recap: rise(1.85),
  buttons: rise(2.05),
};
const leave: Variants = { gone: { opacity: 0, transition: { duration: 0.35, ease: "easeInOut" } } };

const clock = new Intl.DateTimeFormat("en-GB", { timeZone: timeZone.id, hour: "2-digit", minute: "2-digit" });
const everyQuarterMinute = (onTick: () => void) => {
  const id = setInterval(onTick, 15_000);
  return () => clearInterval(id);
};

/**
 * The contact page: a note to Atif with blanks in it. A blank is underlined
 * in dashed blue (in progress) until it holds something, then in solid lime
 * (done). The two choices roll to the next option when pressed. Sending hands
 * the note to `sendNote`: the castle flies off across the screen, the note fades under it, and
 * a thank-you stands alone in the middle of the section.
 */
export function ContactNote() {
  const [text, setText] = useState(EMPTY);
  const [ask, setAsk] = useState(0);
  const [deadline, setDeadline] = useState(0);
  const [copied, setCopied] = useState(false);
  const [phase, setPhase] = useState<Phase>("writing");
  // Counts the notes written. A new one gets a new sheet and a new castle: the
  // browser owns the text in the blanks, so only a fresh mount empties them.
  const [round, setRound] = useState(0);
  const blanks = useRef<Partial<Record<BlankId, HTMLSpanElement | null>>>({});
  const sendRef = useRef<HTMLButtonElement>(null);
  const thanksRef = useRef<HTMLHeadingElement>(null);
  // Null on the server and until hydration, so the time never mismatches.
  const time = useSyncExternalStore(
    everyQuarterMinute,
    () => clock.format(new Date()),
    () => null,
  );

  const sent = phase === "sent";
  // The note is gone from the page, so the thank-you takes the focus the send button had.
  useEffect(() => {
    if (!sent) return;
    // The thank-you is set in the section as it stands at the top of the page.
    window.scrollTo({ top: 0, behavior: "smooth" });
    thanksRef.current?.focus({ preventScroll: true });
  }, [sent]);

  const filled: Record<BlankId, boolean> = {
    name: text.name !== "",
    thing: text.thing !== "",
    email: EMAIL.test(text.email),
  };
  const missing = BLANKS.filter((id) => !filled[id]);
  const done = missing.length === 0;

  const note = `Hi Atif, I'm ${text.name}. I'm making ${text.thing}. And I want ${asks[ask]}, ${deadlines[deadline]}. Reach me at ${text.email}.`;

  const firstName = text.name.split(" ")[0].slice(0, 16);
  const status = done
    ? "All filled. Send it over."
    : text.email !== "" && !filled.email
      ? "That email looks unfinished."
      : `${filled.name ? `Hi ${firstName}. ` : ""}${missing.length === 1 ? "One blank" : `${missing.length} blanks`} to go.`;

  /** Runs the action if the note is whole; otherwise puts the caret in the first empty blank. */
  const whenDone = (action: () => void) => () => {
    if (done) action();
    else blanks.current[missing[0]]?.focus();
  };

  const send = whenDone(async () => {
    if (phase === "sending") return;
    setPhase("sending");
    try {
      // The castle gets its whole flight off the screen, however quick the sending is.
      const flight = wait(FLIGHT);
      await sendNote({ ...text, ask: asks[ask], deadline: deadlines[deadline], text: note });
      await flight;
      setPhase("sent");
    } catch {
      setPhase("failed");
    }
  });

  const copy = whenDone(async () => {
    await navigator.clipboard.writeText(note);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  });

  const again = () => {
    setText(EMPTY);
    setAsk(0);
    setDeadline(0);
    setPhase("writing");
    setRound((count) => count + 1);
  };

  const blank = (id: BlankId, label: string, inputMode: "text" | "email" = "text") => (
    <Blank
      ref={(el) => {
        blanks.current[id] = el;
      }}
      label={label}
      hint={hints[id]}
      inputMode={inputMode}
      filled={filled[id]}
      onText={(value) => {
        setText((prev) => ({ ...prev, [id]: value }));
        // A changed note is a new try.
        setPhase((now) => (now === "failed" ? "writing" : now));
      }}
      onEnter={() => {
        const next = BLANKS[BLANKS.indexOf(id) + 1];
        (next ? blanks.current[next] : sendRef.current)?.focus();
      }}
    />
  );

  const hour = time ? Number(time.slice(0, 2)) : 0;

  return (
    <MotionConfig reducedMotion="user">
      {/* One screen tall under the header: the note fills it and the direct lines close it, whole, at the bottom edge. */}
      <section
        aria-label="Write to Atif"
        className="flex min-h-[calc(100svh-clamp(112px,18vh,200px))] flex-col overflow-x-clip px-[var(--gutter)] pb-[clamp(24px,4vh,44px)]"
      >
        <div className="flex flex-1 flex-col pb-[clamp(24px,4.5vh,88px)]">
          <AnimatePresence mode="wait" initial={false}>
            {sent ? (
              // Set in the middle of the section, in the room the note and the castle left.
              <motion.div
                key="thanks"
                role="status"
                variants={leave}
                initial="hidden"
                animate="shown"
                exit="gone"
                className="my-auto flex flex-col items-center text-center"
              >
                <motion.h1 ref={thanksRef} tabIndex={-1} variants={THANKS.line} className="thanks-line outline-none">
                  {thanks.title(firstName)}
                </motion.h1>

                <motion.p variants={THANKS.sign} className="thanks-sign mt-[clamp(16px,2.5vh,24px)]">
                  <motion.i aria-hidden="true" variants={THANKS.hair} className="origin-right" />
                  <span>
                    {thanks.sign[0]} <b>{text.email}</b>
                    {thanks.sign[1]}
                  </span>
                  <motion.i aria-hidden="true" variants={THANKS.hair} className="origin-left" />
                </motion.p>

                <div className="mt-[clamp(32px,6vh,64px)] flex w-[min(60ch,100%)] flex-col items-center gap-6">
                  <motion.span aria-hidden="true" variants={THANKS.rule} className="block h-px w-full bg-line" />
                  <motion.figure variants={THANKS.recap} className="flex flex-col gap-2">
                    <figcaption className="kicker">{thanks.recap}</figcaption>
                    <blockquote className="text-muted">{note}</blockquote>
                  </motion.figure>
                  <motion.div variants={THANKS.buttons} className="flex flex-wrap items-center justify-center gap-3">
                    <button type="button" onClick={again} className="note-send">
                      <SwapLabel>{thanks.again}</SwapLabel>
                      <span aria-hidden="true" className="arrow">
                        ↗
                      </span>
                    </button>
                    <button type="button" onClick={copy} className="note-copy">
                      <span aria-live="polite">{copied ? thanks.copied : thanks.copy}</span>
                    </button>
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={round}
                variants={page}
                initial="hidden"
                animate="shown"
                exit="gone"
                className="grid items-start gap-x-[clamp(32px,5vw,96px)] lg:grid-cols-[minmax(0,1fr)_minmax(260px,min(32vw,calc((100svh-420px)*0.83)))]"
              >
                <motion.div
                  variants={words}
                  initial={false}
                  animate={phase === "sending" ? "taken" : "here"}
                  className="flex flex-col gap-[clamp(20px,min(4vw,3.6vh),56px)]"
                >
                    <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-3">
                      <Decode as="h1" className="kicker">
                        Contact / Fill in the blanks
                      </Decode>
                      <p className="flex items-center gap-3">
                        <span aria-hidden="true" className="flex gap-1.5">
                          {BLANKS.map((id) => (
                            <span key={id} className="note-dot" data-filled={filled[id]} />
                          ))}
                        </span>
                        <Decode className="kicker !text-body">{status}</Decode>
                      </p>
                    </div>

                    <FadeUp>
                      {/* Each choice ends its own line, so a longer or shorter option moves nothing else. */}
                      <p className="note">
                        <span className="block">
                          Hi Atif, I&rsquo;m {blank("name", "Your name")}. I&rsquo;m making {blank("thing", "What you are making")}.
                        </span>
                        <span className="block">
                          And I want <Choice label="What you want" options={asks} index={ask} onChange={setAsk} tail="," />
                        </span>
                        <span className="block">
                          <Choice label="When" options={deadlines} index={deadline} onChange={setDeadline} tail="." />
                        </span>
                        <span className="block">Reach me at {blank("email", "Your email", "email")}.</span>
                      </p>
                    </FadeUp>

                    <div className="flex flex-col gap-5">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="relative">
                          <button
                            ref={sendRef}
                            type="button"
                            onClick={send}
                            aria-disabled={!done}
                            aria-busy={phase === "sending"}
                            className="note-send"
                          >
                            <SwapLabel>{phase === "sending" ? delivery.sending : delivery.send}</SwapLabel>
                            <span aria-hidden="true" className="arrow">
                              ↗
                            </span>
                          </button>
                          {done && (
                            <Twinkles
                              stars={[
                                { x: "-14px", y: "-12px", size: 14, delay: 0 },
                                { x: "calc(100% + 4px)", y: "-6px", size: 18, delay: 0.5 },
                                { x: "calc(100% - 10px)", y: "calc(100% + 2px)", size: 10, delay: 1.1 },
                              ]}
                            />
                          )}
                        </span>
                        <button type="button" onClick={copy} aria-disabled={!done} className="note-copy">
                          <span aria-live="polite">{copied ? thanks.copied : thanks.copy}</span>
                        </button>
                      </div>
                      <p aria-live="polite" className="kicker max-w-[64ch] !tracking-[0.14em]">
                        {phase === "failed" ? delivery.failed : delivery.caption(site.email)}
                      </p>
                    </div>
                </motion.div>

              {/* The reader, never taller than the screen can hold above the direct lines. Draws every frame, so it only lives while on screen, and only where there is room beside the note. */}
              <OnScreen className="aspect-[5/6] w-full max-lg:hidden lg:sticky lg:top-[12svh]">
                <CastleDots spirits={(BLANKS.length - missing.length) / BLANKS.length} away={phase === "sending"} />
              </OnScreen>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <dl className="grid gap-x-10 gap-y-8 border-t border-line pt-6 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <dt className="kicker">Or skip the note</dt>
            <dd className="text-[clamp(18px,1.6vw,24px)]">
              <a href={`mailto:${site.email}`} className="link-line">
                <SwapLabel>{site.email}</SwapLabel>
              </a>
            </dd>
          </div>
          <div className="flex flex-col gap-2">
            <dt className="kicker">Elsewhere</dt>
            <dd className="flex flex-wrap gap-x-6 gap-y-1 text-[clamp(18px,1.6vw,24px)]">
              {[...socials, ...personal].map((link) => (
                <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer" className="link-line">
                  <SwapLabel>{link.label}</SwapLabel>
                  <span aria-hidden="true" className="arrow">
                    ↗
                  </span>
                </a>
              ))}
            </dd>
          </div>
          <div className="flex flex-col gap-2">
            <dt className="kicker">His clock, {site.location}</dt>
            <dd className="text-[clamp(18px,1.6vw,24px)] tabular-nums">
              {time ? (
                <>
                  {time} {timeZone.short}. <span className="text-muted">{moods.find((mood) => hour < mood.before)?.text}</span>
                </>
              ) : (
                <span className="text-muted">--:-- {timeZone.short}</span>
              )}
            </dd>
          </div>
        </dl>
      </section>
    </MotionConfig>
  );
}

type BlankProps = {
  ref: React.Ref<HTMLSpanElement>;
  label: string;
  hint: string;
  inputMode: "text" | "email";
  filled: boolean;
  onText: (value: string) => void;
  /** Enter never breaks the line: it moves on. */
  onEnter: () => void;
};

/**
 * One blank in the sentence. An editable span rather than an input, so a long
 * answer wraps with the sentence instead of scrolling inside a box. React
 * never writes its text: the browser owns it and reports each change.
 */
function Blank({ ref, label, hint, inputMode, filled, onText, onEnter }: BlankProps) {
  return (
    <span
      ref={ref}
      role="textbox"
      aria-label={label}
      aria-required="true"
      contentEditable="plaintext-only"
      suppressContentEditableWarning
      spellCheck={false}
      autoCapitalize={inputMode === "email" ? "off" : undefined}
      inputMode={inputMode}
      enterKeyHint="next"
      data-hint={hint}
      data-filled={filled}
      className="note-blank"
      onInput={(event) => {
        const el = event.currentTarget;
        const value = (el.textContent ?? "").replace(/\s+/g, " ").trim();
        // Browsers leave a stray line break behind when the last letter goes; clear it so the hint returns.
        if (value === "" && el.childNodes.length) el.textContent = "";
        onText(value);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        onEnter();
      }}
    />
  );
}

type ChoiceProps = {
  label: string;
  options: string[];
  index: number;
  onChange: (index: number) => void;
  /** The punctuation that follows, kept with the word so it rolls and sits tight against it. */
  tail: string;
};

/**
 * A choice set in the sentence, always last on its line. Pressing it rolls
 * the next option, its underline and its punctuation up through a mask.
 */
function Choice({ label, options, index, onChange, tail }: ChoiceProps) {
  return (
    <button
      type="button"
      className="note-choice"
      aria-label={`${label}: ${options[index]}. Press for the next option.`}
      onClick={() => onChange((index + 1) % options.length)}
    >
      <span className="swap-word">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={index}
            className="inline-block"
            initial={{ y: "115%" }}
            animate={{ y: "0%", transition: IN }}
            exit={{ y: "-115%", transition: OUT }}
          >
            <span className="note-pick">{options[index]}</span>
            {tail}
            <span aria-hidden="true" className="note-roll">
              ↻
            </span>
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}
