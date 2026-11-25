"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { PROMPT, WELCOME, complete, run, type Action } from "@/content/terminal";
import { found, summon, tally } from "@/lib/eggs";
import { travel } from "@/lib/stage";

/** One printed line. `at` is its place in the batch it came with, which staggers the lines in. */
type Line = { id: number; text: string; typed: boolean; at: number };

// Kept for the whole visit, so a terminal opened again remembers what was typed.
const history: string[] = [];
let ids = 0;

/** How long an action that leaves the terminal waits, so its line can be read. */
const LEAVE_MS = 420;

const lines = (texts: string[], typed = false): Line[] => texts.map((text, at) => ({ id: ids++, text, typed, at }));

/**
 * The site's terminal: the backtick key, typing "sudo", or a long press on the
 * footer's "End //" opens it. A dialog in mono on a sheet of dots, running the
 * commands in content/terminal. Up and down recall what was typed, Tab finishes
 * a word, Esc, the backtick or `exit` close it, and focus goes back to where it
 * was. Opening it counts as finding it. Styles are `.term` in globals.css.
 */
export function Terminal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const [printed, setPrinted] = useState<Line[]>(() => lines(WELCOME));
  const [value, setValue] = useState("");
  const recall = useRef(history.length);

  // Take focus on the way in and give it back on the way out.
  useEffect(() => {
    const back = document.activeElement;
    found("terminal");
    inputRef.current?.focus({ preventScroll: true });
    return () => {
      if (back instanceof HTMLElement && back.isConnected) back.focus({ preventScroll: true });
    };
  }, []);

  // Esc closes it from anywhere, wherever focus has got to.
  useEffect(() => {
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [onClose]);

  // The newest line is always in sight.
  useEffect(() => {
    const log = logRef.current;
    if (log) log.scrollTop = log.scrollHeight;
  }, [printed]);

  const print = (texts: string[], typed = false) => setPrinted((now) => [...now, ...lines(texts, typed)]);

  const act = (action: Action | undefined) => {
    if (!action) return;
    switch (action.kind) {
      case "clear":
        return setPrinted([]);
      case "exit":
        return onClose();
      case "open":
        window.open(action.href, "_blank", "noopener,noreferrer");
        return;
      case "go":
        window.setTimeout(() => {
          onClose();
          if (!travel(action.href)) router.push(action.href);
        }, LEAVE_MS);
        return;
      case "summon":
        window.setTimeout(() => {
          onClose();
          summon(action.egg);
        }, LEAVE_MS);
    }
  };

  const submit = () => {
    const line = value;
    setValue("");
    if (line.trim() && history.at(-1) !== line) history.push(line);
    recall.current = history.length;
    const { count, total } = tally();
    const result = run(line, { found: count, total, now: new Date(), host: "terminal" });
    if (result.action?.kind === "clear") return setPrinted([]);
    setPrinted((now) => [...now, ...lines([`${PROMPT} ${line}`], true), ...lines(result.lines)]);
    act(result.action);
  };

  const onKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    } else if (event.key === "Tab" && event.shiftKey) {
      // The only other stop in the dialog.
      event.preventDefault();
      closeRef.current?.focus();
    } else if (event.key === "Tab") {
      event.preventDefault();
      const { value: done, options } = complete(value);
      setValue(done);
      if (options.length) print([`${PROMPT} ${value}`, options.join("  ")], true);
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const step = event.key === "ArrowUp" ? -1 : 1;
      recall.current = Math.min(history.length, Math.max(0, recall.current + step));
      setValue(history[recall.current] ?? "");
    } else if (event.key === "`" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      // The key that opened it closes it. Esc is the dialog's own, below.
      event.preventDefault();
      onClose();
    } else if (event.ctrlKey && event.key.toLowerCase() === "l") {
      event.preventDefault();
      setPrinted([]);
    } else if (event.ctrlKey && event.key.toLowerCase() === "c" && !window.getSelection()?.toString()) {
      event.preventDefault();
      print([`${PROMPT} ${value}^C`], true);
      setValue("");
    }
  };

  return (
    <div
      className="term-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Terminal"
        className="term"
        data-lenis-prevent
        onKeyDown={(event) => {
          // From the close button, Tab goes back to the input: focus never leaves the dialog.
          if (event.key === "Tab" && event.target === closeRef.current) {
            event.preventDefault();
            inputRef.current?.focus();
          }
        }}
        // A click on the text, unless it is selecting some, puts the caret back.
        onClick={(event) => {
          if (event.target !== closeRef.current && !window.getSelection()?.toString()) inputRef.current?.focus();
        }}
      >
        <div className="term-bar">
          <span>guest@ahmedatif: ~</span>
          <button ref={closeRef} type="button" className="term-close" onClick={onClose}>
            esc
          </button>
        </div>
        <div ref={logRef} role="log" aria-live="polite" aria-label="Terminal output" className="term-log">
          {printed.map((line) => (
            <p
              key={line.id}
              className="term-line"
              data-typed={line.typed || undefined}
              style={{ "--i": Math.min(line.at, 24) } as CSSProperties}
            >
              {line.text || " "}
            </p>
          ))}
        </div>
        <form
          className="term-row"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <label htmlFor="term-input" className="term-prompt">
            {PROMPT}
          </label>
          <input
            ref={inputRef}
            id="term-input"
            className="term-input"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={onKey}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="send"
          />
        </form>
      </div>
    </div>
  );
}
