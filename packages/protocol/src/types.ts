/** Convenience views for the implemented slice. JSON Schemas remain normative. */
export interface Envelope {
  schemaVersion: "0.4.0";
  kind: string;
  extensions?: Record<string, unknown>;
  requiredExtensions?: string[];
}
export interface Binding {
  environmentId: string;
  sessionId: string;
  characterId: string;
  embodimentId: string;
}
export type Period =
  | { basis: "utc"; startAt: string; endAt: string }
  | {
      basis: "world-ticks";
      timelineId: string;
      fromTick: number;
      toTick: number;
    };
export type Modality =
  "speech" | "text" | "vocalization" | "gesture" | "status";
export interface Scope {
  audience: "private" | "participants" | "public";
  participantIds: string[];
  export: "allowed" | "consent-required" | "forbidden";
}
export interface CharacterInstance extends Envelope {
  template?: { templateId: string; revision: number };
  kind: "character-instance";
  characterId: string;
  participantId: string;
  createdAt: string;
  profile: {
    name: string;
    description: string;
    traits: Record<string, string | number | boolean>;
    preferences: unknown[];
    speechStyle: { description: string; languages: string[]; habits: string[] };
    goals: unknown[];
    authoredBiography: { text: string; fictional: true };
  };
  memoryRecordIds: string[];
  relationshipMemoryIds: string[];
}
export interface Parameter {
  name: string;
  type: "entity-ref" | "choice" | "quantity" | "boolean";
  required: boolean;
  choices?: string[];
  unit?: string;
  minimum?: number;
  maximum?: number;
}
export interface EnvironmentProfile extends Envelope {
  kind: "environment-profile";
  binding: Binding;
  hostId: string;
  revision: string;
  medium: "game" | "chat";
  embodiment: { form: string; description: string; modalities: Modality[] };
  participantLinks: {
    claimId: string;
    participantId: string;
    environmentSubjectId: string;
    issuerId: string;
  }[];
  planning: {
    cadence: "host-requested" | "daily" | "event-driven";
    maxTasks: number;
  };
  communication: {
    mode: "host-requested" | "live-channel";
    availability: "on-demand" | "persistent";
    allowUnrequestedMessages: boolean;
    channelIds: string[];
  };
  hostIntents: {
    intentId: string;
    description: string;
    parameters: Parameter[];
    cancellable: boolean;
  }[];
  worldTime?: { timelineId: string; tick: number };
}
export interface ContextReport extends Envelope {
  kind: "context-report";
  binding: Binding;
  reportId: string;
  contextRevision: string;
  environmentRevision: string;
  correlationId: string;
  recordedAt: string;
  period: Period;
  observedState: {
    summary: string;
    properties: {
      subjectId: string;
      propertyId: string;
      value: string | number | boolean;
    }[];
  };
  priorNeeds: unknown[];
  priorPlans: unknown[];
  changes: unknown[];
  planningRequest?: {
    requestId: string;
    cadence: "host-requested" | "daily" | "event-driven";
    horizon: Period;
    maxTasks: number;
    allowedIntentIds: string[];
  };
}
export type Argument =
  | { type: "entity-ref"; entityId: string }
  | { type: "choice"; value: string }
  | { type: "quantity"; value: number; unit: string }
  | { type: "boolean"; value: boolean };
export interface PlanTask {
  taskId: string;
  intentId: string;
  arguments: Record<string, Argument>;
  priority: "low" | "normal" | "high";
  dependsOnTaskIds: string[];
  explanation?: string;
}
export interface PlanProposal extends Envelope {
  kind: "plan-proposal";
  binding: Binding;
  correlationId: string;
  planId: string;
  requestId: string;
  contextReportId: string;
  contextRevision: string;
  environmentRevision: string;
  createdAt: string;
  expiresAt: string;
  horizon: Period;
  tasks: PlanTask[];
}
export interface PlanDecision extends Envelope {
  kind: "plan-decision";
  binding: Binding;
  correlationId: string;
  planId: string;
  decisionId: string;
  requestId: string;
  contextRevision: string;
  recordedAt: string;
  status: "accepted" | "partially-accepted" | "rejected";
  taskDecisions: {
    taskId: string;
    decision: "accepted" | "rejected";
    reason?: string;
  }[];
}
export interface TaskReport extends Envelope {
  kind: "task-report";
  binding: Binding;
  correlationId: string;
  planId: string;
  reportId: string;
  taskId: string;
  contextRevision: string;
  recordedAt: string;
  status:
    "pending" | "running" | "succeeded" | "failed" | "cancelled" | "unknown";
  summary: string;
  observedEffects: string[];
}
export interface ConversationRequest extends Envelope {
  kind: "conversation-request";
  binding: Binding;
  requestId: string;
  correlationId: string;
  channelId: string;
  speakerParticipantId: string;
  recipientParticipantIds: string[];
  environmentRevision: string;
  contextRevision: string;
  mode: "host-requested" | "live-channel";
  trigger: "host-request" | "incoming-message" | "presence-event";
  requestedModality: Modality;
  receivedAt: string;
  deadlineAt: string;
  messages: {
    messageId: string;
    participantId: string;
    recordedAt: string;
    modality: Modality;
    content: string;
  }[];
}
export interface ConversationResponse extends Envelope {
  kind: "conversation-response";
  binding: Binding;
  requestId: string;
  correlationId: string;
  channelId: string;
  speakerParticipantId: string;
  recipientParticipantIds: string[];
  responseId: string;
  createdAt: string;
  expiresAt: string;
  output:
    | { type: "utterance"; modality: Modality; content: string }
    | { type: "no-output"; reason: string };
}
export interface ConversationDelivery extends Envelope {
  kind: "conversation-delivery";
  binding: Binding;
  requestId: string;
  responseId: string;
  correlationId: string;
  channelId: string;
  deliveryId: string;
  recordedAt: string;
  status: "accepted" | "delivered" | "rejected" | "unknown";
  reason?: string;
}
export interface MemoryEvent extends Envelope {
  kind: "memory-event";
  memoryId: string;
  characterId: string;
  recordedAt: string;
  scope: Scope;
  provenance: {
    sources: {
      sourceType:
        | "authored"
        | "host-report"
        | "conversation"
        | "memory"
        | "derivation"
        | "import"
        | "plan-proposal"
        | "plan-decision";
      sourceId: string;
    }[];
    description?: string;
  };
  eventType: string;
  participantIds: string[];
  recordedPayload: Record<string, unknown>;
  environmentId?: string;
  sessionId?: string;
  summary?: string;
}
