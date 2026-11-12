/*
 * The toon drawings and their loop animations are ported from Iuri de Paula's
 * portfolio, https://github.com/iuridepaula/portfolio
 * (src/components/Characters), released under the MIT License:
 *
 * MIT License
 *
 * Copyright (c) 2019 Iuri de Paula
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { useSyncExternalStore } from "react";
import { astronaut } from "./Astronaut";
import { dino } from "./Dino";
import { ufo } from "./UFO";
import type { Toon, ToonId } from "./types";

export type { Toon, ToonId };

/** Add the other seven here as they are ported; the renderer needs nothing else. */
export const toons: Toon[] = [ufo, astronaut, dino];

let picked = -1;
const noSubscribe = () => () => {};

/**
 * One toon per visit, chosen on the client after hydration (null on the
 * server and during hydration, so the prerendered HTML never depends on a
 * random number).
 */
export function useToonOfTheVisit(): Toon | null {
  const index = useSyncExternalStore(
    noSubscribe,
    () => {
      if (picked < 0) picked = Math.floor(Math.random() * toons.length);
      return picked;
    },
    () => -1,
  );
  return index < 0 ? null : toons[index];
}
