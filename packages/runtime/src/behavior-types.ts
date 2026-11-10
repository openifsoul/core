export type BehaviorPermission =
  "observe" | "remember" | "updateRelationship" | "speak" | "requestAction";
export type BehaviorPermissions = Record<BehaviorPermission, boolean>;
export type BehaviorEventKind = "provocation" | "helpful" | "observation";
export interface BehaviorPolicy {
  general: BehaviorPermissions;
  provocation: BehaviorPermissions;
}
export interface BehaviorGoal {
  goalId: string;
  objective: string;
  priority: number;
  enabled: boolean;
}
export interface ParameterDefinition {
  parameterId: string;
  label: string;
  kind: "trait" | "state" | "relationship";
  scope: "portable" | "world";
  initial: number;
  min: number;
  max: number;
  maxDelta: number;
  decay?: { perHour: number; toward: number };
}
export interface BehaviorSettings {
  policy: BehaviorPolicy;
  goals: BehaviorGoal[];
}
export interface BehaviorOverride {
  scope: { kind: "npc" | "group" | "world"; id: string };
  policy?: {
    general?: Partial<BehaviorPermissions>;
    provocation?: Partial<BehaviorPermissions>;
  };
  goals?: BehaviorGoal[];
  initialValues?: Record<string, number>;
}
export interface BehaviorConfiguration {
  version: "ifsoul-behavior/0.4.0";
  revision: number;
  parameters: ParameterDefinition[];
  defaults: BehaviorSettings;
  overrides: BehaviorOverride[];
}
/** Injected by trusted server composition; never accepted in configuration bodies. */
export interface BehaviorOperatorPolicy {
  canEditConfig: boolean;
  lockedParameterIds: string[];
  deniedPermissions: BehaviorPermission[];
  lockedPolicy: boolean;
  lockedGoals: boolean;
}
export interface BehaviorParameterValue {
  npcId: string;
  parameterId: string;
  targetParticipantId?: string;
  worldId?: string;
  value: number;
  confidence: number;
  revision: number;
  updatedAt: number;
}
export interface BehaviorChange {
  changeId: string;
  npcId: string;
  parameterId: string;
  targetParticipantId?: string;
  worldId?: string;
  before: number;
  after: number;
  confidence: number;
  revision: number;
  configRevision: number;
  evidenceEventIds: string[];
  reason: string;
  kind: "evidence" | "decay";
  recordedAt: number;
}
export interface BehaviorProposal {
  proposalId: string;
  npcId: string;
  sessionId: string;
  configRevision: number;
  expectedStateRevision: number;
  changes: {
    parameterId: string;
    targetParticipantId?: string;
    delta: number;
    confidence: number;
    evidenceEventIds: string[];
    reason: string;
  }[];
}
export interface BehaviorObservation {
  eventId: string;
  npcId: string;
  kind: BehaviorEventKind;
  configRevision: number;
  permissions: BehaviorPermissions;
}
export interface BehaviorState {
  format: "ifsoul-behavior/0.4.0";
  config: BehaviorConfiguration;
  observations: BehaviorObservation[];
  values: BehaviorParameterValue[];
  history: BehaviorChange[];
  proposals: { proposal: BehaviorProposal; revision: number }[];
  stateRevisions: Record<string, number>;
}
export interface BehaviorInspection {
  npcId: string;
  sessionId: string;
  configRevision: number;
  stateRevision: number;
  effective: BehaviorSettings & { initialValues: Record<string, number> };
  parameters: ParameterDefinition[];
  values: BehaviorParameterValue[];
  history: BehaviorChange[];
}
export interface BehaviorEditorSnapshot {
  config: BehaviorConfiguration;
  operator: BehaviorOperatorPolicy;
  catalog: {
    npcs: { npcId: string; label: string }[];
    sessions: { sessionId: string; worldId: string; npcIds: string[] }[];
    groups: { groupId: string; npcIds: string[] }[];
    worlds: string[];
  };
}
