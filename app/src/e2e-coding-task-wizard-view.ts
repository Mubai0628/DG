import {
  buildEndToEndCodingTaskOrchestrator,
  summarizeEndToEndCodingTaskOrchestrator,
  type EndToEndCodingTaskOrchestratorView,
  type EndToEndCodingTaskSummaryRef
} from "../../runtime/src/e2e-task/e2e-task-orchestrator.js";
import { stablePreviewHash } from "../../runtime/src/models/stable-preview-hash.js";
import type { AppControlledCreationReplayProjectionView } from "./controlled-creation-replay-projection-view.js";
import type { LiveDeepSeekProposalGenerationView } from "./live-deepseek-proposal-generation-view.js";
import type { ModelPatchProposalImportView } from "./model-patch-proposal-import-view.js";
import type { ModelProposalChainIntegrationView } from "./model-proposal-chain-integration-view.js";
import type { AppPatchApprovalDraftView } from "./patch-approval-draft-view.js";
import type { AppPatchRollbackCheckpointPreviewView } from "./patch-rollback-checkpoint-preview-view.js";
import type { AppPatchVirtualApplyPreviewView } from "./patch-virtual-apply-preview-view.js";
import type { AppVerificationLaneProjectionView } from "./verification-lane-projection-view.js";

export type E2ECodingTaskWizardStatus =
  | "empty"
  | "preview_ready"
  | "chain_preview_ready"
  | "warning"
  | "blocked";

export type E2ECodingTaskWizardSectionKind =
  | "objective_summary"
  | "live_proposal_status"
  | "proposal_import_status"
  | "chain_integration_status"
  | "approval_readiness"
  | "apply_readiness"
  | "verification_readiness"
  | "rollback_readiness";

export type E2ECodingTaskWizardSectionStatus =
  | "missing"
  | "ready"
  | "warning"
  | "blocked"
  | "disabled";

export type E2ECodingTaskWizardSection = {
  kind: E2ECodingTaskWizardSectionKind;
  label: string;
  status: E2ECodingTaskWizardSectionStatus;
  refId: string;
  summary: string;
  warningCodes: string[];
  blockerCodes: string[];
};

export type E2ECodingTaskWizardFinding = {
  code: string;
  severity: "blocker" | "warning";
  sectionKind?: E2ECodingTaskWizardSectionKind | undefined;
  safeMessage: string;
};

export type E2ECodingTaskWizardReadiness = {
  canPreviewTaskFlow: boolean;
  canRequestLiveProposal: boolean;
  canImportProposalToChain: boolean;
  canAutoApply: false;
  canApplyPatch: false;
  canRollback: false;
  canWriteFilesystem: false;
  canWriteEventStore: false;
  canApprove: false;
  canReject: false;
  canIssuePermissionLease: false;
  canExecuteGit: false;
  canExecuteShell: false;
  appCanExecute: false;
};

export type E2ECodingTaskWizardView = {
  status: E2ECodingTaskWizardStatus;
  wizardId: string;
  objectiveSummary: string;
  orchestratorState: EndToEndCodingTaskOrchestratorView["state"];
  completedStageCount: number;
  missingStageCount: number;
  sectionCount: number;
  readySectionCount: number;
  warningSectionCount: number;
  blockedSectionCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  sections: E2ECodingTaskWizardSection[];
  findings: E2ECodingTaskWizardFinding[];
  orchestratorHash: string;
  wizardHash: string;
  readiness: E2ECodingTaskWizardReadiness;
  nextAction: string;
  source: "app_e2e_coding_task_wizard";
};

