import {
  buildExternalCapabilityRedactionAudit,
  summarizeExternalCapabilityRedactionAudit,
  type ExternalCapabilityRedactionAudit
} from "../../runtime/src/capabilities/index.js";
import {
  summarizeCapabilityHostAuditView,
  type CapabilityHostAuditView
} from "./capability-host-audit-view.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type ExternalCapabilityAuditSurfaceStatus =
  ExternalCapabilityRedactionAudit["status"];

export type ExternalCapabilityAuditSurfaceView = {
  status: ExternalCapabilityAuditSurfaceStatus;
  surfaceId: string;
  descriptorCount: number;
  policyHardeningStatus: string;
  mcpReadonlyConsistencyStatus: string;
  pluginSkillSandboxStatus: string;
  replayCompletenessStatus: string;
  redactionAuditStatus: string;
  redactedFieldCount: number;
  rawFieldDetectedCount: number;
  rawLeakBooleans: ExternalCapabilityRedactionAudit["rawLeakBooleans"];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  findings: {
    code: string;
    severity: "blocker" | "warning";
    safeMessage: string;
  }[];
  auditHash: string;
  readiness: {
    canPreviewExternalCapabilityAudit: boolean;
    canInvokeExternalCapability: false;
    canRunPlugin: false;
    canRunSkill: false;
    canExecuteMutatingMcpTool: false;
    canWriteEventStore: false;
    canFetchNetwork: false;
    canUseTauri: false;
    canExecuteGit: false;
    canExecuteShell: false;
    appCanExecute: false;
  };
  nextAction: string;
  source: "app_external_capability_audit_surface";
};

export type ExternalCapabilityAuditSurfaceInput = {
  capabilityHostAudit?: CapabilityHostAuditView | undefined;
  hardeningSummaryJsonText?: string | undefined;
};

export function buildExternalCapabilityAuditSurfaceView(
  input: ExternalCapabilityAuditSurfaceInput = {}
): ExternalCapabilityAuditSurfaceView {
  const parsed = parseSummaryText(safeText(input.hardeningSummaryJsonText, ""));
  if (!parsed.ok) {
    const audit = buildExternalCapabilityRedactionAudit({
      appSurfaceSummary: {
        status: "blocked",
        blockerCount: 1
      }
    });
    return viewFromAudit(audit, "empty", [
      {
        code: parsed.code,
        severity: "blocker",
        safeMessage: parsed.safeMessage
      }
    ]);
  }

  const redactionAuditSummary =
    parsed.value?.redactionAuditSummary ??
    parsed.value?.redactionAudit ??
    (input.capabilityHostAudit === undefined ||
    input.capabilityHostAudit.status === "empty"
      ? undefined
      : summarizeCapabilityHostAuditView(input.capabilityHostAudit));

  const audit = buildExternalCapabilityRedactionAudit({
    policyHardeningReport:
      parsed.value?.policyHardeningReport ?? parsed.value?.policyHardening,
    mcpReadonlyConsistencyReport:
      parsed.value?.mcpReadonlyConsistencyReport ??
      parsed.value?.mcpReadonlyConsistency,
    sandboxEscapeReport:
      parsed.value?.sandboxEscapeReport ?? parsed.value?.pluginSkillSandbox,
    replayCompletenessReport:
      parsed.value?.replayCompletenessReport ??
      parsed.value?.replayCompleteness,
    externalResultSummaries: Array.isArray(
      parsed.value?.externalResultSummaries
    )
      ? parsed.value.externalResultSummaries
      : undefined,
    appSurfaceSummary:
      parsed.value?.appSurfaceSummary ??
      parsed.value ??
      redactionAuditSummary ??
      undefined
  });

  return viewFromAudit(audit, statusOf(redactionAuditSummary));
}

export function summarizeExternalCapabilityAuditSurfaceView(
  view: ExternalCapabilityAuditSurfaceView
): Pick<
  ExternalCapabilityAuditSurfaceView,
  | "status"
  | "surfaceId"
  | "descriptorCount"
  | "policyHardeningStatus"
  | "mcpReadonlyConsistencyStatus"
  | "pluginSkillSandboxStatus"
  | "replayCompletenessStatus"
  | "redactionAuditStatus"
  | "blockerCount"
  | "warningCount"
  | "auditHash"
  | "readiness"
  | "nextAction"
  | "source"
