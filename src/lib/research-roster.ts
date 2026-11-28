/** Operating paper lanes, not technical scoring factors or legacy assignment labels. */
export const RESEARCH_ROSTER = [
  { lane: 'lead', name: 'Lead Researcher' },
  { lane: 'trend', name: 'Trend Researcher' },
  { lane: 'contrarian', name: 'Contrarian Researcher' },
  { lane: 'consistency', name: 'Consistency Researcher' },
  { lane: 'growth', name: 'Growth Researcher' },
  { lane: 'risk', name: 'Risk Researcher' },
  { lane: 'skeptic', name: 'Skeptic Researcher' },
] as const;
export const RESEARCHERS = ['Lead Researcher', 'Trend Researcher', 'Contrarian Researcher', 'Consistency Researcher', 'Growth Researcher', 'Risk Researcher', 'Skeptic Researcher'] as const;