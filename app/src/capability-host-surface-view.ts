import {
  buildExternalCapabilityBrokerIntegration,
  summarizeExternalCapabilityBrokerIntegration,
  validateExternalCapabilityManifest,
  type ExternalCapabilityBrokerIntegrationResult,
  type ExternalCapabilitySourceType
} from "../../runtime/src/capabilities/index.js";
import { safeErrorMessage, safeText } from "./safety.js";

export type CapabilityHostSurfaceStatus =
  | "empty"
  | "preview_ready"
  | "warning"
  | "blocked";

export type CapabilityHostSurfaceFinding = {
  code: string;
  severity: "blocker" | "warning";
  safeMessage: string;
};

export type CapabilityHostSurfaceRiskSummary = Record<string, number>;
export type CapabilityHostSurfacePolicySummary = Record<string, number>;

export type CapabilityHostSurfaceReadiness = {
  canPreviewDescriptors: boolean;
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

export type CapabilityHostSurfaceView = {
  status: CapabilityHostSurfaceStatus;
  surfaceId: string;
  sourceType: ExternalCapabilitySourceType;
  manifestStatus: "empty" | "parsed" | "warning" | "blocked";
  brokerStatus: ExternalCapabilityBrokerIntegrationResult["status"] | "empty";
  manifestId?: string | undefined;
  sourceName?: string | undefined;
  descriptorCount: number;
  brokerDescriptorCount: number;
  leasePreviewCount: number;
  riskSummary: CapabilityHostSurfaceRiskSummary;
  invocationPolicies: CapabilityHostSurfacePolicySummary;
  brokerPreviewSummary?: ReturnType<
    typeof summarizeExternalCapabilityBrokerIntegration
  > | undefined;
  findings: CapabilityHostSurfaceFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  hashPrefix?: string | undefined;
  readiness: CapabilityHostSurfaceReadiness;
  nextAction: string;
  source: "app_capability_host_surface";
};

export type CapabilityHostSurfaceInput = {
  manifestJsonText?: string | undefined;
  sourceType?: ExternalCapabilitySourceType | undefined;
  createdAt?: string | undefined;
  idGenerator?: (() => string) | undefined;
};

export type CapabilityHostSurfaceSummary = {
  status: CapabilityHostSurfaceStatus;
  surfaceId: string;
  sourceType: ExternalCapabilitySourceType;
  descriptorCount: number;
  brokerDescriptorCount: number;
  riskSummary: CapabilityHostSurfaceRiskSummary;
  invocationPolicies: CapabilityHostSurfacePolicySummary;
  blockerCount: number;
  warningCount: number;
  hashPrefix?: string | undefined;
  nextAction: string;
  source: "app_capability_host_surface";
};

const sourceTypes: ExternalCapabilitySourceType[] = [
  "mcp_server",
  "plugin_package",
  "skill_bundle",
  "local_builtin_descriptor"
];

export function buildCapabilityHostSurfaceView(
  input: CapabilityHostSurfaceInput = {}
): CapabilityHostSurfaceView {
  const sourceType = sourceTypes.includes(
    input.sourceType as ExternalCapabilitySourceType
  )
    ? (input.sourceType as ExternalCapabilitySourceType)
    : "mcp_server";
  const manifestText = safeText(input.manifestJsonText, "");

  if (manifestText.trim().length === 0) {
    const hash = hashText(
      JSON.stringify({
        sourceType,
        createdAt: input.createdAt ?? "not-provided"
      })
    );
    return viewFrom({
      status: "empty",
      sourceType,
      manifestStatus: "empty",
      brokerStatus: "empty",
      descriptorCount: 0,
      brokerDescriptorCount: 0,
      leasePreviewCount: 0,
      riskSummary: {},
      invocationPolicies: {},
      findings: [],
      hash,
      nextAction:
        "Paste an external capability manifest to preview descriptor metadata only."
    });
  }

  const parsed = parseManifestText(manifestText);
  if (!parsed.ok) {
    const hash = hashText(
      JSON.stringify({
        sourceType,
        status: "blocked",
        code: parsed.finding.code
      })
    );
    return viewFrom({
      status: "blocked",
      sourceType,
      manifestStatus: "blocked",
      brokerStatus: "blocked",
      descriptorCount: 0,
      brokerDescriptorCount: 0,
      leasePreviewCount: 0,
      riskSummary: {},
      invocationPolicies: {},
      findings: [parsed.finding],
      hash,
      nextAction: "Provide valid summary-only external capability manifest JSON."
    });
  }

  const manifestCandidate = withSourceTypeSelector(parsed.value, sourceType);
  const selectorFindings = selectorFindingsFor(parsed.value, sourceType);
  const manifestResult = validateExternalCapabilityManifest(manifestCandidate);
  const brokerResult = buildExternalCapabilityBrokerIntegration({
    manifestResult
  });
  const findings = [
    ...selectorFindings,
    ...manifestResult.findings.map((finding) => ({
      code: safeCode(finding.code),
      severity: finding.severity,
      safeMessage: safeErrorMessage(finding.safeMessage)
    })),
    ...brokerResult.findings.map((finding) => ({
      code: safeCode(finding.code),
      severity: finding.severity,
      safeMessage: safeErrorMessage(finding.safeMessage)
    }))
  ];
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status: CapabilityHostSurfaceStatus =
    blockerCount > 0
      ? "blocked"
      : warningCount > 0 || brokerResult.status === "warning"
        ? "warning"
        : "preview_ready";
  const hash = hashText(
    stableStringify({
      status,
      sourceType,
      manifestHash: manifestResult.manifestHash,
      brokerHash: brokerResult.integrationHash,
      descriptorCount: brokerResult.descriptorPreviewCount,
      blockers: blockerCount,
      warnings: warningCount
    })
  );

  return viewFrom({
    status,
    sourceType,
    manifestStatus: manifestResult.status,
    brokerStatus: brokerResult.status,
    manifestId: manifestResult.summary.manifestId,
    sourceName: manifestResult.summary.sourceName,
    descriptorCount: manifestResult.summary.capabilityCount,
    brokerDescriptorCount: brokerResult.descriptorPreviewCount,
    leasePreviewCount: brokerResult.leasePreviewCount,
    riskSummary: brokerResult.riskMapping,
    invocationPolicies: brokerResult.policyMapping,
    brokerPreviewSummary: summarizeExternalCapabilityBrokerIntegration(
      brokerResult
    ),
    findings,
    hash,
    nextAction: nextActionFor(status)
  });
}

export function summarizeCapabilityHostSurfaceView(
  view: CapabilityHostSurfaceView
): CapabilityHostSurfaceSummary {
  return {
    status: view.status,
    surfaceId: view.surfaceId,
    sourceType: view.sourceType,
    descriptorCount: view.descriptorCount,
    brokerDescriptorCount: view.brokerDescriptorCount,
    riskSummary: view.riskSummary,
    invocationPolicies: view.invocationPolicies,
    blockerCount: view.blockerCount,
    warningCount: view.warningCount,
    hashPrefix: view.hashPrefix,
    nextAction: view.nextAction,
    source: view.source
  };
}

export function capabilityHostSurfaceWarningCodes(
  view: CapabilityHostSurfaceView | undefined
): string[] {
  if (view === undefined || view.status === "empty") {
    return [];
  }
  return [
    "CAPABILITY_HOST_SURFACE_READ_ONLY",
    ...view.findings.map((finding) => finding.code)
  ];
}

function viewFrom(args: {
  status: CapabilityHostSurfaceStatus;
  sourceType: ExternalCapabilitySourceType;
  manifestStatus: CapabilityHostSurfaceView["manifestStatus"];
  brokerStatus: CapabilityHostSurfaceView["brokerStatus"];
  manifestId?: string | undefined;
  sourceName?: string | undefined;
  descriptorCount: number;
  brokerDescriptorCount: number;
  leasePreviewCount: number;
  riskSummary: CapabilityHostSurfaceRiskSummary;
  invocationPolicies: CapabilityHostSurfacePolicySummary;
  brokerPreviewSummary?: CapabilityHostSurfaceView["brokerPreviewSummary"];
  findings: CapabilityHostSurfaceFinding[];
  hash: string;
  nextAction: string;
}): CapabilityHostSurfaceView {
  const blockerCount = args.findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = args.findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  return {
    status: args.status,
    surfaceId: `capability-host-surface-${args.hash.slice(0, 12)}`,
    sourceType: args.sourceType,
    manifestStatus: args.manifestStatus,
    brokerStatus: args.brokerStatus,
    manifestId: args.manifestId,
    sourceName: args.sourceName,
    descriptorCount: args.descriptorCount,
    brokerDescriptorCount: args.brokerDescriptorCount,
    leasePreviewCount: args.leasePreviewCount,
    riskSummary: args.riskSummary,
    invocationPolicies: args.invocationPolicies,
    brokerPreviewSummary: args.brokerPreviewSummary,
    findings: args.findings,
    blockerCount,
    warningCount,
    findingCount: args.findings.length,
    hashPrefix: args.hash.slice(0, 12),
    readiness: readinessFor(
      args.status !== "empty" && args.status !== "blocked"
    ),
    nextAction: args.nextAction,
    source: "app_capability_host_surface"
  };
}

function parseManifestText(text: string):
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; finding: CapabilityHostSurfaceFinding } {
  try {
    const parsed = JSON.parse(text) as unknown;
    if (isRecord(parsed)) {
      return { ok: true, value: parsed };
    }
    return {
      ok: false,
      finding: finding(
        "MANIFEST_JSON_NOT_OBJECT",
        "blocker",
        "Capability manifest JSON must be an object."
      )
    };
  } catch {
    return {
      ok: false,
      finding: finding(
        "MANIFEST_JSON_PARSE_FAILED",
        "blocker",
        "Capability manifest JSON could not be parsed."
      )
    };
  }
}

