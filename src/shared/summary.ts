/**
 * Summary data contract. This shape is the boundary between the mock
 * processing pipeline and a future real one (background round-trip). Mock
 * data lives here so swapping in real data is a single-point change.
 */

export interface Chapter {
  /** Display timestamp, e.g. "00:00". */
  timestamp: string;
  /** Chapter title. */
  title: string;
  /** Bullet points. */
  points: string[];
}

export interface SummaryData {
  /** Source kind badge, e.g. "YOUTUBE" renders as [YOUTUBE]. */
  sourceType: string;
  /** Source duration, e.g. "42:15" renders as DURATION: 42:15. */
  duration: string;
  /** Source title. */
  title: string;
  /** TL;DR paragraph. */
  tldr: string;
  /** Structured outline / timeline. */
  chapters: Chapter[];
}

/**
 * Mock summary transcribed from
 * .output/stitch_gistmark_prd/sidebar_summary_light_refined_buttons/code.html
 */
export const MOCK_SUMMARY: SummaryData = {
  sourceType: 'YOUTUBE',
  duration: '42:15',
  title: 'Designing for AI: The Next Frontier',
  tldr: "The integration of AI into design workflows is fundamentally shifting the designer's role from pixel-pusher to system-orchestrator. True value now lies in defining clear constraints, understanding edge cases, and guiding model outputs rather than manual execution. Future interfaces will be dynamic and context-aware, demanding a new paradigm of spatial and logical reasoning.",
  chapters: [
    {
      timestamp: '00:00',
      title: 'Introduction to AI Paradigms',
      points: [
        'Evolution of tools: from deterministic software to probabilistic models.',
        "The definition of 'design' is expanding to include prompt engineering and context framing.",
      ],
    },
    {
      timestamp: '12:04',
      title: 'Shifting from Pixels to Systems',
      points: [
        'Designers must now think in terms of logic flows and conditional states.',
        'Emphasis shifts to curating datasets and defining guardrails for generative UI.',
        'Case study: How dynamic interfaces adapt to user context in real-time.',
      ],
    },
    {
      timestamp: '28:45',
      title: 'Ethics and Control',
      points: [
        'Maintaining human agency in automated workflows.',
        'The importance of transparent AI interactions and clear fallback mechanisms.',
      ],
    },
    {
      timestamp: '39:10',
      title: 'Conclusion',
      points: [
        'Adaptability is the most critical skill for the next generation of designers.',
      ],
    },
  ],
};