> {
  return {
    status: view.status,
    surfaceId: view.surfaceId,
    descriptorCount: view.descriptorCount,
    policyHardeningStatus: view.policyHardeningStatus,
    mcpReadonlyConsistencyStatus: view.mcpReadonlyConsistencyStatus,
    pluginSkillSandboxStatus: view.pluginSkillSandboxStatus,
    replayCompletenessStatus: view.replayCompletenessStatus,
    redactionAuditStatus: view.redactionAuditStatus,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    auditHash: view.auditHash,
    readiness: view.readiness,
    nextAction: view.nextAction,
    source: view.source
  };
}

function viewFromAudit(
  audit: ExternalCapabilityRedactionAudit,
  redactionAuditStatus: string,
  extraFindings: ExternalCapabilityAuditSurfaceView["findings"] = []
): ExternalCapabilityAuditSurfaceView {
  const summary = summarizeExternalCapabilityRedactionAudit(audit);
  const findings = [
    ...audit.findings.map((finding) => ({
      code: finding.code,
      severity: finding.severity,
      safeMessage: safeErrorMessage(finding.safeMessage)
    })),
    ...extraFindings
  ];
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status =
    blockerCount > 0
      ? "blocked"
      : warningCount > 0 && audit.status === "audit_ready"
        ? "warning"
        : audit.status;

  return {
    status,
    surfaceId: audit.auditId,
    descriptorCount: audit.descriptorCounts.totalDescriptorCount,
    policyHardeningStatus: statusFromCount(
      audit.sourceCounts.policyHardeningReportCount,
      "policy_ready"
    ),
    mcpReadonlyConsistencyStatus: statusFromCount(
      audit.sourceCounts.mcpReadonlyConsistencyReportCount,
      "consistency_ready"
    ),
    pluginSkillSandboxStatus: statusFromCount(
      audit.sourceCounts.sandboxEscapeReportCount,
      "safe_metadata"
    ),
    replayCompletenessStatus: statusFromCount(
      audit.sourceCounts.replayCompletenessReportCount,
      "replay_ready"
    ),
    redactionAuditStatus,
    redactedFieldCount: summary.redactedFieldCount,
    rawFieldDetectedCount: audit.rawFieldDetectedCount,
    rawLeakBooleans: audit.rawLeakBooleans,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    auditHash: audit.auditHash,
    readiness: {
      canPreviewExternalCapabilityAudit:
        audit.readiness.canPreviewAudit && blockerCount === 0,
      canInvokeExternalCapability: false,
      canRunPlugin: false,
      canRunSkill: false,
      canExecuteMutatingMcpTool: false,
      canWriteEventStore: false,
      canFetchNetwork: false,
      canUseTauri: false,
      canExecuteGit: false,
      canExecuteShell: false,
      appCanExecute: false
    },
    nextAction:
      status === "blocked"
        ? "Reject external capability audit input until only safe summaries remain."
        : audit.nextAction,
    source: "app_external_capability_audit_surface"
  };
}

function parseSummaryText(
  text: string
):
  | { ok: true; value?: Record<string, unknown> | undefined }
  | { ok: false; code: string; safeMessage: string } {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { ok: true };
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (isRecord(parsed)) {
      return { ok: true, value: parsed };
    }
    return {
      ok: false,
      code: "EXTERNAL_CAPABILITY_AUDIT_JSON_NOT_OBJECT",
      safeMessage: "External capability audit summary JSON must be an object."
    };
  } catch {
    return {
      ok: false,
      code: "EXTERNAL_CAPABILITY_AUDIT_JSON_PARSE_FAILED",
      safeMessage: "External capability audit summary JSON could not be parsed."
    };
  }
}

function statusFromCount(count: number, fallback: string): string {
  return count > 0 ? fallback : "empty";
}

function statusOf(value: unknown): string {
  if (!isRecord(value)) {
    return "empty";
  }
  return typeof value.status === "string" ? value.status : "summary_present";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
