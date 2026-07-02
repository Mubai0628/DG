import { validateCapabilityDescriptor } from "./descriptor.js";
import type { BuiltinSafeSkillSimulationResult } from "./builtin-safe-skill-simulation.js";
import type { CapabilityPackageMetadataScanResult } from "./package-metadata-scanner.js";
import type { PluginManifestValidationResult } from "./plugin-manifest-schema.js";
import type { PluginSkillSandboxContract } from "./plugin-skill-sandbox-contract.js";
import type { SkillManifestValidationResult } from "./skill-manifest-schema.js";
import type { CapabilityDescriptor, CapabilityRiskLevel } from "./types.js";

export type ExternalPluginSkillDescriptorInput = unknown;

export type ExternalPluginSkillDescriptorStatus =
  | "preview_ready"
  | "warning"
  | "blocked"
  | "empty";

export type ExternalPluginSkillDescriptorExecutionMode =
  | "disabled"
  | "metadata_only"
  | "simulated_builtin_safe";

export type ExternalPluginSkillDescriptorInvokePolicy =
  | "disabled"
  | "manual_only_preview";

export type ExternalPluginSkillDescriptorFindingSeverity =
  | "blocker"
  | "warning";

export type ExternalPluginSkillDescriptorFindingKind =
  | "schema"
  | "source"
  | "descriptor"
  | "policy"
  | "risk"
  | "secret"
  | "raw_field"
  | "execution_field"
  | "readiness";

export type ExternalPluginSkillDescriptorFinding = {
  findingId: string;
  kind: ExternalPluginSkillDescriptorFindingKind;
  severity: ExternalPluginSkillDescriptorFindingSeverity;
  code: string;
  safeMessage: string;
  path?: string | undefined;
};

export type ExternalPluginSkillDescriptorPreview = {
  capabilityId: string;
  sourceType: "plugin" | "skill";
  executionMode: ExternalPluginSkillDescriptorExecutionMode;
  riskLevel: "low" | "medium" | "high" | "critical";
  invokePolicy: ExternalPluginSkillDescriptorInvokePolicy;
  summary: string;
  manifestRef: {
    id: string;
    hash: string;
  };
  packageScanRef?: {
    packageHash: string;
    riskLevel: string;
  };
  redactionSummary: {
    rawMetadataIncluded: false;
    rawArgsIncluded: false;
    rawOutputIncluded: false;
    secretLikeContentDetected: boolean;
  };
  brokerDescriptor: CapabilityDescriptor;
};

export type ExternalPluginSkillDescriptorReadiness = {
  canPreviewDescriptors: boolean;
  canRegisterDescriptorPreview: boolean;
  canRegisterForExecution: false;
  canInvoke: false;
  canIssuePermissionLease: false;
  canWriteEventStore: false;
  canExecutePlugin: false;
  canRunSkillRuntime: false;
  canInstallPackage: false;
  canLoadCode: false;
  canUseNetwork: false;
  canWriteFilesystem: false;
  canExecuteShell: false;
  canExecuteGit: false;
  canUseNativeBridge: false;
  canUseDesktopAction: false;
  appCanExecute: false;
};

export type ExternalPluginSkillDescriptorResult = {
  status: ExternalPluginSkillDescriptorStatus;
  descriptorCount: number;
  pluginDescriptorCount: number;
  skillDescriptorCount: number;
  riskMapping: Record<string, number>;
  policyMapping: Record<string, number>;
  descriptors: ExternalPluginSkillDescriptorPreview[];
  brokerDescriptors: CapabilityDescriptor[];
  findings: ExternalPluginSkillDescriptorFinding[];
  blockerCount: number;
  warningCount: number;
  findingCount: number;
  descriptorHash: string;
  readiness: ExternalPluginSkillDescriptorReadiness;
  nextAction: string;
  source: "runtime_external_plugin_skill_descriptors";
};

