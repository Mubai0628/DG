import {
  buildUserWorkspacePromotionReadiness,
  type UserWorkspacePromotionReadiness,
  type UserWorkspacePromotionReadinessArtifactRef,
  type UserWorkspacePromotionReadinessFinding,
  type UserWorkspacePromotionReadinessGate,
  type UserWorkspacePromotionReadinessReadiness,
  type UserWorkspacePromotionReadinessStatus
} from "../../runtime/src/execution/user-workspace/promotion-readiness-checker.js";
import { safeErrorMessage, safeText } from "./safety.js";
import type { AppUserWorkspaceSnapshotBackupView } from "./user-workspace-snapshot-backup-view.js";

export type AppUserWorkspacePromotionReadinessStatus =
  UserWorkspacePromotionReadinessStatus;

export type AppUserWorkspacePromotionReadinessFindingView = {
  findingId: string;
  kind: UserWorkspacePromotionReadinessFinding["kind"];
  severity: UserWorkspacePromotionReadinessFinding["severity"];
  code: string;
  summary: string;
  relatedRef?: string | undefined;
};

export type AppUserWorkspacePromotionReadinessView = {
  status: AppUserWorkspacePromotionReadinessStatus;
  readinessId: string;
  chainId: string;
  userWorkspaceRootRef: string;
  sourceWorkspaceFingerprint: string;
  gateCount: number;
  passedGateCount: number;
  blockedGateCount: number;
  warningGateCount: number;
  requiredArtifactCount: number;
  presentArtifactCount: number;
  missingArtifactCount: number;
  artifactRefs: UserWorkspacePromotionReadinessArtifactRef[];
  gates: UserWorkspacePromotionReadinessGate[];
  findings: AppUserWorkspacePromotionReadinessFindingView[];
  warningCodes: string[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  expectedUserSnapshotHash?: string | undefined;
  expectedDisposableOutputHash?: string | undefined;
  readiness: UserWorkspacePromotionReadinessReadiness;
  readinessHash: string;
  nextAction: string;
  source: "runtime_user_workspace_promotion_readiness" | "empty";
  readinessOnly: true;
  userWorkspaceReadEnabled: false;
  userWorkspaceWriteEnabled: false;
  backupCreationEnabled: false;
  applyEnabled: false;
  rollbackEnabled: false;
  eventWritesEnabled: false;
  tauriCommandEnabled: false;
  gitExecutionEnabled: false;
  shellExecutionEnabled: false;
};

export type AppUserWorkspacePromotionReadinessInput = {
  userWorkspaceSnapshotBackupContract?:
    | AppUserWorkspaceSnapshotBackupView
    | undefined;
  disposablePatchApplyResult?: unknown;
  disposablePatchRollbackResult?: unknown;
  sandboxApplyRollbackEventProjection?: unknown;
  patchProposalPreview?: unknown;
  patchValidationPreview?: unknown;
  patchDiffAuditPreview?: unknown;
  patchApprovalDraft?: unknown;
  patchVirtualApplyPreview?: unknown;
  patchRollbackCheckpointPreview?: unknown;
  approvalGatedDisposableApplyResult?: unknown;
  sourceWorkspaceFingerprint?: string | undefined;
  userWorkspaceRootRef?: string | undefined;
  expectedUserSnapshotHash?: string | undefined;
  expectedDisposableOutputHash?: string | undefined;
};

export function buildUserWorkspacePromotionReadinessView(
  input: AppUserWorkspacePromotionReadinessInput = {}
): AppUserWorkspacePromotionReadinessView {
  return appViewFromRuntimeReadiness(
    buildUserWorkspacePromotionReadiness({
      userWorkspaceSnapshotBackupContract: summaryOrUndefined(
        input.userWorkspaceSnapshotBackupContract
      ),
      disposablePatchApplyResult: summaryOrUndefined(
        input.disposablePatchApplyResult
      ),
      disposablePatchRollbackResult: summaryOrUndefined(
        input.disposablePatchRollbackResult
      ),
      sandboxApplyRollbackEventProjection: summaryOrUndefined(
        input.sandboxApplyRollbackEventProjection
      ),
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
      approvalGatedDisposableApplyResult: summaryOrUndefined(
        input.approvalGatedDisposableApplyResult
      ),
      sourceWorkspaceFingerprint:
        safeText(input.sourceWorkspaceFingerprint, "").trim() ||
        input.userWorkspaceSnapshotBackupContract?.sourceWorkspaceFingerprint,
      userWorkspaceRootRef:
        safeText(input.userWorkspaceRootRef, "").trim() ||
        input.userWorkspaceSnapshotBackupContract?.userWorkspaceRootRef,
      expectedUserSnapshotHash:
        safeText(input.expectedUserSnapshotHash, "").trim() ||
        input.userWorkspaceSnapshotBackupContract?.expectedUserSnapshotHash,
      expectedDisposableOutputHash:
        safeText(input.expectedDisposableOutputHash, "").trim() ||
        input.userWorkspaceSnapshotBackupContract?.expectedDisposableOutputHash
    })
  );
}

export function userWorkspacePromotionReadinessWarningCodes(
  view: AppUserWorkspacePromotionReadinessView | undefined
): string[] {
  if (view === undefined || view.status === "empty") {
    return [];
  }
  return [
    `USER_WORKSPACE_PROMOTION_STATUS_${view.status.toUpperCase()}`,
    `USER_WORKSPACE_PROMOTION_GATES_${view.gateCount}`,
    `USER_WORKSPACE_PROMOTION_BLOCKERS_${view.blockerCount}`,
    `USER_WORKSPACE_PROMOTION_WARNINGS_${view.warningCount}`,
    ...view.warningCodes
  ];
}

export function summarizeUserWorkspacePromotionReadinessView(
  view: AppUserWorkspacePromotionReadinessView
): string {
  if (view.status === "empty") {
    return "No user workspace promotion readiness preview is available.";
  }
  return [
    `status:${view.status}`,
    `gates:${view.passedGateCount}/${view.gateCount}`,
    `artifacts:${view.presentArtifactCount}/${view.requiredArtifactCount}`,
    `blockers:${view.blockerCount}`,
    `warnings:${view.warningCount}`,
    `hash:${view.readinessHash}`
  ].join(" | ");
}

function appViewFromRuntimeReadiness(
  readiness: UserWorkspacePromotionReadiness
): AppUserWorkspacePromotionReadinessView {
  const findings = readiness.findings.map((finding) => ({
    findingId: finding.findingId,
    kind: finding.kind,
    severity: finding.severity,
    code: finding.code,
    summary: safeErrorMessage(finding.summary),
    relatedRef: finding.relatedRef
  }));
  return {
    status: readiness.status,
    readinessId: readiness.readinessId,
    chainId: readiness.chainId,
    userWorkspaceRootRef: readiness.userWorkspaceRootRef,
    sourceWorkspaceFingerprint: readiness.sourceWorkspaceFingerprint,
    gateCount: readiness.gateCount,
    passedGateCount: readiness.passedGateCount,
    blockedGateCount: readiness.blockedGateCount,
    warningGateCount: readiness.warningGateCount,
    requiredArtifactCount: readiness.requiredArtifactCount,
    presentArtifactCount: readiness.presentArtifactCount,
    missingArtifactCount: readiness.missingArtifactCount,
    artifactRefs: readiness.artifactRefs.map((artifact) => ({
      ...artifact,
      warningCodes: [...artifact.warningCodes]
    })),
    gates: readiness.gates.map((gate) => ({
      ...gate,
      artifactRefIds: [...gate.artifactRefIds],
      blockerCodes: [...gate.blockerCodes],
      warningCodes: [...gate.warningCodes]
    })),
    findings,
    warningCodes: [
      ...new Set([
        ...findings.map((finding) => finding.code),
        ...readiness.gates.flatMap((gate) => [
          ...gate.blockerCodes,
          ...gate.warningCodes
        ])
      ])
    ],
    blockerCount: readiness.blockerCount,
    warningCount: readiness.warningCount,
    findingCount: readiness.findingCount,
    expectedUserSnapshotHash: readiness.expectedUserSnapshotHash,
    expectedDisposableOutputHash: readiness.expectedDisposableOutputHash,
    readiness: { ...readiness.readiness },
    readinessHash: readiness.readinessHash,
    nextAction: readiness.nextAction,
    source:
      readiness.status === "empty"
        ? "empty"
        : "runtime_user_workspace_promotion_readiness",
    readinessOnly: true,
    userWorkspaceReadEnabled: false,
    userWorkspaceWriteEnabled: false,
    backupCreationEnabled: false,
    applyEnabled: false,
    rollbackEnabled: false,
    eventWritesEnabled: false,
    tauriCommandEnabled: false,
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
