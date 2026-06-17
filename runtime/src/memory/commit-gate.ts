import {
  type MemoryCandidate,
  type MemoryCommitDecision,
  type MemoryCommitGateOptions,
  type MemoryRecord,
  type MemorySource,
  type MemoryTrustLevel,
  type MemoryType,
  type MemoryWarning
} from "./types.js";

const memoryTypes: readonly MemoryType[] = [
  "policy",
  "project_fact",
  "pitfall"
];

const trustLevels: readonly MemoryTrustLevel[] = [
  "explicit_user",
  "approval_record",
  "repository_rule",
  "workspace_rule",
  "verified_tool_result",
  "eval_failure",
  "user_correction",
  "model_suggested",
  "external_untrusted"
];

const sources: readonly MemorySource[] = [
  "user",
  "approval",
  "repository",
  "workspace",
  "tool_result",
  "eval",
  "model",
  "browser",
  "mcp",
  "plugin",
  "bridge",
  "unknown"
];

const policyTrustLevels = new Set<MemoryTrustLevel>([
  "explicit_user",
  "approval_record",
  "repository_rule",
  "workspace_rule"
]);

const policySources = new Set<MemorySource>([
  "user",
  "approval",
  "repository",
  "workspace"
]);

const forbiddenPolicySources = new Set<MemorySource>([
  "tool_result",
  "model",
  "browser",
  "mcp",
  "plugin",
  "bridge",
  "unknown"
]);

const sensitivePatterns = [
  /\brawPrompt\b/i,
  /\braw prompt\b/i,
  /\brawDom\b/i,
  /\braw DOM\b/i,
  /\brawCsv\b/i,
  /\braw CSV\b/i,
  /\brawScreenshot\b/i,
  /\bclipboard\b/i,
  /\bAuthorization\b/,
  /\bBearer\s+[A-Za-z0-9._-]{16,}\b/,
  /\bsk-[A-Za-z0-9_-]{16,}\b/,
  /\bapi[_-]?key\b/i,
  /\bDEEPSEEK_API_KEY\b/,
  /\bOPENAI_API_KEY\b/
];

export function evaluateMemoryCandidate(
  candidate: MemoryCandidate,
  options: MemoryCommitGateOptions = {}
): MemoryCommitDecision {
  const reasonCodes: string[] = [];
  const warnings: MemoryWarning[] = [];
  const maxContentChars = options.maxContentChars ?? 4_000;
  const type = isMemoryType(candidate.proposedType)
    ? candidate.proposedType
    : undefined;
  const source = isMemorySource(candidate.source)
    ? candidate.source
    : undefined;
  const trustLevel = isMemoryTrustLevel(candidate.trustLevel)
    ? candidate.trustLevel
    : undefined;

  if (candidate.proposedContent.trim().length === 0) {
    reasonCodes.push("missing_content");
  }
  if (candidate.proposedSummary.trim().length === 0) {
    reasonCodes.push("missing_summary");
  }
  if (
    candidate.provenance === undefined ||
    candidate.provenance.refs.length === 0
  ) {
    reasonCodes.push("missing_provenance");
  }
  if (type === undefined) {
    reasonCodes.push("unsupported_memory_type");
  }
  if (source === undefined) {
    reasonCodes.push("unknown_source");
  }
  if (trustLevel === undefined) {
    reasonCodes.push("unknown_trust_level");
  }
  if (candidate.namespace.trim().length === 0) {
    reasonCodes.push("missing_namespace");
  }
  if (candidate.proposedContent.length > maxContentChars) {
    reasonCodes.push("content_too_long");
  }
  if (
    options.allowSensitiveContent !== true &&
    hasSensitiveMarker(candidate.proposedContent, candidate.proposedSummary)
  ) {
    reasonCodes.push("sensitive_marker_rejected");
  }
  if (candidateAttemptsFrozenPlacement(candidate)) {
    reasonCodes.push("frozen_prefix_write_rejected");
  }

  if (type === "policy" && source !== undefined && trustLevel !== undefined) {
    if (forbiddenPolicySources.has(source)) {
      reasonCodes.push("policy_source_rejected");
    }
    if (!policySources.has(source)) {
      reasonCodes.push("policy_source_not_allowed");
    }
    if (!policyTrustLevels.has(trustLevel)) {
      reasonCodes.push("policy_trust_rejected");
    }
  }

  if (type === "project_fact") {
    if (
      candidate.evidenceRefs.length === 0 &&
      candidate.contextRefs.length === 0
    ) {
      reasonCodes.push("project_fact_requires_evidence");
    }
  }

  if (type === "pitfall") {
    if ((candidate.trigger ?? "").trim().length === 0) {
      reasonCodes.push("pitfall_requires_trigger");
    }
    if ((candidate.mitigation ?? "").trim().length === 0) {
      reasonCodes.push("pitfall_requires_mitigation");
    }
  }

  if (
    type !== undefined &&
    hasDuplicateCommittedMemory(candidate, options.existingMemories ?? [])
  ) {
    reasonCodes.push("duplicate_memory");
  }

  if (reasonCodes.length > 0) {
    return decision("rejected", candidate, type, reasonCodes, warnings);
  }

  if (
    type === "project_fact" &&
    (trustLevel === "model_suggested" || source === "model")
  ) {
    warnings.push({
      code: "model_suggested_requires_explicit_approval",
      safeMessage:
        "Model-suggested project facts require explicit approval before commit"
    });
    return decision(
      "approval_required",
      candidate,
      type,
      ["explicit_approval_required"],
      warnings
    );
  }

  return decision("approved", candidate, type, [], warnings);
}

