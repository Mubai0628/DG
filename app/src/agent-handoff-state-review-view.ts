import {
  buildAgentHandoffStateReviewReport,
  type AgentHandoffStageInput,
  type AgentHandoffStateReviewInput,
  type AgentHandoffStateReviewReport
} from "../../runtime/src/workflows/agent-handoff-state-review.js";
import { safeErrorMessage } from "./safety.js";

export type AgentHandoffStateReviewViewStatus =
  | "empty"
  | "review_ready"
  | "warning"
  | "blocked";

export type AgentHandoffStateReviewView = {
  status: AgentHandoffStateReviewViewStatus;
  reviewId: string;
  stageCount: number;
  completedStageCount: number;
  missingRoleOutputCount: number;
  staleStageCount: number;
  skippedRoleCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  roleOrder: AgentHandoffStateReviewReport["roleOrder"];
  stageSummaries: AgentHandoffStateReviewReport["stageSummaries"];
  findingCodes: string[];
  hashPrefix?: string | undefined;
  readiness: AgentHandoffStateReviewReport["readiness"];
  nextAction: string;
  source: "app_agent_handoff_state_review";
};

export type AgentHandoffStateReviewViewSummary = {
  status: AgentHandoffStateReviewViewStatus;
  reviewId: string;
  stageCount: number;
  missingRoleOutputCount: number;
  staleStageCount: number;
  blockerCount: number;
  warningCount: number;
  hashPrefix: string;
  nextAction: string;
  source: "app_agent_handoff_state_review";
};

export type AgentHandoffStateReviewViewInput = {
  handoffJsonText?: string | undefined;
  sourceKind?: "paste" | "fixture" | "manual_test" | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export function buildAgentHandoffStateReviewView(
  input: AgentHandoffStateReviewViewInput = {}
): AgentHandoffStateReviewView {
  const text = input.handoffJsonText ?? "";
  if (text.trim().length === 0) {
    return fromReport(buildAgentHandoffStateReviewReport(), "empty");
  }
  const parsed = parseHandoffJson(text);
  if (!parsed.ok) {
    return {
      ...fromReport(buildAgentHandoffStateReviewReport(), "blocked"),
      reviewId: "agent-handoff-parse-blocked",
      blockerCount: 1,
      findingCount: 1,
      findingCodes: ["INVALID_AGENT_HANDOFF_REVIEW_JSON"],
      nextAction: parsed.safeMessage
    };
  }
  const value = parsed.value;
  const report = buildAgentHandoffStateReviewReport({
    stages: Array.isArray(value)
      ? value
      : Array.isArray(value.stages)
        ? value.stages
        : [],
    ...(!Array.isArray(value) && Array.isArray(value.expectedRoleOrder)
      ? { expectedRoleOrder: value.expectedRoleOrder }
      : {}),
    ...numberOption(value, "staleThresholdMs"),
    sourceKind:
      input.sourceKind === "paste"
        ? "app_preview"
        : (input.sourceKind ?? "app_preview"),
    createdAt:
      input.createdAt ??
      (!Array.isArray(value) && typeof value.createdAt === "string"
        ? value.createdAt
        : undefined),
    idGenerator: input.idGenerator
  });
  return fromReport(report);
}

export function summarizeAgentHandoffStateReviewView(
  view: AgentHandoffStateReviewView
): AgentHandoffStateReviewViewSummary {
  return {
    status: view.status,
    reviewId: view.reviewId,
    stageCount: view.stageCount,
    missingRoleOutputCount: view.missingRoleOutputCount,
    staleStageCount: view.staleStageCount,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    hashPrefix: view.hashPrefix ?? "n/a",
    nextAction: view.nextAction,
    source: "app_agent_handoff_state_review"
  };
}

function fromReport(
  report: AgentHandoffStateReviewReport,
  forcedStatus?: AgentHandoffStateReviewViewStatus
): AgentHandoffStateReviewView {
  return {
    status: forcedStatus ?? report.status,
    reviewId: report.reviewId,
    stageCount: report.stageCount,
    completedStageCount: report.completedStageCount,
    missingRoleOutputCount: report.missingRoleOutputCount,
    staleStageCount: report.staleStageCount,
    skippedRoleCount: report.skippedRoleCount,
    blockerCount: report.blockerCount,
    warningCount: report.warningCount,
    findingCount: report.findingCount,
    roleOrder: report.roleOrder,
    stageSummaries: report.stageSummaries,
    findingCodes: report.findings.map((finding) => finding.code),
    hashPrefix: report.reviewHash.slice(0, 16),
    readiness: report.readiness,
    nextAction: report.nextAction,
    source: "app_agent_handoff_state_review"
  };
}

function numberOption(
  value: Record<string, unknown> | AgentHandoffStageInput[],
  key: "staleThresholdMs"
): Partial<AgentHandoffStateReviewInput> {
  if (Array.isArray(value) || typeof value[key] !== "number") {
    return {};
  }
  return { [key]: value[key] };
}

function parseHandoffJson(text: string):
  | {
      ok: true;
      value:
        | (Record<string, unknown> & { stages?: AgentHandoffStageInput[] })
        | AgentHandoffStageInput[];
    }
  | { ok: false; safeMessage: string } {
  try {
    const value = JSON.parse(text) as unknown;
    if (Array.isArray(value) || (value !== null && typeof value === "object")) {
      return {
        ok: true,
        value: value as
          | (Record<string, unknown> & { stages?: AgentHandoffStageInput[] })
          | AgentHandoffStageInput[]
      };
    }
    return {
      ok: false,
      safeMessage: "Agent handoff review JSON must be an object or array."
    };
  } catch (caught) {
    return { ok: false, safeMessage: safeErrorMessage(caught) };
  }
}
