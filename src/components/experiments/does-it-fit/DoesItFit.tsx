"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { Button } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Panel";
import { TextInput } from "@/components/ui/TextInput";
import { trackEvent } from "@/lib/analytics/events";
import {
  buildObjectBoxes,
  clampDimsCm,
  FIT_OBJECT_SPECS,
  FIT_OBJECTS,
  type FitObject,
} from "@/lib/fit/objects";

type ThreeBundle = {
  three: typeof import("three");
  exporter: typeof import("three/addons/exporters/USDZExporter.js");
};

const OBJECT_COLORS: Record<FitObject, number> = {
  closet: 0x8a7a66,
  desk: 0x77675a,
  table: 0x8a7a66,
  sofa: 0x6d7a6d,
  fridge: 0xb9b6ad,
};

/** three.js is heavy — load it once, on demand, after first paint. */
let threePromise: Promise<ThreeBundle> | null = null;
function loadThree(): Promise<ThreeBundle> {
  threePromise ??= Promise.all([
    import("three"),
    import("three/addons/exporters/USDZExporter.js"),
  ]).then(([three, exporter]) => ({ three, exporter }));
  return threePromise;
}

type PreviewState = {
  bundle: ThreeBundle;
  scene: import("three").Scene;
  camera: import("three").PerspectiveCamera;
  renderer: import("three").WebGLRenderer;
  group: import("three").Group;
  angle: number;
  dragging: boolean;
  autoRotate: boolean;
  camDist: number;
  camHeight: number;
  lookY: number;
};

/** Swap the previewed object and reframe the camera (mutates preview state). */
function rebuildObject(
  s: PreviewState,
  objType: FitObject,
  cm: { w: number; h: number; d: number },
): void {
  const { three } = s.bundle;
  s.group.clear();
  const m = { w: cm.w / 100, h: cm.h / 100, d: cm.d / 100 };
  const mat = new three.MeshStandardMaterial({
    color: OBJECT_COLORS[objType],
    roughness: 0.85,
    metalness: 0.05,
  });
  for (const b of buildObjectBoxes(objType, m)) {
    const mesh = new three.Mesh(new three.BoxGeometry(b.w, b.h, b.d), mat);
    mesh.position.set(b.x, b.y, b.z);
    s.group.add(mesh);
  }
  const size = Math.max(m.w, m.h, m.d);
  s.camDist = Math.max(2.2, size * 2.1);
  s.camHeight = Math.max(1.1, m.h * 0.85);
  s.lookY = m.h / 2;
}

const emptySubscribe = () => () => {};
const readArSupport = () =>
  document.createElement("a").relList?.supports?.("ar") ?? false;

/**
 * Experiment #003 — Does It Fit? Fully on-device: parametric furniture at
 * true size, previewed in three.js and placed in the room via AR Quick Look
 * (iPhone/iPad Safari). Nothing leaves the browser — no camera upload, no
 * API calls, no storage.
 */
