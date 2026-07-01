import {
  buildExternalCapabilityRedactionAudit,
  summarizeExternalCapabilityRedactionAudit,
  type ExternalCapabilityRedactionAudit
} from "../../runtime/src/capabilities/index.js";
import {
  summarizeCapabilityHostSurfaceView,
  type CapabilityHostSurfaceView
} from "./capability-host-surface-view.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type CapabilityHostAuditView = {
  status: ExternalCapabilityRedactionAudit["status"];
  auditId: string;
  sourceCounts: ExternalCapabilityRedactionAudit["sourceCounts"];
  descriptorCounts: ExternalCapabilityRedactionAudit["descriptorCounts"];
  redactedFieldCount: number;
  rawFieldDetectedCount: number;
  rawLeakBooleans: ExternalCapabilityRedactionAudit["rawLeakBooleans"];
  riskSummary: Record<string, number>;
  findings: {
    code: string;
    severity: "blocker" | "warning";
    safeMessage: string;
  }[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  auditHash: string;
  readiness: {
    canPreviewAudit: boolean;
    canRunExternalCapabilityAudit: false;
    canConnectMcpServer: false;
    canInstallPlugin: false;
    canRunSkill: false;
    canInvokeCapability: false;
    canIssueLease: false;
    canWriteEventStore: false;
    canFetchNetwork: false;
    canUseTauri: false;
    appCanExecute: false;
  };
  nextAction: string;
  source: "app_capability_host_audit";
};

export type CapabilityHostAuditInput = {
  capabilityHostSurface?: CapabilityHostSurfaceView | undefined;
  summaryJsonText?: string | undefined;
};

export function buildCapabilityHostAuditView(
  input: CapabilityHostAuditInput = {}
): CapabilityHostAuditView {
  const parsedSummary = parseSummaryText(safeText(input.summaryJsonText, ""));
  if (!parsedSummary.ok) {
    const audit = buildExternalCapabilityRedactionAudit({
      appSurfaceSummary: {
        status: "blocked",
        blockerCount: 1,
        warningCount: 0
      }
    });
    return viewFromAudit(audit, [
      {
        code: parsedSummary.code,
        severity: "blocker",
        safeMessage: parsedSummary.safeMessage
      }
    ]);
  }

  const appSurfaceSummary =
    parsedSummary.value ??
    (input.capabilityHostSurface === undefined ||
    input.capabilityHostSurface.status === "empty"
      ? undefined
      : summarizeCapabilityHostSurfaceView(input.capabilityHostSurface));
  const audit = buildExternalCapabilityRedactionAudit({
    appSurfaceSummary
  });
  return viewFromAudit(audit);
}

export function summarizeCapabilityHostAuditView(
  view: CapabilityHostAuditView
): ReturnType<typeof summarizeExternalCapabilityRedactionAudit> & {
  appSource: "app_capability_host_audit";
} {
  return {
    ...summarizeExternalCapabilityRedactionAudit({
      status: view.status,
      auditId: view.auditId,
      sourceCounts: view.sourceCounts,
      descriptorCounts: view.descriptorCounts,
      redactedFieldCount: view.redactedFieldCount,
      rawFieldDetectedCount: view.rawFieldDetectedCount,
      rawLeakBooleans: view.rawLeakBooleans,
      riskSummary: view.riskSummary,
      findings: view.findings.map((finding, index) => ({
        findingId: `app-capability-host-audit-finding-${index}`,
        kind: "redaction",
        severity: finding.severity,
        code: finding.code,
        safeMessage: finding.safeMessage
      })),
      blockerCount: view.blockerCount,
      warningCount: view.warningCount,
      findingCount: view.findingCount,
      auditHash: view.auditHash,
      readiness: {
        canPreviewAudit: view.readiness.canPreviewAudit,
        canConnectMcpServer: false,
        canInstallPlugin: false,
        canExecuteSkill: false,
        canInvokeCapability: false,
        canIssueLease: false,
        canWriteEventStore: false,
        canFetchNetwork: false,
        canExecuteGit: false,
        canExecuteShell: false,
        appCanExecute: false
      },
      nextAction: view.nextAction,
      source: "runtime_external_capability_redaction_audit"
    }),
    appSource: view.source
  };
}

function viewFromAudit(
  audit: ExternalCapabilityRedactionAudit,
  extraFindings: CapabilityHostAuditView["findings"] = []
): CapabilityHostAuditView {
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
    auditId: audit.auditId,
    sourceCounts: audit.sourceCounts,
    descriptorCounts: audit.descriptorCounts,
    redactedFieldCount: audit.redactedFieldCount,
    rawFieldDetectedCount: audit.rawFieldDetectedCount,
    rawLeakBooleans: audit.rawLeakBooleans,
    riskSummary: audit.riskSummary,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    auditHash: audit.auditHash,
    readiness: {
      canPreviewAudit: audit.readiness.canPreviewAudit && blockerCount === 0,
      canRunExternalCapabilityAudit: false,
      canConnectMcpServer: false,
      canInstallPlugin: false,
      canRunSkill: false,
      canInvokeCapability: false,
      canIssueLease: false,
      canWriteEventStore: false,
      canFetchNetwork: false,
      canUseTauri: false,
      appCanExecute: false
    },
    nextAction:
      status === "blocked"
        ? "Reject capability host audit input until only safe summaries remain."
        : audit.nextAction,
    source: "app_capability_host_audit"
  };
}

function parseSummaryText(text: string):
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
      code: "CAPABILITY_HOST_AUDIT_JSON_NOT_OBJECT",
      safeMessage: "Capability host audit summary JSON must be an object."
    };
  } catch {
    return {
      ok: false,
      code: "CAPABILITY_HOST_AUDIT_JSON_PARSE_FAILED",
      safeMessage: "Capability host audit summary JSON could not be parsed."
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
