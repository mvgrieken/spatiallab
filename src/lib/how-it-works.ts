/**
 * "How this works" content, one entry per experiment.
 *
 * Written for a reader who wants to know whether to believe the output: what
 * the pipeline actually does, and where it breaks. Every entry must name at
 * least one real limitation — a page that only explains the happy path is
 * marketing, not an explanation.
 *
 * Source material lives in `docs/releases/`, in Dutch; these are the English
 * public versions, not translations of the release notes.
 */

export type HowStep = { title: string; body: string };

export type HowItWorks = {
  /** Matches an experiment slug in the registry. */
  slug: string;
  /** One sentence: what the machine is actually doing. */
  premise: string;
  usesAi: boolean;
  steps: HowStep[];
  /** Honest limits. Never empty. */
  limits: string[];
  /** Repo-relative paths a curious reader can open. */
  code: { label: string; path: string }[];
};

export const HOW_IT_WORKS: HowItWorks[] = [
  {
    slug: "ask-your-room",
    premise:
      "Six still frames from your camera go to a vision model, which must point at what it claims to see.",
    usesAi: true,
    steps: [
      {
        title: "Your browser picks the frames",
        body: "During the ten-second sweep the page grabs nine candidate stills, scores them on brightness, and keeps the six most usable. They are scaled to 1280 px and JPEG-compressed on your device. The video itself is never recorded — there is no MediaRecorder anywhere in this site.",
      },
      {
        title: "Only those six frames are sent",
        body: "The six images and your question go to Claude on our server, which holds the API key. Roughly 200 KB per frame. Nothing is written to a database on the way there or back.",
      },
      {
        title: "The model must anchor every claim",
        body: "The prompt forces a structured answer: each observation carries a frame number, a marker position, the visible evidence it is based on, and a confidence level. An answer that cannot point at a frame cannot be returned.",
      },
      {
        title: "The answer is validated before you see it",
        body: "Every response is checked against a schema. Coordinates outside the image, frame numbers that do not exist, empty fields — all get one controlled repair attempt, and are rejected if they still do not fit. You see an error rather than a malformed answer.",
      },
    ],
    limits: [
      "It estimates from flat images. There is no LiDAR and no depth sensor, so distances and sizes are impressions, not measurements.",
      "It only knows the six frames it was given. Anything you did not film does not exist as far as it is concerned.",
      "Confidence is the model's own assessment. It can be confidently wrong, which is exactly why every claim is tied to a frame you can check yourself.",
      "Poor light produces poor answers. A dark room gets a low-confidence result or an honest refusal.",
    ],
    code: [
      { label: "Frame selection", path: "src/lib/camera/frames.ts" },
      { label: "The one AI entry point", path: "src/lib/ai/client.ts" },
      { label: "Prompt", path: "src/lib/ai/prompts/ask-your-room.ts" },
      { label: "Output validation and repair", path: "src/lib/validation/schemas.ts" },
    ],
  },
  {
    slug: "find-the-best-spot",
    premise:
      "The same six frames, but the model has to rank places against a goal and admit what each one costs you.",
    usesAi: true,
    steps: [
      {
        title: "You choose the goal first",
        body: "Desk, TV, reading chair, plant — the goal is picked before the scan, because 'the best spot' means nothing on its own. The same room gives different answers for different goals.",
      },
      {
        title: "One scan, several goals",
        body: "The frames stay in your browser after the analysis, so trying a second goal costs another model call but no second sweep. Nothing is re-uploaded.",
      },
      {
        title: "Ranked, with the trade-off attached",
        body: "The model returns a best spot and at least one alternative, each anchored to a frame, each with the drawback stated. It is also asked for one place to avoid — a suggestion with no downsides is usually a suggestion that has not been thought through.",
      },
      {
        title: "Broken rankings are repaired or rejected",
        body: "Empty suggestions are dropped and the ranks renumbered before you see anything. Those were real failure modes found during development, not hypothetical ones.",
      },
    ],
    limits: [
      "It cannot see power sockets, radiators behind furniture, or which way a door swings unless they are visible in a frame.",
      "It reasons about daylight from what a single sweep shows. It does not know your orientation, the season, or the time of day.",
      "It is a suggestion about furniture, never advice about wiring, mounting or anything structural.",
      "Ranking is a judgement, not a calculation. Two runs on the same room can disagree at the margins.",
    ],
    code: [
      { label: "Prompt", path: "src/lib/ai/prompts/find-the-best-spot.ts" },
      { label: "Server task", path: "src/lib/ai/spots.ts" },
      { label: "Validation and repair", path: "src/lib/validation/spot-schemas.ts" },
    ],
  },
  {
    slug: "does-it-fit",
    premise:
      "No AI at all: dimensions you type become a 3D object at exactly that size, placed by Apple's own AR viewer.",
    usesAi: false,
    steps: [
      {
        title: "The shape is generated from your numbers",
        body: "Each furniture type is built from plain cuboids at the width, depth and height you enter. There is no model file being scaled — the geometry is created at your dimensions.",
      },
      {
        title: "Exported to USDZ in your browser",
        body: "three.js writes a USDZ file on your device, with metres as the unit so AR Quick Look places it at true scale. No server is involved at any point.",
      },
      {
        title: "Apple's viewer does the placing",
        body: "Safari hands the file to AR Quick Look, Apple's built-in AR viewer. SpatialLab never touches your camera in this experiment and never asks for permission to.",
      },
      {
        title: "The size claim is tested, not assumed",
        body: "A unit test asserts that the generated bounding box equals the dimensions entered, that the object sits on the floor, and that it is centred. That is the one promise this experiment makes.",
      },
    ],
    limits: [
      "It shows size, not looks. The shape is a deliberate stand-in — a blocky approximation, not a product.",
      "Accuracy of the placement in your room is Apple's AR tracking, not ours. Surfaces, light and movement all affect it.",
      "AR needs Safari on iPhone or iPad. Elsewhere you get the 3D preview and the file.",
      "It cannot tell you whether the thing fits through your doorway or up your stairs.",
    ],
    code: [
      { label: "Parametric furniture", path: "src/lib/fit/objects.ts" },
      { label: "Dimension invariants (tests)", path: "src/lib/fit/objects.test.ts" },
      { label: "Viewer and USDZ export", path: "src/components/experiments/does-it-fit/DoesItFit.tsx" },
    ],
  },
  {
    slug: "solar-roof",
    premise:
      "No AI either: your address is resolved against Dutch open data, and the roof geometry does the rest.",
    usesAi: false,
    steps: [
      {
        title: "Address to building",
        body: "The address goes to the PDOK Locatieserver and the BAG registry. It travels in the request body, not the URL, so it does not end up in server logs, and it is never stored.",
      },
      {
        title: "Building to roof planes",
        body: "The 3D BAG dataset provides an LoD 2.2 model built from aerial LiDAR. Each roof surface is turned into a plane, with its normal computed from the polygon to get orientation and slope.",
      },
      {
        title: "Planes to an indicative score",
        body: "Orientation and tilt are combined into a relative yield score where due south is roughly 100. Flat sections are scored as if panels were racked.",
      },
      {
        title: "Nonsense addresses are refused",
        body: "The address service does fuzzy matching and will happily return its best guess for gibberish. A minimum relevance threshold blocks that — an early version confidently rendered the wrong building, which is the failure this experiment most needed to avoid.",
      },
    ],
    limits: [
      "It is a relative score, not a yield in kilowatt-hours. There is no shading analysis, no local weather, no panel model, no roof condition.",
      "It reflects aerial data of unknown vintage. A recent extension, a new dormer or a new building may be missing or wrong.",
      "It is not a quote, an installation plan, or advice about whether your roof can carry panels.",
      "Netherlands only, because the open data it stands on is Dutch.",
    ],
    code: [
      { label: "Open data pipeline", path: "src/lib/roof/pdok.ts" },
      { label: "Roof geometry", path: "src/lib/roof/geometry.ts" },
      { label: "Indicative solar score", path: "src/lib/roof/solar.ts" },
    ],
  },
  {
    slug: "room-acoustics",
    premise:
      "One clap, measured and analysed entirely on your device, using a standard reverberation method.",
    usesAi: false,
    steps: [
      {
        title: "The microphone is asked to stop helping",
        body: "Echo cancellation, automatic gain control and noise suppression are all switched off. Those features exist to make speech clearer, and they destroy exactly the decay being measured.",
      },
      {
        title: "The clap is located in the recording",
        body: "The analysis finds the onset — the sharp energy rise — and works from there. Everything before it is discarded.",
      },
      {
        title: "Schroeder backward integration",
        body: "The decay curve is computed by integrating the energy backwards from the end of the recording, the standard method for reverberation time. It turns a noisy tail into a smooth curve.",
      },
      {
        title: "T20, extrapolated",
        body: "A straight line is fitted between −5 dB and −25 dB and multiplied by three to reach RT60. Measuring a full 60 dB drop needs a much louder source than a clap, so the standard approach measures 20 dB and extrapolates.",
      },
      {
        title: "It refuses rather than invents",
        body: "No clap found, too quiet, too much background noise, recording too short — each gets its own message instead of a number. Validated against synthesised decays with known reverberation times, which are recovered within 20%.",
      },
    ],
    limits: [
      "One clap, one position, one number. A real acoustic measurement uses multiple source and receiver positions.",
      "It is broadband. It cannot tell you that your room is boomy at low frequencies, which is usually the actual complaint.",
      "Phone microphones vary, and some apply processing regardless of what the page asks for. Treat the number as an indication.",
      "It says nothing about sound insulation between rooms — a different problem entirely.",
    ],
    code: [
      { label: "Reverberation maths", path: "src/lib/acoustics/rt60.ts" },
      { label: "Validation against known decays (tests)", path: "src/lib/acoustics/rt60.test.ts" },
      { label: "Recording with processing disabled", path: "src/lib/acoustics/record.ts" },
    ],
  },
];

export function howItWorksFor(slug: string): HowItWorks | undefined {
  return HOW_IT_WORKS.find((h) => h.slug === slug);
}
