import {
  type ExternalCapabilityManifestValidationResult,
  type ExternalCapabilitySourceType
} from "./external-capability-manifest.js";
import { type McpReadonlyDiscoveryResult } from "./mcp-readonly-discovery.js";
import { type PluginSkillMetadataScanResult } from "./plugin-skill-metadata-scanner.js";
import {
  type CapabilityInvokePolicy,
  type CapabilityRiskLevel,
  type CapabilitySourceType
} from "./types.js";

export type ExternalCapabilityBrokerIntegrationInput = {
  manifestResult?: ExternalCapabilityManifestValidationResult;
  mcpDiscoveryResult?: McpReadonlyDiscoveryResult;
  pluginSkillScanResult?: PluginSkillMetadataScanResult;
};

export type ExternalCapabilityBrokerIntegrationStatus =
  | "preview_ready"
  | "warning"
  | "blocked"
  | "empty";

export type ExternalCapabilityBrokerFindingSeverity = "blocker" | "warning";

export type ExternalCapabilityBrokerFindingKind =
  | "source"
  | "descriptor"
  | "risk"
  | "policy"
  | "lease"
  | "secret"
  | "raw_field"
  | "execution_field"
  | "readiness";

export type ExternalCapabilityBrokerFinding = {
  findingId: string;
  kind: ExternalCapabilityBrokerFindingKind;
  severity: ExternalCapabilityBrokerFindingSeverity;
  code: string;
  safeMessage: string;
  path?: string;
};

export type ExternalCapabilityLeasePreview = {
  leasePreviewId: string;
  capabilityId: string;
  status: "preview_only";
  scopeSummary: string;
  canIssueLease: false;
};

export type ExternalCapabilityBrokerDescriptorPreview = {
  descriptorId: string;
  title: string;
  sourceType: CapabilitySourceType;
  category: string;
  riskLevel: CapabilityRiskLevel;
  invokePolicy: CapabilityInvokePolicy;
  executionMode: "SIMULATE";
  disabledByDefault: boolean;
  manualOnly: boolean;
  leasePreview: ExternalCapabilityLeasePreview;
  sourceRef: string;
  warningCodes: string[];
};

export type ExternalCapabilityBrokerIntegrationReadiness = {
  canPreviewDescriptors: boolean;
  canRegisterForExecution: false;
  canInvoke: false;
  canIssueLease: false;
  canAutoRun: false;
  appCanExecute: false;
};

export type ExternalCapabilityBrokerIntegrationResult = {
  status: ExternalCapabilityBrokerIntegrationStatus;
  descriptorPreviewCount: number;
  riskMapping: Record<string, number>;
  policyMapping: Record<string, number>;
  leasePreviewCount: number;
  descriptorPreviews: ExternalCapabilityBrokerDescriptorPreview[];
  findings: ExternalCapabilityBrokerFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  integrationHash: string;
  readiness: ExternalCapabilityBrokerIntegrationReadiness;
  nextAction: string;
  source: "runtime_external_capability_broker_integration";
};

const forbiddenFieldCodes = new Map<string, string>([
  ["apiKey", "API_KEY_FIELD_REJECTED"],
  ["apiKeyValue", "API_KEY_FIELD_REJECTED"],
  ["Authorization", "AUTHORIZATION_FIELD_REJECTED"],
  ["bearer", "BEARER_FIELD_REJECTED"],
  ["token", "TOKEN_FIELD_REJECTED"],
  ["secret", "SECRET_FIELD_REJECTED"],
  ["rawArgs", "RAW_ARGS_FIELD_REJECTED"],
  ["rawPrompt", "RAW_PROMPT_FIELD_REJECTED"],
  ["rawSource", "RAW_SOURCE_FIELD_REJECTED"],
  ["rawDiff", "RAW_DIFF_FIELD_REJECTED"],
  ["rawResponse", "RAW_RESPONSE_FIELD_REJECTED"],
  ["command", "COMMAND_FIELD_REJECTED"],
  ["shellCommand", "SHELL_COMMAND_FIELD_REJECTED"],
  ["gitCommand", "GIT_COMMAND_FIELD_REJECTED"],
  ["nativeCommand", "NATIVE_COMMAND_FIELD_REJECTED"],
  ["desktopAction", "DESKTOP_ACTION_FIELD_REJECTED"],
  ["execute", "EXECUTE_FIELD_REJECTED"],
  ["invoke", "INVOKE_FIELD_REJECTED"]
]);

