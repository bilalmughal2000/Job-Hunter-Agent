import { describe, expect, it } from 'vitest';
import { ApplicationStatus, WorkflowStage } from '@ajh/shared';
import {
  WORKFLOW_ORDER,
  canTransitionStatus,
  isAtOrAfter,
  nextStage,
} from '../src/services/workflow.js';

describe('workflow stages', () => {
  it('advances linearly through every stage then ends', () => {
    let stage: WorkflowStage | null = WorkflowStage.JOB_FOUND;
    const visited: WorkflowStage[] = [];
    while (stage) {
      visited.push(stage);
      stage = nextStage(stage);
    }
    expect(visited).toEqual([...WORKFLOW_ORDER]);
    expect(nextStage(WorkflowStage.TRACKING)).toBeNull();
  });

  it('enforces the approval gate structurally (USER_APPROVED precedes SUBMITTED)', () => {
    expect(nextStage(WorkflowStage.USER_APPROVED)).toBe(WorkflowStage.SUBMITTED);
    expect(isAtOrAfter(WorkflowStage.READY_FOR_REVIEW, WorkflowStage.USER_APPROVED)).toBe(false);
    expect(isAtOrAfter(WorkflowStage.SUBMITTED, WorkflowStage.USER_APPROVED)).toBe(true);
  });
});

describe('status transitions', () => {
  it('allows valid forward transitions', () => {
    expect(canTransitionStatus(ApplicationStatus.SAVED, ApplicationStatus.READY_FOR_REVIEW)).toBe(
      true,
    );
    expect(canTransitionStatus(ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW)).toBe(
      true,
    );
    expect(
      canTransitionStatus(ApplicationStatus.INTERVIEW_SCHEDULED, ApplicationStatus.OFFER_RECEIVED),
    ).toBe(true);
  });

  it('rejects invalid jumps', () => {
    expect(canTransitionStatus(ApplicationStatus.SAVED, ApplicationStatus.OFFER_RECEIVED)).toBe(
      false,
    );
    expect(canTransitionStatus(ApplicationStatus.REJECTED, ApplicationStatus.SUBMITTED)).toBe(
      false,
    );
  });

  it('allows withdrawing from active states but not from terminal ones', () => {
    expect(canTransitionStatus(ApplicationStatus.SUBMITTED, ApplicationStatus.WITHDRAWN)).toBe(
      true,
    );
    expect(canTransitionStatus(ApplicationStatus.WITHDRAWN, ApplicationStatus.SUBMITTED)).toBe(
      false,
    );
  });

  it('treats same-status as a no-op transition', () => {
    expect(canTransitionStatus(ApplicationStatus.SAVED, ApplicationStatus.SAVED)).toBe(true);
  });
});
