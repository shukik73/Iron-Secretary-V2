export enum PhaseStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  KILLED = 'killed'
}

export enum TaskPriority {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

export enum TaskStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  BLOCKED = 'blocked'
}

export interface PlanPhase {
  id: string;
  phaseNumber: number;
  name: string;
  status: PhaseStatus;
  progress: number; // 0-100
  targetEndDate: string;
}

export interface PlanTask {
  id: string;
  title: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
}

export interface RevenueTarget {
  repair: number;
  refurb: number;
  rg: number;
  midas: number;
  total: number;
}

export interface MidasDeal {
  id: string;
  device: string;
  price: number;
  yield: number;
  margin: number;
  platform: 'eBay' | 'FB' | 'OfferUp';
  isHot: boolean;
}

export interface Lead {
  id: string;
  name: string;
  device: string;
  status: 'New' | 'In Repair' | 'Ready' | 'Picked Up';
  timeInStage: string; // e.g., "2h", "2d"
}