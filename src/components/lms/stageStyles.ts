import type { LmsStage } from '../../lib/lmsApi';

/**
 * The colour that marks each stage (the rule in a row's left margin, the
 * dot on the timeline). Literal class names so Tailwind keeps them.
 */
export const STAGE_RULE: Record<LmsStage, string> = {
  NEW: 'bg-lms-stage-new',
  TRYING: 'bg-lms-stage-trying',
  IN_TALKS: 'bg-lms-stage-talks',
  WON: 'bg-lms-stage-won',
  LOST: 'bg-lms-stage-lost',
};
