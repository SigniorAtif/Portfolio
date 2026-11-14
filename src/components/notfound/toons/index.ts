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

import { astronaut } from "./Astronaut";
import { dino } from "./Dino";
import { hexo } from "./Hexo";
import { monsier } from "./Monsier";
import { octo } from "./Octo";
import { potion } from "./Potion";
import { shapes } from "./Shapes";
import { shrimp } from "./Shrimp";
import { ufo } from "./UFO";
import type { Toon, ToonId } from "./types";

export type { Toon, ToonId };

/** Every character from the old portfolio. The mug is not here: it is the astronaut's prop (see AsciiMug). */
export const toons: Toon[] = [ufo, astronaut, dino, hexo, monsier, octo, potion, shapes, shrimp];
