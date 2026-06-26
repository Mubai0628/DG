import {
  buildSandboxApplyRollbackEventProjection,
  type SandboxApplyRollbackEventEnvelope,
  type SandboxApplyRollbackEventProjection,
  type SandboxApplyRollbackProjectionFinding,
  type SandboxApplyRollbackProjectionReadiness,
  type SandboxApplyRollbackProjectionStage,
  type SandboxApplyRollbackProjectionStatus
} from "../../runtime/src/execution/sandbox/apply-rollback-event-projection.js";
import { safeArray, safeErrorMessage } from "./safety.js";
import type {
  AppWorkbenchApprovalRef,
  AppWorkbenchSurfacesInput
} from "./workbench-surfaces.js";

export type AppSandboxApplyRollbackEventProjectionStatus =
  SandboxApplyRollbackProjectionStatus;

export type AppSandboxApplyRollbackEventEnvelopeView =
  SandboxApplyRollbackEventEnvelope;

export type AppSandboxApplyRollbackProjectionStageView =
  SandboxApplyRollbackProjectionStage;

export type AppSandboxApplyRollbackProjectionFindingView = {
  findingId: string;
  kind: SandboxApplyRollbackProjectionFinding["kind"];
  severity: SandboxApplyRollbackProjectionFinding["severity"];
  code: string;
  summary: string;
  relatedRef?: string | undefined;
};

export type AppSandboxApplyRollbackEventProjectionView = {
  status: AppSandboxApplyRollbackEventProjectionStatus;
  projectionId: string;
  chainId: string;
  eventCount: number;
  applyEventCount: number;
  rollbackEventCount: number;
  existingPersistedEventCount: number;
  notWrittenEventCount: number;
  stageCount: number;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  stages: AppSandboxApplyRollbackProjectionStageView[];
  eventPreviews: AppSandboxApplyRollbackEventEnvelopeView[];
  findings: AppSandboxApplyRollbackProjectionFindingView[];
  warningCodes: string[];
  hashChainSummary: SandboxApplyRollbackEventProjection["hashChainSummary"];
  readiness: SandboxApplyRollbackProjectionReadiness;
  projectionHash: string;
  nextAction: string;
  source: "runtime_sandbox_apply_rollback_event_projection" | "empty";
  projectionOnly: true;
  eventWritesEnabled: false;
  applyExecutionEnabled: false;
  rollbackExecutionEnabled: false;
  userWorkspaceMutationEnabled: false;
  tauriCommandEnabled: false;
  fileReadEnabled: false;
  fileWriteEnabled: false;
  gitExecutionEnabled: false;
  shellExecutionEnabled: false;
};

export type AppSandboxApplyRollbackEventProjectionInput = {
  disposablePatchApplyResult?: unknown;
  disposablePatchRollbackResult?: unknown;
  snapshotContract?: unknown;
  patchProposalPreview?: unknown;
  patchValidationPreview?: unknown;
  patchDiffAuditPreview?: unknown;
  patchApprovalDraft?: unknown;
  patchVirtualApplyPreview?: unknown;
  patchRollbackCheckpointPreview?: unknown;
  existingEventSummary?: unknown;
};

export function buildSandboxApplyRollbackEventProjectionView(
  input: AppSandboxApplyRollbackEventProjectionInput = {}
): AppSandboxApplyRollbackEventProjectionView {
  return appViewFromRuntimeProjection(
    buildSandboxApplyRollbackEventProjection({
      disposablePatchApplyResult: summaryOrUndefined(
        input.disposablePatchApplyResult
      ),
      disposablePatchRollbackResult: summaryOrUndefined(
        input.disposablePatchRollbackResult
      ),
      snapshotContract: summaryOrUndefined(input.snapshotContract),
      patchProposalPreview: summaryOrUndefined(input.patchProposalPreview),
      patchValidationPreview: summaryOrUndefined(input.patchValidationPreview),
      patchDiffAuditPreview: summaryOrUndefined(input.patchDiffAuditPreview),
      patchApprovalDraft: summaryOrUndefined(input.patchApprovalDraft),
      patchVirtualApplyPreview: summaryOrUndefined(
        input.patchVirtualApplyPreview
      ),
      patchRollbackCheckpointPreview: summaryOrUndefined(
        input.patchRollbackCheckpointPreview
      ),
      existingEventSummary: input.existingEventSummary
    })
  );
}

export function sandboxApplyRollbackEventProjectionSurfaceSummaries(
  view: AppSandboxApplyRollbackEventProjectionView | undefined
): AppWorkbenchSurfacesInput["patchProposalSummaries"] {
  if (view === undefined || view.status === "empty") {
    return [];
  }
  return [
    {
      proposalId: `sandbox-event-projection-${view.projectionId}`,
      taskId: view.chainId,
      title: "Sandbox apply/rollback event projection",
      status: `sandbox_event_projection_${view.status}`,
      riskLevel: "A1_read",
      requiresApproval: view.warningCount > 0 || view.blockerCount > 0,
      filesChanged: 0,
      filesCreated: 0,
      filesUpdated: 0,
      filesDeleted: 0,
      linesAdded: 0,
      linesRemoved: 0,
      pathSummaries: view.eventPreviews.map((event) => event.type),
      warningCodes: [
        `SANDBOX_EVENT_PROJECTION_STATUS_${view.status.toUpperCase()}`,
        ...view.warningCodes
      ],
      hash: view.projectionHash,
      fingerprint: view.hashChainSummary.chainHash,
      suggestedNextAction:
        "Review the sandbox apply/rollback event projection only. Events are not written and apply/rollback is not executed."
    }
  ];
}