const forbiddenFieldCodes = new Map<string, string>([
  ["rawmetadata", "RAW_METADATA_FIELD_REJECTED"],
  ["rawmanifest", "RAW_MANIFEST_FIELD_REJECTED"],
  ["rawpackage", "RAW_PACKAGE_FIELD_REJECTED"],
  ["rawargs", "RAW_ARGS_FIELD_REJECTED"],
  ["rawoutput", "RAW_OUTPUT_FIELD_REJECTED"],
  ["rawprompt", "RAW_PROMPT_FIELD_REJECTED"],
  ["rawsource", "RAW_SOURCE_FIELD_REJECTED"],
  ["rawdiff", "RAW_DIFF_FIELD_REJECTED"],
  ["apikey", "API_KEY_FIELD_REJECTED"],
  ["apikeyvalue", "API_KEY_FIELD_REJECTED"],
  ["authorization", "AUTHORIZATION_FIELD_REJECTED"],
  ["bearer", "BEARER_FIELD_REJECTED"],
  ["token", "TOKEN_FIELD_REJECTED"],
  ["secret", "SECRET_FIELD_REJECTED"],
  ["command", "COMMAND_FIELD_REJECTED"],
  ["shellcommand", "SHELL_COMMAND_FIELD_REJECTED"],
  ["gitcommand", "GIT_COMMAND_FIELD_REJECTED"],
  ["eventstorewrite", "EVENTSTORE_WRITE_FIELD_REJECTED"],
  ["permissionlease", "PERMISSION_LEASE_FIELD_REJECTED"],
  ["invoke", "INVOKE_FIELD_REJECTED"],
  ["execute", "EXECUTE_FIELD_REJECTED"],
  ["applynow", "APPLY_NOW_FIELD_REJECTED"],
  ["rollbacknow", "ROLLBACK_NOW_FIELD_REJECTED"],
  ["nativebridge", "NATIVE_BRIDGE_FIELD_REJECTED"],
  ["desktopaction", "DESKTOP_ACTION_FIELD_REJECTED"]
]);

export function buildExternalPluginSkillDescriptors(
  input: ExternalPluginSkillDescriptorInput
): ExternalPluginSkillDescriptorResult {
  return validateExternalPluginSkillDescriptors(input);
}

export function validateExternalPluginSkillDescriptors(
  input: ExternalPluginSkillDescriptorInput
): ExternalPluginSkillDescriptorResult {
  const findings: ExternalPluginSkillDescriptorFinding[] = [];
  const parsed = parseInput(input, findings);

  if (!isRecord(parsed)) {
    addFinding(
      findings,
      "schema",
      "blocker",
      "DESCRIPTOR_INPUT_OBJECT_REQUIRED",
      "Plugin/skill descriptor input must be an object."
    );
    return buildResult([], findings);
  }

  scanUnsafeValues(parsed, findings);
  validateSourceStatus(parsed, findings);

  const descriptors = [
    ...descriptorsFromPluginManifest(
      parsed.pluginManifestResult,
      parsed,
      findings
    ),
    ...descriptorsFromSkillManifest(
      parsed.skillManifestResult,
      parsed,
      findings
    )
  ];
  validateDescriptorSet(descriptors, findings);

  return buildResult(descriptors, findings);
}

export function summarizeExternalPluginSkillDescriptors(
  result: ExternalPluginSkillDescriptorResult
): Pick<
  ExternalPluginSkillDescriptorResult,
  | "status"
  | "descriptorCount"
  | "pluginDescriptorCount"
  | "skillDescriptorCount"
  | "riskMapping"
  | "policyMapping"
  | "blockerCount"
  | "warningCount"
  | "descriptorHash"
  | "readiness"
  | "source"
> {
  return {
    status: result.status,
    descriptorCount: result.descriptorCount,
    pluginDescriptorCount: result.pluginDescriptorCount,
    skillDescriptorCount: result.skillDescriptorCount,
    riskMapping: result.riskMapping,
    policyMapping: result.policyMapping,
    blockerCount: result.blockerCount,
    warningCount: result.warningCount,
    descriptorHash: result.descriptorHash,
    readiness: result.readiness,
    source: result.source
  };
}

function parseInput(
  input: ExternalPluginSkillDescriptorInput,
  findings: ExternalPluginSkillDescriptorFinding[]
): unknown {
  if (typeof input !== "string") {
    return input;
  }
  try {
    return JSON.parse(input) as unknown;
  } catch {
    addFinding(
      findings,
      "schema",
      "blocker",
      "INVALID_JSON",
      "Plugin/skill descriptor JSON string could not be parsed."
    );
    return undefined;
  }
}