export type E2ECodingTaskWizardInput = {
  objectiveSummary?: string | undefined;
  liveProposalGenerationView?: LiveDeepSeekProposalGenerationView | undefined;
  modelPatchProposalImportView?: ModelPatchProposalImportView | undefined;
  modelProposalChainIntegrationView?:
    | ModelProposalChainIntegrationView
    | undefined;
  patchApprovalDraftView?: AppPatchApprovalDraftView | undefined;
  patchVirtualApplyPreviewView?: AppPatchVirtualApplyPreviewView | undefined;
  patchRollbackCheckpointPreviewView?:
    | AppPatchRollbackCheckpointPreviewView
    | undefined;
  verificationLaneProjectionView?:
    | AppVerificationLaneProjectionView
    | undefined;
  replayProjectionView?: AppControlledCreationReplayProjectionView | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

const rawPrefix = "raw";
const reasoningSnakeField = ["reasoning", "_", "content"].join("");
const apiKeyField = ["api", "Key"].join("");
const authHeaderField = ["Author", "ization"].join("");

const forbiddenFieldKeys = new Set(
  [
    rawPrefix + "Prompt",
    rawPrefix + "Response",
    "promptText",
    "responseText",
    "reasoningContent",
    reasoningSnakeField,
    rawPrefix + "Source",
    rawPrefix + "Diff",
    rawPrefix + "Patch",
    "fileContent",
    "preimageContent",
    "backupContent",
    apiKeyField,
    "apiKeyValue",
    authHeaderField,
    "token",
    "secret"
  ].map((field) => field.toLowerCase())
);

const unsafeTextPatterns = [
  {
    code: "API_KEY_MARKER",
    pattern: new RegExp(`\\b${"s"}k-[A-Za-z0-9_-]{8,}\\b`)
  },
  {
    code: "BEARER_TOKEN_MARKER",
    pattern: /\bBearer\s+[A-Za-z0-9._-]{12,}\b/
  },
  {
    code: "AUTHORIZATION_HEADER_MARKER",
    pattern: new RegExp(`\\b${authHeaderField}\\s*[:=]`, "i")
  },
  {
    code: "PRIVATE_KEY_MARKER",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/
  }
] satisfies Array<{ code: string; pattern: RegExp }>;

export function buildE2ECodingTaskWizardView(
  input: E2ECodingTaskWizardInput = {}
): E2ECodingTaskWizardView {
  const objectiveSummary = safeString(input.objectiveSummary);
  const safetyFindings = [
    ...findForbiddenFields(input),
    ...findUnsafeStringMarkers(input)
  ];
  const orchestrator = buildEndToEndCodingTaskOrchestrator({
    objectiveSummary,
    taskRunId: input.idGenerator?.(),
    liveProposalGenerationSummary: liveProposalSummaryForOrchestrator(
      input.liveProposalGenerationView
    ),
    modelProposalImportSummary: importSummaryForOrchestrator(
      input.modelPatchProposalImportView
    ),
    chainIntegrationSummary: chainSummaryForOrchestrator(
      input.modelProposalChainIntegrationView
    ),
    validationAuditApprovalSummary: approvalSummaryForOrchestrator(
      input.patchApprovalDraftView
    ),
    applyResultSummary: applySummaryForOrchestrator(
      input.patchVirtualApplyPreviewView
    ),
    verificationResultSummary: verificationSummaryForOrchestrator(
      input.verificationLaneProjectionView
    ),
    rollbackResultSummary: rollbackSummaryForOrchestrator(
      input.patchRollbackCheckpointPreviewView
    ),
    replaySummary: replaySummaryForOrchestrator(input.replayProjectionView),
    createdAt: input.createdAt
  });
  const sections = buildSections(input, objectiveSummary);
  const orchestratorFindings = orchestrator.findings.map(
    (finding): E2ECodingTaskWizardFinding => ({
      code: finding.code,
      severity: finding.severity,
      safeMessage: finding.safeMessage
    })
  );
  const findings = [...safetyFindings, ...orchestratorFindings];
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const sectionWarningCount = sections.filter(
    (section) => section.status === "warning"
  ).length;
  const warningCount =
    findings.filter((finding) => finding.severity === "warning").length +
    sectionWarningCount +
    orchestrator.warningCount;
  const readySectionCount = sections.filter(
    (section) => section.status === "ready"
  ).length;
  const blockedSectionCount = sections.filter(
    (section) => section.status === "blocked"
  ).length;
  const status = statusFor({
    objectiveSummary,
    input,
    blockerCount,
    warningCount
  });
  const wizardHash = stablePreviewHash(
    JSON.stringify({
      source: "app_e2e_coding_task_wizard",
      status,
      objectiveSummary,
      orchestratorHash: orchestrator.orchestratorHash,
      sections: sections.map((section) => ({
        kind: section.kind,
        status: section.status,
        refId: section.refId,
        warningCodes: section.warningCodes,
        blockerCodes: section.blockerCodes
      })),
      findings: findings.map((finding) => finding.code)
    })
  );
  const canImportProposalToChain =
    input.modelPatchProposalImportView?.readiness.canImportToPatchPreview ===
      true &&
    input.modelProposalChainIntegrationView?.readiness
      .canEnterExistingPreviewChain !== true;

  return {
    status,
    wizardId: `app-e2e-coding-task-wizard-${wizardHash.slice(0, 12)}`,
    objectiveSummary,
    orchestratorState: orchestrator.state,
    completedStageCount: orchestrator.completedStageCount,
    missingStageCount: orchestrator.missingStageCount,
    sectionCount: sections.length,
    readySectionCount,
    warningSectionCount: sections.filter(
      (section) => section.status === "warning"
    ).length,
    blockedSectionCount,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    sections,
    findings,
    orchestratorHash: orchestrator.orchestratorHash,
    wizardHash,
    readiness: {
      canPreviewTaskFlow: blockerCount === 0 && objectiveSummary.length > 0,
      canRequestLiveProposal:
        input.liveProposalGenerationView?.readiness?.canGenerateLiveProposal ===
          true && blockerCount === 0,
      canImportProposalToChain: canImportProposalToChain && blockerCount === 0,
      canAutoApply: false,
      canApplyPatch: false,
      canRollback: false,
      canWriteFilesystem: false,
      canWriteEventStore: false,
      canApprove: false,
      canReject: false,
      canIssuePermissionLease: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    },
    nextAction: nextActionForStatus(status, orchestrator),
    source: "app_e2e_coding_task_wizard"
  };
}

export function summarizeE2ECodingTaskWizardView(
  view: E2ECodingTaskWizardView
): Pick<
  E2ECodingTaskWizardView,
  | "status"
  | "wizardId"
  | "orchestratorState"
  | "completedStageCount"
  | "missingStageCount"
  | "blockerCount"
  | "warningCount"
  | "wizardHash"
  | "readiness"
  | "nextAction"
  | "source"
> {
  return {
    status: view.status,
    wizardId: view.wizardId,
    orchestratorState: view.orchestratorState,
    completedStageCount: view.completedStageCount,
    missingStageCount: view.missingStageCount,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    wizardHash: view.wizardHash,
    readiness: view.readiness,
    nextAction: view.nextAction,
    source: view.source
  };
}

function buildSections(
  input: E2ECodingTaskWizardInput,
  objectiveSummary: string
): E2ECodingTaskWizardSection[] {
  return [
    objectiveSection(objectiveSummary),
    liveProposalSection(input.liveProposalGenerationView),
    proposalImportSection(input.modelPatchProposalImportView),
    chainIntegrationSection(input.modelProposalChainIntegrationView),
    approvalReadinessSection(input.patchApprovalDraftView),
    applyReadinessSection(input.patchVirtualApplyPreviewView),
    verificationReadinessSection(input.verificationLaneProjectionView),
    rollbackReadinessSection(input.patchRollbackCheckpointPreviewView)
  ];
}

function objectiveSection(
  objectiveSummary: string
): E2ECodingTaskWizardSection {
  return {
    kind: "objective_summary",
    label: "Objective summary",
    status: objectiveSummary.length > 0 ? "ready" : "missing",
    refId: objectiveSummary.length > 0 ? "objective" : "n/a",
    summary:
      objectiveSummary.length > 0
        ? safeSnippet(objectiveSummary)
        : "Provide an objective summary before previewing the task flow.",
    warningCodes: [],
    blockerCodes: []
  };
}

function liveProposalSection(
  view: LiveDeepSeekProposalGenerationView | undefined
): E2ECodingTaskWizardSection {
  if (view === undefined || view.status === "empty") {
    return missingSection(
      "live_proposal_status",
      "Live proposal status",
      "No live proposal summary yet. Requesting is explicit and gated."
    );
  }
  return {
    kind: "live_proposal_status",
    label: "Live proposal status",
    status: sectionStatusFromCounts(view.status, view.blockerCount),
    refId: view.flowId,
    summary: `status ${view.status}; proposal ${view.proposalId}; request ${view.requestId}`,
    warningCodes: view.warningCodes,
    blockerCodes: blockerCodesFromFindings(view.findings)
  };
}

function proposalImportSection(
  view: ModelPatchProposalImportView | undefined
): E2ECodingTaskWizardSection {
  if (view === undefined || view.status === "empty") {
    return missingSection(
      "proposal_import_status",
      "Proposal import status",
      "No model proposal import preview yet."
    );
  }
  return {
    kind: "proposal_import_status",
    label: "Proposal import status",
    status: sectionStatusFromCounts(view.status, view.blockerCount),
    refId: view.importId,
    summary: `status ${view.status}; proposal ${view.preview?.proposalId ?? "n/a"}; operations ${view.preview?.operationCount ?? 0}`,
    warningCodes: warningCodesFromFindings(view.findings),
    blockerCodes: blockerCodesFromFindings(view.findings)
  };
}

function chainIntegrationSection(
  view: ModelProposalChainIntegrationView | undefined
): E2ECodingTaskWizardSection {
  if (view === undefined || view.status === "empty") {
    return missingSection(
      "chain_integration_status",
      "Chain integration status",
      "No chain integration preview yet."
    );
  }
  return {
    kind: "chain_integration_status",
    label: "Chain integration status",
    status: sectionStatusFromCounts(view.status, view.blockerCount),
    refId: view.chainId,
    summary: `status ${view.status}; stages ${view.completedStageCount}/${view.stageCount}; proposal ${view.proposalId ?? "n/a"}`,
    warningCodes: warningCodesFromFindings(view.findings),
    blockerCodes: blockerCodesFromFindings(view.findings)
  };
}

function approvalReadinessSection(
  view: AppPatchApprovalDraftView | undefined
): E2ECodingTaskWizardSection {
  if (view === undefined || view.status === "empty") {
    return missingSection(
      "approval_readiness",
      "Approval readiness",
      "Approval draft is not ready yet."
    );
  }
  return {
    kind: "approval_readiness",
    label: "Approval readiness",
    status: sectionStatusFromCounts(view.status, view.blockerCount),
    refId: view.approvalDraftId,
    summary: `status ${view.status}; decision options ${view.decisionOptions.length}`,
    warningCodes: view.warningCodes,
    blockerCodes: blockerCodesFromFindings(view.findings)
  };
}

function applyReadinessSection(
  view: AppPatchVirtualApplyPreviewView | undefined
): E2ECodingTaskWizardSection {
  if (view === undefined || view.status === "empty") {
    return {
      kind: "apply_readiness",
      label: "Apply readiness",
      status: "disabled",
      refId: "app-apply-disabled",
      summary:
        "Apply is not enabled by this wizard. Existing approved gates stay separate.",
      warningCodes: ["APP_APPLY_NOT_ENABLED_BY_WIZARD"],
      blockerCodes: []
    };
  }
  return {
    kind: "apply_readiness",
    label: "Apply readiness",
    status: sectionStatusFromCounts(view.status, view.blockerCount),
    refId: view.virtualApplyId,
    summary: `virtual apply preview ${view.status}; filesystem write remains disabled here`,
    warningCodes: view.warningCodes,
    blockerCodes: blockerCodesFromFindings(view.findings)
  };
}

function verificationReadinessSection(
  view: AppVerificationLaneProjectionView | undefined
): E2ECodingTaskWizardSection {
  if (view === undefined || view.status === "empty") {
    return missingSection(
      "verification_readiness",
      "Verification readiness",
      "Verification safe-lane summary is not ready yet."
    );
  }
  return {
    kind: "verification_readiness",
    label: "Verification readiness",
    status: sectionStatusFromCounts(view.status, 0),
    refId: view.projectionId,
    summary: `status ${view.status}; evidence refs ${view.evidenceRefCount}; shell ${view.latestShellStatus}`,
    warningCodes: view.warningCodes,
    blockerCodes: []
  };
}

function rollbackReadinessSection(
  view: AppPatchRollbackCheckpointPreviewView | undefined
): E2ECodingTaskWizardSection {
  if (view === undefined || view.status === "empty") {
    return missingSection(
      "rollback_readiness",
      "Rollback readiness",
      "Rollback checkpoint preview is not ready yet."
    );
  }
  return {
    kind: "rollback_readiness",
    label: "Rollback readiness",
    status: sectionStatusFromCounts(view.status, view.blockerCount),
    refId: view.checkpointPreviewId,
    summary: `checkpoint preview ${view.status}; rollback remains gated separately`,
    warningCodes: view.warningCodes,
    blockerCodes: blockerCodesFromFindings(view.findings)
  };
}

function liveProposalSummaryForOrchestrator(
  view: LiveDeepSeekProposalGenerationView | undefined
): EndToEndCodingTaskSummaryRef | undefined {
  if (
    view === undefined ||
    view.status === "empty" ||
    view.status === "ready"
  ) {
    return undefined;
  }
  return {
    refId: view.flowId,
    status: view.status,
    summary: `live proposal ${view.status}`,
    warningCodes: view.warningCodes,
    blockerCodes: blockerCodesFromFindings(view.findings),
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    readiness: {
      canApplyPatch: false,
      canWriteEventStore: false,
      appCanExecute: false
    }
  };
}

function importSummaryForOrchestrator(
  view: ModelPatchProposalImportView | undefined
): EndToEndCodingTaskSummaryRef | undefined {
  if (view === undefined || view.status === "empty") {
    return undefined;
  }
  return {
    refId: view.importId,
    status: view.status,
    summary: `model import ${view.status}`,
    warningCodes: warningCodesFromFindings(view.findings),
    blockerCodes: blockerCodesFromFindings(view.findings),
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    readiness: {
      canApplyPatch: false,
      canWriteEventStore: false,
      appCanExecute: false
    }
  };
}

function chainSummaryForOrchestrator(
  view: ModelProposalChainIntegrationView | undefined
): EndToEndCodingTaskSummaryRef | undefined {
  if (view === undefined || view.status === "empty") {
    return undefined;
  }
  return {
    refId: view.chainId,
    status: view.status,
    summary: `chain ${view.status}`,
    warningCodes: warningCodesFromFindings(view.findings),
    blockerCodes: blockerCodesFromFindings(view.findings),
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    readiness: {
      canApplyPatch: false,
      canWriteEventStore: false,
      appCanExecute: false
    }
  };
}

function approvalSummaryForOrchestrator(
  view: AppPatchApprovalDraftView | undefined
): EndToEndCodingTaskSummaryRef | undefined {
  if (view === undefined || view.status === "empty") {
    return undefined;
  }
  return {
    refId: view.approvalDraftId,
    status: view.status,
    summary: `approval ${view.status}`,
    warningCodes: view.warningCodes,
    blockerCodes: blockerCodesFromFindings(view.findings),
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    readiness: {
      canApplyPatch: false,
      canWriteEventStore: false,
      appCanExecute: false
    }
  };
}

function applySummaryForOrchestrator(
  view: AppPatchVirtualApplyPreviewView | undefined
): EndToEndCodingTaskSummaryRef | undefined {
  if (view === undefined || view.status === "empty") {
    return undefined;
  }
  return {
    refId: view.virtualApplyId,
    status: view.status,
    summary: `virtual apply preview ${view.status}`,
    warningCodes: view.warningCodes,
    blockerCodes: blockerCodesFromFindings(view.findings),
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    readiness: {
      canApplyPatch: false,
      canWriteEventStore: false,
      appCanExecute: false
    }
  };
}

function verificationSummaryForOrchestrator(
  view: AppVerificationLaneProjectionView | undefined
): EndToEndCodingTaskSummaryRef | undefined {
  if (view === undefined || view.status === "empty") {
    return undefined;
  }
  return {
    refId: view.projectionId,
    status:
      view.latestShellStatus === "fail" ? "verification_failed" : view.status,
    summary: `verification ${view.status}`,
    warningCodes: view.warningCodes,
    blockerCodes: [],
    blockerCount: 0,
    warningCount: view.warningCount,
    readiness: {
      canApplyPatch: false,
      canWriteEventStore: false,
      appCanExecute: false
    }
  };
}

function rollbackSummaryForOrchestrator(
  view: AppPatchRollbackCheckpointPreviewView | undefined
): EndToEndCodingTaskSummaryRef | undefined {
  if (view === undefined || view.status === "empty") {
    return undefined;
  }
  return {
    refId: view.checkpointPreviewId,
    status: view.status,
    summary: `rollback checkpoint ${view.status}`,
    warningCodes: view.warningCodes,
    blockerCodes: blockerCodesFromFindings(view.findings),
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    readiness: {
      canApplyPatch: false,
      canWriteEventStore: false,
      appCanExecute: false
    }
  };
}

function replaySummaryForOrchestrator(
  view: AppControlledCreationReplayProjectionView | undefined
): EndToEndCodingTaskSummaryRef | undefined {
  if (view === undefined || view.status === "empty") {
    return undefined;
  }
  return {
    refId: view.projectionId,
    status: view.status,
    summary: `replay ${view.status}`,
    warningCodes: view.warningCodes,
    blockerCodes: [],
    blockerCount: 0,
    warningCount: view.warningCount,
    readiness: {
      canApplyPatch: false,
      canWriteEventStore: false,
      appCanExecute: false
    }
  };
}

function statusFor(input: {
  objectiveSummary: string;
  input: E2ECodingTaskWizardInput;
  blockerCount: number;
  warningCount: number;
}): E2ECodingTaskWizardStatus {
  if (input.blockerCount > 0) {
    return "blocked";
  }
  if (
    input.objectiveSummary.length === 0 &&
    input.input.liveProposalGenerationView === undefined &&
    input.input.modelPatchProposalImportView === undefined &&
    input.input.modelProposalChainIntegrationView === undefined
  ) {
    return "empty";
  }
  if (input.warningCount > 0) {
    return "warning";
  }
  if (
    input.input.modelProposalChainIntegrationView?.readiness
      .canEnterExistingPreviewChain === true
  ) {
    return "chain_preview_ready";
  }
  return "preview_ready";
}

function nextActionForStatus(
  status: E2ECodingTaskWizardStatus,
  orchestrator: EndToEndCodingTaskOrchestratorView
): string {
  if (status === "empty") {
    return "Enter an objective summary and preview the task flow.";
  }
  if (status === "blocked") {
    return "Resolve blockers before the task wizard can advance.";
  }
  if (status === "chain_preview_ready") {
    return "Review chain readiness, then continue through separate human approval and approved apply gates.";
  }
  if (status === "warning") {
    return `Review warnings before advancing. ${summarizeEndToEndCodingTaskOrchestrator(orchestrator).nextAction}`;
  }
  return orchestrator.nextAction;
}

function missingSection(
  kind: E2ECodingTaskWizardSectionKind,
  label: string,
  summary: string
): E2ECodingTaskWizardSection {
  return {
    kind,
    label,
    status: "missing",
    refId: "n/a",
    summary,
    warningCodes: [],
    blockerCodes: []
  };
}

function sectionStatusFromCounts(
  status: string,
  blockerCount: number
): E2ECodingTaskWizardSectionStatus {
  const normalized = status.toLowerCase();
  if (blockerCount > 0 || normalized.includes("blocked")) {
    return "blocked";
  }
  if (normalized.includes("warning") || normalized.includes("partial")) {
    return "warning";
  }
  if (normalized.includes("disabled")) {
    return "disabled";
  }
  return "ready";
}

function warningCodesFromFindings(
  findings: Array<{ severity: string; code: string }> | undefined
): string[] {
  return Array.from(
    new Set(
      findings
        ?.filter((finding) => finding.severity === "warning")
        .map((finding) => finding.code) ?? []
    )
  );
}

function blockerCodesFromFindings(
  findings: Array<{ severity: string; code: string }> | undefined
): string[] {
  return Array.from(
    new Set(
      findings
        ?.filter((finding) => finding.severity === "blocker")
        .map((finding) => finding.code) ?? []
    )
  );
}

function findForbiddenFields(
  value: unknown,
  path = "$"
): E2ECodingTaskWizardFinding[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      findForbiddenFields(item, `${path}[${index}]`)
    );
  }
  if (!isRecord(value)) {
    return [];
  }
  return Object.entries(value).flatMap(([key, child]) => {
    const findings: E2ECodingTaskWizardFinding[] = [];
    if (forbiddenFieldKeys.has(key.toLowerCase())) {
      findings.push({
        code: codeForForbiddenKey(key),
        severity: "blocker",
        safeMessage:
          "Raw, secret, or unsafe field is not allowed in the E2E task wizard.",
        sectionKind: undefined
      });
    }
    return [...findings, ...findForbiddenFields(child, `${path}.${key}`)];
  });
}