export function buildExternalCapabilityBrokerIntegration(
  input: ExternalCapabilityBrokerIntegrationInput
): ExternalCapabilityBrokerIntegrationResult {
  const findings: ExternalCapabilityBrokerFinding[] = [];
  scanUnsafeValues(input, findings);
  validateSourceResults(input, findings);

  const previews: ExternalCapabilityBrokerDescriptorPreview[] = [
    ...previewsFromManifest(input.manifestResult, findings),
    ...previewsFromMcpDiscovery(input.mcpDiscoveryResult, findings),
    ...previewsFromPluginSkillScan(input.pluginSkillScanResult, findings)
  ];

  const seen = new Set<string>();
  for (const preview of previews) {
    if (seen.has(preview.descriptorId)) {
      addFinding(
        findings,
        "descriptor",
        "blocker",
        "DUPLICATE_DESCRIPTOR_ID",
        "Broker descriptor preview ids must be unique.",
        preview.descriptorId
      );
    }
    seen.add(preview.descriptorId);
    if (preview.invokePolicy === "AUTO" && preview.sourceType !== "native") {
      addFinding(
        findings,
        "policy",
        "blocker",
        "AUTO_EXTERNAL_POLICY_REJECTED",
        "External descriptor previews cannot use AUTO policy.",
        preview.descriptorId
      );
    }
  }

  return buildResult(previews, findings);
}

export function summarizeExternalCapabilityBrokerIntegration(
  result: ExternalCapabilityBrokerIntegrationResult
): Pick<
  ExternalCapabilityBrokerIntegrationResult,
  | "status"
  | "descriptorPreviewCount"
  | "riskMapping"
  | "policyMapping"
  | "leasePreviewCount"
  | "blockerCount"
  | "warningCount"
  | "integrationHash"
  | "readiness"
  | "source"
> {
  return {
    status: result.status,
    descriptorPreviewCount: result.descriptorPreviewCount,
    riskMapping: result.riskMapping,
    policyMapping: result.policyMapping,
    leasePreviewCount: result.leasePreviewCount,
    blockerCount: result.blockerCount,
    warningCount: result.warningCount,
    integrationHash: result.integrationHash,
    readiness: result.readiness,
    source: result.source
  };
}

function validateSourceResults(
  input: ExternalCapabilityBrokerIntegrationInput,
  findings: ExternalCapabilityBrokerFinding[]
): void {
  if (input.manifestResult?.status === "blocked") {
    addFinding(
      findings,
      "source",
      "blocker",
      "BLOCKED_MANIFEST_RESULT",
      "Blocked manifest results cannot enter broker preview.",
      "manifestResult"
    );
  }
  if (input.mcpDiscoveryResult?.status === "blocked") {
    addFinding(
      findings,
      "source",
      "blocker",
      "BLOCKED_MCP_DISCOVERY_RESULT",
      "Blocked MCP discovery results cannot enter broker preview.",
      "mcpDiscoveryResult"
    );
  }
  if (input.pluginSkillScanResult?.status === "blocked") {
    addFinding(
      findings,
      "source",
      "blocker",
      "BLOCKED_PLUGIN_SKILL_SCAN_RESULT",
      "Blocked plugin/skill scan results cannot enter broker preview.",
      "pluginSkillScanResult"
    );
  }
  if (input.manifestResult !== undefined) {
    checkReadiness(input.manifestResult.readiness, "manifestResult", findings);
  }
  if (input.mcpDiscoveryResult !== undefined) {
    checkReadiness(
      input.mcpDiscoveryResult.readiness,
      "mcpDiscoveryResult",
      findings
    );
  }
  if (input.pluginSkillScanResult !== undefined) {
    checkReadiness(
      input.pluginSkillScanResult.readiness,
      "pluginSkillScanResult",
      findings
    );
  }
}