function validateSourceStatus(
  record: Record<string, unknown>,
  findings: ExternalPluginSkillDescriptorFinding[]
): void {
  const pluginManifest = record.pluginManifestResult as
    | PluginManifestValidationResult
    | undefined;
  const skillManifest = record.skillManifestResult as
    | SkillManifestValidationResult
    | undefined;
  const packageScan = record.packageScanResult as
    | CapabilityPackageMetadataScanResult
    | undefined;
  const sandboxContract = record.sandboxContract as
    | PluginSkillSandboxContract
    | undefined;
  const simulationResult = record.builtinSimulationResult as
    | BuiltinSafeSkillSimulationResult
    | undefined;

  if (pluginManifest?.status === "blocked") {
    addFinding(
      findings,
      "source",
      "blocker",
      "BLOCKED_PLUGIN_MANIFEST_REJECTED",
      "Blocked plugin manifests cannot enter plugin descriptor preview.",
      "$.pluginManifestResult.status"
    );
  }
  if (skillManifest?.status === "blocked") {
    addFinding(
      findings,
      "source",
      "blocker",
      "BLOCKED_SKILL_MANIFEST_REJECTED",
      "Blocked skill manifests cannot enter skill descriptor preview.",
      "$.skillManifestResult.status"
    );
  }
  if (packageScan?.status === "blocked") {
    addFinding(
      findings,
      "source",
      "blocker",
      "BLOCKED_PACKAGE_SCAN_REJECTED",
      "Blocked package metadata scans cannot enter descriptor preview.",
      "$.packageScanResult.status"
    );
  }
  if (sandboxContract?.status === "blocked") {
    addFinding(
      findings,
      "source",
      "blocker",
      "BLOCKED_SANDBOX_CONTRACT_REJECTED",
      "Blocked sandbox contracts cannot enter descriptor preview.",
      "$.sandboxContract.status"
    );
  }
  if (simulationResult?.status === "blocked") {
    addFinding(
      findings,
      "source",
      "blocker",
      "BLOCKED_BUILTIN_SIMULATION_REJECTED",
      "Blocked built-in safe simulation results cannot enter descriptor preview.",
      "$.builtinSimulationResult.status"
    );
  }
  for (const [path, readiness] of [
    ["pluginManifestResult", pluginManifest?.readiness],
    ["skillManifestResult", skillManifest?.readiness],
    ["packageScanResult", packageScan?.readiness],
    ["sandboxContract", sandboxContract?.readiness],
    ["builtinSimulationResult", simulationResult?.readiness]
  ] as const) {
    if (isRecord(readiness)) {
      checkReadiness(readiness, path, findings);
    }
  }
}

function descriptorsFromPluginManifest(
  value: unknown,
  record: Record<string, unknown>,
  findings: ExternalPluginSkillDescriptorFinding[]
): ExternalPluginSkillDescriptorPreview[] {
  const result = value as PluginManifestValidationResult | undefined;
  if (result?.manifest === undefined || result.status === "blocked") {
    return [];
  }
  return result.manifest.capabilities.map((capability) => {
    const executionMode = mapPluginExecutionMode(
      capability.executionMode,
      record
    );
    const riskLevel = capability.riskLevel;
    const invokePolicy = invokePolicyFor(executionMode, riskLevel);
    const manifestRef = {
      id: result.manifest!.pluginId,
      hash: result.manifestHash
    };
    return buildPreview({
      capabilityId: capability.capabilityId,
      title: `${result.manifest!.name} capability`,
      sourceType: "plugin",
      executionMode,
      riskLevel,
      invokePolicy,
      manifestRef,
      packageScanRef: packageScanRef(record.packageScanResult),
      warningCodes: capability.warningCodes,
      summarySeed: {
        kind: capability.kind,
        riskLevel,
        executionMode,
        requiresApproval: capability.requiresApproval
      }
    });
  });
}

function descriptorsFromSkillManifest(
  value: unknown,
  record: Record<string, unknown>,
  findings: ExternalPluginSkillDescriptorFinding[]
): ExternalPluginSkillDescriptorPreview[] {
  const result = value as SkillManifestValidationResult | undefined;
  if (result?.manifest === undefined || result.status === "blocked") {
    return [];
  }
  return result.manifest.steps.map((step) => {
    const executionMode = mapSkillExecutionMode(step.mode, record);
    const riskLevel = result.riskLevel;
    const invokePolicy = invokePolicyFor(executionMode, riskLevel);
    const manifestRef = {
      id: result.manifest!.skillId,
      hash: result.summaryHash
    };
    return buildPreview({
      capabilityId: step.stepId,
      title: `${result.manifest!.name} step`,
      sourceType: "skill",
      executionMode,
      riskLevel,
      invokePolicy,
      manifestRef,
      packageScanRef: packageScanRef(record.packageScanResult),
      warningCodes: step.warningCodes,
      summarySeed: {
        mode: step.mode,
        riskLevel,
        requiredCapabilityCount: result.requiredCapabilityCount
      }
    });
  });
}

