import {
  buildApprovalConsistencyReport,
  type ApprovalConsistencyReport,
  type ApprovalConsistencyScope
} from "../../runtime/src/workflows/approval-consistency-check.js";
import { safeErrorMessage } from "./safety.js";

export type ApprovalConsistencyViewStatus =
  | "empty"
  | "consistent"
  | "warning"
  | "blocked";

export type ApprovalConsistencyView = {
  status: ApprovalConsistencyViewStatus;
  consistencyId: string;
  scopeCount: number;
  consistentScopeCount: number;
  inconsistentScopeCount: number;
  warningScopeCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  findingCodes: string[];
  scopeSummaries: ApprovalConsistencyReport["scopeSummaries"];
  hashPrefix?: string | undefined;
  readiness: ApprovalConsistencyReport["readiness"];
  nextAction: string;
  source: "app_approval_consistency_view";
};

export type ApprovalConsistencyViewSummary = {
  status: ApprovalConsistencyViewStatus;
  consistencyId: string;
  scopeCount: number;
  consistentScopeCount: number;
  inconsistentScopeCount: number;
  warningScopeCount: number;
  blockerCount: number;
  warningCount: number;
  hashPrefix: string;
  nextAction: string;
  source: "app_approval_consistency_view";
};

export type ApprovalConsistencyViewInput = {
  consistencyJsonText?: string | undefined;
  sourceKind?: "paste" | "fixture" | "manual_test" | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export function buildApprovalConsistencyView(
  input: ApprovalConsistencyViewInput = {}
): ApprovalConsistencyView {
  const text = input.consistencyJsonText ?? "";
  if (text.trim().length === 0) {
    return fromReport(buildApprovalConsistencyReport(), "empty");
  }
  const parsed = parseConsistencyJson(text);
  if (!parsed.ok) {
    return {
      ...fromReport(buildApprovalConsistencyReport(), "blocked"),
      consistencyId: "approval-consistency-parse-blocked",
      blockerCount: 1,
      findingCount: 1,
      findingCodes: ["INVALID_APPROVAL_CONSISTENCY_JSON"],
      nextAction: parsed.safeMessage
    };
  }
  const value = parsed.value;
  const report = buildApprovalConsistencyReport({
    scopes: Array.isArray(value)
      ? value
      : Array.isArray(value.scopes)
        ? value.scopes
        : [],
    expectedTaskId:
      !Array.isArray(value) && typeof value.expectedTaskId === "string"
        ? value.expectedTaskId
        : undefined,
    expectedWorkflowScenarioId:
      !Array.isArray(value) &&
      typeof value.expectedWorkflowScenarioId === "string"
        ? value.expectedWorkflowScenarioId
        : undefined,
    expectedWorkspaceRootRef:
      !Array.isArray(value) && typeof value.expectedWorkspaceRootRef === "string"
        ? value.expectedWorkspaceRootRef
        : undefined,
    expectedProposalId:
      !Array.isArray(value) && typeof value.expectedProposalId === "string"
        ? value.expectedProposalId
        : undefined,
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

export function summarizeApprovalConsistencyView(
  view: ApprovalConsistencyView
): ApprovalConsistencyViewSummary {
  return {
    status: view.status,
    consistencyId: view.consistencyId,
    scopeCount: view.scopeCount,
    consistentScopeCount: view.consistentScopeCount,
    inconsistentScopeCount: view.inconsistentScopeCount,
    warningScopeCount: view.warningScopeCount,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    hashPrefix: view.hashPrefix ?? "n/a",
    nextAction: view.nextAction,
    source: "app_approval_consistency_view"
  };
}

function fromReport(
  report: ApprovalConsistencyReport,
  forcedStatus?: ApprovalConsistencyViewStatus
): ApprovalConsistencyView {
  return {
    status: forcedStatus ?? report.status,
    consistencyId: report.consistencyId,
    scopeCount: report.scopeCount,
    consistentScopeCount: report.consistentScopeCount,
    inconsistentScopeCount: report.inconsistentScopeCount,
    warningScopeCount: report.warningScopeCount,
    blockerCount: report.blockerCount,
    warningCount: report.warningCount,
    findingCount: report.findingCount,
    findingCodes: report.findings.map((finding) => finding.code),
    scopeSummaries: report.scopeSummaries,
    hashPrefix: report.consistencyHash.slice(0, 16),
    readiness: report.readiness,
    nextAction: report.nextAction,
    source: "app_approval_consistency_view"
  };
}

function parseConsistencyJson(
  text: string
):
  | {
      ok: true;
      value:
        | { scopes?: ApprovalConsistencyScope[]; [key: string]: unknown }
        | ApprovalConsistencyScope[];
    }
  | { ok: false; safeMessage: string } {
  try {
    const value = JSON.parse(text) as unknown;
    if (Array.isArray(value) || (value !== null && typeof value === "object")) {
      return {
        ok: true,
        value: value as
          | { scopes?: ApprovalConsistencyScope[]; [key: string]: unknown }
          | ApprovalConsistencyScope[]
      };
    }
    return {
      ok: false,
      safeMessage: "Approval consistency JSON must be an object or array."
    };
  } catch (caught) {
    return { ok: false, safeMessage: safeErrorMessage(caught) };
  }
}