function previewsFromManifest(
  result: ExternalCapabilityManifestValidationResult | undefined,
  findings: ExternalCapabilityBrokerFinding[]
): ExternalCapabilityBrokerDescriptorPreview[] {
  if (result?.manifest === undefined || result.status === "blocked") {
    return [];
  }
  return result.manifest.capabilities.map((capability) => {
    const sourceType = mapManifestSourceType(result.manifest!.sourceType);
    const riskLevel = mapRisk(capability.riskLevel);
    const invokePolicy = mapPolicy({
      sourceType,
      requestedPolicy: capability.defaultInvocationPolicy,
      riskLevel,
      mutating:
        capability.operationKind !== "read" && capability.operationKind !== "compute",
      requiresNetwork: capability.requiresNetwork,
      requiresFilesystem: capability.requiresFilesystem,
      requiresDesktop: capability.requiresDesktop,
      requiresShell: capability.requiresShell,
      findings,
      descriptorId: capability.capabilityId
    });
    return buildPreview({
      descriptorId: capability.capabilityId,
      title: capability.displayName,
      sourceType,
      category: capability.category,
      riskLevel,
      invokePolicy,
      sourceRef: result.manifest!.manifestId,
      warningCodes: capability.warningCodes
    });
  });
}

function previewsFromMcpDiscovery(
  result: McpReadonlyDiscoveryResult | undefined,
  findings: ExternalCapabilityBrokerFinding[]
): ExternalCapabilityBrokerDescriptorPreview[] {
  if (result === undefined || result.status === "blocked") {
    return [];
  }
  return result.toolSummaries.map((tool) => {
    const riskLevel = mapRisk(tool.riskLevel);
    const invokePolicy = mapPolicy({
      sourceType: "mcp",
      requestedPolicy: tool.defaultInvocationPolicy,
      riskLevel,
      mutating: false,
      requiresNetwork: false,
      requiresFilesystem: false,
      requiresDesktop: false,
      requiresShell: false,
      findings,
      descriptorId: tool.toolId
    });
    return buildPreview({
      descriptorId: tool.toolId,
      title: tool.displayName,
      sourceType: "mcp",
      category: "unknown",
      riskLevel,
      invokePolicy,
      sourceRef: "mcp-readonly-discovery",
      warningCodes: tool.warningCodes
    });
  });
}

function previewsFromPluginSkillScan(
  result: PluginSkillMetadataScanResult | undefined,
  findings: ExternalCapabilityBrokerFinding[]
): ExternalCapabilityBrokerDescriptorPreview[] {
  if (result === undefined || result.status === "blocked") {
    return [];
  }
  return result.declaredCapabilities.map((capability) => {
    const sourceType: CapabilitySourceType = capability.capabilityId.startsWith(
      "skill."
    )
      ? "skill"
      : "plugin";
    const riskLevel = mapRisk(capability.riskLevel);
    const invokePolicy = mapPolicy({
      sourceType,
      requestedPolicy: capability.defaultInvocationPolicy,
      riskLevel,
      mutating:
        capability.operationKind !== "read" && capability.operationKind !== "compute",
      requiresNetwork: capability.requiresNetwork,
      requiresFilesystem: capability.requiresFilesystem,
      requiresDesktop: capability.requiresDesktop,
      requiresShell: false,
      findings,
      descriptorId: capability.capabilityId
    });
    return buildPreview({
      descriptorId: capability.capabilityId,
      title: capability.displayName,
      sourceType,
      category: "unknown",
      riskLevel,
      invokePolicy,
      sourceRef: "plugin-skill-metadata-scan",
      warningCodes: capability.warningCodes
    });
  });
}

