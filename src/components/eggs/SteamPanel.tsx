"use client";

import { useEffect, useRef, useState } from "react";
import { tracked } from "@/content/eggs";
import { found, useEggs } from "@/lib/eggs";
import type { Showcase } from "@/lib/steam";

/** Rare ones read to a tenth of a percent; common ones to the whole. */
const share = (percent: number) => `${percent < 10 ? percent.toFixed(1) : Math.round(percent)}%`;
/** The month a game was finished, as "Mar 2025". */
const month = (ms: number) => new Date(ms).toLocaleDateString("en-GB", { month: "short", year: "numeric" });

/**
 * The Steam egg: "Video Games" on About opens the games Atif has finished to
 * the last achievement, the Completionist showcase on his Steam profile, from
 * app/api/steam. When Steam can't answer (no key, a private profile, an error)
 * it shows the achievements this site keeps instead: the eggs, found ones by
 * name. Opening it records the egg. Esc closes. Styles are `.steam` in globals.css.
 */
export function SteamPanel({ onClose }: { onClose: () => void }) {
  const [result, setResult] = useState<Showcase | null>(null);
  const { found: finds, count, total } = useEggs();
  const sheetRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    found("steam");
    sheetRef.current?.focus({ preventScroll: true });
    const ask = new AbortController();
    fetch("/api/steam", { signal: ask.signal })
      .then((response) => (response.ok ? (response.json() as Promise<Showcase>) : Promise.reject(new Error("steam route"))))
      .then(setResult, () => {
        if (!ask.signal.aborted) setResult({ status: "unavailable", reason: "error" });
      });
    return () => ask.abort();
  }, []);

  // Esc closes it from anywhere, wherever focus has got to.
  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [onClose]);

  return (
    <div
      className="term-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="steam-title"
        tabIndex={-1}
        className="egg-sheet steam"
        data-lenis-prevent
        onKeyDown={(event) => {
          // Two stops, the list and the close button: Tab only ever swaps between them.
          if (event.key !== "Tab") return;
          event.preventDefault();
          if (document.activeElement === closeRef.current) listRef.current?.focus();
          else closeRef.current?.focus();
        }}
      >
        <div className="term-bar">
          <span id="steam-title">Video games / 100%</span>
          <button ref={closeRef} type="button" className="term-close" onClick={onClose}>
            esc
          </button>
        </div>
        <div ref={listRef} tabIndex={0} aria-busy={!result} aria-label="Games" className="steam-body">
          {!result && <p className="steam-note">Asking Steam.</p>}

          {result?.status === "ok" && (
            <>
              <p className="steam-note">Every achievement, in every one. Off Atif&apos;s Steam profile.</p>
              <ol className="steam-list">
                {result.games.map((game) => (
                  <li key={game.appid} className="steam-row steam-perfect">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Steam's own cover art, straight from its CDN: nothing to optimise. */}
                    <img
                      src={game.cover}
                      alt=""
                      width={48}
                      height={72}
                      loading="lazy"
                      className="steam-cover"
                      onError={(event) => (event.currentTarget.style.visibility = "hidden")}
                    />
                    <span className="steam-name">
                      {game.name}
                      <span className="steam-game">
                        {game.hours} h{game.completed ? ` · 100% ${month(game.completed)}` : ""}
                      </span>
                      {game.rarest && (
                        <span className="steam-game">
                          Rarest: {game.rarest.name}, {share(game.rarest.percent)}
                          <span className="sr-only"> of players have it</span>
                        </span>
                      )}
                    </span>
                    <span className="steam-share">
                      {game.unlocked}/{game.total}
                      <span className="sr-only"> achievements</span>
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}

          {result?.status === "unavailable" && (
            <>
              <p className="steam-note">
                Steam isn&apos;t answering. This site keeps achievements of its own: {count} of {total} found.
              </p>
              <ol className="steam-list">
                {tracked.map((egg) => {
                  const got = finds.has(egg.id);
                  return (
                    <li key={egg.id} className="steam-row" data-got={got || undefined}>
                      <span aria-hidden="true" className="steam-mark" />
                      <span className="steam-name">
                        {got ? egg.name : "???"}
                        <span className="steam-game">{egg.where}</span>
                      </span>
                      <span className="steam-share">{got ? "Found" : "Not yet"}</span>
                    </li>
                  );
                })}
              </ol>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
