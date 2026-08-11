/**
 * Share card composition.
 *
 * One composer, one layout, one set of brand colours. Experiments supply what
 * to show (a hero image and three lines of text); they never draw themselves.
 * Same split as `lib/ai/prompts/`: generic machinery here, per-experiment
 * content next to the experiment.
 *
 * The card is always built on the visitor's own device from their own result.
 * Nothing is uploaded, which also means there is no link preview — the file is
 * something the visitor attaches themselves. Hosting an image would mean
 * storing user content, which this project does not do.
 */

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;

/** Literal values, not CSS custom properties: a canvas cannot resolve
 *  `var(--foreground)`, and an SVG serialized for rasterisation loses the
 *  document that defined it. Mirrors the light theme in `globals.css`. */
export const CARD_COLORS = {
  background: "#f5f4ef",
  surface: "#fdfcf9",
  foreground: "#171610",
  muted: "#5b594f",
  faint: "#85826f",
  line: "#d8d5c8",
  accent: "#bc3f00",
  marker: "#e84c0f",
  white: "#ffffff",
} as const;

export type CardSpec = {
  /** "#001 Ask Your Room" */
  experiment: string;
  /** The one-line result, largest text on the card. */
  headline: string;
  /** Optional supporting line under the headline. */
  detail?: string;
  /** Already-rendered visual: a frame, a 3D view, a chart. */
  hero: CanvasImageSource | null;
  /** Natural size of the hero, needed to letterbox it without distortion. */
  heroSize?: { width: number; height: number };
  /** Normalised (0..1) marker position drawn over the hero, if any. */
  marker?: { x: number; y: number };
};

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.beginPath();
  ctx.rect(x, y, w, h);
}

/** Draw the hero into `box`, preserving aspect ratio and cropping overflow. */
function drawHero(
  ctx: CanvasRenderingContext2D,
  spec: CardSpec,
  box: { x: number; y: number; w: number; h: number },
): void {
  ctx.save();
  roundedRect(ctx, box.x, box.y, box.w, box.h);
  ctx.clip();

  ctx.fillStyle = CARD_COLORS.surface;
  ctx.fillRect(box.x, box.y, box.w, box.h);

  const natural = spec.heroSize;
  if (spec.hero && natural && natural.width > 0 && natural.height > 0) {
    const scale = Math.max(box.w / natural.width, box.h / natural.height);
    const w = natural.width * scale;
    const h = natural.height * scale;
    const x = box.x + (box.w - w) / 2;
    const y = box.y + (box.h - h) / 2;
    ctx.drawImage(spec.hero, x, y, w, h);

    if (spec.marker) {
      const mx = x + spec.marker.x * w;
      const my = y + spec.marker.y * h;
      ctx.beginPath();
      ctx.arc(mx, my, 14, 0, Math.PI * 2);
      ctx.fillStyle = CARD_COLORS.marker;
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = CARD_COLORS.white;
      ctx.stroke();
    }
  }
  ctx.restore();

  ctx.strokeStyle = CARD_COLORS.line;
  ctx.lineWidth = 2;
  ctx.strokeRect(box.x + 1, box.y + 1, box.w - 2, box.h - 2);
}

/** Break `text` into at most `maxLines` lines that fit `maxWidth`. */
function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
      continue;
    }
    lines.push(line);
    line = word;
    if (lines.length === maxLines) break;
  }
  if (lines.length < maxLines && line) lines.push(line);

  if (lines.length === maxLines) {
    // Ellipsize the last line rather than silently dropping words.
    let last = lines[maxLines - 1];
    if (words.join(" ") !== lines.join(" ")) {
      while (last && ctx.measureText(`${last}…`).width > maxWidth) {
        last = last.slice(0, -1).trimEnd();
      }
      lines[maxLines - 1] = `${last}…`;
    }
  }
  return lines;
}

const SANS = '600 44px system-ui, -apple-system, "Segoe UI", sans-serif';
const SANS_SMALL = '400 26px system-ui, -apple-system, "Segoe UI", sans-serif';
const MONO = '500 20px ui-monospace, SFMono-Regular, Menlo, monospace';

/**
 * Compose the card and return it as a PNG blob.
 *
 * Resolves to `null` when the canvas is unavailable or the browser refuses to
 * export it — the caller then hides the share affordance rather than offering
 * a button that fails.
 */
export async function composeShareCard(spec: CardSpec): Promise<Blob | null> {
  if (typeof document === "undefined") return null;

  const canvas = document.createElement("canvas");
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = CARD_COLORS.background;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  const pad = 56;
  const heroW = 560;
  drawHero(ctx, spec, { x: pad, y: pad, w: heroW, h: CARD_HEIGHT - pad * 2 });

  const textX = pad + heroW + 48;
  const textW = CARD_WIDTH - textX - pad;

  ctx.fillStyle = CARD_COLORS.accent;
  ctx.font = MONO;
  ctx.textBaseline = "top";
  ctx.fillText(spec.experiment.toUpperCase(), textX, pad + 4);

  ctx.fillStyle = CARD_COLORS.foreground;
  ctx.font = SANS;
  let y = pad + 52;
  for (const line of wrap(ctx, spec.headline, textW, 5)) {
    ctx.fillText(line, textX, y);
    y += 56;
  }

  if (spec.detail) {
    ctx.fillStyle = CARD_COLORS.muted;
    ctx.font = SANS_SMALL;
    y += 12;
    for (const line of wrap(ctx, spec.detail, textW, 3)) {
      ctx.fillText(line, textX, y);
      y += 34;
    }
  }

  ctx.fillStyle = CARD_COLORS.faint;
  ctx.font = MONO;
  ctx.fillText("spatiallab.atthis.ai", textX, CARD_HEIGHT - pad - 46);
  ctx.fillText("Estimates, not measurements", textX, CARD_HEIGHT - pad - 20);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

/**
 * Hand the card to the visitor: the native share sheet when it takes files,
 * a download otherwise. Returns false when neither path is available.
 */
export async function shareCard(blob: Blob, filename: string): Promise<boolean> {
  const file = new File([blob], filename, { type: "image/png" });

  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
  };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return true;
    } catch (err) {
      // A cancelled share sheet is a normal outcome, not a failure to report.
      if (err instanceof DOMException && err.name === "AbortError") return true;
    }
  }

  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    // Revoking in the same tick can cancel the download before it starts
    // (observed behaviour in Safari). Let the click be handled first.
    setTimeout(() => {
      a.remove();
      URL.revokeObjectURL(url);
    }, 10_000);
    return true;
  } catch {
    return false;
  }
}

/** Load a data/blob URL into an image element for use as a card hero. */
export function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
