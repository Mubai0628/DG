import {
  validateProjectKnowledgeCandidate,
  type ProjectKnowledgeCandidateValidationResult
} from "../../runtime/src/memory/index.js";
import { stablePreviewHash } from "../../runtime/src/models/stable-preview-hash.js";
import type {
  ProjectKnowledgeCandidate as DesktopProjectKnowledgeCandidate,
  ProjectKnowledgeCommitResult,
  ProjectKnowledgeEntrySummary,
  ProjectKnowledgeLifecycleResult,
  ProjectKnowledgeSnapshotResult
} from "./desktop-flow.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type ProjectKnowledgeReviewStatus =
  | "empty"
  | "candidate_ready"
  | "warning"
  | "blocked";

export type ProjectKnowledgeEntryType = "policy" | "project_fact" | "pitfall";

export type ProjectKnowledgeReviewFinding = {
  code: string;
  severity: "blocker" | "warning";
  safeMessage: string;
};

export type ProjectKnowledgeCandidateForm = {
  type: ProjectKnowledgeEntryType;
  namespace: string;
  summary: string;
  evidenceRefsText: string;
  tagsText?: string | undefined;
  trustLevel: "low" | "medium" | "high" | "trusted";
  trustScore: number;
  humanReviewed: boolean;
  reviewedBy?: string | undefined;
  sourceKind:
    | "human_reviewed"
    | "repo_doc_summary"
    | "manual_import_summary"
    | "model_suggested"
    | "tool_output_summary"
    | "external_summary";
  policyScope?: string | undefined;
  factKind?: string | undefined;
  triggerSummary?: string | undefined;
  mitigationSummary?: string | undefined;
  severity?: "low" | "medium" | "high" | undefined;
  pinned?: boolean | undefined;
};