export function sandboxApplyRollbackEventProjectionApprovalRefs(
  view: AppSandboxApplyRollbackEventProjectionView | undefined
): AppWorkbenchApprovalRef[] {
  if (
    view === undefined ||
    view.status === "empty" ||
    (view.blockerCount === 0 && view.warningCount === 0)
  ) {
    return [];
  }
  return [
    {
      id: `sandbox-event-projection-${view.projectionId}`,
      label: "Sandbox apply/rollback event projection",
      kind: "patch",
      status: view.blockerCount > 0 ? "blocked" : "dry",
      summary:
        "Sandbox event projection is read-only. Event writes, apply, rollback, and execution are disabled in this phase."
    }
  ];
}

export function sandboxApplyRollbackEventProjectionWarningCodes(
  view: AppSandboxApplyRollbackEventProjectionView | undefined
): string[] {
  if (view === undefined || view.status === "empty") {
    return [];
  }
  return [
    `SANDBOX_EVENT_PROJECTION_EVENTS_${view.eventCount}`,
    `SANDBOX_EVENT_PROJECTION_NOT_WRITTEN_${view.notWrittenEventCount}`,
    `SANDBOX_EVENT_PROJECTION_BLOCKERS_${view.blockerCount}`,
    `SANDBOX_EVENT_PROJECTION_WARNINGS_${view.warningCount}`,
    `SANDBOX_EVENT_PROJECTION_STATUS_${view.status.toUpperCase()}`,
    ...view.warningCodes
  ];
}

export function summarizeSandboxApplyRollbackEventProjectionView(
  view: AppSandboxApplyRollbackEventProjectionView
): string {
  if (view.status === "empty") {
    return "No sandbox apply/rollback event projection is available.";
  }
  return [
    `status:${view.status}`,
    `events:${view.eventCount}`,
    `not_written:${view.notWrittenEventCount}`,
    `apply:${view.applyEventCount}`,
    `rollback:${view.rollbackEventCount}`,
    `hash:${view.hashChainSummary.chainHash}`
  ].join(" | ");
}

function appViewFromRuntimeProjection(
  projection: SandboxApplyRollbackEventProjection
): AppSandboxApplyRollbackEventProjectionView {
  const findings = projection.findings.map((finding) => ({
    findingId: finding.findingId,
    kind: finding.kind,
    severity: finding.severity,
    code: finding.code,
    summary: safeErrorMessage(finding.summary),
    relatedRef: finding.relatedRef
  }));
  return {
    status: projection.status,
    projectionId: projection.projectionId,
    chainId: projection.chainId,
    eventCount: projection.eventCount,
    applyEventCount: projection.applyEventCount,
    rollbackEventCount: projection.rollbackEventCount,
    existingPersistedEventCount: projection.existingPersistedEventCount,
    notWrittenEventCount: projection.notWrittenEventCount,
    stageCount: projection.stageCount,
    blockerCount: projection.blockerCount,
    warningCount: projection.warningCount,
    findingCount: projection.findingCount,
    stages: projection.stages.map((stage) => ({
      ...stage,
      eventTypeRefs: [...stage.eventTypeRefs],
      warningCodes: [...stage.warningCodes],
      relatedIds: { ...stage.relatedIds }
    })),
    eventPreviews: projection.eventPreviews.map((event) => ({
      ...event,
      relatedIds: { ...event.relatedIds },
      payloadSummary: { ...event.payloadSummary },
      warningCodes: [...event.warningCodes]
    })),
    findings,
    warningCodes: [
      ...new Set([
        ...findings.map((finding) => finding.code),
        ...safeArray(projection.hashChainSummary.warningCodes).filter(
          (code): code is string => typeof code === "string"
        )
      ])
    ],
    hashChainSummary: {
      ...projection.hashChainSummary,
      eventHashPrefixes: [...projection.hashChainSummary.eventHashPrefixes],
      warningCodes: [...projection.hashChainSummary.warningCodes]
    },
    readiness: { ...projection.readiness },
    projectionHash: projection.projectionHash,
    nextAction: projection.nextAction,
    source:
      projection.status === "empty"
        ? "empty"
        : "runtime_sandbox_apply_rollback_event_projection",
    projectionOnly: true,
    eventWritesEnabled: false,
    applyExecutionEnabled: false,
    rollbackExecutionEnabled: false,
    userWorkspaceMutationEnabled: false,
    tauriCommandEnabled: false,
    fileReadEnabled: false,
    fileWriteEnabled: false,
    gitExecutionEnabled: false,
    shellExecutionEnabled: false
  };
}

function summaryOrUndefined(value: unknown): unknown {
  if (!isRecord(value)) {
    return undefined;
  }
  const status = typeof value.status === "string" ? value.status : "";
  return status === "empty" ? undefined : value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