function withSourceTypeSelector(
  value: Record<string, unknown>,
  sourceType: ExternalCapabilitySourceType
): Record<string, unknown> {
  if (typeof value.sourceType === "string" && value.sourceType.length > 0) {
    return value;
  }
  return { ...value, sourceType };
}

function selectorFindingsFor(
  value: Record<string, unknown>,
  sourceType: ExternalCapabilitySourceType
): CapabilityHostSurfaceFinding[] {
  if (value.sourceType === undefined || value.sourceType === sourceType) {
    return [];
  }
  return [
    finding(
      "SOURCE_TYPE_SELECTOR_MISMATCH",
      "warning",
      "Selected source type differs from manifest source type; manifest metadata wins."
    )
  ];
}

function readinessFor(canPreviewDescriptors: boolean): CapabilityHostSurfaceReadiness {
  return {
    canPreviewDescriptors,
    canConnectMcpServer: false,
    canInstallPlugin: false,
    canRunSkill: false,
    canInvokeCapability: false,
    canIssueLease: false,
    canWriteEventStore: false,
    canFetchNetwork: false,
    canUseTauri: false,
    appCanExecute: false
  };
}

function nextActionFor(status: CapabilityHostSurfaceStatus): string {
  if (status === "blocked") {
    return "Reject the external capability metadata until unsafe fields are removed.";
  }
  if (status === "warning") {
    return "Review descriptor warnings only. External execution remains disabled.";
  }
  if (status === "preview_ready") {
    return "Display descriptor summaries only. Connect, install, invoke, and lease issuance remain disabled.";
  }
  return "Paste an external capability manifest to preview descriptor metadata only.";
}

function finding(
  code: string,
  severity: "blocker" | "warning",
  safeMessage: string
): CapabilityHostSurfaceFinding {
  return {
    code: safeCode(code),
    severity,
    safeMessage: safeErrorMessage(safeMessage)
  };
}

function safeCode(code: string): string {
  return safeText(code, "CAPABILITY_HOST_FINDING").replace(
    /[^A-Z0-9_]/gi,
    "_"
  );
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function hashText(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").repeat(8);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