export type ProjectKnowledgeReviewReadiness = {
  canPreviewCandidate: boolean;
  canCommitCandidate: boolean;
  canRefreshProjectKnowledge: boolean;
  canRevokeEntry: boolean;
  canExpireEntry: boolean;
  canAutoCommitFromModel: false;
  canAutoCommitFromTool: false;
  canRunMemoryTriggeredApply: false;
  canWriteEventStoreRawContent: false;
  canUseGenericInvoke: false;
  canUseLocalStorage: false;
  canUseSessionStorage: false;
  canApplyPatch: false;
  canRollback: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type ProjectKnowledgeReviewView = {
  status: ProjectKnowledgeReviewStatus;
  source: "app_project_knowledge_review_surface";
  workspaceReady: boolean;
  snapshot?: ProjectKnowledgeSnapshotResult | undefined;
  snapshotSummary: {
    entryCount: number;
    activeEntryCount: number;
    revokedEntryCount: number;
    expiredEntryCount: number;
    warningCount: number;
    snapshotHash?: string | undefined;
  };
  candidate?: DesktopProjectKnowledgeCandidate | undefined;
  candidateSummary?: ProjectKnowledgeEntrySummary | undefined;
  candidateValidation?: ProjectKnowledgeCandidateValidationResult | undefined;
  requiredConfirmation: "COMMIT PROJECT POLICY" | "COMMIT PROJECT KNOWLEDGE";
  typedConfirmationAccepted: boolean;
  revokeConfirmationAccepted: boolean;
  expireReasonReady: boolean;
  latestCommit?: ProjectKnowledgeCommitResult | undefined;
  latestLifecycle?: ProjectKnowledgeLifecycleResult | undefined;
  findings: ProjectKnowledgeReviewFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  reviewHash: string;
  hashPrefix: string;
  readiness: ProjectKnowledgeReviewReadiness;
  nextAction: string;
};

export type ProjectKnowledgeReviewViewInput = {
  workspaceRoot?: string | undefined;
  candidateForm?: ProjectKnowledgeCandidateForm | undefined;
  typedConfirmation?: string | undefined;
  revokeEntryId?: string | undefined;
  revokeTypedConfirmation?: string | undefined;
  expireEntryId?: string | undefined;
  expireReasonSummary?: string | undefined;
  snapshot?: ProjectKnowledgeSnapshotResult | undefined;
  latestCommit?: ProjectKnowledgeCommitResult | undefined;
  latestLifecycle?: ProjectKnowledgeLifecycleResult | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

const sourceKinds = new Set<ProjectKnowledgeCandidateForm["sourceKind"]>([
  "human_reviewed",
  "repo_doc_summary",
  "manual_import_summary",
  "model_suggested",
  "tool_output_summary",
  "external_summary"
]);

const evidenceKinds = new Set([
  "user_request",
  "repo_doc",
  "test_summary",
  "manual_note",
  "event_summary",
  "memory_summary",
  "tool_summary"
]);

export function buildProjectKnowledgeReviewView(
  input: ProjectKnowledgeReviewViewInput = {}
): ProjectKnowledgeReviewView {
  const workspaceReady = safeText(input.workspaceRoot, "").length > 0;
  const findings: ProjectKnowledgeReviewFinding[] = [];
  const requiredConfirmation =
    input.candidateForm?.type === "policy"
      ? "COMMIT PROJECT POLICY"
      : "COMMIT PROJECT KNOWLEDGE";
  const typedConfirmationAccepted =
    input.typedConfirmation === requiredConfirmation;
  const revokeConfirmationAccepted =
    input.revokeTypedConfirmation === "REVOKE PROJECT KNOWLEDGE";
  const expireReasonReady = safeText(input.expireReasonSummary, "").length > 0;

  let candidate: DesktopProjectKnowledgeCandidate | undefined;
  let candidateValidation:
    | ProjectKnowledgeCandidateValidationResult
    | undefined;
  let candidateSummary: ProjectKnowledgeEntrySummary | undefined;

  if (input.candidateForm !== undefined) {
    const candidateBuild = buildCandidate(input.candidateForm, input);
    findings.push(...candidateBuild.findings);
    candidate = candidateBuild.candidate;
    candidateValidation = candidateBuild.validation;
    candidateSummary = candidateBuild.summary;
    findings.push(...candidateBuild.validationFindings);
  }

  const hasCandidateInput =
    input.candidateForm !== undefined &&
    (safeText(input.candidateForm.summary, "").length > 0 ||
      safeText(input.candidateForm.evidenceRefsText, "").length > 0);
  const validationStatus = candidateValidation?.status;
  const candidateBlocked =
    candidateValidation !== undefined && candidateValidation.blockerCount > 0;
  const candidateWarnings = candidateValidation?.warningCount ?? 0;
  const candidateReady =
    candidate !== undefined &&
    candidateValidation?.status === "valid" &&
    typedConfirmationAccepted &&
    workspaceReady &&
    input.candidateForm?.humanReviewed === true &&
    policySourceIsAllowed(input.candidateForm);

  if (!workspaceReady && hasCandidateInput) {
    findings.push(finding("WORKSPACE_REQUIRED", "blocker"));
  }
  if (input.candidateForm?.type === "policy" && !typedConfirmationAccepted) {
    findings.push(finding("POLICY_CONFIRMATION_REQUIRED", "warning"));
  }
  if (
    input.candidateForm !== undefined &&
    input.candidateForm.humanReviewed !== true
  ) {
    findings.push(finding("HUMAN_REVIEW_REQUIRED", "blocker"));
  }
  if (
    input.candidateForm !== undefined &&
    !policySourceIsAllowed(input.candidateForm)
  ) {
    findings.push(finding("POLICY_SOURCE_MUST_BE_HUMAN_REVIEWED", "blocker"));
  }

  const blockerCount = findings.filter(
    (item) => item.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (item) => item.severity === "warning"
  ).length;
  const status: ProjectKnowledgeReviewStatus =
    !hasCandidateInput && input.snapshot === undefined
      ? "empty"
      : blockerCount > 0 || candidateBlocked
        ? "blocked"
        : candidateWarnings > 0 ||
            warningCount > 0 ||
            validationStatus === "warning"
          ? "warning"
          : "candidate_ready";
  const canRevokeEntry =
    workspaceReady &&
    safeText(input.revokeEntryId, "").length > 0 &&
    revokeConfirmationAccepted;
  const canExpireEntry =
    workspaceReady &&
    safeText(input.expireEntryId, "").length > 0 &&
    expireReasonReady;
  const reviewHash = stablePreviewHash(
    JSON.stringify({
      source: "app_project_knowledge_review_surface",
      status,
      candidateHash: candidateValidation?.summary.candidateHash,
      snapshotHash: input.snapshot?.snapshotHash,
      blockerCount,
      warningCount
    })
  );

  return {
    status,
    source: "app_project_knowledge_review_surface",
    workspaceReady,
    ...(input.snapshot !== undefined ? { snapshot: input.snapshot } : {}),
    snapshotSummary: {
      entryCount: input.snapshot?.entryCount ?? 0,
      activeEntryCount: input.snapshot?.activeEntryCount ?? 0,
      revokedEntryCount: input.snapshot?.revokedEntryCount ?? 0,
      expiredEntryCount: input.snapshot?.expiredEntryCount ?? 0,
      warningCount: input.snapshot?.warnings.length ?? 0,
      ...(input.snapshot?.snapshotHash !== undefined
        ? { snapshotHash: input.snapshot.snapshotHash }
        : {})
    },
    ...(candidate !== undefined ? { candidate } : {}),
    ...(candidateSummary !== undefined ? { candidateSummary } : {}),
    ...(candidateValidation !== undefined ? { candidateValidation } : {}),
    requiredConfirmation,
    typedConfirmationAccepted,
    revokeConfirmationAccepted,
    expireReasonReady,
    ...(input.latestCommit !== undefined
      ? { latestCommit: input.latestCommit }
      : {}),
    ...(input.latestLifecycle !== undefined
      ? { latestLifecycle: input.latestLifecycle }
      : {}),
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    reviewHash,
    hashPrefix: reviewHash.slice(0, 12),
    readiness: {
      canPreviewCandidate: hasCandidateInput,
      canCommitCandidate: candidateReady,
      canRefreshProjectKnowledge: workspaceReady,
      canRevokeEntry,
      canExpireEntry,
      canAutoCommitFromModel: false,
      canAutoCommitFromTool: false,
      canRunMemoryTriggeredApply: false,
      canWriteEventStoreRawContent: false,
      canUseGenericInvoke: false,
      canUseLocalStorage: false,
      canUseSessionStorage: false,
      canApplyPatch: false,
      canRollback: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    },
    nextAction: nextActionFor(status, candidateReady, workspaceReady)
  };
}

export function summarizeProjectKnowledgeReviewView(
  view: ProjectKnowledgeReviewView
): {
  status: ProjectKnowledgeReviewStatus;
  entryCount: number;
  activeEntryCount: number;
  candidateType?: ProjectKnowledgeEntryType | undefined;
  blockerCount: number;
  warningCount: number;
  hashPrefix: string;
  summaryOnly: true;
  source: "app_project_knowledge_review_surface_summary";
} {
  return {
    status: view.status,
    entryCount: view.snapshotSummary.entryCount,
    activeEntryCount: view.snapshotSummary.activeEntryCount,
    ...(view.candidate?.type !== undefined
      ? { candidateType: view.candidate.type }
      : {}),
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    hashPrefix: view.hashPrefix,
    summaryOnly: true,
    source: "app_project_knowledge_review_surface_summary"
  };
}

function buildCandidate(
  form: ProjectKnowledgeCandidateForm,
  input: ProjectKnowledgeReviewViewInput
): {
  candidate?: DesktopProjectKnowledgeCandidate | undefined;
  validation?: ProjectKnowledgeCandidateValidationResult | undefined;
  summary?: ProjectKnowledgeEntrySummary | undefined;
  findings: ProjectKnowledgeReviewFinding[];
  validationFindings: ProjectKnowledgeReviewFinding[];
} {
  const findings: ProjectKnowledgeReviewFinding[] = [];
  const evidenceRefs = parseEvidenceRefs(form.evidenceRefsText, findings);
  const tags = splitList(form.tagsText);
  const sourceKind = sourceKinds.has(form.sourceKind)
    ? form.sourceKind
    : "external_summary";
  const candidate: DesktopProjectKnowledgeCandidate = {
    type: form.type,
    namespace: safeText(form.namespace, ""),
    summary: safeText(form.summary, ""),
    trust: {
      score: clampScore(form.trustScore),
      level: form.trustLevel,
      humanReviewed: form.humanReviewed,
      ...(safeText(form.reviewedBy, "").length > 0
        ? { reviewedBy: safeText(form.reviewedBy, "") }
        : {})
    },
    provenance: {
      sourceKind,
      actor: "manual_user_review",
      summary: `Human reviewed ${form.type} candidate`,
      refHashes: evidenceRefs.map((ref) => ref.hashPrefix)
    },
    evidenceRefs,
    tags,
    pinned: form.pinned === true
  };

  if (form.type === "policy") {
    candidate.policyScope = safeText(form.policyScope, "project");
    candidate.sourceKind =
      sourceKind === "human_reviewed" ||
      sourceKind === "repo_doc_summary" ||
      sourceKind === "manual_import_summary"
        ? sourceKind
        : "human_reviewed";
  }
  if (form.type === "project_fact") {
    candidate.factKind = safeText(form.factKind, "project_fact");
  }
  if (form.type === "pitfall") {
    candidate.triggerSummary = safeText(form.triggerSummary, "");
    candidate.mitigationSummary = safeText(form.mitigationSummary, "");
    candidate.severity = form.severity ?? "medium";
  }

  const candidateHash = stablePreviewHash(JSON.stringify(candidate));
  const candidateId =
    input.idGenerator?.() ??
    `project-knowledge-candidate-${candidateHash.slice(0, 12)}`;
  const validation = validateProjectKnowledgeCandidate(
    {
      ...candidate,
      candidateId,
      candidateHash,
      createdAt: input.createdAt ?? "app-preview-created-at"
    },
    {
      createdAt: input.createdAt,
      idGenerator: input.idGenerator
    }
  );
  return {
    candidate,
    validation,
    summary:
      validation.status === "blocked"
        ? undefined
        : {
            entryId: candidateId,
            type: candidate.type,
            namespace: candidate.namespace,
            summary: safeErrorMessage(candidate.summary),
            status: "candidate",
            evidenceRefCount: candidate.evidenceRefs.length,
            tagCount: candidate.tags?.length ?? 0,
            entryHash: candidateHash,
            warningCodes: validation.findings
              .filter((item) => item.severity === "warning")
              .map((item) => item.code),
            summaryOnly: true
          },
    findings,
    validationFindings: validation.findings.map((item) => ({
      code: item.code,
      severity: item.severity,
      safeMessage: item.safeMessage
    }))
  };
}

function parseEvidenceRefs(
  text: string,
  findings: ProjectKnowledgeReviewFinding[]
): DesktopProjectKnowledgeCandidate["evidenceRefs"] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line, index) => {
      const parts = line.split("|").map((part) => part.trim());
      const [first, second, third, fourth] = parts;
      const hasStructuredParts = parts.length >= 3;
      const refId = hasStructuredParts
        ? safeText(first, `evidence-${index + 1}`)
        : `evidence-${index + 1}`;
      const kind = hasStructuredParts
        ? safeText(second, "manual_note")
        : "manual_note";
      const summary = hasStructuredParts ? safeText(third, "") : line;
      const hashPrefix =
        hasStructuredParts && safeText(fourth, "").length > 0
          ? safeText(fourth, "")
          : stablePreviewHash(summary).slice(0, 16);
      if (!evidenceKinds.has(kind)) {
        findings.push(finding("EVIDENCE_KIND_UNSUPPORTED", "blocker"));
      }
      return {
        refId,
        kind,
        summary,
        hashPrefix,
        warningCodes: [] as string[]
      };
    });
}