function buildPreview(input: {
  descriptorId: string;
  title: string;
  sourceType: CapabilitySourceType;
  category: string;
  riskLevel: CapabilityRiskLevel;
  invokePolicy: CapabilityInvokePolicy;
  sourceRef: string;
  warningCodes: string[];
}): ExternalCapabilityBrokerDescriptorPreview {
  return {
    descriptorId: input.descriptorId,
    title: input.title,
    sourceType: input.sourceType,
    category: input.category,
    riskLevel: input.riskLevel,
    invokePolicy: input.invokePolicy,
    executionMode: "SIMULATE",
    disabledByDefault: input.invokePolicy === "DISABLED",
    manualOnly: input.invokePolicy === "MANUAL_ONLY",
    leasePreview: {
      leasePreviewId: `lease-preview-${stablePreviewHash(input.descriptorId).slice(0, 12)}`,
      capabilityId: input.descriptorId,
      status: "preview_only",
      scopeSummary: "preview_only_no_grant",
      canIssueLease: false
    },
    sourceRef: input.sourceRef,
    warningCodes: input.warningCodes
  };
}

function mapManifestSourceType(
  sourceType: ExternalCapabilitySourceType
): CapabilitySourceType {
  if (sourceType === "mcp_server") {
    return "mcp";
  }
  if (sourceType === "plugin_package") {
    return "plugin";
  }
  if (sourceType === "skill_bundle") {
    return "skill";
  }
  return "native";
}

function mapRisk(risk: string): CapabilityRiskLevel {
  if (risk === "A0") {
    return "A0_observe";
  }
  if (risk === "A1") {
    return "A1_read";
  }
  if (risk === "A2") {
    return "A2_draft_write";
  }
  if (risk === "A3") {
    return "A3_scoped_write";
  }
  if (risk === "A4") {
    return "A4_external_effect";
  }
  return "A5_sensitive_or_irreversible";
}

function mapPolicy(input: {
  sourceType: CapabilitySourceType;
  requestedPolicy: string;
  riskLevel: CapabilityRiskLevel;
  mutating: boolean;
  requiresNetwork: boolean;
  requiresFilesystem: boolean;
  requiresDesktop: boolean;
  requiresShell: boolean;
  findings: ExternalCapabilityBrokerFinding[];
  descriptorId: string;
}): CapabilityInvokePolicy {
  if (input.requestedPolicy === "AUTO" && input.sourceType !== "native") {
    addFinding(
      input.findings,
      "policy",
      "blocker",
      "AUTO_EXTERNAL_POLICY_REJECTED",
      "External descriptor previews cannot use AUTO policy.",
      input.descriptorId
    );
    return "DISABLED";
  }
  if (
    input.mutating ||
    input.requiresNetwork ||
    input.requiresFilesystem ||
    input.requiresDesktop ||
    input.requiresShell ||
    input.riskLevel === "A4_external_effect" ||
    input.riskLevel === "A5_sensitive_or_irreversible"
  ) {
    return "DISABLED";
  }
  if (input.requestedPolicy === "ASK_FIRST") {
    return "ASK_FIRST";
  }
  if (input.requestedPolicy === "MANUAL_ONLY") {
    return "MANUAL_ONLY";
  }
  return "DISABLED";
}

