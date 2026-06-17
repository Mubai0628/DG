import { hashPatchObject } from "../patch/index.js";
import {
  type GitCommandPlan,
  type GitSafeLaneAuditReport,
  type GitSafeLaneOptions,
  type GitWriteIntent
} from "./types.js";

export function createGitSafeLaneAuditReport(
  plan: GitCommandPlan,
  auditId = `${plan.planId}-audit`
): GitSafeLaneAuditReport {
  const reportWithoutHash = {
    auditId,
    commandKind: plan.commandKind,
    decision: plan.status,
    lane: plan.lane,
    riskLevel: plan.riskLevel,
    pathspecCount: plan.pathspecs.length,
    warningCodes: plan.warnings.map((warning) => warning.code),
    reasons: plan.reasons
  } satisfies Omit<GitSafeLaneAuditReport, "hash">;
  return {
    ...reportWithoutHash,
    hash: hashPatchObject(reportWithoutHash)
  };
}

export function createDisabledGitWriteIntent(
  input: {
    intentId?: string;
    commandKind: GitWriteIntent["commandKind"];
    summary?: string;
    patchProposalRefs?: string[];
    auditReportRefs?: string[];
  },
  options: GitSafeLaneOptions = {}
): GitWriteIntent {
  const intent: GitWriteIntent = {
    intentId: input.intentId ?? options.idFactory?.() ?? "git-write-intent-1",
    commandKind: input.commandKind,
    status: "disabled",
    reason: "git write lanes are disabled in this phase",
    patchProposalRefs: [...(input.patchProposalRefs ?? [])],
    auditReportRefs: [...(input.auditReportRefs ?? [])],
    requiresApproval: true
  };
  if (input.summary !== undefined) {
    intent.summary = sanitizeSummary(input.summary);
  }
  options.eventStore?.appendEvent({
    type: "git.write_intent.disabled",
    payload: {
      intentId: intent.intentId,
      commandKind: intent.commandKind,
      status: intent.status,
      reason: intent.reason,
      patchProposalRefs: intent.patchProposalRefs,
      auditReportRefs: intent.auditReportRefs,
      requiresApproval: intent.requiresApproval
    }
  });
  return intent;
}

function sanitizeSummary(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 160);
}
