"use client";

import { useEffect, useRef, useState } from "react";

import type { ScoredPlane, SolarRating } from "@/types/roof";

/** three.js loaded on demand (shared promise with #003's loader pattern). */
let threePromise: Promise<typeof import("three")> | null = null;
const loadThree = () => (threePromise ??= import("three"));

export const RATING_COLORS: Record<SolarRating, string> = {
  excellent: "#e84c0f",
  good: "#e09a5a",
  fair: "#8a877a",
  limited: "#5f6672",
};

type ViewerState = {
  three: typeof import("three");
  renderer: import("three").WebGLRenderer;
  camera: import("three").PerspectiveCamera;
  scene: import("three").Scene;
  group: import("three").Group;
  meshes: import("three").Mesh[];
  angle: number;
  dragging: boolean;
  autoRotate: boolean;
  camDist: number;
  camHeight: number;
  lookY: number;
};

function buildRoof(s: ViewerState, planes: ScoredPlane[]): void {
  const { three } = s;
  s.group.clear();
  s.meshes = [];
  if (planes.length === 0) return;

  // Center all rings around the building's centroid; floor at min z.
  const all = planes.flatMap((p) => p.ring);
  const cx = all.reduce((a, v) => a + v[0], 0) / all.length;
  const cy = all.reduce((a, v) => a + v[1], 0) / all.length;
  const minZ = Math.min(...all.map((v) => v[2]));
  const maxZ = Math.max(...all.map((v) => v[2]));

  for (const plane of planes) {
    // RD (x oost, y noord, z omhoog) → three (x oost, y omhoog, z zuid).
    const pts3 = plane.ring.map(
      (v) => new three.Vector3(v[0] - cx, v[2] - minZ, -(v[1] - cy)),
    );
    // Local 2D basis for triangulation.
    const normal = new three.Vector3();
    for (let i = 0; i < pts3.length; i++) {
      const a = pts3[i];
      const b = pts3[(i + 1) % pts3.length];
      normal.x += (a.y - b.y) * (a.z + b.z);
      normal.y += (a.z - b.z) * (a.x + b.x);
      normal.z += (a.x - b.x) * (a.y + b.y);
    }
    normal.normalize();
    const u = Math.abs(normal.y) > 0.9
      ? new three.Vector3(1, 0, 0)
      : new three.Vector3().crossVectors(normal, new three.Vector3(0, 1, 0)).normalize();
    const v = new three.Vector3().crossVectors(normal, u);
    const pts2 = pts3.map((p) => new three.Vector2(p.dot(u), p.dot(v)));
    const tris = three.ShapeUtils.triangulateShape(pts2, []);

    const positions: number[] = [];
    for (const [a, b, c] of tris) {
      for (const i of [a, b, c]) positions.push(pts3[i].x, pts3[i].y, pts3[i].z);
    }
    const geom = new three.BufferGeometry();
    geom.setAttribute("position", new three.Float32BufferAttribute(positions, 3));
    geom.computeVertexNormals();
    const mesh = new three.Mesh(
      geom,
      new three.MeshStandardMaterial({
        color: RATING_COLORS[plane.rating],
        roughness: 0.8,
        metalness: 0.05,
        side: three.DoubleSide,
      }),
    );
    s.group.add(mesh);
    s.meshes.push(mesh);

    // Thin edge outline for readability.
    const edge = new three.LineLoop(
      new three.BufferGeometry().setFromPoints(pts3),
      new three.LineBasicMaterial({ color: 0x171610 }),
    );
    s.group.add(edge);
  }

  const spanX = Math.max(...all.map((v) => Math.abs(v[0] - cx))) * 2;
  const spanY = Math.max(...all.map((v) => Math.abs(v[1] - cy))) * 2;
  const size = Math.max(spanX, spanY, maxZ - minZ);
  s.camDist = Math.max(8, size * 1.7);
  s.camHeight = Math.max(6, (maxZ - minZ) * 1.6 + 4);
  s.lookY = (maxZ - minZ) / 2;
}

/**
 * Rotating 3D view of the roof planes, colored by indicative solar rating.
 * Degrades to a note when WebGL is unavailable (the data cards below the
 * viewer carry the same information as text).
 */
export function RoofViewer({
  planes,
  selected,
}: {
  planes: ScoredPlane[];
  selected: number | null;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<ViewerState | null>(null);
  const planesRef = useRef(planes);
  const [failed, setFailed] = useState(false);
  const [, setReady] = useState(false);

  useEffect(() => {
    planesRef.current = planes;
    const s = stateRef.current;
    if (s) buildRoof(s, planes);
  }, [planes]);

  // Highlight selection from the cards.
  useEffect(() => {
    const s = stateRef.current;
    if (!s) return;
    s.meshes.forEach((mesh, i) => {
      const mat = mesh.material as import("three").MeshStandardMaterial;
      mat.emissive.set(i === selected ? 0x552200 : 0x000000);
    });
  }, [selected, planes]);

  useEffect(() => {
    let disposed = false;
    let frame = 0;
    (async () => {
      const three = await loadThree();
      const host = hostRef.current;
      if (disposed || !host) return;
      let renderer: import("three").WebGLRenderer;
      try {
        renderer = new three.WebGLRenderer({ antialias: true, alpha: true });
      } catch {
        setFailed(true);
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      host.appendChild(renderer.domElement);
      const scene = new three.Scene();
      const camera = new three.PerspectiveCamera(45, 1, 0.1, 500);
      scene.add(new three.HemisphereLight(0xfff8ee, 0x8a7a66, 1.15));
      const sun = new three.DirectionalLight(0xffffff, 1.5);
      sun.position.set(30, 50, 20);
      scene.add(sun);
      const group = new three.Group();
      scene.add(group);

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const state: ViewerState = {
        three,
        renderer,
        camera,
        scene,
        group,
        meshes: [],
        angle: 0.8,
        dragging: false,
        autoRotate: !reduced,
        camDist: 20,
        camHeight: 12,
        lookY: 3,
      };
      stateRef.current = state;
      buildRoof(state, planesRef.current);

      const el = renderer.domElement;
      el.style.touchAction = "pan-y";
      let lastX = 0;
      el.addEventListener("pointerdown", (e) => {
        state.dragging = true;
        state.autoRotate = false;
        lastX = e.clientX;
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
        const height = Math.round(width * 0.7);
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      resize();
      window.addEventListener("resize", resize);

      const tick = () => {
        if (disposed) return;
        if (state.autoRotate) state.angle += 0.003;
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
      setReady(true);
    })();
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      const s = stateRef.current;
      if (s) {
        s.renderer.dispose();
        s.renderer.domElement.remove();
        stateRef.current = null;
      }
    };
  }, []);

  if (failed) {
    return (
      <p className="border border-line bg-background px-4 py-6 text-sm text-muted">
        The 3D view needs WebGL, which isn&rsquo;t available on this device —
        the roof-plane list below has the same information.
      </p>
    );
  }
  return (
    <div>
      <div
        ref={hostRef}
        role="img"
        aria-label="Rotating 3D model of the roof, planes colored by indicative solar potential"
        className="overflow-hidden border border-line bg-background"
      />
      <p className="mt-2 text-[11px] text-faint">Drag to rotate the roof.</p>
    </div>
  );
}
