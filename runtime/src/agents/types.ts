import {
  type CapabilityRegistry,
  type CapabilityRiskLevel
} from "../capabilities/index.js";
import { type ContextAssemblyReport } from "../context/index.js";
import { type EventStore } from "../events/index.js";

export type AgentRole = "orchestrator" | "coder" | "reviewer" | "verifier";

export type AgentId = string;

export type AgentTaskIntent =
  | "web_data_extraction"
  | "code_change"
  | "code_review"
  | "verification"
  | "documentation"
  | "unknown";

export type AgentDossierSensitivity = "public" | "internal" | "sensitive";

export type AgentEvidenceRef = {
  id: string;
  kind: "artifact" | "event" | "browser_payload" | "test_result" | "other";
  untrusted: boolean;
  summary?: string;
};

export type AgentContextRef = {
  id: string;
  kind: "context_report" | "active_rule" | "no_compress_zone" | "hash";
  hash?: string;
};

export type AgentMemoryRef = {
  id: string;
  kind: "memory_ref";
};

export type AgentRequiredOutput = {
  id: string;
  title: string;
  format: "summary" | "patch_plan" | "review_findings" | "verification_report";
};

export type AgentForbiddenSideEffect =
  | "desktop_action"
  | "shell_execution"
  | "mcp_execution"
  | "plugin_execution"
  | "skill_execution"
  | "memory_write"
  | "patch_apply"
  | "native_bridge_transport"
  | "auto_convert"
  | "file_write_from_bridge"
  | "real_deepseek_api";

export type AgentDossier = {
  agentId: AgentId;
  role: AgentRole;
  taskId: string;
  objective: string;
  acceptedFacts: string[];
  activeConstraints: string[];
  allowedCapabilities: string[];
  requiredOutputs: AgentRequiredOutput[];
  forbiddenSideEffects: AgentForbiddenSideEffect[];
  evidenceRefs: AgentEvidenceRef[];
  contextRefs: AgentContextRef[];
  memoryRefs: AgentMemoryRef[];
  capabilityLeaseRefs: string[];
  modelProfileId: string;
  createdAt: string;
  expiresAt?: string;
  sensitivity: AgentDossierSensitivity;
  provenance: Record<string, unknown>;
  hash: string;
};

export type AgentDossierSummary = {
  agentId: AgentId;
  role: AgentRole;
  taskId: string;
  objectiveSummary: string;
  allowedCapabilities: string[];
  requiredOutputIds: string[];
  forbiddenSideEffects: AgentForbiddenSideEffect[];
  evidenceRefIds: string[];
  contextRefIds: string[];
  memoryRefIds: string[];
  capabilityLeaseRefs: string[];
  modelProfileId: string;
  hash: string;
};

export type AgentRoutingInput = {
  taskId: string;
  intent: AgentTaskIntent;
  objective: string;
  riskLevel?: CapabilityRiskLevel;
  requiredCapabilities?: string[];
  contextReport?: ContextAssemblyReport;
  capabilityRegistry?: CapabilityRegistry;
  modelProfileIds?: string[];
  evidenceRefs?: AgentEvidenceRef[];
  constraints?: string[];
  acceptedFacts?: string[];
  requiredOutputs?: AgentRequiredOutput[];
  forbiddenSideEffects?: AgentForbiddenSideEffect[];
  memoryRefs?: AgentMemoryRef[];
  capabilityLeaseRefs?: string[];
  acceptanceCriteria?: string[];
  requestedSideEffects?: string[];
  hasApprovalPolicy?: boolean;
  bypassCapabilityBroker?: boolean;
  createdAt?: string;
};

export type AgentRoutingDecision =
  | "planned"
  | "needs_clarification"
  | "rejected";

export type AgentRoutingWarning = {
  code: string;
  safeMessage: string;
};

export type AgentRoutingError = {
  code: string;
  safeMessage: string;
};

export type AgentIsolationViolation = {
  code: string;
  role?: AgentRole;
  safeMessage: string;
};

export type AgentRoutingStep = {
  stepId: string;
  order: number;
  role: AgentRole;
  agentId: AgentId;
  dossier: AgentDossier;
};

export type AgentRoutingPlan = {
  routeId: string;
  taskId: string;
  status: AgentRoutingDecision;
  intent: AgentTaskIntent;
  roles: AgentRole[];
  steps: AgentRoutingStep[];
  dossierSummaries: AgentDossierSummary[];
  objectiveSummary: string;
  riskLevel?: CapabilityRiskLevel;
  requiredCapabilities: string[];
  warnings: AgentRoutingWarning[];
  errors: AgentRoutingError[];
  createdAt: string;
  hash: string;
  eventIds?: string[];
};

export type StaticAgentRouterOptions = {
  eventStore?: EventStore;
  clock?: () => Date;
  routeIdFactory?: () => string;
};

export type StaticAgentRouter = {
  routeAgentTask(input: AgentRoutingInput): AgentRoutingPlan;
};

export type AgentDossierValidationResult =
  | {
      ok: true;
      dossier: AgentDossier;
    }
  | {
      ok: false;
      errors: AgentRoutingError[];
      isolationViolations: AgentIsolationViolation[];
    };
