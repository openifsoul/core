import type {
  CharacterInstance,
  ConversationDelivery,
  ConversationResponse,
  MemoryEvent,
  PlanDecision,
  PlanProposal,
  TaskReport,
} from "../../../packages/protocol/src/index.js";
import type { MemoryPort, Result } from "../../../packages/memory/src/port.js";
import type { AgentController } from "../../../packages/runtime/src/index.js";
import type { ProviderSelection } from "../../../packages/model-providers/src/types.js";
export type {
  ProviderId,
  ProviderSelection,
} from "../../../packages/model-providers/src/types.js";

export interface LabRunRequest extends ProviderSelection {
  operation: "plan" | "chat";
  requestId: string;
  message?: string;
}
export interface LabStage {
  stage: string;
  operation?: string;
  requestId?: string;
  status?: string;
  memoryIds?: string[];
}
export type LabOperationResult =
  | {
      type: "plan";
      proposal: PlanProposal;
      decision: PlanDecision;
      reports: TaskReport[];
    }
  | {
      type: "chat";
      response: ConversationResponse;
      delivery: ConversationDelivery;
    }
  | { type: "failure"; error: { code: string; message: string } };
export interface LabRun {
  requestId: string;
  operation: "plan" | "chat";
  provider: ProviderSelection["provider"];
  model: string;
  message?: string;
  startedAt: string;
  completedAt: string;
  status: "completed" | "failed";
  stages: LabStage[];
  selectedMemoryIds: string[];
  result: LabOperationResult;
}
export interface LabSnapshot {
  character: CharacterInstance;
  memories: MemoryEvent[];
  runs: LabRun[];
}
export interface LabRunResponse extends LabSnapshot {
  run: LabRun;
  stages: LabStage[];
  result: LabOperationResult;
}
export interface LabServiceOptions {
  memory: MemoryPort;
  controllerFor: (selection: ProviderSelection) => AgentController;
  now?: () => Date;
}
export interface LabService {
  snapshot(): Result<LabSnapshot>;
  run(request: LabRunRequest): Promise<Result<LabRunResponse>>;
}