export function isMemoryType(value: string): value is MemoryType {
  return (memoryTypes as readonly string[]).includes(value);
}

export function isMemoryTrustLevel(value: string): value is MemoryTrustLevel {
  return (trustLevels as readonly string[]).includes(value);
}

export function isMemorySource(value: string): value is MemorySource {
  return (sources as readonly string[]).includes(value);
}

function decision(
  status: MemoryCommitDecision["status"],
  candidate: MemoryCandidate,
  proposedType: MemoryType | undefined,
  reasonCodes: string[],
  warnings: MemoryWarning[]
): MemoryCommitDecision {
  return {
    status,
    candidateId: candidate.candidateId,
    ...(proposedType !== undefined ? { proposedType } : {}),
    reasonCodes,
    warnings,
    safeMessage:
      status === "approved"
        ? "Memory candidate approved for commit"
        : status === "approval_required"
          ? "Memory candidate requires explicit approval"
          : "Memory candidate rejected"
  };
}

function hasSensitiveMarker(content: string, summary: string): boolean {
  const text = `${content}\n${summary}`;
  return sensitivePatterns.some((pattern) => pattern.test(text));
}

function candidateAttemptsFrozenPlacement(candidate: MemoryCandidate): boolean {
  const metadata = JSON.stringify({
    reason: candidate.reason,
    tags: candidate.tags ?? [],
    provenance: candidate.provenance ?? {}
  });
  return /\bfrozen_prefix\b|\bimmutable_rules\b/i.test(metadata);
}

function hasDuplicateCommittedMemory(
  candidate: MemoryCandidate,
  memories: readonly MemoryRecord[]
): boolean {
  const candidateContent = normalize(candidate.proposedContent);
  const candidateSummary = normalize(candidate.proposedSummary);
  return memories
    .filter((memory) => memory.status === "committed")
    .some(
      (memory) =>
        memory.namespace === candidate.namespace &&
        memory.type === candidate.proposedType &&
        (normalize(memory.content) === candidateContent ||
          normalize(memory.summary) === candidateSummary)
    );
}

function normalize(value: string): string {
  return value.replace(/\s+/g, " ").trim().toLowerCase();
}
