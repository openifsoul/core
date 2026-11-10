import type {
  CharacterInstance,
  ContextReport,
  ConversationRequest,
  ConversationResponse,
  EnvironmentProfile,
  MemoryEvent,
  PlanProposal,
  Scope,
} from "../../protocol/src/index.js";
import type { MemoryPort, Result } from "../../memory/src/port.js";

/** Assertions established by a trusted local composition root, never inferred from imported IDs. */
export interface TrustedAccess {
  hostId: string;
  characterParticipantId: string;
  verifiedParticipantIds: string[];
  authorizedChannelIds: string[];
  recallEnvironmentIds: string[];
  memoryScope: Scope;
  visibleEntityIds: string[];
  allowPresenceTrigger?: boolean;
}
export interface TrustedSession {
  character: CharacterInstance;
  profile: EnvironmentProfile;
  context: ContextReport;
  access: TrustedAccess;
}
export interface ControllerInput {
  behavior?: Pick<
    import("./behavior-types.js").BehaviorInspection,
    "configRevision" | "effective" | "parameters" | "values"
  >;
  portrayal?: { characterId: string; name: string; memoryOwnerName: string };
  operation: "plan" | "conversation";
  character: CharacterInstance;
  profile: EnvironmentProfile;
  context: ContextReport;
  request: NonNullable<ContextReport["planningRequest"]> | ConversationRequest;
  memories: MemoryEvent[];
}
export type AgentController = (
  input: ControllerInput,
  signal: AbortSignal,
) => Promise<unknown>;
export interface RuntimeLimits {
  controllerTimeoutMs: number;
  maxCalls: number;
  maxDocumentBytes: number;
  maxMemoryRecords: number;
  maxMemoryBytes: number;
  maxContextAgeMs: number;
}
export interface RuntimeOptions {
  memory: MemoryPort;
  controller: AgentController;
  now?: () => Date;
  limits?: Partial<RuntimeLimits>;
  /** Explicit trusted ceilings; omitted fields retain legacy implementation policy. */
  ceilings?: Partial<RuntimeLimits>;
  onBudget?: (
    report: import("../../protocol/src/resource-policy.js").BudgetReport<RuntimeLimits>,
  ) => void;
  trace?: (entry: {
    stage: string;
    operation?: string;
    requestId?: string;
    status?: string;
    memoryIds?: string[];
  }) => void;
}
export interface Runtime {
  setSession(input: unknown): Result<void>;
  plan(): Promise<Result<PlanProposal>>;
  conversation(request: unknown): Promise<Result<ConversationResponse>>;
  recordDecision(document: unknown): Result<void>;
  recordReport(document: unknown): Result<void>;
  recordDelivery(document: unknown): Result<void>;
  history(options?: {
    audienceParticipantIds?: string[];
    limit?: number;
    maxBytes?: number;
  }): Result<MemoryEvent[]>;
}
