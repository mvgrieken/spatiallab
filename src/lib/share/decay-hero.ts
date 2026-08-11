import { CARD_COLORS } from "./card";

/**
 * Draw the energy decay curve onto an offscreen canvas for use as a share
 * card hero.
 *
 * Deliberately a canvas rather than a rasterised copy of `DecayChart`: that
 * component styles its SVG with CSS custom properties (`var(--line)`), and a
 * serialized SVG loses the document that defined them — every stroke would
 * come out unstyled. Drawing here with literal colours sidesteps the problem.
 * The scaling is the same simple mapping the on-screen chart uses.
 */
export function renderDecayHero(
  points: Array<{ t: number; db: number }>,
  rt60: number,
  size = { width: 800, height: 740 },
): HTMLCanvasElement | null {
  if (typeof document === "undefined" || points.length === 0) return null;

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = CARD_COLORS.surface;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const padL = 74;
  const padR = 40;
  const padT = 60;
  const padB = 70;
  const maxT = points[points.length - 1]?.t || 1;
  const x = (t: number) => padL + (t / maxT) * (canvas.width - padL - padR);
  const y = (db: number) => padT + (-db / 60) * (canvas.height - padT - padB);

  ctx.font = '500 22px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.textBaseline = "middle";

  for (const db of [0, -20, -40, -60]) {
    ctx.beginPath();
    ctx.moveTo(padL, y(db));
    ctx.lineTo(canvas.width - padR, y(db));
    ctx.strokeStyle = CARD_COLORS.line;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = CARD_COLORS.faint;
    ctx.textAlign = "right";
    ctx.fillText(`${db}`, padL - 12, y(db));
  }

  if (rt60 <= maxT) {
    ctx.save();
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(x(rt60), padT);
    ctx.lineTo(x(rt60), canvas.height - padB);
    ctx.strokeStyle = CARD_COLORS.marker;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = CARD_COLORS.marker;
    ctx.textAlign = "left";
    ctx.fillText("RT60", x(rt60) + 10, padT + 14);
  }

  ctx.beginPath();
  points.forEach((p, i) => {
    const px = x(p.t);
    const py = y(p.db);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  });
  ctx.strokeStyle = CARD_COLORS.foreground;
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.stroke();

  ctx.fillStyle = CARD_COLORS.faint;
  ctx.textAlign = "left";
  ctx.fillText("0s", padL, canvas.height - padB + 26);
  ctx.textAlign = "right";
  ctx.fillText(`${maxT.toFixed(1)}s`, canvas.width - padR, canvas.height - padB + 26);
  ctx.textAlign = "left";
  ctx.fillText("dB", 16, padT);

  return canvas;
}
