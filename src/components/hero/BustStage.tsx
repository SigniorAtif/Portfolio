"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { QR, QR_PENDING } from "@/content/qr";
import { found, onSummon } from "@/lib/eggs";
import { glideTo } from "@/lib/scrollLock";
import { isHomeIntro, stageOpen, trackLoad, whenStageOpen } from "@/lib/stage";

const POSITION_RANGE = 1.25; // must match pack() in tools/bust/bake.py
const RING_PX = 56;
const CAMERA_DISTANCE = 3.3;
const CAMERA_Y = 0.12; // frame the head; the shoulders run off the bottom edge
const DOT_PX = 2.0; // sprite size at 800px stage height; the visible core is about half
const FOV = 30;
const DUST = 260;
const IDLE_MS = 4000; // a still pointer hands the light back to the wander
const ASSEMBLE_S = 2.6; // the dots' flight in from the ring
// Returning home starts the intro this far in: assembled, the shine band gone.
const SETTLED_MS = 5000;
// An easter egg: left alone this long (no pointer, key or scroll), the portrait falls asleep.
const SLEEP_MS = 90_000;
// Where the "z"s rise from: just past the right temple, clear of the hair.
const CROWN = new THREE.Vector3(0.4, 0.56, 0.3);
// The point the head turns about, as the shader's `neck`.
const NECK = new THREE.Vector3(0, -0.28, -0.05);
// Asleep it is still alive. It breathes, in quickly and out slowly, each breath
// climbing from the chest to the head, and now and then it nods off further and
// jerks back up. Every dot strays and glows on its own clock, the light sinks
// to the bottom and flickers like an ember, and the dust rises off it.
const BREATH_S = 4.8; // one breath, in and out
const INHALE = 0.38; // the share of a breath spent breathing in
const BREATH_ROLL = 0.8; // seconds a breath takes to climb one unit of height
const BREATH_LIFT = 0.015; // how far the shoulders lift the bust on a breath in
const BREATH_CHIN = 0.03; // and how far the chin comes up, in radians
const WANDER = 0.007; // how far a sleeping dot strays from its place, with the current and on its own
const TWINKLE = 0.8; // and how much its light comes and goes
const RISE = 0.05; // how fast the dust climbs, in units a second
const MOTES = 48; // the sparks the ember gives off
const NOD_EVERY: [number, number] = [13, 24]; // seconds between nods, at random
const NOD = { sink: 1.5, jerk: 0.28, settle: 1.3, deep: 0.13, over: 0.045 };
const smooth = (t: number) => t * t * (3 - 2 * t);
/** One breath, 0 out to 1 in, this far into the breathing. */
function breathAt(t: number) {
  const phase = (((t / BREATH_S) % 1) + 1) % 1;
  return phase < INHALE ? smooth(phase / INHALE) : 1 - smooth((phase - INHALE) / (1 - INHALE));
}
/** How far the head has dropped (radians, forward) this far into a nod. */
function nodAt(t: number) {
  if (t < NOD.sink) return NOD.deep * (t / NOD.sink) ** 2;
  t -= NOD.sink;
  if (t < NOD.jerk) return NOD.deep - (NOD.deep + NOD.over) * (1 - (1 - t / NOD.jerk) ** 3);
  t -= NOD.jerk;
  if (t < NOD.settle) return -NOD.over * (1 - smooth(t / NOD.settle));
  return 0;
}
const NOD_S = NOD.sink + NOD.jerk + NOD.settle;

// An easter egg: summoned (typing "scan", see EggHost), points drift in like dust
// and settle into the QR code for /q on a flat grid just behind the head, hold,
// and scatter. Dots sit on the light modules and the quiet border and the dark
// modules stay empty, so it reads as an ordinary dark-on-light code. The dot
// size was proven with zbarimg before it was built: anything from 0.6 decodes.
const QR_QUIET = 4; // modules of empty border, as a scanner wants
const QR_SIDE = QR.length + 2 * QR_QUIET;
const QR_DOT = 0.75; // a dot's width, as a share of its module
const QR_FILL = { h: 0.6, w: 0.84 }; // the most of the stage's height and width the code takes
const QR_Z = -0.35; // just behind the head
const QR_TIME = { form: 1.8, hold: 8, leave: 1.6, fade: 0.35 }; // seconds; reduced motion only fades, by `fade`
const QR_DIM = 0.88; // how far the bust and the dust fade while the code is up