function buildResult(
  previews: ExternalCapabilityBrokerDescriptorPreview[],
  findings: ExternalCapabilityBrokerFinding[]
): ExternalCapabilityBrokerIntegrationResult {
  const blockerCount = findings.filter(
    (finding) => finding.severity === "blocker"
  ).length;
  const warningCount = findings.filter(
    (finding) => finding.severity === "warning"
  ).length;
  const status: ExternalCapabilityBrokerIntegrationStatus =
    blockerCount > 0
      ? "blocked"
      : previews.length === 0
        ? "empty"
        : warningCount > 0
          ? "warning"
          : "preview_ready";
  const safePreviews = blockerCount === 0 ? previews : [];
  const riskMapping = countBy(safePreviews.map((preview) => preview.riskLevel));
  const policyMapping = countBy(
    safePreviews.map((preview) => preview.invokePolicy)
  );
  return {
    status,
    descriptorPreviewCount: safePreviews.length,
    riskMapping,
    policyMapping,
    leasePreviewCount: safePreviews.length,
    descriptorPreviews: safePreviews,
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    integrationHash: stablePreviewHash(
      stableStringify({
        previews: safePreviews,
        findings: findings.map((finding) => ({
          code: finding.code,
          severity: finding.severity,
          kind: finding.kind,
          path: finding.path
        }))
      })
    ),
    readiness: {
      canPreviewDescriptors: blockerCount === 0 && safePreviews.length > 0,
      canRegisterForExecution: false,
      canInvoke: false,
      canIssueLease: false,
      canAutoRun: false,
      appCanExecute: false
    },
    nextAction:
      blockerCount > 0
        ? "Fix blocked descriptor source before broker preview."
        : "Descriptor previews can be inspected; execution registration remains disabled.",
    source: "runtime_external_capability_broker_integration"
  };
}

function checkReadiness(
  readiness: Record<string, unknown>,
  path: string,
  findings: ExternalCapabilityBrokerFinding[]
): void {
  for (const [key, value] of Object.entries(readiness)) {
    if (
      value === true &&
      /invoke|execute|issue|lease|network|desktop|shell|appCanExecute|auto/i.test(
        key
      )
    ) {
      addFinding(
        findings,
        "readiness",
        "blocker",
        "EXECUTION_READINESS_REJECTED",
        "External broker integration cannot accept execution readiness.",
        `${path}.readiness.${key}`
      );
    }
  }
}

function scanUnsafeValues(
  value: unknown,
  findings: ExternalCapabilityBrokerFinding[],
  path = "$"
): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) =>
      scanUnsafeValues(item, findings, `${path}.${index}`)
    );
    return;
  }
  if (!isRecord(value)) {
    if (typeof value === "string" && containsSecretMarker(value)) {
      addFinding(
        findings,
        "secret",
        "blocker",
        "SECRET_MARKER_REJECTED",
        "Secret-like marker is not allowed in broker integration input.",
        path
      );
    }
    return;
  }
  for (const [key, nestedValue] of Object.entries(value)) {
    const code = forbiddenFieldCodes.get(key);
    const nestedPath = `${path}.${key}`;
    if (code !== undefined) {
      addFinding(
        findings,
        key.toLowerCase().includes("raw") ? "raw_field" : "execution_field",
        "blocker",
        code,
        "Forbidden broker integration field is not allowed.",
        nestedPath
      );
      continue;
    }
    scanUnsafeValues(nestedValue, findings, nestedPath);
  }
}

function addFinding(
  findings: ExternalCapabilityBrokerFinding[],
  kind: ExternalCapabilityBrokerFindingKind,
  severity: ExternalCapabilityBrokerFindingSeverity,
  code: string,
  safeMessage: string,
  path?: string
): void {
  findings.push({
    findingId: `external-broker-finding-${findings.length + 1}`,
    kind,
    severity,
    code,
    safeMessage,
    ...(path !== undefined ? { path } : {})
  });
}

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function containsSecretMarker(value: string): boolean {
  return (
    /sk-[a-z0-9_-]{8,}/i.test(value) ||
    /bearer\s+[a-z0-9._-]{8,}/i.test(value) ||
    /authorization\s*[:=]/i.test(value) ||
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(value) ||
    /PASSWORD_VALUE_MARKER/.test(value)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

function stablePreviewHash(value: string): string {
  const seeds = [
    0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35, 0x27d4eb2f, 0x165667b1,
    0xd3a2646c, 0xfd7046c5
  ];
  return seeds.map((seed) => hashChunk(value, seed)).join("");
}

function hashChunk(value: string, seed: number): string {
  let hash = seed >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
    hash ^= hash >>> 13;
  }
  hash ^= value.length;
  hash = Math.imul(hash, 2246822507);
  hash ^= hash >>> 16;
  return (hash >>> 0).toString(16).padStart(8, "0");
}