function buildPreview(input: {
  capabilityId: string;
  title: string;
  sourceType: "plugin" | "skill";
  executionMode: ExternalPluginSkillDescriptorExecutionMode;
  riskLevel: "low" | "medium" | "high" | "critical";
  invokePolicy: ExternalPluginSkillDescriptorInvokePolicy;
  manifestRef: { id: string; hash: string };
  packageScanRef?: { packageHash: string; riskLevel: string } | undefined;
  warningCodes: string[];
  summarySeed: unknown;
}): ExternalPluginSkillDescriptorPreview {
  const summaryHash = stablePreviewHash(stableStringify(input.summarySeed));
  const brokerDescriptor = toBrokerDescriptor({
    ...input,
    summaryHash
  });
  return {
    capabilityId: input.capabilityId,
    sourceType: input.sourceType,
    executionMode: input.executionMode,
    riskLevel: input.riskLevel,
    invokePolicy: input.invokePolicy,
    summary: `summary:${summaryHash.slice(0, 16)}`,
    manifestRef: input.manifestRef,
    ...(input.packageScanRef !== undefined
      ? { packageScanRef: input.packageScanRef }
      : {}),
    redactionSummary: {
      rawMetadataIncluded: false,
      rawArgsIncluded: false,
      rawOutputIncluded: false,
      secretLikeContentDetected: false
    },
    brokerDescriptor
  };
}

function toBrokerDescriptor(input: {
  capabilityId: string;
  title: string;
  sourceType: "plugin" | "skill";
  executionMode: ExternalPluginSkillDescriptorExecutionMode;
  riskLevel: "low" | "medium" | "high" | "critical";
  invokePolicy: ExternalPluginSkillDescriptorInvokePolicy;
  summaryHash: string;
  warningCodes: string[];
}): CapabilityDescriptor {
  const disabled = input.invokePolicy === "disabled";
  return {
    id: input.capabilityId,
    title: input.title,
    sourceType: input.sourceType,
    category: "unknown",
    riskLevel: mapRisk(input.riskLevel),
    invokePolicy: disabled ? "DISABLED" : "MANUAL_ONLY",
    executionMode: "SIMULATE",
    inputSchema: { summaryOnly: true },
    outputSchema: { summaryOnly: true },
    supportsDryRun: true,
    requiresElicitation: input.invokePolicy === "manual_only_preview",
    canWriteMemory: false,
    trustTier: "restricted",
    version: "0.20.0",
    owner: "runtime",
    description: `Summary-only ${input.sourceType} descriptor ${input.summaryHash.slice(0, 16)}`,
    eventTypes: [],
    ...(disabled
      ? { disabledReason: "plugin/skill descriptor preview only" }
      : {})
  };
}

function validateDescriptorSet(
  descriptors: ExternalPluginSkillDescriptorPreview[],
  findings: ExternalPluginSkillDescriptorFinding[]
): void {
  const seen = new Set<string>();
  for (const descriptor of descriptors) {
    if (seen.has(descriptor.capabilityId)) {
      addFinding(
        findings,
        "descriptor",
        "blocker",
        "DUPLICATE_DESCRIPTOR_ID",
        "Plugin/skill descriptor capability ids must be unique.",
        descriptor.capabilityId
      );
    }
    seen.add(descriptor.capabilityId);
    if (
      descriptor.executionMode !== "disabled" &&
      descriptor.executionMode !== "metadata_only" &&
      descriptor.executionMode !== "simulated_builtin_safe"
    ) {
      addFinding(
        findings,
        "descriptor",
        "blocker",
        "EXECUTION_READY_MODE_REJECTED",
        "Plugin/skill descriptors may only be disabled, metadata_only, or simulated_builtin_safe.",
        descriptor.capabilityId
      );
    }
    const validation = validateCapabilityDescriptor(
      descriptor.brokerDescriptor
    );
    if (!validation.ok) {
      validation.errors.forEach((error) =>
        addFinding(
          findings,
          "descriptor",
          "blocker",
          `BROKER_${error.code.toUpperCase()}`,
          error.safeMessage,
          descriptor.capabilityId
        )
      );
    }
  }
}