function findUnsafeStringMarkers(value: unknown): E2ECodingTaskWizardFinding[] {
  if (typeof value === "string") {
    return unsafeTextPatterns
      .filter(({ pattern }) => pattern.test(value))
      .map(({ code }) => ({
        code,
        severity: "blocker" as const,
        safeMessage: "Secret-like marker is not allowed in the E2E task wizard."
      }));
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => findUnsafeStringMarkers(item));
  }
  if (!isRecord(value)) {
    return [];
  }
  return Object.values(value).flatMap((child) =>
    findUnsafeStringMarkers(child)
  );
}

function codeForForbiddenKey(key: string): string {
  const normalized = key.toLowerCase();
  if (normalized.includes("prompt")) {
    return "RAW_PROMPT_FIELD_REJECTED";
  }
  if (normalized.includes("response")) {
    return "RAW_RESPONSE_FIELD_REJECTED";
  }
  if (normalized.includes("reasoning")) {
    return "REASONING_CONTENT_FIELD_REJECTED";
  }
  if (normalized.includes("source")) {
    return "RAW_SOURCE_FIELD_REJECTED";
  }
  if (normalized.includes("diff")) {
    return "RAW_DIFF_FIELD_REJECTED";
  }
  if (normalized.includes("key") || normalized.includes("authorization")) {
    return "API_KEY_FIELD_REJECTED";
  }
  return "UNSAFE_FIELD_REJECTED";
}

function safeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function safeSnippet(value: string): string {
  return value.length <= 140 ? value : `${value.slice(0, 137)}...`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
