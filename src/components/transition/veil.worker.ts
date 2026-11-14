import { createEngine, type Engine, type EngineEvent, type Frames, type HostMessage } from "./veilEngine";

// The veil's engine on its own thread, so the greetings and the ripples keep
// moving while the page below is busy. Veil.tsx hands over the canvas in its
// first message and drives the engine from there.

type Scope = {
  onmessage: ((event: MessageEvent<HostMessage>) => void) | null;
  postMessage: (event: EngineEvent) => void;
  requestAnimationFrame?: (callback: (now: number) => void) => number;
  cancelAnimationFrame?: (id: number) => void;
};

const scope = self as unknown as Scope;

// Frames come from the worker's own animation clock where there is one.
const frames: Frames =
  scope.requestAnimationFrame && scope.cancelAnimationFrame
    ? { request: (callback) => scope.requestAnimationFrame!(callback), cancel: (id) => scope.cancelAnimationFrame!(id) }
    : {
        request: (callback) => setTimeout(() => callback(performance.now()), 16) as unknown as number,
        cancel: (id) => clearTimeout(id),
      };

let engine: Engine | null = null;

scope.onmessage = ({ data }) => {
  if (data.type === "init") {
    engine = data.canvas ? createEngine(data.canvas, (event) => scope.postMessage(event), frames) : null;
    if (!engine) {
      scope.postMessage({ type: "fail" });
      return;
    }
  }
  engine?.handle(data);
};