const bustVertex = /* glsl */ `
  attribute vec3 aNormal;
  attribute float aFlag;
  attribute float aEdge;
  attribute vec3 aRand;

  uniform float uAssemble;
  uniform float uShine;
  uniform float uGlint;
  uniform float uTime;
  uniform float uRing;
  uniform float uSize;
  uniform vec3 uLight;
  uniform float uLightOn;
  uniform float uYaw;
  uniform float uPitch;
  uniform float uSleep;
  uniform float uBreathT;

  varying float vBright;

  // Only the head turns: full rotation above the neck, none at the shoulders.
  vec3 turn(vec3 v, float yaw, float pitch) {
    float cy = cos(yaw), sy = sin(yaw), cp = cos(pitch), sp = sin(pitch);
    v = vec3(cy * v.x + sy * v.z, v.y, -sy * v.x + cy * v.z);
    return vec3(v.x, cp * v.y - sp * v.z, sp * v.y + cp * v.z);
  }

  float easeInOut(float t) { return t < .5 ? 4. * t * t * t : 1. - pow(-2. * t + 2., 3.) / 2.; }
  float hash(float n) { return fract(sin(n) * 43758.5453); }
  float breathAt(float t) {
    float phase = fract(t / ${BREATH_S.toFixed(2)});
    return phase < ${INHALE.toFixed(2)}
      ? smoothstep(0., 1., phase / ${INHALE.toFixed(2)})
      : 1. - smoothstep(0., 1., (phase - ${INHALE.toFixed(2)}) / ${(1 - INHALE).toFixed(2)});
  }

  void main() {
    // Each dot leaves the loader ring on its own delay, taken from the same
    // random number as its angle, so the ring unwinds instead of exploding.
    float t = easeInOut(clamp((uAssemble - aRand.x * .45) / .55, 0., 1.));
    float r2 = hash(aRand.x * 91.7);
    float angle = aRand.x * 6.2831853;
    vec3 ring = vec3(cos(angle), sin(angle), 0.) * uRing * (1. + (aRand.y - .5) * .05);
    ring.y += ${CAMERA_Y.toFixed(2)};

    // The head turns on the neck; the shoulders follow a little.
    float head = smoothstep(-.42, -.1, position.y);
    float yaw = uYaw * (.22 + .78 * head);
    vec3 neck = vec3(0., -.28, -.05);
    vec3 home = turn(position - neck, yaw, uPitch * head) + neck;
    vec3 normal = turn(aNormal, yaw, uPitch * head);

    // Breathing: every dot drifts a hair along its normal on its own clock.
    home += normal * sin(uTime * 1.4 + aRand.y * 60.) * .0025;
    // Asleep, a real breath. It starts in the chest and reaches the head a beat
    // later; the chest swells more than the head, and the shoulders lift
    // everything above them.
    float breath = uSleep * breathAt(uBreathT - max(position.y + .8, 0.) * ${BREATH_ROLL.toFixed(2)});
    home += normal * breath * (.004 + .016 * (1. - head));
    home.y += breath * ${BREATH_LIFT};
    // And every dot comes loose: carried about in slow currents that run
    // through the body, and circling its place on its own, gentler in the face.
    vec3 current = vec3(
      sin(uTime * 1.1 + position.y * 9. + aRand.x * 2.),
      sin(uTime * .9 + position.x * 8. + aRand.y * 2.),
      sin(uTime * .7 + position.z * 7. + aRand.z * 2.)
    );
    float spin = uTime * (1.4 + aRand.z * 1.6) + aRand.x * 90.;
    vec3 orbit = vec3(cos(spin), sin(spin), sin(spin * .7 + aRand.y * 9.));
    home += (current + orbit) * uSleep * ${WANDER} * (1. - .5 * head);

    // No swirl: a straight run from ring to home, bowed toward the camera,
    // with a sideways offset that is different for every dot.
    float arc = sin(t * 3.14159);
    vec3 bow = vec3(sin(aRand.x * 40. + uTime * .3), cos(aRand.x * 31.), .9 + r2 * 1.4);
    vec3 p = mix(ring, home, t) + bow * arc * .17;

    vec3 toLight = uLight - p;
    float lit = max(dot(normal, normalize(toLight)), 0.) / (1. + dot(toLight, toLight) * 1.4);
    float key = max(dot(normal, normalize(vec3(-.45, .5, .74))), 0.);
    float rim = pow(1. - abs(normal.z), 3.);
    float shine = exp(-pow((p.y + p.x * .45 - uShine) * 5., 2.));
    float facing = smoothstep(-.15, .35, normal.z);

    float b = .34 + key * .14 + lit * 2.4 * uLightOn + rim * .12; // mostly even grey
    b *= mix(.05, 1., facing);        // far side nearly gone, so it never reads as fog
    b *= .45 + aRand.y * .75;         // no two dots alike
    b += aEdge * .5 * facing;         // folds draw as lines: collar, placket, seams
    b += shine * .8 * facing;
    if (aFlag > .5) {                 // glasses: same white, just brighter
      float glint = smoothstep(.09, 0., abs(position.x - uGlint)); // crosses the frame every few seconds
      // Visibility comes from the turned normal, like every other dot.
      b = (.9 + lit * uLightOn + shine * .4 + glint * 1.2) * mix(.08, 1., smoothstep(-.35, .15, normal.z));
      // The arms run back from the lenses (lens plane is z = .5). On a hard
      // turn the far arm swings across the near lens although the head hides
      // it by then, so arm dots on the side turned away fade with the turn.
      float arm = smoothstep(.45, .3, position.z);
      float farSide = step(0., position.x * yaw);
      b *= 1. - arm * farSide * smoothstep(.06, .36, abs(yaw));
    }
    // Asleep, each dot's light comes and goes on its own, and the breath
    // brightens what it passes on its way up.
    b *= (1. + uSleep * ${TWINKLE.toFixed(2)} * sin(uTime * (.8 + aRand.z * 2.2) + aRand.x * 120.)) * (1. + breath * .7);
    vBright = mix(.75, 1., t) * b;

    vec4 mv = modelViewMatrix * vec4(p, 1.);
    gl_Position = projectionMatrix * mv;
    // Most dots tiny, a few two or three times that.
    float size = uSize * (.55 + pow(aRand.z, 3.) * 2.1) * (1. + shine * .4) * (1. + aEdge * .25);
    if (aFlag > .5) size = uSize * .95;
    gl_PointSize = size / -mv.z;
  }
`;