export function DoesItFit() {
  const [type, setType] = useState<FitObject>("closet");
  const [dims, setDims] = useState(FIT_OBJECT_SPECS.closet.defaults);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped when the async three.js init finishes, so the rebuild effect runs.
  const [, setPreviewReady] = useState(false);
  const startedRef = useRef(false);

  // AR Quick Look support (Safari on iOS/iPadOS); null during SSR.
  const arSupported = useSyncExternalStore(emptySubscribe, readArSupport, () => null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<PreviewState | null>(null);

  const markStarted = useCallback(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      trackEvent("experiment_started");
    }
  }, []);

  // Initialize the three.js preview once.
  useEffect(() => {
    let disposed = false;
    let frame = 0;
    (async () => {
      const bundle = await loadThree();
      const host = canvasRef.current;
      if (disposed || !host) return;
      const { three } = bundle;
      const scene = new three.Scene();
      const camera = new three.PerspectiveCamera(40, 1, 0.1, 50);
      const renderer = new three.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      host.appendChild(renderer.domElement);

      scene.add(new three.HemisphereLight(0xfff8ee, 0x8a7a66, 1.1));
      const sun = new three.DirectionalLight(0xffffff, 1.6);
      sun.position.set(2, 4, 3);
      scene.add(sun);

      // Ground disc for scale grounding.
      const ground = new three.Mesh(
        new three.CircleGeometry(2.2, 48),
        new three.MeshStandardMaterial({ color: 0xd8d5c8, roughness: 1 }),
      );
      ground.rotation.x = -Math.PI / 2;
      scene.add(ground);

      const group = new three.Group();
      scene.add(group);

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const state: PreviewState = {
        bundle,
        scene,
        camera,
        renderer,
        group,
        angle: 0.6,
        dragging: false,
        autoRotate: !reduced,
        camDist: 4,
        camHeight: 1.4,
        lookY: 0.8,
      };
      sceneRef.current = state;

      const el = renderer.domElement;
      el.style.touchAction = "pan-y";
      let lastX = 0;
      el.addEventListener("pointerdown", (e) => {
        state.dragging = true;
        state.autoRotate = false;
        lastX = e.clientX;
        markStarted();
      });
      window.addEventListener("pointerup", () => (state.dragging = false));
      window.addEventListener("pointermove", (e) => {
        if (state.dragging) {
          state.angle += (e.clientX - lastX) * 0.01;
          lastX = e.clientX;
        }
      });

      const resize = () => {
        const width = host.clientWidth;
        const height = Math.round(width * 0.75);
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      resize();
      window.addEventListener("resize", resize);

      const tick = () => {
        if (disposed) return;
        if (state.autoRotate) state.angle += 0.004;
        camera.position.set(
          Math.sin(state.angle) * state.camDist,
          state.camHeight,
          Math.cos(state.angle) * state.camDist,
        );
        camera.lookAt(0, state.lookY, 0);
        renderer.render(scene, camera);
        frame = requestAnimationFrame(tick);
      };
      tick();
      setPreviewReady(true);
    })();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      const s = sceneRef.current;
      if (s) {
        s.renderer.dispose();
        s.renderer.domElement.remove();
        sceneRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rebuild the object whenever type or dimensions change.
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    rebuildObject(s, type, dims);
  });

  const setDim = (key: "w" | "h" | "d", value: string) => {
    markStarted();
    setDims((cur) => ({ ...cur, [key]: Number(value) }));
  };

  const commitDims = () => setDims((cur) => clampDimsCm(type, cur));

  const chooseType = (t: FitObject) => {
    markStarted();
    setType(t);
    setDims(FIT_OBJECT_SPECS[t].defaults);
  };

  const viewInAr = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const clamped = clampDimsCm(type, dims);
      setDims(clamped);
      const { three, exporter } = await loadThree();
      const scene = new three.Scene();
      const mat = new three.MeshStandardMaterial({
        color: OBJECT_COLORS[type],
        roughness: 0.85,
        metalness: 0.05,
      });
      const m = { w: clamped.w / 100, h: clamped.h / 100, d: clamped.d / 100 };
      for (const b of buildObjectBoxes(type, m)) {
        const mesh = new three.Mesh(new three.BoxGeometry(b.w, b.h, b.d), mat);
        mesh.position.set(b.x, b.y, b.z);
        scene.add(mesh);
      }
      const data = await new exporter.USDZExporter().parseAsync(scene);
      const blob = new Blob([data as unknown as ArrayBuffer], {
        type: "model/vnd.usdz+zip",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.rel = "ar";
      a.href = url;
      // Quick Look wants a child element inside the ar-anchor.
      a.appendChild(document.createElement("img"));
      if (!(a.relList?.supports?.("ar") ?? false)) {
        a.download = `spatiallab-${type}-${clamped.w}x${clamped.h}x${clamped.d}cm.usdz`;
      }
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      trackEvent("experiment_completed");
    } catch {
      setError("The 3D model could not be generated on this device.");
    } finally {
      setBusy(false);
    }
  }, [dims, type]);

  const spec = FIT_OBJECT_SPECS[type];

  return (
    <div>
      <Panel>
        <p className="text-[15px] leading-relaxed text-muted">
          Pick a piece of furniture, set its real dimensions, and place it in
          your room at true size with AR — straight from Safari, no app.
          Everything runs on your device; nothing is uploaded.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {FIT_OBJECTS.map((t) => (
            <Button
              key={t}
              variant={t === type ? "primary" : "secondary"}
              className="!min-h-11 !px-4"
              onClick={() => chooseType(t)}
            >
              {FIT_OBJECT_SPECS[t].label}
            </Button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {(
            [
              ["w", "Width"],
              ["h", "Height"],
              ["d", "Depth"],
            ] as const
          ).map(([key, label]) => (
            <div key={key}>
              <label htmlFor={`dim-${key}`} className="lab-label">
                {label} (cm)
              </label>
              <TextInput
                id={`dim-${key}`}
                type="number"
                inputMode="numeric"
                value={String(dims[key])}
                min={spec.range[key][0]}
                max={spec.range[key][1]}
                onChange={(e) => setDim(key, e.target.value)}
                onBlur={commitDims}
                className="mt-2"
              />
              <p className="mt-1 text-[11px] text-faint">
                {spec.range[key][0]}–{spec.range[key][1]}
              </p>
            </div>
          ))}
        </div>

        <div
          ref={canvasRef}
          aria-label={`3D preview of the ${spec.label.toLowerCase()} at ${dims.w} by ${dims.h} by ${dims.d} centimeters`}
          role="img"
          className="mt-5 overflow-hidden border border-line bg-background"
        />
        <p className="mt-2 text-[11px] text-faint">
          Drag to rotate the preview.
        </p>

        <div className="mt-5 flex flex-col gap-3">
          <Button
            className="min-h-13 py-3.5 text-base"
            onClick={viewInAr}
            disabled={busy || arSupported === null}
          >
            {busy
              ? "Preparing model…"
              : arSupported
                ? "View at real size (AR)"
                : "Download 3D model (.usdz)"}
          </Button>
          {arSupported === false && (
            <p className="text-xs leading-relaxed text-faint">
              Placing it in your room with AR works in Safari on iPhone or
              iPad. On this device you can rotate the true-scale preview
              above, or download the model.
            </p>
          )}
          {error && (
            <p className="text-sm text-accent" role="alert">
              {error}
            </p>
          )}
        </div>
      </Panel>
      <p className="mt-4 text-xs leading-relaxed text-faint">
        This experiment runs entirely on your device: the dimensions and the
        3D model never leave your browser. Sizes are exactly what you enter —
        the shape is a simplified stand-in, not a product.
      </p>
    </div>
  );
}
