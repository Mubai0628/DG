import { hashPatchObject } from "./hash.js";
import {
  type ChangedFileSummary,
  type DiffAuditDecision,
  type DiffAuditReport,
  type PatchApplySimulation,
  type PatchFileChange,
  type PatchProposal,
  type PatchValidationIssue
} from "./types.js";

export function generatePatchAuditReport(input: {
  proposalId: string;
  riskLevel: PatchProposal["riskLevel"];
  requiresApproval: boolean;
  changes: readonly PatchFileChange[];
  validationErrors: readonly PatchValidationIssue[];
  validationWarnings: readonly PatchValidationIssue[];
  noCompressZoneRefs?: readonly string[];
  simulation?: PatchApplySimulation;
  auditId?: string;
}): DiffAuditReport {
  const simulationErrors = input.simulation?.errors ?? [];
  const allErrors = [...input.validationErrors, ...simulationErrors];
  const decision = auditDecision(allErrors, input.requiresApproval);
  const pathWarnings = [...input.validationWarnings, ...allErrors]
    .filter((issue) => issue.path !== undefined)
    .map((issue) => `${issue.kind}:${issue.path}`);
  const contentWarnings = [...input.validationWarnings, ...allErrors]
    .filter((issue) => issue.path === undefined)
    .map((issue) => issue.kind);
  const changedFiles = input.changes.map(summarizeChangedFile);
  const reportWithoutHash = {
    auditId: input.auditId ?? `${input.proposalId}-audit`,
    proposalId: input.proposalId,
    decision,
    reasons: allErrors.map((issue) => issue.kind),
    riskLevel: input.riskLevel,
    pathWarnings,
    contentWarnings,
    beforeHashes: hashMap(input.changes, "beforeHash"),
    afterHashes: hashMap(input.changes, "afterHash"),
    changedFiles,
    requiresApproval: input.requiresApproval,
    noCompressZoneRefs: [...(input.noCompressZoneRefs ?? [])].sort(),
    suggestedNextAction: nextAction(decision)
  } satisfies Omit<DiffAuditReport, "hash">;

  return {
    ...reportWithoutHash,
    hash: hashPatchObject(reportWithoutHash)
  };
}

export function patchAuditEventSafe(
  report: DiffAuditReport
): Record<string, unknown> {
  return {
    auditId: report.auditId,
    proposalId: report.proposalId,
    decision: report.decision,
    reasons: report.reasons,
    riskLevel: report.riskLevel,
    pathWarnings: report.pathWarnings,
    contentWarnings: report.contentWarnings,
    changedFiles: report.changedFiles,
    requiresApproval: report.requiresApproval,
    noCompressZoneRefs: report.noCompressZoneRefs,
    suggestedNextAction: report.suggestedNextAction,
    hash: report.hash
  };
}

export function summarizeChangedFile(
  change: PatchFileChange
): ChangedFileSummary {
  const summary: ChangedFileSummary = {
    path: change.path,
    operation: change.operation,
    sizeBytes: change.sizeBytes
  };
  if (change.beforeHash !== undefined) {
    summary.beforeHash = change.beforeHash;
  }
  if (change.afterHash !== undefined) {
    summary.afterHash = change.afterHash;
  }
  return summary;
}

function auditDecision(
  errors: readonly PatchValidationIssue[],
  requiresApproval: boolean
): DiffAuditDecision {
  if (errors.length > 0) {
    return "invalid";
  }
  return requiresApproval ? "needs_approval" : "valid";
}

function nextAction(
  decision: DiffAuditDecision
): DiffAuditReport["suggestedNextAction"] {
  if (decision === "invalid") {
    return "reject";
  }
  if (decision === "needs_approval") {
    return "approve";
  }
  return "approve";
}

function hashMap(
  changes: readonly PatchFileChange[],
  key: "beforeHash" | "afterHash"
): Record<string, string> {
  const entries: Array<[string, string]> = [];
  for (const change of changes) {
    const value = change[key];
    if (value !== undefined) {
      entries.push([change.path, value]);
    }
  }
  return Object.fromEntries(
    entries.sort(([left], [right]) => left.localeCompare(right))
  );
}