function buildResult(
  descriptors: ExternalPluginSkillDescriptorPreview[],
  findings: ExternalPluginSkillDescriptorFinding[]
): ExternalPluginSkillDescriptorResult {
  const blockerCount = countFindings(findings, "blocker");
  const warningCount = countFindings(findings, "warning");
  const safeDescriptors = blockerCount === 0 ? descriptors : [];
  const status: ExternalPluginSkillDescriptorStatus =
    blockerCount > 0
      ? "blocked"
      : safeDescriptors.length === 0
        ? "empty"
        : warningCount > 0
          ? "warning"
          : "preview_ready";
  const descriptorHash = stablePreviewHash(
    stableStringify({
      descriptors: safeDescriptors.map((descriptor) => ({
        capabilityId: descriptor.capabilityId,
        sourceType: descriptor.sourceType,
        executionMode: descriptor.executionMode,
        invokePolicy: descriptor.invokePolicy,
        riskLevel: descriptor.riskLevel,
        manifestRef: descriptor.manifestRef,
        packageScanRef: descriptor.packageScanRef,
        brokerInvokePolicy: descriptor.brokerDescriptor.invokePolicy,
        brokerExecutionMode: descriptor.brokerDescriptor.executionMode
      })),
      findingCodes: findings.map((finding) => finding.code).sort()
    })
  );
  return {
    status,
    descriptorCount: safeDescriptors.length,
    pluginDescriptorCount: safeDescriptors.filter(
      (descriptor) => descriptor.sourceType === "plugin"
    ).length,
    skillDescriptorCount: safeDescriptors.filter(
      (descriptor) => descriptor.sourceType === "skill"
    ).length,
    riskMapping: countBy(
      safeDescriptors.map((descriptor) => descriptor.riskLevel)
    ),
    policyMapping: countBy(
      safeDescriptors.map((descriptor) => descriptor.invokePolicy)
    ),
    descriptors: safeDescriptors,
    brokerDescriptors: safeDescriptors.map(
      (descriptor) => descriptor.brokerDescriptor
    ),
    findings,
    blockerCount,
    warningCount,
    findingCount: findings.length,
    descriptorHash,
    readiness: {
      canPreviewDescriptors: blockerCount === 0 && safeDescriptors.length > 0,
      canRegisterDescriptorPreview:
        blockerCount === 0 && safeDescriptors.length > 0,
      canRegisterForExecution: false,
      canInvoke: false,
      canIssuePermissionLease: false,
      canWriteEventStore: false,
      canExecutePlugin: false,
      canRunSkillRuntime: false,
      canInstallPackage: false,
      canLoadCode: false,
      canUseNetwork: false,
      canWriteFilesystem: false,
      canExecuteShell: false,
      canExecuteGit: false,
      canUseNativeBridge: false,
      canUseDesktopAction: false,
      appCanExecute: false
    },
    nextAction:
      blockerCount > 0
        ? "Reject plugin/skill descriptors until source, duplicate, raw, secret, and execution blockers are fixed."
        : "Descriptor previews may enter the broker as disabled or manual-only simulate descriptors; invocation remains disabled.",
    source: "runtime_external_plugin_skill_descriptors"
  };
}

function mapPluginExecutionMode(
  mode: string,
  record: Record<string, unknown>
): ExternalPluginSkillDescriptorExecutionMode {
  if (mode === "disabled") {
    return "disabled";
  }
  if (mode === "metadata_only") {
    return "metadata_only";
  }
  return contractAllowsSimulation(record.sandboxContract)
    ? "simulated_builtin_safe"
    : "metadata_only";
}

function mapSkillExecutionMode(
  mode: string,
  record: Record<string, unknown>
): ExternalPluginSkillDescriptorExecutionMode {
  if (
    mode === "simulated_builtin_safe" &&
    contractAllowsSimulation(record.sandboxContract)
  ) {
    return "simulated_builtin_safe";
  }
  if (mode === "metadata_only") {
    return "metadata_only";
  }
  return "disabled";
}

