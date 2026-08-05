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
};

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
    slug: "tba-002",
    title: "To be announced",
    subtitle: "",
    description: "",
    published: false,
  },
  {
    id: "003",
    slug: "tba-003",
    title: "To be announced",
    subtitle: "",
    description: "",
    published: false,
  },
];

export const publishedExperiments = experiments.filter((e) => e.published);
export const upcomingExperiments = experiments.filter((e) => !e.published);

export function getExperiment(slug: string): Experiment | undefined {
  return experiments.find((e) => e.slug === slug);
}
