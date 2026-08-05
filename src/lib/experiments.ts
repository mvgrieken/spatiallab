/**
 * The experiment registry — plain TypeScript, no CMS, no database.
 * The homepage renders published experiments (and teases unpublished ones by
 * number only); each experiment page pulls its own metadata from here.
 */

export type Experiment = {
  /** Zero-padded number, e.g. "001". */
  id: string;
  /** Route segment under /experiments/. */
  slug: string;
  title: string;
  /** One-line promise shown on cards and under the page title. */
  subtitle: string;
  /** Short description for metadata and the experiment intro. */
  description: string;
  published: boolean;
  /**
   * Footer disclaimer for this experiment. Defaults to the AI wording;
   * experiments without AI must not claim to have any (#003, #004).
   */
  disclaimer?: string;
};

export const DEFAULT_DISCLAIMER =
  "Experimental AI output. Estimates are not measurements or professional advice.";

const NO_AI_DISCLAIMER =
  "Experimental output. Estimates are not measurements or professional advice.";

export const experiments: Experiment[] = [
  {
    id: "001",
    slug: "ask-your-room",
    title: "Ask Your Room",
    subtitle: "Film your room. Ask it a question.",
    description:
      "Point your camera around a room for ten seconds; the AI tells you what it sees and answers questions about it — every answer anchored to a real frame.",
    published: true,
  },
  {
    id: "002",
    slug: "find-the-best-spot",
    title: "Find the Best Spot",
    subtitle: "Pick a goal. Your room shows the spot.",
    description:
      "Scan your room once, choose a goal — desk, TV, plant — and the AI marks the best spot on a frame of your own room, with an alternative, honest trade-offs and one place to avoid.",
    published: true,
  },
  {
    id: "003",
    slug: "does-it-fit",
    title: "Does It Fit?",
    subtitle: "See it at real size. No app required.",
    description:
      "Pick a piece of furniture, set its real dimensions, and place it in your room at true size with AR Quick Look — straight from Safari. Everything runs on your device.",
    published: true,
    disclaimer: NO_AI_DISCLAIMER,
  },
  {
    id: "004",
    slug: "solar-roof",
    title: "Solar Roof",
    subtitle: "The government already LiDAR-scanned your roof.",
    description:
      "Type a Dutch address and see that roof in 3D from open aerial-LiDAR data — orientation, slope and an indicative solar score per roof plane. Open data, no measurements, no yield promises.",
    published: true,
    disclaimer: NO_AI_DISCLAIMER,
  },
  {
    id: "005",
    slug: "room-acoustics",
    title: "Room Acoustics",
    subtitle: "Clap once. Hear how your room answers.",
    description:
      "One clap is enough to estimate how long sound lingers in your room. Recorded and analysed entirely on your device — no upload, no AI.",
    published: true,
    disclaimer: NO_AI_DISCLAIMER,
  },
];

export const publishedExperiments = experiments.filter((e) => e.published);
export const upcomingExperiments = experiments.filter((e) => !e.published);

export function getExperiment(slug: string): Experiment | undefined {
  return experiments.find((e) => e.slug === slug);
}