const dustVertex = /* glsl */ `
  attribute vec3 aRand;
  uniform float uTime;
  uniform float uSize;
  uniform float uAssemble;
  uniform float uSleep;
  uniform float uRise;
  uniform vec3 uLight;
  uniform float uLightOn;
  varying float vBright;

  void main() {
    vec3 p = position;
    // Asleep, the dust climbs off the light below, each mote at its own pace,
    // and comes round again from under the frame.
    float floorY = ${(CAMERA_Y - 1.2).toFixed(2)};
    p.y = floorY + mod(p.y - floorY + uRise * (.5 + aRand.z), 2.4);
    p.x += sin(uTime * .05 + aRand.x * 6.28) * .25;
    p.y += sin(uTime * .04 + aRand.y * 6.28) * .2;
    // Motes passing the ember catch its light.
    vec3 toLight = uLight - p;
    float glow = uSleep * uLightOn / (1. + dot(toLight, toLight) * 6.);
    vBright = (.1 + aRand.z * .22 + glow * 1.6) * uAssemble;
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (.5 + aRand.z) * (1. + glow) / -mv.z;
  }
`;

// Asleep, the ember gives off sparks: each leaves the light, climbs, sways and
// burns out, then leaves again. Hidden while awake.
const moteVertex = /* glsl */ `
  attribute vec3 aRand;
  uniform float uTime;
  uniform float uSize;
  uniform float uSleep;
  uniform vec3 uLight;
  uniform float uLightOn;
  varying float vBright;

  void main() {
    float life = 3. + aRand.y * 3.;
    float age = fract(uTime / life + aRand.x);
    vec3 p = uLight + vec3(
      (aRand.z - .5) * .14 + sin(uTime * (.8 + aRand.z) + aRand.x * 20.) * .06 * age,
      age * (.35 + aRand.z * .5),
      -.15 - aRand.x * .3
    );
    vBright = uSleep * (.4 + uLightOn) * smoothstep(0., .12, age) * pow(1. - age, 1.5) * 1.6;
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (1. + aRand.z * 1.2) * (1.3 - age * .7) / -mv.z;
  }
`;

const qrVertex = /* glsl */ `
  attribute vec3 aEnd;
  attribute vec2 aGrid;
  attribute vec3 aRand;
  uniform float uTime;
  uniform float uSize;
  uniform float uForm;
  uniform float uLeave;
  uniform float uQrScale;
  uniform float uQrSize;
  varying float vBright;

  float easeInOut(float t) { return t < .5 ? 4. * t * t * t : 1. - pow(-2. * t + 2., 3.) / 2.; }

  void main() {
    // Dust until it is called, and dust again once let go: the room's own slow drift.
    vec3 drift = vec3(sin(uTime * .05 + aRand.x * 6.28) * .25, sin(uTime * .04 + aRand.y * 6.28) * .2, 0.);
    float f = easeInOut(clamp((uForm - aRand.x * .35) / .65, 0., 1.));
    float l = easeInOut(clamp((uLeave - aRand.y * .3) / .7, 0., 1.));
    vec3 home = vec3(aGrid * uQrScale, ${QR_Z.toFixed(2)}) + vec3(0., ${CAMERA_Y.toFixed(2)}, 0.);
    vec3 p = mix(mix(position + drift, home, f), aEnd + drift, l);
    // Bowed toward the camera on the way in and on the way out, each dot by its own amount.
    p.z += (sin(f * 3.14159) + sin(l * 3.14159)) * (.2 + aRand.z * .4);
    vBright = mix(.18 + aRand.z * .2, 1., f) * (1. - l);
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = mix(uSize * (.5 + aRand.z), uQrSize, f) / -mv.z;
  }
`;