function contractAllowsSimulation(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }
  const readiness = isRecord(value.readiness) ? value.readiness : undefined;
  return (
    value.status !== "blocked" &&
    value.mode === "simulated_builtin_safe" &&
    readiness?.canEnterBuiltinSafeSimulation === true
  );
}

function invokePolicyFor(
  mode: ExternalPluginSkillDescriptorExecutionMode,
  riskLevel: "low" | "medium" | "high" | "critical"
): ExternalPluginSkillDescriptorInvokePolicy {
  if (mode === "disabled" || riskLevel === "high" || riskLevel === "critical") {
    return "disabled";
  }
  return "manual_only_preview";
}

function mapRisk(
  riskLevel: "low" | "medium" | "high" | "critical"
): CapabilityRiskLevel {
  if (riskLevel === "low") {
    return "A1_read";
  }
  if (riskLevel === "medium") {
    return "A2_draft_write";
  }
  if (riskLevel === "high") {
    return "A4_external_effect";
  }
  return "A5_sensitive_or_irreversible";
}

function packageScanRef(
  value: unknown
): { packageHash: string; riskLevel: string } | undefined {
  if (!isRecord(value) || typeof value.packageHash !== "string") {
    return undefined;
  }
  return {
    packageHash: value.packageHash,
    riskLevel: typeof value.riskLevel === "string" ? value.riskLevel : "unknown"
  };
}

function checkReadiness(
  readiness: Record<string, unknown>,
  path: string,
  findings: ExternalPluginSkillDescriptorFinding[]
): void {
  for (const [key, value] of Object.entries(readiness)) {
    if (
      value === true &&
      /invoke|execute|issue|lease|network|desktop|shell|git|write|install|load|appCanExecute/i.test(
        key
      )
    ) {
      addFinding(
        findings,
        "readiness",
        "blocker",
        "EXECUTION_READINESS_REJECTED",
        "Plugin/skill descriptor integration cannot accept execution readiness.",
        `${path}.readiness.${key}`
      );
    }
  }
}

function scanUnsafeValues(
  value: unknown,
  findings: ExternalPluginSkillDescriptorFinding[],
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
        "Secret-like marker is not allowed in plugin/skill descriptor input.",
        path
      );
    }
    return;
  }
  for (const [key, nestedValue] of Object.entries(value)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9_]/g, "");
    const code = forbiddenFieldCodes.get(normalizedKey);
    const nestedPath = `${path}.${key}`;
    if (code !== undefined) {
      addFinding(
        findings,
        forbiddenKind(normalizedKey),
        "blocker",
        code,
        "Forbidden plugin/skill descriptor field is not allowed.",
        nestedPath
      );
      continue;
    }
    if (
      ((normalizedKey.startsWith("can") &&
        /invoke|execute|issue|lease|network|desktop|shell|git|write|install|load|appcanexecute/i.test(
          key
        )) ||
        normalizedKey === "appcanexecute") &&
      nestedValue === true
    ) {
      addFinding(
        findings,
        "readiness",
        "blocker",
        "EXECUTION_READINESS_REJECTED",
        "Plugin/skill descriptor integration cannot accept execution readiness.",
        nestedPath
      );
    }
    scanUnsafeValues(nestedValue, findings, nestedPath);
  }
}

function forbiddenKind(
  normalizedKey: string
): ExternalPluginSkillDescriptorFindingKind {
  if (/raw/.test(normalizedKey)) {
    return "raw_field";
  }
  if (/key|authorization|bearer|token|secret/.test(normalizedKey)) {
    return "secret";
  }
  return "execution_field";
}

function countFindings(
  findings: ExternalPluginSkillDescriptorFinding[],
  severity: ExternalPluginSkillDescriptorFindingSeverity
): number {
  return findings.filter((finding) => finding.severity === severity).length;
}

function countBy(values: string[]): Record<string, number> {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function addFinding(
  findings: ExternalPluginSkillDescriptorFinding[],
  kind: ExternalPluginSkillDescriptorFindingKind,
  severity: ExternalPluginSkillDescriptorFindingSeverity,
  code: string,
  safeMessage: string,
  path?: string
): void {
  findings.push({
    findingId: `external-plugin-skill-descriptor-finding-${findings.length + 1}`,
    kind,
    severity,
    code,
    safeMessage,
    ...(path !== undefined ? { path } : {})
  });
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
      .filter((key) => key !== "idGenerator")
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }
  if (typeof value === "function") {
    return JSON.stringify("[function]");
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
