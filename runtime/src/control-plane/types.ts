import { type AgentRoutingPlan } from "../agents/index.js";
import { type CapabilityInvocationPlan } from "../capabilities/index.js";
import { type MemoryRecallResult } from "../memory/index.js";
import { type DiffAuditReport } from "../execution/patch/index.js";
import { type GitParsedSummary } from "../execution/git/index.js";
import { type ShellOutputSummary } from "../execution/shell/index.js";

export type ControlPlaneTaskIntent =
  | "web_data_extraction"
  | "code_change"
  | "code_review"
  | "verification"
  | "documentation"
  | "bridge_payload_preview"
  | "unknown";

export type ControlPlaneRunStatus =
  | "created"
  | "planned"
  | "needs_clarification"
  | "awaiting_approval"
  | "approved"
  | "rejected"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type ControlPlaneRunPhase =
  | "intake"
  | "context"
  | "routing"
  | "capability_planning"
  | "approval"
  | "execution_plan"
  | "simulation"
  | "result"
  | "audit";

export type ControlPlaneWarning = {
  code: string;
  safeMessage: string;
};

export type ControlPlaneErrorKind =
  | "invalid_task"
  | "invalid_transition"
  | "run_not_found"
  | "task_not_found"
  | "unsafe_content";

export type ControlPlaneError = {
  kind: ControlPlaneErrorKind;
  code: string;
  safeMessage: string;
  taskId?: string;
  runId?: string;
};

export type ControlPlaneArtifactRef = {
  id: string;
  kind:
    | "draft"
    | "patch"
    | "git_summary"
    | "shell_summary"
    | "memory"
    | "event"
    | "other";
  summary: string;
  hash?: string;
};

export type ControlPlaneEvidenceRef = {
  id: string;
  kind: "artifact" | "event" | "test_result" | "summary" | "other";
  summary: string;
};

export type ControlPlaneCapabilityPlanRef = {
  id: string;
  capabilityId: string;
  status: string;
  summary: string;
};

export type ControlPlaneAgentRouteRef = {
  id: string;
  roles: string[];
  summary: string;
};

export type ControlPlaneContextRef = {
  id: string;
  kind: "context_report" | "active_rule" | "hash" | "no_compress_zone";
  summary: string;
  hash?: string;
};

export type ControlPlaneMemoryRef = {
  id: string;
  kind: "memory_ref";
  summary: string;
};

export type ControlPlanePatchRef = {
  id: string;
  decision: string;
  summary: string;
};

export type ControlPlaneGitSummaryRef = {
  id: string;
  kind: string;
  summary: string;
};

export type ControlPlaneShellSummaryRef = {
  id: string;
  commandId: string;
  summary: string;
};

export type ControlPlaneTimelineItem = {
  id: string;
  ts: string;
  type: string;
  runId?: string;
  taskId?: string;
  phase?: ControlPlaneRunPhase;
  status?: ControlPlaneRunStatus;
  summary: string;
};

export type ControlPlaneApprovalState =
  | "none"
  | "requested"
  | "approved"
  | "rejected";

export type ControlPlaneApprovalRequest = {
  approvalId: string;
  runId: string;
  taskId: string;
  requestedAt: string;
  capabilityPlanRefs: string[];
  patchProposalRefs: string[];
  gitIntentRefs: string[];
  shellIntentRefs: string[];
  bridgeProposalRefs: string[];
  safeSummary: string;
};

export type ControlPlaneApprovalDecision = {
  approvalId: string;
  runId: string;
  taskId: string;
  decision: "approved" | "rejected";
  decidedAt: string;
  safeSummary: string;
};

export type ControlPlaneTask = {
  taskId: string;
  intent: ControlPlaneTaskIntent;
  objective: string;
  objectiveSummary: string;
  createdAt: string;
  status: ControlPlaneRunStatus;
  warnings: ControlPlaneWarning[];
  hash: string;
};

export type ControlPlaneRun = {
  runId: string;
  taskId: string;
  status: ControlPlaneRunStatus;
  phase: ControlPlaneRunPhase;
  createdAt: string;
  updatedAt: string;
  approvalState: ControlPlaneApprovalState;
  timeline: ControlPlaneTimelineItem[];
  artifactRefs: ControlPlaneArtifactRef[];
  evidenceRefs: ControlPlaneEvidenceRef[];
  capabilityPlanRefs: ControlPlaneCapabilityPlanRef[];
  agentRouteRefs: ControlPlaneAgentRouteRef[];
  contextRefs: ControlPlaneContextRef[];
  memoryRefs: ControlPlaneMemoryRef[];
  patchRefs: ControlPlanePatchRef[];
  gitSummaryRefs: ControlPlaneGitSummaryRef[];
  shellSummaryRefs: ControlPlaneShellSummaryRef[];
  warnings: ControlPlaneWarning[];
  errors: ControlPlaneError[];
  hash: string;
};

export type ControlPlaneLifecycleEvent = {
  type:
    | "control.task.created"
    | "control.run.created"
    | "control.run.planned"
    | "control.run.status_changed"
    | "control.run.needs_clarification"
    | "control.approval.requested"
    | "control.approval.recorded"
    | "control.run.completed"
    | "control.run.failed"
    | "control.run.cancelled";
  taskId?: string;
  runId?: string;
  status?: ControlPlaneRunStatus;
  phase?: ControlPlaneRunPhase;
  safeSummary: string;
  warningCodes?: string[];
  errorCodes?: string[];
  refs?: string[];
};

export type ControlPlaneStateProjection = {
  tasks: Record<string, ControlPlaneTask>;
  runs: Record<string, ControlPlaneRun>;
  timeline: ControlPlaneTimelineItem[];
  taskCount: number;
  runCount: number;
  completedRunCount: number;
  draftCount: number;
  eventCount: number;
  warnings: ControlPlaneWarning[];
};

export type ControlPlaneProjectorOptions = {
  now?: string;
  runIdFactory?: (taskId: string) => string;
};

export type ControlPlaneTaskInput = {
  taskId?: string;
  intent: ControlPlaneTaskIntent | string;
  objective: string;
  createdAt?: string;
};

export type ControlPlaneRunOptions = {
  runId?: string;
  now?: string;
};

export type ControlPlaneRegistrySummary = {
  runId: string;
  taskId: string;
  status: ControlPlaneRunStatus;
  phase: ControlPlaneRunPhase;
  approvalState: ControlPlaneApprovalState;
  timelineCount: number;
  artifactCount: number;
  warningCodes: string[];
  errorCodes: string[];
  hash: string;
};

export type ControlPlaneIntegrationInputs = {
  routePlan?: AgentRoutingPlan;
  capabilityPlan?: CapabilityInvocationPlan;
  memoryRecall?: MemoryRecallResult;
  patchAudit?: DiffAuditReport;
  gitSummary?: GitParsedSummary;
  shellSummary?: ShellOutputSummary;
};
