import { generatePatchAuditReport } from "./audit.js";
import { generateDiffSummary } from "./diff.js";
import { byteLengthUtf8, hashPatchObject, patchSha256 } from "./hash.js";
import { normalizePatchPath } from "./path-guard.js";
import {
  type PatchEventSummary,
  type PatchFileChange,
  type PatchOperation,
  type PatchProposal,
  type PatchProposalInput,
  type PatchServiceOptions,
  type PatchValidationIssue,
  type PatchValidationResult
} from "./types.js";

const defaultMaxFileBytes = 256 * 1024;
const defaultMaxPatchBytes = 1024 * 1024;

const secretMarkers = [
  /sk-[A-Za-z0-9_-]{16,}/,
  /Bearer[ \t]+[A-Za-z0-9_-]{16,}/,
  /Authorization\s*[:=]/i,
  /-----BEGIN (?:RSA |EC |OPENSSH |)PRIVATE KEY-----/,
  /\b(?:apiKey|api_key|secret|password)\s*[:=]\s*["']?[^"'\s]{8,}/i
];

const rawMarkers = [
  /\brawPrompt\b/,
  /\brawDom\b/,
  /\brawScreenshot\b/,
  /\bcsvContent\b/,
  /\bclipboard\b/,
  /\binnerHTML\b/,
  /\bouterHTML\b/
];

const fullUrlQuerySecretMarker =
  /https?:\/\/[^\s?]+\?[^\s]*(?:token|session|secret|password|api[_-]?key)=/i;

const directShellReasonMarker =
  /\b(?:rm\s+-rf|powershell|cmd\.exe|bash\s+-c|sh\s+-c|curl\s+|wget\s+|chmod\s+)/i;

export function createPatchProposal(
  input: PatchProposalInput,
  options: PatchServiceOptions = {}
): PatchProposal {
  const proposalId =
    input.proposalId ?? options.idFactory?.() ?? "patch-proposal-1";
  const createdAt =
    input.createdAt ?? (options.clock?.() ?? new Date()).toISOString();
  const changes = input.changes.map((change) =>
    normalizePatchFileChange(change, options)
  );
  const validation = validatePatchChanges(changes, options);
  const diffSummary = generateDiffSummary(changes);
  const requiresApproval = input.requiresApproval ?? true;
  const auditInput: Parameters<typeof generatePatchAuditReport>[0] = {
    proposalId,
    riskLevel: input.riskLevel ?? "A3_scoped_write",
    requiresApproval,
    changes,
    validationErrors: validation.errors,
    validationWarnings: validation.warnings
  };
  if (input.noCompressZoneRefs !== undefined) {
    auditInput.noCompressZoneRefs = input.noCompressZoneRefs;
  }
  const auditReport = generatePatchAuditReport(auditInput);
  const proposalWithoutHash = {
    proposalId,
    taskId: input.taskId,
    source: input.source,
    title: input.title,
    description: input.description,
    changes,
    createdAt,
    status: validation.ok ? "validated" : "rejected",
    riskLevel: input.riskLevel ?? "A3_scoped_write",
    requiresApproval,
    validation,
    diffSummary,
    auditReport
  } satisfies Omit<PatchProposal, "hash" | "agentId">;

  const proposal: PatchProposal = {
    ...proposalWithoutHash,
    hash: hashPatchObject({
      proposalId,
      taskId: input.taskId,
      source: input.source,
      title: input.title,
      description: input.description,
      changes: changes.map((change) => ({
        operation: change.operation,
        path: change.path,
        oldPath: change.oldPath,
        beforeHash: change.beforeHash,
        afterHash: change.afterHash,
        contentType: change.contentType,
        sizeBytes: change.sizeBytes,
        reason: change.reason,
        sourceRefs: change.sourceRefs,
        noCompress: change.noCompress,
        sensitivity: change.sensitivity
      })),
      createdAt,
      riskLevel: input.riskLevel ?? "A3_scoped_write",
      requiresApproval,
      validation,
      diffSummary: {
        ...diffSummary,
        hunks: diffSummary.hunks.map((hunk) => ({
          filePath: hunk.filePath,
          lineCount: hunk.lines.length
        }))
      }
    })
  };

  if (input.agentId !== undefined) {
    proposal.agentId = input.agentId;
  }

  appendPatchEvent(options, proposal, "patch.proposed", "proposed");
  appendPatchEvent(
    options,
    proposal,
    "patch.validated",
    proposal.auditReport.decision
  );
  if (!validation.ok) {
    appendPatchEvent(options, proposal, "patch.rejected", "rejected");
  }

  return proposal;
}

export function validatePatchChanges(
  changes: readonly PatchFileChange[],
  options: PatchServiceOptions = {}
): PatchValidationResult {
  const errors: PatchValidationIssue[] = [];
  const warnings: PatchValidationIssue[] = [];
  let totalBytes = 0;

  for (const change of changes) {
    const pathResult = normalizePatchPath(change.path, options);
    if (!pathResult.ok) {
      errors.push(...pathResult.errors);
    }
    warnings.push(...pathResult.warnings);

    if (change.oldPath !== undefined) {
      const oldPathResult = normalizePatchPath(change.oldPath, options);
      if (!oldPathResult.ok) {
        errors.push(...oldPathResult.errors);
      }
      warnings.push(...oldPathResult.warnings);
    }

    if (change.operation === "rename") {
      errors.push(
        issue(
          "unsupported_operation",
          change.path,
          "Rename is modelled but not simulated in this foundation."
        )
      );
    }
    if (!["create", "update", "delete", "rename"].includes(change.operation)) {
      errors.push(
        issue(
          "unsupported_operation",
          change.path,
          "Unsupported patch operation."
        )
      );
    }
    if (
      (change.operation === "create" || change.operation === "update") &&
      change.afterContent === undefined
    ) {
      errors.push(
        issue(
          "missing_content",
          change.path,
          "Create/update operations need content."
        )
      );
    }

    const content = `${change.beforeContent ?? ""}\n${change.afterContent ?? ""}`;
    const contentBytes = byteLengthUtf8(content);
    totalBytes += contentBytes;
    if (change.sizeBytes > (options.maxFileBytes ?? defaultMaxFileBytes)) {
      errors.push(
        issue(
          "file_too_large",
          change.path,
          "Patch file exceeds the byte limit."
        )
      );
    }
    if (hasBinaryMarker(content)) {
      errors.push(
        issue("binary_content", change.path, "Binary content is not accepted.")
      );
    }
    if (secretMarkers.some((marker) => marker.test(content))) {
      errors.push(
        issue(
          "secret_marker",
          change.path,
          "Secret-like content is not accepted."
        )
      );
    }
    if (rawMarkers.some((marker) => marker.test(content))) {
      errors.push(
        issue(
          "raw_marker",
          change.path,
          "Raw sensitive markers are not accepted."
        )
      );
    }
    if (fullUrlQuerySecretMarker.test(content)) {
      errors.push(
        issue(
          "full_url_query_secret",
          change.path,
          "Full URL query secret markers are not accepted."
        )
      );
    }
    if (directShellReasonMarker.test(change.reason)) {
      errors.push(
        issue(
          "direct_shell_command",
          change.path,
          "Patch reasons cannot propose direct command execution."
        )
      );
    }
  }

  if (totalBytes > (options.maxPatchBytes ?? defaultMaxPatchBytes)) {
    errors.push(
      issue(
        "patch_too_large",
        undefined,
        "Patch proposal exceeds the byte limit."
      )
    );
  }

  return {
    ok: errors.length === 0,
    errors: uniqueIssues(errors),
    warnings: uniqueIssues(warnings)
  };
}

export function normalizePatchFileChange(
  change: PatchFileChange,
  options: PatchServiceOptions = {}
): PatchFileChange {
  const pathResult = normalizePatchPath(change.path, options);
  const normalized: PatchFileChange = {
    operation: change.operation,
    path: pathResult.path,
    contentType: change.contentType,
    encoding: change.encoding,
    sizeBytes: change.sizeBytes,
    reason: change.reason,
    sourceRefs: [...change.sourceRefs],
    sensitivity: change.sensitivity
  };

  if (change.oldPath !== undefined) {
    const oldPathResult = normalizePatchPath(change.oldPath, options);
    normalized.oldPath = oldPathResult.path;
  }
  if (change.beforeContent !== undefined) {
    normalized.beforeContent = change.beforeContent;
    normalized.beforeHash =
      change.beforeHash ?? patchSha256(change.beforeContent);
  } else if (change.beforeHash !== undefined) {
    normalized.beforeHash = change.beforeHash;
  }
  if (change.afterContent !== undefined) {
    normalized.afterContent = change.afterContent;
    normalized.afterHash = change.afterHash ?? patchSha256(change.afterContent);
    normalized.sizeBytes = Math.max(
      normalized.sizeBytes,
      byteLengthUtf8(change.afterContent)
    );
  } else if (change.afterHash !== undefined) {
    normalized.afterHash = change.afterHash;
  }
  if (change.noCompress !== undefined) {
    normalized.noCompress = change.noCompress;
  }

  return normalized;
}

export function createPatchEventSummary(
  proposal: PatchProposal,
  decision: string
): PatchEventSummary {
  const operationCounts: Record<PatchOperation, number> = {
    create: 0,
    update: 0,
    delete: 0,
    rename: 0
  };
  const hashes: Record<string, string> = {};
  for (const change of proposal.changes) {
    operationCounts[change.operation] += 1;
    if (change.afterHash !== undefined) {
      hashes[change.path] = change.afterHash;
    } else if (change.beforeHash !== undefined) {
      hashes[change.path] = change.beforeHash;
    }
  }

  const summary: PatchEventSummary = {
    proposalId: proposal.proposalId,
    operationCounts,
    paths: proposal.changes.map((change) => change.path).sort(),
    hashes,
    riskLevel: proposal.riskLevel,
    decision,
    warningCodes: proposal.validation.warnings.map((warning) => warning.kind),
    reasonCodes: proposal.validation.errors.map((error) => error.kind)
  };
  if (proposal.taskId !== undefined) {
    summary.taskId = proposal.taskId;
  }
  if (proposal.agentId !== undefined) {
    summary.agentId = proposal.agentId;
  }
  return summary;
}

function hasBinaryMarker(content: string): boolean {
  return content.includes("\0");
}

function appendPatchEvent(
  options: PatchServiceOptions,
  proposal: PatchProposal,
  type: "patch.proposed" | "patch.validated" | "patch.rejected",
  decision: string
): void {
  if (options.eventStore === undefined) {
    return;
  }
  const input = {
    type,
    taskId: proposal.taskId,
    payload: createPatchEventSummary(proposal, decision)
  };
  if (proposal.agentId !== undefined) {
    options.eventStore.appendEvent({ ...input, agentId: proposal.agentId });
    return;
  }
  options.eventStore.appendEvent(input);
}

function issue(
  kind: PatchValidationIssue["kind"],
  path: string | undefined,
  safeMessage: string
): PatchValidationIssue {
  const result: PatchValidationIssue = { kind, safeMessage };
  if (path !== undefined) {
    result.path = path;
  }
  return result;
}

function uniqueIssues(issues: PatchValidationIssue[]): PatchValidationIssue[] {
  const seen = new Set<string>();
  return issues.filter((item) => {
    const key = `${item.kind}:${item.path ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
