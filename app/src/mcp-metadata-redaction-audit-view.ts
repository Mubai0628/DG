import {
  buildMcpMetadataRedactionAudit,
  summarizeMcpMetadataRedactionAudit,
  type McpMetadataRedactionAudit
} from "../../runtime/src/capabilities/index.js";
import type { McpReadonlyDiscoverResult } from "./desktop-flow.js";
import {
  summarizeMcpReadonlyConnectionView,
  type McpReadonlyConnectionView
} from "./mcp-readonly-connection-view.js";
import { safeErrorMessage } from "./safety.js";

export type McpMetadataRedactionAuditView = {
  status: McpMetadataRedactionAudit["status"];
  auditId: string;
  recordCount: number;
  redactedFieldCount: number;
  rawFieldDetectedCount: number;
  riskCounts: McpMetadataRedactionAudit["riskCounts"];
  rawPromptDetected: boolean;
  rawSourceDetected: boolean;
  rawDiffDetected: boolean;
  secretDetected: boolean;
  executionFieldDetected: boolean;
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  findings: Array<{
    code: string;
    severity: "blocker" | "warning";
    safeMessage: string;
  }>;
  auditHashPrefix: string;
  readiness: McpMetadataRedactionAudit["readiness"];
  nextAction: string;
  source: "app_mcp_metadata_redaction_audit";
};

export type McpMetadataRedactionAuditViewInput = {
  mcpReadonlyConnectionView?: McpReadonlyConnectionView | undefined;
  discoveryResult?: McpReadonlyDiscoverResult | undefined;
};

export function buildMcpMetadataRedactionAuditView(
  input: McpMetadataRedactionAuditViewInput = {}
): McpMetadataRedactionAuditView {
  const audit = buildMcpMetadataRedactionAudit({
    ...(input.discoveryResult === undefined
      ? {}
      : { discoveryResult: input.discoveryResult }),
    appSurfaceSummary:
      input.mcpReadonlyConnectionView === undefined ||
      input.mcpReadonlyConnectionView.status === "empty"
        ? undefined
        : summarizeMcpReadonlyConnectionView(input.mcpReadonlyConnectionView)
  });
  return viewFromAudit(audit);
}

export function summarizeMcpMetadataRedactionAuditView(
  view: McpMetadataRedactionAuditView
): ReturnType<typeof summarizeMcpMetadataRedactionAudit> & {
  appSource: "app_mcp_metadata_redaction_audit";
} {
  return {
    ...summarizeMcpMetadataRedactionAudit({
      status: view.status,
      auditId: view.auditId,
      recordCounts: {
        connectionProfileSummaryCount: 0,
        discoveryResultCount: 0,
        brokerDescriptorPreviewCount: 0,
        appSurfaceSummaryCount: view.recordCount > 0 ? 1 : 0,
        totalRecordCount: view.recordCount
      },
      redactedFieldCount: view.redactedFieldCount,
      rawFieldDetectedCount: view.rawFieldDetectedCount,
      riskCounts: view.riskCounts,
      rawMetadataIncluded: false,
      rawPromptDetected: view.rawPromptDetected,
      rawSourceDetected: view.rawSourceDetected,
      rawDiffDetected: view.rawDiffDetected,
      secretDetected: view.secretDetected,
      executionFieldDetected: view.executionFieldDetected,
      findings: view.findings.map((finding, index) => ({
        findingId: `app-mcp-redaction-finding-${index + 1}`,
        kind: "raw_field",
        severity: finding.severity,
        code: finding.code,
        safeMessage: finding.safeMessage
      })),
      blockerCount: view.blockerCount,
      warningCount: view.warningCount,
      findingCount: view.findingCount,
      auditHash: view.auditHashPrefix,
      readiness: view.readiness,
      nextAction: view.nextAction,
      source: "runtime_mcp_metadata_redaction_audit"
    }),
    appSource: view.source
  };
}

function viewFromAudit(
  audit: McpMetadataRedactionAudit
): McpMetadataRedactionAuditView {
  return {
    status: audit.status,
    auditId: audit.auditId,
    recordCount: audit.recordCounts.totalRecordCount,
    redactedFieldCount: audit.redactedFieldCount,
    rawFieldDetectedCount: audit.rawFieldDetectedCount,
    riskCounts: audit.riskCounts,
    rawPromptDetected: audit.rawPromptDetected,
    rawSourceDetected: audit.rawSourceDetected,
    rawDiffDetected: audit.rawDiffDetected,
    secretDetected: audit.secretDetected,
    executionFieldDetected: audit.executionFieldDetected,
    blockerCount: audit.blockerCount,
    warningCount: audit.warningCount,
    findingCount: audit.findingCount,
    findings: audit.findings.map((finding) => ({
      code: finding.code,
      severity: finding.severity,
      safeMessage: safeErrorMessage(finding.safeMessage)
    })),
    auditHashPrefix: audit.auditHash.slice(0, 12),
    readiness: audit.readiness,
    nextAction: audit.nextAction,
    source: "app_mcp_metadata_redaction_audit"
  };
}