function splitList(text: string | undefined): string[] {
  return safeText(text, "")
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function clampScore(score: number): number {
  return Number.isFinite(score) ? Math.max(0, Math.min(1, score)) : 0;
}

function policySourceIsAllowed(
  form: ProjectKnowledgeCandidateForm | undefined
): boolean {
  if (form?.type !== "policy") {
    return true;
  }
  return (
    form.sourceKind === "human_reviewed" &&
    form.humanReviewed === true &&
    safeText(form.policyScope, "").length > 0
  );
}

function nextActionFor(
  status: ProjectKnowledgeReviewStatus,
  canCommitCandidate: boolean,
  workspaceReady: boolean
): string {
  if (!workspaceReady) {
    return "Enter a workspace root before reading or committing project knowledge.";
  }
  if (canCommitCandidate) {
    return "Commit the human-reviewed candidate with the fixed project knowledge command.";
  }
  if (status === "blocked") {
    return "Resolve blockers before committing project knowledge.";
  }
  if (status === "warning") {
    return "Review warnings and confirmation text before committing.";
  }
  if (status === "empty") {
    return "Refresh project knowledge or draft a candidate summary.";
  }
  return "Preview is ready for human review.";
}

function finding(
  code: string,
  severity: "blocker" | "warning"
): ProjectKnowledgeReviewFinding {
  return {
    code,
    severity,
    safeMessage: code
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/^\w/, (value) => value.toUpperCase())
  };
}
