import {
  buildPluginSkillRedactionAudit,
  summarizePluginSkillRedactionAudit,
  type PluginSkillRedactionAudit
} from "../../runtime/src/capabilities/index.js";
import {
  summarizePluginSkillHostView,
  type PluginSkillHostView
} from "./plugin-skill-host-view.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type PluginSkillRedactionAuditView = {
  status: PluginSkillRedactionAudit["status"];
  auditId: string;
  sourceCounts: PluginSkillRedactionAudit["sourceCounts"];
  metadataCounts: PluginSkillRedactionAudit["metadataCounts"];
  redactedFieldCount: number;
  rawFieldDetectedCount: number;
  leakBooleans: PluginSkillRedactionAudit["leakBooleans"];
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
    canRunPluginSkillAudit: false;
    canInstallPlugin: false;
    canRunSkill: false;
    canExecutePluginCapability: false;
    canInvokeCapability: false;
    canIssuePermissionLease: false;
    canWriteEventStore: false;
    canFetchNetwork: false;
    canUseTauri: false;
    appCanExecute: false;
  };
  nextAction: string;
  source: "app_plugin_skill_redaction_audit";
};

export type PluginSkillRedactionAuditInput = {
  pluginSkillHost?: PluginSkillHostView | undefined;
  summaryJsonText?: string | undefined;
};

export function buildPluginSkillRedactionAuditView(
  input: PluginSkillRedactionAuditInput = {}
): PluginSkillRedactionAuditView {
  const parsedSummary = parseSummaryText(safeText(input.summaryJsonText, ""));
  if (!parsedSummary.ok) {
    const audit = buildPluginSkillRedactionAudit({
      appHostSummary: {
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

  const appHostSummary =
    parsedSummary.value ??
    (input.pluginSkillHost === undefined ||
    input.pluginSkillHost.status === "empty"
      ? undefined
      : summarizePluginSkillHostView(input.pluginSkillHost));
  const audit = buildPluginSkillRedactionAudit({
    appHostSummary
  });
  return viewFromAudit(audit);
}

export function summarizePluginSkillRedactionAuditView(
  view: PluginSkillRedactionAuditView
): ReturnType<typeof summarizePluginSkillRedactionAudit> & {
  appSource: "app_plugin_skill_redaction_audit";
} {
  return {
    ...summarizePluginSkillRedactionAudit({
      status: view.status,
      auditId: view.auditId,
      sourceCounts: view.sourceCounts,
      metadataCounts: view.metadataCounts,
      redactedFieldCount: view.redactedFieldCount,
      rawFieldDetectedCount: view.rawFieldDetectedCount,
      leakBooleans: view.leakBooleans,
      riskSummary: view.riskSummary,
      findings: view.findings.map((finding, index) => ({
        findingId: `app-plugin-skill-audit-finding-${index}`,
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
        canInstallPlugin: false,
        canRunSkillRuntime: false,
        canExecutePlugin: false,
        canInvokeCapability: false,
        canIssuePermissionLease: false,
        canWriteEventStore: false,
        canFetchNetwork: false,
        canWriteFilesystem: false,
        canExecuteGit: false,
        canExecuteShell: false,
        canUseNativeBridge: false,
        canUseDesktopAction: false,
        appCanExecute: false
      },
      nextAction: view.nextAction,
      source: "runtime_plugin_skill_redaction_audit"
    }),
    appSource: view.source
  };
}

function viewFromAudit(
  audit: PluginSkillRedactionAudit,
  extraFindings: PluginSkillRedactionAuditView["findings"] = []
): PluginSkillRedactionAuditView {
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
    metadataCounts: audit.metadataCounts,
    redactedFieldCount: audit.redactedFieldCount,
    rawFieldDetectedCount: audit.rawFieldDetectedCount,
    leakBooleans: audit.leakBooleans,
    riskSummary: audit.riskSummary,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    auditHash: audit.auditHash,
    readiness: {
      canPreviewAudit: audit.readiness.canPreviewAudit && blockerCount === 0,
      canRunPluginSkillAudit: false,
      canInstallPlugin: false,
      canRunSkill: false,
      canExecutePluginCapability: false,
      canInvokeCapability: false,
      canIssuePermissionLease: false,
      canWriteEventStore: false,
      canFetchNetwork: false,
      canUseTauri: false,
      appCanExecute: false
    },
    nextAction:
      status === "blocked"
        ? "Reject plugin/skill audit input until only safe summaries remain."
        : audit.nextAction,
    source: "app_plugin_skill_redaction_audit"
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
      code: "PLUGIN_SKILL_AUDIT_JSON_NOT_OBJECT",
      safeMessage: "Plugin/skill audit summary JSON must be an object."
    };
  } catch {
    return {
      ok: false,
      code: "PLUGIN_SKILL_AUDIT_JSON_PARSE_FAILED",
      safeMessage: "Plugin/skill audit summary JSON could not be parsed."
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
