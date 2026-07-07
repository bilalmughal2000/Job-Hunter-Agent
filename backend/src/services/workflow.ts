import { ApplicationStatus, WorkflowStage } from '@ajh/shared';

/**
 * Ordered workflow stages (spec §Application Workflow). Advancement is linear,
 * which structurally enforces the approval gate: SUBMITTED can only be reached
 * after USER_APPROVED.
 */
export const WORKFLOW_ORDER: readonly WorkflowStage[] = [
  WorkflowStage.JOB_FOUND,
  WorkflowStage.RESUME_MATCHED,
  WorkflowStage.RESUME_CUSTOMIZED,
  WorkflowStage.COVER_LETTER_GENERATED,
  WorkflowStage.PACKAGE_PREPARED,
  WorkflowStage.READY_FOR_REVIEW,
  WorkflowStage.USER_APPROVED,
  WorkflowStage.SUBMITTED,
  WorkflowStage.TRACKING,
];

export function stageIndex(stage: WorkflowStage): number {
  return WORKFLOW_ORDER.indexOf(stage);
}

/** The stage after `current`, or null if already at the end. */
export function nextStage(current: WorkflowStage): WorkflowStage | null {
  return WORKFLOW_ORDER[stageIndex(current) + 1] ?? null;
}

export function isAtOrAfter(stage: WorkflowStage, target: WorkflowStage): boolean {
  return stageIndex(stage) >= stageIndex(target);
}

/**
 * Allowed application-status transitions. WITHDRAWN/REJECTED are reachable from
 * most active states; both are terminal.
 */
const STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  [ApplicationStatus.SAVED]: [ApplicationStatus.READY_FOR_REVIEW, ApplicationStatus.WITHDRAWN],
  [ApplicationStatus.READY_FOR_REVIEW]: [
    ApplicationStatus.SUBMITTED,
    ApplicationStatus.SAVED,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.SUBMITTED]: [
    ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.UNDER_REVIEW]: [
    ApplicationStatus.INTERVIEW_SCHEDULED,
    ApplicationStatus.TECHNICAL_TEST,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.INTERVIEW_SCHEDULED]: [
    ApplicationStatus.TECHNICAL_TEST,
    ApplicationStatus.FINAL_INTERVIEW,
    ApplicationStatus.OFFER_RECEIVED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.TECHNICAL_TEST]: [
    ApplicationStatus.INTERVIEW_SCHEDULED,
    ApplicationStatus.FINAL_INTERVIEW,
    ApplicationStatus.OFFER_RECEIVED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.FINAL_INTERVIEW]: [
    ApplicationStatus.OFFER_RECEIVED,
    ApplicationStatus.REJECTED,
    ApplicationStatus.WITHDRAWN,
  ],
  [ApplicationStatus.OFFER_RECEIVED]: [ApplicationStatus.WITHDRAWN],
  [ApplicationStatus.REJECTED]: [],
  [ApplicationStatus.WITHDRAWN]: [],
};

export function canTransitionStatus(from: ApplicationStatus, to: ApplicationStatus): boolean {
  if (from === to) return true;
  return STATUS_TRANSITIONS[from].includes(to);
}

export function allowedStatusTransitions(from: ApplicationStatus): ApplicationStatus[] {
  return STATUS_TRANSITIONS[from];
}
