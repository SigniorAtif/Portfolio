"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { isHomeIntro, trackLoad, whenStageOpen } from "@/lib/stage";

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

  varying float vBright;

  // Only the head turns: full rotation above the neck, none at the shoulders.
  vec3 turn(vec3 v, float yaw, float pitch) {
    float cy = cos(yaw), sy = sin(yaw), cp = cos(pitch), sp = sin(pitch);
    v = vec3(cy * v.x + sy * v.z, v.y, -sy * v.x + cy * v.z);
    return vec3(v.x, cp * v.y - sp * v.z, sp * v.y + cp * v.z);
  }

  float easeInOut(float t) { return t < .5 ? 4. * t * t * t : 1. - pow(-2. * t + 2., 3.) / 2.; }
  float hash(float n) { return fract(sin(n) * 43758.5453); }

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
  varying float vBright;

  void main() {
    vec3 p = position;
    p.x += sin(uTime * .05 + aRand.x * 6.28) * .25;
    p.y += sin(uTime * .04 + aRand.y * 6.28) * .2;
    vBright = (.1 + aRand.z * .22) * uAssemble;
    vec4 mv = modelViewMatrix * vec4(p, 1.);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (.5 + aRand.z) / -mv.z;
  }
`;

const fragment = /* glsl */ `
  uniform vec3 uDot;
  varying float vBright;

  void main() {
    float r = length(gl_PointCoord - .5);
    float a = 1. - smoothstep(.18, .5, r); // a crisp point with a soft rim, not a blob
    gl_FragColor = vec4(uDot, a * min(vBright, 1.));
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

  const view = new DataView(bytes.buffer);
  const count = view.getUint32(4, true);
  const positions = new Float32Array(count * 3);
  const normals = new Float32Array(count * 3);
  const flags = new Float32Array(count);
  const posAt = 8;
  const normAt = posAt + count * 6;
  const flagAt = normAt + count * 3;
  for (let i = 0; i < count * 3; i++) {
    positions[i] = (view.getInt16(posAt + i * 2, true) / 32767) * POSITION_RANGE;
    normals[i] = view.getInt8(normAt + i) / 127;
  }
  const edges = new Float32Array(count);
  const edgeAt = flagAt + count;
  for (let i = 0; i < count; i++) {
    flags[i] = bytes[flagAt + i];
    edges[i] = bytes[edgeAt + i] / 255;
  }
  return { count, positions, normals, flags, edges };
}

function randoms(count: number) {
  const out = new Float32Array(count * 3);
  for (let i = 0; i < out.length; i++) out[i] = Math.random();
  return out;
}

/** The dot portrait. Fills its parent; the pointer anywhere on the page moves the light. */
export function BustStage({ file = "/bust/points.bin" }: { file?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lightRef = useRef<HTMLSpanElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const lightDot = lightRef.current;
    if (!root || !canvas || !lightDot) return;

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
      uDot: { value: dotColour },
    };
    const shared = { uniforms, fragmentShader: fragment, transparent: true, depthTest: false, depthWrite: false };
    const bustMaterial = new THREE.ShaderMaterial({ ...shared, vertexShader: bustVertex });
    const dustMaterial = new THREE.ShaderMaterial({ ...shared, vertexShader: dustVertex });

    // A room, not a void: faint dust drifting through the whole frame.
    const dustPositions = new Float32Array(DUST * 3);
    for (let i = 0; i < DUST; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 6;
      dustPositions[i * 3 + 1] = (Math.random() - 0.5) * 2.4 + CAMERA_Y;
      dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    dustGeometry.setAttribute("aRand", new THREE.BufferAttribute(randoms(DUST), 3));
    const dust = new THREE.Points(dustGeometry, dustMaterial);
    dust.frustumCulled = false;
    scene.add(dust);

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

    let frame = 0;
    let disposed = false;
    let visible = true;
    let assembleStart = 0;
    let last = performance.now();
    let nextGlint = Infinity;
    const born = performance.now();
    const turn = { yaw: 0, pitch: 0, on: 0 };
    const light = { x: -0.45, y: 0.6 }; // stage coordinates, -1..1

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      if (!visible) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      uniforms.uTime.value = now / 1000;

      if (assembleStart) {
        const elapsed = (now - assembleStart) / 1000;
        uniforms.uAssemble.value = Math.min(elapsed / ASSEMBLE_S, 1);
        // One band of light slides down the bust once, then leaves.
        uniforms.uShine.value = 1.9 - Math.max(0, elapsed - 2.2) * 2.4;
        if (elapsed > ASSEMBLE_S && nextGlint === Infinity) nextGlint = now + 2400;
        if (now > nextGlint) {
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
      const held = pointer.at >= 0 && now - pointer.at < IDLE_MS && Math.abs(pointer.x) < 1.3 && Math.abs(pointer.y) < 1.3;
      // The head starts following straight away, while the dots are still landing.
      let targetX: number, targetY: number, yawTo: number, pitchTo: number, headRate: number;
      if (reduced) {
        [targetX, targetY, yawTo, pitchTo, headRate] = [-0.45, 0.6, 0, 0, 60];
      } else if (held) {
        [targetX, targetY, yawTo, pitchTo, headRate] = [pointer.x, pointer.y, pointer.x * 0.5, -pointer.y * 0.18, 3];
      } else {
        const sx = Math.sin(0.45 * clock);
        const cy = Math.cos(0.33 * clock);
        [targetX, targetY, yawTo, pitchTo, headRate] = [0.62 * sx, 0.22 + 0.42 * cy, 0.35 * sx, -0.12 * cy, 1.5];
      }
      light.x += (targetX - light.x) * ease(5);
      light.y += (targetY - light.y) * ease(5);
      turn.yaw += (yawTo - turn.yaw) * ease(headRate);
      turn.pitch += (pitchTo - turn.pitch) * ease(headRate);
      turn.on += (Math.min(1, 1.6 * uniforms.uAssemble.value) - turn.on) * ease(4);
      uniforms.uYaw.value = turn.yaw;
      uniforms.uPitch.value = turn.pitch;
      const halfHeight = camera.position.z * Math.tan((FOV * Math.PI) / 360);
      uniforms.uLight.value.set(light.x * halfHeight * camera.aspect, light.y * halfHeight + CAMERA_Y, 1.1);
      uniforms.uLightOn.value = turn.on;
      // The stage may be CSS-scaled, so place the star in its own layout pixels.
      lightDot.style.transform = `translate(${(light.x * 0.5 + 0.5) * root.clientWidth}px, ${(0.5 - light.y * 0.5) * root.clientHeight}px)`;
      lightDot.style.opacity = String(reduced ? 0 : turn.on);

      renderer.render(scene, camera);
    };

    const watcher = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      last = performance.now();
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

        report(1);
        // Returning home reveals the finished portrait. Only a direct home
        // load assembles it from the loader's ring.
        await whenStageOpen();
        if (disposed) return;
        if (reduced) uniforms.uAssemble.value = 1;
        else assembleStart = performance.now() - (homeIntro ? 0 : SETTLED_MS);
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
      scene.traverse((object) => {
        if (object instanceof THREE.Points) object.geometry.dispose();
      });
      bustMaterial.dispose();
      dustMaterial.dispose();
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

      {failed && (
        <p className="absolute inset-0 grid place-items-center font-mono text-xs uppercase tracking-widest text-muted">
          Portrait could not load
        </p>
      )}
    </div>
  );
}
