import { describe, it, expect } from 'vitest';
import { PhaseStatus, TaskPriority, TaskStatus } from '../types';

describe('PhaseStatus enum', () => {
  it('has all expected values', () => {
    expect(PhaseStatus.NOT_STARTED).toBe('not_started');
    expect(PhaseStatus.IN_PROGRESS).toBe('in_progress');
    expect(PhaseStatus.COMPLETED).toBe('completed');
    expect(PhaseStatus.KILLED).toBe('killed');
  });
});

describe('TaskPriority enum', () => {
  it('has all expected values', () => {
    expect(TaskPriority.CRITICAL).toBe('critical');
    expect(TaskPriority.HIGH).toBe('high');
    expect(TaskPriority.MEDIUM).toBe('medium');
    expect(TaskPriority.LOW).toBe('low');
  });
});

describe('TaskStatus enum', () => {
  it('has all expected values', () => {
    expect(TaskStatus.TODO).toBe('todo');
    expect(TaskStatus.IN_PROGRESS).toBe('in_progress');
    expect(TaskStatus.DONE).toBe('done');
    expect(TaskStatus.BLOCKED).toBe('blocked');
  });
});
