import { type CapabilityDescriptor } from "../../capabilities/index.js";
import { type AgentEvidenceRef } from "../../agents/index.js";
import { type ContextSegmentV2Input } from "../../context/index.js";
import {
  type DiffAuditReport,
  type PatchProposal,
  type PatchSensitivity
} from "./types.js";

export function describePatchApplyCapability(): CapabilityDescriptor {
  return {
    id: "native.patch.apply",
    title: "Apply audited patch",
    sourceType: "native",
    category: "fs",
    riskLevel: "A3_scoped_write",
    invokePolicy: "DISABLED",
    executionMode: "SIMULATE",
    inputSchema: {
      type: "object",
      required: ["proposalId"]
    },
    outputSchema: {
      type: "object",
      summaryOnly: true
    },
    supportsDryRun: true,
    requiresElicitation: true,
    canWriteMemory: false,
    trustTier: "core",
    version: "0.2.0",
    owner: "runtime",
    description:
      "Future patch apply capability descriptor. Disabled in P0F-006; patch foundation only supports proposal, audit, and virtual simulation.",
    eventTypes: ["patch.proposed", "patch.validated", "patch.simulated"],
    disabledReason: "Real filesystem patch apply is out of scope for P0F-006."
  };
}

export function patchProposalToEvidenceRef(
  proposal: PatchProposal
): AgentEvidenceRef {
  return {
    id: proposal.proposalId,
    kind: "artifact",
    untrusted: proposal.source === "model" || proposal.source === "tool",
    summary: `Patch proposal ${proposal.proposalId}: ${proposal.diffSummary.filesChanged} file(s), ${proposal.diffSummary.linesAdded} added, ${proposal.diffSummary.linesRemoved} removed.`
  };
}

export function patchAuditToAgentEvidenceRef(
  audit: DiffAuditReport
): AgentEvidenceRef {
  return {
    id: audit.auditId,
    kind: "artifact",
    untrusted: false,
    summary: `Patch audit ${audit.decision}: ${audit.changedFiles.length} file(s), risk ${audit.riskLevel}.`
  };
}

export function patchAuditToNoCompressZoneSegment(
  audit: DiffAuditReport,
  options: {
    id?: string;
    title?: string;
    sensitivity?: PatchSensitivity;
  } = {}
): ContextSegmentV2Input {
  return {
    id: options.id ?? `patch-audit-${audit.auditId}`,
    layer: "no_compress_zone",
    title: options.title ?? "Patch audit report",
    content: [
      `decision=${audit.decision}`,
      `risk=${audit.riskLevel}`,
      `files=${audit.changedFiles.map((file) => `${file.operation}:${file.path}`).join(",")}`,
      `reasons=${audit.reasons.join(",") || "none"}`,
      `hash=${audit.hash}`
    ].join("; "),
    source: "task",
    provenance: {
      proposalId: audit.proposalId,
      auditId: audit.auditId,
      hash: audit.hash
    },
    sensitivity: options.sensitivity ?? "internal",
    noCompress: true
  };
}