const qrFragment = /* glsl */ `
  uniform vec3 uDot;
  uniform float uQrOn;
  varying float vBright;

  void main() {
    float r = length(gl_PointCoord - .5);
    float a = 1. - smoothstep(.4, .5, r); // hard edged: a scanner wants clean dots
    gl_FragColor = vec4(uDot, a * min(vBright, 1.) * uQrOn);
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uDot;
  uniform float uDim;
  varying float vBright;

  void main() {
    float r = length(gl_PointCoord - .5);
    float a = 1. - smoothstep(.18, .5, r); // a crisp point with a soft rim, not a blob
    gl_FragColor = vec4(uDot, a * min(vBright, 1.) * uDim);
  }
`;

type Loaded = {
  count: number;
  positions: Float32Array;
  normals: Float32Array;
  flags: Float32Array;
  edges: Float32Array;
};

async function loadPoints(file: string, onProgress: (fraction: number) => void): Promise<Loaded> {
  const res = await fetch(file);
  if (!res.ok || !res.body) throw new Error(`bust points: ${res.status}`);
  const total = Number(res.headers.get("content-length")) || 0;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    if (total) onProgress(Math.min(got / total, 1));
  }
  const bytes = new Uint8Array(got);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }

  // tools/bust/squeeze.py writes it gzipped. A host that decodes it on the
  // way hands over the payload instead, so only unzip what is still zipped.
  const data =
    bytes[0] === 0x1f && bytes[1] === 0x8b
      ? new Uint8Array(
          await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer(),
        )
      : bytes;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  if (view.getUint32(0) !== 0x42535432) throw new Error("bust points: not a BST2 file");
  const count = view.getUint32(4, true);
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const flags = new Float32Array(count);
  const edges = new Float32Array(count);

  // Each axis is a run of deltas from the point before: positions as int16
  // split into a low-byte and a high-byte plane, normals as int8. Both wrap,
  // so summing them in unsigned arithmetic and reading the sign at the end
  // gives back the exact baked values.
  let at = 8;
  for (let axis = 0; axis < 3; axis++, at += count * 2) {
    for (let i = 0, v = 0; i < count; i++) {
      v = (v + (data[at + i] | (data[at + count + i] << 8))) & 0xffff;
      positions[i * 3 + axis] = ((v < 0x8000 ? v : v - 0x10000) / 32767) * POSITION_RANGE;
    }
  }
  for (let axis = 0; axis < 3; axis++, at += count) {
    for (let i = 0, n = 0; i < count; i++) {
      n = (n + data[at + i]) & 0xff;
      normals[i * 3 + axis] = (n < 0x80 ? n : n - 0x100) / 127;
    }
  }
  for (let i = 0; i < count; i++) {
    flags[i] = data[at + i];
    edges[i] = data[at + count + i] / 255;
  }
  return { count, positions, normals, flags, edges };
}

/** Places scattered through the room the dust drifts in. */
function scattered(count: number) {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    out[i * 3] = (Math.random() - 0.5) * 6;
    out[i * 3 + 1] = (Math.random() - 0.5) * 2.4 + CAMERA_Y;
    out[i * 3 + 2] = (Math.random() - 0.5) * 2;
  }
  return out;
}

/** The QR code's points, as places on a unit square: every light module and every module of the border. */
function qrGrid() {
  const out: number[] = [];
  for (let y = 0; y < QR_SIDE; y++) {
    for (let x = 0; x < QR_SIDE; x++) {
      if (QR[y - QR_QUIET]?.[x - QR_QUIET] === "#") continue;
      out.push((x + 0.5) / QR_SIDE - 0.5, 0.5 - (y + 0.5) / QR_SIDE);
    }
  }
  return new Float32Array(out);
}

function randoms(count: number) {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < out.length; i++) out[i] = Math.random();
  return out;
}

/** The dot portrait. Fills its parent; the pointer anywhere on the page moves the light. */
export function BustStage({ file = "/bust/points.bust" }: { file?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lightRef = useRef<HTMLSpanElement>(null);
  const zzzRef = useRef<HTMLSpanElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const lightDot = lightRef.current;
    const zzz = zzzRef.current;
    if (!root || !canvas || !lightDot || !zzz) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const homeIntro = isHomeIntro();
    const dotColour = new THREE.Color(getComputedStyle(root).getPropertyValue("--dot").trim() || "#ffffff");
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true });
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 20);
    camera.position.set(0, CAMERA_Y, CAMERA_DISTANCE);

    const uniforms = {
      uAssemble: { value: 0 },
      uShine: { value: 3 },
      uGlint: { value: -9 },
      uRing: { value: 0.2 },
      uSize: { value: 8 },
      uTime: { value: 0 },
      uLight: { value: new THREE.Vector3(0, 0, 3) },
      uLightOn: { value: 0 },
      uYaw: { value: 0 },
      uPitch: { value: 0 },
      uSleep: { value: 0 }, // how asleep, for the motion; 0 under reduced motion
      uBreathT: { value: 0 },
      uRise: { value: 0 },
      uDot: { value: dotColour },
      uDim: { value: 1 },
    };
    const shared = { uniforms, fragmentShader: fragment, transparent: true, depthTest: false, depthWrite: false };
    const bustMaterial = new THREE.ShaderMaterial({ ...shared, vertexShader: bustVertex });
    const dustMaterial = new THREE.ShaderMaterial({ ...shared, vertexShader: dustVertex });
    // The sparks stay bright while the bust dims for sleep; they only give way to the QR code.
    const moteDim = { value: 1 };
    const moteMaterial = new THREE.ShaderMaterial({
      ...shared,
      uniforms: { ...uniforms, uDim: moteDim },
      vertexShader: moteVertex,
    });

    // A room, not a void: faint dust drifting through the whole frame.
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(scattered(DUST), 3));
    dustGeometry.setAttribute("aRand", new THREE.BufferAttribute(randoms(DUST), 3));
    const dust = new THREE.Points(dustGeometry, dustMaterial);
    dust.frustumCulled = false;
    scene.add(dust);

    // The ember's sparks, placed by the shader; `position` only gives the draw its count.
    const moteGeometry = new THREE.BufferGeometry();
    moteGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(MOTES * 3), 3));
    moteGeometry.setAttribute("aRand", new THREE.BufferAttribute(randoms(MOTES), 3));
    const motes = new THREE.Points(moteGeometry, moteMaterial);
    motes.frustumCulled = false;
    motes.visible = false;
    scene.add(motes);

    // The QR egg's points, drawn over the bust and hidden until summoned. They start
    // where they drift as dust (`position`) and leave for somewhere else (`aEnd`).
    const grid = qrGrid();
    const qrCount = grid.length / 2;
    const qrGeometry = new THREE.BufferGeometry();
    qrGeometry.setAttribute("position", new THREE.BufferAttribute(scattered(qrCount), 3));
    qrGeometry.setAttribute("aEnd", new THREE.BufferAttribute(scattered(qrCount), 3));
    qrGeometry.setAttribute("aGrid", new THREE.BufferAttribute(grid, 2));
    qrGeometry.setAttribute("aRand", new THREE.BufferAttribute(randoms(qrCount), 3));
    const qrUniforms = {
      uTime: uniforms.uTime,
      uSize: uniforms.uSize,
      uDot: uniforms.uDot,
      uForm: { value: 0 },
      uLeave: { value: 0 },
      uQrScale: { value: 1 },
      uQrSize: { value: 8 },
      uQrOn: { value: 0 },
    };
    const qrMaterial = new THREE.ShaderMaterial({
      uniforms: qrUniforms,
      vertexShader: qrVertex,
      fragmentShader: qrFragment,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    const code = new THREE.Points(qrGeometry, qrMaterial);
    code.frustumCulled = false;
    code.renderOrder = 1;
    code.visible = false;
    scene.add(code);

    const resize = () => {
      const width = root.clientWidth;
      const height = root.clientHeight;
      if (!width || !height) return;
      const dpr = Math.min(window.devicePixelRatio, 2);
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      // Narrow stages: pull back so the head still fits the width.
      camera.position.z = CAMERA_DISTANCE * Math.max(1, 0.72 / camera.aspect);
      camera.updateProjectionMatrix();
      const worldPerPx = (2 * camera.position.z * Math.tan((FOV * Math.PI) / 360)) / height;
      uniforms.uRing.value = RING_PX * worldPerPx;
      uniforms.uSize.value = (height / 800) * DOT_PX * dpr * camera.position.z;
      // The code, as big as the stage allows, in whole pixels a module so its edges stay sharp.
      const modulePx = Math.floor(Math.min(height * QR_FILL.h, width * QR_FILL.w) / QR_SIDE);
      const depth = camera.position.z - QR_Z;
      qrUniforms.uQrScale.value = (modulePx * QR_SIDE * 2 * depth * Math.tan((FOV * Math.PI) / 360)) / height;
      // The fragment's dot fills nine tenths of its sprite.
      qrUniforms.uQrSize.value = (QR_DOT / 0.9) * modulePx * dpr * depth;
    };
    resize();
    const resizer = new ResizeObserver(resize);
    resizer.observe(root);

    // The light is a star that wanders on its own. A moving pointer takes it
    // over; when the pointer leaves or goes quiet, the star wanders again.
    const pointer = { x: 0, y: 0, at: -1 };
    const onMove = (event: PointerEvent) => {
      const box = root.getBoundingClientRect();
      pointer.x = ((event.clientX - box.left) / box.width) * 2 - 1;
      pointer.y = -(((event.clientY - box.top) / box.height) * 2 - 1);
      pointer.at = performance.now();
    };
    const onLeave = () => (pointer.at = -1);
    if (!reduced) {
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerdown", onMove);
      document.documentElement.addEventListener("pointerleave", onLeave);
    }

    // Any sign of the visitor keeps the portrait awake, reduced motion too.
    let lastInput = performance.now();
    const stir = () => (lastInput = performance.now());
    const STIRS = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;
    for (const type of STIRS) window.addEventListener(type, stir, { passive: true });

    let frame = 0;
    let disposed = false;
    let visible = true;
    let running = false; // the loop has started: the points are in and the stage is open
    let assembleStart = 0;
    let last = performance.now();
    let nextGlint = Infinity;
    // Put the head and the star straight onto their marks on the next drawn frame.
    let settle = false;
    const born = performance.now();
    const turn = { yaw: 0, pitch: 0, on: 0 };
    const light = { x: -0.45, y: 0.6 }; // stage coordinates, -1..1
    let asleep = false;
    let sleep = 0; // 0 awake, 1 fast asleep, eased between
    let nodStart = 0; // when the current nod began, 0 between nods
    let nextNod = Infinity;
    let rise = 0; // how far the dust has climbed, over every doze so far
    const nodGap = () => (NOD_EVERY[0] + Math.random() * (NOD_EVERY[1] - NOD_EVERY[0])) * 1000;
    const crown = new THREE.Vector3();
    const X_AXIS = new THREE.Vector3(1, 0, 0);

    // The QR egg: when it was asked for and when it began to form (0 for neither),
    // since when the stage has been open, and how far the bust has faded for it.
    let qrWanted = 0;
    let qrStart = 0;
    let openSince = 0;
    let qrDim = 0;
    const callQr = () => {
      if (qrStart || qrWanted) return;
      qrWanted = performance.now();
      // It forms in the hero, so the page goes back up to it first.
      if (window.scrollY > 4) glideTo(0);
    };
    const stopSummons = onSummon((egg) => {
      if (egg === "qr") callQr();
    });
    // Summoned on another page, which sent the visitor here. The note is only
    // cleared once the code forms, so a remount on the way does not lose it.
    try {
      if (window.sessionStorage.getItem(QR_PENDING)) callQr();
    } catch {
      // No storage, no note.
    }

    const tick = (now: number) => {
      // Off screen the loop stops altogether; the watcher below restarts it.
      if (!visible) {
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      uniforms.uTime.value = now / 1000;

      if (assembleStart) {
        const elapsed = (now - assembleStart) / 1000;
        uniforms.uAssemble.value = Math.min(elapsed / ASSEMBLE_S, 1);
        // One band of light slides down the bust once, then leaves.
        uniforms.uShine.value = 1.9 - Math.max(0, elapsed - 2.2) * 2.4;
        if (elapsed > ASSEMBLE_S && nextGlint === Infinity) nextGlint = now + 2400;
        if (now > nextGlint && !asleep) {
          const g = (now - nextGlint) / 900;
          uniforms.uGlint.value = -0.4 + 0.8 * g;
          if (g > 1) {
            nextGlint = now + 4200;
            uniforms.uGlint.value = -9;
          }
        }
      }

      const ease = (rate: number) => 1 - Math.exp(-dt * rate);
      const clock = (now - born) / 1000;

      // Asleep once it has assembled and nobody has stirred for SLEEP_MS: the light sinks,
      // the glint stops, the dots dim and a few "z"s rise. Waking gives one glint.
      const drowsy = uniforms.uAssemble.value >= 1 && now - lastInput > SLEEP_MS;
      if (drowsy !== asleep) {
        asleep = drowsy;
        root.toggleAttribute("data-asleep", asleep);
        if (asleep) {
          uniforms.uGlint.value = -9;
          nextNod = now + nodGap();
          found("sleep");
        } else {
          nodStart = 0;
          nextNod = Infinity;
          if (nextGlint !== Infinity) nextGlint = now;
        }
      }
      sleep += ((asleep ? 1 : 0) - sleep) * ease(asleep ? 0.5 : 4);

      // The QR code forms once the portrait is whole, the stage has been open a
      // beat, and the page is back at the top (or has stopped trying to get there).
      if (stageOpen()) openSince ||= now;
      else openSince = 0;
      const atTop = window.scrollY < 4 || now - qrWanted > 2500;
      if (qrWanted && uniforms.uAssemble.value >= 1 && openSince && now - openSince > 500 && atTop) {
        qrWanted = 0;
        qrStart = now;
        code.visible = true;
        try {
          window.sessionStorage.removeItem(QR_PENDING);
        } catch {
          // Nothing to clear.
        }
      }
      let form = 0;
      let leave = 0;
      let shown = 0;
      if (qrStart) {
        const t = (now - qrStart) / 1000;
        const { form: forming, hold, leave: leaving, fade } = QR_TIME;
        const span = reduced ? hold : forming + hold + leaving;
        if (reduced) {
          // No flight: it is simply there, then gone.
          form = 1;
          shown = Math.max(0, Math.min(1, t / fade, (span - t) / fade));
        } else {
          form = Math.min(1, t / forming);
          leave = Math.max(0, Math.min(1, (t - forming - hold) / leaving));
          shown = Math.min(1, t / 0.4);
        }
        if (t > span) {
          qrStart = 0;
          code.visible = false;
          [form, leave, shown] = [0, 0, 0];
        }
      }
      qrUniforms.uForm.value = form;
      qrUniforms.uLeave.value = leave;
      qrUniforms.uQrOn.value = shown;
      qrDim += ((reduced ? shown : form * (1 - leave)) - qrDim) * ease(4);

      // The breath as it reaches the head, the nod, and the ember's flicker (-1 to 1:
      // slow and uneven, never a flash). All fade in and out with sleep.
      let breath = 0;
      let nod = 0;
      let flicker = 0;
      if (!reduced && sleep > 0.001) {
        breath = breathAt(clock - (CROWN.y + 0.8) * BREATH_ROLL);
        flicker = 0.5 * Math.sin(1.9 * clock) + 0.3 * Math.sin(3.1 * clock + 1) + 0.2 * Math.sin(5.3 * clock + 2);
        if (asleep && now > nextNod) {
          nodStart = now;
          nextNod = now + NOD_S * 1000 + nodGap();
        }
        if (nodStart) {
          const t = (now - nodStart) / 1000;
          nod = nodAt(t);
          if (t > NOD_S) nodStart = 0;
        }
      }
      const stirring = reduced ? 0 : sleep;
      rise += dt * stirring * RISE;
      uniforms.uSleep.value = stirring;
      motes.visible = stirring > 0.001;
      moteDim.value = 1 - qrDim;
      uniforms.uBreathT.value = clock;
      uniforms.uRise.value = rise;
      uniforms.uDim.value = (1 - 0.45 * sleep) * (1 - QR_DIM * qrDim);
      const held = pointer.at >= 0 && now - pointer.at < IDLE_MS && Math.abs(pointer.x) < 1.3 && Math.abs(pointer.y) < 1.3;
      // The head starts following straight away, while the dots are still landing.
      let targetX: number, targetY: number, yawTo: number, pitchTo: number, headRate: number;
      if (reduced) {
        [targetX, targetY, yawTo, pitchTo, headRate] = [-0.45, 0.6, 0, 0, 60];
      } else if (asleep) {
        // The star sinks to the bottom and stays there, an ember drifting and
        // trembling; the head nods forward and lolls.
        targetX = 0.05 + 0.1 * Math.sin(0.21 * clock) + 0.02 * Math.sin(2.3 * clock);
        targetY = -0.8 + 0.06 * Math.sin(0.37 * clock) + 0.015 * Math.sin(2.9 * clock + 1);
        [yawTo, pitchTo, headRate] = [0.08 * Math.sin(0.09 * clock), 0.14, 0.6];
      } else if (held) {
        [targetX, targetY, yawTo, pitchTo, headRate] = [pointer.x, pointer.y, pointer.x * 0.5, -pointer.y * 0.18, 3];
      } else {
        const sx = Math.sin(0.45 * clock);
        const cy = Math.cos(0.33 * clock);
        [targetX, targetY, yawTo, pitchTo, headRate] = [0.62 * sx, 0.22 + 0.42 * cy, 0.35 * sx, -0.12 * cy, 1.5];
      }
      // Asleep, the light burns low and flickers.
      const onTo = Math.min(1, 1.6 * uniforms.uAssemble.value) * (1 - sleep * (0.55 - 0.2 * flicker));
      if (settle) {
        settle = false;
        [light.x, light.y, turn.yaw, turn.pitch, turn.on] = [targetX, targetY, yawTo, pitchTo, onTo];
      }
      light.x += (targetX - light.x) * ease(5);
      light.y += (targetY - light.y) * ease(5);
      turn.yaw += (yawTo - turn.yaw) * ease(headRate);
      turn.pitch += (pitchTo - turn.pitch) * ease(headRate);
      turn.on += (onTo - turn.on) * ease(4);
      // The breath lifts the chin a little; the nod drops it further, on top of the eased pose.
      const sway = sleep * (nod - BREATH_CHIN * breath);
      uniforms.uYaw.value = turn.yaw;
      uniforms.uPitch.value = turn.pitch + sway;
      const halfHeight = camera.position.z * Math.tan((FOV * Math.PI) / 360);
      uniforms.uLight.value.set(light.x * halfHeight * camera.aspect, light.y * halfHeight + CAMERA_Y, 1.1);
      uniforms.uLightOn.value = turn.on;
      // The stage may be CSS-scaled, so place the star in its own layout pixels.
      lightDot.style.transform = `translate(${(light.x * 0.5 + 0.5) * root.clientWidth}px, ${(0.5 - light.y * 0.5) * root.clientHeight}px)`;
      // Asleep the light burns low on the bust, but the ember itself stays in sight.
      lightDot.style.opacity = String(reduced ? 0 : Math.min(1, turn.on + 0.4 * sleep) * (1 - qrDim));
      if (sleep > 0.01) {
        // The "z"s ride the breath and the nod with the head.
        crown.copy(CROWN).sub(NECK).applyAxisAngle(X_AXIS, sway).add(NECK);
        crown.y += sleep * breath * BREATH_LIFT;
        crown.project(camera);
        zzz.style.transform = `translate(${(crown.x * 0.5 + 0.5) * root.clientWidth}px, ${(0.5 - crown.y * 0.5) * root.clientHeight}px)`;
      }

      renderer.render(scene, camera);
    };

    const watcher = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      last = performance.now();
      if (visible && running && !frame) frame = requestAnimationFrame(tick);
    });
    watcher.observe(root);

    // The veil counts this download, and holds the stage shut until it is in.
    const report = trackLoad();
    loadPoints(file, report)
      .then(async ({ count, positions, normals, flags, edges }) => {
        if (disposed) return;
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("aNormal", new THREE.BufferAttribute(normals, 3));
        geometry.setAttribute("aFlag", new THREE.BufferAttribute(flags, 1));
        geometry.setAttribute("aEdge", new THREE.BufferAttribute(edges, 1));
        geometry.setAttribute("aRand", new THREE.BufferAttribute(randoms(count), 3));
        const points = new THREE.Points(geometry, bustMaterial);
        points.frustumCulled = false;
        scene.add(points);

        // Only a direct home load assembles the portrait from the loader's ring.
        // Anywhere else it is finished already, so it draws now, behind the veil,
        // facing the star: the reveal then uncovers it mid-follow instead of
        // showing a head that looks elsewhere and then turns to find the star.
        // This also paints over the last frame a kept-alive page left behind.
        if (reduced || !homeIntro) {
          if (reduced) uniforms.uAssemble.value = 1;
          else assembleStart = performance.now() - SETTLED_MS;
          settle = true;
          running = true;
          tick(performance.now());
          report(1);
          return;
        }

        // The veil stops waiting for a slow download. Points that land after it
        // has lifted assemble all the same, but fade in rather than appear.
        const late = stageOpen();
        report(1);
        await whenStageOpen();
        if (disposed) return;
        if (late) canvas.animate({ opacity: [0, 1] }, { duration: 700, easing: "ease-out" });
        assembleStart = performance.now();
        running = true;
        frame = requestAnimationFrame(tick);
      })
      .catch(() => {
        report(1);
        if (!disposed) setFailed(true);
      });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizer.disconnect();
      watcher.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      for (const type of STIRS) window.removeEventListener(type, stir);
      stopSummons();
      scene.traverse((object) => {
        if (object instanceof THREE.Points) object.geometry.dispose();
      });
      bustMaterial.dispose();
      dustMaterial.dispose();
      moteMaterial.dispose();
      qrMaterial.dispose();
      renderer.dispose();
    };
  }, [file]);

  return (
    <div ref={rootRef} data-bust className="absolute inset-0">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <p className="sr-only">A portrait of Atif Ahmed drawn in dots, wearing glasses.</p>

      <span
        ref={lightRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 -ml-[3px] -mt-[3px] size-[6px] rounded-full bg-white opacity-0 shadow-[0_0_14px_4px_rgb(255_255_255/0.45)]"
      />
      {/* The sleep egg's "z"s, placed over the crown each frame while it dozes. */}
      <span ref={zzzRef} aria-hidden="true" className="bust-zzz">
        <i>z</i>
        <i>z</i>
        <i>z</i>
      </span>

      {failed && (
        <p className="absolute inset-0 grid place-items-center font-mono text-xs uppercase tracking-widest text-muted">
          Portrait could not load
        </p>
      )}
    </div>
  );
}
